<?php
declare(strict_types=1);
namespace Abra;

final class Accounts
{
    public static function find(string $id): ?array { return Db::one('SELECT * FROM accounts WHERE id = ?', [$id]); }
    public static function byEmail(string $email): ?array { return Db::one('SELECT * FROM accounts WHERE email_norm = ?', [$email]); }

    public static function view(array $a): array
    {
        $providers = array_column(Db::all('SELECT provider FROM identities WHERE account_id = ? ORDER BY provider', [$a['id']]), 'provider');
        if ($a['password_hash'] !== null) { array_unshift($providers, 'email'); }
        return [
            'id' => $a['id'],
            'email' => $a['email_norm'],
            'providers' => $providers,
            'emailVerified' => (bool) $a['email_verified'],
            'displayName' => $a['display_name'],
            'locale' => $a['locale'],
            'calendar' => $a['calendar'],
            'status' => $a['status'],
            'createdAt' => $a['created_at'],
            'needsConsent' => Consents::needs($a['id']),
            'flags' => ['vault' => Vault::exists($a['id'])],
            'space' => Spaces::summary($a['id']),
        ];
    }

    public static function me(array $ctx): Response
    {
        return Response::json(['account' => self::view($ctx['account'])]);
    }

    public static function patch(array $ctx, Request $req): Response
    {
        $b = $req->json();
        $set = [];
        $args = [];
        if (array_key_exists('locale', $b)) {
            if (!is_string($b['locale']) || !in_array($b['locale'], ['en', 'fa', 'de'], true)) { throw new ApiException(400, 'invalid_request', 'Invalid locale.'); }
            $set[] = 'locale = ?'; $args[] = $b['locale'];
        }
        if (array_key_exists('calendar', $b)) {
            if (!is_string($b['calendar']) || !in_array($b['calendar'], ['gregorian', 'jalali'], true)) { throw new ApiException(400, 'invalid_request', 'Invalid calendar.'); }
            $set[] = 'calendar = ?'; $args[] = $b['calendar'];
        }
        if (array_key_exists('displayName', $b)) {
            if ($b['displayName'] === null) { $name = null; }
            elseif (is_string($b['displayName'])) { $name = Util::clean($b['displayName'], 40); $name = $name === '' ? null : $name; }
            else { throw new ApiException(400, 'invalid_request', 'Invalid displayName.'); }
            $set[] = 'display_name = ?'; $args[] = $name;
        }
        $id = $ctx['account']['id'];
        if ($set) {
            $args[] = $id;
            Db::exec('UPDATE accounts SET ' . implode(', ', $set) . ' WHERE id = ?', $args);
        }
        return Response::json(['account' => self::view(self::find($id))]);
    }
}
