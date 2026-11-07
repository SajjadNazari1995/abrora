-- Abra Core API schema (SQLite). Idempotent. One statement per ";" at end of line; no ";" inside comments.
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email_norm TEXT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  password_hash TEXT NULL,
  display_name TEXT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  calendar TEXT NOT NULL DEFAULT 'gregorian',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_accounts_email ON accounts(email_norm);
CREATE INDEX IF NOT EXISTS ix_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS ix_accounts_created ON accounts(created_at, id);
CREATE TABLE IF NOT EXISTS identities (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  subject TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_identities_sub ON identities(provider, subject);
CREATE INDEX IF NOT EXISTS ix_identities_acc ON identities(account_id);
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  label TEXT NOT NULL,
  platform TEXT NOT NULL,
  public_key TEXT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  revoked_at TEXT NULL
);
CREATE INDEX IF NOT EXISTS ix_devices_acc ON devices(account_id);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS ix_sessions_acc ON sessions(account_id);
CREATE INDEX IF NOT EXISTS ix_sessions_dev ON sessions(device_id);
CREATE TABLE IF NOT EXISTS consents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_ref TEXT NOT NULL,
  doc_id TEXT NULL,
  consent_key TEXT NULL,
  version TEXT NULL,
  granted INTEGER NULL,
  locale TEXT NOT NULL,
  accepted_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  tombstoned_at TEXT NULL
);
CREATE INDEX IF NOT EXISTS ix_consents_ref ON consents(account_ref);
CREATE INDEX IF NOT EXISTS ix_consents_tomb ON consents(tombstoned_at);
CREATE TABLE IF NOT EXISTS vaults (
  account_id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  ciphertext TEXT NOT NULL,
  meta TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reset_tokens (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT NULL
);
CREATE INDEX IF NOT EXISTS ix_reset_acc ON reset_tokens(account_id);
CREATE TABLE IF NOT EXISTS reauth_tokens (
  token_hash TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT NULL
);
CREATE INDEX IF NOT EXISTS ix_reauth_ses ON reauth_tokens(session_id);
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  hits INTEGER NOT NULL,
  PRIMARY KEY (bucket, window_start)
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  occurred_at TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NULL,
  meta_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_audit_at ON audit(occurred_at);
CREATE INDEX IF NOT EXISTS ix_audit_target ON audit(target);
CREATE TABLE IF NOT EXISTS op_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  occurred_at TEXT NOT NULL,
  area TEXT NOT NULL,
  code TEXT NOT NULL,
  app_version TEXT NULL,
  route TEXT NULL
);
CREATE INDEX IF NOT EXISTS ix_operr_at ON op_errors(occurred_at);
CREATE TABLE IF NOT EXISTS settings (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
-- ---- v1.1 (Phase 2): partner pairing + shared space. Additive only, safe to re-run on a v1 database ----
CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS space_members (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  member_role TEXT NOT NULL,
  joined_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_spmem_acc ON space_members(account_id);
CREATE INDEX IF NOT EXISTS ix_spmem_space ON space_members(space_id);
CREATE TABLE IF NOT EXISTS space_vaults (
  space_id TEXT PRIMARY KEY,
  version INTEGER NOT NULL,
  ciphertext TEXT NOT NULL,
  meta TEXT NOT NULL,
  updated_by TEXT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS space_keys (
  space_id TEXT NOT NULL,
  recipient_member_id TEXT NOT NULL,
  key_version INTEGER NOT NULL,
  sender_member_id TEXT NULL,
  wrapped_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (space_id, recipient_member_id, key_version)
);
CREATE INDEX IF NOT EXISTS ix_spkeys_recipient ON space_keys(recipient_member_id);
CREATE INDEX IF NOT EXISTS ix_spkeys_sender ON space_keys(sender_member_id);
CREATE TABLE IF NOT EXISTS pair_invites (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT NULL,
  revoked_at TEXT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_invites_code ON pair_invites(code_hash);
CREATE INDEX IF NOT EXISTS ix_invites_acc ON pair_invites(account_id);
-- ---- v1.2 (Phase 2b): member keys, selective shares, consent history, messages, ended notices. Additive ----
CREATE TABLE IF NOT EXISTS space_member_keys (
  member_id TEXT PRIMARY KEY,
  public_key TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS space_shares (
  space_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  category TEXT NOT NULL,
  enabled INTEGER NOT NULL,
  ciphertext TEXT NULL,
  meta TEXT NULL,
  key_version INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (space_id, member_id, category)
);
CREATE TABLE IF NOT EXISTS space_consents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id TEXT NOT NULL,
  at TEXT NOT NULL,
  actor_member_id TEXT NOT NULL,
  action TEXT NOT NULL,
  category TEXT NULL
);
CREATE INDEX IF NOT EXISTS ix_spcons_space ON space_consents(space_id);
CREATE TABLE IF NOT EXISTS space_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id TEXT NOT NULL,
  sender_member_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  client_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_spmsg_client ON space_messages(space_id, sender_member_id, client_id);
CREATE INDEX IF NOT EXISTS ix_spmsg_space ON space_messages(space_id, id);
CREATE TABLE IF NOT EXISTS space_ended (
  account_id TEXT PRIMARY KEY,
  ended_at TEXT NOT NULL
);
