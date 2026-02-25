# Architecture du Paywall/Subscription - SafeWalk

## Vue d'ensemble

SafeWalk utilise un **système de crédits** pour monétiser les alertes SMS:

- **Gratuit**: 5 alertes SMS/mois (freemium)

- **Premium**: Alertes SMS illimitées + priorité support

- **Pay-as-you-go**: Acheter des crédits à la demande

---

## Modèle de Pricing

### Plans

| Plan | Prix | Alertes SMS/mois | Durée | Renouvellement |
| --- | --- | --- | --- | --- |
| **Free** | Gratuit | 5 | Illimité | Auto |
| **Premium** | $4.99 | Illimité | 1 mois | Auto |
| **Premium Annual** | $39.99 | Illimité | 1 an | Auto |
| **Pay-as-you-go** | $0.10/SMS | À l'usage | N/A | À la demande |

### Crédits

| Paquet | Crédits | Prix | Coût/crédit |
| --- | --- | --- | --- |
| 10 crédits | 10 | $0.99 | $0.099 |
| 50 crédits | 50 | $4.99 | $0.098 |
| 100 crédits | 100 | $9.99 | $0.0999 |
| 500 crédits | 500 | $39.99 | $0.08 |

---

## Architecture Globale

```
┌─────────────────────────────────────────────────────────┐
│  App Mobile (React Native)                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Paywall Screen                                   │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ - Affiche les plans disponibles                  │  │
│  │ - Affiche les crédits actuels                    │  │
│  │ - Boutons d'achat (Subscribe, Buy credits)       │  │
│  └──────────────────────────────────────────────────┘  │
│           ↓ (Tap to purchase)                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ RevenueCat SDK (IAP)                             │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ - Gère les achats in-app (iOS/Android)           │  │
│  │ - Gère les abonnements                           │  │
│  │ - Gère la restauration des achats                │  │
│  └──────────────────────────────────────────────────┘  │
│           ↓ (Webhook)                                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Edge Function: handle-purchase                   │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ - Valide la transaction                          │  │
│  │ - Met à jour les crédits/subscription            │  │
│  │ - Envoie confirmation email                      │  │
│  └──────────────────────────────────────────────────┘  │
│           ↓                                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Database Tables                                  │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ - subscriptions (plan actif)                     │  │
│  │ - user_credits (solde de crédits)                │  │
│  │ - transactions (historique d'achats)             │  │
│  │ - credit_usage (historique d'utilisation)        │  │
│  └──────────────────────────────────────────────────┘  │
│           ↓ (Queries)                                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ RPC Functions                                    │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ - get_user_subscription()                        │  │
│  │ - get_user_credits()                             │  │
│  │ - consume_credit()                               │  │
│  │ - get_quota_status()                             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Tables de Subscription

### Table: subscriptions

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR NOT NULL,  -- 'free', 'premium', 'premium_annual'
  status VARCHAR NOT NULL,    -- 'active', 'cancelled', 'expired'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT true,
  revenue_cat_subscription_id VARCHAR,  -- ID de RevenueCat
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

### Table: user_credits

```sql
CREATE TABLE user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance INT NOT NULL DEFAULT 0,  -- Nombre de crédits
  total_earned INT NOT NULL DEFAULT 0,  -- Total gagné (free + paid)
  total_spent INT NOT NULL DEFAULT 0,   -- Total dépensé
  last_reset_at TIMESTAMPTZ,  -- Dernière réinitialisation du quota gratuit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_credits_user_id ON user_credits(user_id);
```

### Table: transactions

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,  -- 'subscription', 'credit_purchase', 'refund'
  amount DECIMAL(10, 2) NOT NULL,  -- Montant en USD
  credits_added INT,  -- Crédits ajoutés (si applicable)
  plan_id VARCHAR,  -- Plan acheté (si subscription)
  status VARCHAR NOT NULL,  -- 'pending', 'completed', 'failed', 'refunded'
  revenue_cat_transaction_id VARCHAR,  -- ID de RevenueCat
  receipt_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
```

### Table: credit_usage

```sql
CREATE TABLE credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id),
  event_type VARCHAR NOT NULL,  -- 'alert_sms', 'sos_sms', 'test_sms'
  credits_used INT NOT NULL,
  reason VARCHAR,  -- 'deadman_switch', 'sos_triggered', 'test_sms'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_usage_user_id ON credit_usage(user_id);
CREATE INDEX idx_credit_usage_created_at ON credit_usage(created_at);
```

---

