import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface VerifyOtpRequest {
  phoneNumber: string;
  otpCode: string;
}

interface VerifyOtpResponse {
  success: boolean;
  message: string;
  errorCode?: string;
  verified?: boolean;
  error?: string;
  attemptsRemaining?: number;
}

// Validate phone number format (E.164)
function validatePhoneNumber(phone: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

// Validate OTP code format (6 digits)
function validateOtpCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

// Map error codes to HTTP status and messages
function getErrorResponse(
  errorCode: string,
  attemptsRemaining?: number
): [number, VerifyOtpResponse] {
  const responses: Record<string, [number, VerifyOtpResponse]> = {
    INVALID_PHONE_FORMAT: [
      400,
      {
        success: false,
        errorCode: "INVALID_PHONE_FORMAT",
        message: "Format invalide. Utilisez +33...",
        error: "Invalid phone number format (use E.164: +33...)",
      },
    ],
    EMPTY_PHONE: [
      400,
      {
        success: false,
        errorCode: "EMPTY_PHONE",
        message: "Numéro de téléphone requis",
        error: "Phone number is required",
      },
    ],
    INVALID_OTP_FORMAT: [
      400,
      {
        success: false,
        errorCode: "INVALID_OTP_FORMAT",
        message: "Le code doit avoir 6 chiffres",
        error: "OTP code must be 6 digits",
      },
    ],
    EMPTY_OTP: [
      400,
      {
        success: false,
        errorCode: "EMPTY_OTP",
        message: "Code OTP requis",
        error: "OTP code is required",
      },
    ],
    OTP_NOT_FOUND: [
      404,
      {
        success: false,
        errorCode: "OTP_NOT_FOUND",
        message: "Aucun code trouvé. Demandez un nouveau code.",
        error: "No OTP found. Request a new one.",
      },
    ],
    OTP_EXPIRED: [
      410,
      {
        success: false,
        errorCode: "OTP_EXPIRED",
        message: "Code expiré. Demandez un nouveau code.",
        error: "OTP expired. Request a new one.",
        attemptsRemaining: 0,
      },
    ],
    OTP_INVALID: [
      401,
      {
        success: false,
        errorCode: "OTP_INVALID",
        message: `Code incorrect. ${attemptsRemaining ?? 0} tentative(s) restante(s)`,
        error: `Invalid OTP code. ${attemptsRemaining ?? 0} attempt(s) remaining.`,
        attemptsRemaining: attemptsRemaining ?? 0,
      },
    ],
    MAX_ATTEMPTS_EXCEEDED: [
      429,
      {
        success: false,
        errorCode: "MAX_ATTEMPTS_EXCEEDED",
        message: "Trop de tentatives. Demandez un nouveau code.",
        error: "Too many attempts. Request a new OTP.",
        attemptsRemaining: 0,
      },
    ],
    DATABASE_ERROR: [
      500,
      {
        success: false,
        errorCode: "DATABASE_ERROR",
        message: "Erreur base de données. Réessayez plus tard.",
        error: "Database error",
      },
    ],
    SERVER_ERROR: [
      500,
      {
        success: false,
        errorCode: "SERVER_ERROR",
        message: "Erreur serveur. Réessayez plus tard.",
        error: "Server configuration error",
      },
    ],
  };

  return responses[errorCode] || responses.SERVER_ERROR;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    const [status, response] = getErrorResponse("SERVER_ERROR");
    return new Response(JSON.stringify(response), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Parse request body
    const body: VerifyOtpRequest = await req.json();
    const { phoneNumber, otpCode } = body;

    // Validate inputs
    if (!phoneNumber || typeof phoneNumber !== "string") {
      const [status, response] = getErrorResponse("EMPTY_PHONE");
      return new Response(JSON.stringify(response), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!validatePhoneNumber(phoneNumber)) {
      const [status, response] = getErrorResponse("INVALID_PHONE_FORMAT");
      return new Response(JSON.stringify(response), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!otpCode || typeof otpCode !== "string") {
      const [status, response] = getErrorResponse("EMPTY_OTP");
      return new Response(JSON.stringify(response), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!validateOtpCode(otpCode)) {
      const [status, response] = getErrorResponse("INVALID_OTP_FORMAT");
      return new Response(JSON.stringify(response), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[SafeWalk] Supabase credentials not configured");
      const [status, response] = getErrorResponse("SERVER_ERROR");
      return new Response(JSON.stringify(response), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get OTP record
    const { data: otpRecord, error: fetchError } = await supabase
      .from("otp_verifications")
      .select("*")
      .eq("phone_number", phoneNumber)
      .single();

    if (fetchError || !otpRecord) {
      console.log("[SafeWalk][OTP] No OTP found for", phoneNumber);
      const [status, response] = getErrorResponse("OTP_NOT_FOUND");
      return new Response(JSON.stringify(response), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if OTP is expired
    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);

    if (now > expiresAt) {
      console.log("[SafeWalk][OTP] OTP expired for", phoneNumber);

      // Log expired attempt
      await supabase.from("otp_logs").insert({
        phone_number: phoneNumber,
        action: "expired",
        attempt_number: otpRecord.attempts,
      });

      const [status, response] = getErrorResponse("OTP_EXPIRED");
      return new Response(JSON.stringify(response), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check attempts
    if (otpRecord.attempts >= 3) {
      console.log("[SafeWalk][OTP] Max attempts exceeded for", phoneNumber);

      // Log max attempts
      await supabase.from("otp_logs").insert({
        phone_number: phoneNumber,
        action: "max_attempts",
        attempt_number: otpRecord.attempts,
      });

      const [status, response] = getErrorResponse("MAX_ATTEMPTS_EXCEEDED");
      return new Response(JSON.stringify(response), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify OTP code
    if (otpRecord.otp_code !== otpCode) {
      console.log("[SafeWalk][OTP] Invalid OTP code for", phoneNumber);

      // Increment attempts
      const newAttempts = otpRecord.attempts + 1;
      await supabase
        .from("otp_verifications")
        .update({ attempts: newAttempts })
        .eq("phone_number", phoneNumber);

      // Log failed attempt
      await supabase.from("otp_logs").insert({
        phone_number: phoneNumber,
        action: "verify_failed",
        attempt_number: newAttempts,
        error_message: "Invalid OTP code",
      });

      const attemptsRemaining = Math.max(0, 3 - newAttempts);
      const [status, response] = getErrorResponse("OTP_INVALID", attemptsRemaining);
      return new Response(JSON.stringify(response), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // OTP is valid - mark as verified
    const { error: updateError } = await supabase
      .from("otp_verifications")
      .update({
        verified_at: new Date().toISOString(),
      })
      .eq("phone_number", phoneNumber);

    if (updateError) {
      console.error("[SafeWalk][OTP] Database error:", updateError);
      const [status, response] = getErrorResponse("DATABASE_ERROR");
      return new Response(JSON.stringify(response), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log successful verification
    await supabase.from("otp_logs").insert({
      phone_number: phoneNumber,
      action: "verify_success",
      attempt_number: otpRecord.attempts + 1,
    });

    console.log("[SafeWalk][OTP] Verification successful for", phoneNumber);

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP verified successfully",
        verified: true,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[SafeWalk][OTP] Unexpected error:", error);
    const [status, response] = getErrorResponse("SERVER_ERROR");
    return new Response(JSON.stringify(response), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
