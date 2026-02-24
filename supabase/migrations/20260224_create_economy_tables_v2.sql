-- Migration: Create economy, privacy, and backend tables for SafeWalk
-- Date: 2026-02-24
-- Version: 2 (Simplified - no triggers)

-- ============================================================================
-- 1. PROFILES TABLE (Économie + Quotas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY,
  free_alerts_remaining int DEFAULT 3 NOT NULL,
  free_test_sms_remaining int DEFAULT 1 NOT NULL,
  subscription_active boolean DEFAULT false NOT NULL,
  sms_daily_limit int DEFAULT 10 NOT NULL,
  sms_sos_daily_limit int DEFAULT 3 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================================
-- 2. CONTACTS TABLE (Urgence)
-- ============================================================================
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  priority int DEFAULT 1 NOT NULL,
  opted_out boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, phone)
);

-- ============================================================================
-- 3. TRIPS TABLE (Sorties)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  start_time timestamptz DEFAULT now() NOT NULL,
  deadline timestamptz NOT NULL,
  status text DEFAULT 'active' NOT NULL,
  share_location boolean DEFAULT true NOT NULL,
  destination_note text,
  last_lat double precision,
  last_lng double precision,
  last_seen_at timestamptz,
  checkin_at timestamptz,
  cancelled_at timestamptz,
  alert_sent_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================================
-- 4. SMS_LOGS TABLE (Audit SMS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trip_id uuid,
  to_phone text NOT NULL,
  sms_type text NOT NULL,
  status text DEFAULT 'queued' NOT NULL,
  twilio_sid text,
  error text,
  created_at timestamptz DEFAULT now() NOT NULL
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

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Profiles: Users can only see/edit their own profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage profiles" ON profiles
  USING (auth.role() = 'service_role');

-- Contacts: Users can only see/edit their own contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts" ON contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts" ON contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts" ON contacts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage contacts" ON contacts
  USING (auth.role() = 'service_role');

-- Trips: Users can only see/edit their own trips
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trips" ON trips
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trips" ON trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips" ON trips
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips" ON trips
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage trips" ON trips
  USING (auth.role() = 'service_role');

-- SMS_LOGS: Users can only view their own logs, service role can write
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sms logs" ON sms_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage sms logs" ON sms_logs
  USING (auth.role() = 'service_role');