## 2. RPC Functions pour Subscription

### RPC: get_user_subscription()

```sql
CREATE FUNCTION get_user_subscription(p_user_id UUID)
RETURNS TABLE (
  plan_id VARCHAR,
  status VARCHAR,
  started_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  auto_renew BOOLEAN,
  days_remaining INT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.plan_id,
    s.status,
    s.started_at,
    s.ends_at,
    s.auto_renew,
    EXTRACT(DAY FROM (s.ends_at - NOW()))::INT as days_remaining,
    (s.status = 'active' AND (s.ends_at IS NULL OR s.ends_at > NOW())) as is_active
  FROM subscriptions s
  WHERE s.user_id = p_user_id
  LIMIT 1;
END;
$$;
```

### RPC: get_user_credits()

```sql
CREATE FUNCTION get_user_credits(p_user_id UUID)
RETURNS TABLE (
  balance INT,
  total_earned INT,
  total_spent INT,
  free_alerts_remaining INT,
  subscription_status VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH credits AS (
    SELECT 
      uc.balance,
      uc.total_earned,
      uc.total_spent
    FROM user_credits uc
    WHERE uc.user_id = p_user_id
  ),
  subscription AS (
    SELECT 
      s.status,
      s.plan_id
    FROM subscriptions s
    WHERE s.user_id = p_user_id
      AND s.status = 'active'
      AND (s.ends_at IS NULL OR s.ends_at > NOW())
  ),
  free_quota AS (
    SELECT 
      CASE 
        WHEN DATE_TRUNC('month', NOW()) > DATE_TRUNC('month', uc.last_reset_at) THEN 5
        ELSE GREATEST(0, 5 - (
          SELECT COUNT(*) FROM credit_usage cu
          WHERE cu.user_id = p_user_id
            AND cu.created_at > DATE_TRUNC('month', NOW())
            AND cu.event_type = 'alert_sms'
        ))
      END as free_remaining
    FROM user_credits uc
    WHERE uc.user_id = p_user_id
  )
  SELECT 
    c.balance,
    c.total_earned,
    c.total_spent,
    fq.free_remaining,
    COALESCE(s.status, 'none')
  FROM credits c
  CROSS JOIN free_quota fq
  LEFT JOIN subscription s ON true;
END;
$$;
```

### RPC: consume_credit()

```sql
CREATE FUNCTION consume_credit(
  p_user_id UUID,
  p_session_id UUID,
  p_event_type VARCHAR,
  p_reason VARCHAR
)
RETURNS TABLE (
  success BOOLEAN,
  error_code VARCHAR,
  balance INT,
  free_alerts_remaining INT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance INT;
  v_subscription_status VARCHAR;
  v_free_remaining INT;
  v_credits_needed INT := 1;
BEGIN
  -- Vérifier si l'utilisateur a une subscription active
  SELECT s.status INTO v_subscription_status
  FROM subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status = 'active'
    AND (s.ends_at IS NULL OR s.ends_at > NOW());

  -- Si subscription active, pas besoin de crédits
  IF v_subscription_status = 'active' THEN
    INSERT INTO credit_usage (user_id, session_id, event_type, reason)
    VALUES (p_user_id, p_session_id, p_event_type, p_reason);
    
    SELECT balance INTO v_balance FROM user_credits WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT 
      true,
      'subscription_active'::VARCHAR,
      v_balance,
      NULL::INT;
    RETURN;
  END IF;

  -- Vérifier le quota gratuit (5 alertes/mois)
  SELECT COUNT(*) INTO v_free_remaining
  FROM credit_usage
  WHERE user_id = p_user_id
    AND event_type = 'alert_sms'
    AND created_at > DATE_TRUNC('month', NOW());

  v_free_remaining := 5 - v_free_remaining;

  IF v_free_remaining > 0 THEN
    INSERT INTO credit_usage (user_id, session_id, event_type, reason)
    VALUES (p_user_id, p_session_id, p_event_type, p_reason);
    
    SELECT balance INTO v_balance FROM user_credits WHERE user_id = p_user_id;
    
    RETURN QUERY SELECT 
      true,
      'free_quota_used'::VARCHAR,
      v_balance,
      v_free_remaining - 1;
    RETURN;
  END IF;

  -- Vérifier les crédits payants
  SELECT balance INTO v_balance FROM user_credits WHERE user_id = p_user_id;

  IF v_balance < v_credits_needed THEN
    RETURN QUERY SELECT 
      false,
      'no_credits'::VARCHAR,
      v_balance,
      0;
    RETURN;
  END IF;

  -- Consommer le crédit
  UPDATE user_credits
  SET 
    balance = balance - v_credits_needed,
    total_spent = total_spent + v_credits_needed,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  INSERT INTO credit_usage (user_id, session_id, event_type, reason)
  VALUES (p_user_id, p_session_id, p_event_type, p_reason);

  SELECT balance INTO v_balance FROM user_credits WHERE user_id = p_user_id;

  RETURN QUERY SELECT 
    true,
    'credit_consumed'::VARCHAR,
    v_balance,
    0;
END;
$$;
```

