/* Abrora cloud backup through the person's own Google Drive.
   - Needs no server: the phone talks to Google directly.
   - The backup is one small JSON file in Drive's hidden "appDataFolder": only Abrora can see it,
     it does not show up in the Drive app, and it uses the non-sensitive `drive.appdata` scope.
   - Sign-in is a normal Google redirect (no popups), which behaves best in iPhone home-screen apps and Android.
   - Google access tokens last about an hour. While the token is valid, changes are backed up automatically;
     after that the app asks the person to tap "Sign in" again (one tap, no password if still signed in). */
(function (root) {
  'use strict';

  var CFG = root.ABRORA_CONFIG || {};
  var SK = 'abrora:sync:v1', FILE = 'abrora-backup.json';
  var SCOPE = 'openid email https://www.googleapis.com/auth/drive.appdata';
  var provider = null, listeners = [], busy = false, again = false, timer = null, lastError = '';

  function read() { try { var j = JSON.parse(localStorage.getItem(SK) || '{}'); return j && typeof j === 'object' ? j : {}; } catch (e) { return {}; } }
  var st = read();
  function write() { try { localStorage.setItem(SK, JSON.stringify(st)); } catch (e) { } }
  function emit() { listeners.forEach(function (f) { try { f(); } catch (e) { } }); }
  function err(code) { var e = new Error(code); e.code = code; return e; }

  function configured() { return !!CFG.googleClientId; }
  function connected() { return !!st.connected; }
  function authed() { return !!st.token && Date.now() < (st.exp || 0) - 60000; }
  function pending() { return (st.rev || 0) !== (st.backedRev || 0); }
  function redirectUri() { return location.origin + location.pathname.replace(/index\.html$/, ''); }

  function state() {
    return {
      configured: configured(), connected: connected(), authed: authed(), email: st.email || '',
      lastBackup: st.lastBackup || 0, pending: connected() && pending(), pendingSince: st.pendingSince || 0,
      busy: busy, error: lastError
    };
  }
  /* A gentle reminder is worth showing when backups have been waiting for a sign-in for a day or more. */
  function needsAttention() {
    return connected() && !authed() && pending() && st.pendingSince && Date.now() - st.pendingSince > 24 * 3600 * 1000;
  }

  function rand() {
    var a = new Uint8Array(16); crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }
  function toQuery(o) { return Object.keys(o).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(o[k]); }).join('&'); }
  function parseQuery(s) {
    var o = {};
    s.split('&').forEach(function (p) { var i = p.indexOf('='); if (i > 0) o[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1).replace(/\+/g, ' ')); });
    return o;
  }

  /* ---------- sign-in (redirect, implicit grant) ---------- */
  function signIn() {
    if (!configured()) return;
    st.state = rand(); write();
    var q = { client_id: CFG.googleClientId, redirect_uri: redirectUri(), response_type: 'token', scope: SCOPE, state: st.state, include_granted_scopes: 'true' };
    if (st.email) q.login_hint = st.email; else q.prompt = 'select_account';
    location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + toQuery(q);
  }
  /* Call once at startup. Returns null normally, or {ok, error} when we have just come back from Google. */
  function handleRedirect() {
    var h = location.hash || '';
    if (h.indexOf('access_token=') < 0 && h.indexOf('error=') < 0) return null;
    var p = parseQuery(h.replace(/^#/, ''));
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { }
    if (!p.state || !st.state || p.state !== st.state) return { ok: false, error: 'state' };
    delete st.state;
    if (p.error || !p.access_token) { write(); return { ok: false, error: p.error || 'denied' }; }
    st.token = p.access_token; st.exp = Date.now() + (+p.expires_in || 3600) * 1000; st.connected = true; write();
    return { ok: true };
  }

  /* ---------- Drive calls ---------- */
  function api(url, o) {
    if (!authed()) return Promise.reject(err('auth'));
    o = o || {};
    o.headers = Object.assign({ Authorization: 'Bearer ' + st.token }, o.headers || {});
    return fetch(url, o).then(function (r) {
      if (r.status === 401) { st.token = null; write(); emit(); throw err('auth'); }
      if (!r.ok) throw err('http' + r.status);
      return r;
    });
  }
  function findFile() {
    var u = 'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&pageSize=1&orderBy=modifiedTime%20desc&fields=files(id,modifiedTime)&q=' +
      encodeURIComponent("name='" + FILE + "'");
    return api(u).then(function (r) { return r.json(); }).then(function (j) {
      var f = (j.files || [])[0] || null;
      st.fileId = f ? f.id : null; write();
      return f;
    });
  }
  function download(id) {
    return api('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media').then(function (r) { return r.json(); });
  }
  function upload(body) {
    function create() {
      var b = 'abrora' + rand();
      var payload = '--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify({ name: FILE, parents: ['appDataFolder'] }) + '\r\n--' + b + '\r\nContent-Type: application/json\r\n\r\n' + body + '\r\n--' + b + '--';
      return api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime',
        { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body: payload }).then(function (r) { return r.json(); });
    }
    if (!st.fileId) return create();
    return api('https://www.googleapis.com/upload/drive/v3/files/' + encodeURIComponent(st.fileId) + '?uploadType=media&fields=id,modifiedTime',
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: body }).then(function (r) { return r.json(); })
      .catch(function (e) { if (e.code === 'http404') { st.fileId = null; return create(); } throw e; });
  }

  /* ---------- public operations ---------- */
  /* After coming back from Google: learn the account email and check for an existing backup. */
  function afterSignIn() {
    return api('https://www.googleapis.com/oauth2/v3/userinfo').then(function (r) { return r.json(); })
      .then(function (j) { st.email = j.email || st.email || ''; write(); return findFile(); })
      .then(function (meta) { emit(); return { email: st.email, cloud: meta }; });
  }
  function peekCloud() {
    return findFile().then(function (meta) {
      if (!meta) return null;
      return download(meta.id).then(function (j) {
        if (!j || j.app !== 'abrora' || !j.data) throw err('bad');
        return { meta: meta, backup: j };
      });
    });
  }
  function backupNow() {
    if (!provider) return Promise.reject(err('noprovider'));
    if (busy) { again = true; return Promise.resolve(); }
    busy = true; lastError = ''; emit();
    var rev = st.rev || 0;
    return (st.fileId ? Promise.resolve() : findFile()).then(function () {
      return upload(JSON.stringify(provider.getPayload()));
    }).then(function (meta) {
      st.fileId = meta.id; st.lastBackup = Date.now();
      if ((st.rev || 0) === rev) { st.backedRev = rev; st.pendingSince = 0; }
      write();
    }).then(function (v) {
      busy = false; emit();
      if (again) { again = false; schedule(1500); }
      return v;
    }, function (e) {
      lastError = e.code || 'error'; busy = false; emit();
      throw e;
    });
  }
  /* The app calls this after every save: remember there is something new and back up shortly (if signed in). */
  function touch() {
    if (!connected()) return;
    st.rev = (st.rev || 0) + 1;
    if (!st.pendingSince) st.pendingSince = Date.now();
    write();
    schedule(6000);
  }
  function schedule(ms) {
    clearTimeout(timer);
    timer = setTimeout(function () { if (connected() && authed() && pending()) backupNow().catch(function () { }); }, ms);
  }
  /* Mark everything as already backed up (used right after restoring from the cloud). */
  function markClean() { st.backedRev = st.rev || 0; st.pendingSince = 0; write(); emit(); }
  function revoke() {
    var tk = st.token;
    if (tk) { try { fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(tk), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).catch(function () { }); } catch (e) { } }
  }
  function disconnect() { revoke(); st = {}; write(); emit(); }
  function deleteCloud() {
    return (st.fileId ? Promise.resolve() : findFile()).then(function () {
      if (!st.fileId) return;
      return api('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(st.fileId), { method: 'DELETE' }).then(function () { st.fileId = null; st.lastBackup = 0; write(); emit(); });
    });
  }

  root.Sync = {
    init: function (p) { provider = p; if (connected() && authed() && pending()) schedule(3000); },
    on: function (f) { listeners.push(f); },
    configured: configured, connected: connected, authed: authed, state: state, needsAttention: needsAttention,
    redirectUri: redirectUri, signIn: signIn, handleRedirect: handleRedirect, afterSignIn: afterSignIn,
    peekCloud: peekCloud, backupNow: backupNow, touch: touch, markClean: markClean, disconnect: disconnect, deleteCloud: deleteCloud
  };
})(self);
