<?php
declare(strict_types=1);
namespace Abra;

/** Thin PDO wrapper. Prepared statements only. */
final class Db
{
    private static ?\PDO $pdo = null;
    private static int $depth = 0;

    public static function pdo(): \PDO
    {
        if (self::$pdo) { return self::$pdo; }
        $c = Config::get('db');
        $dsn = (string) $c['dsn'];
        if (str_starts_with($dsn, 'sqlite:')) {
            $dir = dirname(substr($dsn, 7));
            if (!is_dir($dir)) { @mkdir($dir, 0700, true); }
        }
        $pdo = new \PDO($dsn, $c['user'] ?? null, $c['pass'] ?? null, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
            \PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        if (str_starts_with($dsn, 'sqlite:')) {
            $pdo->exec('PRAGMA journal_mode=WAL');
            $pdo->exec('PRAGMA busy_timeout=5000');
            $pdo->exec('PRAGMA synchronous=NORMAL');
            $pdo->exec('PRAGMA secure_delete=ON');
        } elseif (str_starts_with($dsn, 'mysql:')) {
            $pdo->exec("SET NAMES utf8mb4");
        }
        return self::$pdo = $pdo;
    }

    public static function driver(): string { return (string) self::pdo()->getAttribute(\PDO::ATTR_DRIVER_NAME); }

    public static function exec(string $sql, array $p = []): int
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($p);
        return $st->rowCount();
    }

    public static function all(string $sql, array $p = []): array
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($p);
        return $st->fetchAll();
    }

    public static function one(string $sql, array $p = []): ?array
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($p);
        $r = $st->fetch();
        return $r === false ? null : $r;
    }

    public static function val(string $sql, array $p = []): mixed
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($p);
        $r = $st->fetchColumn();
        return $r === false ? null : $r;
    }

    public static function lastId(): string { return (string) self::pdo()->lastInsertId(); }

    public static function tx(callable $fn): mixed
    {
        $pdo = self::pdo();
        if (self::$depth > 0) { return $fn(); }
        $pdo->beginTransaction();
        self::$depth = 1;
        try {
            $r = $fn();
            $pdo->commit();
            return $r;
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) { $pdo->rollBack(); }
            throw $e;
        } finally {
            self::$depth = 0;
        }
    }

    /** True when the exception is a unique-key violation (SQLite 19 / MySQL 1062 / SQLSTATE 23000). */
    public static function isDuplicate(\Throwable $e): bool
    {
        return $e instanceof \PDOException && ((string) $e->getCode() === '23000' || str_contains($e->getMessage(), 'UNIQUE') || str_contains($e->getMessage(), 'Duplicate'));
    }
}
