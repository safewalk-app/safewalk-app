import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface SendOtpRequest {
  phoneNumber: string;
}

interface SendOtpResponse {
  success: boolean;
  message: string;
  errorCode?: string;
  expiresIn?: number;
  error?: string;
}

// Generate a random 6-digit OTP code
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validate phone number format (E.164)
function validatePhoneNumber(phone: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

// Map error codes to HTTP status and messages
function getErrorResponse(errorCode: string): [number, SendOtpResponse] {
  const responses: Record<string, [number, SendOtpResponse]> = {
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
    RATE_LIMIT: [
      429,
      {
        success: false,
        errorCode: "RATE_LIMIT",
        message: "Trop de demandes. Réessayez dans 1 heure.",
        error: "Too many requests. Try again later.",
      },
    ],
    SMS_SEND_FAILED: [
      500,
      {
        success: false,
        errorCode: "SMS_SEND_FAILED",
        message: "Impossible d'envoyer le SMS. Vérifiez le numéro.",
        error: "Failed to send SMS",
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

// Send SMS via Twilio
async function sendSmsViaTwilio(
  phoneNumber: string,
  otpCode: string,
  twilioAccountSid: string,
  twilioAuthToken: string,
  twilioPhoneNumber: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
  const message = `Votre code de vérification SafeWalk est: ${otpCode}. Valide 10 minutes.`;

  const formData = new URLSearchParams();
  formData.append("To", phoneNumber);
  formData.append("From", twilioPhoneNumber);
  formData.append("Body", message);

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("[SafeWalk][Twilio] SMS send failed:", error);
      return { success: false, error: `Twilio error: ${response.status}` };
    }

    const data = await response.json();
    console.log("[SafeWalk][Twilio] SMS sent successfully:", data.sid);
    return { success: true, messageSid: data.sid };
  } catch (error) {
    console.error("[SafeWalk][Twilio] SMS send exception:", error);
    return { success: false, error: String(error) };
  }
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
    const body: SendOtpRequest = await req.json();
    const { phoneNumber } = body;

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

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[SafeWalk] Supabase credentials not configured");
      const [status, response] = getErrorResponse("SERVER_ERROR");
      return new Response(JSON.stringify(response), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error("[SafeWalk] Twilio credentials not configured");
      const [status, response] = getErrorResponse("SERVER_ERROR");
      return new Response(JSON.stringify(response), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check rate limit (max 5 requests per hour per phone number)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentLogs, error: logError } = await supabase
      .from("otp_logs")
      .select("*")
      .eq("phone_number", phoneNumber)
      .eq("action", "send")
      .gte("created_at", oneHourAgo);

    if (logError) {
      console.error("[SafeWalk] Database error checking rate limit:", logError);
      const [status, response] = getErrorResponse("DATABASE_ERROR");
      return new Response(JSON.stringify(response), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((recentLogs?.length || 0) >= 5) {
      console.warn("[SafeWalk][OTP] Rate limit exceeded for", phoneNumber);
      const [status, response] = getErrorResponse("RATE_LIMIT");
      return new Response(JSON.stringify(response), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate OTP code
    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Send SMS via Twilio
    const smsResult = await sendSmsViaTwilio(
      phoneNumber,
      otpCode,
      twilioAccountSid,
      twilioAuthToken,
      twilioPhoneNumber
    );

    if (!smsResult.success) {
      console.error("[SafeWalk][OTP] SMS send failed for", phoneNumber);

      // Log failed send
      await supabase.from("otp_logs").insert({
        phone_number: phoneNumber,
        action: "send_failed",
        error_message: smsResult.error,
      });

      const [status, response] = getErrorResponse("SMS_SEND_FAILED");
      return new Response(JSON.stringify(response), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store OTP in database
    const { error: insertError } = await supabase
      .from("otp_verifications")
      .upsert({
        phone_number: phoneNumber,
        otp_code: otpCode,
        attempts: 0,
        created_at: new Date().toISOString(),
        expires_at: expiresAt,
        verified_at: null,
      });

    if (insertError) {
      console.error("[SafeWalk][OTP] Database error:", insertError);
      const [status, response] = getErrorResponse("DATABASE_ERROR");
      return new Response(JSON.stringify(response), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log successful send
    await supabase.from("otp_logs").insert({
      phone_number: phoneNumber,
      action: "send",
      attempt_number: 0,
    });

    console.log("[SafeWalk][OTP] OTP sent successfully for", phoneNumber);

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent successfully",
        expiresIn: 600, // 10 minutes in seconds
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
