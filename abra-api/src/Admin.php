<?php
declare(strict_types=1);
namespace Abra;

final class Admin
{
    public const SCOPES = ['stats:read', 'accounts:read', 'accounts:status', 'release:read', 'release:write', 'ops:read'];

    /** @return array{admin:string} */
    public static function authorize(Request $req, string $scope): array
    {
        $ip = $req->ip();
        RateLimit::check('admin_fail', $ip);
        $given = $req->header('X-Abrora-Service-Token');
        $hash = is_string($given) && $given !== '' && strlen($given) <= 256 ? Util::hash($given) : null;
        $found = null;
        foreach ((array) Config::get('service_tokens', []) as $t) {
            // Compare against every configured token (no early exit) in constant time.
            if ($hash !== null && is_array($t) && is_string($t['hash'] ?? null) && hash_equals(strtolower($t['hash']), $hash)) { $found = $t; }
        }
        if ($found === null) {
            RateLimit::fail('admin_fail', $ip);
            throw new ApiException(401, 'unauthorized', 'Service token required.');
        }
        $ips = (array) ($found['ips'] ?? []);
        if ($ips !== [] && !in_array($ip, $ips, true)) { throw new ApiException(403, 'forbidden', 'Not allowed from this address.'); }
        if (!in_array($scope, (array) ($found['scopes'] ?? []), true)) { throw new ApiException(403, 'forbidden', 'This token does not have the required scope.'); }
        return ['admin' => (string) ($found['name'] ?? 'admin')];
    }

    private static function limit(Request $req, int $def = 50, int $max = 200): int
    {
        $l = $req->query['limit'] ?? null;
        if ($l === null) { return $def; }
        if (!is_string($l) || preg_match('/^\d{1,4}$/', $l) !== 1 || (int) $l < 1 || (int) $l > $max) { throw new ApiException(400, 'invalid_request', "limit must be 1 to $max."); }
        return (int) $l;
    }

    private static function counts(string $sql, array $keys, array $p = []): array
    {
        $out = array_fill_keys($keys, 0);
        foreach (Db::all($sql, $p) as $r) {
            $k = (string) $r['k'];
            if (array_key_exists($k, $out)) { $out[$k] = (int) $r['n']; }
        }
        return $out;
    }

    public static function stats(): Response
    {
        $d7 = Util::plus(-7 * 86400);
        $d30 = Util::plus(-30 * 86400);
        $legal = Settings::legal();
        $cur = static fn(string $doc): int => (int) Db::val("SELECT COUNT(DISTINCT account_ref) FROM consents WHERE doc_id = ? AND version >= ? AND account_ref LIKE 'acc%'", [$doc, (string) ($legal[$doc] ?? '')]);
        $byProv = self::counts('SELECT provider AS k, COUNT(*) AS n FROM identities GROUP BY provider', ['google', 'apple']);
        $byProv = ['email' => (int) Db::val('SELECT COUNT(*) FROM accounts WHERE password_hash IS NOT NULL')] + $byProv;
        return Response::json([
            'generatedAt' => Util::now(),
            'accounts' => [
                'total' => (int) Db::val('SELECT COUNT(*) FROM accounts'),
                'active' => (int) Db::val("SELECT COUNT(*) FROM accounts WHERE status = 'active'"),
                'suspended' => (int) Db::val("SELECT COUNT(*) FROM accounts WHERE status = 'suspended'"),
                'new7d' => (int) Db::val('SELECT COUNT(*) FROM accounts WHERE created_at >= ?', [$d7]),
                'new30d' => (int) Db::val('SELECT COUNT(*) FROM accounts WHERE created_at >= ?', [$d30]),
                'active7d' => (int) Db::val('SELECT COUNT(*) FROM accounts WHERE last_seen_at >= ?', [$d7]),
                'byProvider' => $byProv,
                'byLocale' => self::counts('SELECT locale AS k, COUNT(*) AS n FROM accounts GROUP BY locale', ['en', 'fa', 'de']),
                'byCalendar' => self::counts('SELECT calendar AS k, COUNT(*) AS n FROM accounts GROUP BY calendar', ['gregorian', 'jalali']),
            ],
            'devices' => [
                'total' => (int) Db::val('SELECT COUNT(*) FROM devices WHERE revoked_at IS NULL'),
                'byPlatform' => self::counts('SELECT platform AS k, COUNT(*) AS n FROM devices WHERE revoked_at IS NULL GROUP BY platform', ['ios', 'android', 'web']),
            ],
            'vault' => ['accounts' => (int) Db::val('SELECT COUNT(*) FROM vaults'), 'bytes' => (int) Db::val('SELECT COALESCE(SUM(LENGTH(ciphertext)), 0) FROM vaults')],
            'consents' => [
                'termsCurrent' => $cur('terms'),
                'privacyCurrent' => $cur('privacy'),
                'analyticsGranted' => (int) Db::val("SELECT COUNT(*) FROM consents c WHERE c.consent_key = 'analytics' AND c.granted = 1 AND c.account_ref LIKE 'acc%' AND c.id = (SELECT MAX(c2.id) FROM consents c2 WHERE c2.account_ref = c.account_ref AND c2.consent_key = 'analytics')"),
            ],
            'spaces' => Spaces::stats(),
            'spaceActivity' => SpaceShare::stats(),
            'errors24h' => (int) Db::val('SELECT COUNT(*) FROM op_errors WHERE occurred_at >= ?', [Util::plus(-86400)]),
        ]);
    }

