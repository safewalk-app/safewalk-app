// Edge Function: cron-check-deadlines (STANDALONE - No external imports)
// Purpose: Check for overdue trips and send alerts (server-only, called by cron)
// Auth: CRON_SECRET header validation
// Input: {}
// Output: { success, processed, sent, failed, message }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CronResponse {
  success: boolean;
  processed: number;
  sent: number;
  failed: number;
  message?: string;
  error?: string;
  errorCode?: string;
}

interface ClaimedTrip {
  trip_id: string;
  user_id: string;
  deadline: string;
  contact_id: string;
  contact_phone_number: string;
  user_phone_number: string;
  share_location: boolean;
  location_latitude: number;
  location_longitude: number;
  last_seen_at: string;
}

// Validate phone number format (E.164)
function isValidPhoneNumber(phone: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

// Send SMS via Twilio API
async function sendSms(
  to: string,
  message: string,
  accountSid: string,
  authToken: string,
  fromNumber: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append("From", fromNumber);
    formData.append("To", to);
    formData.append("Body", message);

    const auth = btoa(`${accountSid}:${authToken}`);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      return {
        success: false,
        error: (data.message as string) || "Twilio API error",
      };
    }

    return {
      success: true,
      messageSid: (data.sid as string) || undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Create overdue alert message
function createOverdueAlertMessage(
  userName: string,
  deadline: Date,
  shareLocation: boolean,
  latitude?: number,
  longitude?: number
): string {
  const timeStr = deadline.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let message = `🚨 Alerte SafeWalk: ${userName} n'a pas confirmé son retour avant ${timeStr}.`;

  if (shareLocation && latitude !== undefined && longitude !== undefined) {
    message += `\nDernière position: https://maps.google.com/?q=${latitude},${longitude}`;
  }

  message += "\n\nVérifiez son état ou contactez les autorités si nécessaire.";

  return message;
}

async function cronCheckDeadlines(req: Request): Promise<Response> {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify CRON_SECRET header
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");

    if (!cronSecret || !expectedSecret || cronSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or missing CRON_SECRET",
          errorCode: "UNAUTHORIZED",
          processed: 0,
          sent: 0,
          failed: 0,
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
          processed: 0,
          sent: 0,
          failed: 0,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
          processed: 0,
          sent: 0,
          failed: 0,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Claim overdue trips
    const { data: claimedTrips, error: claimError } = await supabase.rpc(
      "claim_overdue_trips",
      { p_limit: 50 }
    );

    if (claimError) {
      console.error("Claim trips error:", claimError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to claim overdue trips",
          errorCode: "CLAIM_ERROR",
          processed: 0,
          sent: 0,
          failed: 0,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const trips = (claimedTrips || []) as ClaimedTrip[];
    let sentCount = 0;
    let failedCount = 0;

    // Process each claimed trip
    for (const trip of trips) {
      try {
        // Check if alert was already sent (idempotence)
        const { data: existingAlert } = await supabase
          .from("sms_logs")
          .select("id")
          .eq("session_id", trip.trip_id)
          .eq("sms_type", "alert")
          .eq("status", "sent")
          .limit(1);

        if (existingAlert && existingAlert.length > 0) {
          console.warn(`Trip ${trip.trip_id}: Alert already sent`);
          continue;
        }

        // Check if contact exists
        if (!trip.contact_id || !trip.contact_phone_number) {
          console.warn(`Trip ${trip.trip_id}: No contact found`);
          failedCount++;
          continue;
        }

        // Validate contact phone number (E.164 format)
        if (!isValidPhoneNumber(trip.contact_phone_number)) {
          console.warn(`Trip ${trip.trip_id}: Invalid contact phone`);
          failedCount++;
          continue;
        }

        // Call consume_credit RPC to check if alert can be sent
        const { data: creditData, error: creditError } = await supabase.rpc(
          "consume_credit",
          { p_user_id: trip.user_id, p_type: "late" }
        );

        if (creditError || !creditData?.[0]?.allowed) {
          console.warn(
            `Trip ${trip.trip_id}: Credit check failed or not allowed`,
            creditError
          );

          // Log failed alert (no credit)
          await supabase.from("sms_logs").insert({
            user_id: trip.user_id,
            contact_id: trip.contact_id,
            session_id: trip.trip_id,
            sms_type: "alert",
            status: "failed",
            error_message: creditData?.[0]?.reason || "No credits",
          });

          failedCount++;
          continue;
        }

        // Create alert message
        // FIX P0: Get user's first_name for the alert message (not phone number)
        let userName = "Utilisateur";
        const { data: userData } = await supabase
          .from("users")
          .select("first_name")
          .eq("id", trip.user_id)
          .single();
        if (userData?.first_name) {
          userName = userData.first_name;
        }

        const deadline = new Date(trip.deadline);
        const alertMessage = createOverdueAlertMessage(
          userName,
          deadline,
          trip.share_location,
          trip.location_latitude,
          trip.location_longitude
        );

        // Send SMS via Twilio
        const smsResult = await sendSms(
          trip.contact_phone_number,
          alertMessage,
          twilioAccountSid,
          twilioAuthToken,
          twilioFromNumber
        );

        if (!smsResult.success) {
          console.error(`Trip ${trip.trip_id}: SMS failed`, smsResult.error);

          // Log failed SMS
          await supabase.from("sms_logs").insert({
            user_id: trip.user_id,
            contact_id: trip.contact_id,
            session_id: trip.trip_id,
            sms_type: "alert",
            status: "failed",
            error_message: smsResult.error,
          });

          failedCount++;
          continue;
        }

        // Log successful SMS
        await supabase.from("sms_logs").insert({
          user_id: trip.user_id,
          contact_id: trip.contact_id,
          session_id: trip.trip_id,
          sms_type: "alert",
          status: "sent",
          message_sid: smsResult.messageSid,
        });

        sentCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Trip ${trip.trip_id}: Processing error`, errorMessage);
        failedCount++;
      }
    }

    // Log cron execution heartbeat
    try {
      await supabase.from("cron_heartbeat").insert({
        function_name: "cron-check-deadlines",
        last_run_at: new Date().toISOString(),
        status: "success",
        processed: trips.length,
        sent: sentCount,
        failed: failedCount,
      });
    } catch (heartbeatError) {
      console.error("Failed to log cron heartbeat:", heartbeatError);
    }

    // Success response
    const response: CronResponse = {
      success: true,
      processed: trips.length,
      sent: sentCount,
      failed: failedCount,
      message: `Processed ${trips.length} trips: ${sentCount} alerts sent, ${failedCount} failed`,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Cron check deadlines error:", errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        errorCode: "EXCEPTION",
        processed: 0,
        sent: 0,
        failed: 0,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

Deno.serve(cronCheckDeadlines);
