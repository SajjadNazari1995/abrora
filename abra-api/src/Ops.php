<?php
declare(strict_types=1);
namespace Abra;

final class Ops
{
    public static function record(string $area, string $code, ?string $appVersion = null, ?string $route = null): void
    {
        try {
            Db::exec('INSERT INTO op_errors (occurred_at, area, code, app_version, route) VALUES (?, ?, ?, ?, ?)',
                [Util::now(), $area, $code, $appVersion, $route]);
        } catch (\Throwable) { /* never fail the request because of telemetry */ }
    }

    public static function telemetry(Request $req): Response
    {
        RateLimit::hit('telemetry_ip', $req->ip());
        $b = $req->json();
        $area = $b['area'] ?? null;
        $code = $b['code'] ?? null;
        $ver = $b['appVersion'] ?? null;
        if (!is_string($area) || !in_array($area, ['sync', 'auth', 'ui', 'sw'], true)) { throw new ApiException(400, 'invalid_request', 'Invalid area.'); }
        if (!is_string($code) || preg_match('/^[a-z0-9_]{1,40}$/', $code) !== 1) { throw new ApiException(400, 'invalid_request', 'Invalid code.'); }
        if ($ver !== null && !Util::semver($ver)) { throw new ApiException(400, 'invalid_request', 'Invalid appVersion.'); }
        self::record($area, $code, $ver);
        return Response::noContent();
    }
}
