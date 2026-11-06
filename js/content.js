/* Abrora — content: articles that live OUTSIDE the app code, plus the "what should I read today" scoring.

   Where the content comes from
   - Today:  the files in /content (index.json + articles/<id>.json) that ship with the app.
   - Later:  the same JSON shape can be served by your own server — set ABRORA_CONFIG.contentBase to its address.
   Nothing else in the app needs to change, because the app only talks to this file.

   Offline: the service worker keeps a copy of everything it has fetched (see sw.js), so articles open with no connection. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Content = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var LANGS = ['fa', 'en', 'de'];
  var PHASES = ['menstrual', 'follicular', 'fertile', 'luteal', 'pms', 'late', 'any'];
  var TONES = ['rose', 'mint', 'lilac', 'butter', 'sky'];
  var PAIN = ['cramps', 'headache', 'backache', 'breast'];

  var cfgBase = (typeof self !== 'undefined' && self.ABRORA_CONFIG && self.ABRORA_CONFIG.contentBase) || 'content/';
  var base = /\/$/.test(cfgBase) ? cfgBase : cfgBase + '/';
  var idx = null, loading = null, bodies = {}, failed = false;

  /* ---------- small helpers ---------- */
  function str(v, max) { return typeof v === 'string' ? v.slice(0, max || 4000) : ''; }
  function strList(a, allowed, max) {
    if (!Array.isArray(a)) return [];
    return a.filter(function (x) { return typeof x === 'string' && (!allowed || allowed.indexOf(x) >= 0); }).slice(0, max || 30);
  }
  function tri(o, max) {
    var r = {}, ok = false;
    LANGS.forEach(function (l) { r[l] = str(o && o[l], max); if (r[l]) ok = true; });
    // a missing language falls back to English, then to any other, so a half-translated article never shows blank.
    if (ok) LANGS.forEach(function (l) { if (!r[l]) r[l] = r.en || r.fa || r.de; });
    return ok ? r : null;
  }

  /* One entry of index.json -> safe object, or null if it is unusable (bad admin input never breaks the app). */
  function normItem(x) {
    if (!x || typeof x !== 'object' || x.status === 'draft' || x.status === 'hidden') return null;
    var id = str(x.id, 80);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) return null;
    var title = tri(x.title, 200), summary = tri(x.summary, 1200);
    if (!title || !summary) return null;
    return {
      id: id, title: title, summary: summary,
      category: str(x.category, 40) || 'basics',
      emoji: str(x.emoji, 8) || '📖',
      tone: TONES.indexOf(x.tone) >= 0 ? x.tone : 'lilac',
      phases: strList(x.phases, PHASES, 8),
      signals: strList(x.signals, null, 20),
      moods: strList(x.moods, null, 10),
      readMin: Math.max(1, Math.min(60, Math.round(+x.readMin) || 3)),
      updated: str(x.updated, 10),
      file: str(x.file, 120) || ('articles/' + id + '.json'),
      order: isFinite(+x.order) ? +x.order : 999
    };
  }
  function normIndex(j) {
    if (!j || typeof j !== 'object' || !Array.isArray(j.articles)) throw new Error('bad index');
    var cats = (Array.isArray(j.categories) ? j.categories : []).map(function (c) {
      var name = tri(c && c.name, 60), id = str(c && c.id, 40);
      return id && name ? { id: id, name: name, emoji: str(c.emoji, 8) } : null;
    }).filter(Boolean);
    var seen = {}, items = [];
    j.articles.forEach(function (x) {
      var it = normItem(x);
      if (it && !seen[it.id]) { seen[it.id] = 1; items.push(it); }
    });
    items.sort(function (a, b) { return a.order - b.order; });
    return { version: str(j.version, 40), updated: str(j.updated, 10), categories: cats, articles: items };
  }

  /* Article file -> safe body blocks. A block is { h }, { p } or { ul: [...] } per language. */
  function normBlocks(a) {
    var out = [];
    (Array.isArray(a) ? a : []).slice(0, 200).forEach(function (b) {
      if (!b || typeof b !== 'object') return;
      if (typeof b.h === 'string') out.push({ h: str(b.h, 200) });
      else if (typeof b.p === 'string') out.push({ p: str(b.p, 3000) });
      else if (Array.isArray(b.ul)) out.push({ ul: b.ul.filter(function (x) { return typeof x === 'string'; }).map(function (x) { return str(x, 800); }).slice(0, 30) });
    });
    return out;
  }
  function normBody(j) {
    if (!j || typeof j !== 'object') throw new Error('bad article');
    var body = {};
    LANGS.forEach(function (l) { body[l] = normBlocks(j.body && j.body[l]); });
    LANGS.forEach(function (l) { if (!body[l].length) body[l] = body.en.length ? body.en : (body.fa.length ? body.fa : body.de); });
    var sources = (Array.isArray(j.sources) ? j.sources : []).map(function (s) {
      if (!s || typeof s.title !== 'string') return null;
      var url = typeof s.url === 'string' && /^https:\/\//.test(s.url) ? s.url.slice(0, 300) : '';
      return { title: str(s.title, 200), org: str(s.org, 80), url: url };
    }).filter(Boolean).slice(0, 12);
    return { body: body, sources: sources, reviewed: str(j.reviewed, 10), updated: str(j.updated, 10) };
  }

  /* ---------- loading ---------- */
  function getJSON(path) {
    return fetch(base + path, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  function load(force) {
    if (idx && !force) return Promise.resolve(idx);
    if (loading && !force) return loading;
    loading = getJSON('index.json').then(function (j) {
      idx = normIndex(j); failed = false; loading = null; return idx;
    }, function (e) { failed = true; loading = null; throw e; });
    return loading;
  }
  function get(id) {
    if (bodies[id]) return Promise.resolve(bodies[id]);
    var it = idx && idx.articles.filter(function (a) { return a.id === id; })[0];
    if (!it) return Promise.reject(new Error('unknown article'));
    return getJSON(it.file).then(function (j) { return (bodies[id] = normBody(j)); });
  }
  /* Quietly fetch every article once so the service worker has them all for offline reading. */
  function prefetch() {
    if (!idx || (typeof navigator !== 'undefined' && navigator.onLine === false)) return Promise.resolve();
    return idx.articles.reduce(function (p, a) {
      return p.then(function () { return get(a.id).catch(function () { }); });
    }, Promise.resolve());
  }

  /* ---------- "what to read today" ---------- */
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }

  /* ctx: { day, phase, kind, sym[], symRecent[], mood[], moodRecent[], reads{id:day}, saved[] }
     Returns the best `n` articles, each with a `why` label ('symptom' | 'mood' | 'phase' | null). */
  function recommend(items, ctx, n) {
    var sym = ctx.sym || [], symR = ctx.symRecent || [], mood = ctx.mood || [], moodR = ctx.moodRecent || [], reads = ctx.reads || {};
    var out = (items || []).map(function (a) {
      var s = 0, why = null, hit;
      hit = a.signals.filter(function (x) { return sym.indexOf(x) >= 0; }).length;
      if (hit) { s += 5 + (hit > 1 ? 1.5 : 0); why = 'symptom'; }
      // the FIRST signal listed in an article is its main topic and counts extra
      if (a.signals.length && sym.indexOf(a.signals[0]) >= 0) s += 2;
      hit = a.signals.filter(function (x) { return symR.indexOf(x) >= 0 && sym.indexOf(x) < 0; }).length;
      if (hit) { s += 2; why = why || 'symptom'; }
      hit = a.moods.filter(function (x) { return mood.indexOf(x) >= 0; }).length;
      if (hit) { s += 3; why = why || 'mood'; }
      hit = a.moods.filter(function (x) { return moodR.indexOf(x) >= 0 && mood.indexOf(x) < 0; }).length;
      if (hit) s += 1;
      if (a.phases.indexOf(ctx.phase) >= 0) { s += 3; why = why || 'phase'; }
      if (ctx.kind && ctx.kind !== ctx.phase && a.phases.indexOf(ctx.kind) >= 0) { s += 2; why = why || 'phase'; }
      if (a.phases.indexOf('any') >= 0) s += 1;
      if (reads[a.id]) s -= (ctx.day - reads[a.id] <= 7) ? 4 : 1;
      s += (hash(a.id + ':' + ctx.day) % 100) / 200; // a little daily variety, never more than half a point
      return { a: a, score: s, why: s >= 3 ? why : null };
    });
    out.sort(function (x, y) { return y.score - x.score; });
    return out.slice(0, n || 3).map(function (x) { return { article: x.a, why: x.why, score: x.score }; });
  }

  /* Articles that match what hurts right now (used by the "I have pain today" sheet).
     The best symptom matches come first (the day of the cycle does not matter when something hurts);
     a "when to see a doctor" article from the health category always closes the list. */
  function forPain(items, picked, ctx, n) {
    var c = {}; for (var k in ctx) c[k] = ctx[k];
    c.sym = picked.slice(); c.symRecent = []; c.reads = {}; c.phase = null; c.kind = null;
    n = n || 3;
    var all = items || [];
    var match = all.filter(function (a) {
      return a.category !== 'health' && (!picked.length || a.signals.some(function (x) { return picked.indexOf(x) >= 0; }));
    });
    var res = recommend(match, c, n - 1);
    var doc = recommend(all.filter(function (a) { return a.category === 'health'; }), c, 1);
    return res.concat(doc).slice(0, n);
  }

  function search(items, q, lang) {
    q = String(q || '').trim().toLowerCase();
    if (!q) return items;
    return items.filter(function (a) {
      return (a.title[lang] + ' ' + a.summary[lang]).toLowerCase().indexOf(q) >= 0;
    });
  }

  return {
    load: load, get: get, prefetch: prefetch, recommend: recommend, forPain: forPain, search: search,
    index: function () { return idx; }, failed: function () { return failed; },
    normIndex: normIndex, normBody: normBody, PAIN: PAIN, base: base
  };
});
