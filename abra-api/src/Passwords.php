<?php
declare(strict_types=1);
namespace Abra;

final class Passwords
{
    private const COMMON = [
        'password12', 'password123', 'password1234', 'passw0rd123', '1234567890', '12345678910', '0123456789', '1234567891',
        'qwertyuiop', 'qwerty1234', 'qwerty12345', '1q2w3e4r5t', 'iloveyou12', 'iloveyou123', 'letmein1234', 'welcome123',
        'welcome1234', 'abcdefghij', 'abcd123456', 'administrator', 'changeme123', 'trustno1234', '1111111111', '0000000000',
        'asdfghjkl1', 'zxcvbnm123', 'monkey1234', 'dragon1234', 'football123', 'baseball123',
    ];

    public static function validate(mixed $pw, ?string $email = null): string
    {
        if (!is_string($pw)) { throw new ApiException(400, 'invalid_request', 'Password is required.'); }
        $len = mb_strlen($pw);
        if ($len < 10) { throw new ApiException(400, 'invalid_request', 'Password must be at least 10 characters.'); }
        if ($len > 200) { throw new ApiException(400, 'invalid_request', 'Password must be at most 200 characters.'); }
        $l = mb_strtolower($pw);
        if (in_array($l, self::COMMON, true) || count(array_unique(mb_str_split($l))) < 3) {
            throw new ApiException(400, 'invalid_request', 'This password is too common. Please choose another.');
        }
        if ($email !== null && $l === $email) { throw new ApiException(400, 'invalid_request', 'Password must not be your e-mail address.'); }
        return $pw;
    }

    private static function bcryptInput(string $pw): string { return base64_encode(hash('sha256', $pw, true)); }

    public static function hash(string $pw): string
    {
        $a = (array) Config::get('argon', []);
        $mem = (int) ($a['memory_cost'] ?? 65536);
        $time = (int) ($a['time_cost'] ?? 3);
        if (defined('PASSWORD_ARGON2ID')) {
            return password_hash($pw, PASSWORD_ARGON2ID, ['memory_cost' => $mem, 'time_cost' => $time, 'threads' => (int) ($a['threads'] ?? 1)]);
        }
        if (function_exists('sodium_crypto_pwhash_str') && defined('SODIUM_CRYPTO_PWHASH_ALG_ARGON2ID13')) {
            return sodium_crypto_pwhash_str($pw, max($time, 2), max($mem * 1024, 8192));
        }
        return password_hash(self::bcryptInput($pw), PASSWORD_BCRYPT, ['cost' => 12]);
    }

    public static function verify(string $pw, string $hash): bool
    {
        if (str_starts_with($hash, '$argon2id$') && !defined('PASSWORD_ARGON2ID') && function_exists('sodium_crypto_pwhash_str_verify')) {
            return sodium_crypto_pwhash_str_verify($hash, $pw);
        }
        if (str_starts_with($hash, '$2y$')) { return password_verify(self::bcryptInput($pw), $hash); }
        return password_verify($pw, $hash);
    }

    public static function needsRehash(string $hash): bool
    {
        if (!defined('PASSWORD_ARGON2ID')) { return false; }
        $a = (array) Config::get('argon', []);
        return password_needs_rehash($hash, PASSWORD_ARGON2ID, ['memory_cost' => (int) ($a['memory_cost'] ?? 65536), 'time_cost' => (int) ($a['time_cost'] ?? 3), 'threads' => (int) ($a['threads'] ?? 1)]);
    }

    /** Burn the same CPU as a real verification (unknown e-mail / social-only account). */
    public static function dummyVerify(string $pw): void
    {
        $h = Settings::raw('dummy_hash');
        if ($h === null) {
            $h = self::hash(bin2hex(random_bytes(16)));
            Settings::setRaw('dummy_hash', $h);
        }
        self::verify($pw, $h);
    }
}
