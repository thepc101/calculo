// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';

const THEMES = {
  dark: { bg: '#0a0a0b', surface: '#111113', border: 'rgba(255,255,255,0.06)', text: '#fafafa', muted: 'rgba(255,255,255,0.4)', primary: '#3b82f6', numBg: 'rgba(255,255,255,0.08)', opBg: 'rgba(255,255,255,0.05)', fnBg: 'rgba(255,255,255,0.04)', ctrlBg: 'rgba(255,255,255,0.06)', eqBg: '#3b82f6' },
  light: { bg: '#ffffff', surface: '#f5f5f5', border: 'rgba(0,0,0,0.08)', text: '#18181b', muted: 'rgba(0,0,0,0.4)', primary: '#2563eb', numBg: 'rgba(0,0,0,0.05)', opBg: 'rgba(0,0,0,0.03)', fnBg: 'rgba(0,0,0,0.02)', ctrlBg: 'rgba(0,0,0,0.04)', eqBg: '#2563eb' },
};

const DEMO_CONFIGS = {
  demo_basic: { id: 'demo_basic', type: 'basic', theme: { mode: 'dark', primaryColor: '#3b82f6' } },
  demo_scientific: { id: 'demo_scientific', type: 'scientific', theme: { mode: 'dark', primaryColor: '#3b82f6' } },
  demo_light: { id: 'demo_light', type: 'scientific', theme: { mode: 'light', primaryColor: '#2563eb' } },
  demo_cyberpunk: { id: 'demo_cyberpunk', type: 'scientific', theme: { mode: 'dark', primaryColor: '#f0abfc' } },
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');

  const id = req.query.id as string;
  const themeOverride = (req.query.theme as string) || '';
  const typeOverride = (req.query.type as string) || '';
  const width = (req.query.width as string) || '340px';
  const height = (req.query.height as string) || '';

  const config = (DEMO_CONFIGS as any)[id] || (DEMO_CONFIGS as any)['demo_basic'];
  const merged = JSON.parse(JSON.stringify(config));
  if (themeOverride) merged.theme = merged.theme || {};
  if (themeOverride) merged.theme.mode = themeOverride;
  if (typeOverride) merged.type = typeOverride;
  merged._embedWidth = width;
  merged._embedHeight = height;

  const t = (THEMES as any)[merged.theme?.mode || 'dark'] || THEMES.dark;
  const primary = merged.theme?.primaryColor || t.primary;
  const isSci = merged.type !== 'basic';

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Calculo</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:transparent;overflow:hidden}
</style>
</head>
<body>
<div id="c"></div>
<script>
(function(){
var t=${JSON.stringify(t)};
var P=${JSON.stringify(primary)};
var isSci=${JSON.stringify(isSci)};
var am='deg',ex='',re='0',ans=null,sh=false,mem=null;

function ev(s){
s=s.replace(/\\u03C0/g,'pi').replace(/\\u00D7/g,'*').replace(/\\u00F7/g,'/').replace(/\\u2212/g,'-').replace(/\\u221A\\(/g,'sqrt(').replace(/\\^/g,'**');
try{var fn=new Function('a','with(Math){var pi=Math.PI,e=Math.E;var sin=function(x){return a==="deg"?Math.sin(x*Math.PI/180):Math.sin(x)};var cos=function(x){return a==="deg"?Math.cos(x*Math.PI/180):Math.cos(x)};var tan=function(x){return a==="deg"?Math.tan(x*Math.PI/180):Math.tan(x)};var asin=function(x){var r=Math.asin(x);return a==="deg"?r*180/Math.PI:r};var acos=function(x){var r=Math.acos(x);return a==="deg"?r*180/Math.PI:r};var atan=function(x){var r=Math.atan(x);return a==="deg"?r*180/Math.PI:r};var log=function(x){return Math.log10(x)};var ln=function(x){return Math.log(x)};var sqrt=function(x){return Math.sqrt(x)};var abs=function(x){return Math.abs(x)};var cbrt=function(x){return Math.cbrt(x)};var exp=function(x){return Math.exp(x)};var round=function(x){return Math.round(x)};var floor=function(x){return Math.floor(x)};var ceil=function(x){return Math.ceil(x)};var perm=function(n,k){var r=1;for(var i=n;i>n-k;i--)r*=i;return r};var comb=function(n,k){if(k>n)return 0;var k2=Math.min(k,n-k),r=1;for(var i=1;i<=k2;i++)r*=(n-k2+i)/i;return Math.round(r)};return ('+s+')}');
return{r:fn(a||'deg'),e:null};}catch(e){return{r:null,e:e.message||'Error'}}
}

var C=document.getElementById('c');
C.setAttribute('style','font-family:system-ui,sans-serif;color:'+t.text+';background:'+t.bg+';border-radius:12px;overflow:hidden;width:${width};box-sizing:border-box;height:${height};min-height:100vh;display:flex;flex-direction:column');

function K(s){return s.replace(/([A-Z])/g,'-$1').toLowerCase()}
function E(tag,at,ch){
var e=document.createElement(tag);
if(at){for(var k in at){
if(k==='style'&&typeof at[k]==='object'){var p=[];var st=at[k];for(var q in st)p.push(K(q)+':'+st[q]);e.setAttribute('style',p.join(';'));}
else if(k.indexOf('on')===0)e.addEventListener(k.slice(2),at[k]);
else if(k==='id')e.id=at[k];
else e.setAttribute(k,at[k]);
}}
if(ch){if(typeof ch==='string')e.textContent=ch;else if(Array.isArray(ch))ch.forEach(function(c){if(c)e.appendChild(c)});else e.appendChild(ch)}
return e;
}

function upd(){
document.getElementById('ex').textContent=ex||'\\u00A0';
document.getElementById('rs').textContent=re;
var s=document.getElementById('st');
if(s)s.textContent=isSci?(am+(sh?' \\u00B7 2ND':'')):''
}

function evl(){
if(!ex)return;
var r=ev(ex,am);
if(r.e){re='Error'}else{re=String(r.r);ans=re;ex=''}
upd()
}

var SM={sin:'asin',cos:'acos',tan:'atan',log:'10**',sq:'**3',sqrt:'cbrt',inv:'abs'};

function act(a){
if(a==='shift'){if(!isSci)return;sh=!sh;upd();return}
if(a==='mode'){if(!isSci)return;am=am==='deg'?'rad':am==='rad'?'grad':'deg';sh=false;upd();return}
var f=a;if(sh&&SM[a])f=SM[a];sh=false;
if(f==='clearAll'){ex='';re='0';ans=null;mem=null;upd();return}
if(f==='del'){ex=ex.slice(0,-1);upd();return}
if(f==='neg'){ex=ex.indexOf('-')===0?ex.slice(1):'-'+ex;upd();return}
if(f==='pi'){ex+='\\u03C0';upd();return}
if(f==='ans'&&ans){ex+=ans;upd();return}
if(f==='sq'){ex+='^2';upd();return}
if(f==='**3'){ex+='^3';upd();return}
if(f==='inv'){ex+='abs(';upd();return}
if(['sin','cos','tan','asin','acos','atan','log','ln','sqrt','cbrt'].indexOf(f)>=0){ex+=f+'(';upd();return}
if(f==='10**'){ex+='10^(';upd();return}
if(f==='m+'){var v=parseFloat(re);if(!isNaN(v))mem=(mem||0)+v;return}
if(f==='m-'){var v=parseFloat(re);if(!isNaN(v))mem=(mem||0)-v;return}
if(f==='MR'){if(mem!==null)ex+=String(mem);upd();return}
if(f==='MC'){mem=null;return}
if(f==='eval'){evl();return}
ex+=f;upd()
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

function mb(lb,kd,fn){
var bg=t.numBg,c=t.text,fs='13px',fw='500';
if(kd==='op'){bg=t.opBg;c=P}
else if(kd==='fn'){bg=t.fnBg;c=t.muted;fs='11px'}
else if(kd==='ctrl'){bg=t.ctrlBg;c=t.muted;fs='11px'}
else if(kd==='eq'){bg=P;c='#fff';fw='700'}
else if(kd==='mem'){bg=t.fnBg;c=t.muted;fs='10px'}
var b=E('button',{style:{flex:'1',height:'38px',borderRadius:'10px',border:'none',cursor:'pointer',background:bg,color:c,fontSize:fs,fontWeight:fw,fontFamily:'system-ui',display:'flex',alignItems:'center',justifyContent:'center',transition:'transform 80ms',position:'relative',userSelect:'none'}},lb);
b.addEventListener('mousedown',function(){b.style.transform='scale(0.93)'});
b.addEventListener('mouseup',function(){b.style.transform=''});
b.addEventListener('mouseleave',function(){b.style.transform=''});
b.addEventListener('click',fn);
return b
}

var hdr=E('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px 4px'}},[
E('span',{style:{fontSize:'9px',fontWeight:'600',letterSpacing:'0.15em',textTransform:'uppercase',opacity:'0.3'}},'calculo'),
E('span',{style:{fontSize:'9px',fontFamily:'monospace',opacity:'0.35'},id:'st'},isSci?am:'')
]);

var exEl=E('div',{id:'ex',style:{fontFamily:'monospace',fontSize:'11px',color:t.muted,minHeight:'1.2em',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',padding:'0 12px'}},'\\u00A0');
var rsEl=E('div',{id:'rs',style:{fontFamily:'monospace',fontSize:'24px',fontWeight:'600',textAlign:'right',padding:'0 12px 8px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},'0');
var disp=E('div',{style:{background:t.surface,margin:'0 8px 8px',borderRadius:'10px',border:'1px solid '+t.border,paddingTop:'8px'}},[exEl,rsEl]);

var bc=E('div',{style:{display:'flex',flexDirection:'column',gap:'3px',padding:'0 8px'}});
KD.forEach(function(row){
var r=E('div',{style:{display:'flex',gap:'3px'}});
row.forEach(function(d){
var lb=d[0],kd=d[1],ac=d[2];
var b=E('button',{style:{flex:'1',height:'38px',borderRadius:'10px',border:'none',cursor:'pointer',background:(kd==='op'?t.opBg:kd==='fn'?t.fnBg:kd==='ctrl'?t.ctrlBg:kd==='eq'?P:kd==='mem'?t.fnBg:t.numBg),color:(kd==='op'?P:kd==='fn'||kd==='ctrl'||kd==='mem'?t.muted:kd==='eq'?'#fff':t.text),fontSize:(kd==='fn'||kd==='ctrl'||kd==='mem'?'11px':'13px'),fontWeight:(kd==='eq'?'700':'500'),fontFamily:'system-ui',display:'flex',alignItems:'center',justifyContent:'center',transition:'transform 80ms',position:'relative',userSelect:'none'}},lb);
b.addEventListener('mousedown',function(){b.style.transform='scale(0.93)'});
b.addEventListener('mouseup',function(){b.style.transform=''});
b.addEventListener('mouseleave',function(){b.style.transform=''});
b.addEventListener('click',function(){act(ac)});
r.appendChild(b)
});
bc.appendChild(r)
});

var ft=E('div',{style:{textAlign:'center',padding:'8px 0 6px'}},[
E('a',{href:'https://calculo-fawn.vercel.app',target:'_blank',rel:'noopener noreferrer',style:{fontSize:'8px',fontFamily:'monospace',letterSpacing:'0.2em',textTransform:'uppercase',color:t.muted,textDecoration:'none',opacity:'0.4'}},'calculo')
]);

var wr=E('div',{style:{display:'flex',flexDirection:'column',flex:'1'}});
wr.appendChild(hdr);wr.appendChild(disp);wr.appendChild(bc);wr.appendChild(ft);
C.appendChild(wr);

document.addEventListener('keydown',function(e){
if(e.target.tagName==='BUTTON')return;
if(e.key==='Enter'){e.preventDefault();act('eval')}
else if(e.key==='Backspace'){e.preventDefault();act('del')}
else if(e.key==='Escape')act('clearAll');
else if(/^[0-9+\\-*/.^()]+$/.test(e.key))act(e.key)
});

upd()
})();
</script>
</body>
</html>`);
}
