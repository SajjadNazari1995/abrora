/* Abrora — cycle engine (pure functions, no DOM).
   Days are handled as integer "day numbers" (days since 1970-01-01, UTC),
   so there are no time-zone or daylight-saving surprises. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MS = 86400000;
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  function toN(iso) {
    var p = iso.split('-');
    return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / MS);
  }
  function toISO(n) {
    var d = new Date(n * MS);
    return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  }
  function todayN() {
    var d = new Date();
    return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS);
  }
  function parts(n) {
    var d = new Date(n * MS);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay() };
  }
  function fromYMD(y, m, d) { return Math.round(Date.UTC(y, m, d) / MS); }
  function daysInMonth(y, m) { return new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); }

  var avg = function (a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; };

  var DEFAULTS = { cycleLen: 28, periodLen: 5, lutealLen: 14 };

  /* ---------- period ranges ---------- */
  function getRanges(st) {
    return (st.periods || []).map(function (r) {
      return { s: toN(r.s), e: toN(r.e || r.s), open: !!r.open };
    }).sort(function (a, b) { return a.s - b.s; });
  }
  function setRanges(st, rs) {
    st.periods = rs.map(function (r) {
      return { s: toISO(r.s), e: toISO(r.e), open: !!r.open };
    });
  }
  function merge(rs) {
    rs = rs.slice().sort(function (a, b) { return a.s - b.s; });
    var out = [];
    rs.forEach(function (r) {
      var last = out[out.length - 1];
      if (last && r.s <= last.e + 1) {
        last.e = Math.max(last.e, r.e);
        last.open = last.open || r.open;
      } else out.push({ s: r.s, e: r.e, open: r.open });
    });
    return out;
  }

  /* Keep ongoing periods honest: an open period always ends "today" at the latest,
     and is closed automatically after 12 days. */
  function normalize(st, today) {
    var P = (st.settings && st.settings.periodLen) || DEFAULTS.periodLen;
    var rs = getRanges(st).map(function (r) {
      if (r.open) {
        if (today > r.s + 11) { r.e = Math.max(r.e, r.s + P - 1); r.open = false; }
        else { r.e = Math.max(r.e, Math.min(today, r.s + 11)); }
      }
      return r;
    });
    setRanges(st, merge(rs));
  }

  function togglePeriodDay(rs, n) {
    var out = [], hit = false;
    rs.forEach(function (r) {
      if (n >= r.s && n <= r.e) {
        hit = true;
        if (r.s === r.e) return;
        if (n === r.s) out.push({ s: r.s + 1, e: r.e, open: r.open });
        else if (n === r.e) out.push({ s: r.s, e: r.e - 1, open: false });
        else {
          out.push({ s: r.s, e: n - 1, open: false });
          out.push({ s: n + 1, e: r.e, open: r.open });
        }
      } else out.push({ s: r.s, e: r.e, open: r.open });
    });
    if (!hit) {
      var ext = false;
      for (var i = 0; i < out.length; i++) {
        if (n === out[i].e + 1) { out[i].e = n; ext = true; break; }
        if (n === out[i].s - 1) { out[i].s = n; ext = true; break; }
      }
      if (!ext) out.push({ s: n, e: n, open: false });
    }
    return merge(out);
  }

  function inRanges(rs, n) {
    for (var i = 0; i < rs.length; i++) if (n >= rs[i].s && n <= rs[i].e) return true;
    return false;
  }

  /* ---------- analysis & prediction ---------- */
  function analyze(st, today) {
    var set = st.settings || {};
    var L0 = set.cycleLen || DEFAULTS.cycleLen;
    var P0 = set.periodLen || DEFAULTS.periodLen;
    var lut = set.lutealLen || DEFAULTS.lutealLen;
    var rs = getRanges(st);

    var cycles = [];
    for (var i = 0; i < rs.length - 1; i++) {
      cycles.push({ start: rs[i].s, len: rs[i + 1].s - rs[i].s, period: rs[i].e - rs[i].s + 1 });
    }
    var valid = cycles.filter(function (c) { return c.len >= 15 && c.len <= 60; });
    var recent = valid.slice(-6);
    var L = recent.length >= 2 ? Math.round(avg(recent.map(function (c) { return c.len; }))) : L0;

    var closed = rs.filter(function (r) { return !r.open; })
      .map(function (r) { return r.e - r.s + 1; })
      .filter(function (x) { return x >= 1 && x <= 14; }).slice(-6);
    var P = closed.length >= 2 ? Math.round(avg(closed)) : P0;

    var a = {
      empty: rs.length === 0, ranges: rs, cycles: cycles, validCount: recent.length,
      L: L, P: P, lut: lut, ov: Math.max(8, L - lut), today: today,
      usingHistory: recent.length >= 2
    };
    if (!rs.length) return a;

    var last = rs[rs.length - 1];
    a.last = last;
    a.lastStart = last.s;
    var next1 = last.s + L;
    a.late = 0;
    if (today > next1 && today > last.e) { a.late = today - next1; next1 = today; }
    a.cs = [last.s, next1, next1 + L, next1 + 2 * L, next1 + 3 * L];
    a.nextStart = next1;
    return a;
  }

  /* Information about one day. */
  function dayInfo(a, n) {
    var info = { period: false, predPeriod: false, fertile: false, ovulation: false, pms: false, day: 0 };
    if (inRanges(a.ranges, n)) { info.period = true; }
    if (a.empty || n < a.lastStart) return info;
    var cs = a.cs, idx = -1;
    for (var i = 0; i < cs.length - 1; i++) if (n >= cs[i] && n < cs[i + 1]) { idx = i; break; }
    if (idx < 0) return info;
    var day = n - cs[idx] + 1;
    info.day = day; info.cycleIndex = idx;
    if (idx >= 1 && day <= a.P) info.predPeriod = true;
    var isP = info.period || info.predPeriod;
    if (!isP) {
      if (day >= a.ov - 5 && day <= a.ov + 1) info.fertile = true;
      if (day === a.ov) info.ovulation = true;
      if (day >= a.L - 4 && day <= a.L) info.pms = true;
    }
    return info;
  }

  /* What is going on today? */
  function status(a, today) {
    var s = { kind: 'none', phase: 'follicular' };
    if (a.empty) return s;
    var info = dayInfo(a, today);
    s.dayInCycle = today - a.lastStart + 1;
    s.late = a.late;
    s.daysToPeriod = a.nextStart - today;
    s.nextStart = a.nextStart;
    // next ovulation date
    var ov0 = a.lastStart + a.ov - 1;
    s.ovulationDate = ov0 >= today ? ov0 : a.cs[1] + a.ov - 1;
    s.daysToOvulation = s.ovulationDate - today;
    if (info.period) {
      s.kind = 'period'; s.phase = 'menstrual';
      s.periodDay = today - a.last.s + 1;
      s.open = a.last.open;
    } else if (info.ovulation) { s.kind = 'ovulation'; s.phase = 'fertile'; }
    else if (info.fertile) { s.kind = 'fertile'; s.phase = 'fertile'; }
    else if (a.late > 0) { s.kind = 'late'; s.phase = 'luteal'; }
    else if (info.pms) { s.kind = 'pms'; s.phase = 'luteal'; }
    else if (info.day > a.ov + 1) { s.kind = 'normal'; s.phase = 'luteal'; }
    else { s.kind = 'normal'; s.phase = 'follicular'; }
    return s;
  }

  /* Segments of the ring (1-based day numbers inside the cycle). */
  function ringSegments(a, today) {
    var L = a.L;
    var Pcur = a.P;
    if (!a.empty && inRanges(a.ranges, today) && a.last) Pcur = Math.max(a.P, a.last.e - a.last.s + 1);
    Pcur = Math.min(Pcur, L - 6);
    var f1 = Math.max(a.ov - 5, Pcur + 1), f2 = Math.min(a.ov + 1, L);
    var p1 = Math.max(L - 4, f2 + 1);
    return {
      L: L,
      period: [1, Pcur],
      fertile: f1 <= f2 ? [f1, f2] : null,
      pms: p1 <= L ? [p1, L] : null,
      ov: a.ov
    };
  }

  /* Insights */
  function insights(st, a) {
    var vals = a.cycles.filter(function (c) { return c.len >= 15 && c.len <= 60; }).slice(-6);
    var lens = vals.map(function (c) { return c.len; });
    var res = { cycles: a.cycles.slice(-8), count: lens.length, avgCycle: a.L, avgPeriod: a.P };
    if (lens.length) {
      res.min = Math.min.apply(null, lens); res.max = Math.max.apply(null, lens);
      res.regular = (res.max - res.min) <= 7;
    }
    var counts = {}, moods = {};
    var cutoff = a.today - 120;
    var logs = st.logs || {};
    Object.keys(logs).forEach(function (k) {
      if (toN(k) < cutoff) return;
      (logs[k].sym || []).forEach(function (s) { counts[s] = (counts[s] || 0) + 1; });
      (logs[k].mood || []).forEach(function (s) { moods[s] = (moods[s] || 0) + 1; });
    });
    var rank = function (o) {
      return Object.keys(o).map(function (k) { return { id: k, n: o[k] }; })
        .sort(function (x, y) { return y.n - x.n; }).slice(0, 5);
    };
    res.symptoms = rank(counts); res.moods = rank(moods);
    return res;
  }

  return {
    toN: toN, toISO: toISO, todayN: todayN, parts: parts, fromYMD: fromYMD, daysInMonth: daysInMonth,
    getRanges: getRanges, setRanges: setRanges, normalize: normalize, togglePeriodDay: togglePeriodDay,
    inRanges: inRanges, analyze: analyze, dayInfo: dayInfo, status: status, ringSegments: ringSegments,
    insights: insights, DEFAULTS: DEFAULTS, merge: merge
  };
});
