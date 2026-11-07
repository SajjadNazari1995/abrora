<?php
declare(strict_types=1);
namespace Abra;

/** One-time invite codes. Only the SHA-256 of a code is stored; codes are never logged. */
final class Pairing
{
    private const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32
    public const TTL = 600;
    private const QR_PREFIX = 'abra://pair?c=';

    public static function newCode(): string
    {
        $s = '';
        for ($i = 0; $i < 8; $i++) { $s .= self::ALPHABET[random_int(0, 31)]; }
        return $s;
    }

    /** Crockford normalisation (case, separators, O->0, I/L->1). Also accepts the full QR payload. */
    public static function normalize(mixed $c): ?string
    {
        if (!is_string($c) || $c === '' || strlen($c) > 64) { return null; }
        if (stripos($c, self::QR_PREFIX) === 0) { $c = substr($c, strlen(self::QR_PREFIX)); }
        $c = strtoupper(preg_replace('/[\s-]+/', '', $c) ?? '');
        $c = strtr($c, ['O' => '0', 'I' => '1', 'L' => '1']);
        return preg_match('/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/', $c) === 1 ? $c : null;
    }

    public static function invite(array $ctx): Response
    {
        $acc = $ctx['account']['id'];
        RateLimit::hit('pair_invite', $acc);
        if (Spaces::membership($acc)) { throw new ApiException(409, 'conflict', 'You are already in a shared space.'); }
        Db::exec('DELETE FROM space_ended WHERE account_id = ?', [$acc]);
        $now = Util::now();
        $exp = Util::plus(self::TTL);
        $id = Util::id('inv_');
        $code = '';
        for ($try = 0; $try < 5; $try++) {
            $code = self::newCode();
            try {
                Db::tx(function () use ($acc, $now, $exp, $id, $code) {
                    // A new invite revokes every older active one, so at most one stays active (the cap of 3 can never be exceeded).
                    Db::exec('UPDATE pair_invites SET revoked_at = ? WHERE account_id = ? AND used_at IS NULL AND revoked_at IS NULL', [$now, $acc]);
                    Db::exec('INSERT INTO pair_invites (id, account_id, code_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)', [$id, $acc, Util::hash($code), $now, $exp]);
                });
                Audit::log('user', 'pair_invite_created', $acc);
                return Response::json(['inviteId' => $id, 'code' => $code, 'qrPayload' => self::QR_PREFIX . $code, 'expiresAt' => $exp], 201);
            } catch (\PDOException $e) {
                if (!Db::isDuplicate($e)) { throw $e; }
            }
        }
        throw new ApiException(500, 'server_error', 'Something went wrong on our side.');
    }

    public static function accept(array $ctx, Request $req): Response
    {
        $acc = $ctx['account']['id'];
        $ip = $req->ip();
        RateLimit::check('pair_accept', $acc . '|' . $ip);
        RateLimit::check('pair_accept_acc', $acc);
        $b = $req->json();
        if (!is_string($b['code'] ?? null) || $b['code'] === '' || strlen($b['code']) > 64) { throw new ApiException(400, 'invalid_request', 'code is required.'); }
        $label = null;
        if (array_key_exists('deviceLabel', $b) && $b['deviceLabel'] !== null) {
            if (!is_string($b['deviceLabel'])) { throw new ApiException(400, 'invalid_request', 'Invalid deviceLabel.'); }
            $label = Util::clean($b['deviceLabel'], 60);
        }
        if (Spaces::membership($acc)) { throw new ApiException(409, 'conflict', 'You are already in a shared space.'); }

        $code = self::normalize($b['code']);
        $res = $code === null ? null : Db::tx(fn() => self::claim($acc, Util::hash($code)));
        if ($res === 'own') { throw new ApiException(400, 'invalid_request', 'You cannot accept your own invite.'); }
        if (!is_array($res)) {
            RateLimit::fail('pair_accept', $acc . '|' . $ip);
            RateLimit::fail('pair_accept_acc', $acc);
            throw new ApiException(404, 'not_found', 'This code is not valid or has expired.');
        }
        Audit::log('user', 'pair_accepted', $acc, $label !== null && $label !== '' ? ['device' => $label] : []);
        return Response::json(['space' => Spaces::view($res['space'], $res['member'])], 201);
    }

    /** @return array{space:string,member:string}|'own'|null */
    private static function claim(string $acc, string $hash): array|string|null
    {
        $inv = Db::one('SELECT id, account_id, expires_at, used_at, revoked_at FROM pair_invites WHERE code_hash = ?', [$hash]);
        $now = Util::now();
        if (!$inv || $inv['used_at'] !== null || $inv['revoked_at'] !== null || $inv['expires_at'] <= $now) { return null; }
        if ($inv['account_id'] === $acc) { return 'own'; }
        $inviter = Accounts::find($inv['account_id']);
        if (!$inviter || $inviter['status'] !== 'active' || Spaces::membership($inviter['id'])) { return null; }
        // The UPDATE is the atomic single-use claim.
        $n = Db::exec('UPDATE pair_invites SET used_at = ? WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ?', [$now, $inv['id'], $now]);
        if ($n !== 1) { return null; }
        $sid = Util::id('spc_');
        $m1 = Util::id('mem_');
        $m2 = Util::id('mem_');
        try {
            Db::exec('INSERT INTO spaces (id, created_at) VALUES (?, ?)', [$sid, $now]);
            Db::exec('INSERT INTO space_members (id, space_id, account_id, member_role, joined_at) VALUES (?, ?, ?, ?, ?)', [$m1, $sid, $inviter['id'], 'owner', $now]);
            Db::exec('INSERT INTO space_members (id, space_id, account_id, member_role, joined_at) VALUES (?, ?, ?, ?, ?)', [$m2, $sid, $acc, 'partner', $now]);
        } catch (\PDOException $e) {
            if (Db::isDuplicate($e)) { throw new ApiException(409, 'conflict', 'You are already in a shared space.'); }
            throw $e;
        }
        Db::exec('DELETE FROM space_ended WHERE account_id IN (?, ?)', [$acc, $inviter['id']]);
        Db::exec('UPDATE pair_invites SET revoked_at = ? WHERE account_id IN (?, ?) AND used_at IS NULL AND revoked_at IS NULL', [$now, $acc, $inviter['id']]);
        return ['space' => $sid, 'member' => $m2];
    }
}
