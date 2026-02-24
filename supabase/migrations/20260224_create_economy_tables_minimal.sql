-- Migration: Create economy tables for SafeWalk (MINIMAL VERSION)
-- Date: 2026-02-24
-- Version: Minimal (Tables only, no RLS, no triggers)

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY,
  free_alerts_remaining int DEFAULT 3,
  free_test_sms_remaining int DEFAULT 1,
  subscription_active boolean DEFAULT false,
  sms_daily_limit int DEFAULT 10,
  sms_sos_daily_limit int DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 2. CONTACTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  priority int DEFAULT 1,
  opted_out boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 3. TRIPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  start_time timestamptz DEFAULT now(),
  deadline timestamptz NOT NULL,
  status text DEFAULT 'active',
  share_location boolean DEFAULT true,
  destination_note text,
  last_lat double precision,
  last_lng double precision,
  last_seen_at timestamptz,
  checkin_at timestamptz,
  cancelled_at timestamptz,
  alert_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 4. SMS_LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trip_id uuid,
  to_phone text NOT NULL,
  sms_type text NOT NULL,
  status text DEFAULT 'queued',
  twilio_sid text,
  error text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 5. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_status_deadline ON trips(status, deadline);
CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id ON sms_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_user_created ON sms_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sms_logs_trip_id ON sms_logs(trip_id);
