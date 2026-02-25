-- Migration 005: Rate Limit Monitoring
-- Ajoute les tables et fonctions pour tracker et alerter sur les erreurs 429

-- Table pour tracker les erreurs 429
CREATE TABLE IF NOT EXISTS rate_limit_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  error_count INT DEFAULT 1,
  last_error_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT rate_limit_errors_endpoint_check CHECK (endpoint ~ '^[a-z0-9_-]+$')
);

-- Table pour les alertes automatiques
CREATE TABLE IF NOT EXISTS rate_limit_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'WARNING', -- CRITICAL, WARNING, INFO
  message TEXT NOT NULL,
  error_count INT,
  affected_users INT,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT rate_limit_alerts_severity_check CHECK (severity IN ('CRITICAL', 'WARNING', 'INFO')),
  CONSTRAINT rate_limit_alerts_endpoint_check CHECK (endpoint ~ '^[a-z0-9_-]+$')
);

-- Table pour tracker les patterns d'abus
CREATE TABLE IF NOT EXISTS rate_limit_abuse_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  pattern_type TEXT NOT NULL, -- 'user_id', 'ip_address', 'combo'
  pattern_value TEXT NOT NULL,
  error_count INT DEFAULT 1,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  severity TEXT DEFAULT 'WARNING', -- LOW, MEDIUM, HIGH, CRITICAL
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT rate_limit_abuse_patterns_type_check CHECK (pattern_type IN ('user_id', 'ip_address', 'combo')),
  CONSTRAINT rate_limit_abuse_patterns_severity_check CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
);

-- Indexes pour les requêtes rapides
CREATE INDEX IF NOT EXISTS idx_rate_limit_errors_endpoint_timestamp 
ON rate_limit_errors(endpoint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_errors_user_id_endpoint 
ON rate_limit_errors(user_id, endpoint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_errors_ip_endpoint 
ON rate_limit_errors(ip_address, endpoint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_alerts_endpoint_triggered 
ON rate_limit_alerts(endpoint, triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_alerts_severity 
ON rate_limit_alerts(severity, triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_abuse_patterns_endpoint 
ON rate_limit_abuse_patterns(endpoint, severity DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_abuse_patterns_pattern 
ON rate_limit_abuse_patterns(pattern_type, pattern_value);

-- RPC function pour logger une erreur 429
CREATE OR REPLACE FUNCTION log_rate_limit_error(
  p_endpoint TEXT,
  p_user_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Insérer ou mettre à jour l'erreur
  INSERT INTO rate_limit_errors (endpoint, user_id, ip_address, error_count)
  VALUES (p_endpoint, p_user_id, p_ip_address, 1)
  ON CONFLICT (endpoint, user_id, ip_address) DO UPDATE
  SET error_count = error_count + 1,
      last_error_at = NOW(),
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function pour vérifier les anomalies
CREATE OR REPLACE FUNCTION check_rate_limit_anomalies(
  p_time_window_minutes INT DEFAULT 5,
  p_error_threshold INT DEFAULT 10
)
RETURNS TABLE (
  endpoint TEXT,
  error_count INT,
  affected_users INT,
  affected_ips INT,
  severity TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rle.endpoint,
    COUNT(*)::INT as error_count,
    COUNT(DISTINCT rle.user_id)::INT as affected_users,
    COUNT(DISTINCT rle.ip_address)::INT as affected_ips,
    CASE 
      WHEN COUNT(*) > p_error_threshold * 3 THEN 'CRITICAL'
      WHEN COUNT(*) > p_error_threshold * 2 THEN 'WARNING'
      ELSE 'INFO'
    END as severity
  FROM rate_limit_errors rle
  WHERE rle.created_at > NOW() - (p_time_window_minutes || ' minutes')::INTERVAL
  GROUP BY rle.endpoint
  HAVING COUNT(*) > p_error_threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function pour créer une alerte
CREATE OR REPLACE FUNCTION create_rate_limit_alert(
  p_endpoint TEXT,
  p_severity TEXT,
  p_message TEXT,
  p_error_count INT DEFAULT NULL,
  p_affected_users INT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO rate_limit_alerts (endpoint, severity, message, error_count, affected_users)
  VALUES (p_endpoint, p_severity, p_message, p_error_count, p_affected_users)
  RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function pour tracker les patterns d'abus
CREATE OR REPLACE FUNCTION track_abuse_pattern(
  p_endpoint TEXT,
  p_pattern_type TEXT,
  p_pattern_value TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO rate_limit_abuse_patterns (endpoint, pattern_type, pattern_value, error_count, severity)
  VALUES (p_endpoint, p_pattern_type, p_pattern_value, 1, 'LOW')
  ON CONFLICT (endpoint, pattern_type, pattern_value) DO UPDATE
  SET error_count = error_count + 1,
      last_seen_at = NOW(),
      severity = CASE 
        WHEN error_count >= 100 THEN 'CRITICAL'
        WHEN error_count >= 50 THEN 'HIGH'
        WHEN error_count >= 20 THEN 'MEDIUM'
        ELSE 'LOW'
      END,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function pour bloquer un pattern d'abus
CREATE OR REPLACE FUNCTION block_abuse_pattern(
  p_pattern_id UUID,
  p_is_blocked BOOLEAN DEFAULT TRUE
)
RETURNS VOID AS $$
BEGIN
  UPDATE rate_limit_abuse_patterns
  SET is_blocked = p_is_blocked,
      updated_at = NOW()
  WHERE id = p_pattern_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function pour résoudre une alerte
CREATE OR REPLACE FUNCTION resolve_rate_limit_alert(
  p_alert_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE rate_limit_alerts
  SET resolved_at = NOW()
  WHERE id = p_alert_id AND resolved_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function pour nettoyer les anciennes erreurs
CREATE OR REPLACE FUNCTION cleanup_old_rate_limit_errors(
  p_days INT DEFAULT 7
)
RETURNS INT AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  DELETE FROM rate_limit_errors
  WHERE created_at < NOW() - (p_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE rate_limit_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can view rate limit errors" ON rate_limit_errors;
CREATE POLICY "Service role can view rate limit errors"
ON rate_limit_errors FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Service role can insert rate limit errors" ON rate_limit_errors;
CREATE POLICY "Service role can insert rate limit errors"
ON rate_limit_errors FOR INSERT
WITH CHECK (true);

ALTER TABLE rate_limit_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view rate limit alerts" ON rate_limit_alerts;
CREATE POLICY "Anyone can view rate limit alerts"
ON rate_limit_alerts FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Service role can insert rate limit alerts" ON rate_limit_alerts;
CREATE POLICY "Service role can insert rate limit alerts"
ON rate_limit_alerts FOR INSERT
WITH CHECK (true);

ALTER TABLE rate_limit_abuse_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can view abuse patterns" ON rate_limit_abuse_patterns;
CREATE POLICY "Service role can view abuse patterns"
ON rate_limit_abuse_patterns FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Service role can insert abuse patterns" ON rate_limit_abuse_patterns;
CREATE POLICY "Service role can insert abuse patterns"
ON rate_limit_abuse_patterns FOR INSERT
WITH CHECK (true);

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_rate_limit_error TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_rate_limit_anomalies TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_rate_limit_alert TO authenticated, anon;
GRANT EXECUTE ON FUNCTION track_abuse_pattern TO authenticated, anon;
GRANT EXECUTE ON FUNCTION block_abuse_pattern TO authenticated, anon;
GRANT EXECUTE ON FUNCTION resolve_rate_limit_alert TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cleanup_old_rate_limit_errors TO authenticated, anon;
