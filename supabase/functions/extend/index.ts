// Edge Function: extend
// Purpose: Extend trip deadline
// Auth: JWT user (client-auth)
// Input: { tripId, addMinutes }
// Output: { success, message, tripId, newDeadline }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import {
  checkRateLimit,
  logRequest,
  createRateLimitHttpResponse,
} from '../_shared/rate-limiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtendRequest {
  tripId: string;
  addMinutes: number;
}

interface ExtendResponse {
  success: boolean;
  tripId?: string;
  newDeadline?: string;
  message?: string;
  error?: string;
  errorCode?: string;
}

async function extend(req: Request): Promise<Response> {
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
    const rateLimitResult = await checkRateLimit(supabase, userId, 'extend', ipAddress);

    if (!rateLimitResult.isAllowed) {
      await logRequest(supabase, userId, 'extend', ipAddress);
      return createRateLimitHttpResponse(rateLimitResult.resetAt);
    }

    await logRequest(supabase, userId, 'extend', ipAddress);

    // Parse request body
    const body = (await req.json()) as ExtendRequest;
    const { tripId, addMinutes } = body;

    // Validate inputs
    if (!tripId || !addMinutes || addMinutes <= 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing or invalid tripId or addMinutes',
          errorCode: 'INVALID_INPUT',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Validate addMinutes is reasonable (max 24 hours)
    if (addMinutes > 1440) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cannot extend more than 24 hours',
          errorCode: 'EXTENSION_TOO_LONG',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Get current trip
    const { data: tripData, error: tripError } = await supabase
      .from('sessions')
      .select('id, user_id, status, deadline')
      .eq('id', tripId)
      .eq('user_id', userId)
      .single();

    if (tripError || !tripData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Trip not found or unauthorized',
          errorCode: 'NOT_FOUND',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Check if trip is still active or alerted (can extend both)
    if (tripData.status !== 'active' && tripData.status !== 'alerted') {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Trip is already ${tripData.status}`,
          errorCode: 'TRIP_NOT_ACTIVE',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Calculate new deadline
    const currentDeadline = new Date(tripData.deadline);
    const newDeadline = new Date(currentDeadline.getTime() + addMinutes * 60000);

    // Update trip deadline + reset alert state if extending from alerted
    const updatePayload: Record<string, unknown> = {
      deadline: newDeadline.toISOString(),
    };
    // If trip was alerted, reset to active and clear alert_sent_at
    if (tripData.status === 'alerted') {
      updatePayload.status = 'active';
      updatePayload.alert_sent_at = null;
    }

    const { data: updatedTrip, error: updateError } = await supabase
      .from('sessions')
      .update(updatePayload)
      .eq('id', tripId)
      .select()
      .single();

    if (updateError || !updatedTrip) {
      console.error('Extend update error:', updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to extend trip',
          errorCode: 'DB_ERROR',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Success response
    const response: ExtendResponse = {
      success: true,
      tripId: updatedTrip.id,
      newDeadline: updatedTrip.deadline,
      message: `Trip extended by ${addMinutes} minutes`,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Extend error:', errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        errorCode: 'EXCEPTION',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
}

Deno.serve(extend);
