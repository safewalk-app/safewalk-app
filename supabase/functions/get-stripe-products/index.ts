import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface StripeProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  type: "subscription" | "credits";
  metadata?: Record<string, string>;
  stripeProductId?: string;
  stripePriceId?: string;
}

async function getStripeProducts(): Promise<StripeProduct[]> {
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY not configured");
  }

  try {
    // Fetch all prices from Stripe
    const response = await fetch("https://api.stripe.com/v1/prices?limit=100&active=true", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Stripe API error:", error);
      throw new Error(`Stripe API error: ${response.status}`);
    }

    const data = await response.json();
    const prices = data.data || [];

    // Transform Stripe prices to app format
    const products: StripeProduct[] = [];

    for (const price of prices) {
      // Skip if no product info
      if (!price.product) continue;

      // Fetch product details
      const productResponse = await fetch(
        `https://api.stripe.com/v1/products/${price.product}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${stripeSecretKey}`,
          },
        }
      );

      if (!productResponse.ok) continue;

      const product = await productResponse.json();

      // Determine type from metadata
      const type = product.metadata?.type || "subscription";
      const amount = price.unit_amount ? price.unit_amount / 100 : 0; // Convert cents to dollars
      const currency = (price.currency || "usd").toUpperCase();

      products.push({
        id: price.id,
        name: product.name,
        description: product.description || "",
        price: amount,
        currency,
        type: type as "subscription" | "credits",
        metadata: product.metadata,
        stripeProductId: product.id,
        stripePriceId: price.id,
      });
    }

    // Sort: subscriptions first, then credits
    products.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "subscription" ? -1 : 1;
      }
      return a.price - b.price;
    });

    return products;
  } catch (error) {
    console.error("Error fetching Stripe products:", error);
    throw error;
  }
}

serve(async (req: Request) => {
  // Enable CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const products = await getStripeProducts();

    return new Response(JSON.stringify({ products }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch products" }),
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
