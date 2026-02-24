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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Parse request body
    const body: VerifyOtpRequest = await req.json();
    const { phoneNumber, otpCode } = body;

    // Validate inputs
    if (!phoneNumber || typeof phoneNumber !== "string") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Phone number is required",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validatePhoneNumber(phoneNumber)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid phone number format (use E.164: +33...)",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!otpCode || typeof otpCode !== "string") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "OTP code is required",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validateOtpCode(otpCode)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "OTP code must be 6 digits",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[SafeWalk] Supabase credentials not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Server configuration error",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({
          success: false,
          error: "No OTP found. Request a new one.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

      return new Response(
        JSON.stringify({
          success: false,
          error: "OTP expired. Request a new one.",
        }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if max attempts exceeded
    if (otpRecord.attempts >= otpRecord.max_attempts) {
      console.log("[SafeWalk][OTP] Max attempts exceeded for", phoneNumber);

      // Log failed attempt
      await supabase.from("otp_logs").insert({
        phone_number: phoneNumber,
        action: "verify_failed",
        attempt_number: otpRecord.attempts,
        error_message: "Max attempts exceeded",
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "Too many attempts. Request a new OTP.",
          attemptsRemaining: 0,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if code matches
    if (otpRecord.otp_code !== otpCode) {
      console.log("[SafeWalk][OTP] Invalid code for", phoneNumber);

      // Increment attempts
      const newAttempts = otpRecord.attempts + 1;
      const attemptsRemaining = otpRecord.max_attempts - newAttempts;

      // Update attempts
      await supabase
        .from("otp_verifications")
        .update({ attempts: newAttempts })
        .eq("phone_number", phoneNumber);

      // Log failed attempt
      await supabase.from("otp_logs").insert({
        phone_number: phoneNumber,
        action: "verify_failed",
        attempt_number: newAttempts,
        error_message: "Invalid code",
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid OTP code",
          attemptsRemaining: Math.max(0, attemptsRemaining),
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Code is valid - mark as verified
    const verifiedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("otp_verifications")
      .update({
        verified_at: verifiedAt,
        attempts: otpRecord.attempts + 1,
      })
      .eq("phone_number", phoneNumber);

    if (updateError) {
      console.error("[SafeWalk][Supabase] Failed to mark OTP as verified:", updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to verify OTP",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful verification
    await supabase.from("otp_logs").insert({
      phone_number: phoneNumber,
      action: "verify_success",
      attempt_number: otpRecord.attempts + 1,
    });

    console.log("[SafeWalk][OTP] OTP verified successfully for", phoneNumber);

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP verified successfully",
        verified: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[SafeWalk][Error] verify-otp exception:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
