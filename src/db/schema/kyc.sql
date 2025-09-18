-- src/db/schema/kyc.sql
CREATE TABLE IF NOT EXISTS kyc_results (
  user_id VARCHAR(36) NOT NULL,
  status VARCHAR(20) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);