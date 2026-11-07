const N = require('../../js/notify.js'); let bad = 0;
const ok = (n, c) => { if (!c) { bad++; console.log('FAIL', n); } else console.log('PASS', n); };
const now = new Date('2026-11-06T12:00:00').getTime();
const p = N.plan({ nextStart: '2026-11-20', cycleLen: 28, now, lang: 'fa', settings: { on: true, time: '09:30', pre: 2 } });
ok('2 per cycle x 3 cycles', p.length === 6);
ok('heads-up is 2 days before at 09:30', new Date(p[0].at).getDate() === 18 && new Date(p[0].at).getHours() === 9 && new Date(p[0].at).getMinutes() === 30);
ok('day-of is the 20th', new Date(p[1].at).getDate() === 20);
ok('cycles 28 days apart', Math.round((p[3].at - p[1].at) / 864e5) === 28);
ok('unique ids', new Set(p.map(x => x.id)).size === p.length);
ok('off -> nothing', N.plan({ nextStart: '2026-11-20', cycleLen: 28, now, lang: 'fa', settings: { on: false } }).length === 0);
ok('past times skipped', N.plan({ nextStart: '2026-11-06', cycleLen: 28, now, lang: 'en', settings: { on: true, pre: 2 } }).every(x => x.at > now));
ok('pre=0 gives only day-of', N.plan({ nextStart: '2026-11-20', cycleLen: 28, now, lang: 'en', settings: { on: true, pre: 0 } }).length === 3);
ok('bad cycle length -> nothing', N.plan({ nextStart: '2026-11-20', cycleLen: 5, now, lang: 'en', settings: { on: true } }).length === 0);
ok('bad settings sanitized', JSON.stringify(N.cleanSettings({ on: 'yes', time: '99:99', pre: 9 })) === '{"on":false,"time":"09:00","pre":2}');
// privacy: no message may name the topic, in any language
const words = /period|cycle|menstr|pms|fertil|ovul|پریود|قاعدگی|چرخه|periode|zyklus|regel|eisprung/i;
const all = [].concat(...['heads', 'day'].map(k => [].concat(...Object.values(N.TEXT[k])))).concat(Object.values(N.TITLE));
ok('no lock-screen text names the topic (' + all.length + ' texts)', all.every(t => !words.test(t)));
console.log(bad ? bad + ' failed' : 'OK'); process.exit(bad ? 1 : 0);
