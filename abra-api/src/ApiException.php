<?php
declare(strict_types=1);
namespace Abra;

/** An error that is safe to show to the client. Never put secrets or request bodies in $message. */
final class ApiException extends \Exception
{
    public function __construct(public int $status, public string $errCode, string $message, public array $extra = [], public array $headers = [])
    {
        parent::__construct($message);
    }
}
