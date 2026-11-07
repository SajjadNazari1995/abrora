<?php
declare(strict_types=1);
namespace Abra;

final class Util
{
    public static function now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }
    public static function at(int $unix): string { return gmdate('Y-m-d\TH:i:s\Z', $unix); }
    public static function plus(int $seconds): string { return self::at(time() + $seconds); }
    public static function id(string $prefix): string { return $prefix . bin2hex(random_bytes(12)); }
    public static function token(int $bytes = 32): string { return self::b64u(random_bytes($bytes)); }
    public static function hash(string $s): string { return hash('sha256', $s); }

    public static function b64u(string $b): string { return rtrim(strtr(base64_encode($b), '+/', '-_'), '='); }

    public static function b64uDecode(string $s): ?string
    {
        if ($s === '' || preg_match('/^[A-Za-z0-9_-]+$/', $s) !== 1) { return null; }
        $pad = (4 - strlen($s) % 4) % 4;
        $r = base64_decode(strtr($s, '-_', '+/') . str_repeat('=', $pad), true);
        return $r === false ? null : $r;
    }

    /** Remove control characters and angle brackets, collapse spaces, cut to $max characters. */
    public static function clean(mixed $s, int $max): string
    {
        $s = is_string($s) ? $s : '';
        $s = preg_replace('/[\x00-\x1f\x7f<>]/u', '', $s) ?? '';
        $s = preg_replace('/\s+/u', ' ', $s) ?? '';
        return mb_substr(trim($s), 0, $max);
    }

    public static function email(mixed $e): ?string
    {
        if (!is_string($e)) { return null; }
        $e = strtolower(trim($e));
        if ($e === '' || strlen($e) > 254 || !filter_var($e, FILTER_VALIDATE_EMAIL)) { return null; }
        return $e;
    }

    public static function maskEmail(?string $e): ?string
    {
        if (!$e || !str_contains($e, '@')) { return null; }
        [$l, $d] = explode('@', $e, 2);
        $dot = strrpos($d, '.');
        $name = $dot === false ? $d : substr($d, 0, $dot);
        $tld = $dot === false ? '' : substr($d, $dot);
        return mb_substr($l, 0, 1) . '***@' . mb_substr($name, 0, 1) . '***' . $tld;
    }

    /** Strict ISO-8601 UTC ("...Z") to unix time, or null. */
    public static function parseIso(mixed $s): ?int
    {
        if (!is_string($s) || preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/', $s) !== 1) { return null; }
        $t = strtotime($s);
        return $t === false ? null : $t;
    }

    public static function locale(mixed $l, string $default = 'en'): string
    {
        return is_string($l) && in_array($l, ['en', 'fa', 'de'], true) ? $l : $default;
    }

    public static function semver(mixed $v): bool
    {
        return is_string($v) && preg_match('/^\d{1,4}\.\d{1,4}\.\d{1,4}$/', $v) === 1;
    }

    public static function accId(mixed $v): bool { return is_string($v) && preg_match('/^acc_[0-9a-f]{24}$/', $v) === 1; }
    public static function devId(mixed $v): bool { return is_string($v) && preg_match('/^dev_[0-9a-f]{24}$/', $v) === 1; }

    public static function tombstone(string $accountId): string
    {
        return 'tomb_' . substr(hash_hmac('sha256', $accountId, (string) Config::get('pepper')), 0, 32);
    }
}
