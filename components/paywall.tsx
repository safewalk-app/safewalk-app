/**
 * Composant Paywall - Affiche les options d'abonnement
 * 
 * Affiche :
 * - Quotas actuels (alertes, SMS)
 * - Options d'abonnement
 * - Bouton "Passer à Premium"
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { getQuotaStatus, QuotaStatus } from '@/lib/services/quota-service';
import { useAuth } from '@/hooks/use-auth';

export function PaywallSheet() {
  const colors = useColors();
  const { user } = useAuth();
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadQuota();
    }
  }, [user?.id]);

  const loadQuota = async () => {
    if (!user?.id) return;
    setLoading(true);
    const status = await getQuotaStatus(String(user.id));
    setQuota(status);
    setLoading(false);
  };

  if (loading || !quota) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <Text className="text-foreground">Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-6 gap-6">
        {/* Header */}
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">Quotas</Text>
          <Text className="text-base text-muted">
            {quota.subscriptionActive ? '✅ Premium actif' : '⚠️ Plan gratuit'}
          </Text>
        </View>

        {/* Quotas actuels */}
        <View className="gap-4">
          <Text className="text-lg font-semibold text-foreground">Vos quotas</Text>

          {/* Alertes */}
          <View className="bg-surface rounded-2xl p-4 gap-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="notifications-active" size={20} color={colors.primary} />
                <Text className="text-base font-semibold text-foreground">Alertes SOS</Text>
              </View>
              <Text className="text-lg font-bold text-primary">
                {quota.freeAlertsRemaining}/{3}
              </Text>
            </View>
            <Text className="text-sm text-muted">
              {quota.subscriptionActive
                ? 'Illimité avec Premium'
                : `${quota.freeAlertsRemaining} alertes gratuites restantes`}
            </Text>
            {quota.freeAlertsRemaining === 0 && !quota.subscriptionActive && (
              <View className="mt-2 p-2 bg-error/10 rounded-lg">
                <Text className="text-sm text-error">Quotas d'alertes épuisés</Text>
              </View>
            )}
          </View>

          {/* SMS de test */}
          <View className="bg-surface rounded-2xl p-4 gap-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="sms" size={20} color={colors.primary} />
                <Text className="text-base font-semibold text-foreground">SMS de test</Text>
              </View>
              <Text className="text-lg font-bold text-primary">
                {quota.freeTestSmsRemaining}/{1}
              </Text>
            </View>
            <Text className="text-sm text-muted">
              {quota.subscriptionActive
                ? 'SMS illimités avec Premium'
                : `${quota.freeTestSmsRemaining} SMS de test gratuit`}
            </Text>
          </View>

          {/* SMS quotidiens */}
          <View className="bg-surface rounded-2xl p-4 gap-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="schedule" size={20} color={colors.primary} />
                <Text className="text-base font-semibold text-foreground">SMS aujourd'hui</Text>
              </View>
              <Text className="text-lg font-bold text-primary">
                {quota.smsDailyRemaining}/{quota.subscriptionActive ? '∞' : 10}
              </Text>
            </View>
            <Text className="text-sm text-muted">
              {quota.subscriptionActive
                ? 'SMS illimités par jour'
                : `${quota.smsDailyRemaining} SMS restants aujourd'hui`}
            </Text>
          </View>
        </View>

        {/* Plans d'abonnement */}
        {!quota.subscriptionActive && (
          <View className="gap-4">
            <Text className="text-lg font-semibold text-foreground">Passer à Premium</Text>

            {/* Plan Premium */}
            <View className="bg-primary/10 border-2 border-primary rounded-2xl p-4 gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-primary">Premium</Text>
                <View className="bg-primary px-3 py-1 rounded-full">
                  <Text className="text-white text-sm font-semibold">Recommandé</Text>
                </View>
              </View>

              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="check-circle" size={18} color={colors.success} />
                  <Text className="text-sm text-foreground">Alertes SOS illimitées</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="check-circle" size={18} color={colors.success} />
                  <Text className="text-sm text-foreground">SMS illimités</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="check-circle" size={18} color={colors.success} />
                  <Text className="text-sm text-foreground">Priorité support</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="check-circle" size={18} color={colors.success} />
                  <Text className="text-sm text-foreground">Historique illimité</Text>
                </View>
              </View>

              <View className="mt-2 pt-3 border-t border-primary/20">
                <Text className="text-2xl font-bold text-primary">4,99€/mois</Text>
                <Text className="text-xs text-muted">ou 49,99€/an (économisez 17%)</Text>
              </View>

              <Pressable
                className="mt-4 bg-primary rounded-xl py-3 active:opacity-80"
                onPress={() => {
                  // TODO: Implémenter IAP ou redirection vers page de paiement
                  console.log('Passer à Premium');
                }}
              >
                <Text className="text-center text-white font-semibold">Passer à Premium</Text>
              </Pressable>
            </View>

            {/* Plan Gratuit */}
            <View className="bg-surface rounded-2xl p-4 gap-3">
              <Text className="text-lg font-bold text-foreground">Plan Gratuit</Text>

              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="check-circle" size={18} color={colors.muted} />
                  <Text className="text-sm text-muted">3 alertes SOS gratuites</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="check-circle" size={18} color={colors.muted} />
                  <Text className="text-sm text-muted">1 SMS de test gratuit</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="check-circle" size={18} color={colors.muted} />
                  <Text className="text-sm text-muted">10 SMS par jour</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <MaterialIcons name="cancel" size={18} color={colors.error} />
                  <Text className="text-sm text-error">Support limité</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Message Premium actif */}
        {quota.subscriptionActive && (
          <View className="bg-success/10 border border-success rounded-2xl p-4 gap-2">
            <View className="flex-row items-center gap-2">
              <MaterialIcons name="verified" size={24} color={colors.success} />
              <View className="flex-1">
                <Text className="text-lg font-bold text-success">Premium actif</Text>
                <Text className="text-sm text-muted">Merci de nous faire confiance !</Text>
              </View>
            </View>
          </View>
        )}

        {/* FAQ */}
        <View className="gap-4">
          <Text className="text-lg font-semibold text-foreground">Questions fréquentes</Text>

          <View className="gap-3">
            <View className="gap-1">
              <Text className="font-semibold text-foreground">Puis-je annuler mon abonnement ?</Text>
              <Text className="text-sm text-muted">
                Oui, vous pouvez annuler à tout moment sans frais supplémentaires.
              </Text>
            </View>

            <View className="gap-1">
              <Text className="font-semibold text-foreground">
                Que se passe-t-il si j'épuise mes quotas ?
              </Text>
              <Text className="text-sm text-muted">
                Vous ne pourrez pas envoyer d'alertes SOS ou de SMS jusqu'à la réinitialisation du quota.
              </Text>
            </View>

            <View className="gap-1">
              <Text className="font-semibold text-foreground">
                Les quotas se réinitialisent-ils ?
              </Text>
              <Text className="text-sm text-muted">
                Les alertes gratuites sont lifetime. Les SMS se réinitialisent chaque jour à minuit.
              </Text>
            </View>
          </View>
        </View>

        {/* Spacer */}
        <View className="h-12" />
      </View>
    </ScrollView>
  );
}
