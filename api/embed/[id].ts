// @ts-nocheck
import type { IncomingMessage, ServerResponse } from 'http';
import { db } from '../_lib/db';
import { calculators, apiKeys, usageEvents } from '../_lib/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { jsonResponse, readBody, getHeader } from '../_lib/http';
import { checkRateLimit } from '../_lib/rate-limit-middleware';
import { hashKey } from '../_lib/crypto';

// ── Math Evaluator (inlined so it works without separate function) ────

function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < expr.length) {
    if (/\s/.test(expr[i])) { i++; continue; }
    if (/[0-9.]/.test(expr[i])) {
      let num = '';
      while (i < expr.length && /[0-9.eE]/.test(expr[i])) {
        num += expr[i]; i++;
        if (expr[i] === '-' && /[eE]/.test(expr[i - 1])) { num += expr[i]; i++; }
      }
      tokens.push(num);
    } else if (/[a-zA-Z_]/.test(expr[i])) {
      let name = '';
      while (i < expr.length && /[a-zA-Z_0-9]/.test(expr[i])) { name += expr[i]; i++; }
      tokens.push(name);
    } else if ('+-*/^(),%'.includes(expr[i])) {
      tokens.push(expr[i]); i++;
    } else {
      throw new Error('Unexpected character: ' + expr[i]);
    }
  }
  return tokens;
}

function parseExpr(tokens: string[], pos: { i: number }): number {
  let left = parseMulDiv(tokens, pos);
  while (pos.i < tokens.length && (tokens[pos.i] === '+' || tokens[pos.i] === '-')) {
    const op = tokens[pos.i++];
    const right = parseMulDiv(tokens, pos);
    left = op === '+' ? left + right : left - right;
  }
  return left;
}

function parseMulDiv(tokens: string[], pos: { i: number }): number {
  let left = parsePow(tokens, pos);
  while (pos.i < tokens.length && (tokens[pos.i] === '*' || tokens[pos.i] === '/' || tokens[pos.i] === '%')) {
    const op = tokens[pos.i++];
    const right = parsePow(tokens, pos);
    if (op === '*') left *= right;
    else if (op === '/') left /= right;
    else left %= right;
  }
  return left;
}

function parsePow(tokens: string[], pos: { i: number }): number {
  let left = parseUnary(tokens, pos);
  if (pos.i < tokens.length && tokens[pos.i] === '^') {
    pos.i++;
    const right = parsePow(tokens, pos);
    left = Math.pow(left, right);
  }
  return left;
}

function parseUnary(tokens: string[], pos: { i: number }): number {
  if (pos.i < tokens.length && tokens[pos.i] === '-') { pos.i++; return -parseUnary(tokens, pos); }
  if (pos.i < tokens.length && tokens[pos.i] === '+') { pos.i++; return parseUnary(tokens, pos); }
  return parseAtom(tokens, pos);
}

function parseAtom(tokens: string[], pos: { i: number }): number {
  if (pos.i >= tokens.length) throw new Error('Unexpected end of expression');
  const tok = tokens[pos.i];
  if (tok === '(') {
    pos.i++;
    const val = parseExpr(tokens, pos);
    if (pos.i < tokens.length && tokens[pos.i] === ')') pos.i++;
    return val;
  }
  if (/^[0-9.]/.test(tok)) { pos.i++; return parseFloat(tok); }
  if (/^[a-zA-Z_]/.test(tok)) {
    const name = tok.toLowerCase();
    pos.i++;
    if (name === 'pi' || name === '\u03c0') return Math.PI;
    if (name === 'e' && (pos.i >= tokens.length || tokens[pos.i] !== '(')) return Math.E;
    if (pos.i < tokens.length && tokens[pos.i] === '(') {
      pos.i++;
      const args: number[] = [parseExpr(tokens, pos)];
      while (pos.i < tokens.length && tokens[pos.i] === ',') { pos.i++; args.push(parseExpr(tokens, pos)); }
      if (pos.i < tokens.length && tokens[pos.i] === ')') pos.i++;
      const v = args[0], v2 = args[1];
      switch (name) {
        case 'sin': return Math.sin(v);
        case 'cos': return Math.cos(v);
        case 'tan': return Math.tan(v);
        case 'asin': return Math.asin(v);
        case 'acos': return Math.acos(v);
        case 'atan': return v2 !== undefined ? Math.atan2(v, v2) : Math.atan(v);
        case 'sinh': return Math.sinh(v);
        case 'cosh': return Math.cosh(v);
        case 'tanh': return Math.tanh(v);
        case 'sqrt': return Math.sqrt(v);
        case 'cbrt': return Math.cbrt(v);
        case 'abs': return Math.abs(v);
        case 'ceil': return Math.ceil(v);
        case 'floor': return Math.floor(v);
        case 'round': return Math.round(v);
        case 'log': case 'log10': return Math.log10(v);
        case 'ln': return Math.log(v);
        case 'log2': return Math.log2(v);
        case 'exp': return Math.exp(v);
        case 'sign': return Math.sign(v);
        case 'pow': return Math.pow(v, v2 ?? 0);
        case 'min': return Math.min(...args);
        case 'max': return Math.max(...args);
        case 'mod': return v % (v2 ?? 1);
        default: throw new Error('Unknown function: ' + name + '()');
      }
    }
    throw new Error('Unknown identifier: ' + name);
  }
  throw new Error('Unexpected token: ' + tok);
}

