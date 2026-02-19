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

// Send SMS via Twilio
async function sendSMSViaTwilio(
  to: string,
  message: string,
  twilioAccountSid: string,
  twilioAuthToken: string,
  twilioPhoneNumber: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: twilioPhoneNumber,
          To: to,
          Body: message,
        }).toString(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      messageSid: data.sid,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
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

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create session in Supabase
    const now = new Date();
    const deadline = new Date(now.getTime() + 30 * 60000); // 30 min default

    const { data: sessionData, error: sessionError } = await supabase
      .from("sessions")
      .insert([
        {
          user_id: `anonymous-${Date.now()}`,
          start_time: now.toISOString(),
          deadline: deadline.toISOString(),
          status: "active",
          location_latitude: latitude,
          location_longitude: longitude,
        },
      ])
      .select()
      .single();

    if (sessionError) {
      console.error("Error creating session:", sessionError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create session" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Send SMS to all contacts
    const limitTimeStr = limitTime || now.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const smsResults: Array<{
      contact: string;
      phone: string;
      messageSid: string;
      status: string;
    }> = [];

    for (const contact of emergencyContacts) {
      // Build message
      let message = `SafeWalk 🫶\n`;
      message += `${firstName} n'a pas encore confirmé qu'il est bien rentré (limite ${limitTimeStr} + 15 min).\n`;

      if (latitude && longitude) {
        message += `📍 https://maps.google.com/?q=${latitude},${longitude}\n`;
      } else {
        message += `📍 Position indisponible\n`;
      }

      message += `Tu peux lui passer un petit appel ?`;

      // Send SMS
      const smsResult = await sendSMSViaTwilio(
        contact.phone,
        message,
        twilioAccountSid,
        twilioAuthToken,
        twilioPhoneNumber
      );

      // Log SMS in Supabase
      if (smsResult.success) {
        // Create emergency contact
        const { data: contactData } = await supabase
          .from("emergency_contacts")
          .insert([
            {
              user_id: sessionData.user_id,
              name: contact.name,
              phone_number: contact.phone,
            },
          ])
          .select()
          .single();

        if (contactData) {
          // Log SMS
          await supabase.from("sms_logs").insert([
            {
              session_id: sessionData.id,
              contact_id: contactData.id,
              message_sid: smsResult.messageSid,
              status: "sent",
            },
          ]);
        }
      } else {
        // Log failed SMS
        const { data: contactData } = await supabase
          .from("emergency_contacts")
          .insert([
            {
              user_id: sessionData.user_id,
              name: contact.name,
              phone_number: contact.phone,
            },
          ])
          .select()
          .single();

        if (contactData) {
          await supabase.from("sms_logs").insert([
            {
              session_id: sessionData.id,
              contact_id: contactData.id,
              message_sid: "",
              status: "failed",
              error_message: smsResult.error,
            },
          ]);
        }
      }

      smsResults.push({
        contact: contact.name,
        phone: contact.phone,
        messageSid: smsResult.messageSid || "",
        status: smsResult.success ? "sent" : "failed",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Alert SOS triggered",
        sessionId: sessionData.id,
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
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
