/* Tiny QR Code encoder (byte mode, error correction M, versions 1-3 = up to 42 bytes). No dependencies.
   Enough for pairing links like "abrora:pair:ABCD2345". QR.svg(text) returns an inline SVG string. */
(function (root) {
  'use strict';
  var CAP = [0, 14, 26, 42], DATA = [0, 16, 28, 44], EC = [0, 10, 16, 26], ALIGN = [0, 0, 18, 22];
  var EXP = [], LOG = [];
  (function () { var x = 1; for (var i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
  function mul(a, b) { return a && b ? EXP[LOG[a] + LOG[b]] : 0; }
  function rs(data, n) {
    var g = [1];
    for (var i = 0; i < n; i++) { var ng = new Array(g.length + 1).fill(0); for (var j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= mul(g[j], EXP[i]); } g = ng; }
    var r = new Array(n).fill(0);
    data.forEach(function (d) { var f = d ^ r[0]; r.shift(); r.push(0); for (var k = 0; k < n; k++) r[k] ^= mul(g[k + 1], f); });
    return r;
  }
  function utf8(s) { var o = [], e = unescape(encodeURIComponent(s)); for (var i = 0; i < e.length; i++) o.push(e.charCodeAt(i)); return o; }

  function build(text) {
    var bytes = utf8(text), v = 1;
    while (v <= 3 && bytes.length > CAP[v]) v++;
    if (v > 3) throw new Error('QR text too long');
    var bits = [];
    function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >> i) & 1); }
    put(4, 4); put(bytes.length, 8); bytes.forEach(function (b) { put(b, 8); });
    var total = DATA[v] * 8;
    for (var t = 0; t < 4 && bits.length < total; t++) bits.push(0);
    while (bits.length % 8) bits.push(0);
    for (var pad = 0; bits.length < total; pad++) put(pad % 2 ? 0x11 : 0xEC, 8);
    var cw = []; for (var i = 0; i < bits.length; i += 8) { var b = 0; for (var k = 0; k < 8; k++) b = (b << 1) | bits[i + k]; cw.push(b); }
    cw = cw.concat(rs(cw, EC[v]));
    var stream = []; cw.forEach(function (c) { for (var k = 7; k >= 0; k--) stream.push((c >> k) & 1); });
    if (v > 1) for (i = 0; i < 7; i++) stream.push(0);

    var n = 17 + 4 * v, M = [], F = [];
    for (i = 0; i < n; i++) { M.push(new Array(n).fill(0)); F.push(new Array(n).fill(false)); }
    function set(r, c, val) { M[r][c] = val ? 1 : 0; F[r][c] = true; }
    function finder(r0, c0) {
      for (var r = -1; r <= 7; r++) for (var c = -1; c <= 7; c++) {
        var rr = r0 + r, cc = c0 + c; if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
        var on = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6)) || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        set(rr, cc, on);
      }
    }
    finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
    for (i = 8; i < n - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    if (v > 1) { var a = ALIGN[v]; for (var r = -2; r <= 2; r++) for (var c = -2; c <= 2; c++) set(a + r, a + c, Math.max(Math.abs(r), Math.abs(c)) !== 1); }
    set(n - 8, 8, 1);
    for (i = 0; i < 9; i++) { if (!F[8][i]) { M[8][i] = 0; F[8][i] = true; } if (!F[i][8]) { M[i][8] = 0; F[i][8] = true; } }
    for (i = 0; i < 8; i++) { if (!F[8][n - 1 - i]) { M[8][n - 1 - i] = 0; F[8][n - 1 - i] = true; } if (!F[n - 1 - i][8]) { M[n - 1 - i][8] = 0; F[n - 1 - i][8] = true; } }
    // data placement
    var idx = 0, up = true;
    for (var col = n - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (var j = 0; j < n; j++) {
        var row = up ? n - 1 - j : j;
        for (var d = 0; d < 2; d++) { var cc2 = col - d; if (!F[row][cc2]) { M[row][cc2] = stream[idx++] || 0; } }
      }
      up = !up;
    }
    var MASKS = [function (r, c) { return (r + c) % 2 === 0; }, function (r) { return r % 2 === 0; }, function (r, c) { return c % 3 === 0; }, function (r, c) { return (r + c) % 3 === 0; },
      function (r, c) { return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; }, function (r, c) { return (r * c) % 2 + (r * c) % 3 === 0; },
      function (r, c) { return ((r * c) % 2 + (r * c) % 3) % 2 === 0; }, function (r, c) { return ((r + c) % 2 + (r * c) % 3) % 2 === 0; }];
    function withMask(m) {
      var Q = M.map(function (row) { return row.slice(); });
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (!F[r][c] && MASKS[m](r, c)) Q[r][c] ^= 1;
      // format info: EC level M = 00
      var data = (0 << 3) | m, rem = data; for (var q = 0; q < 10; q++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var fmt = ((data << 10) | (rem & 0x3ff)) ^ 0x5412;
      function bit(k) { return (fmt >> k) & 1; }
      for (var k = 0; k <= 5; k++) Q[k][8] = bit(k);
      Q[7][8] = bit(6); Q[8][8] = bit(7); Q[8][7] = bit(8);
      for (k = 9; k < 15; k++) Q[8][14 - k] = bit(k);
      for (k = 0; k < 8; k++) Q[8][n - 1 - k] = bit(k);
      for (k = 8; k < 15; k++) Q[n - 15 + k][8] = bit(k);
      Q[n - 8][8] = 1;
      return Q;
    }
    function penalty(Q) {
      var p = 0, r, c, run, dark = 0;
      for (r = 0; r < n; r++) { run = 1; for (c = 1; c < n; c++) { if (Q[r][c] === Q[r][c - 1]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
      for (c = 0; c < n; c++) { run = 1; for (r = 1; r < n; r++) { if (Q[r][c] === Q[r - 1][c]) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; } }
      for (r = 0; r < n - 1; r++) for (c = 0; c < n - 1; c++) { var s = Q[r][c] + Q[r][c + 1] + Q[r + 1][c] + Q[r + 1][c + 1]; if (s === 0 || s === 4) p += 3; }
      for (r = 0; r < n; r++) for (c = 0; c < n; c++) dark += Q[r][c];
      p += Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
      return p;
    }
    var best = null, bp = 1e9;
    for (var m = 0; m < 8; m++) { var Q = withMask(m), pp = penalty(Q); if (pp < bp) { bp = pp; best = Q; } }
    return best;
  }
  function svg(text, opt) {
    opt = opt || {};
    var Q = build(text), n = Q.length, q = 4, d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (Q[r][c]) d += 'M' + (c + q) + ' ' + (r + q) + 'h1v1h-1z';
    var size = n + q * 2;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" shape-rendering="crispEdges" role="img" aria-label="' + (opt.label || 'QR code') + '"><rect width="' + size + '" height="' + size + '" fill="#fff"/><path d="' + d + '" fill="#111"/></svg>';
  }
  root.QR = { matrix: build, svg: svg };
})(typeof self !== 'undefined' ? self : this);
