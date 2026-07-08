/**
 * Calculo Embed Loader v1.0
 * Tiny loader that fetches calculator config and dynamically imports the runtime.
 * Usage: <script src="https://calculo-fawn.vercel.app/embed.js"></script>
 *        <div data-calculator="calc_abc123"></div>
 */
(function () {
  'use strict';

  var BASE = (function () {
    var s = document.currentScript;
    return s ? s.src.replace(/\/embed\.js.*$/, '') : 'https://calculo-fawn.vercel.app';
  })();

  var runtimePromise = null;
  var instances = new Map();

  function loadRuntime() {
    if (!runtimePromise) {
      runtimePromise = import(BASE + '/calculator-runtime.js');
    }
    return runtimePromise;
  }

  async function mount(el) {
    var id = el.getAttribute('data-calculator');
    if (!id || instances.has(id)) return;

    el.setAttribute('data-calculo-loading', '');

    try {
      var res = await fetch(BASE + '/api/embed/' + encodeURIComponent(id));
      if (!res.ok) throw new Error('Failed to load calculator: ' + res.status);
      var config = await res.json();

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
    document.addEventListener('DOMContentLoaded', scan);
  } else {
    scan();
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
