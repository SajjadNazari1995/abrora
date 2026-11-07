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
  var KINDS = ['menstrual', 'follicular', 'fertile', 'luteal', 'pms', 'late'];

  var cfgBase = (typeof self !== 'undefined' && self.ABRORA_CONFIG && self.ABRORA_CONFIG.contentBase) || 'content/';
  var base = /\/$/.test(cfgBase) ? cfgBase : cfgBase + '/';
  var cfgApi = (typeof self !== 'undefined' && self.ABRORA_CONFIG && self.ABRORA_CONFIG.contentApi) || '';
  var api = /^https:\/\//.test(cfgApi) ? (/\/$/.test(cfgApi) ? cfgApi : cfgApi + '/') : '';
  var idx = null, loading = null, bodies = {}, failed = false, useApi = false, msgP = null, fontP = null;

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
  /* The server. Gives up after 6 s so a slow or missing server never holds the app back. */
  function getApi(path) {
    if (!api) return Promise.reject(new Error('no api'));
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    return fetch(api + path, { cache: 'no-cache', credentials: 'omit', signal: ctl ? ctl.signal : undefined }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }, function (e) { clearTimeout(timer); throw e; });
  }
  function load(force) {
    if (idx && !force) return Promise.resolve(idx);
    if (loading && !force) return loading;
    // server first; if it is down, empty or not set up yet, the articles that ship with the app are used
    var first = api ? getApi('index').then(function (j) {
      var n = normIndex(j);
      if (!n.articles.length) throw new Error('server has no articles yet');
      useApi = true; return n;
    }) : Promise.reject(new Error('no api'));
    loading = first.catch(function () {
      useApi = false;
      return getJSON('index.json').then(normIndex);
    }).then(function (n) { idx = n; failed = false; loading = null; return idx; },
      function (e) { failed = true; loading = null; throw e; });
    return loading;
  }
  function bundledPath(it) { return 'articles/' + it.id + '.json'; }
  function get(id) {
    if (bodies[id]) return Promise.resolve(bodies[id]);
    var it = idx && idx.articles.filter(function (a) { return a.id === id; })[0];
    if (!it) return Promise.reject(new Error('unknown article'));
    var src = useApi
      ? getApi('articles/' + id).catch(function () { return getJSON(bundledPath(it)); })
      : getJSON(bundledPath(it));
    return src.then(function (j) { return (bodies[id] = normBody(j)); });
  }
  /* Quietly fetch every article once so the service worker has them all for offline reading. */
  function prefetch() {
    if (!idx || (typeof navigator !== 'undefined' && navigator.onLine === false)) return Promise.resolve();
    return idx.articles.reduce(function (p, a) {
      return p.then(function () { return get(a.id).catch(function () { }); });
    }, Promise.resolve());
  }

  /* ---------- workouts ---------- */
  var KIND_W = ['stretch', 'yoga', 'strength', 'cardio', 'mobility'], WHERE = ['home', 'gym', 'any'], LEVEL = ['beginner', 'intermediate', 'advanced'];
  var wList = null, wFull = {}, wBundled = null;

  function normExercise(e) {
    if (!e || typeof e !== 'object' || !/^[a-z0-9][a-z0-9-]*$/.test(str(e.id, 80))) return null;
    var name = tri(e.name, 120); if (!name) return null;
    var how = {}; LANGS.forEach(function (l) {
      var a = e.how && e.how[l]; how[l] = (Array.isArray(a) ? a : []).filter(function (x) { return typeof x === 'string'; }).map(function (x) { return str(x, 500); }).slice(0, 12);
    });
    LANGS.forEach(function (l) { if (!how[l].length) how[l] = how.en.length ? how.en : (how.fa.length ? how.fa : how.de); });
    var note = {}; LANGS.forEach(function (l) { note[l] = str(e.note && e.note[l], 400); });
    return { id: e.id, name: name, how: how, note: note, muscles: str(e.muscles, 80), equipment: str(e.equipment, 80) || 'none',
      image: /^https:\/\//.test(e.image || '') ? e.image.slice(0, 400) : '', video: /^https:\/\//.test(e.video || '') ? e.video.slice(0, 400) : '' };
  }
  function normWorkout(w, exMap) {
    if (!w || typeof w !== 'object' || !/^[a-z0-9][a-z0-9-]*$/.test(str(w.id, 80))) return null;
    var title = tri(w.title, 160); if (!title) return null;
    var steps = null;
    if (Array.isArray(w.steps)) {
      steps = w.steps.map(function (st) {
        if (!st || typeof st.exercise !== 'string') return null;
        var d = normExercise(st.detail) || (exMap && exMap[st.exercise]) || null;
        if (!d) return null;
        var amt = str(st.amount, 20); if (!/^[0-9]{1,3}(x[0-9]{1,3})?(s|min|x)?(\/side)?$/.test(amt)) amt = '';
        return { exercise: st.exercise, amount: amt, note: str(st.note, 200), detail: d };
      }).filter(Boolean).slice(0, 40);
      if (!steps.length) return null;
    }
    return {
      id: w.id, title: title, summary: tri(w.summary, 600) || title,
      kind: KIND_W.indexOf(w.kind) >= 0 ? w.kind : 'stretch', where: WHERE.indexOf(w.where) >= 0 ? w.where : 'home',
      level: LEVEL.indexOf(w.level) >= 0 ? w.level : 'beginner', minutes: Math.max(1, Math.min(240, Math.round(+w.minutes) || 15)),
      phases: strList(w.phases, PHASES, 8), signals: strList(w.signals, null, 20), order: isFinite(+w.order) ? +w.order : 999,
      count: steps ? steps.length : Math.max(0, Math.min(99, Math.round(+w.count) || 0)), steps: steps
    };
  }
  function bundledWorkouts() {
    if (wBundled) return Promise.resolve(wBundled);
    return getJSON('workouts.json').then(function (j) {
      var ex = {}; (Array.isArray(j.exercises) ? j.exercises : []).forEach(function (e) { var n = normExercise(e); if (n) ex[n.id] = n; });
      var list = (Array.isArray(j.workouts) ? j.workouts : []).map(function (w) { return normWorkout(w, ex); }).filter(Boolean);
      list.sort(function (a, b) { return a.order - b.order; });
      return (wBundled = list);
    });
  }
  /* The list of workouts: server first, then the ones that ship with the app. */
  function workouts() {
    if (wList) return Promise.resolve(wList);
    var first = (api && useApi) ? getApi('workouts').then(function (j) {
      var l = (Array.isArray(j && j.workouts) ? j.workouts : []).map(function (w) { return normWorkout(w); }).filter(Boolean);
      if (!l.length) throw new Error('none'); l.sort(function (a, b) { return a.order - b.order; }); wFull = {}; return { list: l, server: true };
    }) : Promise.reject(new Error('no server'));
    return first.catch(function () { return bundledWorkouts().then(function (l) { return { list: l, server: false }; }); })
      .then(function (r) { wList = r.list; wList.server = r.server; return wList; });
  }
  function workout(id) {
    if (wFull[id]) return Promise.resolve(wFull[id]);
    var fromBundle = function () { return bundledWorkouts().then(function (l) { var w = l.filter(function (x) { return x.id === id; })[0]; if (!w) throw new Error('unknown workout'); return (wFull[id] = w); }); };
    if (wList && wList.server) {
      return getApi('workouts/' + id).then(function (j) { var w = normWorkout(j); if (!w || !w.steps) throw new Error('bad workout'); return (wFull[id] = w); }).catch(fromBundle);
    }
    return fromBundle();
  }
  function recommendWorkouts(items, ctx, n) {
    var sym = (ctx.sym || []).concat(ctx.symRecent || []);
    return (items || []).map(function (w) {
      var s = 0, hit = w.signals.filter(function (x) { return (ctx.sym || []).indexOf(x) >= 0; }).length;
      if (hit) s += 4 + (hit > 1 ? 1 : 0);
      if (w.signals.some(function (x) { return sym.indexOf(x) >= 0; })) s += 1;
      if (w.phases.indexOf(ctx.phase) >= 0) s += 3;
      if (ctx.kind && ctx.kind !== ctx.phase && w.phases.indexOf(ctx.kind) >= 0) s += 2;
      if (w.phases.indexOf('any') >= 0) s += 1;
      // a tired or sore day should not get the hardest workout
      if ((ctx.sym || []).some(function (x) { return x === 'fatigue' || x === 'cramps' || x === 'backache'; }) && w.level !== 'beginner') s -= 3;
      s += (hash(w.id + ':' + ctx.day) % 100) / 200;
      return { w: w, s: s };
    }).sort(function (a, b) { return b.s - a.s; }).slice(0, n || 3).map(function (x) { return x.w; });
  }

  /* ---------- daily messages and fonts that live on the server (both optional) ---------- */
  function messages() {
    if (!api) return Promise.resolve(null);
    return msgP || (msgP = getApi('messages').then(function (j) {
      var out = {}, any = false;
      KINDS.forEach(function (k) {
        out[k] = (Array.isArray(j && j[k]) ? j[k] : []).map(function (m) { return tri(m, 400); }).filter(Boolean).slice(0, 60);
        if (out[k].length) any = true;
      });
      return any ? out : null;
    }).catch(function () { msgP = null; return null; }));
  }
  function fonts() {
    if (!api) return Promise.resolve([]);
    return fontP || (fontP = getApi('fonts').then(function (j) {
      var origin = api.replace(/^(https:\/\/[^/]+).*$/, '$1');
      return (Array.isArray(j) ? j : []).map(function (f) {
        var id = str(f && f.id, 60), family = str(f && f.family, 60).replace(/[^A-Za-z0-9 ]/g, ''), label = str(f && f.label, 60);
        var url = str(f && f.url, 400), bold = str(f && f.urlBold, 400);
        // only files from the server itself are accepted
        function ok(u) { return /^https:\/\//.test(u) && u.indexOf(origin + '/') === 0; }
        if (!/^[a-z0-9][a-z0-9-]*$/.test(id) || !family || !label || !ok(url)) return null;
        return { id: id, family: family, label: label, url: url, urlBold: ok(bold) ? bold : '', scripts: str(f.scripts, 8) || 'both' };
      }).filter(Boolean).slice(0, 12);
    }).catch(function () { fontP = null; return []; }));
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
    load: load, get: get, prefetch: prefetch, workouts: workouts, workout: workout, recommendWorkouts: recommendWorkouts, normWorkout: normWorkout, messages: messages, fonts: fonts, usingServer: function () { return useApi; }, recommend: recommend, forPain: forPain, search: search,
    index: function () { return idx; }, failed: function () { return failed; },
    normIndex: normIndex, normBody: normBody, PAIN: PAIN, base: base
  };
});
