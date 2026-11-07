<?php
declare(strict_types=1);
namespace Abra;

final class Deletion
{
    public static function delete(array $ctx, Request $req): Response
    {
        $b = $req->json();
        if (($b['confirm'] ?? null) !== 'DELETE') { throw new ApiException(400, 'invalid_request', 'Type DELETE to confirm.'); }
        $tok = $b['reauthToken'] ?? null;
        if (!is_string($tok) || $tok === '' || strlen($tok) > 256) { throw new ApiException(401, 'reauth_required', 'Please confirm your identity first.'); }

        $acc = $ctx['account']['id'];
        $sid = $ctx['session']['id'];
        $now = Util::now();
        $tomb = Util::tombstone($acc);

        $space = null;
        Db::tx(function () use ($tok, $sid, $acc, $now, $tomb, &$space) {
            // Single-use, bound to this session, unexpired. The UPDATE is the atomic claim.
            $n = Db::exec('UPDATE reauth_tokens SET used_at = ? WHERE token_hash = ? AND session_id = ? AND used_at IS NULL AND expires_at > ?', [$now, Util::hash($tok), $sid, $now]);
            if ($n !== 1) { throw new ApiException(401, 'reauth_required', 'Please confirm your identity again.'); }

            Db::exec('UPDATE consents SET account_ref = ?, tombstoned_at = ? WHERE account_ref = ?', [$tomb, $now, $acc]);
            Db::exec('UPDATE audit SET target = ? WHERE target = ?', [$tomb, $acc]);
            Db::exec('DELETE FROM reauth_tokens WHERE session_id IN (SELECT id FROM sessions WHERE account_id = ?)', [$acc]);
            Db::exec('DELETE FROM reset_tokens WHERE account_id = ?', [$acc]);
            Db::exec('DELETE FROM sessions WHERE account_id = ?', [$acc]);
            Db::exec('DELETE FROM devices WHERE account_id = ?', [$acc]);
            Db::exec('DELETE FROM vaults WHERE account_id = ?', [$acc]);
            Db::exec('DELETE FROM pair_invites WHERE account_id = ?', [$acc]);
            $space = Spaces::leaveAccount($acc);
            if ($space !== null) { Audit::log('user', 'space_left', $tomb, ['status' => $space]); }
            Db::exec('DELETE FROM space_ended WHERE account_id = ?', [$acc]);
            Db::exec('DELETE FROM identities WHERE account_id = ?', [$acc]);
            Db::exec('DELETE FROM accounts WHERE id = ?', [$acc]);
            Audit::log('user', 'account_deleted', $tomb);
        });

        $by = Util::plus((int) Config::get('backup_retention_days', 35) * 86400);
        return Response::json(['deletion' => [
            'state' => 'server_completed',
            'serverDeletedAt' => $now,
            'backups' => ['state' => 'expires', 'by' => $by, 'note' => 'Database backups rotate; the copy disappears when the oldest backup expires.'],
            'space' => $space,
            'local' => 'The app erases data on this device. Other devices erase on next contact; copies already exported cannot be erased remotely.',
        ]]);
    }
}
