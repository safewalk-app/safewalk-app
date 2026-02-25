import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";

interface StripeCheckoutWebViewProps {
  checkoutUrl: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  onError?: (error: string) => void;
}

export function StripeCheckoutWebView({
  checkoutUrl,
  onSuccess,
  onCancel,
  onError,
}: StripeCheckoutWebViewProps) {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleNavigationStateChange = (navState: any) => {
    console.log("[Stripe WebView] Navigation:", navState.url);

    // Check if payment was successful
    if (navState.url.includes("success=true")) {
      console.log("[Stripe WebView] Payment successful!");
      onSuccess?.();
    }

    // Check if user cancelled
    if (navState.url.includes("canceled=true")) {
      console.log("[Stripe WebView] Payment cancelled");
      onCancel?.();
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log("[Stripe WebView] Message:", data);

      if (data.type === "success") {
        onSuccess?.();
      } else if (data.type === "cancel") {
        onCancel?.();
      } else if (data.type === "error") {
        setError(data.message);
        onError?.(data.message);
      }
    } catch (err) {
      console.error("[Stripe WebView] Error parsing message:", err);
    }
  };

  if (error) {
    return (
      <View className="flex-1 bg-background justify-center items-center p-6">
        <View className="items-center gap-4">
          <MaterialIcons name="error-outline" size={48} color={colors.error} />
          <Text className="text-lg font-semibold text-foreground text-center">
            Erreur de paiement
          </Text>
          <Text className="text-sm text-muted text-center">{error}</Text>
          <TouchableOpacity
            onPress={onCancel}
            className="mt-4 bg-primary px-6 py-3 rounded-lg"
          >
            <Text className="text-background font-semibold">Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-surface border-b border-border">
        <Text className="text-lg font-semibold text-foreground">Paiement sécurisé</Text>
        <TouchableOpacity onPress={onCancel} className="p-2">
          <MaterialIcons name="close" size={24} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <View className="flex-1">
        {loading && (
          <View className="absolute inset-0 bg-background justify-center items-center z-10">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="mt-4 text-muted">Chargement du paiement...</Text>
          </View>
        )}

        <WebView
          source={{ uri: checkoutUrl }}
          onNavigationStateChange={handleNavigationStateChange}
          onMessage={handleMessage}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error("[Stripe WebView] Error:", nativeEvent);
            setError("Impossible de charger la page de paiement");
            onError?.(nativeEvent.description);
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          // Security settings
          mixedContentMode="always"
          userAgent="SafeWalk/1.0"
        />
      </View>

      {/* Security Badge */}
      <View className="px-4 py-3 bg-surface border-t border-border flex-row items-center justify-center gap-2">
        <MaterialIcons name="lock" size={16} color={colors.success} />
        <Text className="text-xs text-muted">
          Paiement sécurisé par Stripe
        </Text>
      </View>
    </View>
  );
}
