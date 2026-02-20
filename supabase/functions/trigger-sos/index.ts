import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types
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

// Validation simple
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
    // Simple E.164 validation
    if (!/^\+?[1-9]\d{1,14}$/.test(contact.phone)) {
      return { valid: false, error: `Invalid phone format: ${contact.phone}` };
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

// Send SMS via Twilio with better error handling
async function sendSMSViaTwilio(
  to: string,
  message: string,
  twilioAccountSid: string,
  twilioAuthToken: string,
  twilioPhoneNumber: string
): Promise<{ success: boolean; messageSid?: string; error?: string; status?: number; response?: string }> {
  try {
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    
    const requestBody = new URLSearchParams({
      From: twilioPhoneNumber,
      To: to,
      Body: message,
    }).toString();

    console.log(`[Twilio] Sending SMS to ${to} from ${twilioPhoneNumber}`);
    console.log(`[Twilio] Auth header: Basic ${auth.substring(0, 20)}...`);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: requestBody,
      }
    );

    const responseText = await response.text();
    console.log(`[Twilio] Response status: ${response.status}`);
    console.log(`[Twilio] Response body: ${responseText.substring(0, 200)}`);

    if (!response.ok) {
      try {
        const error = JSON.parse(responseText);
        return {
          success: false,
          error: error.message || `HTTP ${response.status}`,
          status: response.status,
          response: responseText.substring(0, 500),
        };
      } catch {
        return {
          success: false,
          error: `HTTP ${response.status}: ${responseText.substring(0, 200)}`,
          status: response.status,
          response: responseText.substring(0, 500),
        };
      }
    }

    const data = JSON.parse(responseText);
    console.log(`[Twilio] SMS sent successfully: ${data.sid}`);
    return {
      success: true,
      messageSid: data.sid,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Twilio] Error: ${errorMessage}`);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Main handler
serve(async (req) => {
  // CORS headers
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
    // Parse request body
    const body = await req.json();

    // Validate
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

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    console.log("[SafeWalk] Environment check:");
    console.log(`  - SUPABASE_URL: ${supabaseUrl ? "✓" : "✗"}`);
    console.log(`  - SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceRoleKey ? "✓" : "✗"}`);
    console.log(`  - TWILIO_ACCOUNT_SID: ${twilioAccountSid ? "✓" : "✗"}`);
    console.log(`  - TWILIO_AUTH_TOKEN: ${twilioAuthToken ? "✓" : "✗"}`);
    console.log(`  - TWILIO_PHONE_NUMBER: ${twilioPhoneNumber ? "✓" : "✗"}`);

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

    // Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Parse limitTime to timestamp
    const now = new Date();
    let limitTimeDate = now;
    if (limitTime) {
      const [hours, minutes] = limitTime.split(':').map(Number);
      limitTimeDate = new Date();
      limitTimeDate.setHours(hours, minutes, 0, 0);
      // If the time is in the past, assume it's for tomorrow
      if (limitTimeDate < now) {
        limitTimeDate.setDate(limitTimeDate.getDate() + 1);
      }
    }

    // Calculate deadline (limitTime + 15 minutes tolerance)
    const deadline = new Date(limitTimeDate.getTime() + 15 * 60 * 1000);

    // Create session with correct schema
    const sessionId = crypto.randomUUID();
    const userId = crypto.randomUUID(); // Generate a valid UUID for anonymous users
    const { error: sessionError } = await supabase
      .from("sessions")
      .insert({
        id: sessionId,
        user_id: userId, // Valid UUID for anonymous users
        limit_time: limitTimeDate.toISOString(),
        tolerance: 15 * 60 * 1000, // 15 minutes in milliseconds
        deadline: deadline.toISOString(),
        status: "active",
        last_location: latitude && longitude ? { latitude, longitude } : null,
        emergency_contact_1_name: emergencyContacts[0]?.name || null,
        emergency_contact_1_phone: emergencyContacts[0]?.phone || null,
        emergency_contact_2_name: emergencyContacts[1]?.name || null,
        emergency_contact_2_phone: emergencyContacts[1]?.phone || null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });

    if (sessionError) {
      console.error(`[Supabase] Session creation error: ${sessionError.message}`);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to create session: ${sessionError.message}` }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[SafeWalk] Session created: ${sessionId}`);

    // Send SMS to each contact
    const smsResults = [];
    for (const contact of emergencyContacts) {
      const smsResult = await sendSMSViaTwilio(
        contact.phone,
        `Alerte SOS de ${firstName}. Localisation: ${latitude}, ${longitude}. Heure limite: ${limitTime}`,
        twilioAccountSid,
        twilioAuthToken,
        twilioPhoneNumber
      );

      smsResults.push({
        contact: contact.name,
        phone: contact.phone,
        messageSid: smsResult.messageSid,
        status: smsResult.success ? "sent" : "failed",
        error: smsResult.error,
      });

      // Log SMS result using sms_status table
      const { error: logError } = await supabase
        .from("sms_status")
        .insert({
          session_id: sessionId,
          message_sid: smsResult.messageSid || `failed-${Date.now()}`,
          account_sid: twilioAccountSid,
          phone_number: contact.phone,
          contact_name: contact.name,
          message_body: `Alerte SOS de ${firstName}. Localisation: ${latitude}, ${longitude}. Heure limite: ${limitTime}`,
          status: smsResult.success ? "sent" : "failed",
          status_updated_at: now.toISOString(),
          error_code: smsResult.status ? String(smsResult.status) : null,
          error_message: smsResult.error || null,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        });

      if (logError) {
        console.error(`[Supabase] SMS log error: ${logError.message}`);
      }
    }

    console.log(`[SafeWalk] SMS sent to ${smsResults.length} contacts`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Alert SOS triggered",
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[SafeWalk] Error: ${errorMessage}`);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
