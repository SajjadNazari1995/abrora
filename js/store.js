/* Abra local-first protected storage.
   - Health data is written as AES-256-GCM ciphertext (WebCrypto). The key is a NON-EXTRACTABLE CryptoKey kept in IndexedDB,
     so scripts cannot read the raw key bytes; the key never leaves the device and never goes to any server.
   - Each slot ("main", "snap", "undo") is bound to its name with AAD, so a blob cannot be swapped between slots.
   - Honest limit: this keeps stored copies unreadable to casual inspection, file browsing and backups of the storage folder.
     It is not a hardware-backed key (a device-bound WebAuthn/PRF or Keychain key is planned later).
   - If the browser has no WebCrypto/IndexedDB the app still works, in "plain" mode, and says so in Settings.
   - Deleting the key ("crypto-shredding") makes every stored blob permanently unreadable. */
(function (root) {
  'use strict';
  var PREFIX = 'abra:s:', DB = 'abra-keys', OS = 'k', KID = 'dek-v1';
  var mode = 'plain', key = null, chain = Promise.resolve();
  var enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null, dec = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;

  function b64(buf) { var a = new Uint8Array(buf), s = ''; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
  function unb64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  function idb() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(OS); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idbGet(db) { return new Promise(function (res, rej) { var q = db.transaction(OS).objectStore(OS).get(KID); q.onsuccess = function () { res(q.result || null); }; q.onerror = function () { rej(q.error); }; }); }
  function idbPut(db, k) { return new Promise(function (res, rej) { var tx = db.transaction(OS, 'readwrite'); tx.objectStore(OS).put(k, KID); tx.oncomplete = function () { res(); }; tx.onerror = function () { rej(tx.error); }; }); }
  function idbDel(db) { return new Promise(function (res) { var tx = db.transaction(OS, 'readwrite'); tx.objectStore(OS).delete(KID); tx.oncomplete = tx.onerror = function () { res(); }; }); }

  function init() {
    if (!(root.crypto && crypto.subtle && root.indexedDB && enc)) { mode = 'plain'; return Promise.resolve(mode); }
    return idb().then(function (db) {
      return idbGet(db).then(function (k) {
        if (k) { key = k; mode = 'enc'; return mode; }
        return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']).then(function (nk) {
          return idbPut(db, nk).then(function () { key = nk; mode = 'enc'; return mode; });
        });
      });
    }).catch(function () { mode = 'plain'; key = null; return mode; });
  }
  function aad(slot) { return enc.encode('abra:' + slot); }
  function seal(slot, obj) {
    var json = JSON.stringify(obj);
    if (mode !== 'enc') return Promise.resolve(JSON.stringify({ v: 0, p: json }));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: aad(slot) }, key, enc.encode(json)).then(function (ct) {
      return JSON.stringify({ v: 1, iv: b64(iv), ct: b64(ct) });
    });
  }
  function open(slot, raw) {
    var w; try { w = JSON.parse(raw); } catch (e) { return Promise.resolve(null); }
    if (!w) return Promise.resolve(null);
    if (w.v === 0) { try { return Promise.resolve(JSON.parse(w.p)); } catch (e2) { return Promise.resolve(null); } }
    if (w.v !== 1 || mode !== 'enc') return Promise.resolve(null);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(w.iv), additionalData: aad(slot) }, key, unb64(w.ct)).then(function (pt) {
      return JSON.parse(dec.decode(pt));
    }).catch(function () { return null; });
  }
  function load(slot) {
    var raw = null; try { raw = localStorage.getItem(PREFIX + slot); } catch (e) { }
    return raw ? open(slot, raw) : Promise.resolve(null);
  }
  /* Writes are queued so the newest data is always the last one written. */
  function save(slot, obj) {
    var snapshot = JSON.parse(JSON.stringify(obj));
    chain = chain.then(function () { return seal(slot, snapshot); }).then(function (s) {
      try { localStorage.setItem(PREFIX + slot, s); } catch (e) { }
    }).catch(function () { });
    return chain;
  }
  function remove(slot) { chain = chain.then(function () { try { localStorage.removeItem(PREFIX + slot); } catch (e) { } }); return chain; }
  function has(slot) { try { return localStorage.getItem(PREFIX + slot) !== null; } catch (e) { return false; } }
  /* Erase every slot and destroy the key. Used by "erase data" and by account deletion. */
  function destroy() {
    return chain.then(function () {
      try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(PREFIX) === 0) localStorage.removeItem(k); }); } catch (e) { }
      key = null;
      if (!root.indexedDB) return;
      return idb().then(function (db) { return idbDel(db); }).catch(function () { }).then(function () { return init(); });
    });
  }
  root.Store = { init: init, load: load, save: save, remove: remove, has: has, destroy: destroy, mode: function () { return mode; }, flush: function () { return chain; } };
})(typeof self !== 'undefined' ? self : this);
