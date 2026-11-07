<?php
declare(strict_types=1);
namespace Abra;

final class Auth
{
    private const IDLE = 30 * 86400;
    private const ABSOLUTE = 90 * 86400;
    private const TOUCH_EVERY = 300;

    /* ---------- session guard ---------- */

    /** @return array{account:array,session:array} */
    public static function requireUser(Request $req): array
    {
        $tok = $req->bearer();
        if ($tok === null) { throw new ApiException(401, 'unauthorized', 'Sign in required.'); }
        $s = Db::one('SELECT * FROM sessions WHERE token_hash = ?', [Util::hash($tok)]);
        $now = Util::now();
        if (!$s || $s['revoked_at'] !== null || $s['expires_at'] <= $now || (Util::parseIso($s['created_at']) ?? 0) + self::ABSOLUTE <= time()) {
            throw new ApiException(401, 'unauthorized', 'Sign in required.');
        }
        $dev = Db::one('SELECT revoked_at FROM devices WHERE id = ?', [$s['device_id']]);
        if (!$dev || $dev['revoked_at'] !== null) { throw new ApiException(401, 'unauthorized', 'Sign in required.'); }
        $a = Accounts::find($s['account_id']);
        if (!$a) { throw new ApiException(401, 'unauthorized', 'Sign in required.'); }
        if ($a['status'] !== 'active') { throw new ApiException(403, 'account_suspended', 'This account is suspended.'); }

        if (time() - (Util::parseIso($s['last_used_at']) ?? 0) > self::TOUCH_EVERY) {
            $exp = min(time() + self::IDLE, (Util::parseIso($s['created_at']) ?? time()) + self::ABSOLUTE);
            Db::exec('UPDATE sessions SET last_used_at = ?, expires_at = ? WHERE id = ?', [$now, Util::at($exp), $s['id']]);
            Db::exec('UPDATE devices SET last_seen_at = ? WHERE id = ?', [$now, $s['device_id']]);
            Db::exec('UPDATE accounts SET last_seen_at = ? WHERE id = ?', [$now, $a['id']]);
            $s['expires_at'] = Util::at($exp);
        }
        return ['account' => $a, 'session' => $s];
    }

    /* ---------- sessions ---------- */

