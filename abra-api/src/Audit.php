<?php
declare(strict_types=1);
namespace Abra;

final class Audit
{
    /** Only these meta keys are ever stored, and only scalar values. */
    private const META_KEYS = ['status', 'reason', 'provider', 'platform', 'scope', 'count', 'admin', 'latest', 'minSupported', 'docs', 'device'];

    public static function log(string $actor, string $action, ?string $target, array $meta = []): void
    {
        $clean = [];
        foreach ($meta as $k => $v) {
            if (in_array($k, self::META_KEYS, true) && (is_string($v) || is_int($v) || is_bool($v))) {
                $clean[$k] = is_string($v) ? mb_substr($v, 0, 200) : $v;
            }
        }
        Db::exec('INSERT INTO audit (occurred_at, actor, action, target, meta_json) VALUES (?, ?, ?, ?, ?)',
            [Util::now(), $actor, $action, $target, json_encode((object) $clean, JSON_UNESCAPED_UNICODE)]);
    }
}