    public static function accounts(Request $req): Response
    {
        $limit = self::limit($req, 50, 100);
        $where = [];
        $args = [];
        $status = $req->query['status'] ?? '';
        if ($status !== '') {
            if (!is_string($status) || !in_array($status, ['active', 'suspended'], true)) { throw new ApiException(400, 'invalid_request', 'Invalid status.'); }
            $where[] = 'status = ?'; $args[] = $status;
        }
        $cursor = $req->query['cursor'] ?? '';
        if ($cursor !== '') {
            $raw = is_string($cursor) ? Util::b64uDecode($cursor) : null;
            $parts = $raw !== null ? explode('|', $raw) : [];
            if (count($parts) !== 2 || Util::parseIso($parts[0]) === null || !Util::accId($parts[1])) { throw new ApiException(400, 'invalid_request', 'Invalid cursor.'); }
            $where[] = '(created_at < ? OR (created_at = ? AND id < ?))';
            array_push($args, $parts[0], $parts[0], $parts[1]);
        }
        $sql = 'SELECT id, email_norm, status, locale, created_at, last_seen_at,'
            . ' (SELECT COUNT(*) FROM devices d WHERE d.account_id = accounts.id AND d.revoked_at IS NULL) AS dev,'
            . ' (SELECT COUNT(*) FROM vaults v WHERE v.account_id = accounts.id) AS hv,'
            . ' (CASE WHEN password_hash IS NULL THEN 0 ELSE 1 END) AS haspw'
            . ' FROM accounts' . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
            . ' ORDER BY created_at DESC, id DESC LIMIT ' . ($limit + 1);
        $rows = Db::all($sql, $args);
        $next = null;
        if (count($rows) > $limit) {
            array_pop($rows);
            $last = end($rows);
            $next = Util::b64u($last['created_at'] . '|' . $last['id']);
        }
        $prov = [];
        if ($rows) {
            $ids = array_column($rows, 'id');
            $in = implode(',', array_fill(0, count($ids), '?'));
            foreach (Db::all("SELECT account_id, provider FROM identities WHERE account_id IN ($in)", $ids) as $r) { $prov[$r['account_id']][] = $r['provider']; }
        }
        $out = [];
        foreach ($rows as $r) {
            $p = $prov[$r['id']] ?? [];
            sort($p);
            if ((int) $r['haspw'] === 1) { array_unshift($p, 'email'); }
            $out[] = ['id' => $r['id'], 'emailMasked' => Util::maskEmail($r['email_norm']), 'providers' => $p, 'status' => $r['status'], 'locale' => $r['locale'],
                'createdAt' => $r['created_at'], 'lastSeenAt' => $r['last_seen_at'], 'devices' => (int) $r['dev'], 'hasVault' => (int) $r['hv'] > 0];
        }
        return Response::json(['accounts' => $out, 'next' => $next]);
    }

    public static function setStatus(array $ctx, Request $req, string $id): Response
    {
        if (!Util::accId($id) || !Accounts::find($id)) { throw new ApiException(404, 'not_found', 'Account not found.'); }
        $b = $req->json();
        $st = $b['status'] ?? null;
        if (!is_string($st) || !in_array($st, ['active', 'suspended'], true)) { throw new ApiException(400, 'invalid_request', 'status must be active or suspended.'); }
        $reason = $b['reason'] ?? '';
        if (!is_string($reason) || mb_strlen($reason) > 200) { throw new ApiException(400, 'invalid_request', 'reason must be at most 200 characters.'); }
        Db::tx(function () use ($id, $st) {
            Db::exec('UPDATE accounts SET status = ? WHERE id = ?', [$st, $id]);
            if ($st === 'suspended') { Auth::revokeSessions($id); }
        });
        Audit::log('admin', 'account_status', $id, ['status' => $st, 'reason' => Util::clean($reason, 200), 'admin' => $ctx['admin']]);
        return Response::noContent();
    }

