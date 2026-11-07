<?php
declare(strict_types=1);
// Usage: php bin/make-service-token.php <name> <scope,scope,...> [ip,ip,...]
// Prints the secret ONCE (give it to the Control Center) and the config entry (contains only the hash).
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$valid = ['stats:read', 'accounts:read', 'accounts:status', 'release:read', 'release:write', 'ops:read'];
$name = $argv[1] ?? '';
$scopes = array_values(array_filter(explode(',', $argv[2] ?? '')));
$ips = array_values(array_filter(explode(',', $argv[3] ?? '')));
if (!preg_match('/^[a-z0-9_-]{2,40}$/', $name) || !$scopes || array_diff($scopes, $valid)) {
    fwrite(STDERR, "Usage: php bin/make-service-token.php <name> <scopes> [ips]\nScopes: " . implode(', ', $valid) . "\n");
    exit(1);
}
foreach ($ips as $ip) { if (!filter_var($ip, FILTER_VALIDATE_IP)) { fwrite(STDERR, "Bad IP: $ip\n"); exit(1); } }
$secret = 'abrs_' . rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
echo "SECRET (shown once, send as header X-Abrora-Service-Token):\n$secret\n\nAdd to config.php -> 'service_tokens':\n";
echo "    ['name' => " . var_export($name, true) . ", 'hash' => '" . hash('sha256', $secret) . "', 'scopes' => " . var_export($scopes, true) . ", 'ips' => " . var_export($ips, true) . "],\n";
