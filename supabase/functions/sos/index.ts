// Edge Function: sos
// Purpose: Trigger immediate SOS alert to primary emergency contact
// Auth: JWT user (client-auth)
// Input: { tripId? }
// Output: { success, message, smsSent, error }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { sendSms, isValidPhoneNumber } from '../_shared/twilio.ts';
import {
  checkRateLimit,
  logRequest,
  createRateLimitHttpResponse,
} from '../_shared/rate-limiter.ts';
import { buildSosSms } from '../_shared/sms-templates.ts';
import { retryWithBackoff } from '../_shared/retry-helper.ts';

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

    // RATE LIMITING: Check if user has exceeded rate limit
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = await checkRateLimit(supabase, userId, 'sos', ipAddress);

    if (!rateLimitResult.isAllowed) {
      await logRequest(supabase, userId, 'sos', ipAddress);
      return createRateLimitHttpResponse(rateLimitResult.resetAt);
    }

    await logRequest(supabase, userId, 'sos', ipAddress);

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

    // Get user profile info
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('first_name, share_user_phone_in_alerts, phone_number')
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

    // Build SOS message using dynamic template
    const sosMessage = buildSosSms({
      firstName: userData?.first_name || undefined,
      lat: tripData?.share_location ? tripData?.location_latitude : undefined,
      lng: tripData?.share_location ? tripData?.location_longitude : undefined,
      userPhone: userData?.phone_number,
      shareUserPhoneInAlerts: userData?.share_user_phone_in_alerts ?? false,
    });

    // Send SOS SMS with retry logic (SOS is critical, use 3 retries)
    const smsRetryResult = await retryWithBackoff(
      () =>
        sendSms({
          to: contactData.phone_number,
          message: sosMessage,
          config: {
            accountSid: twilioAccountSid,
            authToken: twilioAuthToken,
            fromNumber: twilioFromNumber,
          },
          maxRetries: 3,
          initialDelayMs: 500, // Faster retries for SOS (critical)
        }),
      {
        maxRetries: 3,
        initialDelayMs: 500,
      },
    );

    const smsResult = smsRetryResult.success
      ? smsRetryResult.data!
      : {
          success: false,
          error: smsRetryResult.error?.message || 'Unknown error',
          errorCode: 'RETRY_FAILED',
        };

    if (!smsResult.success) {
      // Log failed SOS attempt
      await supabase.from('sms_logs').insert({
        user_id: userId,
        contact_id: contactData.id,
        sms_type: 'sos',
        status: 'failed',
        error_message: smsResult.error,
        retry_count: smsRetryResult.retryCount,
        duration_ms: smsRetryResult.totalDurationMs,
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
      retry_count: smsRetryResult.retryCount,
      duration_ms: smsRetryResult.totalDurationMs,
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
