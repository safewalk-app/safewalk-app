/**
 * PATCH for start-trip Edge Function
 * Adds credit gating and validation before creating a session
 *
 * Apply this patch to start-trip/index.ts
 */

// Add this import at the top
import { ERROR_CODES, createErrorResponse } from '../_shared/error-codes.ts';

// Add this function before the main handler
async function validateUserCanStartTrip(
  supabase: any,
  userId: string,
): Promise<{ allowed: boolean; error?: string; errorCode?: string }> {
  // 1. Check if user profile exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('phone_verified, subscription_active, free_alerts_remaining')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return {
      allowed: false,
      error: 'User profile not found',
      errorCode: ERROR_CODES.CONFIG_ERROR,
    };
  }

  // 2. Check if phone is verified
  if (!profile.phone_verified) {
    return {
      allowed: false,
      error: 'Téléphone non vérifié. Veuillez vérifier votre numéro avant de démarrer une sortie.',
      errorCode: ERROR_CODES.PHONE_NOT_VERIFIED,
    };
  }

  // 3. Check if user has credits or active subscription
  if (!profile.subscription_active && profile.free_alerts_remaining <= 0) {
    return {
      allowed: false,
      error: 'Crédits insuffisants. Veuillez vous abonner pour continuer.',
      errorCode: ERROR_CODES.NO_CREDITS,
    };
  }

  // 4. Check if user has at least one emergency contact
  const { data: contacts, error: contactError } = await supabase
    .from('emergency_contacts')
    .select('id')
    .eq('user_id', userId)
    .eq('opted_out', false)
    .limit(1);

  if (contactError || !contacts || contacts.length === 0) {
    return {
      allowed: false,
      error: "Aucun contact d'urgence configuré. Veuillez ajouter un contact avant de démarrer.",
      errorCode: 'missing_contact',
    };
  }

  return { allowed: true };
}

// Add this validation in the main handler, after JWT verification:
/*
  // Validate user can start trip
  const validation = await validateUserCanStartTrip(supabase, userId);
  if (!validation.allowed) {
    const [errorResponse, status] = createErrorResponse(
      validation.error || "Validation failed",
      validation.errorCode || ERROR_CODES.FUNCTION_ERROR,
      validation.errorCode === ERROR_CODES.NO_CREDITS ? 402 : 403
    );
    return new Response(JSON.stringify(errorResponse), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
*/

// Add this to the response when creating a session:
/*
  // Consume credit atomically
  const { data: creditData, error: creditError } = await supabase.rpc(
    "consume_credit",
    { p_user_id: userId, p_type: "late" }
  );

  if (creditError || !creditData?.[0]?.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: creditData?.[0]?.reason || "Failed to consume credit",
        errorCode: creditData?.[0]?.reason || ERROR_CODES.NO_CREDITS,
      }),
      {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
*/

export { validateUserCanStartTrip };
