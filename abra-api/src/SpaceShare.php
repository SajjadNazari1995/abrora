<?php
declare(strict_types=1);
namespace Abra;

/**
 * Selective sharing, consent history, encrypted chat and per-member public keys of a paired space.
 * Everything the partner can read is ciphertext the server cannot open; the server only enforces
 * who may read it and deletes it the moment sharing is switched off or the space ends.
 */
final class SpaceShare
{
    /** High-level summaries only. Raw diaries / symptom logs are not shareable by design. */
    public const CATEGORIES = ['phase', 'forecast', 'fertility', 'mood', 'symptoms', 'energy'];
    public const MAX_SHARE_BLOB = 4096;
    public const MAX_MSG_BLOB = 4096;
    public const MAX_MESSAGES = 2000;
    public const MAX_PUBKEY = 200;

    private static function paired(array $m): void
    {
        if (Spaces::memberCount($m['space_id']) < 2) { throw new ApiException(409, 'conflict', 'Your partner has not joined yet.'); }
    }

    private static function b64(mixed $v, int $max, string $name): string
    {
        if (!is_string($v) || $v === '') { throw new ApiException(400, 'invalid_request', "$name is required."); }
        if (strlen($v) > $max) { throw new ApiException(413, 'payload_too_large', "$name is too large."); }
        if (preg_match('/^[A-Za-z0-9_-]+$/', $v) !== 1) { throw new ApiException(400, 'invalid_request', "$name must be base64url."); }
        return $v;
    }

    private static function logConsent(string $sid, string $mem, string $action, ?string $cat): void
    {
        Db::exec('INSERT INTO space_consents (space_id, at, actor_member_id, action, category) VALUES (?, ?, ?, ?, ?)', [$sid, Util::now(), $mem, $action, $cat]);
    }

    // ---- member public key ----
    public static function putMemberKey(array $ctx, Request $req): Response
    {
        $m = Spaces::require($ctx);
        $pk = self::b64($req->json()['publicKey'] ?? null, self::MAX_PUBKEY, 'publicKey');
        $now = Util::now();
        $old = Db::val('SELECT public_key FROM space_member_keys WHERE member_id = ?', [$m['member_id']]);
        if ($old === null || $old === false) {
            try { Db::exec('INSERT INTO space_member_keys (member_id, public_key, updated_at) VALUES (?, ?, ?)', [$m['member_id'], $pk, $now]); }
            catch (\PDOException $e) { if (!Db::isDuplicate($e)) { throw $e; } Db::exec('UPDATE space_member_keys SET public_key = ?, updated_at = ? WHERE member_id = ?', [$pk, $now, $m['member_id']]); }
        } elseif ($old !== $pk) {
            Db::exec('UPDATE space_member_keys SET public_key = ?, updated_at = ? WHERE member_id = ?', [$pk, $now, $m['member_id']]);
            // A new key invalidates what the partner could read under the old one: the owner must re-share.
            Db::exec('UPDATE space_shares SET enabled = 0, ciphertext = NULL, meta = NULL WHERE member_id = ?', [$m['member_id']]);
        }
        Audit::log('user', 'space_member_key', $ctx['account']['id'], ['changed' => $old !== null && $old !== false && $old !== $pk]);
        return Response::json(['memberId' => $m['member_id'], 'updatedAt' => $now]);
    }

    /** Hex fingerprint of both public keys (order independent), or null while a key is missing. */
    public static function fingerprint(string $spaceId): ?string
    {
        $keys = array_column(Db::all('SELECT k.public_key FROM space_members m JOIN space_member_keys k ON k.member_id = m.id WHERE m.space_id = ?', [$spaceId]), 'public_key');
        if (count($keys) < 2) { return null; }
        sort($keys, SORT_STRING);
        return substr(hash('sha256', implode('|', $keys)), 0, 40);
    }

