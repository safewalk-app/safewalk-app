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
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Parse request body
    const body: SendOtpRequest = await req.json();
    const { phoneNumber } = body;

    // Validate phone number
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

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

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

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error("[SafeWalk] Twilio credentials not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "SMS service not configured",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if there's an existing non-expired OTP for this phone
    const { data: existingOtp } = await supabase
      .from("otp_verifications")
      .select("*")
      .eq("phone_number", phoneNumber)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (existingOtp) {
      console.log("[SafeWalk][OTP] OTP already sent to", phoneNumber);
      return new Response(
        JSON.stringify({
          success: true,
          message: "OTP already sent. Check your SMS.",
          expiresIn: 600, // 10 minutes
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate OTP code
    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log("[SafeWalk][OTP] Generated OTP for", phoneNumber);

    // Send SMS via Twilio
    const smsResult = await sendSmsViaTwilio(
      phoneNumber,
      otpCode,
      twilioAccountSid,
      twilioAuthToken,
      twilioPhoneNumber
    );

    if (!smsResult.success) {
      // Log failed attempt
      await supabase.from("otp_logs").insert({
        phone_number: phoneNumber,
        action: "send",
        error_message: smsResult.error,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to send SMS",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store OTP in database
    const { error: insertError } = await supabase
      .from("otp_verifications")
      .upsert({
        phone_number: phoneNumber,
        otp_code: otpCode,
        attempts: 0,
        expires_at: expiresAt.toISOString(),
        verified_at: null,
      });

    if (insertError) {
      console.error("[SafeWalk][Supabase] Failed to store OTP:", insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to store OTP",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log successful send
    await supabase.from("otp_logs").insert({
      phone_number: phoneNumber,
      action: "send",
      attempt_number: 1,
    });

    console.log("[SafeWalk][OTP] OTP sent successfully to", phoneNumber);

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent successfully",
        expiresIn: 600, // 10 minutes in seconds
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[SafeWalk][Error] send-otp exception:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
