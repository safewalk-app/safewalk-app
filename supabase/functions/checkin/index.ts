// Edge Function: checkin
// Purpose: Confirm user arrival and close trip
// Auth: JWT user (client-auth)
// Input: { tripId }
// Output: { success, message, tripId, status }

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

interface CheckinRequest {
  tripId: string;
}

interface CheckinResponse {
  success: boolean;
  tripId?: string;
  status?: string;
  message?: string;
  error?: string;
  errorCode?: string;
}

async function checkin(req: Request): Promise<Response> {
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
    const rateLimitResult = await checkRateLimit(supabase, userId, 'checkin', ipAddress);

    if (!rateLimitResult.isAllowed) {
      await logRequest(supabase, userId, 'checkin', ipAddress);
      return createRateLimitHttpResponse(rateLimitResult.resetAt);
    }

    await logRequest(supabase, userId, 'checkin', ipAddress);

    // Parse request body
    const body = (await req.json()) as CheckinRequest;
    const { tripId } = body;

    // Validate inputs
    if (!tripId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing tripId',
          errorCode: 'INVALID_INPUT',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verify trip belongs to user
    const { data: tripData, error: tripError } = await supabase
      .from('sessions')
      .select('id, user_id, status')
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

    // Check if trip is still active
    if (tripData.status !== 'active') {
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

    // Update trip status to checked_in
    const { data: updatedTrip, error: updateError } = await supabase
      .from('sessions')
      .update({
        status: 'checked_in',
        checkin_at: new Date().toISOString(),
      })
      .eq('id', tripId)
      .select()
      .single();

    if (updateError || !updatedTrip) {
      console.error('Checkin update error:', updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to update trip',
          errorCode: 'DB_ERROR',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Success response
    const response: CheckinResponse = {
      success: true,
      tripId: updatedTrip.id,
      status: updatedTrip.status,
      message: 'Checked in successfully',
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Checkin error:', errorMessage);

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

Deno.serve(checkin);
