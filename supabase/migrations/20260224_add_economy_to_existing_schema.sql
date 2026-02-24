-- Migration: Add economy and quota columns to existing SafeWalk schema
-- Date: 2026-02-24
-- Adapts to existing table structure (users, sessions, emergency_contacts, sms_logs)

-- ============================================================================
-- 1. ADD ECONOMY COLUMNS TO USERS TABLE
-- ============================================================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS free_alerts_remaining integer DEFAULT 3;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS free_test_sms_remaining integer DEFAULT 1;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_active boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sms_daily_limit integer DEFAULT 10;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sms_sos_daily_limit integer DEFAULT 3;

-- ============================================================================
-- 2. ADD PRIVACY/LOCATION COLUMNS TO SESSIONS TABLE
-- ============================================================================
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS share_location boolean DEFAULT true;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS destination_note text;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS last_seen_at timestamp without time zone;

-- ============================================================================
-- 3. ADD COLUMNS TO SMS_LOGS TABLE
-- ============================================================================
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS sms_type character varying(50) DEFAULT 'alert';
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS twilio_sid character varying(255);

-- ============================================================================
-- 4. ADD FOREIGN KEY CONSTRAINT FOR SMS_LOGS.USER_ID
-- ============================================================================
ALTER TABLE public.sms_logs 
ADD CONSTRAINT sms_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ============================================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_subscription_active ON public.users(subscription_active);
CREATE INDEX IF NOT EXISTS idx_users_free_alerts ON public.users(free_alerts_remaining);
CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id ON public.sms_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON public.sms_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_logs_user_created ON public.sms_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_status_deadline ON public.sessions(status, deadline);

-- ============================================================================
-- 6. CONFIRM MIGRATION
-- ============================================================================
SELECT 'Economy columns added to existing schema successfully' as migration_status;
