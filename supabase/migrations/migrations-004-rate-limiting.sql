-- Migration 004: Rate Limiting Global
-- Ajoute les tables et fonctions pour le rate limiting

-- Table pour tracker les requêtes
CREATE TABLE IF NOT EXISTS rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL, -- Nom de la fonction (ex: "start-trip")
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT rate_limit_logs_endpoint_check CHECK (endpoint ~ '^[a-z0-9_-]+$')
);

-- Index pour les requêtes rapides
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_user_endpoint_timestamp 
ON rate_limit_logs(user_id, endpoint, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_ip_endpoint_timestamp 
ON rate_limit_logs(ip_address, endpoint, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_endpoint_timestamp 
ON rate_limit_logs(endpoint, timestamp DESC);

-- Table pour les limites configurables
CREATE TABLE IF NOT EXISTS rate_limit_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  max_requests INT NOT NULL DEFAULT 10,
  window_seconds INT NOT NULL DEFAULT 60,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT rate_limit_config_endpoint_check CHECK (endpoint ~ '^[a-z0-9_-]+$'),
  CONSTRAINT rate_limit_config_max_requests_check CHECK (max_requests > 0),
  CONSTRAINT rate_limit_config_window_check CHECK (window_seconds > 0)
);

-- Insérer les limites par défaut
INSERT INTO rate_limit_config (endpoint, max_requests, window_seconds, description) 
VALUES
('send-otp', 5, 60, 'Limiter les tentatives OTP à 5 par minute'),
('verify-otp', 10, 60, 'Limiter les vérifications OTP à 10 par minute'),
('start-trip', 10, 60, 'Limiter la création de sorties à 10 par minute'),
('test-sms', 5, 60, 'Limiter les SMS de test à 5 par minute'),
('sos', 20, 60, 'Limiter les SOS à 20 par minute'),
('checkin', 20, 60, 'Limiter les check-in à 20 par minute'),
('extend', 10, 60, 'Limiter les extensions à 10 par minute'),
('get-stripe-products', 100, 60, 'Limiter les requêtes produits à 100 par minute'),
('create-stripe-checkout', 50, 60, 'Limiter les sessions de paiement à 50 par minute')
ON CONFLICT (endpoint) DO NOTHING;

-- RPC pour vérifier le rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS TABLE (
  is_allowed BOOLEAN,
  requests_made INT,
  limit_remaining INT,
  reset_at TIMESTAMPTZ
) AS $$
DECLARE
  v_max_requests INT;
  v_window_seconds INT;
  v_requests_made INT;
  v_limit_remaining INT;
  v_reset_at TIMESTAMPTZ;
BEGIN
  -- Récupérer la configuration du rate limit
  SELECT max_requests, window_seconds
  INTO v_max_requests, v_window_seconds
  FROM rate_limit_config
  WHERE endpoint = p_endpoint;

  IF NOT FOUND THEN
    -- Pas de limite configurée pour cet endpoint
    RETURN QUERY SELECT true, 0, -1, NOW();
    RETURN;
  END IF;

  -- Compter les requêtes dans la fenêtre de temps
  SELECT COUNT(*)
  INTO v_requests_made
  FROM rate_limit_logs
  WHERE 
    endpoint = p_endpoint
    AND timestamp > NOW() - (v_window_seconds || ' seconds')::INTERVAL
    AND (
      (p_user_id IS NOT NULL AND user_id = p_user_id)
      OR (p_ip_address IS NOT NULL AND ip_address = p_ip_address)
    );

  v_limit_remaining := GREATEST(0, v_max_requests - v_requests_made);
  v_reset_at := NOW() + (v_window_seconds || ' seconds')::INTERVAL;

  RETURN QUERY SELECT
    v_requests_made < v_max_requests,
    v_requests_made,
    v_limit_remaining,
    v_reset_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC pour enregistrer une requête
CREATE OR REPLACE FUNCTION log_request(
  p_user_id UUID,
  p_endpoint TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO rate_limit_logs (user_id, endpoint, ip_address)
  VALUES (p_user_id, p_endpoint, p_ip_address);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE rate_limit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own rate limit logs" ON rate_limit_logs;
CREATE POLICY "Users can view their own rate limit logs"
ON rate_limit_logs FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert rate limit logs" ON rate_limit_logs;
CREATE POLICY "Service role can insert rate limit logs"
ON rate_limit_logs FOR INSERT
WITH CHECK (true);

ALTER TABLE rate_limit_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view rate limit config" ON rate_limit_config;
CREATE POLICY "Anyone can view rate limit config"
ON rate_limit_config FOR SELECT
USING (true);

-- Fonction pour nettoyer les logs anciens
CREATE OR REPLACE FUNCTION cleanup_old_rate_limit_logs()
RETURNS VOID AS $$
BEGIN
  DELETE FROM rate_limit_logs
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated, anon;
GRANT EXECUTE ON FUNCTION log_request TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cleanup_old_rate_limit_logs TO authenticated, anon;
