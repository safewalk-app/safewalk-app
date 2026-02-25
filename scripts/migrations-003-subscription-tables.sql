-- Migration 003: Subscription Tables and RPC Functions
-- This migration adds all tables and functions needed for the Paywall/Subscription system

-- ============================================================================
-- 1. Create subscriptions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT true,
  stripe_subscription_id VARCHAR UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- ============================================================================
-- 2. Create user_credits table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance INT NOT NULL DEFAULT 0,
  total_earned INT NOT NULL DEFAULT 0,
  total_spent INT NOT NULL DEFAULT 0,
  last_reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);

-- ============================================================================
-- 3. Create transactions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  credits_added INT,
  plan_id VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'pending',
  stripe_transaction_id VARCHAR UNIQUE,
  receipt_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_id ON transactions(stripe_transaction_id);

-- ============================================================================
-- 4. Create credit_usage table
-- ============================================================================

CREATE TABLE IF NOT EXISTS credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  event_type VARCHAR NOT NULL,
  credits_used INT NOT NULL DEFAULT 1,
  reason VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_usage_user_id ON credit_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_created_at ON credit_usage(created_at);

-- ============================================================================
-- 5. RPC: get_user_subscription
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_user_subscription(UUID);

CREATE FUNCTION public.get_user_subscription(p_user_id UUID)
RETURNS TABLE (
  plan_id VARCHAR,
  status VARCHAR,
  started_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  auto_renew BOOLEAN,
  days_remaining INT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.plan_id,
    s.status,
    s.started_at,
    s.ends_at,
    s.auto_renew,
    EXTRACT(DAY FROM (s.ends_at - NOW()))::INT as days_remaining,
    (s.status = 'active' AND (s.ends_at IS NULL OR s.ends_at > NOW())) as is_active
  FROM subscriptions s
  WHERE s.user_id = p_user_id
  LIMIT 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_subscription(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_subscription(UUID) TO authenticated;

-- ============================================================================
-- 6. RPC: get_user_credits
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_user_credits(UUID);

CREATE FUNCTION public.get_user_credits(p_user_id UUID)
RETURNS TABLE (
  balance INT,
  total_earned INT,
  total_spent INT,
  free_alerts_remaining INT,
  subscription_status VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH credits AS (
    SELECT 
      uc.balance,
      uc.total_earned,
      uc.total_spent
    FROM user_credits uc
    WHERE uc.user_id = p_user_id
  ),
  subscription AS (
    SELECT 
      s.status,
      s.plan_id
    FROM subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status = 'active'
      AND (s.ends_at IS NULL OR s.ends_at > NOW())
  ),
  free_quota AS (
    SELECT 
      GREATEST(0, 1 - COALESCE((
        SELECT COUNT(*) FROM credit_usage cu
        WHERE cu.user_id = p_user_id
          AND cu.created_at > DATE_TRUNC('month', NOW())
          AND cu.event_type = 'alert_sms'
      ), 0)) as free_remaining
  )
  SELECT 
    COALESCE(c.balance, 0),
    COALESCE(c.total_earned, 0),
    COALESCE(c.total_spent, 0),
    fq.free_remaining,
    COALESCE(s.status, 'none')
  FROM free_quota fq
  LEFT JOIN credits c ON true
  LEFT JOIN subscription s ON true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_credits(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_credits(UUID) TO authenticated;

-- ============================================================================
-- 7. RPC: get_quota_status
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_quota_status(UUID);

CREATE FUNCTION public.get_quota_status(p_user_id UUID)
RETURNS TABLE (
  has_subscription BOOLEAN,
  subscription_plan VARCHAR,
  subscription_ends_at TIMESTAMPTZ,
  free_alerts_remaining INT,
  paid_credits_balance INT,
  quota_reached BOOLEAN,
  error_code VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH subscription AS (
    SELECT 
      s.plan_id,
      s.ends_at,
      (s.status = 'active' AND (s.ends_at IS NULL OR s.ends_at > NOW())) as is_active
    FROM subscriptions s
    WHERE s.user_id = p_user_id
    LIMIT 1
  ),
  free_quota AS (
    SELECT 
      GREATEST(0, 1 - COALESCE((
        SELECT COUNT(*) FROM credit_usage cu
        WHERE cu.user_id = p_user_id
          AND cu.created_at > DATE_TRUNC('month', NOW())
          AND cu.event_type = 'alert_sms'
      ), 0)) as free_remaining
  ),
  credits AS (
    SELECT balance FROM user_credits WHERE user_id = p_user_id
  )
  SELECT 
    COALESCE(s.is_active, false),
    s.plan_id,
    s.ends_at,
    fq.free_remaining,
    COALESCE(c.balance, 0),
    CASE 
      WHEN COALESCE(s.is_active, false) THEN false
      WHEN fq.free_remaining > 0 THEN false
      WHEN COALESCE(c.balance, 0) > 0 THEN false
      ELSE true
    END as quota_reached,
    CASE 
      WHEN COALESCE(s.is_active, false) THEN 'subscription_active'::VARCHAR
      WHEN fq.free_remaining > 0 THEN 'free_quota_available'::VARCHAR
      WHEN COALESCE(c.balance, 0) > 0 THEN 'credits_available'::VARCHAR
      ELSE 'no_credits'::VARCHAR
    END as error_code
  FROM subscription s
  CROSS JOIN free_quota fq
  CROSS JOIN credits c;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_quota_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quota_status(UUID) TO authenticated;

-- ============================================================================
-- 8. RPC: create_subscription
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_subscription(UUID, VARCHAR, VARCHAR);

CREATE FUNCTION public.create_subscription(
  p_user_id UUID,
  p_plan_id VARCHAR,
  p_stripe_subscription_id VARCHAR
)
RETURNS TABLE (
  success BOOLEAN,
  error_code VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan_id, stripe_subscription_id, status, ends_at)
  VALUES (
    p_user_id,
    p_plan_id,
    p_stripe_subscription_id,
    'active',
    CASE 
      WHEN p_plan_id = 'premium_annual' THEN NOW() + INTERVAL '1 year'
      ELSE NOW() + INTERVAL '1 month'
    END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    status = 'active',
    ends_at = EXCLUDED.ends_at,
    updated_at = NOW();

  RETURN QUERY SELECT true, 'subscription_created'::VARCHAR;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, 'subscription_error'::VARCHAR;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_subscription(UUID, VARCHAR, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_subscription(UUID, VARCHAR, VARCHAR) TO service_role;

-- ============================================================================
-- 9. RPC: add_credits
-- ============================================================================

DROP FUNCTION IF EXISTS public.add_credits(UUID, INT, VARCHAR);

CREATE FUNCTION public.add_credits(
  p_user_id UUID,
  p_credits INT,
  p_reason VARCHAR
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance INT,
  error_code VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INT;
BEGIN
  UPDATE user_credits
  SET 
    balance = balance + p_credits,
    total_earned = total_earned + p_credits,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    INSERT INTO user_credits (user_id, balance, total_earned)
    VALUES (p_user_id, p_credits, p_credits)
    RETURNING balance INTO v_new_balance;
  END IF;

  RETURN QUERY SELECT true, v_new_balance, 'credits_added'::VARCHAR;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, 0, 'credits_error'::VARCHAR;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_credits(UUID, INT, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_credits(UUID, INT, VARCHAR) TO service_role;

-- ============================================================================
-- 10. RPC: cancel_subscription
-- ============================================================================

DROP FUNCTION IF EXISTS public.cancel_subscription(UUID);

CREATE FUNCTION public.cancel_subscription(p_user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  error_code VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE subscriptions
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT true, 'subscription_cancelled'::VARCHAR;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, 'cancel_error'::VARCHAR;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_subscription(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_subscription(UUID) TO authenticated;

-- ============================================================================
-- 11. Enable RLS on new tables
-- ============================================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 12. RLS Policies
-- ============================================================================

-- subscriptions: Users can only see their own
DROP POLICY IF EXISTS "users_read_own_subscription" ON subscriptions;
CREATE POLICY "users_read_own_subscription" ON subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- user_credits: Users can only see their own
DROP POLICY IF EXISTS "users_read_own_credits" ON user_credits;
CREATE POLICY "users_read_own_credits" ON user_credits
  FOR SELECT
  USING (auth.uid() = user_id);

-- transactions: Users can only see their own
DROP POLICY IF EXISTS "users_read_own_transactions" ON transactions;
CREATE POLICY "users_read_own_transactions" ON transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- credit_usage: Users can only see their own
DROP POLICY IF EXISTS "users_read_own_credit_usage" ON credit_usage;
CREATE POLICY "users_read_own_credit_usage" ON credit_usage
  FOR SELECT
  USING (auth.uid() = user_id);
