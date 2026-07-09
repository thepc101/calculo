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

// ── Embed Page Renderer ────

function renderEmbedPage(config: any, width: string, height: string): string {
  const isSci = config.type !== 'basic';
  const initMode = isSci ? 'scientific' : 'basic';
  const initTheme = config.theme?.mode || 'dark';
  const initPrimary = config.theme?.primaryColor || '#3b82f6';
  const initW = parseInt(width) || 340;
  const initH = parseInt(height) || 480;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Calculo</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:auto;font-family:system-ui,sans-serif}
body{background:transparent;display:flex;justify-content:center;align-items:flex-start;padding:8px}
#show-btn{display:none;position:fixed;bottom:24px;right:24px;width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;color:#fff;font-size:22px;box-shadow:0 4px 20px rgba(0,0,0,0.4);align-items:center;justify-content:center;z-index:99999}
</style></head><body>
<button id="show-btn"></button>
<div id="root"></div>
<script>
(function(){
var mode="${initMode}",ex="",re="0",ans=null,sh=false,mem=null,angle="DEG";
var curTheme="${initTheme}",P="${initPrimary}";
var curW=${initW},curH=${initH};
var posX=0,posY=0,dragging=false,resizing=false;
var dragSX,dragSY,dragPX,dragPY,resizeSX,resizeSY,resizeSW,resizeSH;
var menuTab=null,hist=[];

var THEMES={dark:{bg:"#0a0a0b",text:"#fafafa",muted:"rgba(255,255,255,0.4)",primary:"#3b82f6",radius:8},light:{bg:"#ffffff",text:"#0a0a0b",muted:"rgba(0,0,0,0.4)",primary:"#3b82f6",radius:8},oled:{bg:"#000000",text:"#ffffff",muted:"rgba(255,255,255,0.4)",primary:"#6366f1",radius:4},"high-contrast":{bg:"#000000",text:"#ffffff",muted:"rgba(255,255,255,0.6)",primary:"#ffff00",radius:0},glass:{bg:"rgba(15,15,25,0.85)",text:"#ffffff",muted:"rgba(255,255,255,0.5)",primary:"#8b5cf6",radius:16},neumorphism:{bg:"#e0e5ec",text:"#2d3748",muted:"rgba(0,0,0,0.35)",primary:"#6366f1",radius:16},minimal:{bg:"#ffffff",text:"#000000",muted:"rgba(0,0,0,0.35)",primary:"#000000",radius:0},corporate:{bg:"#f8fafc",text:"#0f172a",muted:"rgba(0,0,0,0.4)",primary:"#1e40af",radius:4},cyberpunk:{bg:"#0d0d1a",text:"#00ff88",muted:"rgba(0,255,136,0.4)",primary:"#ff00ff",radius:4},retro:{bg:"#fdf6e3",text:"#2d1b00",muted:"rgba(45,27,0,0.4)",primary:"#e85d04",radius:0},coffee:{bg:"#3e2723",text:"#d7ccc8",muted:"rgba(215,204,200,0.4)",primary:"#a67c52",radius:12},ocean:{bg:"#0a1a2e",text:"#e0f7fa",muted:"rgba(224,247,250,0.4)",primary:"#00bcd4",radius:20},forest:{bg:"#1b2e1b",text:"#e8f5e9",muted:"rgba(232,245,233,0.4)",primary:"#66bb6a",radius:8},sunset:{bg:"#1a0a2e",text:"#ffe0b2",muted:"rgba(255,224,178,0.4)",primary:"#ff6f00",radius:16},aurora:{bg:"#0a1628",text:"#b9f6ca",muted:"rgba(185,246,202,0.4)",primary:"#00e676",radius:10},monochrome:{bg:"#121212",text:"#f5f5f5",muted:"rgba(255,255,255,0.4)",primary:"#888888",radius:6}};
var themeOrder=["dark","light","oled","high-contrast","glass","neumorphism","minimal","corporate","cyberpunk","retro","coffee","ocean","forest","sunset","aurora","monochrome"];
var t=THEMES[curTheme]||THEMES.dark;

function hexRgb(h){if(h[0]==="#")h=h.slice(1);if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];var n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255]}
function rgba(hex,a){var r=hexRgb(hex);return"rgba("+r[0]+","+r[1]+","+r[2]+","+a+")"}
function mix(h,a){return"color-mix(in srgb, "+h+" "+Math.round(a*100)+"%, transparent)"}

