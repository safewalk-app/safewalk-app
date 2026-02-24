// Edge Function: ping-location
// Purpose: Update trip location snapshot
// Auth: JWT user (client-auth)
// Input: { tripId, lat, lng }
// Output: { success, message, tripId }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PingLocationRequest {
  tripId: string;
  lat: number;
  lng: number;
}

interface PingLocationResponse {
  success: boolean;
  tripId?: string;
  message?: string;
  error?: string;
  errorCode?: string;
}

async function pingLocation(req: Request): Promise<Response> {
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

    // Parse request body
    const body = (await req.json()) as PingLocationRequest;
    const { tripId, lat, lng } = body;

    // Validate inputs
    if (!tripId || lat === undefined || lng === undefined) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing tripId, lat, or lng",
          errorCode: "INVALID_INPUT",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate coordinates
    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "lat and lng must be numbers",
          errorCode: "INVALID_COORDINATES",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid coordinate range",
          errorCode: "INVALID_COORDINATES",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify trip belongs to user
    const { data: tripData, error: tripError } = await supabase
      .from("sessions")
      .select("id, user_id, status")
      .eq("id", tripId)
      .eq("user_id", userId)
      .single();

    if (tripError || !tripData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Trip not found or unauthorized",
          errorCode: "NOT_FOUND",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if trip is still active
    if (tripData.status !== "active") {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Trip is already ${tripData.status}`,
          errorCode: "TRIP_NOT_ACTIVE",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update trip location
    const { data: updatedTrip, error: updateError } = await supabase
      .from("sessions")
      .update({
        location_latitude: lat,
        location_longitude: lng,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", tripId)
      .select()
      .single();

    if (updateError || !updatedTrip) {
      console.error("Ping location update error:", updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to update location",
          errorCode: "DB_ERROR",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Success response
    const response: PingLocationResponse = {
      success: true,
      tripId: updatedTrip.id,
      message: "Location updated successfully",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Ping location error:", errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        errorCode: "EXCEPTION",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

Deno.serve(pingLocation);
