/* Abrora — reminders (phone app only).
   Why only the Android/iOS app: a web page cannot show a reminder at a set time when it is closed (iPhone needs a push server for that).
   The phone app can schedule them on the device itself, so no data leaves the phone.

   Privacy rule: the text on the lock screen must never say what it is about. Every message is a kind, generic nudge that
   anyone looking over your shoulder would read as "a friendly app", never as period/cycle/health. Keep it that way when editing TEXT. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Notify = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TITLE = { fa: 'ابرورا', en: 'Abrora', de: 'Abrora' };
  var TEXT = {
    heads: {   // a day or two before
      fa: ['با خودت مهربون باش؛ یه سر به ابرورا بزن 🌸', 'امروز یه کم آروم‌تر برو؛ ابرورا چند حرف مهربون برات داره 💜', 'یه نوشیدنی گرم و یه نگاه به ابرورا ☕'],
      en: ['Be kind to yourself today — pop into Abrora 🌸', 'Take it a little easier today; Abrora has a kind note for you 💜', 'A warm drink and a quick look at Abrora ☕'],
      de: ['Sei heute lieb zu dir – schau kurz in Abrora vorbei 🌸', 'Nimm es heute etwas ruhiger; Abrora hat ein paar liebe Worte für dich 💜', 'Ein warmes Getränk und ein kurzer Blick in Abrora ☕']
    },
    day: {     // the expected day itself
      fa: ['صبح بخیر! امروز یه نگاهی به ابرورا بنداز 🌷', 'امروز مراقب خودت باش؛ ابرورا کنارته 🤍'],
      en: ['Good morning! Take a moment for Abrora today 🌷', 'Look after yourself today; Abrora is with you 🤍'],
      de: ['Guten Morgen! Nimm dir heute kurz Zeit für Abrora 🌷', 'Pass heute auf dich auf; Abrora ist bei dir 🤍']
    }
  };
  var CYCLES_AHEAD = 3;
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function pick(list, seed) { return list[hash(seed) % list.length]; }

  function cleanTime(t) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(t || '') ? t : '09:00'; }
  function cleanSettings(n) {
    n = n || {};
    var pre = Math.round(+n.pre); if (!(pre >= 0 && pre <= 3)) pre = 2;
    return { on: n.on === true, time: cleanTime(n.time), pre: pre };
  }

  /* plan: what to schedule, from the app's own predictions.
     input: { nextStart: ISO date of the next expected start, cycleLen, today: ISO date, now: ms, lang, settings }
     returns [{ id, at (ms), title, body }] — only times in the future. */
  function plan(inp) {
    var st = cleanSettings(inp.settings), out = [];
    if (!st.on || !inp.nextStart || !(inp.cycleLen >= 15 && inp.cycleLen <= 90)) return out;
    var lang = TITLE[inp.lang] ? inp.lang : 'en', hm = st.time.split(':'), now = inp.now || Date.now();
    var base = new Date(inp.nextStart + 'T00:00:00');           // local midnight
    if (isNaN(base.getTime())) return out;
    for (var k = 0; k < CYCLES_AHEAD; k++) {
      var start = new Date(base.getFullYear(), base.getMonth(), base.getDate() + k * inp.cycleLen);
      [[st.pre, 'heads'], [0, 'day']].forEach(function (x) {
        if (x[1] === 'heads' && x[0] === 0) return;               // "0 days before" is the same as the day itself
        var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() - x[0], +hm[0], +hm[1], 0, 0);
        if (d.getTime() <= now + 60000) return;
        var seed = lang + d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate() + x[1];
        out.push({ id: 7000 + k * 10 + (x[1] === 'heads' ? 1 : 2), at: d.getTime(), title: TITLE[lang], body: pick(TEXT[x[1]][lang], seed) });
      });
    }
    return out;
  }

  /* ---- the phone app (Capacitor) ---- */
  var proxy = null;
  function plugin() {
    var C = typeof self !== 'undefined' && self.Capacitor;
    if (!C) return null;
    if (C.Plugins && C.Plugins.LocalNotifications) return C.Plugins.LocalNotifications;
    // inside the phone app the plugin is reached by name (there is no bundler in this app)
    if (!proxy && C.isNativePlatform && C.isNativePlatform() && C.registerPlugin) proxy = C.registerPlugin('LocalNotifications');
    return proxy;
  }
  function available() { return !!plugin(); }
  function request() {
    var p = plugin(); if (!p) return Promise.resolve(false);
    return p.checkPermissions().then(function (r) {
      if (r.display === 'granted') return true;
      return p.requestPermissions().then(function (q) { return q.display === 'granted'; });
    }).catch(function () { return false; });
  }
  /* Replace everything we scheduled before with the new plan (only our own ids, 7000–7999). */
  function apply(list) {
    var p = plugin(); if (!p) return Promise.resolve(false);
    return p.getPending().then(function (r) {
      var mine = (r.notifications || []).filter(function (n) { return n.id >= 7000 && n.id < 8000; });
      return mine.length ? p.cancel({ notifications: mine.map(function (n) { return { id: n.id }; }) }) : null;
    }).then(function () {
      if (!list.length) return true;
      return p.schedule({ notifications: list.map(function (n) {
        return { id: n.id, title: n.title, body: n.body, schedule: { at: new Date(n.at), allowWhileIdle: true } };
      }) }).then(function () { return true; });
    }).catch(function () { return false; });
  }
  function clear() { return apply([]); }

  return { plan: plan, available: available, request: request, apply: apply, clear: clear, cleanSettings: cleanSettings, TEXT: TEXT, TITLE: TITLE };
});
