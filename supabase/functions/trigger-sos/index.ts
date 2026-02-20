import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface EmergencyContact {
  name: string;
  phone: string;
}

interface SOSRequest {
  firstName: string;
  emergencyContacts: EmergencyContact[];
  latitude?: number;
  longitude?: number;
  limitTime?: string;
}

function validateSOSRequest(body: any): { valid: boolean; error?: string } {
  if (!body.firstName || typeof body.firstName !== "string") {
    return { valid: false, error: "firstName is required and must be a string" };
  }

  if (!Array.isArray(body.emergencyContacts) || body.emergencyContacts.length === 0) {
    return { valid: false, error: "emergencyContacts must be a non-empty array" };
  }

  for (const contact of body.emergencyContacts) {
    if (!contact.name || !contact.phone) {
      return { valid: false, error: "Each contact must have name and phone" };
    }
    if (!/^\+?[1-9]\d{1,14}$/.test(contact.phone)) {
      return { valid: false, error: "Invalid phone format: " + contact.phone };
    }
  }

  if (body.latitude !== undefined && (typeof body.latitude !== "number" || body.latitude < -90 || body.latitude > 90)) {
    return { valid: false, error: "latitude must be between -90 and 90" };
  }

  if (body.longitude !== undefined && (typeof body.longitude !== "number" || body.longitude < -180 || body.longitude > 180)) {
    return { valid: false, error: "longitude must be between -180 and 180" };
  }

  return { valid: true };
}

function calculateDeadline(limitTimeStr: string): Date {
  const now = new Date();
  
  if (!limitTimeStr) {
    return new Date(now.getTime() + 15 * 60 * 1000);
  }

  const parts = limitTimeStr.split(":");
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  const deadline = new Date();
  deadline.setHours(hours, minutes, 0, 0);

  if (deadline <= now) {
    deadline.setDate(deadline.getDate() + 1);
  }

  return deadline;
}

async function sendSMSViaTwilio(
  to: string,
  message: string,
  twilioAccountSid: string,
  twilioAuthToken: string,
  twilioPhoneNumber: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    const auth = btoa(twilioAccountSid + ":" + twilioAuthToken);
    const requestBody = new URLSearchParams({
      From: twilioPhoneNumber,
      To: to,
      Body: message,
    }).toString();

    const response = await fetch(
      "https://api.twilio.com/2010-04-01/Accounts/" + twilioAccountSid + "/Messages.json",
      {
        method: "POST",
        headers: {
          "Authorization": "Basic " + auth,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: requestBody,
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error("[Twilio] Error response:", response.status, responseText);
      return {
        success: false,
        error: "Twilio API error: HTTP " + response.status,
      };
    }

    const data = JSON.parse(responseText);
    console.log("[Twilio] SMS sent successfully:", data.sid);

    return {
      success: true,
      messageSid: data.sid,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Twilio] Exception:", errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await req.json();

    const validation = validateSOSRequest(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { firstName, emergencyContacts, latitude, longitude, limitTime } = body as SOSRequest;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Supabase not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      return new Response(
        JSON.stringify({ success: false, error: "Twilio not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const now = new Date();
    const deadline = calculateDeadline(limitTime || "");

    const sessionId = crypto.randomUUID();

    console.log("[SafeWalk] Creating session:", {
      id: sessionId,
      start_time: now.toISOString(),
      deadline: deadline.toISOString(),
      latitude,
      longitude,
    });

    const { error: sessionError } = await supabase.from("sessions").insert({
      id: sessionId,
      user_id: null,
      start_time: now.toISOString(),
      deadline: deadline.toISOString(),
      status: "active",
      location_latitude: latitude || null,
      location_longitude: longitude || null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });

    if (sessionError) {
      console.error("[Supabase] Session creation error:", sessionError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create session: " + sessionError.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("[SafeWalk] Session created successfully:", sessionId);

    const smsResults = [];

    for (const contact of emergencyContacts) {
      const smsMessage =
        "Alerte SOS de " +
        firstName +
        ". Localisation: " +
        latitude +
        ", " +
        longitude +
        ". Heure limite: " +
        limitTime;

      const smsResult = await sendSMSViaTwilio(
        contact.phone,
        smsMessage,
        twilioAccountSid,
        twilioAuthToken,
        twilioPhoneNumber
      );

      smsResults.push({
        contact: contact.name,
        phone: contact.phone,
        messageSid: smsResult.messageSid || null,
        status: smsResult.success ? "sent" : "failed",
        error: smsResult.error || null,
      });

      const { error: logError } = await supabase.from("sms_status").insert({
        session_id: sessionId,
        message_sid: smsResult.messageSid || "failed-" + Date.now(),
        account_sid: twilioAccountSid,
        phone_number: contact.phone,
        contact_name: contact.name,
        message_body: smsMessage,
        status: smsResult.success ? "sent" : "failed",
        status_updated_at: now.toISOString(),
        error_code: smsResult.error ? "TWILIO_ERROR" : null,
        error_message: smsResult.error || null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

      if (logError) {
        console.error("[Supabase] SMS log error:", logError);
      }
    }

    console.log("[SafeWalk] SMS sent to", smsResults.length, "contacts");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Alert SOS triggered successfully",
        sessionId,
        smsResults,
        timestamp: Date.now(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[SafeWalk] Unhandled error:", errorMsg);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Server error: " + errorMsg,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
