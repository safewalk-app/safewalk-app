-- Migration: Add economy and quota columns to existing SafeWalk tables
-- Date: 2026-02-24
-- This script adapts to existing table structure

-- ============================================================================
-- 1. ADD COLUMNS TO USERS TABLE (for profiles/quotas)
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_alerts_remaining int DEFAULT 3;
ALTER TABLE users ADD COLUMN IF NOT EXISTS free_test_sms_remaining int DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_active boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_daily_limit int DEFAULT 10;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_sos_daily_limit int DEFAULT 3;

-- ============================================================================
-- 2. ADD COLUMNS TO SESSIONS TABLE (if needed)
-- ============================================================================
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS share_location boolean DEFAULT true;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS destination_note text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_lat double precision;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_lng double precision;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- ============================================================================
-- 3. ENSURE SMS_LOGS HAS ALL REQUIRED COLUMNS
-- ============================================================================
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS session_id uuid;
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS contact_id uuid;

-- ============================================================================
-- 4. CREATE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_active);
CREATE INDEX IF NOT EXISTS idx_sms_logs_user_created ON sms_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON emergency_contacts(user_id);

-- ============================================================================
-- 5. CONFIRM MIGRATION
-- ============================================================================
SELECT 'Economy columns added successfully' as status;
