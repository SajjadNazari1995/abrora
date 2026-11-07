<?php
declare(strict_types=1);
namespace Abra;

final class Response
{
    public function __construct(public int $status = 200, public array|object|null $body = null, public array $headers = []) {}

    public static function json(array|object $data, int $status = 200, array $headers = []): self { return new self($status, $data, $headers); }
    public static function noContent(): self { return new self(204); }

    public static function error(ApiException $e): self
    {
        $body = ['error' => ['code' => $e->errCode, 'message' => $e->getMessage()]] + $e->extra;
        return new self($e->status, $body, $e->headers);
    }

    public static function cors(Request $req): void
    {
        $o = $req->header('origin');
        if ($o !== null && in_array($o, (array) Config::get('allowed_origins', []), true)) {
            header('Access-Control-Allow-Origin: ' . $o);
            header('Vary: Origin');
            header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Authorization, Content-Type');
            header('Access-Control-Max-Age: 600');
        }
    }

    public function send(): void
    {
        header_remove('X-Powered-By');
        http_response_code($this->status);
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: no-referrer');
        header('X-Frame-Options: DENY');
        header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
        if ((($_SERVER['HTTPS'] ?? '') !== '' && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https') {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }
        $h = $this->headers;
        if (!isset($h['Cache-Control'])) { header('Cache-Control: no-store'); }
        foreach ($h as $k => $v) { header($k . ': ' . $v); }
        if ($this->status === 204 || $this->body === null) { return; }
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($this->body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION);
    }
}
