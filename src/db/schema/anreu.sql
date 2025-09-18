-- src/db/schema/anreu.sql
CREATE TABLE IF NOT EXISTS anreu_uploads (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  file_name TEXT NOT NULL,
  file_hash VARCHAR(32) UNIQUE NOT NULL,
  parsed_data JSONB NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT false,
  validation_errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reserve_allocations (
  id VARCHAR(36) PRIMARY KEY,
  upload_id VARCHAR(36) REFERENCES anreu_uploads(id),
  wallet_address VARCHAR(42) NOT NULL,
  quantity INT NOT NULL,
  serial_range VARCHAR(50) NOT NULL,
  vintage INT NOT NULL,
  project_id VARCHAR(50) NOT NULL,
  facility_id VARCHAR(50),
  tx_hash VARCHAR(66),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: anreu_transfers
CREATE TABLE anreu_transfers (
  id VARCHAR(36) PRIMARY KEY, -- "trf_..."
  reserve_id VARCHAR(36) REFERENCES reserve_allocations(id),
  quantity INT NOT NULL,
  destination_account VARCHAR(50) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, completed, failed
  completed_at TIMESTAMPTZ,
  accu_serials JSONB, -- ["ACCU1000000", ...]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
