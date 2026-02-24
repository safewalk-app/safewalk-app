-- Migration: Create RPC functions for atomic trip and credit management
-- Date: 2026-02-24
-- Security: service_role only (via RLS policies)
-- ADAPTED: Removed priority/opted_out filters (not in emergency_contacts table)

-- ============================================================================
-- 1. RPC: claim_overdue_trips
-- ============================================================================
-- Purpose: Atomically claim overdue active trips for alert processing
-- Called by: cron-check-deadlines (server-only)
-- Returns: Array of claimed trip IDs with user and contact info
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_overdue_trips(p_limit int DEFAULT 50)
RETURNS TABLE (
  trip_id uuid,
  user_id uuid,
  deadline timestamp without time zone,
  contact_id uuid,
  contact_phone_number text,
  user_phone_number text,
  share_location boolean,
  location_latitude double precision,
  location_longitude double precision,
  last_seen_at timestamp without time zone
) AS $$
DECLARE
  v_claimed_count int := 0;
BEGIN
  -- Claim overdue trips with FOR UPDATE SKIP LOCKED for atomicity
  RETURN QUERY
  WITH claimed_trips AS (
    UPDATE public.sessions
    SET 
      status = 'alerted',
      alert_sent_at = now()
    WHERE 
      id IN (
        SELECT s.id
        FROM public.sessions s
        WHERE 
          s.status = 'active'
          AND s.deadline <= now()
          AND s.alert_sent_at IS NULL
        ORDER BY s.deadline ASC
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
      )
    RETURNING 
      id,
      user_id,
      deadline,
      share_location,
      location_latitude,
      location_longitude,
      last_seen_at
  )
  SELECT 
    ct.id,
    ct.user_id,
    ct.deadline,
    ec.id,
    ec.phone_number,
    u.phone_number,
    ct.share_location,
    ct.location_latitude,
    ct.location_longitude,
    ct.last_seen_at
  FROM claimed_trips ct
  JOIN public.users u ON ct.user_id = u.id
  LEFT JOIN public.emergency_contacts ec ON ct.user_id = ec.user_id
  ORDER BY ct.deadline ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service_role only
