/**
 * Calculo Embed Loader v4.0
 * Self-contained: calculator runtime inlined, no import() needed.
 *
 * SETUP:
 *   <script>window.CALCULO_API_KEY = 'calc_live_your_key';</script>
 *   <script src="https://calculo-fawn.vercel.app/embed.js"></script>
 *   <div data-calculator="demo_basic"></div>
 *
 * CONFIGURATION (data-* attributes on the container div):
 *   data-calculator  — calculator ID (required)
 *   data-theme       — theme override: "dark", "light"
 *   data-type        — calculator type: "basic", "scientific"
 *   data-width       — widget width (default: "340px")
 *   data-height      — widget height (default: auto)
 *   data-primary     — primary color override
 *   data-position    — "inline", "floating", "fixed"
 *   data-fixed-bottom — fixed bottom offset
 *   data-fixed-right  — fixed right offset
 */
(function () {
  'use strict';

  var BASE = (function () {
    var s = document.currentScript;
    return s ? s.src.replace(/\/embed\.js.*$/, '') : 'https://calculo-fawn.vercel.app';
  })();

  var API_KEY = window.CALCULO_API_KEY || null;
  var keyValidated = false;
  var keyValid = false;
  var pendingMounts = [];
  var instances = new Map();

  function readConfig(el) {
    var id = el.getAttribute('data-calculator');
    if (!id) return null;
    return {
      id: id,
      theme: el.getAttribute('data-theme') || undefined,
      type: el.getAttribute('data-type') || undefined,
      width: el.getAttribute('data-width') || undefined,
      height: el.getAttribute('data-height') || undefined,
      primary: el.getAttribute('data-primary') || undefined,
      position: el.getAttribute('data-position') || undefined,
      fixedBottom: el.getAttribute('data-fixed-bottom') || undefined,
      fixedRight: el.getAttribute('data-fixed-right') || undefined,
    };
  }

  async function validateKey() {
    if (!API_KEY) {
      console.error('[calculo] CALCULO_API_KEY not set. Set window.CALCULO_API_KEY = "demo" or your key.');
      return false;
    }
    if (API_KEY === 'demo') return true;
    try {
      var res = await fetch(BASE + '/api/embed/validate?key=' + encodeURIComponent(API_KEY));
      var data = await res.json();
      return !!data.valid;
    } catch (e) {
      console.error('[calculo] Key validation failed:', e.message);
      return false;
    }
  }

  async function init() {
    keyValid = await validateKey();
    keyValidated = true;
    if (!keyValid) {
      var els = document.querySelectorAll('[data-calculator]');
      for (var i = 0; i < els.length; i++) {
        els[i].setAttribute('data-calculo-error', 'Invalid or missing API key');
      }
      return;
    }
    for (var i = 0; i < pendingMounts.length; i++) {
      await mount(pendingMounts[i]);
    }
    pendingMounts = [];
  }

  async function mount(el) {
    if (!keyValidated) { pendingMounts.push(el); return; }
    if (!keyValid) return;
    var cfg = readConfig(el);
    if (!cfg || !cfg.id) return;
    if (instances.has(cfg.id)) return;
    el.setAttribute('data-calculo-loading', '');

    if (cfg.position === 'floating' || cfg.position === 'fixed') {
      el.style.position = 'fixed';
      el.style.bottom = cfg.fixedBottom || '20px';
      el.style.right = cfg.fixedRight || '20px';
      el.style.zIndex = '99999';
      el.style.maxWidth = cfg.width || '340px';
    } else if (cfg.width) {
      el.style.width = cfg.width;
    }
    if (cfg.height) el.style.height = cfg.height;

    try {
      var res = await fetch(BASE + '/api/embed/' + encodeURIComponent(cfg.id) + '?key=' + encodeURIComponent(API_KEY));
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var config = await res.json();
      if (config.error) throw new Error(config.error.message);
      if (cfg.theme) { config.theme = config.theme || {}; config.theme.mode = cfg.theme; }
      if (cfg.type) config.type = cfg.type;
      if (cfg.primary) { config.theme = config.theme || {}; config.theme.primaryColor = cfg.primary; }
      config._embedWidth = cfg.width;
      config._embedHeight = cfg.height;

      var cleanup = renderCalculator(el, config);
      instances.set(cfg.id, { el: el, config: config, cleanup: cleanup });
      el.removeAttribute('data-calculo-loading');
    } catch (err) {
      el.removeAttribute('data-calculo-loading');
      el.setAttribute('data-calculo-error', err.message);
      console.error('[calculo]', err);
    }
  }

  function unmount(id) {
    var inst = instances.get(id);
    if (inst) { if (typeof inst.cleanup === 'function') inst.cleanup(); instances.delete(id); }
  }

  function scan() {
    var els = document.querySelectorAll('[data-calculator]');
    for (var i = 0; i < els.length; i++) mount(els[i]);
  }

  // ---------- INLINED CALCULATOR RUNTIME ----------

  function evalExpr(expr, angleMode) {
    var subst = expr
      .replace(/\u03C0/g, 'pi')
      .replace(/\u00D7/g, '*')
      .replace(/\u00F7/g, '/')
      .replace(/\u2212/g, '-')
      .replace(/\u221A\(/g, 'sqrt(')
      .replace(/\^/g, '**');
    try {
      var fn = new Function('angleMode',
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
        'return (' + subst + ')}');
      return { result: fn(angleMode || 'deg'), error: null };
    } catch (e) {
      return { result: null, error: e.message || 'Error' };
    }
  }

  var THEMES = {
    dark:  { bg: '#0a0a0b', surface: '#111113', border: 'rgba(255,255,255,0.06)', text: '#fafafa', muted: 'rgba(255,255,255,0.4)', primary: '#3b82f6', numBg: 'rgba(255,255,255,0.08)', opBg: 'rgba(255,255,255,0.05)', fnBg: 'rgba(255,255,255,0.04)', ctrlBg: 'rgba(255,255,255,0.06)', eqBg: '#3b82f6' },
    light: { bg: '#ffffff', surface: '#f5f5f5', border: 'rgba(0,0,0,0.08)', text: '#18181b', muted: 'rgba(0,0,0,0.4)', primary: '#2563eb', numBg: 'rgba(0,0,0,0.05)', opBg: 'rgba(0,0,0,0.03)', fnBg: 'rgba(0,0,0,0.02)', ctrlBg: 'rgba(0,0,0,0.04)', eqBg: '#2563eb' },
  };

  function toKebab(s) { return s.replace(/([A-Z])/g, '-$1').toLowerCase(); }

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === 'style' && typeof attrs[k] === 'object') {
          var parts = [];
          var styles = attrs[k];
          for (var p in styles) parts.push(toKebab(p) + ':' + styles[p]);
          e.setAttribute('style', parts.join(';'));
        } else if (k.indexOf('on') === 0) {
          e.addEventListener(k.slice(2), attrs[k]);
        } else if (k === 'id') {
          e.id = attrs[k];
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

  function renderCalculator(container, config) {
    var theme = THEMES[(config.theme && config.theme.mode) || 'dark'] || THEMES.dark;
    var primary = (config.theme && config.theme.primaryColor) || theme.primary;
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
    container.setAttribute('style',
      'font-family:system-ui,-apple-system,sans-serif;color:' + theme.text +
      ';background:' + theme.bg + ';border-radius:12px;overflow:hidden;width:' + w +
      ';box-sizing:border-box;position:relative;' + (h ? 'height:' + h + ';' : ''));

    var wrapper = el('div', { style: { display: 'flex', flexDirection: 'column' } });

    var closeBtn = el('button', { style: { position: 'absolute', top: '6px', right: '8px', width: '20px', height: '20px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: theme.muted, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: '10', padding: '0', lineHeight: '1' } }, '\u00D7');
    var fabBtn = el('button', { style: { display: 'none', position: 'fixed', bottom: '24px', right: '24px', width: '52px', height: '52px', borderRadius: '50%', border: 'none', cursor: 'pointer', background: primary, color: '#fff', fontSize: '22px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', zIndex: '99998', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s, box-shadow 0.2s' } }, '\u2295');

    function minimize() {
      wrapper.style.display = 'none';
      fabBtn.style.display = 'flex';
      container.style.background = 'transparent';
      container.style.overflow = 'visible';
      container.style.borderRadius = '0';
    }
    function restore() {
      wrapper.style.display = 'flex';
      fabBtn.style.display = 'none';
      container.style.background = theme.bg;
      container.style.overflow = 'hidden';
      container.style.borderRadius = '12px';
    }
    closeBtn.addEventListener('click', minimize);
    fabBtn.addEventListener('click', restore);
    fabBtn.addEventListener('mouseenter', function () { fabBtn.style.transform = 'scale(1.1)'; });
    fabBtn.addEventListener('mouseleave', function () { fabBtn.style.transform = ''; });

    var header = el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px 4px', position: 'relative' } }, [
      el('span', { style: { fontSize: '9px', fontWeight: '600', letterSpacing: '0.15em', textTransform: 'uppercase', opacity: '0.3' } }, 'calculo'),
      closeBtn,
      el('span', { style: { fontSize: '9px', fontFamily: 'monospace', opacity: '0.35' }, id: 'calc-status' }, isScientific ? angleMode : ''),
    ]);

    var exprEl = el('div', { style: { fontFamily: 'monospace', fontSize: '11px', color: theme.muted, minHeight: '1.2em', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', padding: '0 12px' } }, '\u00A0');
    var resultEl = el('div', { style: { fontFamily: 'monospace', fontSize: '24px', fontWeight: '600', textAlign: 'right', padding: '0 12px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, '0');
    var display = el('div', { style: { background: theme.surface, margin: '0 8px 8px', borderRadius: '10px', border: '1px solid ' + theme.border, paddingTop: '8px' } }, [exprEl, resultEl]);

    var statusEl = header.querySelector('#calc-status');

    function updateDisplay() {
      exprEl.textContent = expression || '\u00A0';
      resultEl.textContent = result;
      if (statusEl) statusEl.textContent = isScientific ? (angleMode + (shiftOn ? ' \u00B7 2ND' : '')) : '';
    }

    function doEval() {
      if (!expression) return;
      var res = evalExpr(expression, angleMode);
      if (res.error) { result = 'Error'; }
      else { result = String(res.result); ans = result; history.push({ expr: expression, result: result }); expression = ''; }
      updateDisplay();
    }

    function insert(t) { expression += t; updateDisplay(); }

    function makeBtn(label, kind, onClick) {
      var bg = theme.numBg, color = theme.text, fontSize = '13px', fontWeight = '500';
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
          userSelect: 'none',
        },
      }, label);
      btn.addEventListener('mousedown', function () { btn.style.transform = 'scale(0.93)'; });
      btn.addEventListener('mouseup', function () { btn.style.transform = ''; });
      btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
      btn.addEventListener('click', onClick);
      return btn;
    }

    var BASIC_KEYS = [
      ['AC','ctrl','clearAll',''],     ['(','ctrl','(',''],     [')','ctrl',')',''],     ['\u00F7','op','/',''],     ['DEL','ctrl','del',''],
      ['M+','mem','m+',''],            ['7','num','7',''],     ['8','num','8',''],     ['9','num','9',''],    ['\u00D7','op','*',''],
      ['M\u2212','mem','m\u2212',''],  ['4','num','4',''],     ['5','num','5',''],     ['6','num','6',''],    ['\u2212','op','-',''],
      ['MR','mem','mr',''],            ['1','num','1',''],     ['2','num','2',''],     ['3','num','3',''],    ['+','op','+',''],
      ['MC','mem','mc',''],            ['0','num','0',''],     ['.','num','.',''],     ['(\u2212)','ctrl','neg',''],  ['\uFF1D','eq','eval',''],
    ];

    var SCI_KEYS = [
      ['2nd','ctrl','shift',''],   ['DRG','ctrl','mode',''],     ['DEL','ctrl','del',''],     ['(','ctrl','(',''],    [')','ctrl',')',''],
      ['LOG','fn','log','10\u02E3'],  ['\u03C0','fn','pi','e'],   ['SIN','fn','sin','sin\u207B\u00B9'],  ['COS','fn','cos','cos\u207B\u00B9'], ['TAN','fn','tan','tan\u207B\u00B9'],
      ['x\u00B2','fn','sq','x\u00B3'],  ['^','op','^','x\u221A'],   ['\u221A','fn','sqrt','\u221B'],       ['x\u207B\u00B9','fn','inv','|x|'], ['CLR','ctrl','clearAll',''],
      ['7','num','7',''],            ['8','num','8',''],           ['9','num','9',''],           ['\u00F7','op','/',''],        ['\u00D7','op','*',''],
      ['4','num','4',''],            ['5','num','5',''],           ['6','num','6',''],           ['\u2212','op','-',''],        ['+','op','+',''],
      ['1','num','1',''],            ['2','num','2',''],           ['3','num','3',''],           ['M+','mem','m+','MR'],   ['M\u2212','mem','m\u2212','MC'],
      ['0','num','0',''],            ['.','num','.',''],           ['(\u2212)','ctrl','neg',''],  ['ANS','ctrl','ans',''],  ['\uFF1D','eq','eval',''],
    ];

    var keyDefs = config.type === 'basic' ? BASIC_KEYS : SCI_KEYS;
    var SHIFT_MAP = { sin: 'asin', cos: 'acos', tan: 'atan', log: '10**', sq: '**3', sqrt: 'cbrt', inv: 'abs' };

    function handleAction(action) {
      if (action === 'shift') { if (!isScientific) return; shiftOn = !shiftOn; updateDisplay(); return; }
      if (action === 'mode') { if (!isScientific) return; angleMode = angleMode === 'deg' ? 'rad' : angleMode === 'rad' ? 'grad' : 'deg'; shiftOn = false; updateDisplay(); return; }

      var finalAction = action;
      if (shiftOn && SHIFT_MAP[action]) finalAction = SHIFT_MAP[action];
      shiftOn = false;

      if (finalAction === 'clearAll') { expression = ''; result = '0'; ans = null; history = []; updateDisplay(); return; }
      if (finalAction === 'del') { expression = expression.slice(0, -1); updateDisplay(); return; }
      if (finalAction === 'neg') { expression = expression.indexOf('-') === 0 ? expression.slice(1) : '-' + expression; updateDisplay(); return; }
      if (finalAction === 'pi') { insert('\u03C0'); return; }
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
      if (finalAction === 'm\u2212') { var v2 = parseFloat(result); if (!isNaN(v2)) memory = (memory || 0) - v2; return; }
      if (finalAction === 'MR') { if (memory !== null) insert(String(memory)); return; }
      if (finalAction === 'MC') { memory = null; return; }
      if (finalAction === 'eval') { doEval(); return; }

      insert(finalAction);
    }

    var COLS = 5;
    for (var ri = 0; ri < keyDefs.length; ri += COLS) {
      var row = keyDefs.slice(ri, ri + COLS);
      var rowEl = el('div', { style: { display: 'flex', gap: '3px', padding: '0 8px' } });
      row.forEach(function (def) {
        var label = def[0], kind = def[1], action = def[2], shiftLabel = def[3];
        var btn = makeBtn(label, kind, function () { handleAction(action); });
        if (shiftLabel && action !== 'shift' && action !== 'mode') {
          var badge = el('span', { style: { position: 'absolute', top: '1px', left: '3px', fontSize: '7px', fontWeight: '600', color: '#facc15', opacity: '0.65', pointerEvents: 'none', letterSpacing: '0.05em' } }, shiftLabel);
          btn.appendChild(badge);
        }
        rowEl.appendChild(btn);
      });
      wrapper.appendChild(rowEl);
    }

    var footer = el('div', { style: { textAlign: 'center', padding: '8px 0 6px' } }, [
      el('a', { href: 'https://calculo-fawn.vercel.app', target: '_blank', rel: 'noopener noreferrer', style: { fontSize: '8px', fontFamily: 'monospace', letterSpacing: '0.2em', textTransform: 'uppercase', color: theme.muted, textDecoration: 'none', opacity: '0.4' } }, 'calculo'),
    ]);

    wrapper.appendChild(footer);
    container.appendChild(wrapper);
    container.appendChild(fabBtn);

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
      if (fabBtn && fabBtn.parentNode) fabBtn.parentNode.removeChild(fabBtn);
    };
  }

  // ---------- END INLINED RUNTIME ----------

  function startScan() {
    init().then(scan).catch(function (err) {
      console.error('[calculo] init failed:', err);
    });

    try {
      if (typeof MutationObserver !== 'undefined') {
        var target = document.body || document.documentElement;
        if (target) {
          var observer = new MutationObserver(function (mutations) {
            for (var i = 0; i < mutations.length; i++) {
              var nodes = mutations[i].addedNodes;
              for (var j = 0; j < nodes.length; j++) {
                var node = nodes[j];
                if (node.nodeType === 1) {
                  if (node.hasAttribute && node.hasAttribute('data-calculator')) mount(node);
                  if (node.querySelectorAll) {
                    var children = node.querySelectorAll('[data-calculator]');
                    for (var k = 0; k < children.length; k++) mount(children[k]);
                  }
                }
              }
            }
          });
          observer.observe(target, { childList: true, subtree: true });
        }
      }
    } catch (e) {
      console.warn('[calculo] MutationObserver failed (non-critical):', e.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startScan);
  } else {
    startScan();
  }

  window.CalculoEmbed = { mount: mount, unmount: unmount, scan: scan };
})();