    private static function issue(array $account, array $device): array
    {
        return Db::tx(function () use ($account, $device) {
            Devices::evictIfFull($account['id']);
            $devId = Devices::create($account['id'], $device);
            $token = Util::token();
            $now = Util::now();
            $exp = Util::plus(self::IDLE);
            Db::exec('INSERT INTO sessions (id, account_id, device_id, token_hash, created_at, last_used_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [Util::id('ses_'), $account['id'], $devId, Util::hash($token), $now, $now, $exp]);
            Db::exec('UPDATE accounts SET last_seen_at = ? WHERE id = ?', [$now, $account['id']]);
            $fresh = Accounts::find($account['id']);
            return ['session' => ['token' => $token, 'expiresAt' => $exp], 'account' => Accounts::view($fresh), 'device' => ['id' => $devId]];
        });
    }

    public static function revokeSessions(string $accountId, ?string $exceptSessionId = null): void
    {
        $now = Util::now();
        if ($exceptSessionId === null) {
            Db::exec('UPDATE sessions SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL', [$now, $accountId]);
        } else {
            Db::exec('UPDATE sessions SET revoked_at = ? WHERE account_id = ? AND id <> ? AND revoked_at IS NULL', [$now, $accountId, $exceptSessionId]);
        }
    }

    /* ---------- e-mail + password ---------- */

    public static function register(Request $req): Response
    {
        $ip = $req->ip();
        RateLimit::hit('register_ip', $ip);
        $b = $req->json();
        $email = Util::email($b['email'] ?? null);
        if ($email === null) { throw new ApiException(400, 'invalid_request', 'A valid e-mail address is required.'); }
        Passwords::validate($b['password'] ?? null, $email);
        if (array_key_exists('locale', $b) && (!is_string($b['locale']) || !in_array($b['locale'], ['en', 'fa', 'de'], true))) {
            throw new ApiException(400, 'invalid_request', 'Invalid locale.');
        }
        $locale = Util::locale($b['locale'] ?? 'en');
        $device = Devices::input($b['device'] ?? null);

        if (Accounts::byEmail($email)) { throw new ApiException(409, 'conflict', 'An account with this e-mail already exists.'); }
        $hash = Passwords::hash($b['password']);
        $id = Util::id('acc_');
        $now = Util::now();
        try {
            Db::exec('INSERT INTO accounts (id, email_norm, email_verified, password_hash, display_name, locale, calendar, status, created_at, last_seen_at) VALUES (?, ?, 0, ?, NULL, ?, ?, ?, ?, ?)',
                [$id, $email, $hash, $locale, 'gregorian', 'active', $now, $now]);
        } catch (\PDOException $e) {
            if (Db::isDuplicate($e)) { throw new ApiException(409, 'conflict', 'An account with this e-mail already exists.'); }
            throw $e;
        }
        Audit::log('user', 'account_registered', $id, ['platform' => $device['platform']]);
        return Response::json(self::issue(Accounts::find($id), $device), 201);
    }

    public static function login(Request $req): Response
    {
        $ip = $req->ip();
        RateLimit::check('login_ip', $ip);
        $b = $req->json();
        $email = Util::email($b['email'] ?? null);
        $pw = $b['password'] ?? null;
        if ($email === null || !is_string($pw) || $pw === '' || strlen($pw) > 1000) {
            RateLimit::fail('login_ip', $ip);
            throw new ApiException(401, 'unauthorized', 'Email or password is incorrect.');
        }
        RateLimit::check('login_id', $email);
        $device = Devices::input($b['device'] ?? null);
        $a = Accounts::byEmail($email);
        $ok = false;
        if ($a && $a['password_hash'] !== null) { $ok = Passwords::verify($pw, $a['password_hash']); }
        else { Passwords::dummyVerify($pw); }
        if (!$ok) {
            RateLimit::fail('login_ip', $ip);
            RateLimit::fail('login_id', $email);
            throw new ApiException(401, 'unauthorized', 'Email or password is incorrect.');
        }
        if ($a['status'] !== 'active') { throw new ApiException(403, 'account_suspended', 'This account is suspended.'); }
        if (Passwords::needsRehash($a['password_hash'])) {
            Db::exec('UPDATE accounts SET password_hash = ? WHERE id = ?', [Passwords::hash($pw), $a['id']]);
        }
        return Response::json(self::issue($a, $device));
    }

    public static function logout(array $ctx): Response
    {
        Db::exec('UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL', [Util::now(), $ctx['session']['id']]);
        return Response::noContent();
    }

    public static function logoutAll(array $ctx): Response
    {
        $acc = $ctx['account']['id'];
        Db::tx(function () use ($acc) {
            self::revokeSessions($acc);
            Db::exec('UPDATE devices SET revoked_at = ? WHERE account_id = ? AND revoked_at IS NULL', [Util::now(), $acc]);
        });
        Audit::log('user', 'logout_all', $acc);
        return Response::noContent();
    }

    /* ---------- password recovery ---------- */

    public static function forgot(Request $req): Response
    {
        $ip = $req->ip();
        $b = $req->json();
        $email = Util::email($b['email'] ?? null);
        RateLimit::hit('forgot_ip', $ip);
        RateLimit::hit('forgot_id', $email ?? ('ip:' . $ip));
        if ($email !== null) {
            $a = Accounts::byEmail($email);
            if ($a && $a['status'] === 'active') {
                $token = Util::token();
                Db::tx(function () use ($a, $token) {
                    Db::exec('UPDATE reset_tokens SET used_at = ? WHERE account_id = ? AND used_at IS NULL', [Util::now(), $a['id']]);
                    Db::exec('INSERT INTO reset_tokens (token_hash, account_id, expires_at, used_at) VALUES (?, ?, ?, NULL)', [Util::hash($token), $a['id'], Util::plus(1800)]);
                });
                $base = rtrim((string) Config::get('app_base_url', ''), '/');
                Mail::send($email, 'Reset your Abra password',
                    "Someone asked to reset the password for your Abra account.\n\nReset code (valid 30 minutes):\n$token\n\nOr open: $base/#/reset?token=$token\n\nIf this was not you, ignore this message. Your password stays unchanged.");
            }
        }
        return Response::json(['ok' => true], 202);
    }

    public static function reset(Request $req): Response
    {
        RateLimit::hit('reset_ip', $req->ip());
        $b = $req->json();
        $tok = $b['token'] ?? null;
        $bad = new ApiException(400, 'invalid_request', 'The reset link is invalid or has expired.');
        if (!is_string($tok) || $tok === '' || strlen($tok) > 256) { throw $bad; }
        $now = Util::now();
        $row = Db::one('SELECT account_id FROM reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?', [Util::hash($tok), $now]);
        if (!$row) { throw $bad; }
        $a = Accounts::find($row['account_id']);
        if (!$a) { throw $bad; }
        Passwords::validate($b['newPassword'] ?? null, $a['email_norm']);
        $hash = Passwords::hash($b['newPassword']);
        Db::tx(function () use ($tok, $a, $hash, $now, $bad) {
            if (Db::exec('UPDATE reset_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL', [$now, Util::hash($tok)]) !== 1) { throw $bad; }
            // Receiving the mail proves control of the mailbox.
            Db::exec('UPDATE accounts SET password_hash = ?, email_verified = 1 WHERE id = ?', [$hash, $a['id']]);
            self::revokeSessions($a['id']);
        });
        Audit::log('user', 'password_reset', $a['id']);
        return Response::noContent();
    }

    public static function change(array $ctx, Request $req): Response
    {
        $a = $ctx['account'];
        RateLimit::check('change', $a['id']);
        $b = $req->json();
        if ($a['password_hash'] === null) { throw new ApiException(400, 'invalid_request', 'This account has no password. Use "forgot password" to set one.'); }
        $cur = $b['currentPassword'] ?? null;
        if (!is_string($cur) || !Passwords::verify($cur, $a['password_hash'])) {
            RateLimit::fail('change', $a['id']);
            throw new ApiException(401, 'unauthorized', 'Current password is incorrect.');
        }
        Passwords::validate($b['newPassword'] ?? null, $a['email_norm']);
        Db::tx(function () use ($a, $ctx, $b) {
            Db::exec('UPDATE accounts SET password_hash = ? WHERE id = ?', [Passwords::hash($b['newPassword']), $a['id']]);
            self::revokeSessions($a['id'], $ctx['session']['id']);
        });
        Audit::log('user', 'password_changed', $a['id']);
        return Response::noContent();
    }

    /* ---------- Google / Apple ---------- */

    public static function google(Request $req): Response
    {
        RateLimit::hit('social_ip', $req->ip());
        $b = $req->json();
        $ids = (array) Config::get('google_client_ids', []);
        $tok = $b['idToken'] ?? null;
        if (!is_string($tok) || $ids === []) { throw new ApiException(401, 'unauthorized', 'Sign-in could not be verified.'); }
        $c = Jwt::verify($tok, 'google', ['https://accounts.google.com', 'accounts.google.com'], $ids);
        if (isset($b['nonce'])) {
            if (!is_string($b['nonce']) || !is_string($c['nonce'] ?? null) || !hash_equals($c['nonce'], $b['nonce'])) { throw new ApiException(401, 'unauthorized', 'Sign-in could not be verified.'); }
        }
        $verified = ($c['email_verified'] ?? false) === true || ($c['email_verified'] ?? '') === 'true';
        $email = Util::email($c['email'] ?? null);
        if ($email === null || !$verified) { throw new ApiException(401, 'unauthorized', 'Sign-in could not be verified.'); }
        return Response::json(self::social('google', $c['sub'], $email, true, Devices::input($b['device'] ?? null), $b['locale'] ?? null), 200);
    }

    public static function apple(Request $req): Response
    {
        RateLimit::hit('social_ip', $req->ip());
        $b = $req->json();
        $ids = (array) Config::get('apple_client_ids', []);
        $tok = $b['idToken'] ?? null;
        $nonce = $b['nonce'] ?? null;
        if (!is_string($tok) || !is_string($nonce) || $nonce === '' || strlen($nonce) > 256 || $ids === []) {
            throw new ApiException(401, 'unauthorized', 'Sign-in could not be verified.');
        }
        $c = Jwt::verify($tok, 'apple', ['https://appleid.apple.com'], $ids);
        $supported = ($c['nonce_supported'] ?? false) === true || ($c['nonce_supported'] ?? '') === 'true';
        $expected = $supported ? hash('sha256', $nonce) : $nonce;
        if (!is_string($c['nonce'] ?? null) || !hash_equals($expected, $c['nonce'])) { throw new ApiException(401, 'unauthorized', 'Sign-in could not be verified.'); }
        $verified = ($c['email_verified'] ?? false) === true || ($c['email_verified'] ?? '') === 'true';
        $email = $verified ? Util::email($c['email'] ?? null) : null;
        return Response::json(self::social('apple', $c['sub'], $email, $email !== null, Devices::input($b['device'] ?? null), $b['locale'] ?? null), 200);
    }

    private static function social(string $provider, string $sub, ?string $email, bool $verified, array $device, mixed $locale): array
    {
        $loc = Util::locale($locale);
        for ($try = 0; $try < 2; $try++) {
            try {
                $acc = Db::tx(function () use ($provider, $sub, $email, $verified, $loc) {
                    $row = Db::one('SELECT account_id FROM identities WHERE provider = ? AND subject = ?', [$provider, $sub]);
                    if ($row) { return Accounts::find($row['account_id']); }
                    $now = Util::now();
                    $existing = $email !== null ? Accounts::byEmail($email) : null;
                    if ($existing) {
                        if ($existing['status'] !== 'active') { throw new ApiException(403, 'account_suspended', 'This account is suspended.'); }
                        Db::exec('INSERT INTO identities (id, account_id, provider, subject, created_at) VALUES (?, ?, ?, ?, ?)', [Util::id('idn_'), $existing['id'], $provider, $sub, $now]);
                        if (!$existing['email_verified']) {
                            // Anti pre-hijack: an unverified password could have been set by someone who does not own the mailbox.
                            Db::exec('UPDATE accounts SET email_verified = 1, password_hash = NULL WHERE id = ?', [$existing['id']]);
                            self::revokeSessions($existing['id']);
                        }
                        return Accounts::find($existing['id']);
                    }
                    $id = Util::id('acc_');
                    Db::exec('INSERT INTO accounts (id, email_norm, email_verified, password_hash, display_name, locale, calendar, status, created_at, last_seen_at) VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?)',
                        [$id, $email, $verified ? 1 : 0, $loc, 'gregorian', 'active', $now, $now]);
                    Db::exec('INSERT INTO identities (id, account_id, provider, subject, created_at) VALUES (?, ?, ?, ?, ?)', [Util::id('idn_'), $id, $provider, $sub, $now]);
                    Audit::log('user', 'account_registered', $id, ['provider' => $provider]);
                    return Accounts::find($id);
                });
                break;
            } catch (\PDOException $e) {
                if ($try === 0 && Db::isDuplicate($e)) { continue; } // concurrent first sign-in: retry once
                throw $e;
            }
        }
        if ($acc['status'] !== 'active') { throw new ApiException(403, 'account_suspended', 'This account is suspended.'); }
        return self::issue($acc, $device);
    }

    /* ---------- re-authentication ---------- */

    public static function reauth(array $ctx, Request $req): Response
    {
        $a = $ctx['account'];
        RateLimit::check('reauth', $a['id']);
        $b = $req->json();
        $ok = false;
        if (isset($b['provider'])) {
            $p = $b['provider'];
            $tok = $b['idToken'] ?? null;
            if (!is_string($p) || !in_array($p, ['google', 'apple'], true) || !is_string($tok)) { throw new ApiException(400, 'invalid_request', 'Invalid provider or idToken.'); }
            try {
                if ($p === 'google') {
                    $ids = (array) Config::get('google_client_ids', []);
                    $c = $ids ? Jwt::verify($tok, 'google', ['https://accounts.google.com', 'accounts.google.com'], $ids) : null;
                    if ($c !== null && isset($b['nonce']) && (!is_string($b['nonce']) || !is_string($c['nonce'] ?? null) || !hash_equals($c['nonce'], $b['nonce']))) { $c = null; }
                } else {
                    $ids = (array) Config::get('apple_client_ids', []);
                    $c = $ids ? Jwt::verify($tok, 'apple', ['https://appleid.apple.com'], $ids) : null;
                    $n = $b['nonce'] ?? null;
                    if ($c !== null) {
                        $sup = ($c['nonce_supported'] ?? false) === true || ($c['nonce_supported'] ?? '') === 'true';
                        if (!is_string($n) || !is_string($c['nonce'] ?? null) || !hash_equals($sup ? hash('sha256', $n) : $n, $c['nonce'])) { $c = null; }
                    }
                }
            } catch (ApiException $e) {
                if ($e->status === 503) { throw $e; }
                $c = null;
            }
            if ($c !== null) {
                $own = Db::val('SELECT account_id FROM identities WHERE provider = ? AND subject = ?', [$p, $c['sub']]);
                $ok = $own !== null && hash_equals((string) $own, $a['id']);
            }
        } else {
            $pw = $b['password'] ?? null;
            if (!is_string($pw) || $pw === '' || strlen($pw) > 1000) { throw new ApiException(400, 'invalid_request', 'Password is required.'); }
            if ($a['password_hash'] === null) { throw new ApiException(400, 'invalid_request', 'This account signs in with a provider. Confirm with that provider.'); }
            $ok = Passwords::verify($pw, $a['password_hash']);
        }
        if (!$ok) {
            RateLimit::fail('reauth', $a['id']);
            throw new ApiException(401, 'unauthorized', 'Confirmation failed.');
        }
        $token = Util::token();
        $exp = Util::plus(300);
        Db::exec('INSERT INTO reauth_tokens (token_hash, session_id, expires_at, used_at) VALUES (?, ?, ?, NULL)', [Util::hash($token), $ctx['session']['id'], $exp]);
        return Response::json(['reauthToken' => $token, 'expiresAt' => $exp]);
    }
}
