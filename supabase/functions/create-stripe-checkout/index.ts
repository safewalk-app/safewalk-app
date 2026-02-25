import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { checkRateLimit, logRequest, createRateLimitHttpResponse } from "../_shared/rate-limiter.ts";

interface CheckoutRequest {
  productId: string;
  userId: string;
  userEmail: string;
}

serve(async (req: Request) => {
  // Enable CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { productId, userId, userEmail } = (await req.json()) as CheckoutRequest;

    if (!productId || !userId || !userEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    // RATE LIMITING: Check if user has exceeded rate limit
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const ipAddress = req.headers.get("x-forwarded-for") || "unknown";
    const rateLimitResult = await checkRateLimit(supabase, userId, "create-stripe-checkout", ipAddress);

    if (!rateLimitResult.isAllowed) {
      await logRequest(supabase, userId, "create-stripe-checkout", ipAddress);
      return createRateLimitHttpResponse(rateLimitResult.resetAt);
    }

    await logRequest(supabase, userId, "create-stripe-checkout", ipAddress);

    // Create Stripe checkout session
    const checkoutResponse = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          "line_items[0][price]": productId,
          "line_items[0][quantity]": "1",
          mode: "payment", // or "subscription" for recurring
          success_url: `${supabaseUrl}/auth/v1/callback?type=stripe_success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${supabaseUrl}/auth/v1/callback?type=stripe_cancel`,
          customer_email: userEmail,
          metadata: {
            user_id: userId,
          },
        }).toString(),
      }
    );

    if (!checkoutResponse.ok) {
      const error = await checkoutResponse.text();
      console.error("Stripe API error:", error);
      throw new Error(`Stripe API error: ${checkoutResponse.status}`);
    }

    const session = await checkoutResponse.json();

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
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
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create checkout session" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
