<?php
declare(strict_types=1);
// Usage: php bin/migrate.php   (set ABRA_CONFIG to use a non-default config path)
require __DIR__ . '/../src/bootstrap.php';

use Abra\{Config, Db};

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
Config::load();
$n = Abra\Migrate::run();
echo "OK: $n statements applied (" . Db::driver() . ").\n";
