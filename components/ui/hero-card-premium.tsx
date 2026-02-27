import React from 'react';
import { View, Text } from 'react-native';
import { GlassCard } from './glass-card';
import { CushionPillButton } from './cushion-pill-button';

export interface HeroCardPremiumProps {
  title: string;
  description: string;
  buttonLabel: string;
  onButtonPress?: () => void;
  emoji?: string;
}

/**
 * HeroCardPremium - Card violette avec bubbles décoratives, emoji/rocket, gradient léger
 * Utilisé pour l'écran Home "Je sors"
 */
export function HeroCardPremium({
  title,
  description,
  buttonLabel,
  onButtonPress,
  emoji = '🚀',
}: HeroCardPremiumProps) {
  return (
    <View
      className="relative rounded-3xl overflow-hidden p-6 gap-4"
      style={{
        backgroundColor: '#6C63FF',
        backgroundImage: 'linear-gradient(135deg, #6C63FF 0%, #7B68EE 100%)',
        shadowColor: '#6C63FF',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 5,
      }}
    >
      {/* Bubbles décoratives */}
      <View
        className="absolute rounded-full opacity-10"
        style={{
          width: 120,
          height: 120,
          right: -40,
          top: -40,
          backgroundColor: '#FFFFFF',
        }}
      />
      <View
        className="absolute rounded-full opacity-10"
        style={{
          width: 80,
          height: 80,
          left: -30,
          bottom: -20,
          backgroundColor: '#FFFFFF',
        }}
      />

      {/* Contenu */}
      <View className="gap-2">
        {/* Emoji/Rocket */}
        <Text className="text-5xl">{emoji}</Text>

        {/* Title */}
        <Text className="text-3xl font-bold text-white">{title}</Text>

        {/* Description */}
        <Text className="text-base text-white opacity-90 leading-relaxed">{description}</Text>
      </View>

      {/* Button */}
      <View className="pt-2">
        <CushionPillButton
          label={buttonLabel}
          onPress={onButtonPress}
          variant="secondary"
          size="md"
        />
      </View>
    </View>
  );
}
