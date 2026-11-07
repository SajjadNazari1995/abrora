<?php
declare(strict_types=1);
namespace Abra;

final class Router
{
    private array $routes = [];

    /** $auth: 'public' | 'user' | 'admin:<scope>' */
    public function add(string $method, string $pattern, string $auth, callable $handler, int $maxBody = 65536): void
    {
        $re = '#^' . preg_replace('#\{[a-z]+\}#', '([A-Za-z0-9_]{1,64})', $pattern) . '$#';
        $this->routes[] = [$method, $re, $auth, $handler, $maxBody];
    }

    public function dispatch(Request $req): Response
    {
        foreach ($this->routes as [$method, $re, $auth, $handler, $max]) {
            if ($method !== $req->method || preg_match($re, $req->path, $m) !== 1) { continue; }
            array_shift($m);
            $req->maxBody = $max;
            $ctx = [];
            if ($auth === 'user') { $ctx = Auth::requireUser($req); }
            elseif (str_starts_with($auth, 'admin:')) { $ctx = Admin::authorize($req, substr($auth, 6)); }
            return $handler($req, $ctx, $m);
        }
        throw new ApiException(404, 'not_found', 'Route not found.');
    }
}
