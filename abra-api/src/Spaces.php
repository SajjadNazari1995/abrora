<?php
declare(strict_types=1);
namespace Abra;

/** Shared space of two accounts. Holds membership only; the data is opaque ciphertext (see SpaceData). */
final class Spaces
{
    public const APP_NAME = 'Abrora';
    public const APP_NAME_SOLO_ACCOUNT = 'Abra';

    public static function spcId(mixed $v): bool { return is_string($v) && preg_match('/^spc_[0-9a-f]{24}$/', $v) === 1; }
    public static function memId(mixed $v): bool { return is_string($v) && preg_match('/^mem_[0-9a-f]{24}$/', $v) === 1; }

    /** @return array{member_id:string,space_id:string,member_role:string,joined_at:string}|null */
    public static function membership(string $accountId): ?array
    {
        return Db::one('SELECT id AS member_id, space_id, member_role, joined_at FROM space_members WHERE account_id = ?', [$accountId]);
    }

    /** Require the caller to be in a space, or 404. */
    public static function require(array $ctx): array
    {
        $m = self::membership($ctx['account']['id']);
        if (!$m) { throw new ApiException(404, 'not_found', 'No shared space.'); }
        return $m;
    }

    public static function memberCount(string $spaceId): int
    {
        return (int) Db::val('SELECT COUNT(*) FROM space_members WHERE space_id = ?', [$spaceId]);
    }

    /** The `space` field of the account object. */
    public static function summary(string $accountId): array
    {
        $m = self::membership($accountId);
        if (!$m) {
            $e = Db::val('SELECT ended_at FROM space_ended WHERE account_id = ?', [$accountId]);
            if ($e !== null && $e !== false) { return ['id' => null, 'state' => 'ended', 'appName' => self::APP_NAME_SOLO_ACCOUNT, 'endedAt' => $e]; }
            return ['id' => null, 'state' => null, 'appName' => self::APP_NAME_SOLO_ACCOUNT];
        }
        return ['id' => $m['space_id'], 'state' => self::memberCount($m['space_id']) >= 2 ? 'paired' : 'solo', 'appName' => self::APP_NAME];
    }

    public static function view(string $spaceId, string $viewerMemberId): array
    {
        $sp = Db::one('SELECT id, created_at FROM spaces WHERE id = ?', [$spaceId]);
        if (!$sp) { throw new ApiException(404, 'not_found', 'No shared space.'); }
        $rows = Db::all('SELECT m.id, m.member_role, m.joined_at, a.display_name, k.public_key FROM space_members m JOIN accounts a ON a.id = m.account_id LEFT JOIN space_member_keys k ON k.member_id = m.id WHERE m.space_id = ? ORDER BY m.joined_at, m.id', [$spaceId]);
        $members = [];
        foreach ($rows as $r) {
            $members[] = ['memberId' => $r['id'], 'displayName' => $r['display_name'], 'role' => $r['member_role'], 'joinedAt' => $r['joined_at'], 'you' => $r['id'] === $viewerMemberId, 'publicKey' => $r['public_key']];
        }
        return ['id' => $sp['id'], 'state' => count($members) >= 2 ? 'paired' : 'solo', 'appName' => self::APP_NAME, 'members' => $members, 'keyFingerprint' => SpaceShare::fingerprint($spaceId), 'createdAt' => $sp['created_at']];
    }

    public static function get(array $ctx): Response
    {
        $m = self::require($ctx);
        return Response::json(['space' => self::view($m['space_id'], $m['member_id'])]);
    }

    /**
     * Unlink: either member may end the shared space at any time, without the other's permission.
     * The space, its shares, messages, keys and shared vault are deleted for both; the other member is
     * told once ('ended') and returns to a solo account. Runs inside the caller's transaction.
     * @return string|null 'ended' (a partner was notified), 'deleted' (nobody else was in it) or null (was not in a space)
     */
    public static function leaveAccount(string $accountId): ?string
    {
        $m = self::membership($accountId);
        if (!$m) { return null; }
        $sid = $m['space_id'];
        $now = Util::now();
        // Row lock so two members unlinking at once cannot both act on a half-removed space.
        Db::exec('UPDATE spaces SET created_at = created_at WHERE id = ?', [$sid]);
        $others = Db::all('SELECT account_id FROM space_members WHERE space_id = ? AND id <> ?', [$sid, $m['member_id']]);
        $mids = array_column(Db::all('SELECT id FROM space_members WHERE space_id = ?', [$sid]), 'id');
        foreach ($mids as $mid) { Db::exec('DELETE FROM space_member_keys WHERE member_id = ?', [$mid]); }
        foreach (['space_shares', 'space_consents', 'space_messages', 'space_keys', 'space_vaults', 'space_members'] as $t) {
            Db::exec("DELETE FROM $t WHERE space_id = ?", [$sid]);
        }
        Db::exec('DELETE FROM spaces WHERE id = ?', [$sid]);
        Db::exec('UPDATE pair_invites SET revoked_at = ? WHERE account_id = ? AND used_at IS NULL AND revoked_at IS NULL', [$now, $accountId]);
        foreach ($others as $o) {
            Db::exec('DELETE FROM space_ended WHERE account_id = ?', [$o['account_id']]);
            Db::exec('INSERT INTO space_ended (account_id, ended_at) VALUES (?, ?)', [$o['account_id'], $now]);
        }
        return $others ? 'ended' : 'deleted';
    }

    public static function leave(array $ctx): Response
    {
        $acc = $ctx['account']['id'];
        $res = Db::tx(fn() => self::leaveAccount($acc));
        if ($res === null) { throw new ApiException(404, 'not_found', 'No shared space.'); }
        Audit::log('user', 'space_left', $acc, ['status' => $res]);
        return Response::json(['space' => $res]);
    }

    public static function activeInvitesCount(): int
    {
        return (int) Db::val('SELECT COUNT(*) FROM pair_invites WHERE used_at IS NULL AND revoked_at IS NULL AND expires_at > ?', [Util::now()]);
    }

    /** Aggregate-only counts for the admin stats. */
    public static function stats(): array
    {
        $paired = (int) Db::val('SELECT COUNT(*) FROM (SELECT space_id FROM space_members GROUP BY space_id HAVING COUNT(*) >= 2) t');
        $total = (int) Db::val('SELECT COUNT(*) FROM spaces');
        return ['total' => $total, 'paired' => $paired, 'solo' => $total - $paired, 'activeInvites' => self::activeInvitesCount()];
    }
}
