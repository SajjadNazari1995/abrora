/* Abra Core API client. Talks to the independent Core API (see API-v1.md). Never sends health data:
   only account, consent, device and release/legal calls. Everything works offline; failures are reported, never thrown at the UI. */
(function (root) {
  'use strict';
  var SKEY = 'session';
  var session = null, account = null, listeners = [];
  function cfg() { return root.ABRORA_CONFIG || {}; }
  function base() { var b = cfg().coreApi || ''; return b && b.replace(/\/+$/, ''); }
  function configured() { return !!base(); }
  function platform() { var u = navigator.userAgent || ''; return /iphone|ipad|ipod/i.test(u) ? 'ios' : /android/i.test(u) ? 'android' : 'web'; }
  function device() { return { label: (platform() === 'web' ? 'Web' : platform() === 'ios' ? 'iPhone' : 'Android').slice(0, 60), platform: platform() }; }
  function emit() { listeners.forEach(function (f) { try { f(); } catch (e) { } }); }

  function request(method, path, body, opt) {
    opt = opt || {};
    if (!configured()) return Promise.reject({ code: 'not_configured', status: 0, message: 'The account server is not set up yet.' });
    var h = { 'Accept': 'application/json' };
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (opt.auth !== false && session && session.token) h['Authorization'] = 'Bearer ' + session.token;
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, to = setTimeout(function () { if (ctl) ctl.abort(); }, opt.timeout || 12000);
    return fetch(base() + path, { method: method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined, cache: 'no-store', credentials: 'omit', signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        clearTimeout(to);
        if (r.status === 204) return null;
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.ok) return j;
          var e = (j && j.error) || {};
          if (r.status === 401 && e.code !== 'reauth_required' && opt.auth !== false && session && !opt.keepSession) { dropSession(); }
          throw { code: e.code || 'http_' + r.status, status: r.status, message: e.message || '', data: j };
        });
      }, function () { clearTimeout(to); throw { code: 'network', status: 0, message: 'offline' }; });
  }
  function persist() {
    if (!root.Store) return Promise.resolve();
    return session ? Store.save(SKEY, { session: session, account: account }) : Store.remove(SKEY);
  }
  function dropSession() { session = null; account = null; persist(); emit(); }
  function adopt(r) { session = r.session; account = r.account; persist(); emit(); return account; }

  var Core = {
    configured: configured,
    on: function (f) { listeners.push(f); },
    restore: function () {
      return Store.load(SKEY).then(function (v) {
        if (v && v.session && v.session.token && (!v.session.expiresAt || new Date(v.session.expiresAt) > new Date())) { session = v.session; account = v.account || null; }
        return !!session;
      });
    },
    signedIn: function () { return !!session; },
    account: function () { return account; },
    health: function () { return request('GET', '/v1/health', undefined, { auth: false, timeout: 6000 }); },
    release: function (v) { return request('GET', '/v1/app/release?app=abra&version=' + encodeURIComponent(v), undefined, { auth: false }); },
    legal: function () { return request('GET', '/v1/legal', undefined, { auth: false }); },
    register: function (email, password, locale) { return request('POST', '/v1/auth/register', { email: email, password: password, locale: locale, device: device() }, { auth: false }).then(adopt); },
    login: function (email, password) { return request('POST', '/v1/auth/login', { email: email, password: password, device: device() }, { auth: false }).then(adopt); },
    google: function (idToken) { return request('POST', '/v1/auth/google', { idToken: idToken, device: device() }, { auth: false }).then(adopt); },
    apple: function (idToken, nonce) { return request('POST', '/v1/auth/apple', { idToken: idToken, nonce: nonce, device: device() }, { auth: false }).then(adopt); },
    forgot: function (email) { return request('POST', '/v1/auth/password/forgot', { email: email }, { auth: false }); },
    logout: function () {
      var p = session ? request('POST', '/v1/auth/logout', {}, { keepSession: true }).catch(function () { }) : Promise.resolve();
      return p.then(function () { dropSession(); });
    },
    me: function () { return request('GET', '/v1/me').then(function (r) { account = r.account; persist(); emit(); return account; }); },
    patchMe: function (o) { return request('PATCH', '/v1/me', o).then(function (r) { account = r.account; persist(); emit(); return account; }); },
    /* consent records: [{docId,version,locale,acceptedAt}] */
    consent: function (records) { return request('POST', '/v1/me/consents', { records: records }); },
    changePassword: function (cur, nw) { return request('POST', '/v1/auth/password/change', { currentPassword: cur, newPassword: nw }); },
    reauth: function (o) { return request('POST', '/v1/auth/reauth', o); },
    devices: function () { return request('GET', '/v1/me/devices'); },
    deleteAccount: function (reauthToken) {
      return request('DELETE', '/v1/me', { reauthToken: reauthToken, confirm: 'DELETE' }).then(function (r) { session = null; account = null; return Store.remove(SKEY).then(function () { emit(); return r; }); });
    },
    /* partner pairing + shared space (API v1.1/1.2); only ciphertext and membership */
    invite: function () { return request('POST', '/v1/pairing/invite', {}); },
    accept: function (code) { return request('POST', '/v1/pairing/accept', { code: code, deviceLabel: device().label }); },
    space: function () { return request('GET', '/v1/space'); },
    unlink: function () { return request('DELETE', '/v1/space'); },
    ackEnded: function () { return request('POST', '/v1/space/ack-ended', {}); },
    putMemberKey: function (pk) { return request('PUT', '/v1/space/member-key', { publicKey: pk }); },
    shares: function () { return request('GET', '/v1/space/shares'); },
    putShare: function (cat, body) { return request('PUT', '/v1/space/shares/' + encodeURIComponent(cat), body); },
    consents: function () { return request('GET', '/v1/space/consents'); },
    messages: function (after) { return request('GET', '/v1/space/messages?after=' + (after || 0) + '&limit=100'); },
    postMessage: function (o) { return request('POST', '/v1/space/messages', o); },
    deleteMessage: function (id) { return request('DELETE', '/v1/space/messages/' + encodeURIComponent(id)); },
    /* Google Identity Services (web). Only available when a client id is set. */
    googleReady: function () { return !!cfg().googleClientId; },
    googleToken: function () {
      return new Promise(function (res, rej) {
        function go() {
          try {
            google.accounts.id.initialize({ client_id: cfg().googleClientId, callback: function (r) { r && r.credential ? res(r.credential) : rej({ code: 'cancelled' }); } });
            google.accounts.id.prompt(function (n) { if (n.isNotDisplayed && n.isNotDisplayed()) rej({ code: 'cancelled' }); });
          } catch (e) { rej({ code: 'google_failed' }); }
        }
        if (root.google && google.accounts) return go();
        var s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = go; s.onerror = function () { rej({ code: 'network' }); };
        document.head.appendChild(s);
      });
    },
    appleReady: function () { return !!cfg().appleClientId && !!root.AppleID; },
    _reset: function () { session = null; account = null; }
  };
  root.Core = Core;
})(typeof self !== 'undefined' ? self : this);
