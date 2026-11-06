/* Abrora — app shell, views and interactions. Vanilla JS, fully offline. */
(function () {
  'use strict';

  var E = Engine, I = I18N, t = I.t, num = I.num, CT = self.Content, LK = self.Lock;
  var KEY = 'abrora:v1';
  var VERSION = (self.ABRORA_RELEASE || {}).version || '1.0.0';
  var SNAP_KEY = 'abrora:pre-update', UNDO_KEY = 'abrora:pre-restore';
  var THEMES = ['auto', 'light', 'dark'];
  var ISO_RE = /^\d{4}-\d{2}-\d{2}$/, SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;
  function cleanName(v) { return String(v || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30); }

  /* ============ storage ============ */
  function defaults() {
    return {
      v: 1,
      settings: { lang: 'fa', font: 'vazir', theme: 'auto', weekStart: 1, calendar: 'gregorian', name: '', cycleLen: 28, periodLen: 5, lutealLen: 14, onboarded: false, installDismissed: false },
      periods: [], logs: {}, reads: {}, saved: []
    };
  }
  function clamp(v, a, b, d) { v = Math.round(+v); return isFinite(v) ? Math.min(b, Math.max(a, v)) : d; }
  function sanitize(j) {
    var d = defaults();
    if (!j || typeof j !== 'object') return d;
    var s = j.settings || {};
    if (I.LANGS.indexOf(s.lang) >= 0) d.settings.lang = s.lang;
    if (THEMES.indexOf(s.theme) >= 0) d.settings.theme = s.theme;
    if (s.font === 'iransans' || s.font === 'vazir') d.settings.font = s.font;
    if ([0, 1, 6].indexOf(+s.weekStart) >= 0) d.settings.weekStart = +s.weekStart;
    if (s.calendar === 'jalali' || s.calendar === 'gregorian') d.settings.calendar = s.calendar;
    if (typeof s.name === 'string') d.settings.name = cleanName(s.name);
    d.settings.cycleLen = clamp(s.cycleLen, 20, 60, 28);
    d.settings.periodLen = clamp(s.periodLen, 1, 12, 5);
    d.settings.lutealLen = clamp(s.lutealLen, 8, 18, 14);
    d.settings.onboarded = !!s.onboarded;
    d.settings.installDismissed = !!s.installDismissed;
    (Array.isArray(j.periods) ? j.periods : []).forEach(function (r) {
      if (r && ISO_RE.test(r.s) && ISO_RE.test(r.e || r.s) && E.toN(r.e || r.s) >= E.toN(r.s)) d.periods.push({ s: r.s, e: r.e || r.s, open: !!r.open });
    });
    var logs = j.logs && typeof j.logs === 'object' ? j.logs : {};
    Object.keys(logs).forEach(function (k) {
      if (!ISO_RE.test(k)) return;
      var l = logs[k] || {}, o = {};
      if (+l.flow >= 1 && +l.flow <= 4) o.flow = +l.flow;
      if (Array.isArray(l.mood)) o.mood = l.mood.filter(function (x) { return typeof x === 'string'; }).slice(0, 10);
      if (Array.isArray(l.sym)) o.sym = l.sym.filter(function (x) { return typeof x === 'string'; }).slice(0, 20);
      if (typeof l.note === 'string') o.note = l.note.slice(0, 2000);
      if (!emptyLog(o)) d.logs[k] = o;
    });
    var rd = j.reads && typeof j.reads === 'object' ? j.reads : {};
    Object.keys(rd).slice(0, 500).forEach(function (k) { if (SLUG_RE.test(k) && isFinite(+rd[k])) d.reads[k] = Math.round(+rd[k]); });
    (Array.isArray(j.saved) ? j.saved : []).forEach(function (k) { if (typeof k === 'string' && SLUG_RE.test(k) && d.saved.indexOf(k) < 0 && d.saved.length < 200) d.saved.push(k); });
    return d;
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return sanitize(JSON.parse(raw));
      // Main data missing but a safety copy from the last update exists: bring it back.
      var snap = JSON.parse(localStorage.getItem(SNAP_KEY) || 'null');
      if (snap && snap.data) { var r = sanitize(snap.data); if (r.periods.length || Object.keys(r.logs).length) return r; }
    } catch (e) { /* private mode or corrupt data: start fresh */ }
    return defaults();
  }
  function save(quiet) {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable: keep in memory */ }
    if (!quiet && self.Sync) Sync.touch();
  }
  function emptyLog(l) {
    return !l.flow && !(l.mood && l.mood.length) && !(l.sym && l.sym.length) && !(l.note && String(l.note).trim());
  }

  var S = load();
  var today = E.todayN(), A = null, ST = null;
  var ui = {
    view: 'home', prev: 'home', sheet: null, sheetShown: false, intro: true,
    cal: null, onb: null, lib: { cat: 'all', q: '' },
    locked: false, lockMsg: '', lockHelp: false, lockOk: null, unlocking: false,
    upd: null, updHidden: false, updStatus: '', installEvt: null
  };

  /* ============ helpers ============ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function whenStr(ts) {
    if (!ts) return '';
    var d = new Date(ts), n = E.fromYMD(d.getFullYear(), d.getMonth(), d.getDate());
    var hm = num(('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2));
    return (n === today ? t('today') : I.fmt.dayMonth(n)) + ' ' + hm;
  }
  function monthOf(n) { return Cal.ym(S.settings.calendar, n); }
  function shiftMonth(c, d) { return Cal.shift(c, d); }

  var IC = {
    cycle: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.4"/><circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
    stats: '<path d="M6 20v-8M12 20V5M18 20v-5"/>',
    tips: '<path d="M11 3.5l1.9 5.1 5.1 1.9-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9z"/><path d="M19 15.5v4M17 17.5h4"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    chev: '<path d="M9 5.5l6.5 6.5L9 18.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>',
    lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="3"/><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5"/>'
  };
  function icon(name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[name] + '</svg>';
  }
  function drop() { return '<svg viewBox="0 0 12 18" fill="currentColor" aria-hidden="true"><path d="M6 0C4 4.5 0 8 0 12a6 6 0 0012 0C12 8 8 4.5 6 0z"/></svg>'; }

  /* ============ theme + language ============ */
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function applyTheme() {
    var th = S.settings.theme;
    var dark = th === 'dark' || (th === 'auto' && mq && mq.matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    var m = $('meta[name="theme-color"]');
    if (m) m.setAttribute('content', dark ? '#120e22' : '#fbf6ff');
  }
  if (mq) {
    var onMq = function () { if (S.settings.theme === 'auto') applyTheme(); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  }
  function applyLang() {
    I.setLang(S.settings.lang);
    I.setCalendar(S.settings.calendar);
    var h = document.documentElement;
    h.lang = S.settings.lang;
    h.dir = I.isRTL() ? 'rtl' : 'ltr';
    document.title = t('app.name');
    if (S.settings.font === 'iransans') h.setAttribute('data-font', 'iransans'); else h.removeAttribute('data-font');
  }

  /* ============ derived state ============ */
  function compute() {
    today = E.todayN();
    E.normalize(S, today);
    A = E.analyze(S, today);
    ST = E.status(A, today);
  }

  /* ============ ring ============ */
  function pol(cx, cy, r, deg) { var a = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
  function arc(cx, cy, r, a0, a1) {
    var p0 = pol(cx, cy, r, a0), p1 = pol(cx, cy, r, a1);
    return 'M' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + 'A' + r + ' ' + r + ' 0 ' + ((a1 - a0) > 180 ? 1 : 0) + ' 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2);
  }
  function ringSVG() {
    var cx = 150, cy = 150, r = 112, sw = 22;
    var seg = E.ringSegments(A, today), L = seg.L;
    var capDeg = (sw / 2) / r * 180 / Math.PI;
    var out = '<svg class="ring-svg' + (ui.intro ? ' intro' : '') + '" viewBox="0 0 300 300" role="img" aria-label="' + esc(t('nav.cycle')) + '">';
    out += '<circle class="track" cx="' + cx + '" cy="' + cy + '" r="' + r + '" stroke-width="' + sw + '"/>';
    function seg2(range, cls, n) {
      if (!range) return '';
      var a0 = (range[0] - 1) / L * 360 + capDeg, a1 = range[1] / L * 360 - capDeg;
      if (a1 - a0 < 1) a1 = a0 + 1;
      return '<path class="arc ' + cls + ' a' + n + '" pathLength="1" stroke-width="' + sw + '" d="' + arc(cx, cy, r, a0, a1) + '"/>';
    }
    out += seg2(seg.period, 'p', 1) + seg2(seg.fertile, 'f', 2) + seg2(seg.pms, 'm', 3);
    for (var i = 1; i <= L; i++) {
      var pt = pol(cx, cy, r, (i - 0.5) / L * 360);
      out += '<circle class="dotc" cx="' + pt[0].toFixed(1) + '" cy="' + pt[1].toFixed(1) + '" r="1.7"/>';
    }
    // day labels outside the ring
    var l1 = pol(cx, cy, r + 24, 1 / L * 180), lL = pol(cx, cy, r + 24, 360 - 1 / L * 180);
    out += '<text class="lbl lp" x="' + l1[0].toFixed(1) + '" y="' + (l1[1] + 4).toFixed(1) + '" text-anchor="middle">' + num(1) + '</text>';
    out += '<text class="lbl lm" x="' + lL[0].toFixed(1) + '" y="' + (lL[1] + 4).toFixed(1) + '" text-anchor="middle">' + num(L) + '</text>';
    if (!A.empty) {
      var d = Math.max(1, Math.min(ST.dayInCycle, L));
      var mp = pol(cx, cy, r, (d - 0.5) / L * 360);
      var cls = ST.kind === 'period' ? 'mk-p' : (ST.kind === 'fertile' || ST.kind === 'ovulation') ? 'mk-f' : (ST.kind === 'pms' || ST.kind === 'late') ? 'mk-m' : 'mk-n';
      out += '<g class="marker"><circle class="mk ' + cls + '" cx="' + mp[0].toFixed(1) + '" cy="' + mp[1].toFixed(1) + '" r="19"/>' +
        '<text class="mk-t" x="' + mp[0].toFixed(1) + '" y="' + (mp[1] + 5).toFixed(1) + '" text-anchor="middle">' + num(Math.max(1, ST.dayInCycle)) + '</text></g>';
    }
    return out + '</svg>';
  }

  function ringCenter() {
    var date = I.fmt.weekdayLong(today), big = '', sub = '', btn = '';
    var startBtn = '<button class="btn outline" data-act="start-period">' + icon('plus') + t('b.start_period') + '</button>';
    switch (ST.kind) {
      case 'none':
        big = t('c.none'); sub = t('c.none_sub');
        btn = '<button class="btn primary" data-act="open-pick">' + icon('plus') + t('b.log_last') + '</button>'; break;
      case 'period':
        big = t('c.period_day', ST.periodDay); sub = t('c.period_sub');
        if (ST.open) btn = '<button class="btn outline" data-act="end-period">' + t('b.end_period') + '</button>'; break;
      case 'ovulation':
        big = t('c.ov_today'); btn = startBtn; break;
      case 'fertile':
        big = t('c.fertile');
        sub = ST.dayInCycle > A.ov ? t('c.after_ov') : t('c.to_ov', ST.daysToOvulation);
        btn = startBtn; break;
      case 'pms':
        big = t('c.to_period', ST.daysToPeriod); sub = t('c.pms_sub'); btn = startBtn; break;
      case 'late':
        big = t('c.late', ST.late); sub = t('c.late_sub'); btn = startBtn; break;
      default:
        big = t('c.to_period', ST.daysToPeriod); sub = t('c.cycle_day', ST.dayInCycle); btn = startBtn;
    }
    return '<div class="rc-date">' + esc(date) + '</div><div class="rc-big">' + esc(big) + '</div>' +
      (sub ? '<div class="rc-sub">' + esc(sub) + '</div>' : '') + btn;
  }

  /* ============ views ============ */
  function isStandalone() { return (navigator.standalone === true) || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches); }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }

  function topbar(withDate) {
    return '<header class="topbar"><div class="brand"><img class="logo" src="icons/logo.svg" alt="">' +
      '<div><div class="brand-name">' + esc(t('app.name')) + '</div><div class="brand-date">' + esc(t('app.tag')) + '</div></div></div>' +
      '<button class="icon-btn" data-act="settings" aria-label="' + esc(t('nav.settings')) + '">' + icon('sliders') + '</button></header>';
  }

  function todayPill() {
    var l = S.logs[E.toISO(today)] || {}, em = [];
    (l.mood || []).forEach(function (id) { I.MOODS.forEach(function (m) { if (m[0] === id) em.push(m[1]); }); });
    (l.sym || []).forEach(function (id) { I.SYMPTOMS.forEach(function (m) { if (m[0] === id) em.push(m[1]); }); });
    var bubbles = em.length
      ? em.slice(0, 4).map(function (e) { return '<span>' + e + '</span>'; }).join('')
      : '<span class="plus">' + icon('plus') + '</span>';
    return '<button class="today-pill" data-act="day" data-n="' + today + '"><span class="bubbles">' + bubbles + '</span>' +
      '<span class="txt">' + esc(em.length ? t('b.log_today_done') : t('b.log_today')) + '</span>' + icon('chev', 'chev flip') + '</button>';
  }

  /* ============ greeting, articles ============ */
  function kindKey() {
    switch (ST.kind) {
      case 'period': return 'menstrual';
      case 'ovulation': case 'fertile': return 'fertile';
      case 'pms': return 'pms';
      case 'late': return 'late';
      case 'none': return '';
      default: return ST.phase === 'luteal' ? 'luteal' : 'follicular';
    }
  }
  function greetHTML() {
    var nm = S.settings.name, key = kindKey(), msg = key ? I.kind(key, today) : '';
    if (!nm && !msg) return '';
    return '<section class="greet">' + (nm ? '<h1>' + esc(t('g.hello', nm)) + ' <span aria-hidden="true">🌸</span></h1>' : '') +
      (msg ? '<p>' + esc(msg) + '</p>' : '') + '</section>';
  }
  /* What we know about today, for choosing articles. */
  function recCtx() {
    var l = S.logs[E.toISO(today)] || {}, symR = [], moodR = [];
    for (var d = 1; d <= 3; d++) {
      var g = S.logs[E.toISO(today - d)];
      if (g) { symR = symR.concat(g.sym || []); moodR = moodR.concat(g.mood || []); }
    }
    return { day: today, phase: ST.kind === 'none' ? 'any' : ST.phase, kind: ST.kind, sym: l.sym || [], symRecent: symR,
      mood: l.mood || [], moodRecent: moodR, reads: S.reads };
  }
  function artItem(id) { var X = CT.index(); return X ? X.articles.filter(function (a) { return a.id === id; })[0] : null; }
  function catName(id) {
    var X = CT.index(), c = X && X.categories.filter(function (x) { return x.id === id; })[0];
    return c ? c.name[I.getLang()] : '';
  }
  function artRow(a, why) {
    var lg = I.getLang(), cat = catName(a.category);
    return '<button class="art-row" data-act="article" data-id="' + a.id + '"><span class="tile tone-' + a.tone + '" aria-hidden="true">' + esc(a.emoji) + '</span>' +
      '<span class="art-t"><b>' + esc(a.title[lg]) + '</b><small>' + esc((cat ? cat + ' · ' : '') + t('art.min', a.readMin)) + '</small>' +
      (why ? '<em class="why">' + esc(t('art.why.' + why)) + '</em>' : '') + '</span>' + icon('chev', 'flip') + '</button>';
  }
  function recommendedHTML(n, titleKey) {
    var X = CT.index();
    if (!X || !X.articles.length) return '';
    return '<h2 class="section-title">' + esc(t(titleKey)) + '</h2><div class="art-list">' +
      CT.recommend(X.articles, recCtx(), n).map(function (r) { return artRow(r.article, r.why); }).join('') + '</div>';
  }
  function artListHTML() {
    var X = CT.index(), L = ui.lib, items = X.articles;
    if (L.cat === 'saved') items = items.filter(function (a) { return S.saved.indexOf(a.id) >= 0; });
    else if (L.cat !== 'all') items = items.filter(function (a) { return a.category === L.cat; });
    items = CT.search(items, L.q, I.getLang());
    if (!items.length) return '<p class="empty-note">' + esc(t(L.cat === 'saved' && !L.q ? 'art.none_saved' : 'art.none')) + '</p>';
    return items.map(function (a) { return artRow(a); }).join('');
  }
  function libraryHTML() {
    var X = CT.index(), h = '<h2 class="section-title">' + esc(t('tips.articles')) + '</h2>';
    if (!X) {
      return h + '<div class="empty-note"><p>' + esc(t('art.unavailable')) + '</p><button class="btn soft" data-act="lib-retry">' + esc(t('art.retry')) + '</button></div>';
    }
    var L = ui.lib, lg = I.getLang();
    var chips = [['all', t('art.all')], ['saved', t('art.saved')]].concat(X.categories.map(function (c) { return [c.id, c.name[lg]]; }));
    h += '<div class="search"><input id="artQ" class="field" type="search" autocomplete="off" enterkeyhint="search" aria-label="' + esc(t('art.search')) +
      '" placeholder="' + esc(t('art.search')) + '" value="' + esc(L.q) + '"></div>';
    h += '<div class="fchips" role="group">' + chips.map(function (c) {
      return '<button class="fchip" data-act="lib-cat" data-v="' + esc(c[0]) + '" aria-pressed="' + (L.cat === c[0]) + '">' + esc(c[1]) + '</button>';
    }).join('') + '</div>';
    return h + '<div class="art-list" id="art-list">' + artListHTML() + '</div>';
  }
  function blockHTML(b) {
    if (b.h) return '<h3 class="rh">' + esc(b.h) + '</h3>';
    if (b.p) return '<p class="body">' + esc(b.p) + '</p>';
    if (b.ul) return '<ul class="rl">' + b.ul.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    return '';
  }
  function articleSheet(sh) {
    var a = artItem(sh.id), lg = I.getLang();
    if (!a) return '<p class="body">' + esc(t('art.none')) + '</p><div class="actions"><button class="btn primary block" data-act="sheet-close">' + esc(t('close')) + '</button></div>';
    var saved = S.saved.indexOf(a.id) >= 0;
    var saveBtn = '<button class="btn soft block" data-act="article-save" aria-pressed="' + saved + '">' + esc(t(saved ? 'art.unsave' : 'art.save')) + '</button>';
    var closeBtn = '<button class="btn block" data-act="sheet-close" style="color:var(--ink2)">' + esc(t('close')) + '</button>';
    var h = '<div class="big-em" aria-hidden="true">' + esc(a.emoji) + '</div><div class="art-meta">' + esc((catName(a.category) ? catName(a.category) + ' · ' : '') + t('art.min', a.readMin)) + '</div><h2>' + esc(a.title[lg]) + '</h2>';
    if (!sh.full) {
      return h + '<p class="body">' + esc(a.summary[lg]) + '</p><div class="actions"><button class="btn primary block" data-act="article-full">' + esc(t('art.read_full')) + '</button>' +
        saveBtn + closeBtn + '</div><p class="sub art-disc">' + esc(t('art.disclaimer')) + '</p>';
    }
    if (sh.st === 'loading') return h + '<p class="body">' + esc(t('art.loading')) + '</p>';
    if (sh.st === 'fail') {
      return h + '<p class="body">' + esc(t('art.fail')) + '</p><div class="actions"><button class="btn primary block" data-act="article-full">' + esc(t('art.retry')) +
        '</button><button class="btn soft block" data-act="article-back">' + esc(t('art.back')) + '</button></div>';
    }
    var b = sh.b;
    h += '<div class="reader">' + b.body[lg].map(blockHTML).join('') + '</div>';
    if (b.sources.length) {
      h += '<h3 class="rh">' + esc(t('art.sources')) + '</h3><ul class="src" dir="ltr" lang="en">' + b.sources.map(function (x) {
        var txt = esc((x.org ? x.org + ' — ' : '') + x.title);
        return '<li>' + (x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">' + txt + '</a>' : txt) + '</li>';
      }).join('') + '</ul>';
    }
    h += '<p class="sub art-disc">' + esc(t('art.disclaimer')) + (a.updated ? ' ' + esc(t('art.updated', I.fmt.full(E.toN(a.updated)))) : '') + '</p>';
    return h + '<div class="actions">' + saveBtn + '<button class="btn soft block" data-act="article-back">' + esc(t('art.back')) + '</button>' + closeBtn + '</div>';
  }
  function painSheet() {
    var X = CT.index(), l = S.logs[E.toISO(today)] || {};
    var picked = (l.sym || []).filter(function (x) { return CT.PAIN.indexOf(x) >= 0; });
    var h = '<div class="big-em" aria-hidden="true">🩹</div><h2>' + esc(t('pain.title')) + '</h2><p class="body">' + esc(t('pain.desc')) + '</p><div class="chips">' +
      I.SYMPTOMS.filter(function (m) { return CT.PAIN.indexOf(m[0]) >= 0; }).map(function (m) {
        return chip('pain-sym', m[0], m[1], t('sym.' + m[0]), picked.indexOf(m[0]) >= 0);
      }).join('') + '</div>';
    if (X && picked.length) {
      h += '<h3 class="rh">' + esc(t('pain.for')) + '</h3><div class="art-list">' +
        CT.forPain(X.articles, picked, recCtx(), 3).map(function (r) { return artRow(r.article, null); }).join('') + '</div>';
    } else h += '<p class="sub" style="margin-top:12px">' + esc(t(X ? 'pain.pick' : 'art.unavailable')) + '</p>';
    return h + '<p class="sub art-disc">' + esc(t('pain.warn')) + '</p><div class="actions"><button class="btn soft block" data-act="sheet-close">' + esc(t('close')) + '</button></div>';
  }

  /* ============ app lock ============ */
  var LOCK_GRACE = 20000, awayAt = 0;
  function lockHTML() {
    var h = '<div class="applock-card"><img class="logo" src="icons/logo.svg" alt="">';
    if (ui.lockHelp) {
      return h + '<h1>' + esc(t('lock.reset_t')) + '</h1><p class="lead">' + esc(t('lock.reset_d')) + '</p><div class="stack">' +
        '<button class="btn danger block" data-act="lock-reset-yes">' + esc(t('lock.reset_yes')) + '</button>' +
        '<button class="btn soft block" data-act="lock-help-back">' + esc(t('back')) + '</button></div></div>';
    }
    return h + '<h1>' + esc(t('app.name')) + '</h1><p class="lead">' + esc(t(ui.lockMsg ? 'lock.retry' : 'lock.locked')) + '</p><div class="stack">' +
      '<button class="btn primary block" data-act="lock-unlock">' + icon('lock') + ' ' + esc(t('lock.unlock')) + '</button>' +
      '<button class="btn block" data-act="lock-help" style="color:var(--ink2)">' + esc(t('lock.help')) + '</button></div></div>';
  }
  function renderLock() {
    var r = $('#lock-root');
    if (!r) return;
    r.innerHTML = ui.locked ? '<div class="applock" role="dialog" aria-modal="true" aria-label="' + esc(t('lock.locked')) + '">' + lockHTML() + '</div>' : '';
    document.documentElement.classList.toggle('is-locked', !!ui.locked);
  }
  function lockNow() {
    if (!LK || !LK.enabled()) { document.documentElement.classList.remove('away'); return; }
    ui.locked = true; ui.lockMsg = ''; ui.lockHelp = false; renderLock();
  }
  function tryUnlock(silent) {
    if (ui.unlocking) return;
    ui.unlocking = true;
    LK.verify().then(function () {
      ui.unlocking = false; ui.locked = false; ui.lockMsg = '';
      document.documentElement.classList.remove('away'); renderLock();
    }, function (e) {
      ui.unlocking = false;
      if (!silent) { ui.lockMsg = (e && e.code) || 'fail'; renderLock(); }
    });
  }
  function lockGroup() {
    var on = LK.enabled(), h = '<section class="group"><h3>' + esc(t('lock.title')) + '</h3>';
    if (ui.lockOk === false && !on) return h + '<p class="hint">' + esc(t('lock.none')) + '</p></section>';
    return h + '<div class="block"><button class="switch-row" data-act="lock-toggle" role="switch" aria-checked="' + on + '"><span><b>' + esc(t('lock.row')) + '</b></span>' +
      '<span class="switch" aria-hidden="true" aria-checked="' + on + '"></span></button></div><p class="hint">' + esc(t('lock.desc')) + '</p></section>';
  }

  /* ============ articles: loading ============ */
  var contentAt = 0;
  function afterContent() {
    if (!ui.sheet && !ui.locked && S.settings.onboarded && (ui.view === 'home' || ui.view === 'tips')) renderView();
  }
  function loadContent(force) {
    contentAt = Date.now();
    return CT.load(force).then(function () { afterContent(); return CT.prefetch(); }, function () { afterContent(); });
  }
  function refreshContent() { if (Date.now() - contentAt > 3600000) loadContent(true); }

  function homeHTML() {
    var h = topbar();
    if (!isStandalone() && isIOS() && !S.settings.installDismissed) {
      h += '<div class="banner" role="note"><div>' + esc(t('h.install')) + '</div><button data-act="dismiss-install">' + esc(t('h.install_ok')) + '</button></div>';
    }
    if (self.Sync && Sync.needsAttention()) {
      h += '<div class="banner" role="note"><div>' + esc(t('cl.banner')) + '</div><button data-act="cloud-signin">' + esc(t('cl.signin')) + '</button></div>';
    }
    h += greetHTML();
    h += '<section class="ring-wrap">' + ringSVG() + '<div class="ring-center">' + ringCenter() + '</div></section>';
    h += '<div class="legend"><span><i class="dot p"></i>' + esc(t('ph.period')) + '</span><span><i class="dot f"></i>' + esc(t('ph.fertile')) + '</span><span><i class="dot m"></i>' + esc(t('ph.pms')) + '</span></div>';
    if (!A.empty) {
      h += '<div class="trio">' +
        '<div class="mini p"><div class="k">' + esc(t('q.next_period')) + '</div><div class="v">' + esc(I.fmt.dayMonth(ST.nextStart)) + '</div><div class="s">' + esc(t('in_days', ST.daysToPeriod)) + '</div></div>' +
        '<div class="mini f"><div class="k">' + esc(t('q.ovulation')) + '</div><div class="v">' + esc(I.fmt.dayMonth(ST.ovulationDate)) + '</div><div class="s">' + esc(t('in_days', ST.daysToOvulation)) + '</div></div>' +
        '<div class="mini c"><div class="k">' + esc(t('q.cycle_day')) + '</div><div class="v">' + esc(num(Math.max(1, ST.dayInCycle))) + '</div><div class="s">' + esc(t('q.cycle_len', A.L)) + '</div></div></div>';
    }
    h += todayPill();
    h += '<button class="pain-pill" data-act="pain"><span class="pe" aria-hidden="true">🩹</span><span class="txt">' + esc(t('pain.btn')) + '</span>' + icon('chev', 'chev flip') + '</button>';
    h += '<h2 class="section-title">' + esc(t('h.tips')) + '</h2><div class="carousel">';
    (I.TIPS[ST.phase] || I.TIPS.follicular).forEach(function (tp, i) {
      var tx = I.pick(tp);
      h += '<button class="tip tone-' + tp.tone + '" data-act="tip" data-phase="' + ST.phase + '" data-i="' + i + '"><b>' + esc(tx[0]) + '</b><span class="em" aria-hidden="true">' + tp.e + '</span></button>';
    });
    h += '</div>';
    var rec = recommendedHTML(2, 'h.recommended');
    if (rec) h += rec + '<button class="btn soft block more" data-act="tab" data-v="tips">' + esc(t('art.see_all')) + '</button>';
    return h;
  }

  /* ---- calendar grid (shared by calendar view and date picker) ---- */
  function monthGrid(c, mode, selected) {
    var cal = S.settings.calendar, first = Cal.firstOf(cal, c.y, c.m), dim = Cal.daysIn(cal, c.y, c.m);
    var ws = S.settings.weekStart, lead = (E.parts(first).wd - ws + 7) % 7, h = '<div class="week" aria-hidden="true">';
    for (var i = 0; i < 7; i++) { var wd = (ws + i) % 7; h += '<div title="' + esc(I.weekdayName(wd)) + '">' + esc(I.weekdayShort(wd)) + '</div>'; }
    h += '</div><div class="grid">';
    for (var e = 0; e < lead; e++) h += '<div class="cell empty"></div>';
    for (var d = 1; d <= dim; d++) {
      var n = first + d - 1, cls = 'cell', label = I.fmt.weekdayLong(n), info = E.dayInfo(A, n);
      var disabled = mode === 'pick' && n > today;
      if (mode === 'cal') {
        if (info.period) { cls += ' period'; label += ', ' + t('ph.period'); }
        else if (info.predPeriod) { cls += ' pred'; label += ', ' + t('d.info_pred'); }
        else if (info.ovulation) { cls += ' ov'; label += ', ' + t('d.info_ov'); }
        else if (info.fertile) { cls += ' fertile'; label += ', ' + t('ph.fertile'); }
        else if (info.pms) { cls += ' pms'; label += ', ' + t('d.info_pms'); }
      } else if (n === selected) cls += ' period';
      if (n === today) cls += ' today';
      var lg = S.logs[E.toISO(n)];
      var tick = mode === 'cal' && lg && !emptyLog(lg) ? '<i class="tick"></i>' : '';
      h += '<button class="' + cls + '" ' + (disabled ? 'disabled style="opacity:.35" ' : '') + 'data-act="' + (mode === 'cal' ? 'day' : 'pick-day') + '" data-n="' + n + '" aria-label="' + esc(label) + '"><span class="n">' + esc(num(d)) + '</span>' + tick + '</button>';
    }
    return h + '</div>';
  }

  function calendarHTML() {
    var c = ui.cal || (ui.cal = monthOf(today));
    var h = '<div class="page-head"><h1 class="page-title">' + esc(t('nav.calendar')) + '</h1><button class="btn soft" data-act="cal-today" style="min-height:44px">' + esc(t('today')) + '</button></div>';
    h += '<div class="cal-head"><button class="cal-nav" data-act="cal-prev" aria-label="' + esc(t('cal.prev')) + '">' + icon('chev', 'flip-back') + '</button>' +
      '<div class="cal-title" aria-live="polite">' + esc(I.fmt.monthYear(c.y, c.m)) + '</div>' +
      '<button class="cal-nav" data-act="cal-next" aria-label="' + esc(t('cal.next')) + '">' + icon('chev', 'flip') + '</button></div>';
    h += '<div class="cal-card">' + monthGrid(c, 'cal') + '</div>';
    h += '<div class="cal-legend"><span><i class="sw p"></i>' + esc(t('ph.period')) + '</span><span><i class="sw pred"></i>' + esc(t('cal.pred')) + '</span>' +
      '<span><i class="sw f"></i>' + esc(t('ph.fertile')) + '</span><span><i class="sw o"></i>' + esc(t('ph.ovulation')) + '</span>' +
      '<span><i class="sw m"></i>' + esc(t('ph.pms')) + '</span><span><i class="dot log"></i>' + esc(t('cal.logged')) + '</span></div>';
    return h;
  }

  function statsHTML() {
    var X = E.insights(S, A);
    var h = '<div class="page-head"><h1 class="page-title">' + esc(t('s.title')) + '</h1></div>';
    h += '<div class="stat-grid">' +
      '<div class="mini c"><div class="k">' + esc(t('s.avg_cycle')) + '</div><div class="stat-big">' + esc(t('days', A.L)) + '</div></div>' +
      '<div class="mini p"><div class="k">' + esc(t('s.avg_period')) + '</div><div class="stat-big">' + esc(t('days', A.P)) + '</div></div>';
    if (X.count >= 2) {
      h += '<div class="mini f"><div class="k">' + esc(t('s.regularity')) + '</div><div class="stat-big">' + esc(t(X.regular ? 's.regular' : 's.variable')) + '</div><div class="s">' + esc(t('s.range', X.min, X.max)) + '</div></div>';
    }
    h += '</div>';
    var cyc = X.cycles.filter(function (c) { return c.len >= 15 && c.len <= 60; }).slice(-6);
    if (cyc.length) {
      var mx = Math.max(A.L, Math.max.apply(null, cyc.map(function (c) { return c.len; })));
      var H = 112;
      h += '<h2 class="section-title">' + esc(t('s.history')) + '</h2><div class="card"><div class="small muted">' + esc(t('s.history_sub', A.L)) + '</div><div class="bars">' +
        '<div class="avg-line" style="bottom:' + (22 + Math.round(A.L / mx * H)) + 'px"></div>';
      cyc.forEach(function (c) {
        var m = I.fmt.monthOf(c.start);
        h += '<div class="bar-col"><span class="val">' + esc(num(c.len)) + '</span><div class="bar" style="height:' + Math.round(c.len / mx * H) + 'px"></div><span class="lab">' + esc(I.monthShort(m)) + '</span></div>';
      });
      h += '</div></div>';
    } else {
      h += '<div class="card empty-state" style="margin-top:14px"><div class="em">🌤️</div>' + esc(t('s.need_more')) + '</div>';
    }
    h += '<p class="small muted" style="margin-top:12px">' + esc(A.usingHistory ? t('s.basis_history', X.count) : t('s.basis_default')) + '</p>';
    h += '<h2 class="section-title">' + esc(t('s.symptoms')) + '</h2><div class="card">';
    if (X.symptoms.length) {
      var top = X.symptoms[0].n;
      h += '<div class="small muted">' + esc(t('s.symptoms_sub')) + '</div>';
      X.symptoms.forEach(function (s) {
        var def = I.SYMPTOMS.filter(function (x) { return x[0] === s.id; })[0];
        if (!def) return;
        h += '<div class="hbar"><div class="row"><span>' + def[1] + ' ' + esc(t('sym.' + s.id)) + '</span><b>' + esc(num(s.n)) + '</b></div><div class="track"><div class="fill" style="width:' + Math.round(s.n / top * 100) + '%"></div></div></div>';
      });
    } else h += '<div class="empty-state" style="padding:12px 0">' + esc(t('s.no_symptoms')) + '</div>';
    return h + '</div>';
  }

  function tipsHTML() {
    var ph = ST.phase, tone = { menstrual: 'rose', follicular: 'mint', fertile: 'mint', luteal: 'butter' }[ph] || 'lilac';
    var h = '<div class="page-head"><h1 class="page-title">' + esc(t('tips.title')) + '</h1></div>';
    h += '<section class="phase-card tone-' + tone + '"><div class="small" style="opacity:.8">' + esc(t('tips.now')) + '</div><h2>' + esc(t('phase.' + ph)) + '</h2><p>' + esc(t('phase.' + ph + '.d')) + '</p></section>';
    (I.TIPS[ph] || []).forEach(function (tp, i) {
      var tx = I.pick(tp);
      h += '<div class="tip-row tone-' + tp.tone + '"><span class="em" aria-hidden="true">' + tp.e + '</span><div><b>' + esc(tx[0]) + '</b><span>' + esc(tx[1]) + '</span></div></div>';
    });
    h += recommendedHTML(3, 'art.recommended');
    h += libraryHTML();
    return h;
  }

  function seg(items, current, act, key) {
    return '<div class="seg" role="group">' + items.map(function (it) {
      return '<button data-act="' + act + '" data-v="' + it[0] + '" aria-pressed="' + (String(current) === String(it[0])) + '">' + esc(it[1]) + '</button>';
    }).join('') + '</div>';
  }
  function stepper(label, key, v) {
    return '<div class="stepper-row"><label>' + esc(label) + '</label><div class="stepper">' +
      '<button data-act="step" data-k="' + key + '" data-d="-1" aria-label="−">' + icon('minus') + '</button><output>' + esc(t('days', v)) + '</output>' +
      '<button data-act="step" data-k="' + key + '" data-d="1" aria-label="+">' + icon('plus') + '</button></div></div>';
  }

  function cloudGroup() {
    var h = '<section class="group"><h3>' + esc(t('cl.title')) + '</h3>';
    if (!self.Sync || !Sync.configured()) return h + '<p class="hint">' + esc(t('cl.unconfigured')) + '</p></section>';
    var c = Sync.state();
    h += '<p class="hint">' + esc(t('cl.desc')) + '</p>';
    if (!c.connected) {
      return h + '<div class="stack"><button class="btn primary block" data-act="cloud-connect">' + esc(t('cl.connect')) + '</button></div></section>';
    }
    var status = c.busy ? t('cl.backing') : (c.pending ? t('cl.pending') : t('cl.synced'));
    h += '<div class="cloud-row"><span class="k">' + esc(t('cl.account')) + '</span><span class="v" dir="ltr">' + esc(c.email || '—') + '</span></div>' +
      '<div class="cloud-row"><span class="k">' + esc(c.lastBackup ? t('cl.last', whenStr(c.lastBackup)) : t('cl.never')) + '</span><span class="v">' + esc(status) + '</span></div>';
    h += '<div class="stack">';
    if (!c.authed) {
      h += '<p class="hint">' + esc(t('cl.signin_again')) + '</p><button class="btn primary block" data-act="cloud-signin">' + esc(t('cl.signin')) + '</button>';
    } else {
      h += '<button class="btn soft block" data-act="cloud-backup"' + (c.busy ? ' disabled' : '') + '>' + esc(t('cl.backup_now')) + '</button>' +
        '<button class="btn soft block" data-act="cloud-restore">' + esc(t('cl.restore')) + '</button>';
    }
    h += '<button class="btn block" data-act="cloud-disconnect" style="color:var(--ink2)">' + esc(t('cl.disconnect')) + '</button>';
    if (c.authed) h += '<button class="btn block" data-act="cloud-delete" style="color:var(--period-ink)">' + esc(t('cl.delete')) + '</button>';
    return h + '</div></section>';
  }

  function updateGroup() {
    var h = '<section class="group"><h3>' + esc(t('u.group')) + '</h3><div class="stack">';
    if (ui.upd) h += '<button class="btn primary block" data-act="update-now">' + esc(t('u.apply_to', ui.upd.version || VERSION)) + '</button>';
    else h += '<button class="btn soft block" data-act="update-check"' + (ui.updStatus === 'checking' ? ' disabled' : '') + '>' + esc(ui.updStatus === 'checking' ? t('u.checking') : t('u.check')) + '</button>';
    if (ui.installEvt) h += '<button class="btn soft block" data-act="install-app">' + esc(t('in.btn')) + '</button>';
    h += '</div>';
    if (ui.updStatus === 'latest') h += '<p class="hint">' + esc(t('u.latest')) + '</p>';
    else if (ui.updStatus === 'offline') h += '<p class="hint">' + esc(t('u.offline')) + '</p>';
    return h + '</section>';
  }

  function updateCardHTML() {
    var u = ui.upd;
    if (!u || ui.updHidden || !S.settings.onboarded) return '';
    var notes = u.notes && I.pick(u.notes) || [];
    return '<div class="update-card" role="alertdialog" aria-labelledby="updT"><div class="uc-top"><span class="uc-ic" aria-hidden="true">✨</span><div class="uc-txt"><b id="updT">' + esc(t('u.title')) + '</b>' +
      '<span>' + esc((u.version ? t('u.ver', u.version) + ' · ' : '') + t('u.safe')) + '</span></div></div>' +
      (notes.length ? '<ul>' + notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>' : '') +
      '<div class="uc-actions"><button class="btn primary" data-act="update-now">' + esc(t('u.btn')) + '</button><button class="btn soft" data-act="update-later">' + esc(t('u.later')) + '</button></div></div>';
  }
  function renderUpdateCard() { var r = $('#update-root'); if (r) r.innerHTML = updateCardHTML(); }

  function settingsHTML() {
    var s = S.settings, h = '';
    h += '<div class="page-head"><div class="left"><button class="icon-btn" data-act="settings-back" aria-label="' + esc(t('back')) + '">' + icon('chev', 'flip-back') + '</button><h1 class="page-title">' + esc(t('st.title')) + '</h1></div></div>';
    h += '<section class="group"><h3>' + esc(t('st.profile')) + '</h3><label class="lbl" for="nameField">' + esc(t('st.name')) + '</label><input class="field" id="nameField" type="text" maxlength="30" autocomplete="given-name" enterkeyhint="done" placeholder="' + esc(t('o.name_ph')) + '" value="' + esc(s.name) + '"></section>';
    h += '<section class="group"><h3>' + esc(t('st.calendar')) + '</h3>' + seg([['gregorian', t('cal.gregorian')], ['jalali', t('cal.jalali')]], s.calendar, 'set-cal') + '<p class="hint">' + esc(t('st.cal_hint')) + '</p></section>';
    h += '<section class="group"><h3>' + esc(t('st.language')) + '</h3>' + seg(I.LANGS.map(function (l) { return [l, t('lang.' + l)]; }), s.lang, 'set-lang') + '</section>';
    h += '<section class="group"><h3>' + esc(t('st.font')) + '</h3>' + seg([['vazir', t('st.font.vazir')], ['iransans', t('st.font.iransans')]], s.font, 'set-font') + '</section>';
    h += '<section class="group"><h3>' + esc(t('st.theme')) + '</h3>' + seg(THEMES.map(function (x) { return [x, t('st.theme.' + x)]; }), s.theme, 'set-theme') + '<p class="hint">' + esc(t('st.theme.hint')) + '</p></section>';
    h += '<section class="group"><h3>' + esc(t('st.week')) + '</h3>' + seg([[6, t('weekday.6')], [0, t('weekday.0')], [1, t('weekday.1')]], s.weekStart, 'set-week') + '</section>';
    h += '<section class="group"><h3>' + esc(t('st.defaults')) + '</h3><p class="hint">' + esc(t('st.defaults_hint')) + '</p>' +
      stepper(t('st.cycle_len'), 'cycleLen', s.cycleLen) + stepper(t('st.period_len'), 'periodLen', s.periodLen) + stepper(t('st.luteal'), 'lutealLen', s.lutealLen) +
      '<p class="hint">' + esc(t('st.luteal_hint')) + '</p></section>';
    h += lockGroup() + cloudGroup() + updateGroup();
    h += '<section class="group"><h3>' + esc(t('st.data')) + '</h3><p class="hint">' + esc(t('st.private')) + '</p><div class="stack">' +
      '<button class="btn soft block" data-act="export">' + esc(t('st.export')) + '</button>' +
      '<button class="btn soft block" data-act="import">' + esc(t('st.import')) + '</button>' +
      '<input type="file" id="importFile" accept="application/json,.json" hidden>' +
      '<button class="btn danger block" data-act="erase">' + esc(t('st.erase')) + '</button></div><p class="hint">' + esc(t('st.backup_hint')) + '</p></section>';
    h += '<section class="group"><h3>' + esc(t('st.install')) + '</h3><p class="hint">' + esc(t('st.install_d')) + '</p></section>';
    h += '<section class="group"><h3>' + esc(t('st.about')) + '</h3><p class="hint">' + esc(t('st.disclaimer')) + '</p></section>';
    h += '<div class="ver">' + esc(t('app.name')) + ' · ' + esc(t('st.version')) + ' ' + esc(num(VERSION)) + '</div>';
    return h;
  }

  /* ============ onboarding ============ */
  function onbHTML() {
    var o = ui.onb, s = S.settings, step = o.step, body = '', foot = '';
    var dots = '<div class="steps">' + [0, 1, 2].map(function (i) { return '<i class="' + (i === step ? 'on' : '') + '"></i>'; }).join('') + '</div>';
    if (step === 0) {
      body = '<img class="hero" src="icons/logo.svg" alt=""><h1>' + esc(t('o.welcome')) + '</h1><p class="lead">' + esc(t('o.welcome_d')) + '</p>' +
        '<div class="onb-form"><label class="lbl" for="nameField">' + esc(t('o.name_l')) + '</label>' +
        '<input class="field" id="nameField" type="text" maxlength="30" autocomplete="given-name" enterkeyhint="done" placeholder="' + esc(t('o.name_ph')) + '" value="' + esc(o.name || '') + '">' +
        '<p class="hint">' + esc(t('o.name_h')) + '</p>' +
        '<div class="lbl">' + esc(t('o.lang_l')) + '</div>' + seg(I.LANGS.map(function (l) { return [l, t('lang.' + l)]; }), s.lang, 'set-lang') +
        '<div class="lbl">' + esc(t('o.cal_l')) + '</div>' + seg([['gregorian', t('cal.gregorian')], ['jalali', t('cal.jalali')]], s.calendar, 'set-cal') + '</div>';
      foot = '<button class="btn primary block" data-act="onb-next">' + esc(t('o.start')) + '</button>' +
        (self.Sync && Sync.configured() ? '<button class="btn soft block" data-act="cloud-connect">' + esc(t('cl.new_phone')) + '</button>' : '');
    } else if (step === 1) {
      var c = o.cal;
      body = dots + '<h2>' + esc(t('o.last_t')) + '</h2><p class="lead" style="margin-top:6px">' + esc(t('o.last_d')) + '</p>' +
        '<div class="cal-card"><div class="cal-head"><button class="cal-nav" data-act="onb-prev" aria-label="' + esc(t('cal.prev')) + '">' + icon('chev', 'flip-back') + '</button><div class="cal-title">' + esc(I.fmt.monthYear(c.y, c.m)) + '</div><button class="cal-nav" data-act="onb-nextm" aria-label="' + esc(t('cal.next')) + '">' + icon('chev', 'flip') + '</button></div>' + monthGrid(c, 'pick', o.last) + '</div>';
      foot = '<button class="btn primary block" data-act="onb-next"' + (o.last ? '' : ' disabled style="opacity:.5"') + '>' + esc(t('o.next')) + '</button>' +
        '<button class="btn soft block" data-act="onb-skip">' + esc(t('o.skip')) + '</button><button class="btn block" data-act="onb-back" style="color:var(--ink2)">' + esc(t('back')) + '</button>';
    } else {
      body = dots + '<h2>' + esc(t('o.len_t')) + '</h2><p class="lead" style="margin-top:6px">' + esc(t('o.len_d')) + '</p>' +
        '<div class="group">' + stepper(t('st.cycle_len'), 'cycleLen', s.cycleLen) + stepper(t('st.period_len'), 'periodLen', s.periodLen) + '</div>';
      foot = '<button class="btn primary block" data-act="onb-finish">' + esc(t('o.finish')) + '</button><button class="btn block" data-act="onb-back" style="color:var(--ink2)">' + esc(t('back')) + '</button>';
    }
    return '<div class="onb"><div class="body">' + body + '</div><div class="foot">' + foot + '</div></div>';
  }

  /* ============ sheets ============ */
  function chip(kind, id, emoji, label, on) {
    return '<button class="chip" data-act="' + kind + '" data-id="' + id + '" aria-pressed="' + on + '"><span class="e" aria-hidden="true">' + emoji + '</span>' + esc(label) + '</button>';
  }

  function daySheet(n) {
    var iso = E.toISO(n), l = S.logs[iso] || {}, info = E.dayInfo(A, n), isP = E.inRanges(A.ranges, n), future = n > today;
    var h = '<h2>' + esc(I.fmt.weekdayLong(n)) + '</h2><div class="sub">' + esc(I.fmt.full(n)) + '</div>';
    var line = '';
    if (isP) line = '<span class="phase-line p"><i class="dot p"></i>' + esc(t('ph.period')) + '</span>';
    else if (info.predPeriod) line = '<span class="phase-line p"><i class="dot pred"></i>' + esc(t('d.info_pred')) + '</span>';
    else if (info.ovulation) line = '<span class="phase-line f"><i class="dot f"></i>' + esc(t('d.info_ov')) + '</span>';
    else if (info.fertile) line = '<span class="phase-line f"><i class="dot f"></i>' + esc(t('d.info_fertile')) + '</span>';
    else if (info.pms) line = '<span class="phase-line m"><i class="dot m"></i>' + esc(t('d.info_pms')) + '</span>';
    h += line;
    if (future) {
      return h + '<p class="sub" style="margin-top:14px">' + esc(t('cal.future')) + '</p><div class="actions"><button class="btn primary block" data-act="sheet-close">' + esc(t('close')) + '</button></div>';
    }
    h += '<div class="block"><button class="switch-row" data-act="toggle-period" role="switch" aria-checked="' + isP + '"><span><b>' + esc(t('d.period_day')) + '</b><span class="d">' + esc(t('d.period_hint')) + '</span></span><span class="switch" aria-hidden="true" aria-checked="' + isP + '"></span></button></div>';
    if (!isP) {
      h += '<div class="block" style="margin-top:10px"><button class="btn soft block" data-act="fill-period">' + esc(t('d.fill', A.P)) + '</button></div>';
    } else {
      h += '<div class="block"><h3>' + esc(t('d.flow')) + '</h3><div class="flow">';
      for (var f = 1; f <= 4; f++) {
        var dr = ''; for (var k = 0; k < f; k++) dr += drop();
        h += '<button data-act="flow" data-v="' + f + '" aria-pressed="' + (l.flow === f) + '"><span class="drops">' + dr + '</span>' + esc(t('flow.' + f)) + '</button>';
      }
      h += '</div></div>';
    }
    h += '<div class="block"><h3>' + esc(t('d.mood')) + '</h3><div class="chips">' + I.MOODS.map(function (m) { return chip('mood', m[0], m[1], t('mood.' + m[0]), (l.mood || []).indexOf(m[0]) >= 0); }).join('') + '</div></div>';
    h += '<div class="block"><h3>' + esc(t('d.symptoms')) + '</h3><div class="chips">' + I.SYMPTOMS.map(function (m) { return chip('sym', m[0], m[1], t('sym.' + m[0]), (l.sym || []).indexOf(m[0]) >= 0); }).join('') + '</div></div>';
    h += '<div class="block"><h3><label for="noteField">' + esc(t('d.note')) + '</label></h3><textarea class="note" id="noteField" data-n="' + n + '" placeholder="' + esc(t('d.note_ph')) + '">' + esc(l.note || '') + '</textarea></div>';
    h += '<div class="actions"><button class="btn primary block" data-act="sheet-close">' + esc(t('d.done')) + '</button></div>';
    return h;
  }

  function sheetContent() {
    var sh = ui.sheet;
    if (sh.type === 'day') return daySheet(sh.n);
    if (sh.type === 'tip') {
      var tp = I.TIPS[sh.phase][sh.i], tx = I.pick(tp);
      return '<div class="big-em" aria-hidden="true">' + tp.e + '</div><h2>' + esc(tx[0]) + '</h2><p class="body">' + esc(tx[1]) + '</p><div class="actions"><button class="btn primary block" data-act="sheet-close">' + esc(t('close')) + '</button></div>';
    }
    if (sh.type === 'article') return articleSheet(sh);
    if (sh.type === 'pain') return painSheet();
    if (sh.type === 'pick') {
      return '<h2>' + esc(t('o.last_t')) + '</h2><div class="sub">' + esc(t('o.last_d')) + '</div><div class="cal-card" style="margin-top:14px"><div class="cal-head"><button class="cal-nav" data-act="pick-prev" aria-label="' + esc(t('cal.prev')) + '">' + icon('chev', 'flip-back') + '</button><div class="cal-title">' + esc(I.fmt.monthYear(sh.c.y, sh.c.m)) + '</div><button class="cal-nav" data-act="pick-next" aria-label="' + esc(t('cal.next')) + '">' + icon('chev', 'flip') + '</button></div>' + monthGrid(sh.c, 'pick') + '</div>' +
        '<div class="actions"><button class="btn soft block" data-act="sheet-close">' + esc(t('st.cancel')) + '</button></div>';
    }
    if (sh.type === 'cloud-found') {
      return '<div class="big-em" aria-hidden="true">☁️</div><h2>' + esc(t('cl.found_t')) + '</h2><p class="body">' + esc(t('cl.found_d', whenStr(sh.when))) + '</p>' +
        (sh.hasLocal ? '<p class="body" style="margin-top:6px">' + esc(t('cl.found_both')) + '</p>' : '') +
        '<div class="actions"><button class="btn primary block" data-act="cloud-restore-yes">' + esc(t('cl.restore_yes')) + '</button><button class="btn soft block" data-act="cloud-keep">' + esc(t(sh.hasLocal ? 'cl.keep_local' : 'st.cancel')) + '</button></div>';
    }
    if (sh.type === 'cloud-disconnect') {
      return '<h2>' + esc(t('cl.disc_q')) + '</h2><p class="body">' + esc(t('cl.disc_d')) + '</p><div class="actions two"><button class="btn soft block" data-act="sheet-close">' + esc(t('st.cancel')) + '</button><button class="btn danger block" data-act="cloud-disconnect-yes">' + esc(t('cl.disc_yes')) + '</button></div>';
    }
    if (sh.type === 'cloud-delete') {
      return '<h2>' + esc(t('cl.del_q')) + '</h2><p class="body">' + esc(t('cl.del_d')) + '</p><div class="actions two"><button class="btn soft block" data-act="sheet-close">' + esc(t('st.cancel')) + '</button><button class="btn danger block" data-act="cloud-delete-yes">' + esc(t('cl.del_yes')) + '</button></div>';
    }
    if (sh.type === 'erase') {
      return '<h2>' + esc(t('st.erase_q')) + '</h2><p class="body">' + esc(t('st.erase_d')) + '</p><div class="actions two"><button class="btn soft block" data-act="sheet-close">' + esc(t('st.cancel')) + '</button><button class="btn danger block" data-act="erase-yes">' + esc(t('st.erase_yes')) + '</button></div>';
    }
    return '';
  }

  /* ============ rendering ============ */
  function renderView() {
    var vr = $('#view-root'), y = window.scrollY;
    if (!S.settings.onboarded) {
      vr.innerHTML = onbHTML();
      $('#tab-root').innerHTML = '';
      return;
    }
    var map = { home: homeHTML, calendar: calendarHTML, stats: statsHTML, tips: tipsHTML, settings: settingsHTML };
    vr.innerHTML = '<main class="view">' + map[ui.view]() + '</main>';
    window.scrollTo(0, y);
    renderTabs();
    if (ui.intro && ui.view === 'home') setTimeout(function () { ui.intro = false; }, 1800);
  }
  function renderTabs() {
    var items = [['home', 'cycle', 'nav.cycle'], ['calendar', 'calendar', 'nav.calendar'], ['stats', 'stats', 'nav.stats'], ['tips', 'tips', 'nav.tips']];
    $('#tab-root').innerHTML = '<nav class="tabbar" aria-label="' + esc(t('app.name')) + '">' + items.map(function (it) {
      return '<button class="tab" data-act="tab" data-v="' + it[0] + '"' + (ui.view === it[0] ? ' aria-current="page"' : '') + '><span class="ic">' + icon(it[1]) + '</span>' + esc(t(it[2])) + '</button>';
    }).join('') + '</nav>';
  }
  function renderSheet() {
    var root = $('#sheet-root'), docEl = document.documentElement;
    if (!ui.sheet) { root.innerHTML = ''; docEl.classList.remove('lock'); ui.sheetShown = false; return; }
    var old = root.querySelector('.sheet'), sc = old ? old.scrollTop : 0, first = !ui.sheetShown;
    root.innerHTML = '<div class="scrim' + (first ? '' : ' open') + '" data-act="sheet-close"></div><div class="sheet' + (first ? '' : ' open') + (ui.sheet.type === 'article' || ui.sheet.type === 'pain' ? ' tall' : '') + '" role="dialog" aria-modal="true" tabindex="-1"><div class="grab"></div>' + sheetContent() + '</div>';
    docEl.classList.add('lock');
    var sh = root.querySelector('.sheet');
    if (first) {
      ui.sheetShown = true;
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        var s2 = root.querySelector('.sheet'), sc2 = root.querySelector('.scrim');
        if (s2) { s2.classList.add('open'); try { s2.focus({ preventScroll: true }); } catch (e) { } }
        if (sc2) sc2.classList.add('open');
      }); });
    } else sh.scrollTop = ui.sheet.top ? 0 : sc;
    ui.sheet.top = false;
  }
  function openSheet(o) { ui.sheet = o; ui.sheetShown = false; renderSheet(); }
  function closeSheet() {
    var root = $('#sheet-root'), sh = root.querySelector('.sheet'), sc = root.querySelector('.scrim');
    if (sh) sh.classList.remove('open'); if (sc) sc.classList.remove('open');
    ui.sheet = null;
    setTimeout(function () { if (!ui.sheet) renderSheet(); }, 300);
  }
  function applyPhase() {
    document.body.setAttribute('data-phase', (S.settings.onboarded && ST && ST.kind !== 'none') ? ST.phase : '');
  }
  function render() {
    applyLang(); applyTheme(); compute(); applyPhase();
    renderView();
    if (ui.sheet) renderSheet();
  }
  function toast(key) {
    var r = $('#toast-root');
    r.innerHTML = '<div class="toast" role="status">' + esc(t(key)) + '</div>';
    clearTimeout(toast.tm); toast.tm = setTimeout(function () { r.innerHTML = ''; }, 2500);
  }

  /* ============ mutations ============ */
  function updLog(n, fn) {
    var iso = E.toISO(n), l = S.logs[iso] || {};
    fn(l);
    if (emptyLog(l)) delete S.logs[iso]; else S.logs[iso] = l;
    save();
  }
  function toggleIn(arr, id) {
    arr = arr || []; var i = arr.indexOf(id);
    if (i >= 0) arr.splice(i, 1); else arr.push(id);
    return arr;
  }
  function addPeriod(s, e) {
    var rs = E.getRanges(S), open = e >= today;
    if (open) e = today;
    rs.push({ s: s, e: e, open: open });
    E.setRanges(S, E.merge(rs)); save();
  }
  /* Forget everything saved on this phone, but keep how the app looks (language, font, theme, calendar). */
  function wipeLocal() {
    var keep = { lang: S.settings.lang, font: S.settings.font, theme: S.settings.theme, weekStart: S.settings.weekStart, calendar: S.settings.calendar };
    S = defaults(); Object.assign(S.settings, keep);
    try { localStorage.removeItem(SNAP_KEY); localStorage.removeItem(UNDO_KEY); } catch (e) { }
  }
  var A_ = {
    tab: function (el) { ui.view = el.dataset.v; ui.sheet = null; renderSheet(); renderView(); window.scrollTo(0, 0); },
    settings: function () { ui.prev = ui.view === 'settings' ? 'home' : ui.view; ui.view = 'settings'; renderView(); window.scrollTo(0, 0); },
    'settings-back': function () { ui.view = ui.prev || 'home'; renderView(); window.scrollTo(0, 0); },
    'cal-prev': function () { ui.cal = shiftMonth(ui.cal, -1); renderView(); },
    'cal-next': function () { ui.cal = shiftMonth(ui.cal, 1); renderView(); },
    'cal-today': function () { ui.cal = monthOf(today); renderView(); },
    day: function (el) { openSheet({ type: 'day', n: +el.dataset.n }); },
    tip: function (el) { openSheet({ type: 'tip', phase: el.dataset.phase, i: +el.dataset.i }); },
    article: function (el) { openSheet({ type: 'article', id: el.dataset.id, full: false }); },
    'article-full': function () {
      var sh = ui.sheet;
      if (!sh || sh.type !== 'article') return;
      sh.full = true; sh.st = 'loading'; sh.top = true;
      S.reads[sh.id] = today; save(); renderSheet();
      CT.get(sh.id).then(function (b) { if (ui.sheet === sh) { sh.st = 'ok'; sh.b = b; sh.top = true; renderSheet(); } },
        function () { if (ui.sheet === sh) { sh.st = 'fail'; renderSheet(); } });
    },
    'article-back': function () { var sh = ui.sheet; if (sh && sh.type === 'article') { sh.full = false; sh.top = true; renderSheet(); } },
    'article-save': function () {
      var sh = ui.sheet; if (!sh || sh.type !== 'article') return;
      var i = S.saved.indexOf(sh.id);
      if (i >= 0) S.saved.splice(i, 1); else S.saved.push(sh.id);
      save(); renderSheet();
    },
    pain: function () { openSheet({ type: 'pain' }); },
    'pain-sym': function (el) { var id = el.dataset.id; updLog(today, function (l) { l.sym = toggleIn(l.sym, id); }); render(); },
    'lib-cat': function (el) { ui.lib.cat = el.dataset.v; renderView(); },
    'lib-retry': function () { loadContent(true); },
    'set-cal': function (el) {
      S.settings.calendar = el.dataset.v; I.setCalendar(S.settings.calendar);
      if (ui.onb) S.settings.weekStart = el.dataset.v === 'jalali' ? 6 : 1;
      ui.cal = monthOf(today); if (ui.onb) ui.onb.cal = monthOf(today);
      save(); render();
    },
    'lock-toggle': function () {
      if (LK.enabled()) LK.disable().then(function () { toast('lock.off'); renderView(); }, function () { toast('lock.off_fail'); });
      else LK.enable().then(function () { toast('lock.on'); renderView(); }, function () { toast('lock.fail'); });
    },
    'lock-unlock': function () { tryUnlock(false); },
    'lock-help': function () { ui.lockHelp = true; renderLock(); },
    'lock-help-back': function () { ui.lockHelp = false; renderLock(); },
    'lock-reset-yes': function () {
      LK.forget();
      wipeLocal();
      if (self.Sync) { try { Sync.disconnect(); } catch (e) { } }
      save(true);
      ui.locked = false; ui.lockHelp = false; ui.view = 'home'; ui.sheet = null;
      ui.onb = { step: 0, cal: monthOf(today), last: null };
      document.documentElement.classList.remove('away');
      renderLock(); renderSheet(); render();
    },
    'sheet-close': function () { flushNote(); closeSheet(); render(); },
    'start-period': function () { addPeriod(today, today); render(); toast('toast.started'); },
    'end-period': function () {
      var rs = E.getRanges(S), last = rs[rs.length - 1];
      if (last) { last.open = false; last.e = Math.max(last.e, Math.min(today, last.s + 13)); E.setRanges(S, rs); save(); }
      render(); toast('toast.ended');
    },
    'open-pick': function () { openSheet({ type: 'pick', c: monthOf(today) }); },
    'pick-prev': function () { ui.sheet.c = shiftMonth(ui.sheet.c, -1); renderSheet(); },
    'pick-next': function () { ui.sheet.c = shiftMonth(ui.sheet.c, 1); renderSheet(); },
    'pick-day': function (el) {
      var n = +el.dataset.n;
      if (ui.onb) { ui.onb.last = n; renderView(); return; }
      addPeriod(n, n + S.settings.periodLen - 1);
      closeSheet(); render(); toast('toast.last_ok');
    },
    'toggle-period': function () {
      var n = ui.sheet.n, was = E.inRanges(A.ranges, n);
      var rs = E.togglePeriodDay(E.getRanges(S), n);
      if (!was && n === today) rs.forEach(function (r) { if (r.e === today && today >= r.s) r.open = true; });
      E.setRanges(S, rs);
      if (was) updLog(n, function (l) { delete l.flow; });
      save(); render();
    },
    'fill-period': function () {
      var n = ui.sheet.n, e = Math.min(n + A.P - 1, today);
      var rs = E.getRanges(S); rs.push({ s: n, e: e, open: e >= today });
      E.setRanges(S, E.merge(rs)); save(); render();
    },
    flow: function (el) { var v = +el.dataset.v, n = ui.sheet.n; updLog(n, function (l) { l.flow = l.flow === v ? 0 : v; if (!l.flow) delete l.flow; }); render(); },
    mood: function (el) { var id = el.dataset.id; updLog(ui.sheet.n, function (l) { l.mood = toggleIn(l.mood, id); }); render(); },
    sym: function (el) { var id = el.dataset.id; updLog(ui.sheet.n, function (l) { l.sym = toggleIn(l.sym, id); }); render(); },
    'set-lang': function (el) { S.settings.lang = el.dataset.v; save(); render(); },
    'set-font': function (el) { S.settings.font = el.dataset.v; save(); render(); },
    'set-theme': function (el) { S.settings.theme = el.dataset.v; save(); render(); },
    'set-week': function (el) { S.settings.weekStart = +el.dataset.v; save(); render(); },
    step: function (el) {
      var lim = { cycleLen: [20, 60], periodLen: [1, 12], lutealLen: [8, 18] }[el.dataset.k], k = el.dataset.k;
      S.settings[k] = Math.min(lim[1], Math.max(lim[0], S.settings[k] + (+el.dataset.d)));
      save(); render();
    },
    'dismiss-install': function () { S.settings.installDismissed = true; save(); renderView(); },
    export: function () { exportData(); },
    import: function () { var f = $('#importFile'); if (f) f.click(); },
    erase: function () { openSheet({ type: 'erase' }); },
    'erase-yes': function () {
      wipeLocal(); LK.forget(); save();
      ui.sheet = null; renderSheet(); ui.view = 'home'; ui.onb = { step: 0, cal: monthOf(today), last: null }; render();
    },
    /* app updates */
    'update-now': function () { if (ui.upd) { ui.updHidden = true; renderUpdateCard(); ui.upd.apply(); } },
    'update-later': function () { ui.updHidden = true; renderUpdateCard(); },
    'update-check': function () {
      ui.updStatus = 'checking'; renderView();
      Updater.check().then(function (r) { ui.updStatus = r === 'available' ? '' : r; if (r === 'available') ui.updHidden = false; renderView(); renderUpdateCard(); });
    },
    'install-app': function () {
      var ev = ui.installEvt; if (!ev) return;
      ev.prompt(); ui.installEvt = null; renderView();
    },
    /* cloud backup */
    'cloud-connect': function () { Sync.signIn(); },
    'cloud-signin': function () { Sync.signIn(); },
    'cloud-backup': function () {
      toast('cl.backing');
      Sync.backupNow().then(function () { toast('cl.ok'); }, function (e) { if (e && e.code === 'auth') render(); toast('cl.fail'); });
    },
    'cloud-restore': function () { cloudCheck(false); },
    'cloud-disconnect': function () { openSheet({ type: 'cloud-disconnect' }); },
    'cloud-disconnect-yes': function () { Sync.disconnect(); closeSheet(); render(); },
    'cloud-delete': function () { openSheet({ type: 'cloud-delete' }); },
    'cloud-delete-yes': function () { Sync.deleteCloud().then(function () { toast('cl.deleted'); render(); }, function () { toast('cl.fail'); }); closeSheet(); },
    'cloud-restore-yes': function () {
      var c = ui.sheet && ui.sheet.backup; if (!c) return;
      restoreFrom(c);
      closeSheet(); ui.onb = null; ui.view = 'home'; render(); toast('cl.restored');
    },
    'cloud-keep': function () {
      var had = ui.sheet && ui.sheet.hasLocal;
      closeSheet();
      // Only overwrite the cloud copy when this phone actually has data to keep.
      if (had) Sync.backupNow().then(function () { render(); toast('cl.ok'); }, function () { });
    },
    /* onboarding */
    'onb-next': function () { if (ui.onb.step === 1 && !ui.onb.last) return; ui.onb.step++; renderView(); window.scrollTo(0, 0); },
    'onb-back': function () { ui.onb.step = Math.max(0, ui.onb.step - 1); renderView(); window.scrollTo(0, 0); },
    'onb-skip': function () { ui.onb.last = null; ui.onb.step = 2; renderView(); },
    'onb-prev': function () { ui.onb.cal = shiftMonth(ui.onb.cal, -1); renderView(); },
    'onb-nextm': function () { ui.onb.cal = shiftMonth(ui.onb.cal, 1); renderView(); },
    'onb-finish': function () {
      var last = ui.onb.last;
      S.settings.onboarded = true; S.settings.name = cleanName(ui.onb.name || ''); save();
      if (last) { compute(); addPeriod(last, last + S.settings.periodLen - 1); }
      ui.onb = null; ui.intro = true;
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
      render();
    }
  };

  /* ---- cloud: restore + first connect ---- */
  function hasData() { return S.periods.length > 0 || Object.keys(S.logs).length > 0; }
  function restoreFrom(backup) {
    try { localStorage.setItem(UNDO_KEY, JSON.stringify({ at: Date.now(), data: S })); } catch (e) { }
    var next = sanitize(backup.data); next.settings.onboarded = true;
    S = next; save(true); Sync.markClean();
  }
  /* Look at what is in Drive and offer to restore. `auto` = just signed in (new phone or fresh connect). */
  function cloudCheck(auto) {
    Sync.peekCloud().then(function (c) {
      if (!c) {
        if (!auto) toast('cl.none');
        else if (hasData()) { Sync.touch(); Sync.backupNow().then(function () { render(); toast('cl.first_ok'); }, function () { }); }
        else toast('cl.connected_ok');
        return;
      }
      openSheet({ type: 'cloud-found', backup: c.backup, when: Date.parse(c.meta.modifiedTime) || Date.now(), hasLocal: hasData() });
    }, function (e) { toast(e && e.code === 'auth' ? 'cl.signin_fail' : 'cl.fail'); });
  }
  function afterGoogle(r) {
    if (!r) return;
    if (!r.ok) { toast('cl.signin_fail'); return; }
    ui.view = S.settings.onboarded ? 'settings' : ui.view; ui.prev = 'home';
    Sync.afterSignIn().then(function () { render(); cloudCheck(true); }, function () { toast('cl.signin_fail'); });
  }

  /* ---- notes (typed text is saved without re-rendering) ---- */
  var noteTimer = null, pendingNote = null;
  function flushNote() {
    if (!pendingNote) return;
    clearTimeout(noteTimer);
    var p = pendingNote; pendingNote = null;
    updLog(p.n, function (l) { l.note = p.v; if (!String(l.note).trim()) delete l.note; });
  }

  /* ---- backup ---- */
  function exportData() {
    var payload = JSON.stringify({ app: 'abrora', version: 1, exportedAt: new Date().toISOString(), data: S }, null, 2);
    var name = 'abrora-backup-' + E.toISO(today) + '.json', file = null;
    try { file = new File([payload], name, { type: 'application/json' }); } catch (e) { }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: name }).then(function () { toast('st.export_ok'); }).catch(function () { });
      return;
    }
    var url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
    toast('st.export_ok');
  }
  function importFile(file) {
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var j = JSON.parse(fr.result);
        if (!j || (j.app !== 'abrora' && j.app !== 'abrora-world') || !j.data) throw new Error('bad');
        var next = sanitize(j.data); next.settings.onboarded = true;
        S = next; save(); ui.view = 'settings'; render(); toast('st.import_ok');
      } catch (e) { toast('st.import_bad'); }
    };
    fr.onerror = function () { toast('st.import_bad'); };
    fr.readAsText(file);
  }

  /* ============ events ============ */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null;
    if (!el || el.disabled) return;
    var fn = A_[el.dataset.act];
    if (fn) fn(el, e);
  });
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el && el.classList && el.classList.contains('note')) {
      pendingNote = { n: +el.dataset.n, v: el.value };
      clearTimeout(noteTimer); noteTimer = setTimeout(flushNote, 500);
    }
    if (el && el.id === 'nameField') {
      if (ui.onb) ui.onb.name = el.value.slice(0, 30);
      else { S.settings.name = cleanName(el.value); save(true); clearTimeout(nameTimer); nameTimer = setTimeout(function () { save(); }, 800); }
    }
    if (el && el.id === 'artQ') {
      ui.lib.q = el.value;
      var box = $('#art-list'); if (box && CT.index()) box.innerHTML = artListHTML();
    }
  });
  var nameTimer = null;
  document.addEventListener('focusout', function (e) { if (e.target && e.target.classList && e.target.classList.contains('note')) flushNote(); });
  document.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'importFile' && e.target.files && e.target.files[0]) importFile(e.target.files[0]);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ui.sheet && !ui.locked) A_['sheet-close']();
    if (e.key === 'Enter' && e.target && (e.target.id === 'nameField' || e.target.id === 'artQ')) e.target.blur();
  });
  // Cover the app as soon as it goes to the background, and ask for the phone's lock again after a short break.
  document.addEventListener('visibilitychange', function () {
    var root = document.documentElement;
    if (document.hidden) {
      if (LK && LK.enabled() && !ui.locked) { awayAt = Date.now(); root.classList.add('away'); }
    } else {
      if (root.classList.contains('away')) {
        if (Date.now() - awayAt > LOCK_GRACE) { lockNow(); tryUnlock(true); } else root.classList.remove('away');
      }
      refreshContent();
    }
  });
  window.addEventListener('online', function () { if (!CT.index() || CT.failed()) loadContent(true); else refreshContent(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && E.todayN() !== today) { render(); } });
  window.addEventListener('pagehide', flushNote);

  /* ============ boot ============ */
  document.addEventListener('abrora:splash-end', function () { applyTheme(); if (ui.locked) tryUnlock(true); });
  function boot() {
    document.getElementById('app').innerHTML =
      '<div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div><div id="view-root"></div><div id="tab-root"></div><div id="sheet-root"></div><div id="update-root"></div><div id="toast-root"></div><div id="lock-root"></div>';
    if (LK && LK.enabled()) ui.locked = true;
    if (!S.settings.onboarded) ui.onb = { step: 0, cal: monthOf(today), last: null };
    ui.cal = monthOf(today);
    var back = self.Sync ? Sync.handleRedirect() : null;
    render();
    renderLock();
    if (LK) LK.supported().then(function (ok) { ui.lockOk = ok; if (ui.view === 'settings' && !ui.sheet && S.settings.onboarded) renderView(); });
    loadContent(false);
    if (self.Sync) {
      Sync.init({ getPayload: function () { return { app: 'abrora', version: 1, appVersion: VERSION, exportedAt: new Date().toISOString(), data: S }; } });
      Sync.on(function () { if (ui.view === 'settings' && !ui.sheet && S.settings.onboarded) renderView(); });
    }
    afterGoogle(back);
    Updater.init({
      onAvailable: function (u) { ui.upd = u; ui.updHidden = false; renderUpdateCard(); if (ui.view === 'settings') renderView(); },
      // Before switching versions: flush notes, keep a safety copy of the data, and push a cloud backup if we can.
      beforeApply: function () {
        flushNote(); save(true);
        try { localStorage.setItem(SNAP_KEY, JSON.stringify({ at: Date.now(), from: VERSION, data: S })); } catch (e) { }
        if (self.Sync && Sync.connected() && Sync.authed()) {
          return Promise.race([Sync.backupNow().catch(function () { }), new Promise(function (r) { setTimeout(r, 3000); })]);
        }
      }
    });
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); ui.installEvt = e; if (ui.view === 'settings') renderView(); });
    window.addEventListener('appinstalled', function () { ui.installEvt = null; });
    var fontsReady = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 1500); })]) : Promise.resolve();
    fontsReady.then(function () { if (self.hideSplash) self.hideSplash(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
