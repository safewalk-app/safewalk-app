// Edge Function: sos (STANDALONE - No external imports)
// Purpose: Trigger immediate SOS alert to primary emergency contact
// Auth: JWT user (client-auth)
// Input: { tripId? }
// Output: { success, message, smsSent, error }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SosRequest {
  tripId?: string;
}

interface SosResponse {
  success: boolean;
  message?: string;
  smsSent?: boolean;
  error?: string;
  errorCode?: string;
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
  fromNumber: string,
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append('From', fromNumber);
    formData.append('To', to);
    formData.append('Body', message);

    const auth = btoa(`${accountSid}:${authToken}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      return {
        success: false,
        error: (data.message as string) || 'Twilio API error',
      };
    }

    return {
      success: true,
      messageSid: (data.sid as string) || undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Create SOS alert message
function createSosAlertMessage(
  userName: string,
  shareLocation: boolean,
  latitude?: number,
  longitude?: number,
): string {
  let message = `🆘 Alerte SOS SafeWalk: ${userName} a déclenché une alerte d'urgence immédiate.`;

  if (shareLocation && latitude !== undefined && longitude !== undefined) {
    message += `\nPosition: https://maps.google.com/?q=${latitude},${longitude}`;
  }

  message += '\n\nContactez immédiatement les autorités si nécessaire.';

  return message;
}

async function sos(req: Request): Promise<Response> {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing authorization header',
          errorCode: 'UNAUTHORIZED',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing Supabase configuration',
          errorCode: 'CONFIG_ERROR',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data, error: authError } = await supabase.auth.getUser(token);

    if (authError || !data.user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid or expired token',
          errorCode: 'INVALID_TOKEN',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const userId = data.user.id;

    // Parse request body
    const body = (await req.json()) as SosRequest;
    const { tripId } = body;

    // Get Twilio config from environment
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioFromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Twilio configuration missing',
          errorCode: 'CONFIG_ERROR',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Call consume_credit RPC to check if user can send SOS
    const { data: creditData, error: creditError } = await supabase.rpc('consume_credit', {
      p_user_id: userId,
      p_type: 'sos',
    });

    if (creditError) {
      console.error('Credit check error:', creditError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to check SOS quota',
          errorCode: 'QUOTA_CHECK_FAILED',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const creditResult = creditData?.[0];
    if (!creditResult?.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: creditResult?.reason || 'SOS quota exceeded',
          errorCode: creditResult?.reason || 'QUOTA_EXCEEDED',
          smsSent: false,
        }),
        {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Get user info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('first_name')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'User not found',
          errorCode: 'USER_NOT_FOUND',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Get trip info if provided (for location)
    let tripData = null;
    if (tripId) {
      const { data: trip, error: tripError } = await supabase
        .from('sessions')
        .select('id, location_latitude, location_longitude, share_location')
        .eq('id', tripId)
        .eq('user_id', userId)
        .single();

      if (!tripError && trip) {
        tripData = trip;
      }
    }

    // Get primary emergency contact
    const { data: contactData, error: contactError } = await supabase
      .from('emergency_contacts')
      .select('id, phone_number')
      .eq('user_id', userId)
      .eq('priority', 1)
      .eq('opted_out', false)
      .single();

    if (contactError || !contactData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No primary emergency contact found',
          errorCode: 'NO_CONTACT',
          smsSent: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Validate contact phone number
    if (!isValidPhoneNumber(contactData.phone_number)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid emergency contact phone number',
          errorCode: 'INVALID_PHONE',
          smsSent: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Create SOS message
    const sosMessage = createSosAlertMessage(
      userData.first_name,
      tripData?.share_location ?? false,
      tripData?.location_latitude,
      tripData?.location_longitude,
    );

    // Send SOS SMS
    const smsResult = await sendSms(
      contactData.phone_number,
      sosMessage,
      twilioAccountSid,
      twilioAuthToken,
      twilioFromNumber,
    );

    if (!smsResult.success) {
      // Log failed SOS attempt
      await supabase.from('sms_logs').insert({
        user_id: userId,
        contact_id: contactData.id,
        sms_type: 'sos',
        status: 'failed',
        error_message: smsResult.error,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: smsResult.error || 'Failed to send SOS',
          errorCode: smsResult.errorCode || 'SMS_FAILED',
          smsSent: false,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Log successful SOS
    await supabase.from('sms_logs').insert({
      user_id: userId,
      contact_id: contactData.id,
      sms_type: 'sos',
      status: 'sent',
      message_sid: smsResult.messageSid,
    });

    // Update trip status to sos_triggered if tripId provided
    if (tripId) {
      await supabase.from('sessions').update({ status: 'sos_triggered' }).eq('id', tripId);
    }

    // Success response
    const response: SosResponse = {
      success: true,
      message: 'SOS alert sent successfully',
      smsSent: true,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('SOS error:', errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        errorCode: 'EXCEPTION',
        smsSent: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
}

Deno.serve(sos);
