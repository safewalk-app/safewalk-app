// Edge Function: start-trip
// Purpose: Create a new active trip/session
// Auth: JWT user (client-auth)
// Input: { deadlineISO, shareLocation, destinationNote? }
// Output: { tripId, status, deadline, message }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface StartTripRequest {
  deadlineISO: string;
  shareLocation: boolean;
  destinationNote?: string;
}

interface StartTripResponse {
  success: boolean;
  tripId?: string;
  status?: string;
  deadline?: string;
  message?: string;
  error?: string;
  errorCode?: string;
}

async function startTrip(
  req: Request
): Promise<Response> {
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

    // Check if phone is verified
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("phone_verified, subscription_active, free_alerts_remaining")
      .eq("id", userId)
      .single();

    if (profileError || !profileData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "User profile not found",
          errorCode: "PROFILE_NOT_FOUND",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check phone verification
    if (!profileData.phone_verified) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Phone number not verified",
          errorCode: "phone_not_verified",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check credits/subscription
    if (!profileData.subscription_active && profileData.free_alerts_remaining <= 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Crédits insuffisants. Veuillez vous abonner pour continuer.",
          errorCode: "no_credits",
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user has at least one emergency contact
    const { data: contacts, error: contactError } = await supabase
      .from("emergency_contacts")
      .select("id")
      .eq("user_id", userId)
      .eq("opted_out", false)
      .limit(1);

    if (contactError || !contacts || contacts.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Aucun contact d'urgence configuré. Veuillez ajouter un contact avant de démarrer.",
          errorCode: "missing_contact",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Consume credit atomically
    const { data: creditData, error: creditError } = await supabase.rpc(
      "consume_credit",
      { p_user_id: userId, p_type: "late" }
    );

    if (creditError || !creditData?.[0]?.allowed) {
      const reason = creditData?.[0]?.reason || "Failed to consume credit";
      const errorCode = reason === "no_credits" ? "no_credits" : 
                       reason === "quota_reached" ? "quota_reached" :
                       reason === "phone_not_verified" ? "phone_not_verified" :
                       "FUNCTION_ERROR";
      const statusCode = errorCode === "no_credits" || errorCode === "quota_reached" ? 402 : 403;
      
      return new Response(
        JSON.stringify({
          success: false,
          error: reason,
          errorCode,
        }),
        {
          status: statusCode,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    let body: StartTripRequest;
    try {
      body = (await req.json()) as StartTripRequest;
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid request body",
          errorCode: "INVALID_INPUT",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const { deadlineISO, shareLocation, destinationNote } = body;

    // Validate inputs
    if (!deadlineISO) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing deadlineISO",
          errorCode: "INVALID_INPUT",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse deadline
    const deadline = new Date(deadlineISO);
    if (isNaN(deadline.getTime())) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid deadline format",
          errorCode: "INVALID_DEADLINE",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate deadline is in the future
    if (deadline <= new Date()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Deadline must be in the future",
          errorCode: "DEADLINE_IN_PAST",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create trip in database
    const { data: tripData, error: tripError } = await supabase
      .from("sessions")
      .insert({
        user_id: userId,
        start_time: new Date().toISOString(),
        deadline: deadline.toISOString(),
        status: "active",
        share_location: shareLocation,
        destination_note: destinationNote || null,
      })
      .select()
      .single();

    if (tripError || !tripData) {
      console.error("Trip creation error:", tripError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create trip",
          errorCode: "DB_ERROR",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Success response
    const response: StartTripResponse = {
      success: true,
      tripId: tripData.id,
      status: tripData.status,
      deadline: tripData.deadline,
      message: "Trip started successfully",
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Start trip error:", errorMessage);

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

Deno.serve(startTrip);