### RPC: get_quota_status()

```sql
CREATE FUNCTION get_quota_status(p_user_id UUID)
RETURNS TABLE (
  has_subscription BOOLEAN,
  subscription_plan VARCHAR,
  subscription_ends_at TIMESTAMPTZ,
  free_alerts_remaining INT,
  paid_credits_balance INT,
  quota_reached BOOLEAN,
  error_code VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH subscription AS (
    SELECT 
      s.plan_id,
      s.ends_at,
      (s.status = 'active' AND (s.ends_at IS NULL OR s.ends_at > NOW())) as is_active
    FROM subscriptions s
    WHERE s.user_id = p_user_id
    LIMIT 1
  ),
  free_quota AS (
    SELECT 
      GREATEST(0, 5 - COALESCE((
        SELECT COUNT(*) FROM credit_usage cu
        WHERE cu.user_id = p_user_id
          AND cu.created_at > DATE_TRUNC('month', NOW())
          AND cu.event_type = 'alert_sms'
      ), 0)) as free_remaining
  ),
  credits AS (
    SELECT balance FROM user_credits WHERE user_id = p_user_id
  )
  SELECT 
    COALESCE(s.is_active, false),
    s.plan_id,
    s.ends_at,
    fq.free_remaining,
    COALESCE(c.balance, 0),
    CASE 
      WHEN COALESCE(s.is_active, false) THEN false
      WHEN fq.free_remaining > 0 THEN false
      WHEN COALESCE(c.balance, 0) > 0 THEN false
      ELSE true
    END as quota_reached,
    CASE 
      WHEN COALESCE(s.is_active, false) THEN 'subscription_active'::VARCHAR
      WHEN fq.free_remaining > 0 THEN 'free_quota_available'::VARCHAR
      WHEN COALESCE(c.balance, 0) > 0 THEN 'credits_available'::VARCHAR
      ELSE 'no_credits'::VARCHAR
    END as error_code
  FROM subscription s
  CROSS JOIN free_quota fq
  CROSS JOIN credits c;
END;
$$;
```

---

## 3. Edge Function: handle-purchase

```typescript
// supabase/functions/handle-purchase/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

interface RevenueCatEvent {
  event: {
    type: string;
    app_user_id: string;
    product_id: string;
    purchased_at_ms: number;
    transaction_id: string;
  };
}

async function handlePurchase(req: Request ) {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const payload = await req.json() as RevenueCatEvent;
  const { event } = payload;
  const { app_user_id, product_id, transaction_id } = event.event;

  // Mapper les product_id aux crédits
  const creditMap: Record<string, number> = {
    "safewalk_10_credits": 10,
    "safewalk_50_credits": 50,
    "safewalk_100_credits": 100,
    "safewalk_500_credits": 500,
  };

  const priceMap: Record<string, number> = {
    "safewalk_10_credits": 0.99,
    "safewalk_50_credits": 4.99,
    "safewalk_100_credits": 9.99,
    "safewalk_500_credits": 39.99,
  };

  const subscriptionMap: Record<string, string> = {
    "safewalk_premium_monthly": "premium",
    "safewalk_premium_annual": "premium_annual",
  };

  // Vérifier si c'est un achat de crédits
  if (creditMap[product_id]) {
    const credits = creditMap[product_id];
    const price = priceMap[product_id];

    // Insérer la transaction
    const { error: txError } = await supabase.from("transactions").insert({
      user_id: app_user_id,
      type: "credit_purchase",
      amount: price,
      credits_added: credits,
      status: "completed",
      revenue_cat_transaction_id: transaction_id,
    });

    if (txError) {
      console.error("Error inserting transaction:", txError);
      return new Response(JSON.stringify({ error: "Failed to insert transaction" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Mettre à jour les crédits
    const { error: creditError } = await supabase.from("user_credits")
      .update({
        balance: supabase.raw("balance + ?", [credits]),
        total_earned: supabase.raw("total_earned + ?", [credits]),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", app_user_id);

    if (creditError) {
      console.error("Error updating credits:", creditError);
      return new Response(JSON.stringify({ error: "Failed to update credits" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, credits_added: credits }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Vérifier si c'est une subscription
  if (subscriptionMap[product_id]) {
    const plan = subscriptionMap[product_id];
    const duration = plan === "premium_annual" ? "1 year" : "1 month";

    // Insérer/mettre à jour la subscription
    const { error: subError } = await supabase.from("subscriptions")
      .upsert({
        user_id: app_user_id,
        plan_id: plan,
        status: "active",
        started_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + (plan === "premium_annual" ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
        revenue_cat_subscription_id: transaction_id,
      }, { onConflict: "user_id" });

    if (subError) {
      console.error("Error updating subscription:", subError);
      return new Response(JSON.stringify({ error: "Failed to update subscription" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Insérer la transaction
    const price = plan === "premium_annual" ? 39.99 : 4.99;
    const { error: txError } = await supabase.from("transactions").insert({
      user_id: app_user_id,
      type: "subscription",
      amount: price,
      plan_id: plan,
      status: "completed",
      revenue_cat_transaction_id: transaction_id,
    });

    if (txError) {
      console.error("Error inserting transaction:", txError);
    }

    return new Response(JSON.stringify({ success: true, plan }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Unknown product" }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(handlePurchase);
```

