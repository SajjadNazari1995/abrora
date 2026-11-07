<?php
declare(strict_types=1);
namespace Abra;

final class Devices
{
    public const CAP = 25;

    /** Sanitised {label, platform}. */
    public static function input(mixed $d): array
    {
        $d = is_array($d) ? $d : [];
        $label = Util::clean($d['label'] ?? '', 60);
        $platform = is_string($d['platform'] ?? null) && in_array($d['platform'], ['ios', 'android', 'web'], true) ? $d['platform'] : 'web';
        return ['label' => $label !== '' ? $label : 'Unnamed device', 'platform' => $platform];
    }

    public static function create(string $accountId, array $d, ?string $publicKey = null): string
    {
        $id = Util::id('dev_');
        $now = Util::now();
        Db::exec('INSERT INTO devices (id, account_id, label, platform, public_key, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$id, $accountId, $d['label'], $d['platform'], $publicKey, $now, $now]);
        return $id;
    }

    public static function activeCount(string $accountId): int
    {
        return (int) Db::val('SELECT COUNT(*) FROM devices WHERE account_id = ? AND revoked_at IS NULL', [$accountId]);
    }

    public static function revoke(string $deviceId): void
    {
        $now = Util::now();
        Db::exec('UPDATE devices SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL', [$now, $deviceId]);
        Db::exec('UPDATE sessions SET revoked_at = ? WHERE device_id = ? AND revoked_at IS NULL', [$now, $deviceId]);
    }

    /** Make room for a new device by revoking the least recently used one. */
    public static function evictIfFull(string $accountId): void
    {
        while (self::activeCount($accountId) >= self::CAP) {
            $old = Db::val('SELECT id FROM devices WHERE account_id = ? AND revoked_at IS NULL ORDER BY last_seen_at ASC, created_at ASC LIMIT 1', [$accountId]);
            if ($old === null) { break; }
            self::revoke((string) $old);
        }
    }

    public static function list(array $ctx): Response
    {
        $out = [];
        foreach (Db::all('SELECT id, label, platform, created_at, last_seen_at FROM devices WHERE account_id = ? AND revoked_at IS NULL ORDER BY created_at ASC, id ASC', [$ctx['account']['id']]) as $r) {
            $out[] = ['id' => $r['id'], 'label' => $r['label'], 'platform' => $r['platform'], 'createdAt' => $r['created_at'], 'lastSeenAt' => $r['last_seen_at'], 'current' => $r['id'] === $ctx['session']['device_id']];
        }
        return Response::json(['devices' => $out]);
    }

    public static function add(array $ctx, Request $req): Response
    {
        $b = $req->json();
        $pk = null;
        if (isset($b['publicKey'])) {
            if (!is_string($b['publicKey']) || strlen($b['publicKey']) > 512 || Util::b64uDecode($b['publicKey']) === null) {
                throw new ApiException(400, 'invalid_request', 'Invalid publicKey.');
            }
            $pk = $b['publicKey'];
        }
        $acc = $ctx['account']['id'];
        if (self::activeCount($acc) >= self::CAP) { throw new ApiException(409, 'conflict', 'Device limit reached. Remove a device first.'); }
        $d = self::input($b);
        $id = self::create($acc, $d, $pk);
        $row = Db::one('SELECT id, label, platform, created_at, last_seen_at FROM devices WHERE id = ?', [$id]);
        return Response::json(['device' => ['id' => $id, 'label' => $row['label'], 'platform' => $row['platform'], 'createdAt' => $row['created_at'], 'lastSeenAt' => $row['last_seen_at'], 'current' => false]], 201);
    }

    public static function remove(array $ctx, string $id): Response
    {
        if (!Util::devId($id)) { throw new ApiException(404, 'not_found', 'Device not found.'); }
        $own = Db::val('SELECT id FROM devices WHERE id = ? AND account_id = ? AND revoked_at IS NULL', [$id, $ctx['account']['id']]);
        if ($own === null) { throw new ApiException(404, 'not_found', 'Device not found.'); }
        self::revoke($id);
        Audit::log('user', 'device_revoked', $ctx['account']['id']);
        return Response::noContent();
    }
}
