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

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Calculo</title><style>' +
  '*{margin:0;padding:0;box-sizing:border-box}' +
  'html,body{width:100%;height:100%;overflow:auto;font-family:system-ui,sans-serif}' +
  'body{background:transparent;display:flex;justify-content:center;align-items:flex-start;padding:8px}' +
  '</style></head><body>' +
  '<button id="show-btn" style="display:none;position:fixed;bottom:24px;right:24px;width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;color:#fff;font-size:22px;box-shadow:0 4px 20px rgba(0,0,0,0.4);align-items:center;justify-content:center;z-index:99999"></button>' +
  '<div id="root"></div>' +
  '<script>' +
  '(function(){' +
  'var isSci=' + isSciJson + ';' +
  'var am="deg",ex="",re="0",ans=null,sh=false,mem=null;' +
  'var curTheme=' + themeJson + ';' +
  'var P=' + primaryJson + ';' +
  'var W=' + wJson + ';' +
  'var H=' + hJson + ';' +

  'var THEMES={' +
  'dark:{bg:"#0a0a0b",surface:"#111113",border:"rgba(255,255,255,0.06)",text:"#fafafa",muted:"rgba(255,255,255,0.4)",primary:"#3b82f6"},' +
  'light:{bg:"#ffffff",surface:"#f5f5f5",border:"rgba(0,0,0,0.08)",text:"#18181b",muted:"rgba(0,0,0,0.4)",primary:"#3b82f6"},' +
  'oled:{bg:"#000000",surface:"#111111",border:"rgba(255,255,255,0.08)",text:"#ffffff",muted:"rgba(255,255,255,0.4)",primary:"#6366f1"},' +
  '"high-contrast":{bg:"#000000",surface:"#1a1a1a",border:"rgba(255,255,255,0.2)",text:"#ffffff",muted:"rgba(255,255,255,0.6)",primary:"#ffff00"},' +
  'glass:{bg:"rgba(15,15,25,0.85)",surface:"rgba(255,255,255,0.08)",border:"rgba(255,255,255,0.12)",text:"#ffffff",muted:"rgba(255,255,255,0.5)",primary:"#8b5cf6"},' +
  'neumorphism:{bg:"#e0e5ec",surface:"#d1d9e6",border:"rgba(0,0,0,0.08)",text:"#2d3748",muted:"rgba(0,0,0,0.35)",primary:"#6366f1"},' +
  'minimal:{bg:"#ffffff",surface:"#fafafa",border:"rgba(0,0,0,0.06)",text:"#000000",muted:"rgba(0,0,0,0.35)",primary:"#000000"},' +
  'corporate:{bg:"#f8fafc",surface:"#f1f5f9",border:"rgba(0,0,0,0.08)",text:"#0f172a",muted:"rgba(0,0,0,0.4)",primary:"#1e40af"},' +
  'cyberpunk:{bg:"#0d0d1a",surface:"#151528",border:"rgba(255,0,255,0.15)",text:"#00ff88",muted:"rgba(0,255,136,0.4)",primary:"#ff00ff"},' +
  'retro:{bg:"#fdf6e3",surface:"#f5efdc",border:"rgba(0,0,0,0.1)",text:"#2d1b00",muted:"rgba(45,27,0,0.4)",primary:"#e85d04"},' +
  'coffee:{bg:"#3e2723",surface:"#4e342e",border:"rgba(255,255,255,0.08)",text:"#d7ccc8",muted:"rgba(215,204,200,0.4)",primary:"#a67c52"},' +
  'ocean:{bg:"#0a1a2e",surface:"#0f2237",border:"rgba(0,188,212,0.12)",text:"#e0f7fa",muted:"rgba(224,247,250,0.4)",primary:"#00bcd4"},' +
  'forest:{bg:"#1b2e1b",surface:"#223a22",border:"rgba(102,187,106,0.12)",text:"#e8f5e9",muted:"rgba(232,245,233,0.4)",primary:"#66bb6a"},' +
  'sunset:{bg:"#1a0a2e",surface:"#221038",border:"rgba(255,111,0,0.12)",text:"#ffe0b2",muted:"rgba(255,224,178,0.4)",primary:"#ff6f00"},' +
  'aurora:{bg:"#0a1628",surface:"#0f1f35",border:"rgba(0,230,118,0.12)",text:"#b9f6ca",muted:"rgba(185,246,202,0.4)",primary:"#00e676"},' +
  'monochrome:{bg:"#121212",surface:"#1e1e1e",border:"rgba(255,255,255,0.08)",text:"#f5f5f5",muted:"rgba(255,255,255,0.4)",primary:"#888888"}' +
  '};' +
  'var themeOrder=["dark","light","oled","high-contrast","glass","neumorphism","minimal","corporate","cyberpunk","retro","coffee","ocean","forest","sunset","aurora","monochrome"];' +
  'var t=THEMES[curTheme]||THEMES.dark;' +

  'function hexToRgb(hex){' +
  'if(hex.charAt(0)==="#")hex=hex.slice(1);' +
  'if(hex.length===3)hex=hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];' +
  'var n=parseInt(hex,16);' +
  'return[(n>>16)&255,(n>>8)&255,n&255]' +
  '}' +

  'function mixColor(hex,amount){' +
  'var rgb=hexToRgb(hex);' +
  'return"rgba("+rgb[0]+","+rgb[1]+","+rgb[2]+","+amount+")"' +
  '}' +

  'function keyBg(kd){' +
  'if(kd==="op")return mixColor(P,0.12);' +
  'if(kd==="fn")return"rgba(24,24,27,0.8)";' +
  'if(kd==="ctrl")return"rgba(24,24,27,0.6)";' +
  'if(kd==="mem")return"rgba(24,24,27,0.5)";' +
  'if(kd==="eq")return P;' +
  'return"rgba(63,63,70,0.8)"' +
  '}' +
  'function keyCl(kd){' +
  'if(kd==="op")return P;' +
  'if(kd==="fn"||kd==="ctrl"||kd==="mem")return t.muted;' +
  'if(kd==="eq")return"#fff";' +
  'return t.text' +
  '}' +

  'function applyTheme(tk){' +
  'curTheme=tk;t=THEMES[tk]||THEMES.dark;' +
  'var root=document.getElementById("root");' +
  'var calc=root.querySelector("#calc");' +
  'if(calc){' +
  'calc.style.background=t.bg;calc.style.color=t.text;' +
  'calc.style.borderColor=mixColor(P,0.25);' +
  '}' +
  'var hdr=root.querySelector("#hdr");' +
  'if(hdr){hdr.style.background=t.bg;hdr.style.borderBottomColor=mixColor(P,0.1)}' +
  'var disp=root.querySelector("#disp");' +
  'if(disp){' +
  'disp.style.background="#0e0e10";' +
  'disp.style.border="1px solid rgba(255,255,255,0.05)"' +
  '}' +
  'var showBtn=document.getElementById("show-btn");' +
  'if(showBtn)showBtn.style.background=P;' +
  'var fab=document.getElementById("show-btn");' +
  'if(fab)fab.style.background=P;' +
  'var menuDiv=root.querySelector("#menu-panel");' +
  'if(menuDiv){menuDiv.style.background="#18181b";menuDiv.style.borderColor=mixColor(P,0.2)}' +
  'buildKeys();' +
  'updateThemePanel()' +
  '}' +

  'function updateThemePanel(){' +
  'var grid=document.getElementById("theme-grid");' +
  'if(!grid)return;' +
  'grid.innerHTML="";' +
  'themeOrder.forEach(function(tk){' +
  'var th=THEMES[tk];' +
  'var isActive=curTheme===tk;' +
  'var btn=document.createElement("button");' +
  'btn.title=tk;' +
  'btn.style.cssText="position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px;border-radius:8px;border:"+(isActive?"1px solid rgba(156,156,168,0.4) 0 0 1px solid rgba(156,156,168,0.3)":"1px solid transparent")+";background:"+th.bg+";cursor:pointer;transition:all 0.15s;outline:none;";' +
  'var swatchWrap=document.createElement("div");' +
  'swatchWrap.style.cssText="display:flex;gap:2px;width:100%;justify-content:center";' +
  'var s1=document.createElement("span");' +
  's1.style.cssText="width:12px;height:12px;border-radius:3px;background:"+th.primary+";";' +
  'var s2=document.createElement("span");' +
  's2.style.cssText="width:12px;height:12px;border-radius:3px;background:"+th.text+";opacity:0.3;";' +
  'swatchWrap.appendChild(s1);swatchWrap.appendChild(s2);' +
  'btn.appendChild(swatchWrap);' +
  'var label=document.createElement("span");' +
  'label.style.cssText="font-size:9px;text-transform:capitalize;width:100%;text-align:center;color:"+th.text+";overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";' +
  'label.textContent=tk;' +
  'btn.appendChild(label);' +
  'btn.addEventListener("click",function(){applyTheme(tk);closeMenu()});' +
  'grid.appendChild(btn)' +
  '})' +
  '}' +

  'var DEG=180/Math.PI;' +
  'function toRad(x){return am==="deg"?x*Math.PI/180:x}' +
  'function fromRad(x){return am==="deg"?x*DEG:x}' +
  'function sn(x){return Math.sin(toRad(x))}' +
  'function cs(x){return Math.cos(toRad(x))}' +
  'function tn(x){return Math.tan(toRad(x))}' +
  'function asn(x){return fromRad(Math.asin(x))}' +
  'function acs(x){return fromRad(Math.acos(x))}' +
  'function atn(x){return fromRad(Math.atan(x))}' +
  'function snh(x){return Math.sinh(x)}' +
  'function csh(x){return Math.cosh(x)}' +
  'function tnh(x){return Math.tanh(x)}' +
  'function asnh(x){return Math.asinh(x)}' +
  'function acsh(x){return Math.acosh(x)}' +
  'function atnh(x){return Math.atanh(x)}' +
  'function sec2(x){return 1/Math.cos(toRad(x))}' +
  'function csc2(x){return 1/Math.sin(toRad(x))}' +
  'function cot2(x){return 1/Math.tan(toRad(x))}' +
  'function lg(x){return Math.log10(x)}' +
  'function ln2(x){return Math.log(x)}' +
  'function lg2(x){return Math.log2(x)}' +
  'function sqt(x){return Math.sqrt(x)}' +
  'function cbr(x){return Math.cbrt(x)}' +
  'function ab(x){return Math.abs(x)}' +
  'function fl(x){return Math.floor(x)}' +
  'function cl(x){return Math.ceil(x)}' +
  'function rn(x){return Math.round(x)}' +
  'function tr2(x){return Math.trunc(x)}' +
  'function sg(x){return Math.sign(x)}' +
  'function ep(x){return Math.exp(x)}' +
  'function fact(x){if(x<0)throw new Error("! of negative");var r=1;for(var i=2;i<=x;i++)r*=i;return r}' +
  'function pm(n,k){var r=1;for(var i=n;i>n-k;i--)r*=i;return r}' +
  'function cb(n,k){if(k>n)return 0;var k2=Math.min(k,n-k),r=1;for(var i=1;i<=k2;i++)r*=(n-k2+i)/i;return Math.round(r)}' +
  'function gd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){var tp=b;b=a%b;a=tp}return a}' +
  'function lc(a,b){return Math.abs(a*b)/gd(a,b)}' +
  'function hyp(a,b){return Math.hypot(a,b)}' +

  'function ev(s){' +
  'try{' +
  's=s.replace(/\\u00D7/g,"*").replace(/\\u00F7/g,"/").replace(/\\u2212/g,"-").replace(/\\u03C0/g,""+Math.PI).replace(/\\u221A\\(/g,"sqt(").replace(/\\^/g,"**");' +
  's=s.replace(/\\u207B\\u00B9/g,"**(-1)");' +
  's=s.replace(/\\u00B2/g,"**2").replace(/\\u00B3/g,"**3");' +
  's=s.replace(/sinh\\(/g,"snh(").replace(/cosh\\(/g,"csh(").replace(/tanh\\(/g,"tnh(");' +
  's=s.replace(/asinh\\(/g,"asnh(").replace(/acosh\\(/g,"acsh(").replace(/atanh\\(/g,"atnh(");' +
  's=s.replace(/sec\\(/g,"sec2(").replace(/csc\\(/g,"csc2(").replace(/cot\\(/g,"cot2(");' +
  's=s.replace(/sin\\(/g,"sn(").replace(/cos\\(/g,"cs(").replace(/tan\\(/g,"tn(");' +
  's=s.replace(/asin\\(/g,"asn(").replace(/acos\\(/g,"acs(").replace(/atan\\(/g,"atn(");' +
  's=s.replace(/log10\\(/g,"lg(").replace(/log2\\(/g,"lg2(").replace(/log\\(/g,"lg(").replace(/ln\\(/g,"ln2(");' +
  's=s.replace(/sqrt\\(/g,"sqt(").replace(/cbrt\\(/g,"cbr(").replace(/abs\\(/g,"ab(");' +
  's=s.replace(/floor\\(/g,"fl(").replace(/ceil\\(/g,"cl(").replace(/round\\(/g,"rn(").replace(/trunc\\(/g,"tr2(").replace(/sign\\(/g,"sg(");' +
  's=s.replace(/exp\\(/g,"ep(").replace(/factorial\\(/g,"fact(").replace(/perm\\(/g,"pm(").replace(/comb\\(/g,"cb(");' +
  's=s.replace(/gcd\\(/g,"gd(").replace(/lcm\\(/g,"lc(").replace(/hypot\\(/g,"hyp(");' +
  's=s.replace(/pi/g,""+Math.PI).replace(/e(?!xp|\\()/g,""+Math.E);' +
  'var fn=new Function("sn","cs","tn","asn","acs","atn","snh","csh","tnh","asnh","acsh","atnh","sec2","csc2","cot2","lg","ln2","lg2","sqt","cbr","ab","fl","cl","rn","tr2","sg","ep","fact","pm","cb","gd","lc","hyp","return("+s+")");' +
  'var r=fn(sn,cs,tn,asn,acs,atn,snh,csh,tnh,asnh,acsh,atnh,sec2,csc2,cot2,lg,ln2,lg2,sqt,cbr,ab,fl,cl,rn,tr2,sg,ep,fact,pm,cb,gd,lc,hyp);' +
  'return{r:r,e:null}' +
  '}catch(e){return{r:null,e:e.message||"Error"}}' +
  '}' +

  // ── DraggableCalculator UI ──
  'var posX=0,posY=0;' +
  'var dragSX,dragSY,dragPX,dragPY,dragging=false;' +
  'var resizeSX,resizeSY,resizeSW,resizeSH,resizing=false;' +
  'var curW=W||340;var curH=H||480;' +
  'var menuOpen=false;var menuTab="theme";' +
  'var calcVisible=true;' +

  // Build root
  'var root=document.getElementById("root");' +
  'root.innerHTML="";' +

  // Container
  'var calcEl=document.createElement("div");' +
  'calcEl.id="calc";' +
  'calcEl.style.cssText="position:relative;border-radius:12px;border:1px solid "+mixColor(P,0.25)+";box-shadow:0 8px 32px rgba(0,0,0,0.5);overflow:visible;width:"+curW+"px;height:"+curH+"px;background:"+t.bg+";color:"+t.text+";transform:translate("+posX+"px,"+posY+"px);";' +
  'root.appendChild(calcEl);' +

  // Header
  'var hdr=document.createElement("div");' +
  'hdr.id="hdr";' +
  'hdr.style.cssText="display:flex;align-items:center;justify-content:space-between;padding:8px 12px 8px;cursor:grab;user-select:none;-webkit-user-select:none;background:"+t.bg+";border-bottom:1px solid "+mixColor(P,0.1)+";border-radius:12px 12px 0 0;";' +
  'calcEl.appendChild(hdr);' +

  // Header left: "calculo" label
  'var label=document.createElement("span");' +
  'label.style.cssText="font-size:10px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;opacity:0.3;color:"+t.muted+";";' +
  'label.textContent="calculo";' +
  'hdr.appendChild(label);' +

  // Header right: 3-dot menu + close
  'var hdrRight=document.createElement("div");' +
  'hdrRight.style.cssText="display:flex;align-items:center;gap:4px;";' +
  'hdr.appendChild(hdrRight);' +

  // Menu button wrapper
  'var menuWrap=document.createElement("div");' +
  'menuWrap.style.cssText="position:relative;";' +
  'hdrRight.appendChild(menuWrap);' +

  // 3-dot button
  'var menuBtn=document.createElement("button");' +
  'menuBtn.style.cssText="padding:4px;border-radius:4px;border:none;background:transparent;cursor:pointer;opacity:0.4;transition:opacity 0.15s;display:flex;align-items:center;justify-content:center;";' +
  'menuBtn.innerHTML="<svg width=\\u002216\\u0022 height=\\u002216\\u0022 viewBox=\\u00220 0 24 24\\u0022 fill=\\u0022none\\u0022 stroke=\\u0022currentColor\\u0022 stroke-width=\\u00222\\u0022><circle cx=\\u002212\\u0022 cy=\\u002212\\u0022 r=\\u00221\\u0022/><circle cx=\\u002212\\u0022 cy=\\u00225\\u0022 r=\\u00221\\u0022/><circle cx=\\u002212\\u0022 cy=\\u002219\\u0022 r=\\u00221\\u0022/></svg>";' +
  'menuBtn.addEventListener("mouseenter",function(){this.style.opacity="0.8"});' +
  'menuBtn.addEventListener("mouseleave",function(){this.style.opacity="0.4"});' +
  'menuWrap.appendChild(menuBtn);' +

  // Close button
  'var closeBtn=document.createElement("button");' +
  'closeBtn.style.cssText="padding:4px;border-radius:4px;border:none;background:transparent;cursor:pointer;opacity:0.3;transition:opacity 0.15s;display:flex;align-items:center;justify-content:center;";' +
  'closeBtn.innerHTML="<svg width=\\u002214\\u0022 height=\\u002214\\u0022 viewBox=\\u00220 0 24 24\\u0022 fill=\\u0022none\\u0022 stroke=\\u0022currentColor\\u0022 stroke-width=\\u00222\\u0022><line x1=\\u002218\\u0022 y1=\\u00226\\u0022 x2=\\u00226\\u0022 y2=\\u002218\\u0022/><line x1=\\u00226\\u0022 y1=\\u00226\\u0022 x2=\\u002218\\u0022 y2=\\u002218\\u0022/></svg>";' +
  'closeBtn.addEventListener("mouseenter",function(){this.style.opacity="0.7"});' +
  'closeBtn.addEventListener("mouseleave",function(){this.style.opacity="0.3"});' +
  'hdrRight.appendChild(closeBtn);' +

  // Menu panel
  'var menuPanel=document.createElement("div");' +
  'menuPanel.id="menu-panel";' +
  'menuPanel.style.cssText="display:none;position:absolute;right:0;top:calc(100% + 4px);border-radius:12px;border:1px solid "+mixColor(P,0.2)+";box-shadow:0 8px 32px rgba(0,0,0,0.5);min-width:240px;overflow:hidden;z-index:100;background:#18181b;";' +
  'menuWrap.appendChild(menuPanel);' +

  // Menu tabs
  'var tabWrap=document.createElement("div");' +
  'tabWrap.style.cssText="display:flex;border-bottom:1px solid rgba(24,24,27,1);";' +
  'menuPanel.appendChild(tabWrap);' +
  'var tabNames=["theme","embed","config"];' +
  'var tabBtns=[];' +
  'tabNames.forEach(function(name){' +
  'var tb=document.createElement("button");' +
  'tb.textContent=name;' +
  'tb.style.cssText="flex:1;padding:8px 0;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;font-weight:500;border:none;background:transparent;cursor:pointer;transition:all 0.15s;outline:none;color:rgba(255,255,255,0.3);";' +
  'tabBtns.push(tb);' +
  'tabWrap.appendChild(tb)' +
  '});' +

  // Theme panel content
  'var themeContent=document.createElement("div");' +
  'themeContent.id="theme-content";' +
  'themeContent.style.cssText="padding:16px;";' +
  'menuPanel.appendChild(themeContent);' +
  'var themeTitle=document.createElement("div");' +
  'themeTitle.style.cssText="font-size:10px;text-transform:uppercase;letter-spacing:0.15em;font-weight:500;color:rgba(255,255,255,0.4);margin-bottom:16px;";' +
  'themeTitle.textContent="Themes ("+themeOrder.length+")";' +
  'themeContent.appendChild(themeTitle);' +
  'var themeGrid=document.createElement("div");' +
  'themeGrid.id="theme-grid";' +
  'themeGrid.style.cssText="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;";' +
  'themeContent.appendChild(themeGrid);' +

  // Embed content
  'var embedContent=document.createElement("div");' +
  'embedContent.id="embed-content";' +
  'embedContent.style.cssText="display:none;padding:16px;";' +
  'menuPanel.appendChild(embedContent);' +

  // Config content
  'var configContent=document.createElement("div");' +
  'configContent.id="config-content";' +
  'configContent.style.cssText="display:none;padding:16px;";' +
  'menuPanel.appendChild(configContent);' +

  // Display area
  'var disp=document.createElement("div");' +
  'disp.id="disp";' +
  'disp.style.cssText="background:#0e0e10;margin:0 12px 8px;border-radius:16px;border:1px solid rgba(255,255,255,0.05);box-shadow:inset 0 2px 8px rgba(0,0,0,0.3);padding:12px 16px 8px;overflow:hidden;";' +
  'calcEl.appendChild(disp);' +

  // Expression line
  'var exDiv=document.createElement("div");' +
  'exDiv.style.cssText="font-family:monospace;font-size:11px;color:rgba(255,255,255,0.45);min-height:1em;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;";' +
  'exDiv.textContent="\\u00A0";' +
  'disp.appendChild(exDiv);' +

  // Result line
  'var rsDiv=document.createElement("div");' +
  'rsDiv.style.cssText="font-family:monospace;font-size:26px;font-weight:600;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-0.02em;color:"+t.text+";";' +
  'rsDiv.textContent="0";' +
  'disp.appendChild(rsDiv);' +

  // Display footer (mode + count)
  'var dispFooter=document.createElement("div");' +
  'dispFooter.style.cssText="display:flex;align-items:center;justify-content:space-between;padding:4px 0 0;margin-top:4px;border-top:1px solid rgba(255,255,255,0.03);";' +
  'disp.appendChild(dispFooter);' +
  'var modeLabel=document.createElement("span");' +
  'modeLabel.style.cssText="font-size:8px;font-family:monospace;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.3);";' +
  'dispFooter.appendChild(modeLabel);' +
  'var histCount=document.createElement("span");' +
  'histCount.style.cssText="font-size:8px;font-family:monospace;color:rgba(255,255,255,0.25);";' +
  'dispFooter.appendChild(histCount);' +

  // Keys container
  'var keysEl=document.createElement("div");' +
  'keysEl.id="btns";' +
  'keysEl.style.cssText="display:flex;flex-direction:column;gap:5px;padding:0 12px 4px;";' +
  'calcEl.appendChild(keysEl);' +

  // Branding footer
  'var footer=document.createElement("div");' +
  'footer.style.cssText="text-align:center;padding:2px 0 10px;";' +
  'footer.innerHTML="<a href=\\u0022https://calculo-fawn.vercel.app\\u0022 target=\\u0022_blank\\u0022 rel=\\u0022noopener noreferrer\\u0022 style=\\u0022font-size:9px;font-family:monospace;letter-spacing:0.25em;text-transform:uppercase;color:rgba(255,255,255,0.12);text-decoration:none\\u0022>calculo</a>";' +
  'calcEl.appendChild(footer);' +

  // Resize handle
  'var resizeHandle=document.createElement("div");' +
  'resizeHandle.style.cssText="position:absolute;bottom:0;right:0;width:20px;height:20px;cursor:se-resize;opacity:0.3;transition:opacity 0.15s;z-index:50;";' +
  'resizeHandle.innerHTML="<svg viewBox=\\u00220 0 16 16\\u0022 fill=\\u0022none\\u0022 style=\\u0022width:100%;height:100%\\u0022><path d=\\u0022M16 0v16H0\\u0022 stroke=\\u0022currentColor\\u0022 stroke-width=\\u00222\\u0022 stroke-linecap=\\u0022round\\u0022 opacity=\\u00220.2\\u0022/><path d=\\u0022M16 8v8H8\\u0022 stroke=\\u0022currentColor\\u0022 stroke-width=\\u00222\\u0022 stroke-linecap=\\u0022round\\u0022 opacity=\\u00220.1\\u0022/></svg>";' +
  'resizeHandle.addEventListener("mouseenter",function(){this.style.opacity="0.8"});' +
  'resizeHandle.addEventListener("mouseleave",function(){this.style.opacity="0.3"});' +
  'calcEl.appendChild(resizeHandle);' +

  // ── Button definitions ──
  'var BK=[' +
  '["AC","ctrl","clearAll"],["(","ctrl","("],[")","ctrl",")"],["\\u00F7","op","/"],["DEL","ctrl","del"],' +
  '["M+","mem","m+"],["7","num","7"],["8","num","8"],["9","num","9"],["\\u00D7","op","*"],' +
  '["M\\u2212","mem","m-"],["4","num","4"],["5","num","5"],["6","num","6"],["\\u2212","op","-"],' +
  '["MR","mem","mr"],["1","num","1"],["2","num","2"],["3","num","3"],["+","op","+"],' +
  '["MC","mem","mc"],["0","num","0"],[".","num","."],["(\\u2212)","ctrl","neg"],["\\uFF1D","eq","eval"]' +
  '];' +
  'var SK=[' +
  '["2nd","ctrl","shift"],["DRG","ctrl","mode"],["DEL","ctrl","del"],["(","ctrl","("],[")","ctrl",")"],' +
  '["LOG","fn","log"],["\\u03C0","fn","pi"],["SIN","fn","sin"],["COS","fn","cos"],["TAN","fn","tan"],' +
  '["x\\u00B2","fn","sq"],["^","op","^"],["\\u221A","fn","sqrt"],["x\\u207B\\u00B9","fn","inv"],["CLR","ctrl","clearAll"],' +
  '["7","num","7"],["8","num","8"],["9","num","9"],["\\u00F7","op","/"],["\\u00D7","op","*"],' +
  '["4","num","4"],["5","num","5"],["6","num","6"],["\\u2212","op","-"],["+","op","+"],' +
  '["1","num","1"],["2","num","2"],["3","num","3"],["M+","mem","m+"],["M\\u2212","mem","m-"],' +
  '["0","num","0"],[".","num","."],["(\\u2212)","ctrl","neg"],["ANS","ctrl","ans"],["\\uFF1D","eq","eval"]' +
  '];' +

  // ── Build keys ──
  'function buildKeys(){' +
  'keysEl.innerHTML="";' +
  'var KD=isSci?SK:BK;' +
  'for(var ri=0;ri<KD.length;ri+=5){' +
  'var row=KD.slice(ri,ri+5);' +
  'var r=document.createElement("div");' +
  'r.style.cssText="display:flex;gap:5px;flex:1;min-height:0;";' +
  'row.forEach(function(d){' +
  'var kd=d[1];' +
  'var b=document.createElement("button");' +
  'b.textContent=d[0];' +
  'b.style.cssText="flex:1;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;font-family:system-ui;position:relative;user-select:none;transition:transform 80ms,background 0.15s;border-radius:16px;min-height:30px;font-size:"+(kd==="fn"||kd==="ctrl"||kd==="mem"?"11px":"13px")+";font-weight:"+(kd==="eq"?"700":"500")+";background:"+keyBg(kd)+";color:"+keyCl(kd)+";";' +
  'b.addEventListener("mousedown",function(){b.style.transform="scale(0.92)"});' +
  'b.addEventListener("mouseup",function(){b.style.transform=""});' +
  'b.addEventListener("mouseleave",function(){b.style.transform=""});' +
  'b.addEventListener("click",function(){act(d[2])});' +
  'r.appendChild(b)' +
  '});' +
  'keysEl.appendChild(r)' +
  '}' +
  'modeLabel.textContent=isSci?(am+(sh?" 2ND":"")):"";' +
  '}' +

  // ── Update display ──
  'function upd(){' +
  'exDiv.textContent=ex||"\\u00A0";' +
  'rsDiv.textContent=re;' +
  'modeLabel.textContent=isSci?(am+(sh?" 2ND":"")):"";' +
  '}' +

  // ── Evaluate ──
  'function evl(){' +
  'if(!ex)return;' +
  'var r=ev(ex);' +
  'if(r.e){re="Error"}' +
  'else{re=String(r.r);ans=re;ex=""}' +
  'upd()' +
  '}' +

  // ── Actions ──
  'var SM={sin:"asin",cos:"acos",tan:"atan",log:"10**",sq:"**3",sqrt:"cbrt",inv:"abs"};' +
  'function act(a){' +
  'if(a==="shift"){if(!isSci)return;sh=!sh;upd();return}' +
  'if(a==="mode"){if(!isSci)return;am=am==="deg"?"rad":am==="rad"?"grad":"deg";sh=false;upd();return}' +
  'var f=a;if(sh&&SM[a])f=SM[a];sh=false;' +
  'if(f==="clearAll"){ex="";re="0";ans=null;mem=null;upd();return}' +
  'if(f==="del"){ex=ex.slice(0,-1);upd();return}' +
  'if(f==="neg"){ex=ex.indexOf("-")===0?ex.slice(1):"-"+ex;upd();return}' +
  'if(f==="pi"){ex+=""+Math.PI;upd();return}' +
  'if(f==="euler"){ex+=""+Math.E;upd();return}' +
  'if(f==="ans"&&ans){ex+=ans;upd();return}' +
  'if(f==="sq"){ex+="^(2)";upd();return}' +
  'if(f==="**3"){ex+="^(3)";upd();return}' +
  'if(f==="inv"){ex+="abs(";upd();return}' +
  'if(f==="^"&&(ex===""||ex==="(")&&ans!==null){ex+=ans+"^";upd();return}' +
  'if(["sin","cos","tan","asin","acos","atan","sinh","cosh","tanh","asinh","acosh","atanh","sec","csc","cot","log","ln","sqrt","cbrt","abs","floor","ceil","round","trunc","sign","exp","factorial","perm","comb","gcd","lcm","hypot"].indexOf(f)>=0){ex+=f+"(";upd();return}' +
  'if(f==="10**"){ex+="10^(";upd();return}' +
  'if(f==="2**"){ex+="2^(";upd();return}' +
  'if(f==="m+"){var v=parseFloat(re);if(!isNaN(v))mem=(mem||0)+v;return}' +
  'if(f==="m-"){var v=parseFloat(re);if(!isNaN(v))mem=(mem||0)-v;return}' +
  'if(f==="MR"){if(mem!==null)ex+=String(mem);upd();return}' +
  'if(f==="MC"){mem=null;return}' +
  'if(f==="eval"){evl();return}' +
  'ex+=f;upd()' +
  '}' +

  // ── Drag ──
  'hdr.addEventListener("mousedown",function(e){' +
  'if(e.target.tagName==="BUTTON")return;' +
  'dragging=true;' +
  'dragSX=e.clientX;dragSY=e.clientY;dragPX=posX;dragPY=posY;' +
  'calcEl.style.cursor="grabbing";' +
  'document.body.style.userSelect="none";' +
  '});' +
  'document.addEventListener("mousemove",function(e){' +
  'if(!dragging)return;' +
  'posX=dragPX+e.clientX-dragSX;' +
  'posY=dragPY+e.clientY-dragSY;' +
  'calcEl.style.transform="translate("+posX+"px,"+posY+"px)";' +
  '});' +
  'document.addEventListener("mouseup",function(){' +
  'if(dragging){dragging=false;calcEl.style.cursor="";document.body.style.userSelect=""}' +
  '});' +

  // ── Resize ──
  'resizeHandle.addEventListener("mousedown",function(e){' +
  'e.preventDefault();e.stopPropagation();' +
  'resizing=true;' +
  'resizeSX=e.clientX;resizeSY=e.clientY;' +
  'resizeSW=curW;resizeSH=curH;' +
  'document.body.style.cursor="se-resize";' +
  'document.body.style.userSelect="none";' +
  '});' +
  'document.addEventListener("mousemove",function(e){' +
  'if(!resizing)return;' +
  'curW=Math.max(260,resizeSW+e.clientX-resizeSX);' +
  'curH=Math.max(360,resizeSH+e.clientY-resizeSY);' +
  'calcEl.style.width=curW+"px";' +
  'calcEl.style.height=curH+"px";' +
  '});' +
  'document.addEventListener("mouseup",function(){' +
  'if(resizing){resizing=false;document.body.style.cursor="";document.body.style.userSelect=""}' +
  '});' +

  // ── Menu ──
  'function openMenu(){' +
  'menuOpen=true;menuPanel.style.display="block";' +
  'updateMenuTabs();' +
  'updateThemePanel();' +
  'updateEmbedPanel();' +
  'updateConfigPanel()' +
  '}' +
  'function closeMenu(){' +
  'menuOpen=false;menuPanel.style.display="none"' +
  '}' +
  'function toggleMenu(){menuOpen?closeMenu():openMenu()}' +
  'function switchTab(name){' +
  'menuTab=name;updateMenuTabs()' +
  '}' +
  'function updateMenuTabs(){' +
  'tabNames.forEach(function(name,i){' +
  'var tb=tabBtns[i];' +
  'var active=menuTab===name;' +
  'tb.style.color=active?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.3)";' +
  'tb.style.borderBottom=active?"2px solid rgba(255,255,255,0.9)":"2px solid transparent"' +
  '});' +
  'themeContent.style.display=menuTab==="theme"?"block":"none";' +
  'embedContent.style.display=menuTab==="embed"?"block":"none";' +
  'configContent.style.display=menuTab==="config"?"block":"none"' +
  '}' +

  'menuBtn.addEventListener("click",function(e){e.stopPropagation();toggleMenu()});' +
  'document.addEventListener("mousedown",function(e){' +
  'if(menuOpen&&!menuPanel.contains(e.target)&&!menuWrap.contains(e.target))closeMenu()' +
  '});' +
  'menuPanel.addEventListener("mousedown",function(e){e.stopPropagation()});' +

  // ── Embed panel ──
  'function updateEmbedPanel(){' +
  'var html="<div style=\\u0022display:flex;flex-direction:column;gap:12px\\u0022>";' +
  'html+="<div style=\\u0022font-size:10px;text-transform:uppercase;letter-spacing:0.15em;font-weight:500;color:rgba(255,255,255,0.4)\\u0022>Embed Code</div>";' +
  'html+="<pre style=\\u0022font-family:monospace;font-size:11px;padding:12px;border-radius:8px;overflow-x:auto;line-height:1.6;white-space:pre-wrap;word-break:break-all;background:#09090b;color:"+t.text+";border:1px solid rgba(255,255,255,0.08)\\u0022>\\u003Cdiv class=\\u0022calculo-calculator\\u0022\\n  data-mode=\\u0022"+(isSci?"scientific":"basic")+"\\u0022\\n  data-theme=\\u0022"+curTheme+"\\u0022\\n  data-width=\\u0022"+curW+"\\u0022\\n  data-height=\\u0022"+curH+"\\u0022\\n\\u003E\\u003C/div\\u003E\\n\\u003Cscript src=\\u0022https://cdn.calculo.dev/widget.js\\u0022\\u003E\\u003C/script\\u003E</pre>";' +
  'html+="<button id=\\u0022copy-embed\\u0022 style=\\u0022width:100%;padding:6px 0;font-size:10px;border-radius:8px;text-transform:uppercase;letter-spacing:0.1em;font-weight:500;border:none;cursor:pointer;transition:all 0.15s;background:"+mixColor(P,0.2)+";color:"+P+";\\u0022>Copy</button>";' +
  'html+="</div>";' +
  'embedContent.innerHTML=html;' +
  'var cp=document.getElementById("copy-embed");' +
  'if(cp)cp.addEventListener("click",function(){' +
  'var code=\\u003Cdiv class=\\u0022calculo-calculator\\u0022 data-mode=\\u0022"+(isSci?"scientific":"basic")+"\\u0022 data-theme=\\u0022"+curTheme+"\\u0022 data-width=\\u0022"+curW+"\\u0022 data-height=\\u0022"+curH+"\\u0022\\u003E\\u003C/div\\u003E\\n\\u003Cscript src=\\u0022https://cdn.calculo.dev/widget.js\\u0022\\u003E\\u003C/script\\u003E;' +
  'navigator.clipboard.writeText(code).then(function(){cp.textContent="Copied";setTimeout(function(){cp.textContent="Copy"},2000)})' +
  '})' +
  '}' +

  // ── Config panel ──
  'function updateConfigPanel(){' +
  'var cfg=JSON.stringify({theme:curTheme,primary:P,width:curW,height:curH,mode:isSci?"scientific":"basic"},null,2);' +
  'var html="<div style=\\u0022display:flex;flex-direction:column;gap:12px\\u0022>";' +
  'html+="<div style=\\u0022font-size:10px;text-transform:uppercase;letter-spacing:0.15em;font-weight:500;color:rgba(255,255,255,0.4)\\u0022>Config JSON</div>";' +
  'html+="<pre style=\\u0022font-family:monospace;font-size:10px;padding:12px;border-radius:8px;overflow-x:auto;line-height:1.6;background:#09090b;color:"+t.text+";border:1px solid rgba(255,255,255,0.08)\\u0022>"+cfg+"</pre>";' +
  'html+="<button id=\\u0022copy-cfg\\u0022 style=\\u0022width:100%;padding:6px 0;font-size:10px;border-radius:8px;text-transform:uppercase;letter-spacing:0.1em;font-weight:500;border:none;cursor:pointer;transition:all 0.15s;background:"+mixColor(P,0.2)+";color:"+P+";\\u0022>Copy</button>";' +
  'html+="</div>";' +
  'configContent.innerHTML=html;' +
  'var cp=document.getElementById("copy-cfg");' +
  'if(cp)cp.addEventListener("click",function(){' +
  'var code=JSON.stringify({theme:curTheme,primary:P,width:curW,height:curH,mode:isSci?"scientific":"basic"},null,2);' +
  'navigator.clipboard.writeText(code).then(function(){cp.textContent="Copied";setTimeout(function(){cp.textContent="Copy"},2000)})' +
  '})' +
  '}' +

  // ── Minimize ──
  'function minimize(){' +
  'calcEl.style.display="none";' +
  'var fab=document.getElementById("show-btn");' +
  'fab.style.display="flex"' +
  '}' +
  'function restore(){' +
  'calcEl.style.display="block";' +
  'var fab=document.getElementById("show-btn");' +
  'fab.style.display="none"' +
  '}' +
  'closeBtn.addEventListener("click",minimize);' +
  'var fab=document.getElementById("show-btn");' +
  'fab.style.background=P;' +
  'fab.innerHTML="<svg width=\\u002222\\u0022 height=\\u002222\\u0022 viewBox=\\u00220 0 24 24\\u0022 fill=\\u0022none\\u0022 stroke=\\u0022currentColor\\u0022 stroke-width=\\u00222\\u0022><rect x=\\u00224\\u0022 y=\\u00222\\u0022 width=\\u002216\\u0022 height=\\u002220\\u0022 rx=\\u00222\\u0022/><line x1=\\u00229\\u0022 y1=\\u00226\\u0022 x2=\\u002215\\u0022 y2=\\u00226\\u0022/><line x1=\\u00229\\u0022 y1=\\u002210\\u0022 x2=\\u002215\\u0022 y2=\\u002210\\u0022/><line x1=\\u00229\\u0022 y1=\\u002214\\u0022 x2=\\u002213\\u0022 y2=\\u002214\\u0022/></svg>";' +
  'fab.addEventListener("click",restore);' +

  // ── Keyboard ──
  'document.addEventListener("keydown",function(e){' +
  'if(e.target.tagName==="BUTTON")return;' +
  'if(e.key==="Enter"){e.preventDefault();act("eval")}' +
  'else if(e.key==="Backspace"){e.preventDefault();act("del")}' +
  'else if(e.key==="Escape")act("clearAll");' +
  'else if(/^[0-9+\\-*/.^()]+$/.test(e.key))act(e.key);' +
  '});' +

  // ── Init ──
  'buildKeys();' +
  'updateThemePanel();' +
  'upd();' +

  '})();' +
  '</script></body></html>';
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
