<?php
/*
 * Abra Core API configuration.
 * Copy this file to config.php (next to /src), edit, and keep it OUT of the web root.
 * Alternatively point the ABRA_CONFIG environment variable at a config file elsewhere.
 */
return [
    // SQLite for small installs, or MySQL/MariaDB (run schema via: php bin/migrate.php).
    'db' => [
        'dsn' => 'sqlite:' . __DIR__ . '/data/abra.sqlite',
        // 'dsn' => 'mysql:host=localhost;dbname=abra;charset=utf8mb4', 'user' => 'abra', 'pass' => '...',
    ],
    'data_dir' => __DIR__ . '/data',

    // REQUIRED: long random secret (>= 16 chars). Used for tombstones and rate-limit keys. Never change it after launch.
    'pepper' => 'CHANGE-ME-to-a-long-random-string',

    // Browser origins allowed to call the API (exact match, no trailing slash).
    'allowed_origins' => ['https://app.example.com'],

    // Behind a reverse proxy / CDN only: trust the last entry of this header for the client IP.
    'trust_proxy' => false,
    'ip_header' => 'X-Forwarded-For',

    // Google / Apple sign-in. Leave empty to disable the provider.
    'google_client_ids' => [],   // e.g. ['1234-abc.apps.googleusercontent.com']
    'apple_client_ids' => [],    // e.g. ['com.example.abra']  (bundle id or Services ID)
    // 'jwks_override' => ['google' => '/path/to/jwks.json'],   // tests / air-gapped installs

    // Control Center tokens. Create one with: php bin/make-service-token.php control-center stats:read,accounts:read
    'service_tokens' => [
        // ['name' => 'control-center', 'hash' => 'sha256-hex', 'scopes' => ['stats:read', 'accounts:read'], 'ips' => []],
    ],

    'mail' => [
        'from' => 'no-reply@example.com',
        'sink' => null,   // file path: write mails there instead of sending (tests only)
        'hook' => null,   // function (string $to, string $subject, string $body): bool   - plug in SMTP here
    ],
    'app_base_url' => 'https://app.example.com',

    'consent_retention_days' => 1095,
    'backup_retention_days' => 35,
    'audit_retention_days' => 400,

    // Argon2id cost. Tune so one hash takes ~100-250 ms on your server.
    'argon' => ['memory_cost' => 65536, 'time_cost' => 3, 'threads' => 1],

    // Optional overrides: name => [max hits, window seconds]. See src/Config.php for the defaults.
    // 'rate_limits' => ['login_ip' => [10, 900]],
];
