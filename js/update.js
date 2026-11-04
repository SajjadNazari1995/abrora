/* Abrora updater: notices a new version and lets the person apply it with one tap.
   Works the same on iPhone (home-screen app) and Android (Chrome / installed app). */
(function (root) {
  'use strict';

  var cur = (root.ABRORA_RELEASE || {}).version || '0';
  var reg = null, applying = false, opts = {}, announced = null;

  function supported() { return 'serviceWorker' in navigator && location.protocol !== 'file:'; }

  function askRelease(worker) {
    return new Promise(function (resolve) {
      var done = false, ch;
      function fin(v) { if (!done) { done = true; resolve(v || {}); } }
      try {
        ch = new MessageChannel();
        ch.port1.onmessage = function (e) { fin(e.data); };
        worker.postMessage({ type: 'GET_RELEASE' }, [ch.port2]);
      } catch (e) { fin(); }
      setTimeout(fin, 1500);
    });
  }

  function announce(worker) {
    if (announced === worker) return;
    announced = worker;
    askRelease(worker).then(function (rel) {
      if (opts.onAvailable) opts.onAvailable({
        version: rel.version || '', notes: rel.notes || null,
        apply: function () { apply(worker); }
      });
    });
  }

  function apply(worker) {
    var go = function () {
      applying = true;
      try { worker.postMessage({ type: 'SKIP_WAITING' }); } catch (e) { }
      setTimeout(function () { location.reload(); }, 3500); // safety net if controllerchange never fires
    };
    var before = opts.beforeApply ? opts.beforeApply() : null;
    if (before && before.then) before.then(go, go); else go();
  }

  function watch(r) {
    if (r.waiting && navigator.serviceWorker.controller) announce(r.waiting);
    r.addEventListener('updatefound', function () {
      var w = r.installing;
      if (!w) return;
      w.addEventListener('statechange', function () {
        if (w.state === 'installed' && navigator.serviceWorker.controller) announce(w);
      });
    });
  }

  function check() {
    if (!reg || (navigator.onLine === false)) return Promise.resolve('offline');
    return reg.update().then(function () {
      var w = reg.installing;
      if (w && w.state !== 'installed') {
        return new Promise(function (res) {
          w.addEventListener('statechange', function () {
            if (w.state === 'installed') res(navigator.serviceWorker.controller ? 'available' : 'latest');
            else if (w.state === 'redundant') res('latest');
          });
        });
      }
      return reg.waiting && navigator.serviceWorker.controller ? 'available' : 'latest';
    }).catch(function () { return 'offline'; });
  }

  function init(o) {
    opts = o || {};
    if (!supported()) return;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (applying) location.reload(); });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (r) {
      reg = r; watch(r); check();
    }).catch(function () { });
    // Phones keep installed apps alive in the background, so also look again when the app comes back.
    document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
    window.addEventListener('online', check);
    setInterval(check, 30 * 60 * 1000);
  }

  root.Updater = { init: init, check: check, version: cur, supported: supported };
})(self);
