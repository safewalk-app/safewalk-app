// Edge Function: test-sms
// Purpose: Send test SMS to primary emergency contact
// Auth: JWT user (client-auth)
// Input: {}
// Output: { success, message, smsSent, error }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { sendSms, isValidPhoneNumber } from "../_shared/twilio.ts";
import { checkRateLimit, logRequest, createRateLimitHttpResponse } from "../_shared/rate-limiter.ts";
import { buildTestSms } from "../_shared/sms-templates.ts";
import { retryWithBackoff } from "../_shared/retry-helper.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TestSmsResponse {
  success: boolean;
  message?: string;
  smsSent?: boolean;
  error?: string;
  errorCode?: string;
}

async function testSms(req: Request): Promise<Response> {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing authorization header",
          errorCode: "UNAUTHORIZED",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing Supabase configuration",
          errorCode: "CONFIG_ERROR",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data, error: authError } = await supabase.auth.getUser(token);

    if (authError || !data.user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or expired token",
          errorCode: "INVALID_TOKEN",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = data.user.id;

    // RATE LIMITING: Check if user has exceeded rate limit
    const ipAddress = req.headers.get("x-forwarded-for") || "unknown";
    const rateLimitResult = await checkRateLimit(supabase, userId, "test-sms", ipAddress);

    if (!rateLimitResult.isAllowed) {
      await logRequest(supabase, userId, "test-sms", ipAddress);
      return createRateLimitHttpResponse(rateLimitResult.resetAt);
    }

    await logRequest(supabase, userId, "test-sms", ipAddress);

    // Get Twilio config from environment
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Twilio configuration missing",
          errorCode: "CONFIG_ERROR",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // HAUTE #13: Verifier la limite quotidienne de tests SMS (1 par jour)
    const today = new Date().toISOString().split('T')[0];
    const { data: testLogs, error: testLogsError } = await supabase
      .from('rate_limit_logs')
      .select('id')
      .eq('user_id', userId)
      .eq('endpoint', 'test-sms')
      .gte('timestamp', today + 'T00:00:00Z')
      .lt('timestamp', today + 'T23:59:59Z');

    if (testLogsError) {
      console.error('Test logs check error:', testLogsError);
    }

    if (testLogs && testLogs.length >= 1) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Vous avez deja teste un SMS aujourd\'hui. Limite: 1 par jour.',
          errorCode: 'quota_reached',
          smsSent: false,
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Call consume_credit RPC to check if user can send test SMS
    const { data: creditData, error: creditError } = await supabase.rpc(
      "consume_credit",
      { p_user_id: userId, p_type: "test" }
    );

    if (creditError) {
      console.error("Credit check error:", creditError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to check credits",
          errorCode: "CREDIT_CHECK_FAILED",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const creditResult = creditData?.[0];
    if (!creditResult?.allowed) {
      // Map reason to standard error codes
      let errorCode = "no_credits";
      if (creditResult?.reason === "quota_reached") {
        errorCode = "quota_reached";
      } else if (creditResult?.reason === "phone_not_verified") {
        errorCode = "phone_not_verified";
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: creditResult?.reason || "Not allowed to send test SMS",
          errorCode: errorCode,
          smsSent: false,
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get primary emergency contact
    const { data: contactData, error: contactError } = await supabase
      .from("emergency_contacts")
      .select("id, phone_number")
      .eq("user_id", userId)
      .eq("priority", 1)
      .eq("opted_out", false)
      .single();

    if (contactError || !contactData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No primary emergency contact found",
          errorCode: "NO_CONTACT",
          smsSent: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate contact phone number (E.164 format)
    if (!isValidPhoneNumber(contactData.phone_number)) {
      // Log invalid phone
      await supabase.from("sms_logs").insert({
        user_id: userId,
        contact_id: contactData.id,
        sms_type: "test",
        status: "failed",
        error_message: "Invalid phone number format (must be E.164)",
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "Numéro de téléphone invalide. Format requis: +1234567890",
          errorCode: "invalid_phone",
          smsSent: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user first name for test SMS
    const { data: userData } = await supabase
      .from("profiles")
      .select("first_name")
      .eq("id", userId)
      .single();

    // Build test SMS message using dynamic template
    const testMessage = buildTestSms({
      firstName: userData?.first_name || undefined,
    });

    // Send test SMS with retry logic
    const smsRetryResult = await retryWithBackoff(
      () => sendSms({
        to: contactData.phone_number,
        message: testMessage,
        config: {
          accountSid: twilioAccountSid,
          authToken: twilioAuthToken,
          fromNumber: twilioFromNumber,
        },
        maxRetries: 2, // Less retries for test SMS (not critical)
        initialDelayMs: 1000,
      }),
      {
        maxRetries: 2,
        initialDelayMs: 1000,
      }
    );
    
    const smsResult = smsRetryResult.success ? smsRetryResult.data! : { success: false, error: smsRetryResult.error?.message || 'Unknown error', errorCode: 'RETRY_FAILED' };

    if (!smsResult.success) {
      // Log failed SMS attempt with retry tracking
      await supabase.from("sms_logs").insert({
        user_id: userId,
        contact_id: contactData.id,
        sms_type: "test",
        status: "failed",
        error_message: smsResult.error,
        retry_count: smsRetryResult.retryCount,
        duration_ms: smsRetryResult.totalDurationMs,
      });

      // Map Twilio errors to standard error codes
      let errorCode = "twilio_failed";
      const errorMsg = smsResult.error?.toLowerCase() || "";
      
      if (errorMsg.includes("invalid") || errorMsg.includes("malformed")) {
        errorCode = "twilio_failed";
      } else if (errorMsg.includes("unsubscribed")) {
        errorCode = "twilio_failed";
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: "Impossible d'envoyer l'alerte. Réessayera automatiquement.",
          errorCode: errorCode,
          smsSent: false,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log successful SMS
    await supabase.from("sms_logs").insert({
      user_id: userId,
      contact_id: contactData.id,
      sms_type: "test",
      status: "sent",
      message_sid: smsResult.messageSid,
      retry_count: smsRetryResult.retryCount,
      duration_ms: smsRetryResult.totalDurationMs,
    });

    // Success response
    const response: TestSmsResponse = {
      success: true,
      message: "Test SMS sent successfully",
      smsSent: true,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Test SMS error:", errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        errorCode: "EXCEPTION",
        smsSent: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

Deno.serve(testSms);
