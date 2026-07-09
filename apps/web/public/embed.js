/**
 * Calculo Embed Loader v4.0
 * Renders calculators as iframes pointing to the server-side embed.
 *
 * SETUP:
 *   <script>window.CALCULO_API_KEY = 'demo';</script>
 *   <script src="https://calculo-fawn.vercel.app/embed.js"></script>
 *   <div data-calculator="demo_basic"></div>
 *
 * CONFIGURATION (data-* attributes on the container div):
 *   data-calculator  — calculator ID (required)
 *   data-theme       — theme override: "dark", "light", "oled", etc.
 *   data-type        — calculator type: "basic", "scientific"
 *   data-width       — widget width (default: "340px")
 *   data-height      — widget height (default: "520px")
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

  function buildIframeUrl(cfg) {
    var url = BASE + '/api/embed/' + encodeURIComponent(cfg.id) + '?html=1';
    if (cfg.theme) url += '&theme=' + encodeURIComponent(cfg.theme);
    if (cfg.type) url += '&type=' + encodeURIComponent(cfg.type);
    if (cfg.primary) url += '&primary=' + encodeURIComponent(cfg.primary);
    return url;
  }

  function mount(el) {
    if (!keyValidated) { pendingMounts.push(el); return; }
    if (!keyValid) return;
    var cfg = readConfig(el);
    if (!cfg || !cfg.id) return;
    if (instances.has(cfg.id)) return;
    el.setAttribute('data-calculo-loading', '');

    var w = cfg.width || '340px';
    var h = cfg.height || '520px';

    el.innerHTML = '';
    el.style.position = el.style.position || '';

    if (cfg.position === 'floating' || cfg.position === 'fixed') {
      el.style.position = 'fixed';
      el.style.bottom = cfg.fixedBottom || '20px';
      el.style.right = cfg.fixedRight || '20px';
      el.style.zIndex = '99999';
      el.style.width = w;
    } else {
      if (cfg.width) el.style.width = w;
    }
    if (cfg.height) el.style.height = h;

    var iframe = document.createElement('iframe');
    iframe.src = buildIframeUrl(cfg);
    iframe.style.cssText = 'width:100%;height:100%;border:none;border-radius:12px;overflow:hidden;z-index:2147483647;';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('allowfullscreen', 'true');
    el.appendChild(iframe);

    instances.set(cfg.id, { el: el, iframe: iframe });
    el.removeAttribute('data-calculo-loading');
  }

  function unmount(id) {
    var inst = instances.get(id);
    if (inst) {
      if (inst.iframe && inst.iframe.parentNode) inst.iframe.parentNode.removeChild(inst.iframe);
      instances.delete(id);
    }
  }

  function scan() {
    var els = document.querySelectorAll('[data-calculator]');
    for (var i = 0; i < els.length; i++) mount(els[i]);
  }

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
