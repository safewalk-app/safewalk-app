import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useApp } from '@/lib/context/app-context';
import { useProfileData } from '@/hooks/use-profile-data';
import { MaterialIcons } from '@expo/vector-icons';
import {
  CREDIT_PACKAGES,
  createPaymentSession,
  confirmPayment,
} from '@/lib/services/stripe.service';
import { notifyPaymentSuccess, notifyPaymentError } from '@/lib/services/push-notifications.service';
import { pendingActionStore } from '@/lib/core/pending-action-store';

/**
 * Écran du Paywall - Acheter des alertes
 * 
 * Note: L'intégration Stripe complète nécessite:
 * 1. npm install @stripe/stripe-react-native
 * 2. Configuration des clés Stripe dans .env
 * 3. Edge Functions Supabase pour gérer les paiements
 */
export default function PaywallScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user } = useApp();
  const profileData = useProfileData();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Gérer le paiement
  const handleBuyCredits = async (packageId: string) => {
    if (!user?.id) {
      Alert.alert('Erreur', 'Utilisateur non authentifié');
      return;
    }

    try {
      setLoading(true);
      setSelectedPackage(packageId);

      // Créer la session de paiement
      const sessionData = await createPaymentSession(packageId, user.id);

      // TODO: Intégrer Stripe Payment Sheet ici
      // Pour l'instant, afficher un message de test
      Alert.alert(
        'Paiement en Test',
        `Package: ${packageId}\nClientSecret: ${sessionData.clientSecret.substring(0, 20)}...`,
        [
          {
            text: 'Annuler',
            onPress: () => setLoading(false),
            style: 'cancel',
          },
          {
            text: 'Simuler Succès',
            onPress: async () => {
              try {
                // Simuler le succès du paiement
                const result = await confirmPayment(packageId, user.id);
                await notifyPaymentSuccess(result.creditsAdded, result.totalCredits);

                Alert.alert('✅ Succès', `${result.creditsAdded} alertes ajoutées!`, [
                  {
                    text: 'OK',
                    onPress: () => {
                      setLoading(false);
                      if (pendingActionStore.hasPendingAction()) {
                        router.back();
                      } else {
                        router.push('/(tabs)');
                      }
                    },
                  },
                ]);
              } catch (error: any) {
                setLoading(false);
                Alert.alert('Erreur', error.message);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Payment failed:', error);
      await notifyPaymentError(error.message || 'Erreur de paiement');
      Alert.alert('Erreur', error.message || 'Le paiement a échoué');
      setLoading(false);
    }
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        className="px-4 py-6"
      >
        {/* Header */}
        <View className="mb-8">
          <Pressable onPress={() => router.back()} className="mb-4">
            <MaterialIcons name="arrow-back" size={24} color={colors.foreground} />
          </Pressable>
          <Text className="text-3xl font-bold text-foreground mb-2">Acheter des Alertes</Text>
          <Text className="text-base text-muted">
            Plus d'alertes = Plus de sécurité. Choisissez votre package.
          </Text>
        </View>

        {/* Crédits actuels */}
        <View className="mb-6 p-4 rounded-lg" style={{ backgroundColor: `${colors.primary}15` }}>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm text-muted mb-1">Alertes disponibles</Text>
              <Text className="text-2xl font-bold text-foreground">
                {profileData?.free_alerts_remaining ?? 0}
              </Text>
            </View>
            <MaterialIcons name="info" size={32} color={colors.primary} />
          </View>
        </View>

        {/* Packages */}
        <View className="gap-3 mb-8">
          {CREDIT_PACKAGES.map((package_) => (
            <Pressable
              key={package_.id}
              onPress={() => handleBuyCredits(package_.id)}
              disabled={loading}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              className="p-4 rounded-lg border"
              style={{
                backgroundColor:
                  selectedPackage === package_.id ? `${colors.primary}10` : colors.surface,
                borderColor:
                  selectedPackage === package_.id ? colors.primary : colors.border,
                borderWidth: selectedPackage === package_.id ? 2 : 1,
              }}
            >
              <View className="flex-row items-start justify-between mb-2">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-foreground">{package_.name}</Text>
                  {package_.badge && (
                    <Text className="text-xs font-semibold text-primary mt-1">
                      ⭐ {package_.badge}
                    </Text>
                  )}
                </View>
                <Text className="text-2xl font-bold text-primary">{package_.priceDisplay}</Text>
              </View>
              <Text className="text-sm text-muted">{package_.description}</Text>

              {loading && selectedPackage === package_.id && (
                <View className="mt-3 flex-row items-center gap-2">
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text className="text-sm text-primary">Traitement...</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Conditions d'utilisation */}
        <View className="p-4 rounded-lg" style={{ backgroundColor: colors.surface }}>
          <Text className="text-xs text-muted leading-relaxed">
            💳 Paiement sécurisé via Stripe. Aucune donnée bancaire n'est stockée sur nos serveurs.
            {'\n\n'}
            📋 En cliquant sur "Acheter", vous acceptez nos conditions d'utilisation et notre
            politique de confidentialité.
          </Text>
        </View>

        {/* Bouton d'annulation */}
        <Pressable
          onPress={() => router.back()}
          disabled={loading}
          className="mt-6 py-3 rounded-lg border"
          style={{ borderColor: colors.border }}
        >
          <Text className="text-center font-semibold text-foreground">Annuler</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
