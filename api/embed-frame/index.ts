// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';

const THEMES: Record<string, Record<string, string>> = {
  dark: { bg: '#0a0a0b', surface: '#111113', border: 'rgba(255,255,255,0.06)', text: '#fafafa', muted: 'rgba(255,255,255,0.4)', primary: '#3b82f6', numBg: 'rgba(255,255,255,0.08)', opBg: 'rgba(255,255,255,0.05)', fnBg: 'rgba(255,255,255,0.04)', ctrlBg: 'rgba(255,255,255,0.06)', eqBg: '#3b82f6' },
  light: { bg: '#ffffff', surface: '#f5f5f5', border: 'rgba(0,0,0,0.08)', text: '#18181b', muted: 'rgba(0,0,0,0.4)', primary: '#2563eb', numBg: 'rgba(0,0,0,0.05)', opBg: 'rgba(0,0,0,0.03)', fnBg: 'rgba(0,0,0,0.02)', ctrlBg: 'rgba(0,0,0,0.04)', eqBg: '#2563eb' },
};

const DEMO_CONFIGS: Record<string, object> = {
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

  const config = DEMO_CONFIGS[id] || DEMO_CONFIGS['demo_basic'];
  const merged = JSON.parse(JSON.stringify(config));
  if (themeOverride) merged.theme = merged.theme || {}, (merged.theme as any).mode = themeOverride;
  if (typeOverride) merged.type = typeOverride;
  merged._embedWidth = width;
  merged._embedHeight = height;

  res.send(getHTML(merged));
}

function getHTML(config: any): string {
  const t = THEMES[config.theme?.mode || 'dark'] || THEMES.dark;
  const primary = config.theme?.primaryColor || t.primary;
  const isSci = config.type !== 'basic';
  const w = config._embedWidth || '340px';
  const h = config._embedHeight || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Calculo Embed</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:transparent; overflow:hidden; }
