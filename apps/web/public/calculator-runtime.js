/**
 * Calculo Calculator Runtime v1.0
 * Standalone, framework-agnostic calculator for embedding.
 * Dynamically imported by embed.js — mountCalculator(element, config) → cleanup()
 */
var mountCalculator;

(function () {
  'use strict';

  var ENGINE_URL = null;

  function evalExpr(expr, angleMode) {
    var subst = expr
      .replace(/π/g, 'pi')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/√\(/g, 'sqrt(')
      .replace(/\^/g, '**');
    try {
      var fn = new Function(
        'angleMode',
        'with(Math){var pi=Math.PI,e=Math.E;' +
        'var sin=function(x){return angleMode==="deg"?Math.sin(x*Math.PI/180):Math.sin(x)};' +
        'var cos=function(x){return angleMode==="deg"?Math.cos(x*Math.PI/180):Math.cos(x)};' +
        'var tan=function(x){return angleMode==="deg"?Math.tan(x*Math.PI/180):Math.tan(x)};' +
        'var asin=function(x){var r=Math.asin(x);return angleMode==="deg"?r*180/Math.PI:r};' +
        'var acos=function(x){var r=Math.acos(x);return angleMode==="deg"?r*180/Math.PI:r};' +
        'var atan=function(x){var r=Math.atan(x);return angleMode==="deg"?r*180/Math.PI:r};' +
        'var log=function(x){return Math.log10(x)};' +
        'var ln=function(x){return Math.log(x)};' +
        'var sqrt=function(x){return Math.sqrt(x)};' +
        'var abs=function(x){return Math.abs(x)};' +
        'var cbrt=function(x){return Math.cbrt(x)};' +
        'var exp=function(x){return Math.exp(x)};' +
        'var round=function(x){return Math.round(x)};' +
        'var floor=function(x){return Math.floor(x)};' +
        'var ceil=function(x){return Math.ceil(x)};' +
        'var perm=function(n,k){var r=1;for(var i=n;i>n-k;i--)r*=i;return r};' +
        'var comb=function(n,k){if(k>n)return 0;var k2=Math.min(k,n-k),r=1;for(var i=1;i<=k2;i++)r*=(n-k2+i)/i;return Math.round(r)};' +
        'return (' + subst + ')}'
      );
      return { result: fn(angleMode || 'deg'), error: null };
    } catch (e) {
      return { result: null, error: e.message || 'Error' };
    }
  }

  var THEMES = {
    dark:   { bg: '#0a0a0b', surface: '#111113', border: 'rgba(255,255,255,0.06)', text: '#fafafa', muted: 'rgba(255,255,255,0.4)', primary: '#3b82f6', numBg: 'rgba(255,255,255,0.08)', opBg: 'rgba(255,255,255,0.05)', fnBg: 'rgba(255,255,255,0.04)', ctrlBg: 'rgba(255,255,255,0.06)', eqBg: '#3b82f6' },
    light:  { bg: '#ffffff', surface: '#f5f5f5', border: 'rgba(0,0,0,0.08)', text: '#18181b', muted: 'rgba(0,0,0,0.4)', primary: '#2563eb', numBg: 'rgba(0,0,0,0.05)', opBg: 'rgba(0,0,0,0.03)', fnBg: 'rgba(0,0,0,0.02)', ctrlBg: 'rgba(0,0,0,0.04)', eqBg: '#2563eb' },
  };

  function getTheme(mode) {
    return THEMES[mode] || THEMES.dark;
  }

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === 'style' && typeof attrs[k] === 'object') {
          Object.assign(e.style, attrs[k]);
        } else if (k.startsWith('on')) {
          e.addEventListener(k.slice(2), attrs[k]);
        } else {
          e.setAttribute(k, attrs[k]);
        }
      }
    }
    if (children) {
      if (typeof children === 'string') e.textContent = children;
      else if (Array.isArray(children)) children.forEach(function (c) { if (c) e.appendChild(c); });
      else e.appendChild(children);
    }
    return e;
  }

  function createCalculator(container, config) {
    var theme = getTheme(config.theme?.mode || 'dark');
    var primary = config.theme?.primaryColor || theme.primary;
    var angleMode = 'deg';
    var expression = '';
    var result = '0';
    var ans = null;
    var shiftOn = false;
    var history = [];
    var memory = null;

    container.innerHTML = '';
    var w = config._embedWidth || '340px';
    var h = config._embedHeight || '';
    var isScientific = config.type !== 'basic';
    container.style.cssText = 'font-family:system-ui,-apple-system,sans-serif;color:' + theme.text + ';background:' + theme.bg + ';border-radius:12px;overflow:hidden;width:' + w + ';box-sizing:border-box;' + (h ? 'height:' + h + ';' : '');

    var wrapper = el('div', { style: { display: 'flex', flexDirection: 'column' } });

    // Header
    var header = el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px 4px' } }, [
      el('span', { style: { fontSize: '9px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: '0.3' } }, 'calculo'),
      el('span', { style: { fontSize: '9px', fontFamily: 'monospace', opacity: '0.35' }, id: 'calc-status' }, isScientific ? angleMode : ''),
    ]);

    // Display
    var exprEl = el('div', { style: { fontFamily: 'monospace', fontSize: '11px', color: theme.muted, minHeight: '1.2em', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', padding: '0 12px' } }, '\u00A0');
    var resultEl = el('div', { style: { fontFamily: 'monospace', fontSize: '24px', fontWeight: 600, textAlign: 'right', padding: '0 12px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, '0');
    var display = el('div', { style: { background: theme.surface, margin: '0 8px 8px', borderRadius: '10px', border: '1px solid ' + theme.border, paddingTop: '8px' } }, [exprEl, resultEl]);

    var statusEl = header.querySelector('#calc-status');

    function updateDisplay() {
      exprEl.textContent = expression || '\u00A0';
      resultEl.textContent = result;
      if (statusEl) statusEl.textContent = isScientific ? (angleMode + (shiftOn ? ' · 2ND' : '')) : '';
    }

    function doEval() {
      if (!expression) return;
      var res = evalExpr(expression, angleMode);
      if (res.error) { result = 'Error'; }
      else {
        result = String(res.result);
        ans = result;
        history.push({ expr: expression, result: result });
        expression = '';
      }
      updateDisplay();
    }

    function insert(t) { expression += t; updateDisplay(); }

    function makeBtn(label, kind, onClick, shiftLabel) {
      var bg = theme.numBg;
      var color = theme.text;
      var fontSize = '13px';
      var fontWeight = '500';

      if (kind === 'op') { bg = theme.opBg; color = primary; }
      else if (kind === 'fn') { bg = theme.fnBg; color = theme.muted; fontSize = '11px'; }
      else if (kind === 'ctrl') { bg = theme.ctrlBg; color = theme.muted; fontSize = '11px'; }
      else if (kind === 'eq') { bg = primary; color = '#fff'; fontWeight = '700'; }
      else if (kind === 'mem') { bg = theme.fnBg; color = theme.muted; fontSize = '10px'; }

      var btn = el('button', {
        style: {
          flex: '1', height: '38px', borderRadius: '10px', border: 'none', cursor: 'pointer',
          background: bg, color: color, fontSize: fontSize, fontWeight: fontWeight,
          fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center',
          justifyContent: 'center', transition: 'transform 80ms, opacity 80ms', position: 'relative',
          userSelect: 'none', WebkitTapHighlightColor: 'transparent',
        },
      }, label);

      btn.addEventListener('mousedown', function () { btn.style.transform = 'scale(0.93)'; });
      btn.addEventListener('mouseup', function () { btn.style.transform = ''; });
      btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
      btn.addEventListener('click', onClick);

      return btn;
    }

    // Key layout
    var BASIC_KEYS = [
      ['AC','ctrl','clearAll',''],     ['(','ctrl','(',''],     [')','ctrl',')',''],     ['÷','op','/',''],     ['DEL','ctrl','del',''],
      ['M+','mem','m+',''],            ['7','num','7',''],     ['8','num','8',''],     ['9','num','9',''],    ['×','op','*',''],
      ['M−','mem','m−',''],            ['4','num','4',''],     ['5','num','5',''],     ['6','num','6',''],    ['−','op','-',''],
      ['MR','mem','mr',''],            ['1','num','1',''],     ['2','num','2',''],     ['3','num','3',''],    ['+','op','+',''],
      ['MC','mem','mc',''],            ['0','num','0',''],     ['.','num','.',''],     ['(−)','ctrl','neg',''],  ['＝','eq','eval',''],
    ];

    var SCI_KEYS = [
      ['2nd','ctrl','shift',''],   ['DRG','ctrl','mode',''],     ['DEL','ctrl','del',''],     ['(','ctrl','(',''],    [')','ctrl',')',''],
      ['LOG','fn','log','10ˣ'],     ['π','fn','pi','e'],          ['SIN','fn','sin','sin⁻¹'],  ['COS','fn','cos','cos⁻¹'], ['TAN','fn','tan','tan⁻¹'],
      ['x²','fn','sq','x³'],        ['^','op','^','x√'],         ['√','fn','sqrt','∛'],       ['x⁻¹','fn','inv','|x|'], ['CLR','ctrl','clearAll',''],
      ['7','num','7',''],            ['8','num','8',''],           ['9','num','9',''],           ['÷','op','/',''],        ['×','op','*',''],
      ['4','num','4',''],            ['5','num','5',''],           ['6','num','6',''],           ['−','op','-',''],        ['+','op','+',''],
      ['1','num','1',''],            ['2','num','2',''],           ['3','num','3',''],           ['M+','mem','m+','MR'],   ['M−','mem','m−','MC'],
      ['0','num','0',''],            ['.','num','.',''],           ['(−)','ctrl','neg',''],      ['ANS','ctrl','ans',''],  ['＝','eq','eval',''],
    ];

    var keyDefs = (config.type === 'basic') ? BASIC_KEYS : SCI_KEYS;

    var SHIFT_MAP = { sin: 'asin', cos: 'acos', tan: 'atan', log: '10**', sq: '**3', sqrt: 'cbrt', inv: 'abs' };
    var SHIFT_DISP = { sin: 'sin⁻¹', cos: 'cos⁻¹', tan: 'tan⁻¹', log: '10ˣ', sq: 'x³', sqrt: '∛', inv: '|x|' };

    function handleAction(action) {
      if (action === 'shift') { if (!isScientific) return; shiftOn = !shiftOn; updateDisplay(); return; }
      if (action === 'mode') { if (!isScientific) return; angleMode = angleMode === 'deg' ? 'rad' : angleMode === 'rad' ? 'grad' : 'deg'; shiftOn = false; updateDisplay(); return; }

      var finalAction = action;
      if (shiftOn && SHIFT_MAP[action]) { finalAction = SHIFT_MAP[action]; }
      shiftOn = false;

      if (finalAction === 'clearAll') { expression = ''; result = '0'; ans = null; history = []; updateDisplay(); return; }
      if (finalAction === 'del') { expression = expression.slice(0, -1); updateDisplay(); return; }
      if (finalAction === 'neg') { expression = expression.startsWith('-') ? expression.slice(1) : '-' + expression; updateDisplay(); return; }
      if (finalAction === 'pi') { insert('π'); return; }
      if (finalAction === 'ans') { if (ans) insert(ans); return; }
      if (finalAction === 'sq') { insert('^2'); return; }
      if (finalAction === '**3') { insert('^3'); return; }
      if (finalAction === 'inv') { insert('abs('); return; }

      if (['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'ln', 'sqrt', 'cbrt'].indexOf(finalAction) >= 0) {
        insert(finalAction + '(');
        return;
      }
      if (finalAction === '10**') { insert('10^('); return; }
      if (finalAction === 'm+') { var v = parseFloat(result); if (!isNaN(v)) memory = (memory || 0) + v; return; }
      if (finalAction === 'm−') { var v2 = parseFloat(result); if (!isNaN(v2)) memory = (memory || 0) - v2; return; }
      if (finalAction === 'MR') { if (memory !== null) insert(String(memory)); return; }
      if (finalAction === 'MC') { memory = null; return; }
      if (finalAction === 'eval') { doEval(); return; }

      insert(finalAction);
    }

    keyDefs.forEach(function (row) {
      var rowEl = el('div', { style: { display: 'flex', gap: '3px', padding: '0 8px' } });
      row.forEach(function (def) {
        var label = def[0], kind = def[1], action = def[2], shiftLabel = def[3];
        var btn = makeBtn(label, kind, function () { handleAction(action); });
        if (shiftLabel && action !== 'shift' && action !== 'mode') {
          var badge = el('span', { style: { position: 'absolute', top: '1px', left: '3px', fontSize: '7px', fontWeight: 600, color: '#facc15', opacity: '0.65', pointerEvents: 'none', letterSpacing: '0.05em' } }, shiftLabel);
          btn.appendChild(badge);
        }
        rowEl.appendChild(btn);
      });
      wrapper.appendChild(rowEl);
    });

    // Branding
    var footer = el('div', { style: { textAlign: 'center', padding: '8px 0 6px' } }, [
      el('a', { href: 'https://calculo.vercel.app', target: '_blank', rel: 'noopener noreferrer', style: { fontSize: '8px', fontFamily: 'monospace', letterSpacing: '0.2em', textTransform: 'uppercase', color: theme.muted, textDecoration: 'none', opacity: '0.4' } }, 'calculo'),
    ]);

    wrapper.appendChild(footer);
    container.appendChild(wrapper);

    // Keyboard
    function onKey(e) {
      if (!container.contains(document.activeElement) && document.activeElement !== document.body) return;
      if (e.key === 'Enter') { e.preventDefault(); handleAction('eval'); }
      else if (e.key === 'Backspace') handleAction('del');
      else if (e.key === 'Escape') handleAction('clearAll');
      else if (/^[0-9+\-*/.^()]$/.test(e.key)) handleAction(e.key);
    }
    document.addEventListener('keydown', onKey);

    updateDisplay();

    return function cleanup() {
      document.removeEventListener('keydown', onKey);
      container.innerHTML = '';
    };
  }

  mountCalculator = function(element, config) {
    return createCalculator(element, config);
  }

  // Export for CommonJS / AMD
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mountCalculator: mountCalculator };
  }
  // Export globally for script tag usage
  if (typeof window !== 'undefined') {
    window.mountCalculator = mountCalculator;
  }
})();

export { mountCalculator };
