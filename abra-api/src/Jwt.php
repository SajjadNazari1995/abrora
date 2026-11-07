<?php
declare(strict_types=1);
namespace Abra;

/** RS256 id-token verification against a JWKS (Google / Apple). */
final class Jwt
{
    private const JWKS_URL = [
        'google' => 'https://www.googleapis.com/oauth2/v3/certs',
        'apple' => 'https://appleid.apple.com/auth/keys',
    ];
    private const SKEW = 60;

    /**
     * @param string[] $issuers
     * @param string[] $audiences
     * @return array claims
     * @throws ApiException 401 on any verification problem, 503 when the key set cannot be loaded
     */
    public static function verify(string $token, string $provider, array $issuers, array $audiences): array
    {
        $fail = static fn(): ApiException => new ApiException(401, 'unauthorized', 'Sign-in could not be verified.');
        if (strlen($token) > 8192 || substr_count($token, '.') !== 2) { throw $fail(); }
        [$h64, $p64, $s64] = explode('.', $token);
        $header = json_decode((string) Util::b64uDecode($h64), true);
        $claims = json_decode((string) Util::b64uDecode($p64), true);
        $sig = Util::b64uDecode($s64);
        if (!is_array($header) || !is_array($claims) || $sig === null) { throw $fail(); }
        if (($header['alg'] ?? null) !== 'RS256' || !is_string($header['kid'] ?? null)) { throw $fail(); }

        $jwk = self::findKey($provider, $header['kid']);
        if ($jwk === null) { throw $fail(); }
        $pem = self::jwkToPem($jwk);
        if ($pem === null) { throw $fail(); }
        $ok = openssl_verify($h64 . '.' . $p64, $sig, $pem, OPENSSL_ALGO_SHA256);
        if ($ok !== 1) { throw $fail(); }

        $now = time();
        if (!is_string($claims['iss'] ?? null) || !in_array($claims['iss'], $issuers, true)) { throw $fail(); }
        $aud = $claims['aud'] ?? null;
        $auds = is_array($aud) ? $aud : [$aud];
        $match = false;
        foreach ($auds as $a) {
            if (is_string($a) && in_array($a, $audiences, true)) { $match = true; }
        }
        if (!$match) { throw $fail(); }
        if (!is_int($claims['exp'] ?? null) && !is_float($claims['exp'] ?? null)) { throw $fail(); }
        if ($claims['exp'] + self::SKEW < $now) { throw $fail(); }
        if (isset($claims['nbf']) && is_numeric($claims['nbf']) && $claims['nbf'] - self::SKEW > $now) { throw $fail(); }
        if (isset($claims['iat']) && is_numeric($claims['iat']) && $claims['iat'] - 300 > $now) { throw $fail(); }
        if (!is_string($claims['sub'] ?? null) || $claims['sub'] === '' || strlen($claims['sub']) > 190) { throw $fail(); }
        return $claims;
    }

    private static function findKey(string $provider, string $kid): ?array
    {
        $set = self::loadSet($provider, false);
        foreach ($set['keys'] as $k) {
            if (is_array($k) && ($k['kid'] ?? null) === $kid && ($k['kty'] ?? null) === 'RSA') { return $k; }
        }
        // Unknown kid: keys may have rotated. Refetch, but not more often than every 10 minutes.
        if (!isset(Config::get('jwks_override', [])[$provider]) && time() - (int) $set['fetched'] > 600) {
            $set = self::loadSet($provider, true);
            foreach ($set['keys'] as $k) {
                if (is_array($k) && ($k['kid'] ?? null) === $kid && ($k['kty'] ?? null) === 'RSA') { return $k; }
            }
        }
        return null;
    }

    /** @return array{keys:array,fetched:int} */
    private static function loadSet(string $provider, bool $force): array
    {
        $ov = (array) Config::get('jwks_override', []);
        if (isset($ov[$provider])) {
            $d = is_array($ov[$provider]) ? $ov[$provider] : json_decode((string) @file_get_contents((string) $ov[$provider]), true);
            return ['keys' => is_array($d['keys'] ?? null) ? $d['keys'] : [], 'fetched' => time()];
        }
        $dir = rtrim((string) Config::get('data_dir'), '/') . '/cache';
        if (!is_dir($dir)) { @mkdir($dir, 0700, true); }
        $file = $dir . '/jwks-' . $provider . '.json';
        $cached = is_file($file) ? json_decode((string) @file_get_contents($file), true) : null;
        $fresh = is_array($cached) && isset($cached['expires'], $cached['keys']) && $cached['expires'] > time();
        if ($fresh && !$force) { return ['keys' => $cached['keys'], 'fetched' => (int) $cached['fetched']]; }

        $res = self::fetch(self::JWKS_URL[$provider] ?? '');
        if ($res !== null) {
            $age = 86400;
            if (preg_match('/max-age=(\d+)/i', $res['cache'], $m) === 1) { $age = (int) $m[1]; }
            $age = max(300, min(86400, $age));
            $store = ['fetched' => time(), 'expires' => time() + $age, 'keys' => $res['keys']];
            @file_put_contents($file, json_encode($store), LOCK_EX);
            @chmod($file, 0600);
            return ['keys' => $res['keys'], 'fetched' => time()];
        }
        if (is_array($cached) && is_array($cached['keys'] ?? null)) { // stale fallback
            return ['keys' => $cached['keys'], 'fetched' => (int) ($cached['fetched'] ?? 0)];
        }
        throw new ApiException(503, 'server_error', 'Sign-in provider is temporarily unavailable.');
    }

    /** @return array{keys:array,cache:string}|null */
    private static function fetch(string $url): ?array
    {
        if ($url === '' || !function_exists('curl_init')) { return null; }
        $ch = curl_init($url);
        $cache = '';
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 5, CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2, CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_MAXFILESIZE => 262144, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
            CURLOPT_HEADERFUNCTION => static function ($c, $line) use (&$cache) {
                if (stripos($line, 'cache-control:') === 0) { $cache = $line; }
                return strlen($line);
            },
        ]);
        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        if (!is_string($body) || $code !== 200) { return null; }
        $d = json_decode($body, true);
        return is_array($d['keys'] ?? null) ? ['keys' => $d['keys'], 'cache' => $cache] : null;
    }

    private static function der(int $tag, string $v): string
    {
        $l = strlen($v);
        if ($l < 128) { $len = chr($l); }
        else { $b = ltrim(pack('N', $l), "\0"); $len = chr(0x80 | strlen($b)) . $b; }
        return chr($tag) . $len . $v;
    }

    private static function derInt(string $bin): string
    {
        $bin = ltrim($bin, "\0");
        if ($bin === '' || (ord($bin[0]) & 0x80)) { $bin = "\0" . $bin; }
        return self::der(0x02, $bin);
    }

    public static function jwkToPem(array $jwk): ?string
    {
        $n = Util::b64uDecode((string) ($jwk['n'] ?? ''));
        $e = Util::b64uDecode((string) ($jwk['e'] ?? ''));
        if ($n === null || $e === null || strlen($n) < 128) { return null; } // reject < 1024-bit keys
        $rsaKey = self::der(0x30, self::derInt($n) . self::derInt($e));
        $algId = self::der(0x30, self::der(0x06, "\x2A\x86\x48\x86\xF7\x0D\x01\x01\x01") . "\x05\x00");
        $spki = self::der(0x30, $algId . self::der(0x03, "\0" . $rsaKey));
        return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($spki), 64, "\n") . "-----END PUBLIC KEY-----\n";
    }
}
