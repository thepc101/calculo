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
  const initTheme = JSON.stringify(config.theme?.mode || 'dark');
  const initPrimary = JSON.stringify(config.theme?.primaryColor || '#3b82f6');
  const initW = parseInt(width) || 340;
  const initH = parseInt(height) || 480;

  // Use string concatenation (NOT template literal) to avoid regex escaping issues
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Calculo</title>' +
  '<style>' +
  '*{margin:0;padding:0;box-sizing:border-box}' +
  'html,body{width:100%;height:100%;overflow:auto;font-family:system-ui,-apple-system,sans-serif}' +
  'body{background:transparent;display:flex;justify-content:center;align-items:flex-start;padding:8px}' +
  '#show-btn{display:none;position:fixed;bottom:24px;right:24px;width:48px;height:48px;border-radius:12px;border:none;cursor:pointer;color:#fff;font-size:20px;box-shadow:0 4px 16px rgba(0,0,0,0.25);align-items:center;justify-content:center;z-index:99999;transition:all 0.15s;font-family:inherit}' +
  '</style></head><body>' +
  '<button id="show-btn"></button>' +
  '<div id="root"></div>' +
  '<script>' +
  '(function(){' +
  'var mode=' + JSON.stringify(initMode) + ',ex="",re="0",ans=null,sh=false,mem=null,angle="DEG";' +
  'var curTheme=' + initTheme + ',P=' + initPrimary + ';' +
  'var curW=' + initW + ',curH=' + initH + ';' +
  'var posX=0,posY=0,dragging=false,resizing=false;' +
  'var dragSX,dragSY,dragPX,dragPY,resizeSX,resizeSY,resizeSW,resizeSH;' +
  'var menuTab=null,hist=[];' +
  'var curPos=0;' +
  'var baseW=320,baseH=mode==="scientific"?454:320;' +

  'var THEMES={dark:{bg:"#0a0a0b",text:"#fafafa",muted:"rgba(255,255,255,0.4)",primary:"#3b82f6",radius:16,font:"system-ui,-apple-system,sans-serif"},light:{bg:"#f8f9fa",text:"#1a1a2e",muted:"rgba(0,0,0,0.4)",primary:"#2563eb",radius:16,font:"system-ui,-apple-system,sans-serif"},oled:{bg:"#000000",text:"#e0e0e0",muted:"rgba(255,255,255,0.35)",primary:"#818cf8",radius:8,font:"system-ui,-apple-system,sans-serif"},"high-contrast":{bg:"#000000",text:"#ffffff",muted:"rgba(255,255,255,0.6)",primary:"#ffdd00",radius:0,font:"ui-monospace,SFMono-Regular,monospace"},glass:{bg:"rgba(12,12,20,0.88)",text:"#f0f0ff",muted:"rgba(240,240,255,0.45)",primary:"#a78bfa",radius:20,font:"system-ui,-apple-system,sans-serif"},neumorphism:{bg:"#e0e5ec",text:"#2d3748",muted:"rgba(0,0,0,0.3)",primary:"#6366f1",radius:20,font:"system-ui,-apple-system,sans-serif"},minimal:{bg:"#ffffff",text:"#111827",muted:"rgba(0,0,0,0.3)",primary:"#111827",radius:4,font:"system-ui,-apple-system,sans-serif"},corporate:{bg:"#f1f5f9",text:"#0f172a",muted:"rgba(0,0,0,0.35)",primary:"#1e40af",radius:8,font:"system-ui,-apple-system,sans-serif"},cyberpunk:{bg:"#0a0a1a",text:"#00ff88",muted:"rgba(0,255,136,0.35)",primary:"#ff00ff",radius:4,font:"ui-monospace,SFMono-Regular,monospace"},retro:{bg:"#fef3c7",text:"#451a03",muted:"rgba(69,26,3,0.35)",primary:"#ea580c",radius:4,font:"Georgia,Times,serif"},coffee:{bg:"#2c1810",text:"#e8d5c4",muted:"rgba(232,213,196,0.35)",primary:"#d4a574",radius:14,font:"Georgia,Times,serif"},ocean:{bg:"#0c1929",text:"#cce7ff",muted:"rgba(204,231,255,0.35)",primary:"#22d3ee",radius:20,font:"system-ui,-apple-system,sans-serif"},forest:{bg:"#0f1f0f",text:"#d4f5d4",muted:"rgba(212,245,212,0.35)",primary:"#4ade80",radius:12,font:"system-ui,-apple-system,sans-serif"},sunset:{bg:"#1a0a20",text:"#fed7aa",muted:"rgba(254,215,170,0.35)",primary:"#fb923c",radius:18,font:"Georgia,Times,serif"},aurora:{bg:"#0a1628",text:"#bbf7d0",muted:"rgba(187,247,208,0.35)",primary:"#34d399",radius:16,font:"system-ui,-apple-system,sans-serif"},monochrome:{bg:"#171717",text:"#e5e5e5",muted:"rgba(229,229,229,0.35)",primary:"#a3a3a3",radius:10,font:"ui-monospace,SFMono-Regular,monospace"}};' +
  'var themeOrder=["dark","light","oled","high-contrast","glass","neumorphism","minimal","corporate","cyberpunk","retro","coffee","ocean","forest","sunset","aurora","monochrome"];' +
  'var t=THEMES[curTheme]||THEMES.dark;' +

  'function hexRgb(h){if(h[0]==="#")h=h.slice(1);if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];var n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255]}' +
  'function rgba(hex,a){var r=hexRgb(hex);return"rgba("+r[0]+","+r[1]+","+r[2]+","+a+")"}' +
  'function mix(h,a){return"color-mix(in srgb, "+h+" "+Math.round(a*100)+"%, transparent)"}' +
  'function isDark(){var c=hexRgb(t.bg);return(c[0]*299+c[1]*587+c[2]*114)/1000<128}' +
  'function surfBg(){return isDark()?"rgba(20,20,22,1)":"rgba(248,248,249,1)"}' +
  'function surfBg2(){return isDark()?"rgba(12,12,14,1)":"rgba(255,255,255,1)"}' +
  'function surfBg3(){return isDark()?"rgba(8,8,10,1)":"rgba(243,243,244,1)"}' +
  'function surfBdr(){return isDark()?"rgba(32,32,36,1)":"rgba(229,231,235,1)"}' +
  'function surfTxt(a){return isDark()?"rgba(255,255,255,"+a+")":"rgba(0,0,0,"+a+")"}' +

  'function keyBg(k){' +
  'if(k==="eq")return P;' +
  'if(k==="op")return isDark()?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)";' +
  'if(k==="num")return isDark()?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)";' +
  'if(k==="fn")return isDark()?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)";' +
  'if(k==="ctrl")return isDark()?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)";' +
  'if(k==="mem")return isDark()?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)";' +
  'return isDark()?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.03)";' +
  '}' +
  'function keyColor(k){' +
  'if(k==="eq")return"#fff";' +
  'if(k==="op")return P;' +
  'if(k==="fn"||k==="ctrl"||k==="mem")return isDark()?"rgba(255,255,255,0.5)":"rgba(0,0,0,0.45)";' +
  'return t.text;' +
  '}' +

  'var DEG=180/Math.PI;' +
  'function toRad(x){return angle==="DEG"?x*Math.PI/180:x}' +
  'function fromRad(x){return angle==="DEG"?x*DEG:x}' +
  'function sn(x){return Math.sin(toRad(x))}function cs(x){return Math.cos(toRad(x))}function tn(x){return Math.tan(toRad(x))}' +
  'function asn(x){return fromRad(Math.asin(x))}function acs(x){return fromRad(Math.acos(x))}function atn(x){return fromRad(Math.atan(x))}' +
  'function snh(x){return Math.sinh(x)}function csh(x){return Math.cosh(x)}function tnh(x){return Math.tanh(x)}' +
  'function asnh(x){return Math.asinh(x)}function acsh(x){return Math.acosh(x)}function atnh(x){return Math.atanh(x)}' +
  'function sec2(x){return 1/Math.cos(toRad(x))}function csc2(x){return 1/Math.sin(toRad(x))}function cot2(x){return 1/Math.tan(toRad(x))}' +
  'function asec2(x){return fromRad(Math.acos(1/x))}function acsc2(x){return fromRad(Math.asin(1/x))}function acot2(x){return fromRad(Math.atan(1/x))}' +
  'function lg(x){return Math.log10(x)}function ln2(x){return Math.log(x)}function lg2(x){return Math.log2(x)}' +
  'function sqt(x){return Math.sqrt(x)}function cbr(x){return Math.cbrt(x)}function ab(x){return Math.abs(x)}' +
  'function fl(x){return Math.floor(x)}function cl(x){return Math.ceil(x)}function rn(x){return Math.round(x)}' +
  'function tr2(x){return Math.trunc(x)}function sg(x){return Math.sign(x)}function ep(x){return Math.exp(x)}' +
  'function fact(x){if(x<0)throw new Error("! of negative");var r=1;for(var i=2;i<=x;i++)r*=i;return r}' +
  'function pm(n,k){var r=1;for(var i=n;i>n-k;i--)r*=i;return r}' +
  'function cb(n,k){if(k>n)return 0;var k2=Math.min(k,n-k),r=1;for(var i=1;i<=k2;i++)r*=(n-k2+i)/i;return Math.round(r)}' +
  'function gd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){var tp=b;b=a%b;a=tp}return a}' +
  'function lc(a,b){return Math.abs(a*b)/gd(a,b)}' +
  'function nroot(n,x){return Math.sign(x)*Math.pow(Math.abs(x),1/n)}' +

  'function ev(s){' +
  'try{' +
  // IMPORTANT: In string concatenation, \\ produces \ in browser output
  's=s.replace(/\\u00D7/g,"*").replace(/\\u00F7/g,"/").replace(/\\u2212/g,"-").replace(/\\u221A\\(/g,"sqt(").replace(/\\^/g,"**");' +
  's=s.replace(/\\u207B\\u00B9/g,"**(-1)").replace(/\\u00B2/g,"**2").replace(/\\u00B3/g,"**3");' +
  // Implicit multiplication: 9sin( → 9*sin(, 9( → 9*(, )( → )*(
  's=s.replace(/([0-9.])(sin|cos|tan|log|ln|sqrt|cbrt|abs|floor|ceil|round|trunc|sign|exp|factorial|perm|comb|gcd|lcm|nroot|asin|acos|atan|sinh|cosh|tanh|asinh|acosh|atanh|sec|csc|cot|pi|e)\\(/g,"$1*$2(");' +
  's=s.replace(/([0-9.])\\(/g,"$1*(");' +
  's=s.replace(/\\)([0-9.])/g,")*$1");' +
  's=s.replace(/\\)\\(/g,")*(");' +
  's=s.replace(/\\)(sin|cos|tan|log|ln|sqrt|cbrt|abs|floor|ceil|round|trunc|sign|exp|factorial|perm|comb|gcd|lcm|nroot|asin|acos|atan|sinh|cosh|tanh|asinh|acosh|atanh|sec|csc|cot|pi|e)\\(/g,")*$1(");' +
  // Implicit multiplication for constants: 2pi → 2*pi, 2e → 2*e
  's=s.replace(/([0-9.])pi/g,"$1*pi");' +
  's=s.replace(/([0-9.])e(?!xp|x\\(|[0-9.])/g,"$1*e");' +
  // Implicit multiplication for π unicode character: 2π → 2*π
  's=s.replace(/([0-9.])\\u03C0/g,"$1*\\u03C0");' +
  's=s.replace(/\\u03C0([0-9.])/g,"\\u03C0*$1");' +
  's=s.replace(/\\)\\u03C0/g,")*\\u03C0");' +
  's=s.replace(/\\u03C0\\(/g,"\\u03C0*(");' +
  // Now replace π/e text and unicode with values
  's=s.replace(/pi/g,""+Math.PI);' +
  's=s.replace(/\\u03C0/g,""+Math.PI);' +
  's=s.replace(/e(?!xp|\\()/g,""+Math.E);' +
  's=s.replace(/sinh\\(/g,"snh(").replace(/cosh\\(/g,"csh(").replace(/tanh\\(/g,"tnh(");' +
  's=s.replace(/asinh\\(/g,"asnh(").replace(/acosh\\(/g,"acsh(").replace(/atanh\\(/g,"atnh(");' +
  's=s.replace(/sec\\(/g,"sec2(").replace(/csc\\(/g,"csc2(").replace(/cot\\(/g,"cot2(");' +
  's=s.replace(/asec\\(/g,"asec2(").replace(/acsc\\(/g,"acsc2(").replace(/acot\\(/g,"acot2(");' +
  's=s.replace(/sin\\(/g,"sn(").replace(/cos\\(/g,"cs(").replace(/tan\\(/g,"tn(");' +
  's=s.replace(/asin\\(/g,"asn(").replace(/acos\\(/g,"acs(").replace(/atan\\(/g,"atn(");' +
  's=s.replace(/log10\\(/g,"lg(").replace(/log2\\(/g,"lg2(").replace(/log\\(/g,"lg(").replace(/ln\\(/g,"ln2(");' +
  's=s.replace(/sqrt\\(/g,"sqt(").replace(/cbrt\\(/g,"cbr(").replace(/abs\\(/g,"ab(");' +
  's=s.replace(/floor\\(/g,"fl(").replace(/ceil\\(/g,"cl(").replace(/round\\(/g,"rn(").replace(/trunc\\(/g,"tr2(").replace(/sign\\(/g,"sg(");' +
  's=s.replace(/exp\\(/g,"ep(").replace(/factorial\\(/g,"fact(").replace(/perm\\(/g,"pm(").replace(/comb\\(/g,"cb(");' +
  's=s.replace(/gcd\\(/g,"gd(").replace(/lcm\\(/g,"lc(").replace(/nroot\\(/g,"nroot(");' +
  'var fn=new Function("sn","cs","tn","asn","acs","atn","snh","csh","tnh","asnh","acsh","atnh","sec2","csc2","cot2","asec2","acsc2","acot2","lg","ln2","lg2","sqt","cbr","ab","fl","cl","rn","tr2","sg","ep","fact","pm","cb","gd","lc","nroot","return("+s+")");' +
  'var r=fn(sn,cs,tn,asn,acs,atn,snh,csh,tnh,asnh,acsh,atnh,sec2,csc2,cot2,asec2,acsc2,acot2,lg,ln2,lg2,sqt,cbr,ab,fl,cl,rn,tr2,sg,ep,fact,pm,cb,gd,lc,nroot);' +
  'return{r:r,e:null}' +
  '}catch(e){return{r:null,e:e.message||"Error"}}' +
  '}' +

  // ── BASIC KEYS (5x5) ──
  'var BK=[' +
  '["AC","ctrl","clearAll"],["(","ctrl","("],[")","ctrl",")"],["\\u00F7","op","/"],["\\u232B","ctrl","del"],' +
  '["M+","mem","m+"],["7","num","7"],["8","num","8"],["9","num","9"],["\\u00D7","op","*"],' +
  '["M\\u2212","mem","m-"],["4","num","4"],["5","num","5"],["6","num","6"],["\\u2212","op","-"],' +
  '["MR","mem","mr"],["1","num","1"],["2","num","2"],["3","num","3"],["+","op","+"],' +
  '["MC","mem","mc"],["0","num","0"],[".","num","."],["(\\u2212)","ctrl","neg"],["=","eq","eval"]' +
  '];' +

  // ── SCIENTIFIC KEYS (8x5) ──
  'var SK=[' +
  '["2nd","ctrl","shift"],["DRG","ctrl","mode"],["DEL","ctrl","del"],["\\u2190","ctrl","left"],["\\u2192","ctrl","right"],' +
  '["LOG","fn","log"],["LN","fn","ln"],["(","ctrl","("],[")","ctrl",")"],["CLR","ctrl","clearAll"],' +
  '["\\u03C0","fn","pi"],["SIN","fn","sin"],["COS","fn","cos"],["TAN","fn","tan"],["\\u00F7","op","/"],' +
  '["x\\u00B2","fn","sq"],["^","op","^"],["\\u221A","fn","sqrt"],["x\\u207B\\u00B9","fn","inv"],["\\u00D7","op","*"],' +
  '["7","num","7"],["8","num","8"],["9","num","9"],["nCr","fn","comb"],["%","fn","%"],' +
  '["4","num","4"],["5","num","5"],["6","num","6"],["M+","mem","m+"],["\\u2212","op","-"],' +
  '["1","num","1"],["2","num","2"],["3","num","3"],["M\\u2212","mem","m-"],["+","op","+"],' +
  '["0","num","0"],[".","num","."],["(\\u2212)","ctrl","neg"],["ANS","ctrl","ans"],["MR","mem","mr"]' +
  '];' +

  'var SHIFT_MAP={sin:"asin",cos:"acos",tan:"atan",log:"10**",ln:"e**",sq:"**3",sqrt:"cbrt",inv:"abs","%":"comb","^":"nthroot"};' +
  'var SHIFT_LABEL={sin:"sin\\u207B\\u00B9",cos:"cos\\u207B\\u00B9",tan:"tan\\u207B\\u00B9",log:"10\\u02E3",ln:"e\\u02E3",sq:"x\\u00B3",sqrt:"\\u221B",inv:"|x|","%":"nCr","^":"\\u207F\\u221A"};' +

  // ── Build DOM ──
  'var root=document.getElementById("root");' +
  'root.innerHTML="";' +

  'var outer=document.createElement("div");' +
  'outer.style.cssText="position:relative;display:inline-block;z-index:2147483647;width:"+curW+"px;height:"+curH+"px;overflow:hidden;";' +
  'root.appendChild(outer);' +

  'var calcEl=document.createElement("div");' +
  'calcEl.id="calc";' +
  'calcEl.style.cssText="position:absolute;top:0;left:0;overflow:hidden;border-radius:"+Math.max(t.radius||12,6)+"px;border:1px solid "+surfTxt(0.08)+";box-shadow:0 1px 3px rgba(0,0,0,0.08),0 8px 24px rgba(0,0,0,0.12);width:"+baseW+"px;height:"+baseH+"px;background:"+t.bg+";color:"+t.text+";display:flex;flex-direction:column;z-index:2147483647;font-family:"+t.font+";transform-origin:top left;transform:translate("+posX+"px,"+posY+"px) scale(1);";' +
  'outer.appendChild(calcEl);' +

  // ── Header ──
  'var hdr=document.createElement("div");' +
  'hdr.style.cssText="display:flex;align-items:center;justify-content:space-between;padding:10px 12px 6px;cursor:grab;user-select:none;-webkit-user-select:none;background:"+t.bg+";flex-shrink:0;";' +
  'calcEl.appendChild(hdr);' +

  'var hdrLeft=document.createElement("div");' +
  'hdrLeft.style.cssText="display:flex;align-items:center;gap:8px;";' +
  'hdr.appendChild(hdrLeft);' +

  // Mode switcher
  'var modeWrap=document.createElement("div");' +
  'modeWrap.style.cssText="display:flex;align-items:center;gap:0;padding:2px;border-radius:8px;background:"+surfTxt(0.06)+";";' +
  'hdrLeft.appendChild(modeWrap);' +

  'var basicBtn=document.createElement("button");' +
  'basicBtn.textContent="Basic";' +
  'basicBtn.style.cssText="padding:4px 10px;font-size:10px;border-radius:6px;border:none;cursor:pointer;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;transition:all 0.15s;font-family:inherit;";' +
  'var sciBtn=document.createElement("button");' +
  'sciBtn.textContent="Sci";' +
  'sciBtn.style.cssText="padding:4px 10px;font-size:10px;border-radius:6px;border:none;cursor:pointer;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;transition:all 0.15s;font-family:inherit;";' +
  'modeWrap.appendChild(basicBtn);' +
  'modeWrap.appendChild(sciBtn);' +

  // Status
  'var statusEl=document.createElement("div");' +
  'statusEl.style.cssText="display:flex;align-items:center;gap:6px;font-size:9px;letter-spacing:0.08em;color:"+surfTxt(0.25)+";font-weight:500;";' +
  'hdrLeft.appendChild(statusEl);' +
  'var angleSpan=document.createElement("span");' +
  'var memSpan=document.createElement("span");' +
  'memSpan.style.cssText="color:#eab308;display:none;";' +
  'var shiftSpan=document.createElement("span");' +
  'shiftSpan.style.cssText="color:#22c55e;display:none;";' +
  'statusEl.appendChild(angleSpan);' +
  'statusEl.appendChild(memSpan);' +
  'statusEl.appendChild(shiftSpan);' +

  // Header right
  'var hdrRight=document.createElement("div");' +
  'hdrRight.style.cssText="display:flex;align-items:center;gap:2px;";' +
  'hdr.appendChild(hdrRight);' +

  'var menuWrap2=document.createElement("div");' +
  'menuWrap2.style.cssText="position:relative;";' +
  'hdrRight.appendChild(menuWrap2);' +

  'var menuBtn=document.createElement("button");' +
  'menuBtn.style.cssText="padding:4px;border-radius:6px;border:none;background:transparent;cursor:pointer;opacity:0.3;transition:all 0.15s;display:flex;align-items:center;justify-content:center;color:"+t.text+";";' +
  'menuBtn.innerHTML="<svg width=\\"14\\" height=\\"14\\" viewBox=\\"0 0 24 24\\" fill=\\"none\\" stroke=\\"currentColor\\" stroke-width=\\"2\\"><circle cx=\\"12\\" cy=\\"12\\" r=\\"1\\"/><circle cx=\\"12\\" cy=\\"5\\" r=\\"1\\"/><circle cx=\\"12\\" cy=\\"19\\" r=\\"1\\"/></svg>";' +
  'menuBtn.onmouseenter=function(){this.style.opacity="0.7";};' +
  'menuBtn.onmouseleave=function(){this.style.opacity="0.3";};' +
  'menuWrap2.appendChild(menuBtn);' +

  'var closeBtn=document.createElement("button");' +
  'closeBtn.style.cssText="padding:4px;border-radius:6px;border:none;background:transparent;cursor:pointer;opacity:0.3;transition:all 0.15s;display:flex;align-items:center;justify-content:center;color:"+t.text+";";' +
  'closeBtn.innerHTML="<svg width=\\"12\\" height=\\"12\\" viewBox=\\"0 0 24 24\\" fill=\\"none\\" stroke=\\"currentColor\\" stroke-width=\\"2.5\\"><line x1=\\"18\\" y1=\\"6\\" x2=\\"6\\" y2=\\"18\\"/><line x1=\\"6\\" y1=\\"6\\" x2=\\"18\\" y2=\\"18\\"/></svg>";' +
  'closeBtn.onmouseenter=function(){this.style.opacity="0.7";};' +
  'closeBtn.onmouseleave=function(){this.style.opacity="0.3";};' +
  'hdrRight.appendChild(closeBtn);' +

  // ── Menu panel ──
  'var menuPanel=document.createElement("div");' +
  'menuPanel.style.cssText="display:none;position:absolute;right:0;top:calc(100% + 6px);border-radius:12px;border:1px solid "+surfTxt(0.08)+";box-shadow:0 8px 32px rgba(0,0,0,0.2);min-width:240px;max-width:280px;max-height:340px;overflow-y:auto;z-index:100;background:"+surfBg()+";backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);";' +
  'menuWrap2.appendChild(menuPanel);' +

  'var tabWrap=document.createElement("div");' +
  'tabWrap.style.cssText="display:flex;padding:3px;gap:2px;border-bottom:1px solid "+surfTxt(0.06)+";";' +
  'menuPanel.appendChild(tabWrap);' +
  'var tabs=["theme","embed","config"];' +
  'var tabBtns=[];' +
  'tabs.forEach(function(name){' +
  'var tb=document.createElement("button");' +
  'tb.textContent=name;' +
  'tb.style.cssText="flex:1;padding:6px 0;font-size:10px;text-transform:uppercase;letter-spacing:0.06em;font-weight:500;border:none;background:transparent;cursor:pointer;color:"+surfTxt(0.3)+";transition:all 0.15s;outline:none;border-radius:6px;font-family:inherit;";' +
  'tabBtns.push(tb);' +
  'tabWrap.appendChild(tb);' +
  '});' +

  'var themeContent=document.createElement("div");' +
  'themeContent.style.cssText="padding:10px;max-height:260px;overflow-y:auto;";' +
  'menuPanel.appendChild(themeContent);' +
  'var themeTitle=document.createElement("div");' +
  'themeTitle.style.cssText="font-size:8px;text-transform:uppercase;letter-spacing:0.12em;font-weight:500;color:"+surfTxt(0.3)+";margin-bottom:10px;";' +
  'themeTitle.textContent="Themes";' +
  'themeContent.appendChild(themeTitle);' +
  'var themeGrid=document.createElement("div");' +
  'themeGrid.style.cssText="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;";' +
  'themeContent.appendChild(themeGrid);' +

  'var embedContent=document.createElement("div");' +
  'embedContent.style.cssText="display:none;padding:12px;";' +
  'menuPanel.appendChild(embedContent);' +
  'var configContent=document.createElement("div");' +
  'configContent.style.cssText="display:none;padding:12px;";' +
  'menuPanel.appendChild(configContent);' +

  // ── Display ──
  'var disp=document.createElement("div");' +
  'disp.style.cssText="margin:0 10px 6px;border-radius:10px;overflow:hidden;flex-shrink:0;background:"+surfBg2()+";border:1px solid "+surfTxt(0.06)+";";' +
  'calcEl.appendChild(disp);' +

  'var dispInner=document.createElement("div");' +
  'dispInner.style.cssText="padding:10px 14px 6px;";' +
  'disp.appendChild(dispInner);' +

  'var exDiv=document.createElement("div");' +
  'exDiv.style.cssText="font-size:12px;overflow-x:auto;white-space:nowrap;min-height:1em;color:"+surfTxt(0.3)+";letter-spacing:0.01em;";' +
  'exDiv.textContent="\\u00A0";' +
  'dispInner.appendChild(exDiv);' +

  'var rsDiv=document.createElement("div");' +
  'rsDiv.style.cssText="font-size:28px;font-weight:300;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-0.02em;line-height:1.3;";' +
  'rsDiv.textContent="0";' +
  'dispInner.appendChild(rsDiv);' +

  // ── Keys ──
  'var keysEl=document.createElement("div");' +
  'keysEl.style.cssText="flex:1;display:flex;flex-direction:column;gap:4px;padding:0 10px 6px;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:none;-ms-overflow-style:none;";' +
  'calcEl.appendChild(keysEl);' +

  // ── Resize handle ──
  'var resizeHandle=document.createElement("div");' +
  'resizeHandle.style.cssText="position:absolute;bottom:0;right:0;width:20px;height:20px;cursor:se-resize;opacity:0.15;transition:opacity 0.15s;z-index:50;color:"+t.text+";";' +
  'resizeHandle.innerHTML="<svg viewBox=\\"0 0 16 16\\" fill=\\"none\\" style=\\"width:100%;height:100%\\"><path d=\\"M16 0v16H0\\" stroke=\\"currentColor\\" stroke-width=\\"1.5\\" stroke-linecap=\\"round\\" opacity=\\"0.3\\"/><path d=\\"M16 8v8H8\\" stroke=\\"currentColor\\" stroke-width=\\"1.5\\" stroke-linecap=\\"round\\" opacity=\\"0.15\\"/></svg>";' +
  'resizeHandle.onmouseenter=function(){this.style.opacity="0.6"};' +
  'resizeHandle.onmouseleave=function(){this.style.opacity="0.15"};' +
  'calcEl.appendChild(resizeHandle);' +

  // ── Scale ──
  'function updateScale(){' +
  'var sx=curW/baseW,sy=curH/baseH;' +
  'var s=Math.min(sx,sy);' +
  'calcEl.style.transform="translate("+posX+"px,"+posY+"px) scale("+s+")";' +
  '}' +
  'updateScale();' +

  // ── Apply theme ──
  'function applyTheme(tk){' +
  'curTheme=tk;t=THEMES[tk]||THEMES.dark;' +
  'calcEl.style.background=t.bg;calcEl.style.color=t.text;' +
  'calcEl.style.borderColor=mix(P,0.25);' +
  'calcEl.style.borderRadius=Math.max(t.radius||12,6)+"px";calcEl.style.fontFamily=t.font;' +
  'hdr.style.background=t.bg;' +
  'modeWrap.style.background=surfTxt(0.06);' +
  'menuPanel.style.background=surfBg();menuPanel.style.borderColor=surfTxt(0.08);' +
  'tabWrap.style.borderBottomColor=surfTxt(0.06);' +
  'tabBtns.forEach(function(tb,i){var active=menuTab===tabs[i];tb.style.color=active?surfTxt(0.8):surfTxt(0.3);tb.style.background=active?surfTxt(0.08):"transparent";});' +
  'themeTitle.style.color=surfTxt(0.3);' +
  'disp.style.background=surfBg2();disp.style.borderColor=surfTxt(0.06);' +
  'exDiv.style.color=surfTxt(0.3);rsDiv.style.color=t.text;' +
  'menuBtn.style.color=t.text;closeBtn.style.color=t.text;' +
  'angleSpan.style.color=surfTxt(0.25);memSpan.style.color="#eab308";shiftSpan.style.color="#22c55e";' +
  'applyModeBtnStyles();buildKeys();renderThemeGrid();' +
  '}' +

  'function applyModeBtnStyles(){' +
  'basicBtn.style.backgroundColor=mode==="basic"?surfTxt(0.1):"transparent";' +
  'basicBtn.style.color=mode==="basic"?P:surfTxt(0.35);' +
  'sciBtn.style.backgroundColor=mode==="scientific"?surfTxt(0.1):"transparent";' +
  'sciBtn.style.color=mode==="scientific"?P:surfTxt(0.35);' +
  'angleSpan.textContent=mode==="scientific"?angle:"";' +
  'memSpan.style.display=mem!==null?"inline":"none";' +
  'shiftSpan.style.display=sh?"inline":"none";' +
  '}' +

  // ── Theme grid ──
  'function renderThemeGrid(){' +
  'themeGrid.innerHTML="";' +
  'themeOrder.forEach(function(tk){' +
  'var th=THEMES[tk];var isActive=curTheme===tk;' +
  'var btn=document.createElement("button");btn.title=tk;' +
  'btn.style.cssText="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px 2px;border-radius:8px;cursor:pointer;transition:all 0.15s;outline:none;border:"+(isActive?"1.5px solid "+P:"1px solid "+surfTxt(0.06))+";background:"+th.bg+";aspect-ratio:1/1;box-sizing:border-box;";' +
  'var sw=document.createElement("div");sw.style.cssText="display:flex;gap:2px;width:100%;justify-content:center;";' +
  'var s1=document.createElement("span");s1.style.cssText="width:10px;height:10px;border-radius:3px;background:"+th.primary+";";' +
  'var s2=document.createElement("span");s2.style.cssText="width:10px;height:10px;border-radius:3px;background:"+th.text+";opacity:0.2;";' +
  'sw.appendChild(s1);sw.appendChild(s2);btn.appendChild(sw);' +
  'var lbl=document.createElement("span");lbl.style.cssText="font-size:8px;text-transform:capitalize;width:100%;text-align:center;color:"+th.text+";overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;";' +
  'lbl.textContent=tk;btn.appendChild(lbl);' +
  'btn.addEventListener("click",function(){applyTheme(tk);closeMenu()});' +
  'themeGrid.appendChild(btn);' +
  '});' +
  '}' +

  // ── Update display ──
  'function upd(){' +
  'var display=ex.slice(0,curPos)+"\\u2502"+ex.slice(curPos);' +
  'exDiv.textContent=ex?display:"\\u00A0";' +
  'rsDiv.textContent=re;' +
  'applyModeBtnStyles();' +
  '}' +

  // ── Evaluate ──
  'function evl(){' +
  'if(!ex)return;' +
  'var depth=0;for(var i=0;i<ex.length;i++){if(ex[i]==="(")depth++;if(ex[i]===")")depth--;}' +
  'var toEval=depth>0?ex+")".repeat(depth):ex;' +
  'var r=ev(toEval);' +
  'if(r.e){re="Error";ex="";}' +
  'else{re=String(r.r);ans=re;hist.push({e:toEval,r:re});ex="";}' +
  'curPos=0;' +
  'upd();' +
  '}' +

  // ── Actions ──
  'function act(a){' +
  'if(a==="shift"){if(mode!=="scientific")return;sh=!sh;upd();return}' +
  'if(a==="mode"){if(mode!=="scientific")return;angle=angle==="DEG"?"RAD":angle==="RAD"?"GRAD":"DEG";sh=false;upd();return}' +
  'var f=a;' +
  'if(sh&&SHIFT_MAP[a])f=SHIFT_MAP[a];' +
  'sh=false;' +
  'if(f==="clearAll"){ex="";re="0";ans=null;mem=null;hist=[];curPos=0;upd();return}' +
  'if(f==="del"){if(curPos>0){ex=ex.slice(0,curPos-1)+ex.slice(curPos);curPos--;}upd();return}' +
  'if(f==="left"){if(curPos>0)curPos--;upd();return}' +
  'if(f==="right"){if(curPos<ex.length)curPos++;upd();return}' +
  'if(f==="neg"){if(curPos>0&&ex[curPos-1]==="-"){ex=ex.slice(0,curPos-1)+ex.slice(curPos);curPos--;}else{ex=ex.slice(0,curPos)+"-"+ex.slice(curPos);curPos++;}upd();return}' +
  'if(f==="pi"){ex=ex.slice(0,curPos)+""+Math.PI+ex.slice(curPos);curPos+=(""+Math.PI).length;upd();return}' +
  'if(f==="ans"&&ans){ex=ex.slice(0,curPos)+ans+ex.slice(curPos);curPos+=ans.length;upd();return}' +
  'if(f==="sq"){ex=ex.slice(0,curPos)+"^(2)"+ex.slice(curPos);curPos+=4;upd();return}' +
  'if(f==="**3"){ex=ex.slice(0,curPos)+"^(3)"+ex.slice(curPos);curPos+=4;upd();return}' +
  'if(f==="inv"){ex=ex.slice(0,curPos)+"abs("+ex.slice(curPos);curPos+=4;upd();return}' +
  'if(f==="^"&&(ex===""||curPos===0)&&ans!==null){ex=ex.slice(0,curPos)+ans+"^"+ex.slice(curPos);curPos+=ans.length+1;upd();return}' +
  'if(["sin","cos","tan","asin","acos","atan","sinh","cosh","tanh","asinh","acosh","atanh","sec","csc","cot","asec","acsc","acot","log","ln","sqrt","cbrt","abs","floor","ceil","round","trunc","sign","exp","factorial","perm","comb","gcd","lcm","nthroot"].indexOf(f)>=0){' +
  'var ins=f==="nthroot"?"root(":f+"(";' +
  'ex=ex.slice(0,curPos)+ins+ex.slice(curPos);curPos+=ins.length;upd();return}' +
  'if(f==="10**"){ex=ex.slice(0,curPos)+"10^("+ex.slice(curPos);curPos+=4;upd();return}' +
  'if(f==="m+"){var v=parseFloat(re);if(!isNaN(v))mem=(mem||0)+v;upd();return}' +
  'if(f==="m-"){var v=parseFloat(re);if(!isNaN(v))mem=(mem||0)-v;upd();return}' +
  'if(f==="MR"){if(mem!==null){ex=ex.slice(0,curPos)+String(mem)+ex.slice(curPos);curPos+=String(mem).length;}upd();return}' +
  'if(f==="MC"){mem=null;upd();return}' +
  'if(f==="eval"){evl();return}' +
  // Auto-ans: if expression is empty and ans exists, prepend ans for operators
  'if(ex===""&&ans&&(f==="+"||f==="-"||f==="*"||f==="/"||f==="^")){ex=ans;curPos=ans.length;}' +
  'ex=ex.slice(0,curPos)+f+ex.slice(curPos);curPos+=f.length;upd();' +
  '}' +

  // ── Mode buttons ──
  'basicBtn.addEventListener("click",function(){mode="basic";baseH=320;ex="";re="0";hist=[];curPos=0;upd();buildKeys();updateScale();});' +
  'sciBtn.addEventListener("click",function(){mode="scientific";baseH=454;ex="";re="0";hist=[];curPos=0;upd();buildKeys();updateScale();});' +

  // ── Build keys ──
  'function buildKeys(){' +
  'keysEl.innerHTML="";' +
  'var KD=mode==="scientific"?SK:BK;' +
  'for(var ri=0;ri<KD.length;ri+=5){' +
  'var row=KD.slice(ri,ri+5);' +
  'var r=document.createElement("div");' +
  'r.style.cssText="display:flex;gap:4px;flex-shrink:0;";' +
  'row.forEach(function(d){' +
  'var kd=d[1];var action=d[2];' +
  'var b=document.createElement("button");' +
  'var sl=(sh&&SHIFT_LABEL[action])||"";' +
  'b.innerHTML=(sl?"<span style=\\"position:absolute;top:2px;left:4px;font-size:7px;font-weight:600;color:"+surfTxt(0.25)+";line-height:1\\">"+sl+"</span>":"")+"<span"+(sl?" style=\\"margin-top:6px\\"":"")+">"+d[0]+"</span>";' +
  'b.style.cssText="flex:1;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;position:relative;user-select:none;transition:all 0.1s ease;border-radius:8px;height:40px;font-size:"+(kd==="fn"||kd==="ctrl"||kd==="mem"?"11px":"14px")+";font-weight:"+(kd==="eq"?"600":"400")+";background:"+keyBg(kd)+";color:"+keyColor(kd)+";font-family:inherit;letter-spacing:0;";' +
  'b.addEventListener("mousedown",function(){b.style.transform="scale(0.95)";b.style.filter="brightness(0.88)"});' +
  'b.addEventListener("mouseup",function(){b.style.transform="";b.style.filter=""});' +
  'b.addEventListener("mouseleave",function(){b.style.transform="";b.style.filter=""});' +
  'b.addEventListener("click",function(){act(d[2]);});' +
  'r.appendChild(b);' +
  '});' +
  'keysEl.appendChild(r);' +
  '}' +
  '}' +

  // ── Drag ──
  'hdr.addEventListener("mousedown",function(e){' +
  'if(e.target.tagName==="BUTTON")return;' +
  'dragging=true;dragSX=e.clientX;dragSY=e.clientY;dragPX=posX;dragPY=posY;' +
  'document.body.style.userSelect="none";' +
  '});' +
  'document.addEventListener("mousemove",function(e){' +
  'if(dragging){posX=dragPX+e.clientX-dragSX;posY=dragPY+e.clientY-dragSY;calcEl.style.transform="translate("+posX+"px,"+posY+"px) scale("+Math.min(curW/baseW,curH/baseH)+")";}' +
  'if(resizing){curW=Math.max(200,resizeSW+e.clientX-resizeSX);curH=Math.round(curW*baseH/baseW);outer.style.width=curW+"px";outer.style.height=curH+"px";updateScale();}' +
  '});' +
  'document.addEventListener("mouseup",function(){' +
  'if(dragging){dragging=false;document.body.style.userSelect="";}' +
  'if(resizing){resizing=false;document.body.style.cursor="";document.body.style.userSelect="";}' +
  '});' +

  // ── Resize ──
  'resizeHandle.addEventListener("mousedown",function(e){' +
  'e.preventDefault();e.stopPropagation();' +
  'resizing=true;resizeSX=e.clientX;resizeSY=e.clientY;resizeSW=curW;resizeSH=curH;' +
  'document.body.style.cursor="se-resize";document.body.style.userSelect="none";' +
  '});' +

  // ── Menu ──
  'function openMenu(){menuTab="theme";menuPanel.style.display="block";updateMenuTabs();renderThemeGrid();updateEmbedPanel();updateConfigPanel();}' +
  'function closeMenu(){menuTab=null;menuPanel.style.display="none";}' +
  'function switchTab(name){menuTab=name;updateMenuTabs();}' +
  'function updateMenuTabs(){' +
  'tabs.forEach(function(name,i){var tb=tabBtns[i];var active=menuTab===name;' +
  'tb.style.color=active?surfTxt(0.8):surfTxt(0.35);' +
  'tb.style.background=active?surfTxt(0.08):"transparent";});' +
  'themeContent.style.display=menuTab==="theme"?"block":"none";' +
  'embedContent.style.display=menuTab==="embed"?"block":"none";' +
  'configContent.style.display=menuTab==="config"?"block":"none";' +
  '}' +
  'menuBtn.addEventListener("click",function(e){e.stopPropagation();menuTab?closeMenu():openMenu();});' +
  'document.addEventListener("mousedown",function(e){if(menuTab&&!menuPanel.contains(e.target)&&!menuWrap2.contains(e.target))closeMenu();});' +
  'menuPanel.addEventListener("mousedown",function(e){e.stopPropagation();});' +
  'tabBtns.forEach(function(tb,i){tb.addEventListener("click",function(){switchTab(tabs[i]);});});' +

  // ── Embed panel ──
  'function updateEmbedPanel(){' +
  'var code="<div class=\\"calculo-calculator\\"\\n  data-mode=\\""+(mode==="scientific"?"scientific":"basic")+"\\"\\n  data-theme=\\""+curTheme+"\\"\\n  data-width=\\""+curW+"\\"\\n  data-height=\\""+curH+"\\"\\n></div>\\n<script src=\\"https://cdn.calculo.dev/widget.js\\"><\\/script>";' +
  'embedContent.innerHTML="<div style=\\"display:flex;flex-direction:column;gap:10px\\">"+' +
  '"<div style=\\"font-size:10px;text-transform:uppercase;letter-spacing:0.08em;font-weight:500;color:"+surfTxt(0.3)+"\\">Embed Code</div>"+' +
  '"<pre style=\\"font-family:monospace;font-size:10px;padding:10px;border-radius:8px;overflow-x:auto;line-height:1.5;white-space:pre-wrap;word-break:break-all;background:"+surfBg3()+";color:"+t.text+";border:1px solid "+surfTxt(0.06)+"\\">"+code+"</pre>"+' +
  '"<button id=\\"copy-embed\\" style=\\"width:100%;padding:7px 0;font-size:10px;border-radius:8px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;border:none;cursor:pointer;background:"+P+";color:#fff;transition:all 0.15s;font-family:inherit\\">Copy</button></div>";' +
  'var cp=document.getElementById("copy-embed");' +
  'if(cp)cp.addEventListener("click",function(){navigator.clipboard.writeText(code).then(function(){cp.textContent="Copied";setTimeout(function(){cp.textContent="Copy"},2000)});});' +
  '}' +

  // ── Config panel ──
  'function updateConfigPanel(){' +
  'var cfg=JSON.stringify({theme:curTheme,primary:P,width:curW,height:curH,mode:mode},null,2);' +
  'configContent.innerHTML="<div style=\\"display:flex;flex-direction:column;gap:10px\\">"+' +
  '"<div style=\\"font-size:10px;text-transform:uppercase;letter-spacing:0.08em;font-weight:500;color:"+surfTxt(0.3)+"\\">Config JSON</div>"+' +
  '"<pre style=\\"font-family:monospace;font-size:10px;padding:10px;border-radius:8px;overflow-x:auto;line-height:1.5;background:"+surfBg3()+";color:"+t.text+";border:1px solid "+surfTxt(0.06)+"\\">"+cfg+"</pre>"+' +
  '"<button id=\\"copy-cfg\\" style=\\"width:100%;padding:7px 0;font-size:10px;border-radius:8px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;border:none;cursor:pointer;background:"+P+";color:#fff;transition:all 0.15s;font-family:inherit\\">Copy</button></div>";' +
  'var cp=document.getElementById("copy-cfg");' +
  'if(cp)cp.addEventListener("click",function(){navigator.clipboard.writeText(cfg).then(function(){cp.textContent="Copied";setTimeout(function(){cp.textContent="Copy"},2000)});});' +
  '}' +

  // ── Minimize/Restore ──
  'function minimize(){outer.style.display="none";document.getElementById("show-btn").style.display="flex";}' +
  'function restore(){outer.style.display="inline-block";document.getElementById("show-btn").style.display="none";updateScale();}' +
  'closeBtn.addEventListener("click",minimize);' +
  'var fab=document.getElementById("show-btn");' +
  'fab.style.background=P;' +
  'fab.innerHTML="<svg width=\\"22\\" height=\\"22\\" viewBox=\\"0 0 24 24\\" fill=\\"none\\" stroke=\\"currentColor\\" stroke-width=\\"2\\"><rect x=\\"4\\" y=\\"2\\" width=\\"16\\" height=\\"20\\" rx=\\"2\\"/><line x1=\\"9\\" y1=\\"6\\" x2=\\"15\\" y2=\\"6\\"/><line x1=\\"9\\" y1=\\"10\\" x2=\\"15\\" y2=\\"10\\"/><line x1=\\"9\\" y1=\\"14\\" x2=\\"13\\" y2=\\"14\\"/></svg>";' +
  'fab.addEventListener("click",restore);' +

  // ── Keyboard ──
  'document.addEventListener("keydown",function(e){' +
  'if(e.target.tagName==="BUTTON")return;' +
  'if(e.key==="Enter"){e.preventDefault();act("eval");}' +
  'else if(e.key==="Backspace"){e.preventDefault();act("del");}' +
  'else if(e.key==="Escape")act("clearAll");' +
  'else if(/^[0-9+\\-*/.^()]+$/.test(e.key))act(e.key);' +
  '});' +

  // ── Init ──
  'applyModeBtnStyles();' +
  'buildKeys();' +
  'renderThemeGrid();' +
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