function keyBg(k){
  if(k==="op")return rgba(P,0.12);
  if(k==="fn")return"rgba(24,24,27,0.8)";
  if(k==="ctrl")return"rgba(24,24,27,0.6)";
  if(k==="mem")return"rgba(24,24,27,0.5)";
  if(k==="eq")return P;
  return"rgba(63,63,70,0.8)";
}
function keyColor(k){
  if(k==="op")return P;
  if(k==="fn"||k==="ctrl"||k==="mem")return t.muted;
  if(k==="eq")return"#fff";
  return t.text;
}

var DEG=180/Math.PI;
function toRad(x){return angle==="DEG"?x*Math.PI/180:x}
function fromRad(x){return angle==="DEG"?x*DEG:x}
function sn(x){return Math.sin(toRad(x))}function cs(x){return Math.cos(toRad(x))}function tn(x){return Math.tan(toRad(x))}
function asn(x){return fromRad(Math.asin(x))}function acs(x){return fromRad(Math.acos(x))}function atn(x){return fromRad(Math.atan(x))}
function snh(x){return Math.sinh(x)}function csh(x){return Math.cosh(x)}function tnh(x){return Math.tanh(x)}
function asnh(x){return Math.asinh(x)}function acsh(x){return Math.acosh(x)}function atnh(x){return Math.atanh(x)}
function sec2(x){return 1/Math.cos(toRad(x))}function csc2(x){return 1/Math.sin(toRad(x))}function cot2(x){return 1/Math.tan(toRad(x))}
function lg(x){return Math.log10(x)}function ln2(x){return Math.log(x)}function lg2(x){return Math.log2(x)}
function sqt(x){return Math.sqrt(x)}function cbr(x){return Math.cbrt(x)}function ab(x){return Math.abs(x)}
function fl(x){return Math.floor(x)}function cl(x){return Math.ceil(x)}function rn(x){return Math.round(x)}
function tr2(x){return Math.trunc(x)}function sg(x){return Math.sign(x)}function ep(x){return Math.exp(x)}
function fact(x){if(x<0)throw new Error("! of negative");var r=1;for(var i=2;i<=x;i++)r*=i;return r}
function pm(n,k){var r=1;for(var i=n;i>n-k;i--)r*=i;return r}
function cb(n,k){if(k>n)return 0;var k2=Math.min(k,n-k),r=1;for(var i=1;i<=k2;i++)r*=(n-k2+i)/i;return Math.round(r)}
function gd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){var tp=b;b=a%b;a=tp}return a}
function lc(a,b){return Math.abs(a*b)/gd(a,b)}

