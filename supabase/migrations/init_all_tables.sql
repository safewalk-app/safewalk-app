-- SafeWalk Database Schema
-- This script creates all necessary tables for SafeWalk

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  first_name character varying NOT NULL,
  phone_number character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  free_alerts_remaining integer DEFAULT 3,
  free_test_sms_remaining integer DEFAULT 1,
  subscription_active boolean DEFAULT false,
  sms_daily_limit integer DEFAULT 10,
  sms_sos_daily_limit integer DEFAULT 3,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- 2. Emergency Contacts Table
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name character varying NOT NULL,
  phone_number character varying NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT emergency_contacts_pkey PRIMARY KEY (id),
  CONSTRAINT emergency_contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- 3. Sessions Table
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  start_time timestamp without time zone NOT NULL,
  deadline timestamp without time zone NOT NULL,
  status character varying DEFAULT 'active'::character varying,
  location_latitude double precision,
  location_longitude double precision,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  share_location boolean DEFAULT true,
  destination_note text,
  last_seen_at timestamp without time zone,
  alert_sent_at timestamp without time zone,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- 4. SMS Logs Table
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  message_sid character varying,
  status character varying DEFAULT 'pending'::character varying,
  error_message text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  user_id uuid,
  sms_type character varying DEFAULT 'alert'::character varying,
  twilio_sid character varying,
  CONSTRAINT sms_logs_pkey PRIMARY KEY (id),
  CONSTRAINT sms_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE,
  CONSTRAINT sms_logs_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.emergency_contacts(id) ON DELETE CASCADE,
  CONSTRAINT sms_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- 5. OTP Verifications Table
CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  otp_code text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  verified_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT otp_verifications_pkey PRIMARY KEY (id)
);

-- 6. OTP Logs Table
CREATE TABLE IF NOT EXISTS public.otp_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  action text NOT NULL,
  attempt_number integer,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT otp_logs_pkey PRIMARY KEY (id)
);

-- 7. Rate Limit Config Table
CREATE TABLE IF NOT EXISTS public.rate_limit_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  endpoint text NOT NULL UNIQUE CHECK (endpoint ~ '^[a-z0-9_-]+$'::text),
  max_requests integer NOT NULL DEFAULT 10 CHECK (max_requests > 0),
  window_seconds integer NOT NULL DEFAULT 60 CHECK (window_seconds > 0),
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rate_limit_config_pkey PRIMARY KEY (id)
);

-- 8. Rate Limit Logs Table
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  endpoint text NOT NULL CHECK (endpoint ~ '^[a-z0-9_-]+$'::text),
  ip_address text,
  timestamp timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rate_limit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT rate_limit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 9. Rate Limit Errors Table
CREATE TABLE IF NOT EXISTS public.rate_limit_errors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  endpoint text NOT NULL CHECK (endpoint ~ '^[a-z0-9_-]+$'::text),
  user_id uuid,
  ip_address text,
  error_count integer DEFAULT 1,
  last_error_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rate_limit_errors_pkey PRIMARY KEY (id),
  CONSTRAINT rate_limit_errors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 10. Rate Limit Alerts Table
CREATE TABLE IF NOT EXISTS public.rate_limit_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  endpoint text NOT NULL CHECK (endpoint ~ '^[a-z0-9_-]+$'::text),
  severity text NOT NULL DEFAULT 'WARNING'::text CHECK (severity = ANY (ARRAY['CRITICAL'::text, 'WARNING'::text, 'INFO'::text])),
  message text NOT NULL,
  error_count integer,
  affected_users integer,
  triggered_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rate_limit_alerts_pkey PRIMARY KEY (id)
);

-- 11. Rate Limit Abuse Patterns Table
CREATE TABLE IF NOT EXISTS public.rate_limit_abuse_patterns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  pattern_type text NOT NULL CHECK (pattern_type = ANY (ARRAY['user_id'::text, 'ip_address'::text, 'combo'::text])),
  pattern_value text NOT NULL,
  error_count integer DEFAULT 1,
  first_seen_at timestamp with time zone DEFAULT now(),
  last_seen_at timestamp with time zone DEFAULT now(),
  severity text DEFAULT 'WARNING'::text CHECK (severity = ANY (ARRAY['LOW'::text, 'MEDIUM'::text, 'HIGH'::text, 'CRITICAL'::text])),
  is_blocked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rate_limit_abuse_patterns_pkey PRIMARY KEY (id)
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON public.users(phone_number);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON public.emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_session_id ON public.sms_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id ON public.sms_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_phone_number ON public.otp_verifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_logs_phone_number ON public.otp_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_user_id ON public.rate_limit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_endpoint ON public.rate_limit_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limit_errors_endpoint ON public.rate_limit_errors(endpoint);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Users can only see their own data
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Emergency Contacts - Users can only see their own contacts
CREATE POLICY "Users can view own emergency contacts" ON public.emergency_contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emergency contacts" ON public.emergency_contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emergency contacts" ON public.emergency_contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own emergency contacts" ON public.emergency_contacts
  FOR DELETE USING (auth.uid() = user_id);

-- Sessions - Users can only see their own sessions
CREATE POLICY "Users can view own sessions" ON public.sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- SMS Logs - Users can only see their own SMS logs
CREATE POLICY "Users can view own SMS logs" ON public.sms_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Insert default rate limit configs
INSERT INTO public.rate_limit_config (endpoint, max_requests, window_seconds, description)
VALUES
  ('send-otp', 5, 3600, 'Max 5 OTP sends per hour'),
  ('verify-otp', 10, 3600, 'Max 10 OTP verifications per hour'),
  ('start-session', 10, 3600, 'Max 10 session starts per hour'),
  ('end-session', 10, 3600, 'Max 10 session ends per hour'),
  ('send-sms', 20, 3600, 'Max 20 SMS per hour')
ON CONFLICT (endpoint) DO NOTHING;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