function evaluateExpression(expr: string, angle: string): number {
  let processed = expr.replace(/\u00d7/g, '*').replace(/\u00f7/g, '/').replace(/\u2212/g, '-').replace(/\u03c0/g, 'pi');
  if (angle === 'deg') {
    processed = processed.replace(/\b(sin|cos|tan)\(([^)]+)\)/g, (_, fn: string, arg: string) => fn + '((((' + arg + ')*pi)/180))');
  }
  const tokens = tokenize(processed);
  if (tokens.length === 0) throw new Error('Empty expression');
  const pos = { i: 0 };
  const result = parseExpr(tokens, pos);
  if (pos.i < tokens.length) throw new Error('Unexpected token: ' + tokens[pos.i]);
  return result;
}

// ── Demo configs ────

function renderEmbedPage(config: any, width: string, height: string): string {
  const isSci = config.type !== 'basic';
  const isSciJson = JSON.stringify(isSci);
  const themeJson = JSON.stringify(config.theme?.mode || 'dark');
  const primaryJson = JSON.stringify(config.theme?.primaryColor || '#3b82f6');
  const wJson = JSON.stringify(width || '340px');
  const hJson = JSON.stringify(height || '');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Calculo</title><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:auto;font-family:system-ui,sans-serif}
body{background:transparent;display:flex;justify-content:center;align-items:flex-start;padding:8px}
#calc{border-radius:14px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.5);position:relative;min-width:260px;min-height:300px;transition:box-shadow 0.2s}
#calc:hover{box-shadow:0 12px 48px rgba(0,0,0,0.6)}
.hdr{display:flex;align-items:center;padding:6px 10px 2px;cursor:move;-webkit-user-select:none;user-select:none;position:relative}
.hdr .br{display:flex;align-items:center;gap:2px;margin-left:auto}
.hdr .br button{width:22px;height:22px;border-radius:6px;border:none;cursor:pointer;background:transparent;font-size:13px;display:flex;align-items:center;justifyContent:center;transition:background 0.15s}
#resize{position:absolute;bottom:0;right:0;width:16px;height:16px;cursor:nwse-resize;z-index:50}
#resize::after{content:'';position:absolute;bottom:3px;right:3px;width:8px;height:8px;border-right:2px solid rgba(128,128,128,0.4);border-bottom:2px solid rgba(128,128,128,0.4)}
</style></head><body>
<button id="fab" style="display:none;position:fixed;bottom:24px;right:24px;width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;color:#fff;font-size:22px;box-shadow:0 4px 20px rgba(0,0,0,0.4);align-items:center;justifyContent:center;transition:transform 0.2s;z-index:99999"></button>
<div id="calc"><div id="app"></div><div id="resize"></div></div>
<script>
(function(){
var isSci=${isSciJson};
var am='deg',ex='',re='0',ans=null,sh=false,mem=null;

var THEMES={
dark:{bg:'#0a0a0b',surface:'#111113',border:'rgba(255,255,255,0.06)',text:'#fafafa',muted:'rgba(255,255,255,0.4)',primary:'#3b82f6',numBg:'rgba(255,255,255,0.08)',opBg:'rgba(255,255,255,0.05)',fnBg:'rgba(255,255,255,0.04)',ctrlBg:'rgba(255,255,255,0.06)'},
light:{bg:'#ffffff',surface:'#f5f5f5',border:'rgba(0,0,0,0.08)',text:'#18181b',muted:'rgba(0,0,0,0.4)',primary:'#2563eb',numBg:'rgba(0,0,0,0.05)',opBg:'rgba(0,0,0,0.03)',fnBg:'rgba(0,0,0,0.02)',ctrlBg:'rgba(0,0,0,0.04)'},
oled:{bg:'#000000',surface:'#111111',border:'rgba(255,255,255,0.08)',text:'#ffffff',muted:'rgba(255,255,255,0.4)',primary:'#6366f1',numBg:'rgba(255,255,255,0.08)',opBg:'rgba(255,255,255,0.05)',fnBg:'rgba(255,255,255,0.04)',ctrlBg:'rgba(255,255,255,0.06)'},
'high-contrast':{bg:'#000000',surface:'#1a1a1a',border:'rgba(255,255,255,0.2)',text:'#ffffff',muted:'rgba(255,255,255,0.6)',primary:'#ffff00',numBg:'rgba(255,255,255,0.1)',opBg:'rgba(255,255,255,0.06)',fnBg:'rgba(255,255,255,0.05)',ctrlBg:'rgba(255,255,255,0.08)'},
glass:{bg:'rgba(15,15,25,0.85)',surface:'rgba(255,255,255,0.08)',border:'rgba(255,255,255,0.12)',text:'#ffffff',muted:'rgba(255,255,255,0.5)',primary:'#8b5cf6',numBg:'rgba(255,255,255,0.1)',opBg:'rgba(255,255,255,0.06)',fnBg:'rgba(255,255,255,0.05)',ctrlBg:'rgba(255,255,255,0.08)'},
neumorphism:{bg:'#e0e5ec',surface:'#d1d9e6',border:'rgba(0,0,0,0.08)',text:'#2d3748',muted:'rgba(0,0,0,0.35)',primary:'#6366f1',numBg:'rgba(0,0,0,0.04)',opBg:'rgba(0,0,0,0.03)',fnBg:'rgba(0,0,0,0.02)',ctrlBg:'rgba(0,0,0,0.04)'},
minimal:{bg:'#ffffff',surface:'#fafafa',border:'rgba(0,0,0,0.06)',text:'#000000',muted:'rgba(0,0,0,0.35)',primary:'#000000',numBg:'rgba(0,0,0,0.03)',opBg:'rgba(0,0,0,0.02)',fnBg:'rgba(0,0,0,0.01)',ctrlBg:'rgba(0,0,0,0.03)'},
corporate:{bg:'#f8fafc',surface:'#f1f5f9',border:'rgba(0,0,0,0.08)',text:'#0f172a',muted:'rgba(0,0,0,0.4)',primary:'#1e40af',numBg:'rgba(0,0,0,0.04)',opBg:'rgba(0,0,0,0.03)',fnBg:'rgba(0,0,0,0.02)',ctrlBg:'rgba(0,0,0,0.04)'},
cyberpunk:{bg:'#0d0d1a',surface:'#151528',border:'rgba(255,0,255,0.15)',text:'#00ff88',muted:'rgba(0,255,136,0.4)',primary:'#ff00ff',numBg:'rgba(255,0,255,0.08)',opBg:'rgba(255,0,255,0.05)',fnBg:'rgba(255,0,255,0.04)',ctrlBg:'rgba(255,0,255,0.06)'},
retro:{bg:'#fdf6e3',surface:'#f5efdc',border:'rgba(0,0,0,0.1)',text:'#2d1b00',muted:'rgba(45,27,0,0.4)',primary:'#e85d04',numBg:'rgba(0,0,0,0.04)',opBg:'rgba(0,0,0,0.03)',fnBg:'rgba(0,0,0,0.02)',ctrlBg:'rgba(0,0,0,0.04)'},
coffee:{bg:'#3e2723',surface:'#4e342e',border:'rgba(255,255,255,0.08)',text:'#d7ccc8',muted:'rgba(215,204,200,0.4)',primary:'#a67c52',numBg:'rgba(255,255,255,0.08)',opBg:'rgba(255,255,255,0.05)',fnBg:'rgba(255,255,255,0.04)',ctrlBg:'rgba(255,255,255,0.06)'},
ocean:{bg:'#0a1a2e',surface:'#0f2237',border:'rgba(0,188,212,0.12)',text:'#e0f7fa',muted:'rgba(224,247,250,0.4)',primary:'#00bcd4',numBg:'rgba(0,188,212,0.08)',opBg:'rgba(0,188,212,0.05)',fnBg:'rgba(0,188,212,0.04)',ctrlBg:'rgba(0,188,212,0.06)'},
forest:{bg:'#1b2e1b',surface:'#223a22',border:'rgba(102,187,106,0.12)',text:'#e8f5e9',muted:'rgba(232,245,233,0.4)',primary:'#66bb6a',numBg:'rgba(102,187,106,0.08)',opBg:'rgba(102,187,106,0.05)',fnBg:'rgba(102,187,106,0.04)',ctrlBg:'rgba(102,187,106,0.06)'},
sunset:{bg:'#1a0a2e',surface:'#221038',border:'rgba(255,111,0,0.12)',text:'#ffe0b2',muted:'rgba(255,224,178,0.4)',primary:'#ff6f00',numBg:'rgba(255,111,0,0.08)',opBg:'rgba(255,111,0,0.05)',fnBg:'rgba(255,111,0,0.04)',ctrlBg:'rgba(255,111,0,0.06)'},
aurora:{bg:'#0a1628',surface:'#0f1f35',border:'rgba(0,230,118,0.12)',text:'#b9f6ca',muted:'rgba(185,246,202,0.4)',primary:'#00e676',numBg:'rgba(0,230,118,0.08)',opBg:'rgba(0,230,118,0.05)',fnBg:'rgba(0,230,118,0.04)',ctrlBg:'rgba(0,230,118,0.06)'},
monochrome:{bg:'#121212',surface:'#1e1e1e',border:'rgba(255,255,255,0.08)',text:'#f5f5f5',muted:'rgba(255,255,255,0.4)',primary:'#888888',numBg:'rgba(255,255,255,0.08)',opBg:'rgba(255,255,255,0.05)',fnBg:'rgba(255,255,255,0.04)',ctrlBg:'rgba(255,255,255,0.06)'}
};
var themeOrder=['dark','light','oled','high-contrast','glass','neumorphism','minimal','corporate','cyberpunk','retro','coffee','ocean','forest','sunset','aurora','monochrome'];

var curTheme=${themeJson};
var t=THEMES[curTheme]||THEMES.dark;
var P=${primaryJson};

function applyTheme(tk){
  curTheme=tk;t=THEMES[tk]||THEMES.dark;
  var c=document.getElementById('calc');
  c.style.background=t.bg;c.style.color=t.text;
  var d=document.getElementById('disp');
  if(d){d.style.background=t.surface;d.style.border='1px solid '+t.border}
  var f=document.getElementById('fab');if(f)f.style.background=t.primary;
  document.querySelectorAll('.hdr .br button').forEach(function(b){b.style.color=t.muted});
  document.querySelectorAll('#menu button').forEach(function(b){b.style.color=t.text});
  document.getElementById('rs').style.color=t.text;
  document.getElementById('ex').style.color=t.muted;
  buildKeys();
  updateSwatches();
}

function updateSwatches(){
  themeOrder.forEach(function(tk){
    var s=document.getElementById('sw-'+tk);
    if(s)s.style.background=THEMES[tk].primary;
  });
}

var DEG=180/Math.PI;
function toRad(x){return am==='deg'?x*Math.PI/180:x}
function fromRad(x){return am==='deg'?x*DEG:x}
function sn(x){return Math.sin(toRad(x))}
function cs(x){return Math.cos(toRad(x))}
function tn(x){return Math.tan(toRad(x))}
function asn(x){return fromRad(Math.asin(x))}
function acs(x){return fromRad(Math.acos(x))}
function atn(x){return fromRad(Math.atan(x))}
function snh(x){return Math.sinh(x)}
function csh(x){return Math.cosh(x)}
function tnh(x){return Math.tanh(x)}
function asnh(x){return Math.asinh(x)}
function acsh(x){return Math.acosh(x)}
function atnh(x){return Math.atanh(x)}
function sec2(x){return 1/Math.cos(toRad(x))}
function csc2(x){return 1/Math.sin(toRad(x))}
function cot2(x){return 1/Math.tan(toRad(x))}
function lg(x){return Math.log10(x)}
function ln2(x){return Math.log(x)}
function lg2(x){return Math.log2(x)}
function sqt(x){return Math.sqrt(x)}
function cbr(x){return Math.cbrt(x)}
function ab(x){return Math.abs(x)}
function fl(x){return Math.floor(x)}
function cl(x){return Math.ceil(x)}
function rn(x){return Math.round(x)}
function tr2(x){return Math.trunc(x)}
function sg(x){return Math.sign(x)}
function ep(x){return Math.exp(x)}
function fact(x){if(x<0)throw new Error('! of negative');var r=1;for(var i=2;i<=x;i++)r*=i;return r}
function pm(n,k){var r=1;for(var i=n;i>n-k;i--)r*=i;return r}
function cb(n,k){if(k>n)return 0;var k2=Math.min(k,n-k),r=1;for(var i=1;i<=k2;i++)r*=(n-k2+i)/i;return Math.round(r)}
function gd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){var tp=b;b=a%b;a=tp}return a}
function lc(a,b){return Math.abs(a*b)/gd(a,b)}
function hyp(a,b){return Math.hypot(a,b)}

