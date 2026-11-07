<?php
declare(strict_types=1);
/* Plain PSR-4-style autoloader: Abra\Foo -> src/Foo.php */
spl_autoload_register(static function (string $class): void {
    if (strncmp($class, 'Abra\\', 5) !== 0) { return; }
    $file = __DIR__ . '/' . substr($class, 5) . '.php';
    if (is_file($file)) { require $file; }
});
