import { supabase } from "@/lib/supabase";

export interface StripeProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  type: "subscription" | "credits";
  metadata?: Record<string, string>;
}

export interface StripeCheckoutSession {
  sessionId: string;
  url: string;
}

class StripeService {
  private initialized = false;
  private stripePublishableKey: string | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Get Stripe publishable key from environment
    this.stripePublishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;

    if (!this.stripePublishableKey) {
      console.warn("Stripe publishable key not configured");
    }

    this.initialized = true;
  }

  /**
   * Get available products for purchase
   */
  async getProducts(): Promise<StripeProduct[]> {
    return [
      // Subscriptions
      {
        id: "price_premium_monthly",
        name: "Premium Mensuel",
        description: "Alertes SMS illimitées",
        price: 9.99,
        currency: "USD",
        type: "subscription",
        metadata: { plan_id: "premium", interval: "month" },
      },
      {
        id: "price_premium_annual",
        name: "Premium Annuel",
        description: "Alertes SMS illimitées + 20% de réduction",
        price: 79.99,
        currency: "USD",
        type: "subscription",
        metadata: { plan_id: "premium_annual", interval: "year" },
      },
      // Credits
      {
        id: "price_credits_10",
        name: "10 Crédits",
        description: "10 alertes SMS",
        price: 0.99,
        currency: "USD",
        type: "credits",
        metadata: { credits: "10" },
      },
      {
        id: "price_credits_50",
        name: "50 Crédits",
        description: "50 alertes SMS",
        price: 4.99,
        currency: "USD",
        type: "credits",
        metadata: { credits: "50" },
      },
      {
        id: "price_credits_100",
        name: "100 Crédits",
        description: "100 alertes SMS",
        price: 9.99,
        currency: "USD",
        type: "credits",
        metadata: { credits: "100" },
      },
      {
        id: "price_credits_500",
        name: "500 Crédits",
        description: "500 alertes SMS",
        price: 39.99,
        currency: "USD",
        type: "credits",
        metadata: { credits: "500" },
      },
    ];
  }

  /**
   * Create a checkout session for a product
   */
  async createCheckoutSession(productId: string): Promise<StripeCheckoutSession | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Call Edge Function to create checkout session
      const { data, error } = await supabase.functions.invoke("create-stripe-checkout", {
        body: {
          productId,
          userId: user.id,
          userEmail: user.email,
        },
      });

      if (error) {
        console.error("Error creating checkout session:", error);
        return null;
      }

      return data as StripeCheckoutSession;
    } catch (error) {
      console.error("Error in createCheckoutSession:", error);
      return null;
    }
  }

  /**
   * Get user's subscription status
   */
  async getSubscriptionStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase.rpc("get_user_subscription", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Error fetching subscription:", error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error("Error in getSubscriptionStatus:", error);
      return null;
    }
  }

  /**
   * Get user's credits balance
   */
  async getCreditsBalance() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase.rpc("get_user_credits", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Error fetching credits:", error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error("Error in getCreditsBalance:", error);
      return null;
    }
  }

  /**
   * Get quota status (subscription + credits + free quota)
   */
  async getQuotaStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase.rpc("get_quota_status", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Error fetching quota status:", error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error("Error in getQuotaStatus:", error);
      return null;
    }
  }

  /**
   * Cancel user's subscription
   */
  async cancelSubscription(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase.rpc("cancel_subscription", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Error cancelling subscription:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in cancelSubscription:", error);
      return false;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(limit: number = 10) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching transactions:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getTransactionHistory:", error);
      return [];
    }
  }
}

export const stripeService = new StripeService();
