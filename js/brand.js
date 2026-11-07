/* Brand names are proper nouns: they are NEVER translated or transliterated (V2 §brand).
   Abra = the female app (first product), Aurora = the male app (Phase 3), Abrora = the shared app when two people join:
   the name, icon and colour theme of BOTH partners change automatically when paired, and change back when unlinked. */
(function (root) {
  'use strict';
  var NAMES = { abra: 'Abra', aurora: 'Aurora', abrora: 'Abrora' };
  var cur = 'abra';
  function suffix(k) { return k === 'abra' ? '' : '-' + k; }
  root.Brand = {
    NAMES: NAMES,
    set: function (k) {
      if (!NAMES[k]) return;
      cur = k;
      try {
        var d = root.document;
        if (!d) return;
        d.documentElement.setAttribute('data-brand', k);
        var a = d.querySelector('link[rel="icon"]'), b = d.querySelector('link[rel="apple-touch-icon"]');
        if (a) a.href = 'icons/favicon' + suffix(k) + '.png';
        if (b) b.href = 'icons/apple-touch-icon' + suffix(k) + '.png';
        d.title = NAMES[k];
      } catch (e) { }
    },
    key: function () { return cur; },
    name: function () { return NAMES[cur]; },
    logo: function () { return 'icons/' + cur + '.svg'; },
    developer: 'Nazari Technologies'
  };
})(typeof self !== 'undefined' ? self : this);