    /* ---------- release / legal ---------- */

    private static function loc(mixed $v, string $field): array
    {
        if (!is_array($v)) { throw new ApiException(400, 'invalid_request', "$field must be an object with en, fa and de."); }
        $out = [];
        foreach (['en', 'fa', 'de'] as $l) {
            $s = $v[$l] ?? '';
            if (!is_string($s) || mb_strlen($s) > 2000) { throw new ApiException(400, 'invalid_request', "$field.$l must be a string of at most 2000 characters."); }
            $out[$l] = trim(preg_replace('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f<>]/u', '', $s) ?? '');
        }
        return $out;
    }

    public static function release(): Response { return Response::json(Settings::get('release')); }

    public static function putRelease(array $ctx, Request $req): Response
    {
        $b = $req->json();
        foreach (['latest', 'minSupported'] as $k) {
            if (!Util::semver($b[$k] ?? null)) { throw new ApiException(400, 'invalid_request', "$k must look like 1.2.3."); }
        }
        if (version_compare($b['minSupported'], $b['latest'], '>')) { throw new ApiException(400, 'invalid_request', 'minSupported cannot be higher than latest.'); }
        $rel = ['latest' => $b['latest'], 'minSupported' => $b['minSupported'], 'notes' => self::loc($b['notes'] ?? [], 'notes'), 'message' => self::loc($b['message'] ?? [], 'message')];
        Settings::set('release', $rel);
        Audit::log('admin', 'release_updated', null, ['latest' => $rel['latest'], 'minSupported' => $rel['minSupported'], 'admin' => $ctx['admin']]);
        return Response::json($rel);
    }

    public static function legal(): Response
    {
        $docs = [];
        foreach (Settings::legal() as $id => $v) { $docs[] = ['id' => $id, 'version' => $v]; }
        return Response::json(['documents' => $docs]);
    }

    public static function putLegal(array $ctx, Request $req): Response
    {
        $b = $req->json();
        $docs = $b['documents'] ?? null;
        if (!is_array($docs) || !array_is_list($docs) || $docs === [] || count($docs) > 10) { throw new ApiException(400, 'invalid_request', 'documents must be a non-empty list.'); }
        $cur = Settings::legal();
        $new = $cur;
        foreach ($docs as $d) {
            $id = is_array($d) ? ($d['id'] ?? null) : null;
            $v = is_array($d) ? ($d['version'] ?? null) : null;
            if (!is_string($id) || !in_array($id, Settings::REQUIRED_DOCS, true)) { throw new ApiException(400, 'invalid_request', 'Unknown document id.'); }
            if (!is_string($v) || preg_match('/^[0-9A-Za-z._-]{1,32}$/', $v) !== 1) { throw new ApiException(400, 'invalid_request', 'Invalid version.'); }
            if (strcmp($v, (string) $cur[$id]) < 0) { throw new ApiException(400, 'invalid_request', 'A document version cannot go backwards.'); }
            $new[$id] = $v;
        }
        Settings::set('legal', $new);
        Audit::log('admin', 'legal_updated', null, ['docs' => implode(',', array_keys($new)), 'admin' => $ctx['admin']]);
        return self::legal();
    }

    /* ---------- ops ---------- */

    public static function errors(Request $req): Response
    {
        $out = [];
        foreach (Db::all('SELECT occurred_at, area, code, app_version, route FROM op_errors ORDER BY id DESC LIMIT ' . self::limit($req)) as $r) {
            $out[] = ['at' => $r['occurred_at'], 'area' => $r['area'], 'code' => $r['code'], 'appVersion' => $r['app_version'], 'route' => $r['route']];
        }
        return Response::json(['errors' => $out]);
    }

    public static function audit(Request $req): Response
    {
        $out = [];
        foreach (Db::all('SELECT occurred_at, actor, action, target, meta_json FROM audit ORDER BY id DESC LIMIT ' . self::limit($req)) as $r) {
            $m = json_decode((string) $r['meta_json'], true);
            $out[] = ['at' => $r['occurred_at'], 'action' => $r['action'], 'actor' => $r['actor'], 'target' => $r['target'], 'meta' => is_array($m) && $m ? $m : new \stdClass()];
        }
        return Response::json(['events' => $out]);
    }
}
