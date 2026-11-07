/* Abrora partner crypto. Everything the partner can read is encrypted on the device first; the server only relays ciphertext.
   - Each device makes an ECDH P-256 key pair. The private key is NON-EXTRACTABLE and never leaves IndexedDB.
   - Both partners derive the same AES-GCM key from (my private key, partner public key) with HKDF, bound to the space id.
   - A safety code (from both public keys) is compared by the two people in person or by phone; if a key ever changes, the code changes.
   - Honest limit: if the server swapped a public key before the code was compared, only comparing the code would catch it. */
(function (root) {
  'use strict';
  var DB = 'abra-pair', OS = 'k', KID = 'ecdh-v1';
  var enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null, dec = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;
  var mine = null, cache = {};

  function b64u(buf) { var a = new Uint8Array(buf), s = ''; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s) { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function supported() { return !!(root.crypto && crypto.subtle && root.indexedDB && enc); }
  function idb() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(OS); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function get(db) { return new Promise(function (res, rej) { var q = db.transaction(OS).objectStore(OS).get(KID); q.onsuccess = function () { res(q.result || null); }; q.onerror = function () { rej(q.error); }; }); }
  function put(db, v) { return new Promise(function (res, rej) { var tx = db.transaction(OS, 'readwrite'); tx.objectStore(OS).put(v, KID); tx.oncomplete = function () { res(); }; tx.onerror = function () { rej(tx.error); }; }); }

  /* Make (or load) this device's key pair. Resolves with the public key (base64url, 65 bytes raw). */
  function ensureKeys() {
    if (mine) return Promise.resolve(mine.pub);
    if (!supported()) return Promise.reject({ code: 'unsupported' });
    return idb().then(function (db) {
      return get(db).then(function (v) {
        if (v && v.priv && v.pub) { mine = v; return v.pub; }
        return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']).then(function (kp) {
          return crypto.subtle.exportKey('raw', kp.publicKey).then(function (raw) {
            var rec = { priv: kp.privateKey, pub: b64u(raw) };
            return put(db, rec).then(function () { mine = rec; return rec.pub; });
          });
        });
      });
    });
  }
  /* A fresh key pair (used after a device is reset). The server switches off earlier shares when the key changes. */
  function rotate() {
    return destroy().then(ensureKeys);
  }
  function destroy() {
    mine = null; cache = {};
    return new Promise(function (res) {
      if (!root.indexedDB) return res();
      var r = indexedDB.deleteDatabase(DB); r.onsuccess = r.onerror = r.onblocked = function () { res(); };
    });
  }

  /* Safety code: 20 digits in 4 groups, from both public keys (order independent). */
  function fingerprint(pubA, pubB) {
    var k = [pubA, pubB].sort().join('|');
    return crypto.subtle.digest('SHA-256', enc.encode(k)).then(function (h) { return hex(h).slice(0, 40); });
  }
  function safetyCode(fp) {
    if (!fp) return '';
    var g = [];
    for (var i = 0; i < 4; i++) g.push(('00000' + (parseInt(fp.substr(i * 5, 5), 16) % 100000)).slice(-5));
    return g.join(' ');
  }

  function derive(spaceId, partnerPub) {
    var ck = spaceId + '|' + partnerPub;
    if (cache[ck]) return Promise.resolve(cache[ck]);
    return ensureKeys().then(function () {
      return crypto.subtle.importKey('raw', unb64u(partnerPub), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    }).then(function (pk) {
      return crypto.subtle.deriveBits({ name: 'ECDH', public: pk }, mine.priv, 256);
    }).then(function (bits) {
      return crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
    }).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: enc.encode(spaceId), info: enc.encode('abrora/space/v1') }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    }).then(function (k) { cache[ck] = k; return k; });
  }
  function seal(key, obj, aad) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: enc.encode(aad) }, key, enc.encode(JSON.stringify(obj))).then(function (ct) {
      var out = new Uint8Array(12 + ct.byteLength); out.set(iv, 0); out.set(new Uint8Array(ct), 12); return b64u(out);
    });
  }
  /* Resolves with the object, or null when the blob is not valid for this key/context (tampered, wrong sender, wrong space). */
  function open(key, blob, aad) {
    try {
      var all = unb64u(blob);
      if (all.length < 29) return Promise.resolve(null);
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12), additionalData: enc.encode(aad) }, key, all.slice(12))
        .then(function (pt) { return JSON.parse(dec.decode(pt)); }, function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }
  function clientId() { var a = crypto.getRandomValues(new Uint8Array(12)); return 'c' + b64u(a); }

  root.Pair = { supported: supported, ensureKeys: ensureKeys, rotate: rotate, destroy: destroy, fingerprint: fingerprint, safetyCode: safetyCode, derive: derive, seal: seal, open: open, clientId: clientId, b64u: b64u };
})(typeof self !== 'undefined' ? self : this);
