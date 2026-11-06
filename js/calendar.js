/* Abrora — calendar helper (Gregorian + Persian/Jalali).
   All data inside the app stays on Gregorian "day numbers" (days since 1970-01-01, UTC).
   This file only converts a day number to / from the date the person sees on screen,
   so switching the calendar never changes or loses anything that was logged. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Cal = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MS = 86400000;
  var dv = function (a, b) { return Math.floor(a / b); };

  /* Gregorian <-> Jalali (33-year cycle rule, matches the official calendar for 1178–1633 AP). m is 1-based here. */
  function g2j(gy, gm, gd) {
    var gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var gy2 = gm > 2 ? gy + 1 : gy;
    var days = 355666 + 365 * gy + dv(gy2 + 3, 4) - dv(gy2 + 99, 100) + dv(gy2 + 399, 400) + gd + gdm[gm - 1];
    var jy = -1595 + 33 * dv(days, 12053);
    days %= 12053;
    jy += 4 * dv(days, 1461);
    days %= 1461;
    if (days > 365) { jy += dv(days - 1, 365); days = (days - 1) % 365; }
    var jm = days < 186 ? 1 + dv(days, 31) : 7 + dv(days - 186, 30);
    var jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
    return [jy, jm, jd];
  }
  function j2g(jy, jm, jd) {
    jy += 1595;
    var days = -355668 + 365 * jy + dv(jy, 33) * 8 + dv((jy % 33) + 3, 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
    var gy = 400 * dv(days, 146097);
    days %= 146097;
    if (days > 36524) {
      days--; gy += 100 * dv(days, 36524); days %= 36524;
      if (days >= 365) days++;
    }
    gy += 4 * dv(days, 1461);
    days %= 1461;
    if (days > 365) { gy += dv(days - 1, 365); days = (days - 1) % 365; }
    var gd = days + 1;
    var leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
    var sal = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var gm = 0;
    while (gm < 13 && gd > sal[gm]) { gd -= sal[gm]; gm++; }
    return [gy, gm, gd];
  }

  function dayN(gy, gm, gd) { return Math.round(Date.UTC(gy, gm - 1, gd) / MS); }

  /* Day number -> { y, m (0-based), d, wd (0 = Sunday) } in the chosen calendar. */
  function fromN(cal, n) {
    var dt = new Date(n * MS), gy = dt.getUTCFullYear(), gm = dt.getUTCMonth(), gd = dt.getUTCDate(), wd = dt.getUTCDay();
    if (cal === 'jalali') { var j = g2j(gy, gm + 1, gd); return { y: j[0], m: j[1] - 1, d: j[2], wd: wd }; }
    return { y: gy, m: gm, d: gd, wd: wd };
  }
  /* Calendar date -> day number. m is 0-based. */
  function toN(cal, y, m, d) {
    if (cal === 'jalali') { var g = j2g(y, m + 1, d); return dayN(g[0], g[1], g[2]); }
    return dayN(y, m + 1, d);
  }
  function firstOf(cal, y, m) { return toN(cal, y, m, 1); }
  function nextMonth(y, m) { return m === 11 ? { y: y + 1, m: 0 } : { y: y, m: m + 1 }; }
  function daysIn(cal, y, m) {
    var nx = nextMonth(y, m);
    return firstOf(cal, nx.y, nx.m) - firstOf(cal, y, m);
  }
  function ym(cal, n) { var p = fromN(cal, n); return { y: p.y, m: p.m }; }
  function shift(c, d) {
    var m = c.m + d, y = c.y;
    while (m < 0) { m += 12; y--; }
    while (m > 11) { m -= 12; y++; }
    return { y: y, m: m };
  }

  return { fromN: fromN, toN: toN, firstOf: firstOf, daysIn: daysIn, ym: ym, shift: shift, g2j: g2j, j2g: j2g };
});
