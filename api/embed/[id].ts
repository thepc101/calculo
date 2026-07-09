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
  const t = (config.theme?.mode === 'light')
    ? { bg: '#ffffff', surface: '#f5f5f5', border: 'rgba(0,0,0,0.08)', text: '#18181b', muted: 'rgba(0,0,0,0.4)', primary: '#2563eb', numBg: 'rgba(0,0,0,0.05)', opBg: 'rgba(0,0,0,0.03)', fnBg: 'rgba(0,0,0,0.02)', ctrlBg: 'rgba(0,0,0,0.04)' }
    : { bg: '#0a0a0b', surface: '#111113', border: 'rgba(255,255,255,0.06)', text: '#fafafa', muted: 'rgba(255,255,255,0.4)', primary: '#3b82f6', numBg: 'rgba(255,255,255,0.08)', opBg: 'rgba(255,255,255,0.05)', fnBg: 'rgba(255,255,255,0.04)', ctrlBg: 'rgba(255,255,255,0.06)' };
  const primary = config.theme?.primaryColor || t.primary;
  const isSci = config.type !== 'basic';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Calculo</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:transparent;overflow:hidden}</style></head><body><div id="c"></div><script>
(function(){
var t=${JSON.stringify(t)};
var P=${JSON.stringify(primary)};
var isSci=${JSON.stringify(isSci)};
var am='deg',ex='',re='0',ans=null,sh=false,mem=null;
function ev(s){
s=s.replace(/\\u03C0/g,'pi').replace(/\\u00D7/g,'*').replace(/\\u00F7/g,'/').replace(/\\u2212/g,'-').replace(/\\u221A\\(/g,'sqrt(').replace(/\\^/g,'**');
try{var fn=new Function('a','with(Math){var pi=Math.PI,e=Math.E;var sin=function(x){return a==="deg"?Math.sin(x*Math.PI/180):Math.sin(x)};var cos=function(x){return a==="deg"?Math.cos(x*Math.PI/180):Math.cos(x)};var tan=function(x){return a==="deg"?Math.tan(x*Math.PI/180):Math.tan(x)};var asin=function(x){var r=Math.asin(x);return a==="deg"?r*180/Math.PI:r};var acos=function(x){var r=Math.acos(x);return a==="deg"?r*180/Math.PI:r};var atan=function(x){var r=Math.atan(x);return a==="deg"?r*180/Math.PI:r};var log=function(x){return Math.log10(x)};var ln=function(x){return Math.log(x)};var sqrt=function(x){return Math.sqrt(x)};var abs=function(x){return Math.abs(x)};var cbrt=function(x){return Math.cbrt(x)};var exp=function(x){return Math.exp(x)};var round=function(x){return Math.round(x)};var floor=function(x){return Math.floor(x)};var ceil=function(x){return Math.ceil(x)};var perm=function(n,k){var r=1;for(var i=n;i>n-k;i--)r*=i;return r};var comb=function(n,k){if(k>n)return 0;var k2=Math.min(k,n-k),r=1;for(var i=1;i<=k2;i++)r*=(n-k2+i)/i;return Math.round(r)};return ('+s+')}');
return{r:fn(a||'deg'),e:null}}catch(e){return{r:null,e:e.message||'Error'}}}
var C=document.getElementById('c');
C.setAttribute('style','font-family:system-ui,sans-serif;color:'+t.text+';background:'+t.bg+';border-radius:12px;overflow:hidden;width:${width};box-sizing:border-box;min-height:100vh;display:flex;flex-direction:column;position:relative');
var clBtn=E('button',{style:{position:'absolute',top:'6px',right:'8px',width:'20px',height:'20px',borderRadius:'50%',border:'none',cursor:'pointer',background:'rgba(255,255,255,0.08)',color:t.muted,fontSize:'12px',display:'flex',alignItems:'center',justifyContent:'center',zIndex:'10',padding:'0',lineHeight:'1'}},'\\u00D7');
var fab=E('button',{style:{display:'none',position:'fixed',bottom:'24px',right:'24px',width:'52px',height:'52px',borderRadius:'50%',border:'none',cursor:'pointer',background:P,color:'#fff',fontSize:'22px',boxShadow:'0 4px 16px rgba(0,0,0,0.4)',zIndex:'99998',alignItems:'center',justifyContent:'center',transition:'transform 0.2s, box-shadow 0.2s'}},'\\u2295');
function minimize(){wr.style.display='none';fab.style.display='flex';C.style.background='transparent';C.style.overflow='visible';C.style.borderRadius='0';C.style.minHeight='0'}
function restore(){wr.style.display='flex';fab.style.display='none';C.style.background=t.bg;C.style.overflow='hidden';C.style.borderRadius='12px';C.style.minHeight='100vh'}
clBtn.addEventListener('click',minimize);fab.addEventListener('click',restore);
fab.addEventListener('mouseenter',function(){fab.style.transform='scale(1.1)'});fab.addEventListener('mouseleave',function(){fab.style.transform=''});
function K(s){return s.replace(/([A-Z])/g,'-$1').toLowerCase()}
function E(tag,at,ch){var e=document.createElement(tag);if(at){for(var k in at){if(k==='style'&&typeof at[k]==='object'){var p=[];var st=at[k];for(var q in st)p.push(K(q)+':'+st[q]);e.setAttribute('style',p.join(';'))}else if(k.indexOf('on')===0)e.addEventListener(k.slice(2),at[k]);else if(k==='id')e.id=at[k];else e.setAttribute(k,at[k])}}if(ch){if(typeof ch==='string')e.textContent=ch;else if(Array.isArray(ch))ch.forEach(function(c){if(c)e.appendChild(c)});else e.appendChild(ch)}return e}
function upd(){document.getElementById('ex').textContent=ex||'\\u00A0';document.getElementById('rs').textContent=re;var s=document.getElementById('st');if(s)s.textContent=isSci?(am+(sh?' \\u00B7 2ND':'')):''}
function evl(){if(!ex)return;var r=ev(ex,am);if(r.e){re='Error'}else{re=String(r.r);ans=re;ex=''}upd()}
var SM={sin:'asin',cos:'acos',tan:'atan',log:'10**',sq:'**3',sqrt:'cbrt',inv:'abs'};
function act(a){if(a==='shift'){if(!isSci)return;sh=!sh;upd();return}if(a==='mode'){if(!isSci)return;am=am==='deg'?'rad':am==='rad'?'grad':'deg';sh=false;upd();return}var f=a;if(sh&&SM[a])f=SM[a];sh=false;if(f==='clearAll'){ex='';re='0';ans=null;mem=null;upd();return}if(f==='del'){ex=ex.slice(0,-1);upd();return}if(f==='neg'){ex=ex.indexOf('-')===0?ex.slice(1):'-'+ex;upd();return}if(f==='pi'){ex+='\\u03C0';upd();return}if(f==='ans'&&ans){ex+=ans;upd();return}if(f==='sq'){ex+='^2';upd();return}if(f==='**3'){ex+='^3';upd();return}if(f==='inv'){ex+='abs(';upd();return}if(['sin','cos','tan','asin','acos','atan','log','ln','sqrt','cbrt'].indexOf(f)>=0){ex+=f+'(';upd();return}if(f==='10**'){ex+='10^(';upd();return}if(f==='m+'){var v=parseFloat(re);if(!isNaN(v))mem=(mem||0)+v;return}if(f==='m-'){var v=parseFloat(re);if(!isNaN(v))mem=(mem||0)-v;return}if(f==='MR'){if(mem!==null)ex+=String(mem);upd();return}if(f==='MC'){mem=null;return}if(f==='eval'){evl();return}ex+=f;upd()}
var BK=[['AC','ctrl','clearAll'],['(','ctrl','('],[')','ctrl',')'],['\\u00F7','op','/'],['DEL','ctrl','del'],['M+','mem','m+'],['7','num','7'],['8','num','8'],['9','num','9'],['\\u00D7','op','*'],['M\\u2212','mem','m-'],['4','num','4'],['5','num','5'],['6','num','6'],['\\u2212','op','-'],['MR','mem','mr'],['1','num','1'],['2','num','2'],['3','num','3'],['+','op','+'],['MC','mem','mc'],['0','num','0'],['.','num','.'],['(\\u2212)','ctrl','neg'],['\\uFF1D','eq','eval']];
var SK=[['2nd','ctrl','shift'],['DRG','ctrl','mode'],['DEL','ctrl','del'],['(','ctrl','('],[')','ctrl',')'],['LOG','fn','log'],['\\u03C0','fn','pi'],['SIN','fn','sin'],['COS','fn','cos'],['TAN','fn','tan'],['x\\u00B2','fn','sq'],['^','op','^'],['\\u221A','fn','sqrt'],['x\\u207B\\u00B9','fn','inv'],['CLR','ctrl','clearAll'],['7','num','7'],['8','num','8'],['9','num','9'],['\\u00F7','op','/'],['\\u00D7','op','*'],['4','num','4'],['5','num','5'],['6','num','6'],['\\u2212','op','-'],['+','op','+'],['1','num','1'],['2','num','2'],['3','num','3'],['M+','mem','m+'],['M\\u2212','mem','m-'],['0','num','0'],['.','num','.'],['(\\u2212)','ctrl','neg'],['ANS','ctrl','ans'],['\\uFF1D','eq','eval']];
var KD=isSci?SK:BK;
var bc=E('div',{style:{display:'flex',flexDirection:'column',gap:'3px',padding:'0 8px'}});
KD.forEach(function(row){var r=E('div',{style:{display:'flex',gap:'3px'}});row.forEach(function(d){var lb=d[0],kd=d[1],ac=d[2];var bgC=(kd==='op'?t.opBg:kd==='fn'?t.fnBg:kd==='ctrl'?t.ctrlBg:kd==='eq'?P:kd==='mem'?t.fnBg:t.numBg);var cC=(kd==='op'?P:kd==='fn'||kd==='ctrl'||kd==='mem'?t.muted:kd==='eq'?'#fff':t.text);var b=E('button',{style:{flex:'1',height:'38px',borderRadius:'10px',border:'none',cursor:'pointer',background:bgC,color:cC,fontSize:(kd==='fn'||kd==='ctrl'||kd==='mem'?'11px':'13px'),fontWeight:(kd==='eq'?'700':'500'),fontFamily:'system-ui',display:'flex',alignItems:'center',justifyContent:'center',transition:'transform 80ms',position:'relative',userSelect:'none'}},lb);b.addEventListener('mousedown',function(){b.style.transform='scale(0.93)'});b.addEventListener('mouseup',function(){b.style.transform=''});b.addEventListener('mouseleave',function(){b.style.transform=''});b.addEventListener('click',function(){act(ac)});r.appendChild(b)});bc.appendChild(r)});
var hdr=E('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px 4px',position:'relative'}},[E('span',{style:{fontSize:'9px',fontWeight:'600',letterSpacing:'0.15em',textTransform:'uppercase',opacity:'0.3'}},'calculo'),clBtn,E('span',{style:{fontSize:'9px',fontFamily:'monospace',opacity:'0.35'},id:'st'},isSci?am:'')]);
var exEl=E('div',{id:'ex',style:{fontFamily:'monospace',fontSize:'11px',color:t.muted,minHeight:'1.2em',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',padding:'0 12px'}},'\\u00A0');
var rsEl=E('div',{id:'rs',style:{fontFamily:'monospace',fontSize:'24px',fontWeight:'600',textAlign:'right',padding:'0 12px 8px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},'0');
var disp=E('div',{style:{background:t.surface,margin:'0 8px 8px',borderRadius:'10px',border:'1px solid '+t.border,paddingTop:'8px'}},[exEl,rsEl]);
var ft=E('div',{style:{textAlign:'center',padding:'8px 0 6px'}},[E('a',{href:'https://calculo-fawn.vercel.app',target:'_blank',rel:'noopener noreferrer',style:{fontSize:'8px',fontFamily:'monospace',letterSpacing:'0.2em',textTransform:'uppercase',color:t.muted,textDecoration:'none',opacity:'0.4'}},'calculo')]);
var wr=E('div',{style:{display:'flex',flexDirection:'column',flex:'1'}});wr.appendChild(hdr);wr.appendChild(disp);wr.appendChild(bc);wr.appendChild(ft);C.appendChild(wr);C.appendChild(fab);
document.addEventListener('keydown',function(e){if(e.target.tagName==='BUTTON')return;if(e.key==='Enter'){e.preventDefault();act('eval')}else if(e.key==='Backspace'){e.preventDefault();act('del')}else if(e.key==='Escape')act('clearAll');else if(/^[0-9+\\-*/.^()]+$/.test(e.key))act(e.key)});
upd()})();
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
    theme: { mode: 'dark', primaryColor: '#f0abfc', backgroundColor: '#0a0a0b', textColor: '#fafafa' },
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