REVOKE EXECUTE ON FUNCTION public.claim_overdue_trips(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_overdue_trips(int) TO service_role;

-- ============================================================================
-- 2. RPC: consume_credit
-- ============================================================================
-- Purpose: Atomically consume user credits with quota validation
-- Called by: cron-check-deadlines (server-only) and test-sms (client-auth)
-- Returns: allowed (boolean), reason (text), remaining_credits (int)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.consume_credit(
  p_user_id uuid,
  p_type text
)
RETURNS TABLE (
  allowed boolean,
  reason text,
  remaining_credits int
) AS $$
DECLARE
  v_subscription_active boolean;
  v_free_alerts_remaining int;
  v_free_test_sms_remaining int;
  v_sms_daily_limit int;
  v_sos_daily_limit int;
  v_daily_count int;
  v_sos_daily_count int;
  v_today_start timestamp without time zone;
BEGIN
  -- Get user profile
  SELECT 
    subscription_active,
    free_alerts_remaining,
    free_test_sms_remaining,
    sms_daily_limit,
    sms_sos_daily_limit
  INTO 
    v_subscription_active,
    v_free_alerts_remaining,
    v_free_test_sms_remaining,
    v_sms_daily_limit,
    v_sos_daily_limit
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'user_not_found'::text, 0;
    RETURN;
  END IF;

  -- Calculate today's start
  v_today_start := date_trunc('day', now());

  -- Check daily SMS quota (for all types except SOS in MVP)
  SELECT COUNT(*)
  INTO v_daily_count
  FROM public.sms_logs
  WHERE 
    user_id = p_user_id
    AND created_at >= v_today_start
    AND sms_type IN ('alert', 'test');

  -- Check daily SOS quota
  SELECT COUNT(*)
  INTO v_sos_daily_count
  FROM public.sms_logs
  WHERE 
    user_id = p_user_id
    AND created_at >= v_today_start
    AND sms_type = 'sos';

  -- Handle subscription users: quotas only, no credit deduction
  IF v_subscription_active THEN
    -- Check daily SMS quota
    IF p_type IN ('late', 'test') AND v_daily_count >= v_sms_daily_limit THEN
      RETURN QUERY SELECT false, 'quota_reached'::text, 0;
      RETURN;
    END IF;

    -- Check SOS quota
    IF p_type = 'sos' AND v_sos_daily_count >= v_sos_daily_limit THEN
      RETURN QUERY SELECT false, 'quota_reached'::text, 0;
      RETURN;
    END IF;

    -- Subscription user: allowed
    RETURN QUERY SELECT true, 'subscription_active'::text, -1;
    RETURN;
  END IF;

  -- Handle free users: credit deduction + quota check
  CASE p_type
    WHEN 'late' THEN
      -- Check daily SMS quota
      IF v_daily_count >= v_sms_daily_limit THEN
        RETURN QUERY SELECT false, 'quota_reached'::text, v_free_alerts_remaining;
        RETURN;
      END IF;

      -- Check free alerts credit
      IF v_free_alerts_remaining <= 0 THEN
        RETURN QUERY SELECT false, 'no_credits'::text, 0;
        RETURN;
      END IF;

      -- Deduct credit
      UPDATE public.users
      SET free_alerts_remaining = free_alerts_remaining - 1
      WHERE id = p_user_id;

      RETURN QUERY SELECT true, 'credit_consumed'::text, v_free_alerts_remaining - 1;
      RETURN;

    WHEN 'test' THEN
      -- Check daily SMS quota
      IF v_daily_count >= v_sms_daily_limit THEN
        RETURN QUERY SELECT false, 'quota_reached'::text, v_free_test_sms_remaining;
        RETURN;
      END IF;

      -- Check free test SMS credit
      IF v_free_test_sms_remaining <= 0 THEN
        RETURN QUERY SELECT false, 'no_test_credit'::text, 0;
        RETURN;
      END IF;

      -- Deduct credit
      UPDATE public.users
      SET free_test_sms_remaining = free_test_sms_remaining - 1
      WHERE id = p_user_id;

      RETURN QUERY SELECT true, 'credit_consumed'::text, v_free_test_sms_remaining - 1;
      RETURN;

    WHEN 'sos' THEN
      -- Check SOS quota only (MVP: quota-only, no credit deduction)
      IF v_sos_daily_count >= v_sos_daily_limit THEN
        RETURN QUERY SELECT false, 'quota_reached'::text, 0;
        RETURN;
      END IF;

      -- SOS allowed (quota check passed)
      RETURN QUERY SELECT true, 'sos_allowed'::text, 0;
      RETURN;

    ELSE
      RETURN QUERY SELECT false, 'invalid_type'::text, 0;
      RETURN;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service_role only
REVOKE EXECUTE ON FUNCTION public.consume_credit(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_credit(uuid, text) TO service_role;

-- ============================================================================
-- 3. HELPER: get_sms_daily_count
-- ============================================================================
-- Purpose: Get SMS count for a user in the last 24 hours
-- Used by: consume_credit and monitoring

CREATE OR REPLACE FUNCTION public.get_sms_daily_count(
  p_user_id uuid,
  p_type text DEFAULT NULL
)
RETURNS int AS $$
DECLARE
  v_count int;
  v_today_start timestamp without time zone;
BEGIN
  v_today_start := date_trunc('day', now());

  SELECT COUNT(*)
  INTO v_count
  FROM public.sms_logs
  WHERE 
    user_id = p_user_id
    AND created_at >= v_today_start
    AND (p_type IS NULL OR sms_type = p_type);

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service_role only
REVOKE EXECUTE ON FUNCTION public.get_sms_daily_count(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sms_daily_count(uuid, text) TO service_role;

-- ============================================================================
-- 4. CREATE INDEXES FOR RPC PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sessions_status_deadline_alert 
ON public.sessions(status, deadline, alert_sent_at)
WHERE status = 'active' AND alert_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sms_logs_user_created_type 
ON public.sms_logs(user_id, created_at, sms_type);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id 
ON public.emergency_contacts(user_id);

-- ============================================================================
-- CONFIRM MIGRATION
-- ============================================================================
SELECT 'RPC functions created successfully' as migration_status;
