<?php
declare(strict_types=1);
namespace Abra;

/** Opaque ciphertext store. Never parses or logs blob/meta. */
final class Vault
{
    public const MAX_BLOB = 6 * 1024 * 1024;
    public const MAX_META = 8192;
    /** Router body limit for PUT: blob + JSON overhead. */
    public const MAX_BODY = self::MAX_BLOB + 16384;

    public static function exists(string $accountId): bool
    {
        return Db::val('SELECT 1 FROM vaults WHERE account_id = ?', [$accountId]) !== null;
    }

    public static function get(array $ctx): Response
    {
        $r = Db::one('SELECT version, ciphertext, meta, updated_at FROM vaults WHERE account_id = ?', [$ctx['account']['id']]);
        if (!$r) { throw new ApiException(404, 'not_found', 'No vault.'); }
        $meta = json_decode((string) $r['meta'], true);
        return Response::json(['version' => (int) $r['version'], 'updatedAt' => $r['updated_at'], 'blob' => $r['ciphertext'], 'meta' => is_array($meta) && $meta !== [] ? $meta : new \stdClass()]);
    }

    /** Validate a PUT body. @return array{0:int,1:string,2:string} baseVersion, blob, metaJson */
    public static function parse(Request $req): array
    {
        $b = $req->json();
        $base = $b['baseVersion'] ?? null;
        if (!is_int($base) || $base < 0) { throw new ApiException(400, 'invalid_request', 'baseVersion must be a non-negative integer.'); }
        $blob = $b['blob'] ?? null;
        if (!is_string($blob) || $blob === '') { throw new ApiException(400, 'invalid_request', 'blob is required.'); }
        if (strlen($blob) > self::MAX_BLOB) { throw new ApiException(413, 'payload_too_large', 'Vault is too large.'); }
        if (preg_match('/^[A-Za-z0-9_-]+$/', $blob) !== 1) { throw new ApiException(400, 'invalid_request', 'blob must be base64url.'); }
        $meta = $b['meta'] ?? [];
        if (!is_array($meta) || ($meta !== [] && array_is_list($meta))) { throw new ApiException(400, 'invalid_request', 'meta must be a JSON object.'); }
        $metaJson = json_encode((object) $meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($metaJson === false || strlen($metaJson) > self::MAX_META) { throw new ApiException(413, 'payload_too_large', 'meta is too large.'); }
        return [$base, $blob, $metaJson];
    }

    public static function put(array $ctx, Request $req): Response
    {
        [$base, $blob, $metaJson] = self::parse($req);

        $acc = $ctx['account']['id'];
        $now = Util::now();
        if ($base === 0) {
            try {
                Db::exec('INSERT INTO vaults (account_id, version, ciphertext, meta, updated_at) VALUES (?, 1, ?, ?, ?)', [$acc, $blob, $metaJson, $now]);
                return Response::json(['version' => 1, 'updatedAt' => $now]);
            } catch (\PDOException $e) {
                if (!Db::isDuplicate($e)) { throw $e; }
                throw self::conflict($acc);
            }
        }
        $n = Db::exec('UPDATE vaults SET version = version + 1, ciphertext = ?, meta = ?, updated_at = ? WHERE account_id = ? AND version = ?', [$blob, $metaJson, $now, $acc, $base]);
        if ($n !== 1) { throw self::conflict($acc); }
        return Response::json(['version' => $base + 1, 'updatedAt' => $now]);
    }

    private static function conflict(string $acc): ApiException
    {
        $cur = (int) Db::val('SELECT version FROM vaults WHERE account_id = ?', [$acc]);
        return new ApiException(409, 'conflict', 'The vault changed on another device.', ['currentVersion' => $cur]);
    }

    public static function delete(array $ctx): Response
    {
        Db::exec('DELETE FROM vaults WHERE account_id = ?', [$ctx['account']['id']]);
        return Response::noContent();
    }
}
