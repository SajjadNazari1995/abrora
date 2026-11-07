<?php
declare(strict_types=1);
/* Abra Core API front controller. Only this folder (public/) must be web-reachable. */
require __DIR__ . '/../src/bootstrap.php';

use Abra\{ApiException, Config, Ops, RateLimit, Request, Response, Routes};

ini_set('display_errors', '0');
$req = null;
try {
    Config::load();
    Abra\Migrate::ensure();
    $req = Request::fromGlobals();
    Response::cors($req);
    if ($req->method === 'OPTIONS') {
        (new Response(204))->send();
        exit;
    }
    RateLimit::hit('global_ip', $req->ip());
    $res = Routes::build()->dispatch($req);
} catch (ApiException $e) {
    $res = Response::error($e);
} catch (\Throwable $e) {
    // Never echo internals. Record only a fixed code and the route.
    if ($req !== null) {
        try { Ops::record('api', 'server_error', null, substr($req->method . ' ' . $req->path, 0, 64)); } catch (\Throwable) {}
    }
    error_log('abra: unhandled ' . get_class($e));
    $res = new Response(500, ['error' => ['code' => 'server_error', 'message' => 'Something went wrong on our side.']]);
}
$res->send();
