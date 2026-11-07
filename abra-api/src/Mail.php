<?php
declare(strict_types=1);
namespace Abra;

final class Mail
{
    /** Returns true when handed to the transport. Never throws, never logs content. */
    public static function send(string $to, string $subject, string $body): bool
    {
        $cfg = (array) Config::get('mail', []);
        try {
            if (!empty($cfg['sink']) && is_string($cfg['sink'])) {
                file_put_contents($cfg['sink'], json_encode(['to' => $to, 'subject' => $subject, 'body' => $body], JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
                return true;
            }
            if (isset($cfg['hook']) && is_callable($cfg['hook'])) {
                return (bool) ($cfg['hook'])($to, $subject, $body);
            }
            $from = preg_replace('/[\r\n]+/', '', (string) ($cfg['from'] ?? 'no-reply@localhost'));
            $subject = preg_replace('/[\r\n]+/', ' ', $subject);
            $headers = "From: $from\r\nContent-Type: text/plain; charset=UTF-8\r\nMIME-Version: 1.0";
            return @mail($to, '=?UTF-8?B?' . base64_encode((string) $subject) . '?=', $body, $headers);
        } catch (\Throwable) {
            return false;
        }
    }
}
