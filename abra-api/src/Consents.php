<?php
declare(strict_types=1);
namespace Abra;

final class Consents
{
    /** Required docs whose highest accepted version is lower than the current one. */
    public static function needs(string $accountId): array
    {
        $need = [];
        foreach (Settings::legal() as $doc => $current) {
            if (!in_array($doc, Settings::REQUIRED_DOCS, true)) { continue; }
            $max = Db::val('SELECT MAX(version) FROM consents WHERE account_ref = ? AND doc_id = ?', [$accountId, $doc]);
            if ($max === null || strcmp((string) $max, (string) $current) < 0) { $need[] = $doc; }
        }
        return $need;
    }

    public static function record(array $account, Request $req): Response
    {
        $b = $req->json();
        $records = $b['records'] ?? null;
        if (!is_array($records) || $records === [] || !array_is_list($records) || count($records) > 20) {
            throw new ApiException(400, 'invalid_request', 'records must be a list of 1 to 20 items.');
        }
        $legal = Settings::legal();
        $rows = [];
        foreach ($records as $r) {
            if (!is_array($r)) { throw new ApiException(400, 'invalid_request', 'Invalid record.'); }
            $locale = $r['locale'] ?? 'en';
            if (!is_string($locale) || !in_array($locale, ['en', 'fa', 'de'], true)) { throw new ApiException(400, 'invalid_request', 'Invalid locale.'); }
            $ts = Util::now();
            if (isset($r['acceptedAt'])) {
                $t = Util::parseIso($r['acceptedAt']);
                if ($t === null || $t > time() + 86400) { throw new ApiException(400, 'invalid_request', 'Invalid acceptedAt.'); }
                $ts = Util::at($t);
            }
            if (isset($r['docId'])) {
                $doc = $r['docId'];
                if (!is_string($doc) || !in_array($doc, Settings::REQUIRED_DOCS, true)) { throw new ApiException(400, 'invalid_request', 'Unknown document.'); }
                $ver = $r['version'] ?? null;
                if (!is_string($ver) || preg_match('/^[0-9A-Za-z._-]{1,32}$/', $ver) !== 1) { throw new ApiException(400, 'invalid_request', 'Invalid version.'); }
                if ($ver !== ($legal[$doc] ?? null)) {
                    throw new ApiException(409, 'conflict', 'This document version is not current.', ['currentVersion' => $legal[$doc] ?? null, 'docId' => $doc]);
                }
                $rows[] = [$doc, null, $ver, null, $locale, $ts];
            } elseif (isset($r['key'])) {
                $key = $r['key'];
                if (!is_string($key) || !in_array($key, Settings::OPTIONAL_KEYS, true)) { throw new ApiException(400, 'invalid_request', 'Unknown consent key.'); }
                if (!is_bool($r['granted'] ?? null)) { throw new ApiException(400, 'invalid_request', 'granted must be true or false.'); }
                $rows[] = [null, $key, null, $r['granted'] ? 1 : 0, $locale, $ts];
            } else {
                throw new ApiException(400, 'invalid_request', 'Each record needs docId or key.');
            }
        }
        Db::tx(function () use ($rows, $account) {
            foreach ($rows as [$doc, $key, $ver, $granted, $locale, $ts]) {
                Db::exec('INSERT INTO consents (account_ref, doc_id, consent_key, version, granted, locale, accepted_at, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [$account['id'], $doc, $key, $ver, $granted, $locale, $ts, Util::now()]);
            }
        });
        Audit::log('user', 'consent_recorded', $account['id'], ['count' => count($rows)]);
        return Response::json(['consents' => self::effective($account['id']), 'needsConsent' => self::needs($account['id'])]);
    }

    public static function effective(string $accountId): array
    {
        $out = [];
        foreach (Settings::REQUIRED_DOCS as $doc) {
            $r = Db::one('SELECT version, locale, accepted_at, recorded_at FROM consents WHERE account_ref = ? AND doc_id = ? ORDER BY id DESC LIMIT 1', [$accountId, $doc]);
            if ($r) { $out[] = ['docId' => $doc, 'version' => $r['version'], 'locale' => $r['locale'], 'acceptedAt' => $r['accepted_at'], 'recordedAt' => $r['recorded_at']]; }
        }
        foreach (Settings::OPTIONAL_KEYS as $key) {
            $r = Db::one('SELECT granted, locale, accepted_at, recorded_at FROM consents WHERE account_ref = ? AND consent_key = ? ORDER BY id DESC LIMIT 1', [$accountId, $key]);
            if ($r) { $out[] = ['key' => $key, 'granted' => (bool) $r['granted'], 'locale' => $r['locale'], 'acceptedAt' => $r['accepted_at'], 'recordedAt' => $r['recorded_at']]; }
        }
        return $out;
    }

    public static function show(array $account): Response
    {
        $hist = [];
        foreach (Db::all('SELECT doc_id, consent_key, version, granted, locale, accepted_at, recorded_at FROM consents WHERE account_ref = ? ORDER BY id DESC LIMIT 100', [$account['id']]) as $r) {
            $h = $r['doc_id'] !== null ? ['docId' => $r['doc_id'], 'version' => $r['version']] : ['key' => $r['consent_key'], 'granted' => (bool) $r['granted']];
            $hist[] = $h + ['locale' => $r['locale'], 'acceptedAt' => $r['accepted_at'], 'recordedAt' => $r['recorded_at']];
        }
        return Response::json(['consents' => self::effective($account['id']), 'needsConsent' => self::needs($account['id']), 'history' => $hist]);
    }
}