    // ---- shares ----
    public static function putShare(array $ctx, Request $req, string $cat): Response
    {
        if (!in_array($cat, self::CATEGORIES, true)) { throw new ApiException(404, 'not_found', 'Unknown category.'); }
        $m = Spaces::require($ctx);
        self::paired($m);
        $b = $req->json();
        if (!is_bool($b['enabled'] ?? null)) { throw new ApiException(400, 'invalid_request', 'enabled must be true or false.'); }
        $sid = $m['space_id'];
        $now = Util::now();
        return Db::tx(function () use ($b, $m, $sid, $cat, $now) {
            $was = Db::one('SELECT enabled FROM space_shares WHERE space_id = ? AND member_id = ? AND category = ?', [$sid, $m['member_id'], $cat]);
            if ($b['enabled'] === false) {
                if ($was) {
                    // Switching off deletes the ciphertext immediately.
                    Db::exec('UPDATE space_shares SET enabled = 0, ciphertext = NULL, meta = NULL, updated_at = ? WHERE space_id = ? AND member_id = ? AND category = ?', [$now, $sid, $m['member_id'], $cat]);
                    if ((int) $was['enabled'] === 1) { self::logConsent($sid, $m['member_id'], 'disable', $cat); }
                }
                return Response::json(['category' => $cat, 'enabled' => false, 'updatedAt' => $now]);
            }
            $blob = self::b64($b['blob'] ?? null, self::MAX_SHARE_BLOB, 'blob');
            $kv = $b['keyVersion'] ?? null;
            if (!is_int($kv) || $kv < 1 || $kv > SpaceData::MAX_KEY_VERSION) { throw new ApiException(400, 'invalid_request', 'keyVersion is invalid.'); }
            if ($was) {
                Db::exec('UPDATE space_shares SET enabled = 1, ciphertext = ?, key_version = ?, updated_at = ? WHERE space_id = ? AND member_id = ? AND category = ?', [$blob, $kv, $now, $sid, $m['member_id'], $cat]);
            } else {
                Db::exec('INSERT INTO space_shares (space_id, member_id, category, enabled, ciphertext, key_version, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?)', [$sid, $m['member_id'], $cat, $blob, $kv, $now]);
            }
            if (!$was || (int) $was['enabled'] === 0) { self::logConsent($sid, $m['member_id'], 'enable', $cat); }
            return Response::json(['category' => $cat, 'enabled' => true, 'updatedAt' => $now]);
        });
    }

    public static function listShares(array $ctx): Response
    {
        $m = Spaces::require($ctx);
        $mine = [];
        $theirs = [];
        foreach (Db::all('SELECT member_id, category, enabled, ciphertext, key_version, updated_at FROM space_shares WHERE space_id = ? ORDER BY category', [$m['space_id']]) as $r) {
            if ($r['member_id'] === $m['member_id']) {
                $mine[] = ['category' => $r['category'], 'enabled' => (int) $r['enabled'] === 1, 'updatedAt' => $r['updated_at']];
            } elseif ((int) $r['enabled'] === 1 && $r['ciphertext'] !== null) {
                $theirs[] = ['category' => $r['category'], 'blob' => $r['ciphertext'], 'keyVersion' => (int) $r['key_version'], 'updatedAt' => $r['updated_at']];
            }
        }
        return Response::json(['categories' => self::CATEGORIES, 'mine' => $mine, 'partner' => $theirs]);
    }

    public static function consents(array $ctx): Response
    {
        $m = Spaces::require($ctx);
        $out = [];
        foreach (Db::all('SELECT at, actor_member_id, action, category FROM space_consents WHERE space_id = ? ORDER BY id DESC LIMIT 200', [$m['space_id']]) as $r) {
            $out[] = ['at' => $r['at'], 'by' => $r['actor_member_id'] === $m['member_id'] ? 'you' : 'partner', 'action' => $r['action'], 'category' => $r['category']];
        }
        return Response::json(['history' => $out]);
    }