function ev(s){
  try{
    s=s.replace(/\\u00D7/g,'*').replace(/\\u00F7/g,'/').replace(/\\u2212/g,'-').replace(/\\u03C0/g,''+Math.PI).replace(/\\u221A\\(/g,'sqt(').replace(/\\^/g,'**');
    s=s.replace(/\\u207B\\u00B9/g,'**(-1)');
    s=s.replace(/\\u00B2/g,'**2').replace(/\\u00B3/g,'**3');
    s=s.replace(/sinh\\(/g,'snh(').replace(/cosh\\(/g,'csh(').replace(/tanh\\(/g,'tnh(');
    s=s.replace(/asinh\\(/g,'asnh(').replace(/acosh\\(/g,'acsh(').replace(/atanh\\(/g,'atnh(');
    s=s.replace(/sec\\(/g,'sec2(').replace(/csc\\(/g,'csc2(').replace(/cot\\(/g,'cot2(');
    s=s.replace(/sin\\(/g,'sn(').replace(/cos\\(/g,'cs(').replace(/tan\\(/g,'tn(');
    s=s.replace(/asin\\(/g,'asn(').replace(/acos\\(/g,'acs(').replace(/atan\\(/g,'atn(');
    s=s.replace(/log10\\(/g,'lg(').replace(/log2\\(/g,'lg2(').replace(/log\\(/g,'lg(').replace(/ln\\(/g,'ln2(');
    s=s.replace(/sqrt\\(/g,'sqt(').replace(/cbrt\\(/g,'cbr(').replace(/abs\\(/g,'ab(');
    s=s.replace(/floor\\(/g,'fl(').replace(/ceil\\(/g,'cl(').replace(/round\\(/g,'rn(').replace(/trunc\\(/g,'tr2(').replace(/sign\\(/g,'sg(');
    s=s.replace(/exp\\(/g,'ep(').replace(/factorial\\(/g,'fact(').replace(/perm\\(/g,'pm(').replace(/comb\\(/g,'cb(');
    s=s.replace(/gcd\\(/g,'gd(').replace(/lcm\\(/g,'lc(').replace(/hypot\\(/g,'hyp(');
    s=s.replace(/pi/g,''+Math.PI).replace(/e(?!xp|\\()/g,''+Math.E);
    var fn=new Function('sn','cs','tn','asn','acs','atn','snh','csh','tnh','asnh','acsh','atnh','sec2','csc2','cot2','lg','ln2','lg2','sqt','cbr','ab','fl','cl','rn','tr2','sg','ep','fact','pm','cb','gd','lc','hyp','return('+s+')');
    var r=fn(sn,cs,tn,asn,acs,atn,snh,csh,tnh,asnh,acsh,atnh,sec2,csc2,cot2,lg,ln2,lg2,sqt,cbr,ab,fl,cl,rn,tr2,sg,ep,fact,pm,cb,gd,lc,hyp);
    return{r:r,e:null};
  }catch(e){return{r:null,e:e.message||'Error'}}
}

var calc=document.getElementById('calc');
calc.style.background=t.bg;calc.style.color=t.text;
calc.style.width=${wJson};
if(${hJson})calc.style.height=${hJson};
var fab=document.getElementById('fab');
fab.style.background=P;fab.textContent='\\u2295';

var resizeEl=document.getElementById('resize');
var resizing=false,rsx=0,rsy=0,rsw=0,rsh=0;
resizeEl.addEventListener('mousedown',function(e){
  e.preventDefault();e.stopPropagation();
  resizing=true;rsx=e.clientX;rsy=e.clientY;
  rsw=calc.offsetWidth;rsh=calc.offsetHeight;
  document.body.style.cursor='nwse-resize';
  document.body.style.userSelect='none';
});
document.addEventListener('mousemove',function(e){
  if(!resizing)return;
  var dw=e.clientX-rsx,dh=e.clientY-rsy;
  calc.style.width=Math.max(260,rsw+dw)+'px';
  if(${hJson})calc.style.height=Math.max(300,rsh+dh)+'px';
});
document.addEventListener('mouseup',function(){
  if(resizing){resizing=false;document.body.style.cursor='';document.body.style.userSelect=''}
});

function upd(){
  document.getElementById('ex').textContent=ex||'\\u00A0';
  document.getElementById('rs').textContent=re;
  var s=document.getElementById('st');
  if(s)s.textContent=isSci?(am+(sh?' 2ND':'')):'';
}
function evl(){
  if(!ex)return;
  var r=ev(ex);
  if(r.e){re='Error'}
  else{re=String(r.r);ans=re;ex=''}
  upd();
}
var SM={sin:'asin',cos:'acos',tan:'atan',log:'10**',sq:'**3',sqrt:'cbrt',inv:'abs'};
function act(a){
  if(a==='shift'){if(!isSci)return;sh=!sh;upd();return}
  if(a==='mode'){if(!isSci)return;am=am==='deg'?'rad':am==='rad'?'grad':'deg';sh=false;upd();return}
  var f=a;if(sh&&SM[a])f=SM[a];sh=false;
  if(f==='clearAll'){ex='';re='0';ans=null;mem=null;upd();return}
  if(f==='del'){ex=ex.slice(0,-1);upd();return}
  if(f==='neg'){ex=ex.indexOf('-')===0?ex.slice(1):'-'+ex;upd();return}
  if(f==='pi'){ex+=''+Math.PI;upd();return}
  if(f==='euler'){ex+=''+Math.E;upd();return}
  if(f==='ans'&&ans){ex+=ans;upd();return}
  if(f==='sq'){ex+='^(2)';upd();return}
  if(f==='**3'){ex+='^(3)';upd();return}
  if(f==='inv'){ex+='abs(';upd();return}
  if(f==='^'&&(ex===''||ex==='(')&&ans!==null){ex+=ans+'^';upd();return}
  if(['sin','cos','tan','asin','acos','atan','sinh','cosh','tanh','asinh','acosh','atanh','sec','csc','cot','log','ln','sqrt','cbrt','abs','floor','ceil','round','trunc','sign','exp','factorial','perm','comb','gcd','lcm','hypot'].indexOf(f)>=0){ex+=f+'(';upd();return}
  if(f==='10**'){ex+='10^(';upd();return}
  if(f==='2**'){ex+='2^(';upd();return}
  if(f==='m+'){var v=parseFloat(re);if(!isNaN(v))mem=(mem||0)+v;return}
  if(f==='m-'){var v=parseFloat(re);if(!isNaN(v))mem=(mem||0)-v;return}
  if(f==='MR'){if(mem!==null)ex+=String(mem);upd();return}
  if(f==='MC'){mem=null;return}
  if(f==='eval'){evl();return}
  ex+=f;upd();
}

var BK=[
  ['AC','ctrl','clearAll'],['(','ctrl','('],[')','ctrl',')'],['\\u00F7','op','/'],['DEL','ctrl','del'],
  ['M+','mem','m+'],['7','num','7'],['8','num','8'],['9','num','9'],['\\u00D7','op','*'],
  ['M\\u2212','mem','m-'],['4','num','4'],['5','num','5'],['6','num','6'],['\\u2212','op','-'],
  ['MR','mem','mr'],['1','num','1'],['2','num','2'],['3','num','3'],['+','op','+'],
  ['MC','mem','mc'],['0','num','0'],['.','num','.'],['(\\u2212)','ctrl','neg'],['\\uFF1D','eq','eval']
];
var SK=[
  ['2nd','ctrl','shift'],['DRG','ctrl','mode'],['DEL','ctrl','del'],['(','ctrl','('],[')','ctrl',')'],
  ['LOG','fn','log'],['\\u03C0','fn','pi'],['SIN','fn','sin'],['COS','fn','cos'],['TAN','fn','tan'],
  ['x\\u00B2','fn','sq'],['^','op','^'],['\\u221A','fn','sqrt'],['x\\u207B\\u00B9','fn','inv'],['CLR','ctrl','clearAll'],
  ['7','num','7'],['8','num','8'],['9','num','9'],['\\u00F7','op','/'],['\\u00D7','op','*'],
  ['4','num','4'],['5','num','5'],['6','num','6'],['\\u2212','op','-'],['+','op','+'],
  ['1','num','1'],['2','num','2'],['3','num','3'],['M+','mem','m+'],['M\\u2212','mem','m-'],
  ['0','num','0'],['.','num','.'],['(\\u2212)','ctrl','neg'],['ANS','ctrl','ans'],['\\uFF1D','eq','eval']
];
var KD=isSci?SK:BK;

function mkBtn(lb,kd,ac){
  var bg=kd==='op'?t.opBg:kd==='fn'?t.fnBg:kd==='ctrl'?t.ctrlBg:kd==='eq'?P:kd==='mem'?t.fnBg:t.numBg;
  var cl=kd==='op'?P:kd==='fn'||kd==='ctrl'||kd==='mem'?t.muted:kd==='eq'?'#fff':t.text;
  var fs=kd==='fn'||kd==='ctrl'||kd==='mem'?'11px':'13px';
  var fw=kd==='eq'?'700':'500';
  var b=document.createElement('button');
  b.textContent=lb;
  b.setAttribute('style','flex:1;height:38px;border-radius:10px;border:none;cursor:pointer;background:'+bg+';color:'+cl+';font-size:'+fs+';font-weight:'+fw+';font-family:system-ui;display:flex;align-items:center;justifyContent:center;transition:transform 80ms;position:relative;user-select:none');
  b.addEventListener('mousedown',function(){b.style.transform='scale(0.93)'});
  b.addEventListener('mouseup',function(){b.style.transform=''});
  b.addEventListener('mouseleave',function(){b.style.transform=''});
  b.addEventListener('click',function(){act(ac)});
  return b;
}

function buildKeys(){
  var bc=document.getElementById('btns');
  bc.innerHTML='';
  KD=isSci?SK:BK;
  for(var ri=0;ri<KD.length;ri+=5){
    var row=KD.slice(ri,ri+5);
    var r=document.createElement('div');
    r.setAttribute('style','display:flex;gap:3px');
    row.forEach(function(d){r.appendChild(mkBtn(d[0],d[1],d[2]))});
    bc.appendChild(r);
  }
}

var app=document.getElementById('app');
app.innerHTML='';
app.setAttribute('style','display:flex;flex-direction:column;padding:0 0 4px');

var hdrDiv=document.createElement('div');
hdrDiv.className='hdr';
hdrDiv.innerHTML='<span style="font-size:9px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;opacity:0.3;color:'+t.muted+'">calculo</span><span id="st" style="font-size:9px;font-family:monospace;opacity:0.35;margin-left:8px;color:'+t.muted+'"></span><div class="br"><button id="minBtn" style="color:'+t.muted+'">\\u2212</button><button id="menuBtn" style="color:'+t.muted+'">\\u22EE</button></div>';
app.appendChild(hdrDiv);

var menuDiv=document.createElement('div');
menuDiv.id='menu';
menuDiv.style.cssText='display:none;position:absolute;right:10px;top:30px;background:'+t.surface+';border:1px solid '+t.border+';border-radius:10px;padding:4px;z-index:100;max-height:400px;overflow-y:auto;min-width:180px;box-shadow:0 4px 16px rgba(0,0,0,0.3)';

var toggleSciBtn=document.createElement('button');
toggleSciBtn.textContent='Switch to '+(isSci?'Basic':'Scientific');
toggleSciBtn.style.cssText='display:block;width:100%;text-align:left;padding:8px 12px;border:none;background:none;color:'+t.text+';font-size:12px;cursor:pointer;border-radius:6px;font-family:system-ui';
toggleSciBtn.addEventListener('click',function(){isSci=!isSci;toggleSciBtn.textContent='Switch to '+(isSci?'Basic':'Scientific');buildKeys()});
menuDiv.appendChild(toggleSciBtn);

var sep1=document.createElement('div');sep1.style.cssText='height:1px;background:'+t.border+';margin:4px 0';menuDiv.appendChild(sep1);

var themeLabel=document.createElement('div');
themeLabel.textContent='Theme';themeLabel.style.cssText='padding:4px 12px;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:'+t.muted+';font-family:system-ui';
menuDiv.appendChild(themeLabel);

themeOrder.forEach(function(tk){
  var tb=document.createElement('button');
  var th=THEMES[tk];
  tb.innerHTML='<span id="sw-'+tk+'" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+th.primary+';border:1px solid '+th.border+';margin-right:6px;vertical-align:middle"></span>'+tk;
  tb.style.cssText='display:block;width:100%;text-align:left;padding:6px 12px;border:none;background:'+(curTheme===tk?'rgba(128,128,128,0.15)':'none')+';color:'+t.text+';font-size:11px;cursor:pointer;border-radius:6px;font-family:system-ui';
  tb.addEventListener('click',function(){applyTheme(tk);menuDiv.style.display='none'});
  menuDiv.appendChild(tb);
});

app.appendChild(menuDiv);

var disp=document.createElement('div');
disp.id='disp';
disp.setAttribute('style','background:'+t.surface+';margin:0 8px 8px;border-radius:10px;border:1px solid '+t.border+';padding:8px 12px');
disp.innerHTML='<div id="ex" style="font-family:monospace;font-size:11px;color:'+t.muted+';min-height:1.2em;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">\\u00A0</div><div id="rs" style="font-family:monospace;font-size:24px;font-weight:600;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:'+t.text+'">0</div>';
app.appendChild(disp);

var bc=document.createElement('div');
bc.id='btns';
bc.setAttribute('style','display:flex;flex-direction:column;gap:3px;padding:0 8px');
app.appendChild(bc);
buildKeys();

var ft=document.createElement('div');
ft.setAttribute('style','text-align:center;padding:4px 0 2px');
ft.innerHTML='<a href="https://calculo-fawn.vercel.app" target="_blank" rel="noopener noreferrer" style="font-size:8px;font-family:monospace;letter-spacing:0.2em;text-transform:uppercase;color:'+t.muted+';text-decoration:none;opacity:0.4">calculo</a>';
app.appendChild(ft);

var dragging=false,dx=0,dy=0;
hdrDiv.addEventListener('mousedown',function(e){
  if(e.target.tagName==='BUTTON')return;
  dragging=true;
  var rect=calc.getBoundingClientRect();
  dx=e.clientX-rect.left;dy=e.clientY-rect.top;
  calc.style.position='absolute';
  calc.style.left=(window.scrollX+rect.left)+'px';
  calc.style.top=(window.scrollY+rect.top)+'px';
  calc.style.margin='0';
  calc.style.transition='none';
});
document.addEventListener('mousemove',function(e){
  if(!dragging)return;
  calc.style.left=(window.scrollX+e.clientX-dx)+'px';
  calc.style.top=(window.scrollY+e.clientY-dy)+'px';
});
document.addEventListener('mouseup',function(){dragging=false;calc.style.transition=''});

var menuOpen=false;
document.getElementById('menuBtn').addEventListener('click',function(e){
  e.stopPropagation();
  menuOpen=!menuOpen;
  menuDiv.style.display=menuOpen?'block':'none';
});
document.addEventListener('click',function(){menuOpen=false;menuDiv.style.display='none'});
menuDiv.addEventListener('click',function(e){e.stopPropagation()});

function minimize(){calc.style.display='none';fab.style.display='flex'}
function restore(){calc.style.display='block';fab.style.display='none'}
document.getElementById('minBtn').addEventListener('click',minimize);
fab.addEventListener('click',restore);

document.addEventListener('keydown',function(e){
  if(e.target.tagName==='BUTTON')return;
  if(e.key==='Enter'){e.preventDefault();act('eval')}
  else if(e.key==='Backspace'){e.preventDefault();act('del')}
  else if(e.key==='Escape')act('clearAll');
  else if(/^[0-9+\\-*/.^()]+$/.test(e.key))act(e.key);
});
upd();
})();
</script></body></html>`;
}

const DEMO_CONFIGS: Record<string, object> = {
  'demo_basic': {
    id: 'demo_basic', type: 'basic',
    theme: { mode: 'dark', primaryColor: '#3b82f6', backgroundColor: '#0a0a0b', textColor: '#fafafa' },
  },
  'demo_scientific': {
    id: 'demo_scientific', type: 'scientific',
    theme: { mode: 'dark', primaryColor: '#8b5cf6', backgroundColor: '#0a0a0b', textColor: '#fafafa' },
  },
  'demo_light': {
    id: 'demo_light', type: 'scientific',
    theme: { mode: 'light', primaryColor: '#2563eb', backgroundColor: '#ffffff', textColor: '#18181b' },
  },
  'demo_cyberpunk': {
    id: 'demo_cyberpunk', type: 'scientific',
    theme: { mode: 'cyberpunk', primaryColor: '#f0abfc', backgroundColor: '#0d0d1a', textColor: '#00ff88' },
  },
};

// ── Handler ────

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return jsonResponse(res, {});

  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const segments = url.pathname.split('/').filter(Boolean);
  const id = segments[segments.length - 1];

  if (!id || id.length > 64) {
    return jsonResponse(res, { error: { code: 'BAD_REQUEST', message: 'Invalid ID' } }, 400);
  }

  // ── /api/embed/validate?key=... ──
  if (id === 'validate') {
    if (req.method !== 'GET') return jsonResponse(res, { error: { code: 'METHOD_NOT_ALLOWED', message: 'GET only' } }, 405);
    const key = url.searchParams.get('key') ?? '';
    if (!key || !key.startsWith('calc_live_')) {
      return jsonResponse(res, { valid: false }, 200);
    }
    try {
      const tokenHash = await hashKey(key);
      const rows = await db
        .select({ id: apiKeys.id, revokedAt: apiKeys.revokedAt })
        .from(apiKeys)
        .where(eq(apiKeys.tokenHash, tokenHash))
        .limit(1);
      const valid = rows.length > 0 && rows[0].revokedAt === null;
      return jsonResponse(res, { valid });
    } catch {
      return jsonResponse(res, { valid: false }, 200);
    }
  }

  // ── /api/embed/evaluate?expr=... ──
  if (id === 'evaluate') {
    if (!checkRateLimit(req, res, 60, 60_000)) return;
    try {
      let expr: string | undefined;
      let angle: string = 'rad';
      if (req.method === 'GET') {
        expr = url.searchParams.get('expr') ?? undefined;
        angle = url.searchParams.get('angle') ?? 'rad';
      } else if (req.method === 'POST') {
        const body = await readBody(req);
        expr = body?.expr;
        angle = body?.angle ?? 'rad';
      }
      if (!expr || typeof expr !== 'string') {
        return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: 'Missing "expr" parameter. Try ?expr=sin(45 deg)+cos(30 deg)' } }, 422);
      }
      if (expr.length > 1024) {
        return jsonResponse(res, { error: { code: 'VALIDATION_ERROR', message: 'Expression too long (max 1024 chars)' } }, 422);
      }
      const result = evaluateExpression(expr, angle);
      return jsonResponse(res, { result: Number.isFinite(result) ? result : String(result), expression: expr, angle });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Evaluation error';
      return jsonResponse(res, { error: { code: 'EVALUATION_ERROR', message: msg } }, 422);
    }
  }

  // ── /api/embed/demo_* or /api/embed/<id> ──
  const isHtml = url.searchParams.get('html') === '1';
  const themeParam = url.searchParams.get('theme') ?? '';
  const typeParam = url.searchParams.get('type') ?? '';
  const widthParam = url.searchParams.get('width') ?? '340px';
  const heightParam = url.searchParams.get('height') ?? '';

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  const demo = DEMO_CONFIGS[id];
  let config = demo;
  if (!demo) {
    try {
      const rows = await db
        .select({ id: calculators.id, type: calculators.type, theme: calculators.theme, buttons: calculators.buttons, layout: calculators.layout, settings: calculators.settings, display: calculators.display })
        .from(calculators)
        .where(and(eq(calculators.id, id), isNotNull(calculators.publishedAt)))
        .limit(1);
      config = rows[0] ?? undefined;
      if (!config) return jsonResponse(res, { error: { code: 'NOT_FOUND', message: 'Calculator not found' } }, 404);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      return jsonResponse(res, { error: { code: 'INTERNAL_ERROR', message: msg } }, 500);
    }
  }

  if (isHtml) {
    const merged = JSON.parse(JSON.stringify(config));
    if (themeParam) { merged.theme = merged.theme || {}; (merged.theme as any).mode = themeParam; }
    if (typeParam) merged.type = typeParam;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.statusCode = 200;
    res.end(renderEmbedPage(merged, widthParam, heightParam));
    return;
  }

  return jsonResponse(res, config);
}