---

## 4. Intégration RevenueCat dans l'App

### Installation

```bash
npm install react-native-purchases
```

### Service: subscription.ts

```typescript
// lib/services/subscription.ts

import Purchases, {
  CustomerInfo,
  PurchasesPackage,
} from "react-native-purchases";

class SubscriptionService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialiser RevenueCat
    await Purchases.configure({
      apiKey: "appl_YOUR_REVENUECAT_API_KEY",
    });

    this.initialized = true;
  }

  async getOfferings(): Promise<PurchasesPackage[]> {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current?.availablePackages || [];
    } catch (error) {
      console.error("Error fetching offerings:", error);
      return [];
    }
  }

  async purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      console.log("Purchase successful:", customerInfo);
      return true;
    } catch (error) {
      console.error("Purchase failed:", error);
      return false;
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error) {
      console.error("Error fetching customer info:", error);
      return null;
    }
  }

  async restorePurchases(): Promise<boolean> {
    try {
      await Purchases.restorePurchases();
      return true;
    } catch (error) {
      console.error("Error restoring purchases:", error);
      return false;
    }
  }

  async getActiveSubscription(): Promise<string | null> {
    try {
      const customerInfo = await this.getCustomerInfo();
      if (!customerInfo) return null;

      // Vérifier les subscriptions actives
      const activeSubscriptions = Object.keys(
        customerInfo.activeSubscriptions || {}
      );

      return activeSubscriptions.length > 0 ? activeSubscriptions[0] : null;
    } catch (error) {
      console.error("Error getting active subscription:", error);
      return null;
    }
  }
}

export const subscriptionService = new SubscriptionService();
```

### Composant: Paywall

```typescript
// components/paywall.tsx

import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { PurchasesPackage } from "react-native-purchases";
import { subscriptionService } from "@/lib/services/subscription";
import { supabase } from "@/lib/supabase";

export function Paywall() {
  const [offerings, setOfferings] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [userCredits, setUserCredits] = useState(0);

  useEffect(() => {
    loadOfferings();
    loadUserCredits();
  }, []);

  const loadOfferings = async () => {
    await subscriptionService.initialize();
    const pkgs = await subscriptionService.getOfferings();
    setOfferings(pkgs);
    setLoading(false);
  };

  const loadUserCredits = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.rpc("get_user_credits", {
      p_user_id: user.id,
    });

    if (data && data.length > 0) {
      setUserCredits(data[0].balance);
    }
  };

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setPurchasing(true);
    const success = await subscriptionService.purchasePackage(pkg);
    setPurchasing(false);

    if (success) {
      await loadUserCredits();
      // Afficher un message de succès
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      {/* Header */}
      <View className="p-6 items-center">
        <Text className="text-3xl font-bold text-foreground mb-2">
          Débloquez SafeWalk Premium
        </Text>
        <Text className="text-base text-muted text-center">
          Alertes SMS illimitées + support prioritaire
        </Text>
      </View>

      {/* Crédits actuels */}
      <View className="px-6 py-4 bg-surface mx-6 rounded-lg mb-6">
        <Text className="text-sm text-muted mb-1">Crédits actuels</Text>
        <Text className="text-3xl font-bold text-primary">{userCredits}</Text>
      </View>

      {/* Plans */}
      <View className="px-6 gap-4 mb-6">
        {offerings.map((pkg) => (
          <TouchableOpacity
            key={pkg.identifier}
            onPress={() => handlePurchase(pkg)}
            disabled={purchasing}
            className="bg-surface p-4 rounded-lg border border-border"
          >
            <Text className="text-lg font-semibold text-foreground">
              {pkg.product.title}
            </Text>
            <Text className="text-sm text-muted mt-1">
              {pkg.product.description}
            </Text>
            <Text className="text-2xl font-bold text-primary mt-3">
              {pkg.product.priceString}
            </Text>
            {purchasing && (
              <ActivityIndicator size="small" className="mt-2" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Restore purchases */}
      <TouchableOpacity
        onPress={() => subscriptionService.restorePurchases()}
        className="px-6 py-3 mx-6 border border-primary rounded-lg"
      >
        <Text className="text-center text-primary font-semibold">
          Restaurer les achats
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
```

