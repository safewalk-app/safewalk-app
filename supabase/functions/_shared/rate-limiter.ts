import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

export interface RateLimitResult {
  isAllowed: boolean;
  requestsMade: number;
  limitRemaining: number;
  resetAt: string;
}

export interface RateLimitResponse {
  error: string;
  message: string;
  resetAt: string;
  retryAfter: number;
}

/**
 * Vérifier si une requête est autorisée selon le rate limit
 *
 * @param supabase - Client Supabase
 * @param userId - ID de l'utilisateur (peut être null pour les endpoints publics)
 * @param endpoint - Nom de l'endpoint (ex: "start-trip")
 * @param ipAddress - Adresse IP (optionnel)
 * @returns Résultat du rate limit
 */
export async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
  endpoint: string,
  ipAddress?: string
): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_ip_address: ipAddress,
    });

    if (error) {
      console.error("Rate limit check error:", error);
      // Laisser passer en cas d'erreur (fail-open)
      return {
        isAllowed: true,
        requestsMade: 0,
        limitRemaining: -1,
        resetAt: new Date().toISOString(),
      };
    }

    if (!data || data.length === 0) {
      return {
        isAllowed: true,
        requestsMade: 0,
        limitRemaining: -1,
        resetAt: new Date().toISOString(),
      };
    }

    return {
      isAllowed: data[0].is_allowed,
      requestsMade: data[0].requests_made,
      limitRemaining: data[0].limit_remaining,
      resetAt: data[0].reset_at,
    };
  } catch (error) {
    console.error("Rate limit check exception:", error);
    // Laisser passer en cas d'erreur
    return {
      isAllowed: true,
      requestsMade: 0,
      limitRemaining: -1,
      resetAt: new Date().toISOString(),
    };
  }
}

/**
 * Enregistrer une requête dans les logs de rate limit
 *
 * @param supabase - Client Supabase
 * @param userId - ID de l'utilisateur
 * @param endpoint - Nom de l'endpoint
 * @param ipAddress - Adresse IP (optionnel)
 */
export async function logRequest(
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
  endpoint: string,
  ipAddress?: string
): Promise<void> {
  try {
    await supabase.rpc("log_request", {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_ip_address: ipAddress,
    });
  } catch (error) {
    console.error("Rate limit log error:", error);
    // Continuer même si le logging échoue
  }
}

/**
 * Créer une réponse d'erreur de rate limit
 *
 * @param resetAt - Date de réinitialisation
 * @returns Réponse d'erreur formatée
 */
export function createRateLimitResponse(resetAt: string): RateLimitResponse {
  const resetDate = new Date(resetAt);
  const now = new Date();
  const retryAfter = Math.ceil((resetDate.getTime() - now.getTime()) / 1000);

  return {
    error: "rate_limit_exceeded",
    message: "Trop de requêtes. Veuillez réessayer plus tard.",
    resetAt,
    retryAfter: Math.max(1, retryAfter),
  };
}

/**
 * Créer une réponse HTTP 429 (Too Many Requests)
 *
 * @param resetAt - Date de réinitialisation
 * @returns Réponse HTTP
 */
export function createRateLimitHttpResponse(resetAt: string) {
  const errorData = createRateLimitResponse(resetAt);

  return new Response(JSON.stringify(errorData), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": errorData.retryAfter.toString(),
    },
  });
}
