<?php
declare(strict_types=1);
namespace Abra;

/** Shared ciphertext vault and key-wrap envelopes of a space. The server never parses blob, meta or wrappedKey. */
final class SpaceData
{
    public const MAX_WRAPPED = 1024;
    public const MAX_KEY_VERSION = 1000000;
    public const MAX_ENVELOPES = 100;

    public static function getVault(array $ctx): Response
    {
        $m = Spaces::require($ctx);
        $r = Db::one('SELECT version, ciphertext, meta, updated_by, updated_at FROM space_vaults WHERE space_id = ?', [$m['space_id']]);
        if (!$r) { throw new ApiException(404, 'not_found', 'No shared vault.'); }
        $meta = json_decode((string) $r['meta'], true);
        return Response::json(['version' => (int) $r['version'], 'updatedAt' => $r['updated_at'], 'updatedBy' => $r['updated_by'], 'blob' => $r['ciphertext'],
            'meta' => is_array($meta) && $meta !== [] ? $meta : new \stdClass()]);
    }

    public static function putVault(array $ctx, Request $req): Response
    {
        $m = Spaces::require($ctx);
        [$base, $blob, $metaJson] = Vault::parse($req);
        $sid = $m['space_id'];
        $now = Util::now();
        if ($base === 0) {
            try {
                Db::exec('INSERT INTO space_vaults (space_id, version, ciphertext, meta, updated_by, updated_at) VALUES (?, 1, ?, ?, ?, ?)', [$sid, $blob, $metaJson, $m['member_id'], $now]);
                return Response::json(['version' => 1, 'updatedAt' => $now]);
            } catch (\PDOException $e) {
                if (!Db::isDuplicate($e)) { throw $e; }
                throw self::conflict($sid);
            }
        }
        $n = Db::exec('UPDATE space_vaults SET version = version + 1, ciphertext = ?, meta = ?, updated_by = ?, updated_at = ? WHERE space_id = ? AND version = ?', [$blob, $metaJson, $m['member_id'], $now, $sid, $base]);
        if ($n !== 1) { throw self::conflict($sid); }
        return Response::json(['version' => $base + 1, 'updatedAt' => $now]);
    }

    private static function conflict(string $sid): ApiException
    {
        $cur = (int) Db::val('SELECT version FROM space_vaults WHERE space_id = ?', [$sid]);
        return new ApiException(409, 'conflict', 'The shared vault changed on another device.', ['currentVersion' => $cur]);
    }

    public static function putKey(array $ctx, Request $req): Response
    {
        $m = Spaces::require($ctx);
        $b = $req->json();
        $rcpt = $b['recipientMemberId'] ?? null;
        if (!Spaces::memId($rcpt)) { throw new ApiException(400, 'invalid_request', 'recipientMemberId is invalid.'); }
        $kv = $b['keyVersion'] ?? null;
        if (!is_int($kv) || $kv < 1 || $kv > self::MAX_KEY_VERSION) { throw new ApiException(400, 'invalid_request', 'keyVersion must be an integer from 1 to ' . self::MAX_KEY_VERSION . '.'); }
        $wk = $b['wrappedKey'] ?? null;
        if (!is_string($wk) || $wk === '') { throw new ApiException(400, 'invalid_request', 'wrappedKey is required.'); }
        if (strlen($wk) > self::MAX_WRAPPED) { throw new ApiException(413, 'payload_too_large', 'wrappedKey is too large.'); }
        if (preg_match('/^[A-Za-z0-9_-]+$/', $wk) !== 1) { throw new ApiException(400, 'invalid_request', 'wrappedKey must be base64url.'); }
        if ($rcpt === $m['member_id']) { throw new ApiException(400, 'invalid_request', 'Wrap the key for your partner, not for yourself.'); }

        $sid = $m['space_id'];
        $now = Util::now();
        return Db::tx(function () use ($m, $sid, $rcpt, $kv, $wk, $now) {
            if (!Db::one('SELECT 1 AS x FROM space_members WHERE id = ? AND space_id = ?', [$rcpt, $sid])) { throw new ApiException(404, 'not_found', 'Recipient not found.'); }
            $ex = Db::one('SELECT sender_member_id FROM space_keys WHERE space_id = ? AND recipient_member_id = ? AND key_version = ?', [$sid, $rcpt, $kv]);
            if ($ex) {
                // Only the original sender may overwrite (or anyone, if that sender has left the space).
                if ($ex['sender_member_id'] !== null && $ex['sender_member_id'] !== $m['member_id']) { throw new ApiException(409, 'conflict', 'This key version was already sent by another member.'); }
                Db::exec('UPDATE space_keys SET wrapped_key = ?, sender_member_id = ?, updated_at = ? WHERE space_id = ? AND recipient_member_id = ? AND key_version = ?', [$wk, $m['member_id'], $now, $sid, $rcpt, $kv]);
                return Response::json(['recipientMemberId' => $rcpt, 'keyVersion' => $kv, 'updatedAt' => $now]);
            }
            if ((int) Db::val('SELECT COUNT(*) FROM space_keys WHERE space_id = ?', [$sid]) >= self::MAX_ENVELOPES) { throw new ApiException(409, 'conflict', 'Too many key envelopes in this space.'); }
            try {
                Db::exec('INSERT INTO space_keys (space_id, recipient_member_id, key_version, sender_member_id, wrapped_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [$sid, $rcpt, $kv, $m['member_id'], $wk, $now, $now]);
            } catch (\PDOException $e) {
                if (Db::isDuplicate($e)) { throw new ApiException(409, 'conflict', 'This key version was already sent.'); }
                throw $e;
            }
            return Response::json(['recipientMemberId' => $rcpt, 'keyVersion' => $kv, 'updatedAt' => $now], 201);
        });
    }

    /** Only envelopes addressed to the caller. */
    public static function listKeys(array $ctx): Response
    {
        $m = Spaces::require($ctx);
        $out = [];
        foreach (Db::all('SELECT key_version, sender_member_id, wrapped_key, updated_at FROM space_keys WHERE space_id = ? AND recipient_member_id = ? ORDER BY key_version', [$m['space_id'], $m['member_id']]) as $r) {
            $out[] = ['keyVersion' => (int) $r['key_version'], 'senderMemberId' => $r['sender_member_id'], 'wrappedKey' => $r['wrapped_key'], 'updatedAt' => $r['updated_at']];
        }
        return Response::json(['memberId' => $m['member_id'], 'keys' => $out]);
    }
}
