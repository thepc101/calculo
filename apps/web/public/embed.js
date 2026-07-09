/**
 * Calculo Embed Loader v3.0
 *
 * SETUP:
 *   <script>window.CALCULO_API_KEY = 'calc_live_your_key';</script>  <!-- or 'demo' -->
 *   <script src="https://calculo-fawn.vercel.app/embed.js"></script>
 *   <div data-calculator="demo_basic"></div>
 *
 * CONFIGURATION (data-* attributes on the container div):
 *   data-calculator  — calculator ID (required): "demo_basic", "demo_scientific", "calc_xxx"
 *   data-theme       — theme override: "dark", "light", "oled", "cyberpunk", "ocean", "forest", etc.
 *   data-type        — calculator type override: "basic", "scientific"
 *   data-width       — widget width (default: "340px")
 *   data-height      — widget height (default: auto)
 *   data-primary     — primary color override: "#ff0000", "rgb(255,0,0)", etc.
 *   data-position    — "inline" (default), "floating", "fixed"
 *   data-fixed-bottom — fixed position bottom offset (e.g. "20px")
 *   data-fixed-right  — fixed position right offset (e.g. "20px")
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

  var runtimePromise = null;
  var instances = new Map();

  function loadRuntime() {
    if (!runtimePromise) {
      runtimePromise = import(BASE + '/calculator-runtime.js');
    }
    return runtimePromise;
  }

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
      console.error('[calculo] CALCULO_API_KEY is not set. Embeds will not render.');
      console.error('[calculo] Add this before embed.js:');
      console.error('[calculo]   <script>window.CALCULO_API_KEY = "calc_live_your_key";<\/script>');
      console.error('[calculo] Or for demo configs, use: window.CALCULO_API_KEY = "demo";');
      return false;
    }
    if (API_KEY === 'demo') return true;
    try {
      var res = await fetch(BASE + '/api/embed/validate?key=' + encodeURIComponent(API_KEY));
      var data = await res.json();
      if (data.valid) return true;
      console.error('[calculo] Invalid API key. Embeds will not render.');
      return false;
    } catch (e) {
      console.error('[calculo] Could not validate API key:', e.message);
      return false;
    }
  }

  async function init() {
    keyValid = await validateKey();
    keyValidated = true;

    if (!keyValid) {
      var els = document.querySelectorAll('[data-calculator]');
      for (var i = 0; i < els.length; i++) {
        els[i].setAttribute('data-calculo-error', 'Invalid or missing CALCULO_API_KEY');
      }
      return;
    }

    for (var i = 0; i < pendingMounts.length; i++) {
      await mount(pendingMounts[i]);
    }
    pendingMounts = [];
  }

  async function mount(el) {
    if (!keyValidated) {
      pendingMounts.push(el);
      return;
    }
    if (!keyValid) return;

    var cfg = readConfig(el);
    if (!cfg || !cfg.id) return;
    if (instances.has(cfg.id)) return;

    el.setAttribute('data-calculo-loading', '');

    // Apply position styling
    if (cfg.position === 'floating' || cfg.position === 'fixed') {
      el.style.position = 'fixed';
      el.style.bottom = cfg.fixedBottom || '20px';
      el.style.right = cfg.fixedRight || '20px';
      el.style.zIndex = '99999';
      el.style.maxWidth = cfg.width || '340px';
    } else if (cfg.width) {
      el.style.width = cfg.width;
    }
    if (cfg.height) {
      el.style.height = cfg.height;
    }

    try {
      var res = await fetch(BASE + '/api/embed/' + encodeURIComponent(cfg.id) + '?key=' + encodeURIComponent(API_KEY));
      if (!res.ok) throw new Error('Failed to load calculator: ' + res.status);
      var config = await res.json();
      if (config.error) throw new Error(config.error.message);

      // Apply overrides from data-* attributes
      if (cfg.theme) {
        config.theme = config.theme || {};
        config.theme.mode = cfg.theme;
      }
      if (cfg.type) {
        config.type = cfg.type;
      }
      if (cfg.primary) {
        config.theme = config.theme || {};
        config.theme.primaryColor = cfg.primary;
      }
      config._embedWidth = cfg.width;
      config._embedHeight = cfg.height;

      var runtime = await loadRuntime();
      var mountFn = runtime.mountCalculator || runtime.default;
      if (typeof mountFn !== 'function') throw new Error('Invalid runtime');

      var cleanup = mountFn(el, config);
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
    if (inst) {
      if (typeof inst.cleanup === 'function') inst.cleanup();
      instances.delete(id);
    }
  }

  function scan() {
    var els = document.querySelectorAll('[data-calculator]');
    for (var i = 0; i < els.length; i++) {
      mount(els[i]);
    }
  }

  // Auto-scan on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init().then(scan); });
  } else {
    init().then(scan);
  }

  // Observe for dynamically added elements
  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var nodes = mutations[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) {
          var node = nodes[j];
          if (node.nodeType === 1) {
            if (node.hasAttribute && node.hasAttribute('data-calculator')) {
              mount(node);
            }
            if (node.querySelectorAll) {
              var children = node.querySelectorAll('[data-calculator]');
              for (var k = 0; k < children.length; k++) {
                mount(children[k]);
              }
            }
          }
        }
      }
    });
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  }

  // Public API
  window.CalculoEmbed = {
    mount: mount,
    unmount: unmount,
    scan: scan,
  };
})();