---

## 5. Intégration avec start-trip

```typescript
// supabase/functions/start-trip/index.ts (modifié)

async function startTrip(req: Request) {
  // ... code existant ...

  // Vérifier la quota
  const { data: quotaStatus } = await supabase.rpc("get_quota_status", {
    p_user_id: user.id,
  });

  if (quotaStatus[0].quota_reached) {
    return new Response(
      JSON.stringify({
        error: "no_credits",
        message: "Vous n'avez plus de crédits. Achetez des crédits ou abonnez-vous.",
      }),
      { status: 402, headers: { "Content-Type": "application/json" } }
    );
  }

  // ... créer la sortie ...
}
```

---

## 6. Modèle Économique

### Coûts

| Item | Coût/mois |
| --- | --- |
| Twilio SMS | $0.0075/SMS |
| RevenueCat | 1% des revenus |
| Supabase | Inclus |
| **Total** | Variable |

### Revenus (Exemple)

| Métrique | Valeur | Revenu |
| --- | --- | --- |
| Utilisateurs | 1,000 | - |
| Conversion (Premium) | 5% | 50 users |
| ARPU Premium | $4.99/mois | $250 |
| Conversion (Credits) | 2% | 20 users |
| Avg credits/user | $5 | $100 |
| **Total/mois** | - | **$350** |

### Profitabilité

```
Revenu: $350
Coûts Twilio: -$50 (6,700 SMS)
Coûts RevenueCat: -$3.50 (1%)
Coûts Supabase: -$50 (usage)
Profit: $246.50 (70%)
```

---

## 7. Implémentation Étape par Étape

### Phase 1: Tables et RPC (3 jours)

- [ ] Créer table `subscriptions`

- [ ] Créer table `user_credits`

- [ ] Créer table `transactions`

- [ ] Créer table `credit_usage`

- [ ] Créer RPC `get_user_subscription()`

- [ ] Créer RPC `get_user_credits()`

- [ ] Créer RPC `consume_credit()`

- [ ] Créer RPC `get_quota_status()`

### Phase 2: RevenueCat (2 jours)

- [ ] Créer compte RevenueCat

- [ ] Configurer les products (subscriptions + credits)

- [ ] Configurer les webhooks

- [ ] Tester les achats en sandbox

### Phase 3: Edge Function (1 jour)

- [ ] Créer `handle-purchase` Edge Function

- [ ] Tester les webhooks

### Phase 4: App Integration (3 jours)

- [ ] Installer `react-native-purchases`

- [ ] Créer `subscription.ts` service

- [ ] Créer composant `Paywall`

- [ ] Intégrer avec `start-trip`

- [ ] Tester end-to-end

### Phase 5: Dashboard (2 jours)

- [ ] Afficher les crédits actuels

- [ ] Afficher l'historique des transactions

- [ ] Afficher le statut de la subscription

---

## 8. Checklist de Déploiement

- [x] Créer les tables de subscription

- [ ] Créer les RPC de subscription

- [ ] Créer compte RevenueCat

- [ ] Configurer les products

- [ ] Déployer `handle-purchase` Edge Function

- [ ] Configurer les webhooks RevenueCat

- [ ] Intégrer RevenueCat dans l'app

- [ ] Créer le composant Paywall

- [ ] Tester les achats en sandbox

- [ ] Tester les achats en production

- [ ] Former l'équipe