function ev(s){
  try{
  s=s.replace(/\u00D7/g,"*").replace(/\u00F7/g,"/").replace(/\u2212/g,"-").replace(/\u03C0/g,""+Math.PI).replace(/\u221A\\(/g,"sqt(").replace(/\\^/g,"**");
  s=s.replace(/\u207B\u00B9/g,"**(-1)").replace(/\u00B2/g,"**2").replace(/\u00B3/g,"**3");
  s=s.replace(/sinh\\(/g,"snh(").replace(/cosh\\(/g,"csh(").replace(/tanh\\(/g,"tnh(");
  s=s.replace(/asinh\\(/g,"asnh(").replace(/acosh\\(/g,"acsh(").replace(/atanh\\(/g,"atnh(");
  s=s.replace(/sec\\(/g,"sec2(").replace(/csc\\(/g,"csc2(").replace(/cot\\(/g,"cot2(");
  s=s.replace(/sin\\(/g,"sn(").replace(/cos\\(/g,"cs(").replace(/tan\\(/g,"tn(");
  s=s.replace(/asin\\(/g,"asn(").replace(/acos\\(/g,"acs(").replace(/atan\\(/g,"atn(");
  s=s.replace(/log10\\(/g,"lg(").replace(/log2\\(/g,"lg2(").replace(/log\\(/g,"lg(").replace(/ln\\(/g,"ln2(");
  s=s.replace(/sqrt\\(/g,"sqt(").replace(/cbrt\\(/g,"cbr(").replace(/abs\\(/g,"ab(");
  s=s.replace(/floor\\(/g,"fl(").replace(/ceil\\(/g,"cl(").replace(/round\\(/g,"rn(").replace(/trunc\\(/g,"tr2(").replace(/sign\\(/g,"sg(");
  s=s.replace(/exp\\(/g,"ep(").replace(/factorial\\(/g,"fact(").replace(/perm\\(/g,"pm(").replace(/comb\\(/g,"cb(");
  s=s.replace(/gcd\\(/g,"gd(").replace(/lcm\\(/g,"lc(");
  s=s.replace(/pi/g,""+Math.PI).replace(/e(?!xp|\\()/g,""+Math.E);
  var fn=new Function("sn","cs","tn","asn","acs","atn","snh","csh","tnh","asnh","acsh","atnh","sec2","csc2","cot2","lg","ln2","lg2","sqt","cbr","ab","fl","cl","rn","tr2","sg","ep","fact","pm","cb","gd","lc","return("+s+")");
  var r=fn(sn,cs,tn,asn,acs,atn,snh,csh,tnh,asnh,acsh,atnh,sec2,csc2,cot2,lg,ln2,lg2,sqt,cbr,ab,fl,cl,rn,tr2,sg,ep,fact,pm,cb,gd,lc);
  return{r:r,e:null}
  }catch(e){return{r:null,e:e.message||"Error"}}
}

// ── BASIC KEYS (5x5) ──
var BK=[
["AC","ctrl","clearAll"],["(","ctrl","("],[")","ctrl",")"],["\u00F7","op","/"],["\u232B","ctrl","del"],
["M+","mem","m+"],["7","num","7"],["8","num","8"],["9","num","9"],["\u00D7","op","*"],
["M\u2212","mem","m-"],["4","num","4"],["5","num","5"],["6","num","6"],["\u2212","op","-"],
["MR","mem","mr"],["1","num","1"],["2","num","2"],["3","num","3"],["+","op","+"],
["MC","mem","mc"],["0","num","0"],[".","num","."],["(\u2212)","ctrl","neg"],["=","eq","eval"]
];

// ── SCIENTIFIC KEYS (7x5) ──
var SK=[
["2nd","ctrl","shift"],["DRG","ctrl","mode"],["DEL","ctrl","del"],["(","ctrl","("],[")","ctrl",")"],
["LOG","fn","log"],["\u03C0","fn","pi"],["SIN","fn","sin"],["COS","fn","cos"],["TAN","fn","tan"],
["x\u00B2","fn","sq"],["^","op","^"],["\u221A","fn","sqrt"],["x\u207B\u00B9","fn","inv"],["CLR","ctrl","clearAll"],
["7","num","7"],["8","num","8"],["9","num","9"],["\u00F7","op","/"],["\u00D7","op","*"],
["4","num","4"],["5","num","5"],["6","num","6"],["\u2212","op","-"],["+","op","+"],
["1","num","1"],["2","num","2"],["3","num","3"],["M+","mem","m+"],["M\u2212","mem","m-"],
["0","num","0"],[".","num","."],["(\u2212)","ctrl","neg"],["ANS","ctrl","ans"],["=","eq","eval"]
];

var SHIFT_MAP={sin:"asin",cos:"acos",tan:"atan",log:"10**",sq:"**3",sqrt:"cbrt",inv:"abs"};

var root=document.getElementById("root");
root.innerHTML="";

// ── Outer container (matches draggable-calculator.tsx) ──
var outer=document.createElement("div");
outer.style.cssText="position:relative;display:inline-block;";
root.appendChild(outer);

// ── Calculator container (matches rounded-xl border shadow-2xl) ──
var calcEl=document.createElement("div");
calcEl.id="calc";
calcEl.style.cssText="position:relative;overflow:hidden;border-radius:"+Math.max(t.radius||8,4)+"px;border:1px solid "+mix(P,0.25)+";box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);width:"+curW+"px;height:"+curH+"px;background:"+t.bg+";color:"+t.text+";transform:translate("+posX+"px,"+posY+"px);display:flex;flex-direction:column;";
outer.appendChild(calcEl);

// ── Header (matches draggable-calculator.tsx px-3 py-2) ──
var hdr=document.createElement("div");
hdr.style.cssText="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;cursor:grab;user-select:none;-webkit-user-select:none;background:"+t.bg+";border-bottom:1px solid "+mix(P,0.1)+";flex-shrink:0;";
calcEl.appendChild(hdr);

var hdrLeft=document.createElement("div");
hdrLeft.style.cssText="display:flex;align-items:center;gap:10px;";
hdr.appendChild(hdrLeft);

// Mode switcher (matches calculator.tsx)
var modeWrap=document.createElement("div");
modeWrap.style.cssText="display:flex;align-items:center;gap:2px;padding:2px;border-radius:8px;background:rgba(255,255,255,0.03);";
hdrLeft.appendChild(modeWrap);

var basicBtn=document.createElement("button");
basicBtn.textContent="Basic";
basicBtn.style.cssText="padding:4px 10px;font-size:9px;border-radius:6px;border:none;cursor:pointer;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;transition:all 0.15s;";
var sciBtn=document.createElement("button");
sciBtn.textContent="Sci";
sciBtn.style.cssText="padding:4px 10px;font-size:9px;border-radius:6px;border:none;cursor:pointer;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;transition:all 0.15s;";
modeWrap.appendChild(basicBtn);
modeWrap.appendChild(sciBtn);

// Status indicators (matches calculator.tsx)
var statusEl=document.createElement("div");
statusEl.style.cssText="display:flex;align-items:center;gap:8px;font-size:9px;font-family:monospace;letter-spacing:0.1em;color:"+t.muted+";";
hdrLeft.appendChild(statusEl);
var angleSpan=document.createElement("span");
var memSpan=document.createElement("span");
memSpan.style.cssText="color:#facc15;opacity:0.6;display:none;";
var shiftSpan=document.createElement("span");
shiftSpan.style.cssText="color:#34d399;opacity:0.8;display:none;";
statusEl.appendChild(angleSpan);
statusEl.appendChild(memSpan);
statusEl.appendChild(shiftSpan);

// "calculo" label
var label=document.createElement("span");
label.style.cssText="font-size:10px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;opacity:0.3;color:"+t.muted+";";
label.textContent="calculo";
hdr.appendChild(label);

// Header right: 3-dot menu + close
var hdrRight=document.createElement("div");
hdrRight.style.cssText="display:flex;align-items:center;gap:4px;";
hdr.appendChild(hdrRight);

var menuWrap2=document.createElement("div");
menuWrap2.style.cssText="position:relative;";
hdrRight.appendChild(menuWrap2);

var menuBtn=document.createElement("button");
menuBtn.style.cssText="padding:4px;border-radius:4px;border:none;background:transparent;cursor:pointer;opacity:0.4;transition:opacity 0.15s;display:flex;align-items:center;justify-content:center;";
menuBtn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>';
menuBtn.onmouseenter=function(){this.style.opacity="0.8"};
menuBtn.onmouseleave=function(){this.style.opacity="0.4"};
menuWrap2.appendChild(menuBtn);

var closeBtn=document.createElement("button");
closeBtn.style.cssText="padding:4px;border-radius:4px;border:none;background:transparent;cursor:pointer;opacity:0.3;transition:opacity 0.15s;display:flex;align-items:center;justify-content:center;";
closeBtn.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
closeBtn.onmouseenter=function(){this.style.opacity="0.7"};
closeBtn.onmouseleave=function(){this.style.opacity="0.3"};
hdrRight.appendChild(closeBtn);

// ── Menu panel (matches draggable-calculator.tsx) ──
var menuPanel=document.createElement("div");
menuPanel.style.cssText="display:none;position:absolute;right:0;top:calc(100% + 4px);border-radius:12px;border:1px solid "+mix(P,0.2)+";box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);min-width:240px;overflow:hidden;z-index:100;background:#18181b;";
menuWrap2.appendChild(menuPanel);

var tabWrap=document.createElement("div");
tabWrap.style.cssText="display:flex;border-bottom:1px solid rgba(39,39,42,1);";
menuPanel.appendChild(tabWrap);
var tabs=["theme","embed","config"];
var tabBtns=[];
tabs.forEach(function(name){
  var tb=document.createElement("button");
  tb.textContent=name;
  tb.style.cssText="flex:1;padding:8px 0;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;font-weight:500;border:none;background:transparent;cursor:pointer;color:rgba(255,255,255,0.3);transition:all 0.15s;outline:none;";
  tabBtns.push(tb);
  tabWrap.appendChild(tb);
});

var themeContent=document.createElement("div");
themeContent.style.cssText="padding:16px;";
menuPanel.appendChild(themeContent);
var themeTitle=document.createElement("div");
themeTitle.style.cssText="font-size:10px;text-transform:uppercase;letter-spacing:0.15em;font-weight:500;color:rgba(255,255,255,0.4);margin-bottom:16px;";
themeTitle.textContent="Themes ("+themeOrder.length+")";
themeContent.appendChild(themeTitle);
var themeGrid=document.createElement("div");
themeGrid.style.cssText="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;";
themeContent.appendChild(themeGrid);

var embedContent=document.createElement("div");
embedContent.style.cssText="display:none;padding:16px;";
menuPanel.appendChild(embedContent);
var configContent=document.createElement("div");
configContent.style.cssText="display:none;padding:16px;";
menuPanel.appendChild(configContent);

// ── Display (matches calculator.tsx rounded-2xl) ──
var disp=document.createElement("div");
disp.style.cssText="margin:0 12px 8px;border-radius:16px;overflow:hidden;flex-shrink:0;background:#0e0e10;border:1px solid rgba(255,255,255,0.05);box-shadow:inset 0 2px 8px rgba(0,0,0,0.3);";
calcEl.appendChild(disp);

var dispInner=document.createElement("div");
dispInner.style.cssText="padding:12px 16px 6px;";
disp.appendChild(dispInner);

var exDiv=document.createElement("div");
exDiv.style.cssText="font-family:monospace;font-size:11px;overflow-x:auto;white-space:nowrap;min-height:1em;color:"+rgba(t.text,0.45)+";";
exDiv.textContent="\u00A0";
dispInner.appendChild(exDiv);

var rsDiv=document.createElement("div");
rsDiv.style.cssText="font-family:monospace;font-size:26px;font-weight:600;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-0.02em;";
rsDiv.textContent="0";
dispInner.appendChild(rsDiv);

// Display footer (matches calculator.tsx)
var dispFooter=document.createElement("div");
dispFooter.style.cssText="display:flex;align-items:center;justify-content:space-between;padding:4px 12px 4px;margin-top:4px;background:rgba(255,255,255,0.02);border-top:1px solid rgba(255,255,255,0.03);";
disp.appendChild(dispFooter);
var modeFooter=document.createElement("div");
modeFooter.style.cssText="display:flex;align-items:center;gap:8px;font-size:8px;font-family:monospace;letter-spacing:0.15em;text-transform:uppercase;color:"+rgba(t.text,0.3)+";";
dispFooter.appendChild(modeFooter);
var modeLabel=document.createElement("span");
modeFooter.appendChild(modeLabel);
var histCountEl=document.createElement("span");
histCountEl.style.cssText="font-size:8px;font-family:monospace;color:"+rgba(t.text,0.25)+";";
dispFooter.appendChild(histCountEl);

// ── Keys container (matches calculator.tsx) ──
var keysEl=document.createElement("div");
keysEl.style.cssText="flex:1;display:flex;flex-direction:column;gap:5px;padding:0 12px 4px;min-height:0;overflow:hidden;";
calcEl.appendChild(keysEl);

// ── Branding footer (matches calculator.tsx) ──
var footer=document.createElement("div");
footer.style.cssText="flex-shrink:0;padding:2px 0 10px;text-align:center;";
footer.innerHTML='<a href="https://calculo-fawn.vercel.app" target="_blank" rel="noopener noreferrer" style="font-size:9px;font-family:monospace;letter-spacing:0.25em;text-transform:uppercase;color:'+rgba(t.text,0.18)+';text-decoration:none">calculo</a>';
calcEl.appendChild(footer);

// ── Resize handle (matches draggable-calculator.tsx) ──
var resizeHandle=document.createElement("div");
resizeHandle.style.cssText="position:absolute;bottom:0;right:0;width:20px;height:20px;cursor:se-resize;opacity:0.3;transition:opacity 0.15s;z-index:50;color:"+t.text+";";
resizeHandle.innerHTML='<svg viewBox="0 0 16 16" fill="none" style="width:100%;height:100%"><path d="M16 0v16H0" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.2"/><path d="M16 8v8H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.1"/></svg>';
resizeHandle.onmouseenter=function(){this.style.opacity="0.8"};
resizeHandle.onmouseleave=function(){this.style.opacity="0.3"};
calcEl.appendChild(resizeHandle);

// ── Apply theme ──
function applyTheme(tk){
  curTheme=tk;t=THEMES[tk]||THEMES.dark;
  calcEl.style.background=t.bg;calcEl.style.color=t.text;
  calcEl.style.borderColor=mix(P,0.25);
  calcEl.style.borderRadius=Math.max(t.radius||8,4)+"px";
  hdr.style.background=t.bg;hdr.style.borderBottomColor=mix(P,0.1);
  menuPanel.style.borderColor=mix(P,0.2);
  applyModeBtnStyles();
  buildKeys();
  renderThemeGrid();
  label.style.color=t.muted;
  shiftSpan.style.color=t.muted;
  angleSpan.style.color=t.muted;
  footer.querySelector("a").style.color=rgba(t.text,0.18);
}

function applyModeBtnStyles(){
  basicBtn.style.backgroundColor=mode==="basic"?mix(P,0.2):"transparent";
  basicBtn.style.color=mode==="basic"?P:rgba(t.text,0.4);
  sciBtn.style.backgroundColor=mode==="scientific"?mix(P,0.2):"transparent";
  sciBtn.style.color=mode==="scientific"?P:rgba(t.text,0.4);
  angleSpan.textContent=mode==="scientific"?angle:"";
  memSpan.style.display=mem!==null?"inline":"none";
  shiftSpan.style.display=sh?"inline":"none";
  modeLabel.textContent=mode==="scientific"?(angle+(sh?" 2ND":"")):(mode==="basic"?"BASIC":"SCI");
}

// ── Theme grid (matches theme-panel.tsx) ──
function renderThemeGrid(){
  themeGrid.innerHTML="";
  themeOrder.forEach(function(tk){
    var th=THEMES[tk];
    var isActive=curTheme===tk;
    var btn=document.createElement("button");
    btn.title=tk;
    btn.style.cssText="position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px;border-radius:8px;cursor:pointer;transition:all 0.15s;outline:none;border:"+(isActive?"1px solid rgba(156,156,168,0.4)":"1px solid transparent")+";background:"+th.bg+";";
    var swatchWrap=document.createElement("div");
    swatchWrap.style.cssText="display:flex;gap:2px;width:100%;justify-content:center;";
    var s1=document.createElement("span");
    s1.style.cssText="width:12px;height:12px;border-radius:3px;background:"+th.primary+";";
    var s2=document.createElement("span");
    s2.style.cssText="width:12px;height:12px;border-radius:3px;background:"+th.text+";opacity:0.3;";
    swatchWrap.appendChild(s1);swatchWrap.appendChild(s2);
    btn.appendChild(swatchWrap);
    var lbl=document.createElement("span");
    lbl.style.cssText="font-size:9px;text-transform:capitalize;width:100%;text-align:center;color:"+th.text+";overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    lbl.textContent=tk;
    btn.appendChild(lbl);
    btn.addEventListener("click",function(){applyTheme(tk);closeMenu()});
    themeGrid.appendChild(btn);
  });
}

// ── Update display ──
function upd(){
  exDiv.textContent=ex||"\u00A0";
  rsDiv.textContent=re;
  histCountEl.textContent=hist.length>0?hist.length:"";
  applyModeBtnStyles();
}

// ── Evaluate ──
function evl(){
  if(!ex)return;
  var r=ev(ex);
  if(r.e){re="Error";ex=""}
  else{re=String(r.r);ans=re;hist.push({e:ex,r:re});ex=""}
  upd();
}

// ── Actions ──
function act(a){
  if(a==="shift"){if(mode!=="scientific")return;sh=!sh;upd();return}
  if(a==="mode"){if(mode!=="scientific")return;angle=angle==="DEG"?"RAD":angle==="RAD"?"GRAD":"DEG";sh=false;upd();return}
  var f=a;
  if(sh&&SHIFT_MAP[a])f=SHIFT_MAP[a];
  sh=false;
  if(f==="clearAll"){ex="";re="0";ans=null;mem=null;hist=[];upd();return}
  if(f==="del"){ex=ex.slice(0,-1);upd();return}
  if(f==="neg"){ex=ex.indexOf("-")===0?ex.slice(1):"-"+ex;upd();return}
  if(f==="pi"){ex+=""+Math.PI;upd();return}
  if(f==="ans"&&ans){ex+=ans;upd();return}
  if(f==="sq"){ex+="^(2)";upd();return}
  if(f==="**3"){ex+="^(3)";upd();return}
  if(f==="inv"){ex+="abs(";upd();return}
  if(f==="^"&&(ex===""||ex==="(")&&ans!==null){ex+=ans+"^";upd();return}
  if(["sin","cos","tan","asin","acos","atan","sinh","cosh","tanh","asinh","acosh","atanh","sec","csc","cot","log","ln","sqrt","cbrt","abs","floor","ceil","round","trunc","sign","exp","factorial","perm","comb","gcd","lcm"].indexOf(f)>=0){ex+=f+"(";upd();return}
  if(f==="10**"){ex+="10^(";upd();return}
  if(f==="m+"){var v=parseFloat(re);if(!isNaN(v))mem=(mem||0)+v;upd();return}
  if(f==="m-"){var v=parseFloat(re);if(!isNaN(v))mem=(mem||0)-v;upd();return}
  if(f==="MR"){if(mem!==null)ex+=String(mem);upd();return}
  if(f==="MC"){mem=null;upd();return}
  if(f==="eval"){evl();return}
  ex+=f;upd();
}

// ── Mode buttons ──
basicBtn.addEventListener("click",function(){mode="basic";ex="";re="0";hist=[];upd();buildKeys()});
sciBtn.addEventListener("click",function(){mode="scientific";ex="";re="0";hist=[];upd();buildKeys()});

// ── Build keys (matches calculator.tsx rounded-2xl) ──
function buildKeys(){
  keysEl.innerHTML="";
  var KD=mode==="scientific"?SK:BK;
  for(var ri=0;ri<KD.length;ri+=5){
    var row=KD.slice(ri,ri+5);
    var r=document.createElement("div");
    r.style.cssText="display:flex;gap:5px;flex:1;min-height:0;";
    row.forEach(function(d){
      var kd=d[1];
      var b=document.createElement("button");
      b.textContent=d[0];
      b.style.cssText="flex:1;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;font-family:system-ui;position:relative;user-select:none;transition:transform 80ms,background 0.15s;border-radius:16px;min-height:30px;font-size:"+(kd==="fn"||kd==="ctrl"||kd==="mem"?"11px":"13px")+";font-weight:"+(kd==="eq"?"700":"500")+";background:"+keyBg(kd)+";color:"+keyColor(kd)+";";
      b.addEventListener("mousedown",function(){b.style.transform="scale(0.92)"});
      b.addEventListener("mouseup",function(){b.style.transform=""});
      b.addEventListener("mouseleave",function(){b.style.transform=""});
      b.addEventListener("click",function(){act(d[2])});
      r.appendChild(b);
    });
    keysEl.appendChild(r);
  }
}

// ── Drag (matches draggable-calculator.tsx) ──
hdr.addEventListener("mousedown",function(e){
  if(e.target.tagName==="BUTTON")return;
  dragging=true;
  dragSX=e.clientX;dragSY=e.clientY;dragPX=posX;dragPY=posY;
  calcEl.style.cursor="grabbing";
  document.body.style.userSelect="none";
});
document.addEventListener("mousemove",function(e){
  if(dragging){
    posX=dragPX+e.clientX-dragSX;
    posY=dragPY+e.clientY-dragSY;
    calcEl.style.transform="translate("+posX+"px,"+posY+"px)";
  }
  if(resizing){
    curW=Math.max(260,resizeSW+e.clientX-resizeSX);
    curH=Math.max(360,resizeSH+e.clientY-resizeSY);
    calcEl.style.width=curW+"px";
    calcEl.style.height=curH+"px";
  }
});
document.addEventListener("mouseup",function(){
  if(dragging){dragging=false;calcEl.style.cursor="";document.body.style.userSelect=""}
  if(resizing){resizing=false;document.body.style.cursor="";document.body.style.userSelect=""}
});

// ── Resize ──
resizeHandle.addEventListener("mousedown",function(e){
  e.preventDefault();e.stopPropagation();
  resizing=true;
  resizeSX=e.clientX;resizeSY=e.clientY;
  resizeSW=curW;resizeSH=curH;
  document.body.style.cursor="se-resize";
  document.body.style.userSelect="none";
});

// ── Menu ──
function openMenu(){menuTab="theme";menuPanel.style.display="block";updateMenuTabs();renderThemeGrid();updateEmbedPanel();updateConfigPanel()}
function closeMenu(){menuTab=null;menuPanel.style.display="none"}
function switchTab(name){menuTab=name;updateMenuTabs()}
function updateMenuTabs(){
  tabs.forEach(function(name,i){
    var tb=tabBtns[i];
    var active=menuTab===name;
    tb.style.color=active?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.3)";
    tb.style.borderBottom=active?"2px solid rgba(255,255,255,0.9)":"2px solid transparent";
  });
  themeContent.style.display=menuTab==="theme"?"block":"none";
  embedContent.style.display=menuTab==="embed"?"block":"none";
  configContent.style.display=menuTab==="config"?"block":"none";
}
menuBtn.addEventListener("click",function(e){e.stopPropagation();menuTab?closeMenu():openMenu()});
document.addEventListener("mousedown",function(e){if(menuTab&&!menuPanel.contains(e.target)&&!menuWrap2.contains(e.target))closeMenu()});
menuPanel.addEventListener("mousedown",function(e){e.stopPropagation()});
tabBtns.forEach(function(tb,i){tb.addEventListener("click",function(){switchTab(tabs[i])})});

function updateEmbedPanel(){
  var code='<div class="calculo-calculator"\\n  data-mode="'+(mode==="scientific"?"scientific":"basic")+'"\\n  data-theme="'+curTheme+'"\\n  data-width="'+curW+'"\\n  data-height="'+curH+'"\\n></div>\\n<script src="https://cdn.calculo.dev/widget.js"><\\/script>';
  embedContent.innerHTML='<div style="display:flex;flex-direction:column;gap:12px">'+
    '<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.15em;font-weight:500;color:rgba(255,255,255,0.4)">Embed Code</div>'+
    '<pre style="font-family:monospace;font-size:11px;padding:12px;border-radius:8px;overflow-x:auto;line-height:1.6;white-space:pre-wrap;word-break:break-all;background:#09090b;color:'+t.text+';border:1px solid rgba(255,255,255,0.08)">'+code+'</pre>'+
    '<button id="copy-embed" style="width:100%;padding:6px 0;font-size:10px;border-radius:8px;text-transform:uppercase;letter-spacing:0.1em;font-weight:500;border:none;cursor:pointer;background:'+mix(P,0.2)+';color:'+P+';transition:all 0.15s">Copy</button></div>';
  var cp=document.getElementById("copy-embed");
  if(cp)cp.addEventListener("click",function(){navigator.clipboard.writeText(code).then(function(){cp.textContent="Copied";setTimeout(function(){cp.textContent="Copy"},2000)})});
}
function updateConfigPanel(){
  var cfg=JSON.stringify({theme:curTheme,primary:P,width:curW,height:curH,mode:mode},null,2);
  configContent.innerHTML='<div style="display:flex;flex-direction:column;gap:12px">'+
    '<div style="font-size:10px;text-transform:uppercase;letter-spacing:0.15em;font-weight:500;color:rgba(255,255,255,0.4)">Config JSON</div>'+
    '<pre style="font-family:monospace;font-size:10px;padding:12px;border-radius:8px;overflow-x:auto;line-height:1.6;background:#09090b;color:'+t.text+';border:1px solid rgba(255,255,255,0.08)">'+cfg+'</pre>'+
    '<button id="copy-cfg" style="width:100%;padding:6px 0;font-size:10px;border-radius:8px;text-transform:uppercase;letter-spacing:0.1em;font-weight:500;border:none;cursor:pointer;background:'+mix(P,0.2)+';color:'+P+';transition:all 0.15s">Copy</button></div>';
  var cp=document.getElementById("copy-cfg");
  if(cp)cp.addEventListener("click",function(){navigator.clipboard.writeText(cfg).then(function(){cp.textContent="Copied";setTimeout(function(){cp.textContent="Copy"},2000)})});
}

// ── Minimize/Restore ──
function minimize(){calcEl.style.display="none";document.getElementById("show-btn").style.display="flex"}
function restore(){calcEl.style.display="flex";document.getElementById("show-btn").style.display="none"}
closeBtn.addEventListener("click",minimize);
var fab=document.getElementById("show-btn");
fab.style.background=P;
fab.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="15" y2="6"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/></svg>';
fab.addEventListener("click",restore);

// ── Keyboard ──
document.addEventListener("keydown",function(e){
  if(e.target.tagName==="BUTTON")return;
  if(e.key==="Enter"){e.preventDefault();act("eval")}
  else if(e.key==="Backspace"){e.preventDefault();act("del")}
  else if(e.key==="Escape")act("clearAll");
  else if(/^[0-9+\-*/.^()]+$/.test(e.key))act(e.key);
});

// ── Init ──
applyModeBtnStyles();
buildKeys();
renderThemeGrid();
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
