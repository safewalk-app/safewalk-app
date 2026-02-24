-- Migration: Create economy, privacy, and backend tables for SafeWalk
-- Date: 2026-02-24

-- ============================================================================
-- 1. PROFILES TABLE (Économie + Quotas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  free_alerts_remaining int DEFAULT 3 NOT NULL CHECK (free_alerts_remaining >= 0),
  free_test_sms_remaining int DEFAULT 1 NOT NULL CHECK (free_test_sms_remaining >= 0),
  subscription_active boolean DEFAULT false NOT NULL,
  sms_daily_limit int DEFAULT 10 NOT NULL CHECK (sms_daily_limit > 0),
  sms_sos_daily_limit int DEFAULT 3 NOT NULL CHECK (sms_sos_daily_limit > 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================================
-- 2. CONTACTS TABLE (Urgence)
-- ============================================================================
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL, -- E.164 format: +33612345678
  priority int DEFAULT 1 NOT NULL CHECK (priority >= 1 AND priority <= 5),
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
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  start_time timestamptz DEFAULT now() NOT NULL,
  deadline timestamptz NOT NULL,
  status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'checked_in', 'cancelled', 'alerted')),
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
  user_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
  to_phone text NOT NULL, -- E.164 format
  sms_type text NOT NULL CHECK (sms_type IN ('late', 'sos', 'test')),
  status text DEFAULT 'queued' NOT NULL CHECK (status IN ('queued', 'sent', 'failed')),
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
-- 6. TRIGGERS (updated_at)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
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

-- ============================================================================
-- 8. AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