    // ---- chat (text + sticker only) ----
    public static function postMessage(array $ctx, Request $req): Response
    {
        $m = Spaces::require($ctx);
        self::paired($m);
        $b = $req->json();
        $kind = $b['kind'] ?? null;
        if ($kind !== 'text' && $kind !== 'sticker') { throw new ApiException(400, 'invalid_request', 'kind must be text or sticker.'); }
        $blob = self::b64($b['blob'] ?? null, self::MAX_MSG_BLOB, 'blob');
        $cid = $b['clientId'] ?? null;
        if (!is_string($cid) || preg_match('/^[A-Za-z0-9_-]{8,40}$/', $cid) !== 1) { throw new ApiException(400, 'invalid_request', 'clientId is invalid.'); }
        $sid = $m['space_id'];
        $dup = Db::one('SELECT id, created_at FROM space_messages WHERE space_id = ? AND sender_member_id = ? AND client_id = ?', [$sid, $m['member_id'], $cid]);
        if ($dup) { return Response::json(['id' => (int) $dup['id'], 'createdAt' => $dup['created_at'], 'duplicate' => true]); }
        RateLimit::hit('space_msg', $ctx['account']['id']);
        $now = Util::now();
        return Db::tx(function () use ($sid, $m, $kind, $blob, $cid, $now) {
            Db::exec('INSERT INTO space_messages (space_id, sender_member_id, kind, ciphertext, client_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', [$sid, $m['member_id'], $kind, $blob, $cid, $now]);
            $id = (int) Db::lastId();
            $over = (int) Db::val('SELECT COUNT(*) FROM space_messages WHERE space_id = ?', [$sid]) - self::MAX_MESSAGES;
            if ($over > 0) {
                Db::exec('DELETE FROM space_messages WHERE space_id = ? AND id <= (SELECT mx FROM (SELECT MIN(id) + ? AS mx FROM space_messages WHERE space_id = ?) t)', [$sid, $over - 1, $sid]);
            }
            return Response::json(['id' => $id, 'createdAt' => $now], 201);
        });
    }

    public static function listMessages(array $ctx, Request $req): Response
    {
        $m = Spaces::require($ctx);
        $after = (int) ($req->query['after'] ?? 0);
        $limit = max(1, min(100, (int) ($req->query['limit'] ?? 50)));
        $out = [];
        foreach (Db::all('SELECT id, sender_member_id, kind, ciphertext, created_at FROM space_messages WHERE space_id = ? AND id > ? ORDER BY id LIMIT ' . $limit, [$m['space_id'], $after]) as $r) {
            $out[] = ['id' => (int) $r['id'], 'mine' => $r['sender_member_id'] === $m['member_id'], 'kind' => $r['kind'], 'blob' => $r['ciphertext'], 'createdAt' => $r['created_at']];
        }
        return Response::json(['messages' => $out]);
    }

    public static function deleteMessage(array $ctx, string $id): Response
    {
        $m = Spaces::require($ctx);
        $n = Db::exec('DELETE FROM space_messages WHERE id = ? AND space_id = ? AND sender_member_id = ?', [(int) $id, $m['space_id'], $m['member_id']]);
        if ($n !== 1) { throw new ApiException(404, 'not_found', 'Message not found.'); }
        return Response::json(['deleted' => true]);
    }

    // ---- ended notice ----
    public static function ackEnded(array $ctx): Response
    {
        $n = Db::exec('DELETE FROM space_ended WHERE account_id = ?', [$ctx['account']['id']]);
        if ($n !== 1) { throw new ApiException(404, 'not_found', 'Nothing to acknowledge.'); }
        return Response::json(['ok' => true]);
    }

    /** Aggregate-only numbers for the admin stats. */
    public static function stats(): array
    {
        return [
            'messages' => (int) Db::val('SELECT COUNT(*) FROM space_messages'),
            'activeShares' => (int) Db::val('SELECT COUNT(*) FROM space_shares WHERE enabled = 1'),
            'endedPending' => (int) Db::val('SELECT COUNT(*) FROM space_ended'),
        ];
    }
}
