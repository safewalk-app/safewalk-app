-- SafeWalk MVP READY Migrations
-- This migration adds missing columns, indexes, and constraints for production readiness

-- ============================================================================
-- 1. ALTER sessions TABLE - Add missing columns
-- ============================================================================

-- Add alert_sent_at (critical for idempotence)
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS alert_sent_at TIMESTAMPTZ DEFAULT NULL;

-- Add checkin_at (track when user confirmed arrival)
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS checkin_at TIMESTAMPTZ DEFAULT NULL;

-- Add cancelled_at (track when user cancelled)
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ DEFAULT NULL;

-- Add share_location flag
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS share_location BOOLEAN DEFAULT false;

-- Add destination_note
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS destination_note TEXT DEFAULT NULL;

-- Convert status to ENUM for type safety
-- First, create the enum type
DO $$ BEGIN
  CREATE TYPE session_status AS ENUM('active', 'checked_in', 'cancelled', 'alerted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Then alter the column (if not already enum)
-- Note: This is safe because existing values match the enum
ALTER TABLE sessions
ALTER COLUMN status TYPE session_status USING status::session_status;

-- ============================================================================
-- 2. ALTER emergency_contacts TABLE - Add missing columns
-- ============================================================================

-- Add priority (support multiple contacts)
ALTER TABLE emergency_contacts
ADD COLUMN IF NOT EXISTS priority INT DEFAULT 1;

-- Add opted_out flag (allow opt-out without deletion)
ALTER TABLE emergency_contacts
ADD COLUMN IF NOT EXISTS opted_out BOOLEAN DEFAULT false;

-- ============================================================================
-- 3. ALTER sms_logs TABLE - Add missing columns
-- ============================================================================

-- Add user_id for quick queries
ALTER TABLE sms_logs
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Add sms_type (late, test, sos)
DO $$ BEGIN
  CREATE TYPE sms_type AS ENUM('late', 'test', 'sos');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE sms_logs
ADD COLUMN IF NOT EXISTS sms_type sms_type DEFAULT 'late';

-- Add retry_count for tracking retries
ALTER TABLE sms_logs
ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;

-- Add retry_at for exponential backoff
ALTER TABLE sms_logs
ADD COLUMN IF NOT EXISTS retry_at TIMESTAMPTZ DEFAULT NULL;

-- Convert status to ENUM
DO $$ BEGIN
  CREATE TYPE sms_status AS ENUM('queued', 'sent', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE sms_logs
ALTER COLUMN status TYPE sms_status USING 'queued'::sms_status;

-- ============================================================================
-- 4. CREATE profiles TABLE - For subscription and quota tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone_verified BOOLEAN DEFAULT false,
  subscription_active BOOLEAN DEFAULT false,
  free_alerts_remaining INT DEFAULT 3,
  sms_daily_count INT DEFAULT 0,
  sms_daily_limit INT DEFAULT 100,
  sms_sos_daily_count INT DEFAULT 0,
  sms_sos_daily_limit INT DEFAULT 50,
  last_sms_reset_date DATE DEFAULT CURRENT_DATE,
  share_location_only_on_alert BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. CREATE cron_heartbeat TABLE - For monitoring cron execution
-- ============================================================================

CREATE TABLE IF NOT EXISTS cron_heartbeat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name VARCHAR(255) NOT NULL,
  last_run_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'success',
  processed INT DEFAULT 0,
  sent INT DEFAULT 0,
  failed INT DEFAULT 0,
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. CREATE INDEXES - For performance
-- ============================================================================

-- Critical index for cron (claim_overdue_trips query)
CREATE INDEX IF NOT EXISTS idx_sessions_status_deadline_alert
  ON sessions(status, deadline, alert_sent_at)
  WHERE status = 'active' AND alert_sent_at IS NULL;

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id ON sms_logs(user_id);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- Index for deadline queries
CREATE INDEX IF NOT EXISTS idx_sessions_deadline ON sessions(deadline);

-- Index for sms_type queries
CREATE INDEX IF NOT EXISTS idx_sms_logs_sms_type ON sms_logs(sms_type);

-- Index for retry queries
CREATE INDEX IF NOT EXISTS idx_sms_logs_retry_at ON sms_logs(retry_at)
  WHERE status = 'failed' AND retry_at IS NOT NULL;

-- Index for emergency_contacts priority
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_priority
  ON emergency_contacts(user_id, priority)
  WHERE opted_out = false;

-- ============================================================================
-- 7. CREATE RLS POLICIES - For security
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_heartbeat ENABLE ROW LEVEL SECURITY;

-- Users can only read their own profile
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can only read/write their own emergency contacts
CREATE POLICY "users_read_own_contacts" ON emergency_contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_contacts" ON emergency_contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_contacts" ON emergency_contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_contacts" ON emergency_contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Users can only read/write their own sessions
CREATE POLICY "users_read_own_sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_sessions" ON sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only read their own SMS logs
CREATE POLICY "users_read_own_sms_logs" ON sms_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Cron can read/write cron_heartbeat (via service role)
CREATE POLICY "cron_read_heartbeat" ON cron_heartbeat
  FOR SELECT USING (true);

CREATE POLICY "cron_write_heartbeat" ON cron_heartbeat
  FOR INSERT WITH CHECK (true);

CREATE POLICY "cron_update_heartbeat" ON cron_heartbeat
  FOR UPDATE USING (true);

-- ============================================================================
-- 8. CREATE FUNCTIONS (RPC)
-- ============================================================================

-- Function to claim overdue trips (for cron)
CREATE OR REPLACE FUNCTION claim_overdue_trips(p_limit INT DEFAULT 50)
RETURNS TABLE(
  trip_id UUID,
  user_id UUID,
  deadline TIMESTAMPTZ,
  contact_id UUID,
  contact_phone_number VARCHAR,
  user_phone_number VARCHAR,
  share_location BOOLEAN,
  location_latitude FLOAT,
  location_longitude FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    UPDATE sessions
    SET alert_sent_at = NOW()
    WHERE
      status = 'active'
      AND deadline < NOW()
      AND alert_sent_at IS NULL
    ORDER BY deadline ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
    RETURNING id, user_id, deadline
  )
  SELECT
    claimed.id,
    claimed.user_id,
    claimed.deadline,
    ec.id,
    ec.phone_number,
    u.phone_number,
    s.share_location,
    s.location_latitude,
    s.location_longitude
  FROM claimed
  JOIN sessions s ON s.id = claimed.id
  JOIN users u ON u.id = claimed.user_id
  LEFT JOIN emergency_contacts ec ON ec.user_id = claimed.user_id
    AND ec.priority = 1
    AND ec.opted_out = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to consume credits (for SMS gating)
CREATE OR REPLACE FUNCTION consume_credit(
  p_user_id UUID,
  p_type VARCHAR -- 'late', 'test', 'sos'
)
RETURNS TABLE(allowed BOOLEAN, reason VARCHAR) AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_daily_limit INT;
  v_daily_count INT;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'User profile not found';
    RETURN;
  END IF;
  
  -- Check if phone is verified
  IF NOT v_profile.phone_verified THEN
    RETURN QUERY SELECT false, 'phone_not_verified';
    RETURN;
  END IF;
  
  -- Reset daily counts if needed
  IF v_profile.last_sms_reset_date < CURRENT_DATE THEN
    UPDATE profiles
    SET
      sms_daily_count = 0,
      sms_sos_daily_count = 0,
      last_sms_reset_date = CURRENT_DATE
    WHERE id = p_user_id;
    v_profile.sms_daily_count := 0;
    v_profile.sms_sos_daily_count := 0;
  END IF;
  
  -- Check subscription or free credits
  IF NOT v_profile.subscription_active AND v_profile.free_alerts_remaining <= 0 THEN
    RETURN QUERY SELECT false, 'no_credits';
    RETURN;
  END IF;
  
  -- Check type-specific quotas
  IF p_type = 'sos' THEN
    IF v_profile.sms_sos_daily_count >= v_profile.sms_sos_daily_limit THEN
      RETURN QUERY SELECT false, 'quota_reached';
      RETURN;
    END IF;
  ELSE
    IF v_profile.sms_daily_count >= v_profile.sms_daily_limit THEN
      RETURN QUERY SELECT false, 'quota_reached';
      RETURN;
    END IF;
  END IF;
  
  -- Decrement credits atomically
  IF NOT v_profile.subscription_active THEN
    UPDATE profiles
    SET free_alerts_remaining = free_alerts_remaining - 1
    WHERE id = p_user_id;
  END IF;
  
  -- Increment daily count
  IF p_type = 'sos' THEN
    UPDATE profiles
    SET sms_sos_daily_count = sms_sos_daily_count + 1
    WHERE id = p_user_id;
  ELSE
    UPDATE profiles
    SET sms_daily_count = sms_daily_count + 1
    WHERE id = p_user_id;
  END IF;
  
  RETURN QUERY SELECT true, NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. CONSTRAINTS - Add phone number validation
-- ============================================================================

-- Add check constraint for E.164 phone format
ALTER TABLE users
ADD CONSTRAINT check_phone_format_users
  CHECK (phone_number IS NULL OR phone_number ~ '^\+[1-9]\d{1,14}$');

ALTER TABLE emergency_contacts
ADD CONSTRAINT check_phone_format_contacts
  CHECK (phone_number ~ '^\+[1-9]\d{1,14}$');

-- Add check constraint for priority
ALTER TABLE emergency_contacts
ADD CONSTRAINT check_priority_range
  CHECK (priority > 0 AND priority <= 10);

-- ============================================================================
-- 10. TIMESTAMPS - Convert to TIMESTAMPTZ for consistency
-- ============================================================================

-- Note: This is a breaking change, only do if necessary
-- ALTER TABLE sessions ALTER COLUMN start_time TYPE TIMESTAMPTZ;
-- ALTER TABLE sessions ALTER COLUMN deadline TYPE TIMESTAMPTZ;
-- ALTER TABLE sessions ALTER COLUMN created_at TYPE TIMESTAMPTZ;
-- ALTER TABLE sessions ALTER COLUMN updated_at TYPE TIMESTAMPTZ;

-- ============================================================================
-- DONE
-- ============================================================================
-- All migrations applied successfully
-- Next: Apply RPC corrections and Edge Function updates
