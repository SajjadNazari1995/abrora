// Checks js/calendar.js against the browser/ICU Persian calendar for every day 1300–1500 AP,
// plus round-trips and a few anchor dates.
const Cal = require('../../js/calendar.js');
const assert = require('assert');
const f = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC' });
let bad = 0, n = 0;
const start = Date.UTC(1921, 2, 1) / 86400000, end = Date.UTC(2122, 2, 1) / 86400000;
for (let d = start; d < end; d++) {
  const parts = f.formatToParts(new Date(d * 86400000)); const o = {};
  parts.forEach(p => o[p.type] = p.value);
  const j = Cal.fromN('jalali', d);
  const ey = parseInt(o.relatedYear || o.year, 10);
  if (j.y !== ey || j.m + 1 !== +o.month || j.d !== +o.day) { if (bad++ < 5) console.log('MISMATCH', d, j, o); }
  const back = Cal.toN('jalali', j.y, j.m, j.d);
  assert.strictEqual(back, d, 'roundtrip ' + d);
  n++;
}
console.log('days checked', n, 'mismatches', bad);
// anchors
const nowruz1405 = Cal.toN('jalali', 1405, 0, 1);
console.log('Nowruz 1405 =', new Date(nowruz1405 * 86400000).toISOString().slice(0, 10));
assert.strictEqual(Cal.fromN('gregorian', Date.UTC(2026, 10, 5) / 86400000).d, 5);
assert.strictEqual(Cal.daysIn('gregorian', 2024, 1), 29);
assert.strictEqual(Cal.daysIn('jalali', 1403, 11), 30); // 1403 is a leap year
assert.strictEqual(Cal.daysIn('jalali', 1404, 11), 29);
assert.strictEqual(Cal.daysIn('jalali', 1404, 0), 31);
assert.strictEqual(Cal.daysIn('jalali', 1404, 6), 30);
assert.deepStrictEqual(Cal.shift({ y: 1404, m: 0 }, -1), { y: 1403, m: 11 });
console.log('OK');
process.exit(bad ? 1 : 0);
