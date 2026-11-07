<?php
declare(strict_types=1);
namespace Abra;

final class Settings
{
    public const OPTIONAL_KEYS = ['analytics', 'marketing', 'health_sharing'];
    public const REQUIRED_DOCS = ['terms', 'privacy'];

    public static function defaults(): array
    {
        $loc = ['en' => '', 'fa' => '', 'de' => ''];
        return [
            'release' => ['latest' => '2.0.0', 'minSupported' => '2.0.0', 'notes' => $loc, 'message' => $loc],
            'legal' => ['terms' => '2026-11-07', 'privacy' => '2026-11-07'],
        ];
    }

    public static function raw(string $k): ?string
    {
        $v = Db::val('SELECT v FROM settings WHERE k = ?', [$k]);
        return $v === null ? null : (string) $v;
    }

    public static function setRaw(string $k, string $v): void
    {
        if (Db::exec('UPDATE settings SET v = ? WHERE k = ?', [$v, $k]) === 0) {
            try {
                Db::exec('INSERT INTO settings (k, v) VALUES (?, ?)', [$k, $v]);
            } catch (\PDOException $e) {
                if (!Db::isDuplicate($e)) { throw $e; }
                Db::exec('UPDATE settings SET v = ? WHERE k = ?', [$v, $k]);
            }
        }
    }

    public static function get(string $k): array
    {
        $def = self::defaults()[$k] ?? [];
        $raw = self::raw($k);
        $d = $raw === null ? null : json_decode($raw, true);
        return is_array($d) ? array_replace($def, $d) : $def;
    }

    public static function set(string $k, array $v): void
    {
        self::setRaw($k, json_encode($v, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
    }

    /** @return array<string,string> docId => current version */
    public static function legal(): array { return self::get('legal'); }
}
