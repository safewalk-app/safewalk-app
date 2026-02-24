-- Migration: Create OTP verification tables
-- Date: 2026-02-24
-- Purpose: Store OTP codes for SMS authentication

-- Table: otp_verifications
-- Stores temporary OTP codes for phone number verification
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  otp_code TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_otp_verifications_phone ON otp_verifications(phone_number);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_otp_verifications_expires_at ON otp_verifications(expires_at);

-- Table: otp_logs
-- Audit trail for OTP attempts
CREATE TABLE IF NOT EXISTS otp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  action TEXT NOT NULL, -- 'send', 'verify_success', 'verify_failed', 'expired'
  attempt_number INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_otp_logs_phone ON otp_logs(phone_number);

-- Index for action lookups
CREATE INDEX IF NOT EXISTS idx_otp_logs_action ON otp_logs(action);

-- Enable Row Level Security (RLS)
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow all operations (will be restricted in production)
CREATE POLICY "Allow all operations on otp_verifications" ON otp_verifications
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on otp_logs" ON otp_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Add comments
COMMENT ON TABLE otp_verifications IS 'Stores temporary OTP codes for SMS phone verification';
COMMENT ON TABLE otp_logs IS 'Audit trail for OTP send and verification attempts';
COMMENT ON COLUMN otp_verifications.otp_code IS '6-digit code sent via SMS';
COMMENT ON COLUMN otp_verifications.attempts IS 'Number of failed verification attempts';
COMMENT ON COLUMN otp_verifications.expires_at IS 'OTP expires after 10 minutes';
COMMENT ON COLUMN otp_verifications.verified_at IS 'Timestamp when OTP was successfully verified';
