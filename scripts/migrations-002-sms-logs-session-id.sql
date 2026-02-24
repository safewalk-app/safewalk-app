-- Migration 002: Add session_id to sms_logs for idempotence checks
-- Run this AFTER migrations-001-mvp-ready-simple.sql

-- Add session_id column to sms_logs
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id);

-- Create index for idempotence checks (find alerts already sent for a session)
CREATE INDEX IF NOT EXISTS idx_sms_logs_session_id ON sms_logs(session_id);

-- Composite index for the idempotence query in cron-check-deadlines
CREATE INDEX IF NOT EXISTS idx_sms_logs_session_type_status ON sms_logs(session_id, sms_type, status);
