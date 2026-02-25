import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

interface StripeEvent {
  type: string;
  data: {
    object: {
      id: string;
      customer: string;
      metadata?: {
        user_id: string;
        plan_id?: string;
      };
      amount?: number;
      currency?: string;
      status?: string;
    };
  };
}

async function handleStripeWebhook(req: Request) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const payload = await req.json() as StripeEvent;
  const { type, data } = payload;
  const { object } = data;

  console.log(`[Stripe Webhook] Event type: ${type}`);

  try {
    // Handle subscription created/updated
    if (type === "customer.subscription.created" || type === "customer.subscription.updated") {
      const userId = object.metadata?.user_id;
      const planId = object.metadata?.plan_id;
      const stripeSubscriptionId = object.id;

      if (!userId || !planId) {
        console.error("Missing user_id or plan_id in metadata");
        return new Response(JSON.stringify({ error: "Missing metadata" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Create/update subscription
      const { error: subError } = await supabase.rpc("create_subscription", {
        p_user_id: userId,
        p_plan_id: planId,
        p_stripe_subscription_id: stripeSubscriptionId,
      });

      if (subError) {
        console.error("Error creating subscription:", subError);
        return new Response(JSON.stringify({ error: "Failed to create subscription" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Insert transaction record
      const amount = object.amount ? (object.amount / 100) : 0; // Convert cents to dollars
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: userId,
        type: "subscription",
        amount,
        plan_id: planId,
        status: "completed",
        stripe_transaction_id: stripeSubscriptionId,
      });

      if (txError) {
        console.error("Error inserting transaction:", txError);
      }

      return new Response(JSON.stringify({ success: true, event: type }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle subscription deleted/cancelled
    if (type === "customer.subscription.deleted") {
      const userId = object.metadata?.user_id;
      const stripeSubscriptionId = object.id;

      if (!userId) {
        console.error("Missing user_id in metadata");
        return new Response(JSON.stringify({ error: "Missing user_id" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Cancel subscription
      const { error: cancelError } = await supabase.rpc("cancel_subscription", {
        p_user_id: userId,
      });

      if (cancelError) {
        console.error("Error cancelling subscription:", cancelError);
        return new Response(JSON.stringify({ error: "Failed to cancel subscription" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, event: type }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle charge succeeded (for one-time purchases)
    if (type === "charge.succeeded") {
      const userId = object.metadata?.user_id;
      const credits = parseInt(object.metadata?.credits || "0");

      if (!userId || credits === 0) {
        console.error("Missing user_id or credits in metadata");
        return new Response(JSON.stringify({ error: "Missing metadata" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Add credits
      const { error: creditError } = await supabase.rpc("add_credits", {
        p_user_id: userId,
        p_credits: credits,
        p_reason: "stripe_purchase",
      });

      if (creditError) {
        console.error("Error adding credits:", creditError);
        return new Response(JSON.stringify({ error: "Failed to add credits" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Insert transaction record
      const amount = object.amount ? (object.amount / 100) : 0; // Convert cents to dollars
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: userId,
        type: "credit_purchase",
        amount,
        credits_added: credits,
        status: "completed",
        stripe_transaction_id: object.id,
      });

      if (txError) {
        console.error("Error inserting transaction:", txError);
      }

      return new Response(JSON.stringify({ success: true, credits_added: credits }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle charge failed
    if (type === "charge.failed") {
      const userId = object.metadata?.user_id;

      if (userId) {
        // Insert failed transaction record
        const amount = object.amount ? (object.amount / 100) : 0;
        const { error: txError } = await supabase.from("transactions").insert({
          user_id: userId,
          type: "credit_purchase",
          amount,
          status: "failed",
          stripe_transaction_id: object.id,
          error_message: object.failure_message || "Payment failed",
        });

        if (txError) {
          console.error("Error inserting failed transaction:", txError);
        }
      }

      return new Response(JSON.stringify({ success: true, event: type }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Unknown event type - still return 200 to acknowledge receipt
    console.log(`[Stripe Webhook] Unhandled event type: ${type}`);
    return new Response(JSON.stringify({ success: true, event: type }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

Deno.serve(handleStripeWebhook);
