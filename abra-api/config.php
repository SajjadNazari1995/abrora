<?php
// Local WAMP test configuration (NOT for production).
return [
    'db' => ['dsn' => 'sqlite:' . __DIR__ . '/data/abra.sqlite'],
    'data_dir' => __DIR__ . '/data',
    'pepper' => 'local-wamp-test-pepper-change-in-production',
    'allowed_origins' => ['http://localhost', 'http://127.0.0.1'],
    'trust_proxy' => false,
    'google_client_ids' => [], 'apple_client_ids' => [],
    'service_tokens' => [],
    'mail' => ['from' => 'no-reply@localhost', 'sink' => __DIR__ . '/data/mail.txt', 'hook' => null],
    'app_base_url' => 'http://localhost/abra',
    'consent_retention_days' => 1095, 'backup_retention_days' => 35, 'audit_retention_days' => 400,
    'argon' => ['memory_cost' => 65536, 'time_cost' => 3, 'threads' => 1],
];
