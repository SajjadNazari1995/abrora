<?php
declare(strict_types=1);
namespace Abra;

final class Config
{
    private static array $c = [];

    public static function load(?string $path = null): void
    {
        $root = dirname(__DIR__);
        $path = $path ?? (getenv('ABRA_CONFIG') ?: $root . '/config.php');
        if (!is_file($path)) { throw new \RuntimeException('Configuration file is missing.'); }
        $user = require $path;
        if (!is_array($user)) { throw new \RuntimeException('Configuration file must return an array.'); }
        $defaults = [
            'db' => ['dsn' => 'sqlite:' . $root . '/data/abra.sqlite', 'user' => null, 'pass' => null],
            'data_dir' => $root . '/data',
            'allowed_origins' => [],
            'trust_proxy' => false,
            'ip_header' => 'X-Forwarded-For',
            'service_tokens' => [],
            'google_client_ids' => [],
            'apple_client_ids' => [],
            'jwks_override' => [],
            'mail' => ['from' => 'no-reply@localhost', 'sink' => null, 'hook' => null],
            'app_base_url' => 'http://localhost',
            'consent_retention_days' => 1095,
            'backup_retention_days' => 35,
            'audit_retention_days' => 400,
            'pepper' => '',
            'argon' => ['memory_cost' => 65536, 'time_cost' => 3, 'threads' => 1],
            'rate_limits' => [
                // name => [max hits, window seconds]
                'global_ip' => [300, 60],
                'login_id' => [10, 900], 'login_ip' => [10, 900],
                'register_ip' => [5, 3600],
                'forgot_id' => [5, 3600], 'forgot_ip' => [5, 3600],
                'reset_ip' => [10, 900],
                'reauth' => [10, 900],
                'change' => [10, 900],
                'social_ip' => [20, 900],
                'telemetry_ip' => [30, 60],
                'admin_fail' => [20, 900],
                // v1.1 pairing
                'pair_accept' => [10, 900], 'pair_accept_acc' => [30, 900], 'pair_invite' => [10, 3600], 'space_msg' => [30, 60],
            ],
        ];
        $c = array_replace($defaults, $user);
        foreach (['db', 'mail', 'argon', 'rate_limits'] as $k) {
            $c[$k] = array_replace($defaults[$k], is_array($user[$k] ?? null) ? $user[$k] : []);
        }
        if (strlen((string) $c['pepper']) < 16) { throw new \RuntimeException('Configuration: "pepper" must be a random string of at least 16 characters.'); }
        self::$c = $c;
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return self::$c[$key] ?? $default;
    }
}
