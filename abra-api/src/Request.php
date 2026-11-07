<?php
declare(strict_types=1);
namespace Abra;

final class Request
{
    public string $method;
    public string $path;
    public array $query;
    public int $maxBody = 65536;
    private array $headers = [];

    public static function fromGlobals(): self
    {
        $r = new self();
        $r->method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $uri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
        $path = parse_url($uri, PHP_URL_PATH);
        $path = is_string($path) ? rawurldecode($path) : '/';
        // Support a sub-folder install (e.g. /api/index.php): strip the script directory.
        $base = rtrim(str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? ''))), '/');
        if ($base !== '' && $base !== '/public' && str_starts_with($path, $base . '/')) { $path = substr($path, strlen($base)); }
        $r->path = '/' . trim($path, '/');
        $r->query = $_GET;
        foreach ($_SERVER as $k => $v) {
            if (str_starts_with($k, 'HTTP_') && is_string($v)) { $r->headers[strtolower(str_replace('_', '-', substr($k, 5)))] = $v; }
        }
        if (isset($_SERVER['CONTENT_TYPE'])) { $r->headers['content-type'] = (string) $_SERVER['CONTENT_TYPE']; }
        if (isset($_SERVER['CONTENT_LENGTH'])) { $r->headers['content-length'] = (string) $_SERVER['CONTENT_LENGTH']; }
        return $r;
    }

    public function header(string $name): ?string { return $this->headers[strtolower($name)] ?? null; }

    public function bearer(): ?string
    {
        $h = $this->header('authorization');
        if ($h === null || preg_match('/^Bearer ([A-Za-z0-9_\-\.~+\/=]{16,256})$/', $h, $m) !== 1) { return null; }
        return $m[1];
    }

    public function ip(): string
    {
        $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
        if (Config::get('trust_proxy')) {
            $h = $this->header((string) Config::get('ip_header', 'X-Forwarded-For'));
            if ($h) {
                // With one trusted proxy the LAST entry is the one it appended; earlier entries are client-controlled.
                $parts = array_map('trim', explode(',', $h));
                $last = end($parts);
                if ($last !== false && filter_var($last, FILTER_VALIDATE_IP)) { $ip = $last; }
            }
        }
        return $ip;
    }

    /** JSON object body (empty body = empty array). */
    public function json(): array
    {
        $len = $this->header('content-length');
        if ($len !== null && ctype_digit($len) && (int) $len > $this->maxBody) {
            throw new ApiException(413, 'payload_too_large', 'Request body is too large.');
        }
        $in = fopen('php://input', 'rb');
        $raw = $in ? stream_get_contents($in, $this->maxBody + 1) : '';
        if ($in) { fclose($in); }
        $raw = (string) $raw;
        if (strlen($raw) > $this->maxBody) { throw new ApiException(413, 'payload_too_large', 'Request body is too large.'); }
        if (trim($raw) === '') { return []; }
        if (stripos((string) $this->header('content-type'), 'application/json') === false) {
            throw new ApiException(400, 'invalid_request', 'Content-Type must be application/json.');
        }
        $d = json_decode($raw, true, 16);
        if (!is_array($d) || ($d !== [] && array_is_list($d))) {
            throw new ApiException(400, 'invalid_request', 'Body must be a JSON object.');
        }
        return $d;
    }
}
