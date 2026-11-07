<?php
declare(strict_types=1);
// Usage: php bin/cleanup.php   (run daily from cron)
require __DIR__ . '/../src/bootstrap.php';

use Abra\{Config, Db, Util};

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
Config::load();
$now = Util::now();
$ago = static fn(int $days): string => Util::plus(-$days * 86400);
$report = [];
$run = static function (string $label, string $sql, array $p) use (&$report): void { $report[$label] = Db::exec($sql, $p); };

$run('sessions', 'DELETE FROM sessions WHERE expires_at < ? OR (revoked_at IS NOT NULL AND revoked_at < ?)', [$now, $ago(7)]);
$run('devices', 'DELETE FROM devices WHERE revoked_at IS NOT NULL AND revoked_at < ?', [$ago(30)]);
$run('reset_tokens', 'DELETE FROM reset_tokens WHERE expires_at < ? OR used_at IS NOT NULL', [$ago(1)]);
$run('reauth_tokens', 'DELETE FROM reauth_tokens WHERE expires_at < ?', [$ago(1)]);
$run('rate_limits', 'DELETE FROM rate_limits WHERE window_start < ?', [time() - 2 * 86400]);
$run('consent_tombstones', 'DELETE FROM consents WHERE tombstoned_at IS NOT NULL AND tombstoned_at < ?', [$ago((int) Config::get('consent_retention_days', 1095))]);
$run('pair_invites', 'DELETE FROM pair_invites WHERE expires_at < ?', [$ago(1)]);
$run('space_ended', 'DELETE FROM space_ended WHERE ended_at < ?', [$ago(90)]);
$run('op_errors', 'DELETE FROM op_errors WHERE occurred_at < ?', [$ago(30)]);
$run('audit', 'DELETE FROM audit WHERE occurred_at < ?', [$ago((int) Config::get('audit_retention_days', 400))]);

foreach ($report as $k => $n) { echo str_pad($k, 20) . $n . "\n"; }
echo "OK\n";
