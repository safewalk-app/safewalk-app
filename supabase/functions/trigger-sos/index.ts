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
    return { valid: false, error: "firstName is required" };
  }
  if (!Array.isArray(body.emergencyContacts) || body.emergencyContacts.length === 0) {
    return { valid: false, error: "emergencyContacts required" };
  }
  for (const contact of body.emergencyContacts) {
    if (!contact.name || !contact.phone) {
      return { valid: false, error: "Each contact needs name and phone" };
    }
    if (!/^\+?[1-9]\d{1,14}$/.test(contact.phone)) {
      return { valid: false, error: "Invalid phone format" };
    }
  }
  return { valid: true };
}

async function sendSMSViaTwilio(to: string, message: string, twilioAccountSid: string, twilioAuthToken: string, twilioPhoneNumber: string) {
  try {
    const auth = btoa(twilioAccountSid + ":" + twilioAuthToken);
    const requestBody = new URLSearchParams({
      From: twilioPhoneNumber,
      To: to,
      Body: message,
    }).toString();

    const response = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + twilioAccountSid + "/Messages.json", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: requestBody,
    });

    const responseText = await response.text();
    if (!response.ok) {
      return { success: false, error: "HTTP " + response.status };
    }
    const data = JSON.parse(responseText);
    return { success: true, messageSid: data.sid };
  } catch (error) {
    return { success: false, error: error.message };
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
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const validation = validateSOSRequest(body);
    if (!validation.valid) {
      return new Response(JSON.stringify({ success: false, error: validation.error }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { firstName, emergencyContacts, latitude, longitude, limitTime } = body as SOSRequest;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!supabaseUrl || !supabaseServiceRoleKey || !twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      return new Response(JSON.stringify({ success: false, error: "Missing configuration" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const now = new Date();
    let limitTimeDate = now;
    if (limitTime) {
      const parts = limitTime.split(":");
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      limitTimeDate = new Date();
      limitTimeDate.setHours(hours, minutes, 0, 0);
      if (limitTimeDate < now) {
        limitTimeDate.setDate(limitTimeDate.getDate() + 1);
      }
    }

    const deadline = new Date(limitTimeDate.getTime() + 15 * 60 * 1000);
    const sessionId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    
    // Insert with only essential columns that exist in Supabase
    const { error: sessionError } = await supabase.from("sessions").insert({
      id: sessionId,
      user_id: userId,
      limit_time: limitTimeDate.toISOString(),
      tolerance: 15 * 60 * 1000,
      deadline: deadline.toISOString(),
      status: "active",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });

    if (sessionError) {
      console.error("Session error:", sessionError);
      return new Response(JSON.stringify({ success: false, error: "Failed to create session: " + sessionError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Send SMS to each contact
    const smsResults = [];
    for (const contact of emergencyContacts) {
      const smsResult = await sendSMSViaTwilio(contact.phone, "Alerte SOS de " + firstName, twilioAccountSid, twilioAuthToken, twilioPhoneNumber);
      smsResults.push({
        contact: contact.name,
        phone: contact.phone,
        messageSid: smsResult.messageSid,
        status: smsResult.success ? "sent" : "failed",
      });

      // Log SMS result
      await supabase.from("sms_status").insert({
        session_id: sessionId,
        message_sid: smsResult.messageSid || "failed",
        account_sid: twilioAccountSid,
        phone_number: contact.phone,
        contact_name: contact.name,
        message_body: "Alerte SOS",
        status: smsResult.success ? "sent" : "failed",
        status_updated_at: now.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Alert SOS triggered", sessionId, smsResults, timestamp: Date.now() }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ success: false, error: "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
