<?php
declare(strict_types=1);
namespace Abra;

/** Additive, idempotent schema upgrade (CREATE TABLE IF NOT EXISTS only). Safe to run repeatedly and on a live database. */
final class Migrate
{
    public const VERSION = 3;

    public static function run(): int
    {
        $file = __DIR__ . '/../schema/' . (Db::driver() === 'mysql' ? 'mysql' : 'sqlite') . '.sql';
        $sql = (string) file_get_contents($file);
        $sql = preg_replace('/^\s*--.*$/m', '', $sql) ?? '';
        $n = 0;
        foreach (preg_split('/;\s*\n/', $sql) ?: [] as $stmt) {
            $stmt = trim($stmt);
            if ($stmt === '') { continue; }
            Db::pdo()->exec($stmt);
            $n++;
        }
        Db::exec(Db::driver() === 'mysql'
            ? 'INSERT INTO settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)'
            : 'INSERT INTO settings (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v', ['schema_version', (string) self::VERSION]);
        return $n;
    }

    /** Upgrade an older database the first time the new code runs (one cheap query per request afterwards). */
    public static function ensure(): void
    {
        if (!Config::get('auto_migrate', true)) { return; }
        try {
            $v = Db::val("SELECT v FROM settings WHERE k = 'schema_version'");
        } catch (\Throwable) {
            $v = null;
        }
        if ($v === null || $v === false || (int) $v < self::VERSION) { self::run(); }
    }
}
