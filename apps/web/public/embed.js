/**
 * Calculo Embed Loader v2.0
 *
 * REQUIREMENT: The embedding page must set CALCULO_API_KEY before loading this script.
 *
 *   <script>window.CALCULO_API_KEY = 'calc_live_your_key_here';</script>
 *   <script src="https://calculo-fawn.vercel.app/embed.js"></script>
 *   <div data-calculator="demo_basic"></div>
 *
 * The key is validated against the API on load. If missing or invalid, embeds won't render.
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

  async function validateKey() {
    if (!API_KEY) {
      console.error('[calculo] CALCULO_API_KEY is not set. Embeds will not render.');
      console.error('[calculo] Add this before embed.js:');
      console.error('[calculo]   <script>window.CALCULO_API_KEY = "calc_live_your_key";<\/script>');
      console.error('[calculo] Or for demo configs, use: window.CALCULO_API_KEY = "demo";');
      return false;
    }
    // Demo configs don't need a real API key
    if (API_KEY === 'demo') return true;
    try {
      var res = await fetch(BASE + '/api/embed/validate?key=' + encodeURIComponent(API_KEY));
      var data = await res.json();
      if (data.valid) {
        return true;
      }
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

    var id = el.getAttribute('data-calculator');
    if (!id || instances.has(id)) return;

    el.setAttribute('data-calculo-loading', '');

    try {
      var res = await fetch(BASE + '/api/embed/' + encodeURIComponent(id) + '?key=' + encodeURIComponent(API_KEY));
      if (!res.ok) throw new Error('Failed to load calculator: ' + res.status);
      var config = await res.json();

      if (config.error) throw new Error(config.error.message);

      var runtime = await loadRuntime();
      var mountFn = runtime.mountCalculator || runtime.default;
      if (typeof mountFn !== 'function') throw new Error('Invalid runtime');

      var cleanup = mountFn(el, config);
      instances.set(id, { el: el, config: config, cleanup: cleanup });
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
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Public API
  window.CalculoEmbed = {
    mount: mount,
    unmount: unmount,
    scan: scan,
  };
})();
