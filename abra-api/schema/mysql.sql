-- Abra Core API schema (MySQL 8 / MariaDB 10.4+). Idempotent. One statement per ";" at end of line; no ";" inside comments.
CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(40) NOT NULL PRIMARY KEY,
  email_norm VARCHAR(254) NULL,
  email_verified TINYINT NOT NULL DEFAULT 0,
  password_hash VARCHAR(255) NULL,
  display_name VARCHAR(160) NULL,
  locale VARCHAR(8) NOT NULL DEFAULT 'en',
  calendar VARCHAR(16) NOT NULL DEFAULT 'gregorian',
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at VARCHAR(24) NOT NULL,
  last_seen_at VARCHAR(24) NOT NULL,
  UNIQUE KEY ux_accounts_email (email_norm),
  KEY ix_accounts_status (status),
  KEY ix_accounts_created (created_at, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS identities (
  id VARCHAR(40) NOT NULL PRIMARY KEY,
  account_id VARCHAR(40) NOT NULL,
  provider VARCHAR(16) NOT NULL,
  subject VARCHAR(190) NOT NULL,
  created_at VARCHAR(24) NOT NULL,
  UNIQUE KEY ux_identities_sub (provider, subject),
  KEY ix_identities_acc (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(40) NOT NULL PRIMARY KEY,
  account_id VARCHAR(40) NOT NULL,
  label VARCHAR(240) NOT NULL,
  platform VARCHAR(16) NOT NULL,
  public_key VARCHAR(700) NULL,
  created_at VARCHAR(24) NOT NULL,
  last_seen_at VARCHAR(24) NOT NULL,
  revoked_at VARCHAR(24) NULL,
  KEY ix_devices_acc (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(40) NOT NULL PRIMARY KEY,
  account_id VARCHAR(40) NOT NULL,
  device_id VARCHAR(40) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  created_at VARCHAR(24) NOT NULL,
  last_used_at VARCHAR(24) NOT NULL,
  expires_at VARCHAR(24) NOT NULL,
  revoked_at VARCHAR(24) NULL,
  UNIQUE KEY ux_sessions_token (token_hash),
  KEY ix_sessions_acc (account_id),
  KEY ix_sessions_dev (device_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS consents (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  account_ref VARCHAR(48) NOT NULL,
  doc_id VARCHAR(32) NULL,
  consent_key VARCHAR(32) NULL,
  version VARCHAR(32) NULL,
  granted TINYINT NULL,
  locale VARCHAR(8) NOT NULL,
  accepted_at VARCHAR(24) NOT NULL,
  recorded_at VARCHAR(24) NOT NULL,
  tombstoned_at VARCHAR(24) NULL,
  KEY ix_consents_ref (account_ref),
  KEY ix_consents_tomb (tombstoned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS vaults (
  account_id VARCHAR(40) NOT NULL PRIMARY KEY,
  version INT NOT NULL,
  ciphertext MEDIUMTEXT NOT NULL,
  meta TEXT NOT NULL,
  updated_at VARCHAR(24) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS reset_tokens (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  account_id VARCHAR(40) NOT NULL,
  expires_at VARCHAR(24) NOT NULL,
  used_at VARCHAR(24) NULL,
  KEY ix_reset_acc (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS reauth_tokens (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  session_id VARCHAR(40) NOT NULL,
  expires_at VARCHAR(24) NOT NULL,
  used_at VARCHAR(24) NULL,
  KEY ix_reauth_ses (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket VARCHAR(100) NOT NULL,
  window_start BIGINT NOT NULL,
  hits INT NOT NULL,
  PRIMARY KEY (bucket, window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS audit (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  occurred_at VARCHAR(24) NOT NULL,
  actor VARCHAR(16) NOT NULL,
  action VARCHAR(48) NOT NULL,
  target VARCHAR(48) NULL,
  meta_json TEXT NOT NULL,
  KEY ix_audit_at (occurred_at),
  KEY ix_audit_target (target)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS op_errors (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  occurred_at VARCHAR(24) NOT NULL,
  area VARCHAR(16) NOT NULL,
  code VARCHAR(48) NOT NULL,
  app_version VARCHAR(16) NULL,
  route VARCHAR(64) NULL,
  KEY ix_operr_at (occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS settings (
  k VARCHAR(64) NOT NULL PRIMARY KEY,
  v MEDIUMTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
-- ---- v1.1 (Phase 2): partner pairing + shared space. Additive only, safe to re-run on a v1 database ----
CREATE TABLE IF NOT EXISTS spaces (
  id VARCHAR(40) NOT NULL PRIMARY KEY,
  created_at VARCHAR(24) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS space_members (
  id VARCHAR(40) NOT NULL PRIMARY KEY,
  space_id VARCHAR(40) NOT NULL,
  account_id VARCHAR(40) NOT NULL,
  member_role VARCHAR(16) NOT NULL,
  joined_at VARCHAR(24) NOT NULL,
  UNIQUE KEY ux_spmem_acc (account_id),
  KEY ix_spmem_space (space_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS space_vaults (
  space_id VARCHAR(40) NOT NULL PRIMARY KEY,
  version INT NOT NULL,
  ciphertext MEDIUMTEXT NOT NULL,
  meta TEXT NOT NULL,
  updated_by VARCHAR(40) NULL,
  updated_at VARCHAR(24) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS space_keys (
  space_id VARCHAR(40) NOT NULL,
  recipient_member_id VARCHAR(40) NOT NULL,
  key_version INT NOT NULL,
  sender_member_id VARCHAR(40) NULL,
  wrapped_key VARCHAR(1100) NOT NULL,
  created_at VARCHAR(24) NOT NULL,
  updated_at VARCHAR(24) NOT NULL,
  PRIMARY KEY (space_id, recipient_member_id, key_version),
  KEY ix_spkeys_recipient (recipient_member_id),
  KEY ix_spkeys_sender (sender_member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS pair_invites (
  id VARCHAR(40) NOT NULL PRIMARY KEY,
  account_id VARCHAR(40) NOT NULL,
  code_hash CHAR(64) NOT NULL,
  created_at VARCHAR(24) NOT NULL,
  expires_at VARCHAR(24) NOT NULL,
  used_at VARCHAR(24) NULL,
  revoked_at VARCHAR(24) NULL,
  UNIQUE KEY ux_invites_code (code_hash),
  KEY ix_invites_acc (account_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
-- ---- v1.2 (Phase 2b): member keys, selective shares, consent history, messages, ended notices. Additive ----
CREATE TABLE IF NOT EXISTS space_member_keys (
  member_id VARCHAR(40) NOT NULL PRIMARY KEY,
  public_key VARCHAR(200) NOT NULL,
  updated_at VARCHAR(24) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS space_shares (
  space_id VARCHAR(40) NOT NULL,
  member_id VARCHAR(40) NOT NULL,
  category VARCHAR(40) NOT NULL,
  enabled TINYINT NOT NULL,
  ciphertext TEXT NULL,
  meta VARCHAR(1100) NULL,
  key_version INT NOT NULL,
  updated_at VARCHAR(24) NOT NULL,
  PRIMARY KEY (space_id, member_id, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS space_consents (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  space_id VARCHAR(40) NOT NULL,
  at VARCHAR(24) NOT NULL,
  actor_member_id VARCHAR(40) NOT NULL,
  action VARCHAR(20) NOT NULL,
  category VARCHAR(40) NULL,
  KEY ix_spcons_space (space_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS space_messages (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  space_id VARCHAR(40) NOT NULL,
  sender_member_id VARCHAR(40) NOT NULL,
  kind VARCHAR(10) NOT NULL,
  ciphertext VARCHAR(6000) NOT NULL,
  client_id VARCHAR(40) NOT NULL,
  created_at VARCHAR(24) NOT NULL,
  UNIQUE KEY ux_spmsg_client (space_id, sender_member_id, client_id),
  KEY ix_spmsg_space (space_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
CREATE TABLE IF NOT EXISTS space_ended (
  account_id VARCHAR(40) NOT NULL PRIMARY KEY,
  ended_at VARCHAR(24) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
