import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { GlassCard } from './glass-card';
import { MaterialIcons } from '@expo/vector-icons';

export interface StatusCardProps {
  status: 'active' | 'inactive';
  title: string;
  subtitle: string;
  onPress?: () => void;
}

/**
 * StatusCard - Affiche le statut de sécurité (✅ actif ou ⚠️ inactif)
 * Avec chevron pour indiquer l'interaction
 */
export function StatusCard({
  status,
  title,
  subtitle,
  onPress,
}: StatusCardProps) {
  const isActive = status === 'active';
  const statusColor = isActive ? '#2DE2A6' : '#F59E0B';
  const statusIcon = isActive ? '✓' : '⚠';

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      {({ pressed }) => (
        <GlassCard
          className="flex-row items-center justify-between gap-3"
          style={{
            opacity: pressed ? 0.8 : 1,
          }}
        >
          {/* Status indicator */}
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{
              backgroundColor: statusColor,
            }}
          >
            <Text className="text-white font-bold text-lg">
              {statusIcon}
            </Text>
          </View>

          {/* Text content */}
          <View className="flex-1 gap-1">
            <Text className="text-base font-semibold text-foreground">
              {title}
            </Text>
            <Text className="text-sm text-muted">
              {subtitle}
            </Text>
          </View>

          {/* Chevron */}
          {onPress && (
            <MaterialIcons
              name="chevron-right"
              size={24}
              color="#6B7280"
            />
          )}
        </GlassCard>
      )}
    </Pressable>
  );
}
