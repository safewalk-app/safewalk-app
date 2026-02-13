import { logger } from "@/lib/utils/logger";
import React, { useState } from 'react';
import { View, Text, Pressable, Modal, Alert } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { cn } from '@/lib/utils';
import * as Haptics from 'expo-haptics';

export interface SOSButtonProps {
  onPress: () => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Composant SOSButton - Bouton rouge d'alerte d'urgence
 * Affiche une confirmation avant d'envoyer l'alerte SOS
 */
export function SOSButton({ onPress, isLoading = false, disabled = false, className }: SOSButtonProps) {
  const colors = useColors();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSOSPress = async () => {
    logger.debug('🚨 [SOSButton] Bouton SOS cliqué');
    
    // Haptic feedback intense
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      logger.debug('✅ [SOSButton] Haptic feedback OK');
    } catch (err) {
      logger.debug('⚠️ [SOSButton] Haptic feedback échoué:', err);
    }

    // Afficher la confirmation
    logger.debug('📱 [SOSButton] Affichage modale de confirmation');
    setShowConfirmation(true);
  };

  const handleConfirmSOS = async () => {
    setShowConfirmation(false);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (err) {
      // Fallback
    }
    await onPress();
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      // Fallback
    }
  };

  return (
    <>
      {/* Bouton SOS Principal */}
      <Pressable
        onPress={handleSOSPress}
        disabled={disabled || isLoading}
        className={cn(
          'flex-row items-center justify-center gap-3 px-8 py-5 rounded-full active:opacity-85',
          'bg-red-500 shadow-2xl',
          (disabled || isLoading) && 'opacity-50',
          className
        )}
        style={{
          shadowColor: '#FF0000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 12,
        }}
      >
        <Text className="text-white text-3xl font-bold">🚨</Text>
        <Text className="text-white font-bold text-xl" style={{
          textShadowColor: 'rgba(0, 0, 0, 0.3)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 2,
        }}>
          {isLoading ? 'Envoi...' : 'SOS URGENCE'}
        </Text>
      </Pressable>

      {/* Modal de Confirmation */}
      <Modal
        visible={showConfirmation}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View className="flex-1 bg-black/50 items-center justify-center p-4">
          <View
            className="w-full max-w-sm rounded-3xl p-6 gap-6"
            style={{ backgroundColor: colors.surface }}
          >
            {/* Titre */}
            <View className="items-center gap-3">
              <Text className="text-5xl">🚨</Text>
              <Text className="text-2xl font-bold text-foreground text-center">
                Alerte SOS
              </Text>
              <Text className="text-sm text-muted text-center">
                Êtes-vous sûr ? Un SMS d'urgence sera envoyé à vos contacts immédiatement.
              </Text>
            </View>

            {/* Détails */}
            <View className="gap-2 p-4 rounded-xl" style={{ backgroundColor: colors.background }}>
              <Text className="text-xs text-muted font-semibold">ACTIONS :</Text>
              <Text className="text-sm text-foreground">✅ SMS envoyé aux contacts d'urgence</Text>
              <Text className="text-sm text-foreground">✅ Notification push immédiate</Text>
              <Text className="text-sm text-foreground">✅ Position GPS partagée</Text>
            </View>

            {/* Boutons */}
            <View className="gap-3 flex-row">
              {/* Annuler */}
              <Pressable
                onPress={handleCancel}
                disabled={isLoading}
                className="flex-1 items-center justify-center py-3 rounded-xl border-2 active:opacity-80"
                style={{ borderColor: colors.border }}
              >
                <Text className="text-foreground font-semibold">Annuler</Text>
              </Pressable>

              {/* Confirmer SOS */}
              <Pressable
                onPress={handleConfirmSOS}
                disabled={isLoading}
                className="flex-1 items-center justify-center py-3 rounded-xl bg-red-500 active:opacity-80"
              >
                <Text className="text-white font-bold">
                  {isLoading ? '⏳' : '🚨'} Confirmer
                </Text>
              </Pressable>
            </View>

            {/* Info */}
            <Text className="text-xs text-muted text-center">
              💡 Utilisez ce bouton uniquement en cas d'urgence réelle
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}