</style>
</head>
<body>
<div id="calc"></div>
<script>
(function(){
  var t=${JSON.stringify(t)};
  var primary=${JSON.stringify(primary)};
  var isSci=${JSON.stringify(isSci)};
  var angleMode='deg',expression='',result='0',ans=null,shiftOn=false,history=[],memory=null;

  function evalExpr(expr,am){
    var s=expr.replace(/\\u03C0/g,'pi').replace(/\\u00D7/g,'*').replace(/\\u00F7/g,'/').replace(/\\u2212/g,'-').replace(/\\u221A\\(/g,'sqrt(').replace(/\\^/g,'**');
    try{var fn=new Function('am','with(Math){var pi=Math.PI,e=Math.E;var sin=function(x){return am==="deg"?Math.sin(x*Math.PI/180):Math.sin(x)};var cos=function(x){return am==="deg"?Math.cos(x*Math.PI/180):Math.cos(x)};var tan=function(x){return am==="deg"?Math.tan(x*Math.PI/180):Math.tan(x)};var asin=function(x){var r=Math.asin(x);return am==="deg"?r*180/Math.PI:r};var acos=function(x){var r=Math.acos(x);return am==="deg"?r*180/Math.PI:r};var atan=function(x){var r=Math.atan(x);return am==="deg"?r*180/Math.PI:r};var log=function(x){return Math.log10(x)};var ln=function(x){return Math.log(x)};var sqrt=function(x){return Math.sqrt(x)};var abs=function(x){return Math.abs(x)};var cbrt=function(x){return Math.cbrt(x)};var exp=function(x){return Math.exp(x)};var round=function(x){return Math.round(x)};var floor=function(x){return Math.floor(x)};var ceil=function(x){return Math.ceil(x)};var perm=function(n,k){var r=1;for(var i=n;i>n-k;i--)r*=i;return r};var comb=function(n,k){if(k>n)return 0;var k2=Math.min(k,n-k),r=1;for(var i=1;i<=k2;i++)r*=(n-k2+i)/i;return Math.round(r)};return ('+s+')}');
    return{result:fn(am||'deg'),error:null};
    }catch(e){return{result:null,error:e.message||'Error'};}
  }

  var container=document.getElementById('calc');
  container.setAttribute('style','font-family:system-ui,-apple-system,sans-serif;color:'+t.text+';background:'+t.bg+';border-radius:12px;overflow:hidden;width:${w};box-sizing:border-box;height:${h};min-height:100vh;display:flex;flex-direction:column;');

  function toKebab(s){return s.replace(/([A-Z])/g,'-$1').toLowerCase();}
  function el(tag,attrs,children){
    var e=document.createElement(tag);
    if(attrs){for(var k in attrs){
      if(k==='style'&&typeof attrs[k]==='object'){var parts=[];var st=attrs[k];for(var p in st)parts.push(toKebab(p)+':'+st[p]);e.setAttribute('style',parts.join(';'));}
      else if(k.indexOf('on')===0){e.addEventListener(k.slice(2),attrs[k]);}
      else if(k==='id'){e.id=attrs[k];}
      else{e.setAttribute(k,attrs[k]);}
    }}
    if(children){if(typeof children==='string')e.textContent=children;else if(Array.isArray(children))children.forEach(function(c){if(c)e.appendChild(c);});else e.appendChild(children);}
    return e;
  }

  function updateDisplay(){
    document.getElementById('expr').textContent=expression||'\\u00A0';
    document.getElementById('res').textContent=result;
    var st=document.getElementById('calc-status');
    if(st)st.textContent=isSci?(angleMode+(shiftOn?' \u00B7 2ND':'')):'';
  }

  function doEval(){
    if(!expression)return;
    var r=evalExpr(expression,angleMode);
    if(r.error){result='Error';}else{result=String(r.result);ans=result;history.push({expr:expression,result:result});expression='';}
    updateDisplay();
  }
  function insert(t){expression+=t;updateDisplay();}

  function handleAction(action){
    if(action==='shift'){if(!isSci)return;shiftOn=!shiftOn;updateDisplay();return;}
    if(action==='mode'){if(!isSci)return;angleMode=angleMode==='deg'?'rad':angleMode==='rad'?'grad':'deg';shiftOn=false;updateDisplay();return;}
    var SHIFT_MAP={sin:'asin',cos:'acos',tan:'atan',log:'10**',sq:'**3',sqrt:'cbrt',inv:'abs'};
    var fa=action;if(shiftOn&&SHIFT_MAP[action])fa=SHIFT_MAP[action];shiftOn=false;
    if(fa==='clearAll'){expression='';result='0';ans=null;history=[];updateDisplay();return;}
    if(fa==='del'){expression=expression.slice(0,-1);updateDisplay();return;}
    if(fa==='neg'){expression=expression.indexOf('-')===0?expression.slice(1):'-'+expression;updateDisplay();return;}
    if(fa==='pi'){insert('\\u03C0');return;}
    if(fa==='ans'){if(ans)insert(ans);return;}
    if(fa==='sq'){insert('^2');return;}
    if(fa==='**3'){insert('^3');return;}
    if(fa==='inv'){insert('abs(');return;}
    if(['sin','cos','tan','asin','acos','atan','log','ln','sqrt','cbrt'].indexOf(fa)>=0){insert(fa+'(');return;}
    if(fa==='10**'){insert('10^(');return;}
    if(fa==='m+'){var v=parseFloat(result);if(!isNaN(v))memory=(memory||0)+v;return;}
    if(fa==='m-'){var v2=parseFloat(result);if(!isNaN(v2))memory=(memory||0)-v2;return;}
    if(fa==='MR'){if(memory!==null)insert(String(memory));return;}
    if(fa==='MC'){memory=null;return;}
    if(fa==='eval'){doEval();return;}
    insert(fa);
  }

  var BASIC_KEYS=[
    ['AC','ctrl','clearAll',''],['(','ctrl','(',''],[')','ctrl',')',''],['\\u00F7','op','/',''],['DEL','ctrl','del',''],
    ['M+','mem','m+',''],['7','num','7',''],['8','num','8',''],['9','num','9',''],['\\u00D7','op','*',''],
    ['M\\u2212','mem','m\\u2212',''],['4','num','4',''],['5','num','5',''],['6','num','6',''],['\\u2212','op','-',''],
    ['MR','mem','mr',''],['1','num','1',''],['2','num','2',''],['3','num','3',''],['+','op','+',''],
    ['MC','mem','mc',''],['0','num','0',''],['.','num','.',''],['(\\u2212)','ctrl','neg',''],['\\uFF1D','eq','eval',''],
  ];

  var SCI_KEYS=[
    ['2nd','ctrl','shift',''],['DRG','ctrl','mode',''],['DEL','ctrl','del',''],['(','ctrl','(',''],[')','ctrl',')',''],
    ['LOG','fn','log','10\\u02E3'],['\\u03C0','fn','pi','e'],['SIN','fn','sin','sin\\u207B\\u00B9'],['COS','fn','cos','cos\\u207B\\u00B9'],['TAN','fn','tan','tan\\u207B\\u00B9'],
    ['x\\u00B2','fn','sq','x\\u00B3'],['^','op','^','x\\u221A'],['\\u221A','fn','sqrt','\\u221B'],['x\\u207B\\u00B9','fn','inv','|x|'],['CLR','ctrl','clearAll',''],
    ['7','num','7',''],['8','num','8',''],['9','num','9',''],['\\u00F7','op','/',''],['\\u00D7','op','*',''],
    ['4','num','4',''],['5','num','5',''],['6','num','6',''],['\\u2212','op','-',''],['+','op','+',''],
    ['1','num','1',''],['2','num','2',''],['3','num','3',''],['M+','mem','m+','MR'],['M\\u2212','mem','m\\u2212','MC'],
    ['0','num','0',''],['.','num','.',''],['(\\u2212)','ctrl','neg',''],['ANS','ctrl','ans',''],['\\uFF1D','eq','eval',''],
  ];

  var keyDefs=isSci?SCI_KEYS:BASIC_KEYS;

  var header=el('div',{style:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px 4px'}},[
    el('span',{style:{fontSize:'9px',fontWeight:'600',letterSpacing:'0.15em',textTransform:'uppercase',opacity:'0.3'}},'calculo'),
    el('span',{style:{fontSize:'9px',fontFamily:'monospace',opacity:'0.35'},id:'calc-status'},isSci?angleMode:''),
  ]);

  var exprEl=el('div',{id:'expr',style:{fontFamily:'monospace',fontSize:'11px',color:t.muted,minHeight:'1.2em',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis',padding:'0 12px'}},'\\u00A0');
  var resultEl=el('div',{id:'res',style:{fontFamily:'monospace',fontSize:'24px',fontWeight:'600',textAlign:'right',padding:'0 12px 8px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}},'0');
  var display=el('div',{style:{background:t.surface,margin:'0 8px 8px',borderRadius:'10px',border:'1px solid '+t.border,paddingTop:'8px'}},[exprEl,resultEl]);

  function makeBtn(label,kind,onClick){
    var bg=t.numBg,color=t.text,fontSize='13px',fontWeight='500';
    if(kind==='op'){bg=t.opBg;color=primary;}
    else if(kind==='fn'){bg=t.fnBg;color=t.muted;fontSize='11px';}
    else if(kind==='ctrl'){bg=t.ctrlBg;color=t.muted;fontSize='11px';}
    else if(kind==='eq'){bg=primary;color='#fff';fontWeight='700';}
    else if(kind==='mem'){bg=t.fnBg;color=t.muted;fontSize='10px';}
    var btn=el('button',{style:{flex:'1',height:'38px',borderRadius:'10px',border:'none',cursor:'pointer',background:bg,color:color,fontSize:fontSize,fontWeight:fontWeight,fontFamily:'system-ui, sans-serif',display:'flex',alignItems:'center',justifyContent:'center',transition:'transform 80ms',position:'relative',userSelect:'none'}},label);
    btn.addEventListener('mousedown',function(){btn.style.transform='scale(0.93)';});
    btn.addEventListener('mouseup',function(){btn.style.transform='';});
    btn.addEventListener('mouseleave',function(){btn.style.transform='';});
    btn.addEventListener('click',onClick);
    return btn;
  }

  var btnContainer=el('div',{style:{display:'flex',flexDirection:'column',gap:'3px',padding:'0 8px'}});
  keyDefs.forEach(function(row){
    var rowEl=el('div',{style:{display:'flex',gap:'3px'}});
    row.forEach(function(def){
      var label=def[0],kind=def[1],action=def[2],shiftLabel=def[3];
      var btn=makeBtn(label,kind,function(){handleAction(action);});
      if(shiftLabel&&action!=='shift'&&action!=='mode'){
        var badge=el('span',{style:{position:'absolute',top:'1px',left:'3px',fontSize:'7px',fontWeight:'600',color:'#facc15',opacity:'0.65',pointerEvents:'none',letterSpacing:'0.05em'}},shiftLabel);
        btn.appendChild(badge);
      }
      rowEl.appendChild(btn);
    });
    btnContainer.appendChild(rowEl);
  });

  var footer=el('div',{style:{textAlign:'center',padding:'8px 0 6px'}},[
    el('a',{href:'https://calculo-fawn.vercel.app',target:'_blank',rel:'noopener noreferrer',style:{fontSize:'8px',fontFamily:'monospace',letterSpacing:'0.2em',textTransform:'uppercase',color:t.muted,textDecoration:'none',opacity:'0.4'}},'calculo'),
  ]);

  var wrapper=el('div',{style:{display:'flex',flexDirection:'column',flex:'1'}});
  wrapper.appendChild(header);
  wrapper.appendChild(display);
  wrapper.appendChild(btnContainer);
  wrapper.appendChild(footer);
  container.appendChild(wrapper);

  document.addEventListener('keydown',function(e){
    if(e.key==='Enter'){e.preventDefault();handleAction('eval');}
    else if(e.key==='Backspace')handleAction('del');
    else if(e.key==='Escape')handleAction('clearAll');
    else if(/^[0-9+\\-*/.^()]+$/.test(e.key))handleAction(e.key);
  });

  updateDisplay();
})();
</script>
</body>
</html>`;
}
