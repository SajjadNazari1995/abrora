<?php
declare(strict_types=1);
namespace Abra;

/** Fixed-window counters. Keys are HMAC'd so e-mails / IPs are not stored in clear. */
final class RateLimit
{
    private static function limit(string $name): array
    {
        $l = (array) Config::get('rate_limits', []);
        return $l[$name] ?? [60, 60];
    }

    private static function bucket(string $name, string $key): string
    {
        return $name . ':' . substr(hash_hmac('sha256', $key, (string) Config::get('pepper')), 0, 40);
    }

    private static function windowStart(int $win): int { return intdiv(time(), $win) * $win; }

    private static function current(string $bucket, int $ws): int
    {
        return (int) Db::val('SELECT hits FROM rate_limits WHERE bucket = ? AND window_start = ?', [$bucket, $ws]);
    }

    private static function reject(int $ws, int $win): never
    {
        $retry = max(1, $ws + $win - time());
        throw new ApiException(429, 'rate_limited', 'Too many requests. Please try again later.', [], ['Retry-After' => (string) $retry]);
    }

    private static function bump(string $bucket, int $ws): int
    {
        if (Db::exec('UPDATE rate_limits SET hits = hits + 1 WHERE bucket = ? AND window_start = ?', [$bucket, $ws]) === 0) {
            try {
                Db::exec('INSERT INTO rate_limits (bucket, window_start, hits) VALUES (?, ?, 1)', [$bucket, $ws]);
            } catch (\PDOException $e) {
                if (!Db::isDuplicate($e)) { throw $e; }
                Db::exec('UPDATE rate_limits SET hits = hits + 1 WHERE bucket = ? AND window_start = ?', [$bucket, $ws]);
            }
        }
        return self::current($bucket, $ws);
    }

    /** Count this attempt; reject when over the limit. */
    public static function hit(string $name, string $key): void
    {
        [$max, $win] = self::limit($name);
        $ws = self::windowStart($win);
        if (self::bump(self::bucket($name, $key), $ws) > $max) { self::reject($ws, $win); }
    }

    /** Reject if already at the limit (does not count). Pair with fail(). */
    public static function check(string $name, string $key): void
    {
        [$max, $win] = self::limit($name);
        $ws = self::windowStart($win);
        if (self::current(self::bucket($name, $key), $ws) >= $max) { self::reject($ws, $win); }
    }

    /** Count a failed attempt. */
    public static function fail(string $name, string $key): void
    {
        [, $win] = self::limit($name);
        self::bump(self::bucket($name, $key), self::windowStart($win));
    }
}
