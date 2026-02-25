import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { stripeService, StripeProduct } from "@/lib/services/stripe-service";
import { ScreenContainer } from "@/components/screen-container";
import { StripeCheckoutWebView } from "@/components/stripe-checkout-webview";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

interface PaywallProps {
  onClose?: () => void;
  initialTab?: "subscription" | "credits";
}

export function Paywall({ onClose, initialTab = "subscription" }: PaywallProps) {
  const colors = useColors();
  const [tab, setTab] = useState<"subscription" | "credits">(initialTab);
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [quotaStatus, setQuotaStatus] = useState<any>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await stripeService.initialize();
    const prods = await stripeService.getProducts();
    const quota = await stripeService.getQuotaStatus();
    setProducts(prods);
    setQuotaStatus(quota);
    setLoading(false);
  };

  const handlePurchase = async (product: StripeProduct) => {
    setPurchasing(product.id);
    try {
      const session = await stripeService.createCheckoutSession(product.id);
      if (session?.url) {
        setCheckoutUrl(session.url);
      } else {
        Alert.alert("Erreur", "Impossible de créer la session de paiement");
        setPurchasing(null);
      }
    } catch (error) {
      Alert.alert("Erreur", "Une erreur est survenue lors du paiement");
      console.error("Purchase error:", error);
      setPurchasing(null);
    }
  };

  const handleCheckoutSuccess = () => {
    Alert.alert("Succès", "Paiement confirmé! Merci de votre achat.");
    setCheckoutUrl(null);
    setPurchasing(null);
    loadData();
    onClose?.();
  };

  const handleCheckoutCancel = () => {
    setCheckoutUrl(null);
    setPurchasing(null);
  };

  const subscriptionProducts = products.filter((p) => p.type === "subscription");
  const creditProducts = products.filter((p) => p.type === "credits");

  // Show WebView if checkout URL is set
  if (checkoutUrl) {
    return (
      <StripeCheckoutWebView
        checkoutUrl={checkoutUrl}
        onSuccess={handleCheckoutSuccess}
        onCancel={handleCheckoutCancel}
        onError={(error) => {
          Alert.alert("Erreur de paiement", error);
          handleCheckoutCancel();
        }}
      />
    );
  }

  if (loading) {
    return (
      <ScreenContainer className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View className="px-6 py-8 items-center">
          <Text className="text-3xl font-bold text-foreground mb-2">
            Débloquez SafeWalk Premium
          </Text>
          <Text className="text-base text-muted text-center">
            Alertes SMS illimitées + support prioritaire
          </Text>
        </View>

        {/* Quota Status */}
        {quotaStatus && (
          <View className="px-6 mb-6">
            <View className="bg-surface p-4 rounded-lg border border-border">
              {quotaStatus.has_subscription ? (
                <>
                  <View className="flex-row items-center gap-2 mb-2">
                    <MaterialIcons name="verified" size={20} color={colors.success} />
                    <Text className="text-sm text-success font-semibold">Abonnement actif</Text>
                  </View>
                  <Text className="text-2xl font-bold text-primary mb-2">
                    {quotaStatus.subscription_plan?.toUpperCase()}
                  </Text>
                  {quotaStatus.subscription_ends_at && (
                    <Text className="text-xs text-muted">
                      Expire le {new Date(quotaStatus.subscription_ends_at).toLocaleDateString()}
                    </Text>
                  )}
                </>
              ) : (
                <>
                  <Text className="text-sm text-muted mb-3">Crédits disponibles</Text>
                  <View className="flex-row justify-between">
                    <View>
                      <Text className="text-3xl font-bold text-primary">
                        {quotaStatus.paid_credits_balance}
                      </Text>
                      <Text className="text-xs text-muted">crédits payants</Text>
                    </View>
                    <View>
                      <Text className="text-3xl font-bold text-primary">
                        {quotaStatus.free_alerts_remaining}
                      </Text>
                      <Text className="text-xs text-muted">gratuit ce mois</Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Tabs */}
        <View className="flex-row px-6 gap-2 mb-6">
          <TouchableOpacity
            onPress={() => setTab("subscription")}
            className={cn(
              "flex-1 py-3 px-4 rounded-lg border",
              tab === "subscription"
                ? "bg-primary border-primary"
                : "bg-surface border-border"
            )}
          >
            <Text
              className={cn(
                "text-center font-semibold",
                tab === "subscription" ? "text-background" : "text-foreground"
              )}
            >
              Abonnement
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTab("credits")}
            className={cn(
              "flex-1 py-3 px-4 rounded-lg border",
              tab === "credits"
                ? "bg-primary border-primary"
                : "bg-surface border-border"
            )}
          >
            <Text
              className={cn(
                "text-center font-semibold",
                tab === "credits" ? "text-background" : "text-foreground"
              )}
            >
              Crédits
            </Text>
          </TouchableOpacity>
        </View>

        {/* Subscription Plans */}
        {tab === "subscription" && (
          <View className="px-6 gap-4 mb-6">
            {subscriptionProducts.map((product) => (
              <TouchableOpacity
                key={product.id}
                onPress={() => handlePurchase(product)}
                disabled={purchasing === product.id}
                className="bg-surface p-4 rounded-lg border border-border active:opacity-80"
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-foreground">
                      {product.name}
                    </Text>
                    <Text className="text-sm text-muted mt-1">
                      {product.description}
                    </Text>
                  </View>
                  {product.metadata?.interval === "year" && (
                    <View className="bg-primary px-2 py-1 rounded">
                      <Text className="text-xs font-semibold text-background">
                        -20%
                      </Text>
                    </View>
                  )}
                </View>

                <View className="flex-row justify-between items-center mt-3">
                  <View>
                    <Text className="text-2xl font-bold text-primary">
                      ${product.price.toFixed(2)}
                    </Text>
                    <Text className="text-xs text-muted">
                      {product.metadata?.interval === "year" ? "/an" : "/mois"}
                    </Text>
                  </View>
                  {purchasing === product.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text className="text-sm text-muted font-semibold">
                      Payer
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Credit Packages */}
        {tab === "credits" && (
          <View className="px-6 gap-3 mb-6">
            {creditProducts.map((product) => (
              <TouchableOpacity
                key={product.id}
                onPress={() => handlePurchase(product)}
                disabled={purchasing === product.id}
                className="bg-surface p-3 rounded-lg border border-border flex-row justify-between items-center active:opacity-80"
              >
                <View className="flex-1">
                  <Text className="font-semibold text-foreground">
                    {product.name}
                  </Text>
                  <Text className="text-xs text-muted mt-1">
                    {product.description}
                  </Text>
                </View>

                <View className="items-end">
                  {purchasing === product.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text className="text-lg font-bold text-primary">
                      ${product.price.toFixed(2)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Info Section */}
        <View className="px-6 py-4 bg-surface mx-6 rounded-lg mb-6">
          <View className="flex-row items-start gap-2">
            <MaterialIcons name="info" size={16} color={colors.primary} />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground mb-1">
                Comment ça marche?
              </Text>
              <Text className="text-xs text-muted leading-relaxed">
                {tab === "subscription"
                  ? "Avec un abonnement, vous recevez des alertes SMS illimitées. Vous pouvez annuler à tout moment."
                  : "Achetez des crédits pour envoyer des alertes SMS. Chaque alerte coûte 1 crédit."}
              </Text>
            </View>
          </View>
        </View>

        {/* Close Button */}
        {onClose && (
          <TouchableOpacity
            onPress={onClose}
            className="px-6 py-3 mx-6 border border-border rounded-lg mb-6"
          >
            <Text className="text-center text-foreground font-semibold">
              Fermer
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
