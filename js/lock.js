/* Abra — app lock.
   Uses the phone's own screen lock (Face ID / Touch ID / passcode on iPhone, fingerprint / face / PIN on Android)
   through WebAuthn. There is no password stored anywhere: the browser asks the phone to verify the person.

   What it does: it covers the app until the phone says "yes, it's you".
   What it does not do: it does not encrypt what is saved on the phone. (Said plainly in the settings screen.)

   The lock is remembered on THIS phone only (key abrora:lock) and is never part of a backup. */
(function (root) {
  'use strict';

  var KEY = 'abrora:lock';

  function b64(buf) {
    var s = '', a = new Uint8Array(buf);
    for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    var bin = atob(s), a = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return a.buffer;
  }
  function rnd(n) { var a = new Uint8Array(n); crypto.getRandomValues(a); return a; }
  function fail(code) { var e = new Error(code); e.code = code; return e; }
  function mapErr(e) {
    if (e && e.code) return e;
    var n = e && e.name;
    if (n === 'NotAllowedError' || n === 'AbortError') return fail('cancel');
    if (n === 'NotSupportedError' || n === 'SecurityError' || n === 'InvalidStateError') return fail('unsupported');
    return fail('fail');
  }

  function read() { try { var j = JSON.parse(localStorage.getItem(KEY) || 'null'); return j && typeof j.id === 'string' ? j : null; } catch (e) { return null; } }
  function write(o) { try { if (o) localStorage.setItem(KEY, JSON.stringify(o)); else localStorage.removeItem(KEY); } catch (e) { } }

  /* Inside the Android/iOS app the web page cannot use WebAuthn, so the app asks the phone through a native plugin instead
     (@aparajita/capacitor-biometric-auth). Same result: the phone verifies the person with Face ID / fingerprint / passcode. */
  var nativeP = null;
  function native() {
    var C = root.Capacitor;
    if (!C) return null;
    if (C.Plugins && C.Plugins.BiometricAuth) return C.Plugins.BiometricAuth;
    if (!nativeP && C.isNativePlatform && C.isNativePlatform() && C.registerPlugin) nativeP = C.registerPlugin('BiometricAuth');
    return nativeP;
  }
  var REASON = { fa: 'برای باز کردن %APP%', en: 'Unlock %APP%', de: '%APP% entsperren' };
  function nativeAsk() {
    var lang = (root.document && document.documentElement.lang) || 'en';
    return native().authenticate({ reason: (REASON[lang] || REASON.en).split('%APP%').join(self.Brand ? Brand.name() : 'Abra'), cancelTitle: '✕', allowDeviceCredential: true, iosFallbackTitle: '' });
  }
  function mapNative(e) {
    var c = e && (e.code || e.name) || '';
    if (/cancel/i.test(c)) return fail('cancel');                       // userCancel, systemCancel, appCancel
    if (/notAvailable|notEnrolled|passcodeNotSet|notSupported/i.test(c)) return fail('unsupported');
    return fail('fail');
  }

  function api() {
    return !!(root.PublicKeyCredential && navigator.credentials && navigator.credentials.create && navigator.credentials.get && root.crypto && crypto.getRandomValues);
  }
  /* Resolves true when this phone can verify the person with its screen lock. */
  function supported() {
    if (native()) return native().checkBiometry().then(function (r) { return !!(r && (r.isAvailable || r.deviceIsSecure)); }, function () { return false; });
    if (!api()) return Promise.resolve(false);
    var f = root.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable;
    if (typeof f !== 'function') return Promise.resolve(false);
    return f.call(root.PublicKeyCredential).then(function (ok) { return !!ok; }, function () { return false; });
  }

  function enabled() { return !!read(); }

  function enable() {
    if (native()) return nativeAsk().then(function () { write({ id: 'native', at: Date.now() }); }, function (e) { throw mapNative(e); });
    if (!api()) return Promise.reject(fail('unsupported'));
    return navigator.credentials.create({
      publicKey: {
        challenge: rnd(32),
        rp: { name: self.Brand ? Brand.name() : 'Abra' },
        user: { id: rnd(16), name: 'abrora', displayName: self.Brand ? Brand.name() : 'Abra' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
        attestation: 'none', timeout: 60000
      }
    }).then(function (cred) {
      if (!cred || !cred.rawId) throw fail('fail');
      write({ id: b64(cred.rawId), at: Date.now() });
    }).catch(function (e) { throw mapErr(e); });
  }

  /* Asks the phone to verify the person. Resolves on success. */
  function verify() {
    var saved = read();
    if (!saved) return Promise.resolve();
    if (saved.id === 'native') return native() ? nativeAsk().then(function () { }, function (e) { throw mapNative(e); }) : Promise.reject(fail('unsupported'));
    if (!api()) return Promise.reject(fail('unsupported'));
    return navigator.credentials.get({
      publicKey: {
        challenge: rnd(32),
        allowCredentials: [{ type: 'public-key', id: unb64(saved.id) }],
        userVerification: 'required', timeout: 60000
      }
    }).then(function (a) { if (!a) throw fail('fail'); }).catch(function (e) { throw mapErr(e); });
  }

  /* Turning the lock off needs the phone to verify first. */
  function disable() { return verify().then(function () { write(null); }); }
  /* Forgot / broken lock: forgets it WITHOUT verifying. The app pairs this with erasing the data. */
  function forget() { write(null); }

  root.Lock = { supported: supported, enabled: enabled, enable: enable, verify: verify, disable: disable, forget: forget };
})(typeof self !== 'undefined' ? self : this);
