<?php
declare(strict_types=1);
namespace Abra;

final class Routes
{
    public static function build(): Router
    {
        $r = new Router();

        // ---- public ----
        $r->add('GET', '/v1/health', 'public', fn() => Response::json(['ok' => true, 'api' => '1', 'time' => Util::now()]));
        $r->add('GET', '/v1/app/release', 'public', function (Request $req) {
            $app = $req->query['app'] ?? 'abra';
            if ($app !== 'abra') { throw new ApiException(400, 'invalid_request', 'Unknown app.'); }
            $ver = $req->query['version'] ?? null;
            if ($ver !== null && !Util::semver($ver)) { throw new ApiException(400, 'invalid_request', 'Invalid version.'); }
            $rel = Settings::get('release');
            $need = $ver !== null && version_compare($ver, $rel['minSupported'], '<');
            return Response::json(['app' => 'abra', 'latest' => $rel['latest'], 'minSupported' => $rel['minSupported'], 'updateRequired' => $need,
                'notes' => $rel['notes'], 'message' => $rel['message']], 200, ['Cache-Control' => 'public, max-age=300']);
        });
        $r->add('GET', '/v1/legal', 'public', function () {
            $docs = [];
            foreach (Settings::legal() as $id => $v) { $docs[] = ['id' => $id, 'version' => $v, 'locales' => ['en', 'fa', 'de']]; }
            return Response::json(['required' => Settings::REQUIRED_DOCS, 'documents' => $docs], 200, ['Cache-Control' => 'public, max-age=300']);
        });
        $r->add('POST', '/v1/telemetry/error', 'public', fn(Request $req) => Ops::telemetry($req));

        // ---- auth ----
        $r->add('POST', '/v1/auth/register', 'public', fn(Request $q) => Auth::register($q));
        $r->add('POST', '/v1/auth/login', 'public', fn(Request $q) => Auth::login($q));
        $r->add('POST', '/v1/auth/google', 'public', fn(Request $q) => Auth::google($q));
        $r->add('POST', '/v1/auth/apple', 'public', fn(Request $q) => Auth::apple($q));
        $r->add('POST', '/v1/auth/logout', 'user', fn(Request $q, array $c) => Auth::logout($c));
        $r->add('POST', '/v1/auth/logout-all', 'user', fn(Request $q, array $c) => Auth::logoutAll($c));
        $r->add('POST', '/v1/auth/password/forgot', 'public', fn(Request $q) => Auth::forgot($q));
        $r->add('POST', '/v1/auth/password/reset', 'public', fn(Request $q) => Auth::reset($q));
        $r->add('POST', '/v1/auth/password/change', 'user', fn(Request $q, array $c) => Auth::change($c, $q));
        $r->add('POST', '/v1/auth/reauth', 'user', fn(Request $q, array $c) => Auth::reauth($c, $q));

        // ---- account ----
        $r->add('GET', '/v1/me', 'user', fn(Request $q, array $c) => Accounts::me($c));
        $r->add('PATCH', '/v1/me', 'user', fn(Request $q, array $c) => Accounts::patch($c, $q));
        $r->add('DELETE', '/v1/me', 'user', fn(Request $q, array $c) => Deletion::delete($c, $q));
        $r->add('POST', '/v1/me/consents', 'user', fn(Request $q, array $c) => Consents::record($c['account'], $q));
        $r->add('GET', '/v1/me/consents', 'user', fn(Request $q, array $c) => Consents::show($c['account']));
        $r->add('GET', '/v1/me/devices', 'user', fn(Request $q, array $c) => Devices::list($c));
        $r->add('POST', '/v1/me/devices', 'user', fn(Request $q, array $c) => Devices::add($c, $q));
        $r->add('DELETE', '/v1/me/devices/{id}', 'user', fn(Request $q, array $c, array $p) => Devices::remove($c, $p[0]));

        // ---- vault ----
        $r->add('GET', '/v1/vault', 'user', fn(Request $q, array $c) => Vault::get($c));
        $r->add('PUT', '/v1/vault', 'user', fn(Request $q, array $c) => Vault::put($c, $q), Vault::MAX_BODY);
        $r->add('DELETE', '/v1/vault', 'user', fn(Request $q, array $c) => Vault::delete($c));

        // ---- partner pairing + shared space (v1.1) ----
        $r->add('POST', '/v1/pairing/invite', 'user', fn(Request $q, array $c) => Pairing::invite($c));
        $r->add('POST', '/v1/pairing/accept', 'user', fn(Request $q, array $c) => Pairing::accept($c, $q));
        $r->add('GET', '/v1/space', 'user', fn(Request $q, array $c) => Spaces::get($c));
        $r->add('DELETE', '/v1/space', 'user', fn(Request $q, array $c) => Spaces::leave($c));
        $r->add('GET', '/v1/space/vault', 'user', fn(Request $q, array $c) => SpaceData::getVault($c));
        $r->add('PUT', '/v1/space/vault', 'user', fn(Request $q, array $c) => SpaceData::putVault($c, $q), Vault::MAX_BODY);
        $r->add('POST', '/v1/space/keys', 'user', fn(Request $q, array $c) => SpaceData::putKey($c, $q));
        $r->add('GET', '/v1/space/keys', 'user', fn(Request $q, array $c) => SpaceData::listKeys($c));
        // v1.2: selective sharing, consent history, chat, member keys, ended notice
        $r->add('PUT', '/v1/space/member-key', 'user', fn(Request $q, array $c) => SpaceShare::putMemberKey($c, $q));
        $r->add('GET', '/v1/space/shares', 'user', fn(Request $q, array $c) => SpaceShare::listShares($c));
        $r->add('PUT', '/v1/space/shares/{category}', 'user', fn(Request $q, array $c, array $p) => SpaceShare::putShare($c, $q, $p[0]));
        $r->add('GET', '/v1/space/consents', 'user', fn(Request $q, array $c) => SpaceShare::consents($c));
        $r->add('GET', '/v1/space/messages', 'user', fn(Request $q, array $c) => SpaceShare::listMessages($c, $q));
        $r->add('POST', '/v1/space/messages', 'user', fn(Request $q, array $c) => SpaceShare::postMessage($c, $q));
        $r->add('DELETE', '/v1/space/messages/{id}', 'user', fn(Request $q, array $c, array $p) => SpaceShare::deleteMessage($c, $p[0]));
        $r->add('POST', '/v1/space/ack-ended', 'user', fn(Request $q, array $c) => SpaceShare::ackEnded($c));

        // ---- admin ----
        $r->add('GET', '/v1/admin/stats', 'admin:stats:read', fn() => Admin::stats());
        $r->add('GET', '/v1/admin/accounts', 'admin:accounts:read', fn(Request $q) => Admin::accounts($q));
        $r->add('POST', '/v1/admin/accounts/{id}/status', 'admin:accounts:status', fn(Request $q, array $c, array $p) => Admin::setStatus($c, $q, $p[0]));
        $r->add('GET', '/v1/admin/release', 'admin:release:read', fn() => Admin::release());
        $r->add('PUT', '/v1/admin/release', 'admin:release:write', fn(Request $q, array $c) => Admin::putRelease($c, $q));
        $r->add('GET', '/v1/admin/legal', 'admin:release:read', fn() => Admin::legal());
        $r->add('PUT', '/v1/admin/legal', 'admin:release:write', fn(Request $q, array $c) => Admin::putLegal($c, $q));
        $r->add('GET', '/v1/admin/errors', 'admin:ops:read', fn(Request $q) => Admin::errors($q));
        $r->add('GET', '/v1/admin/audit', 'admin:ops:read', fn(Request $q) => Admin::audit($q));

        return $r;
    }
}
