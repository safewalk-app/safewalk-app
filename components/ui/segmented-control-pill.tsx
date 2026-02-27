import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { cn } from '@/lib/utils';
import * as Haptics from 'expo-haptics';

export interface SegmentedControlPillProps {
  options: Array<{ label: string; value: string | number }>;
  value?: string | number;
  onValueChange?: (value: string | number) => void;
  label?: string;
}

/**
 * SegmentedControlPill - Sélecteur pour tolérance (10/15/30 min)
 * Style pill avec background translucide pour option active
 */
export function SegmentedControlPill({
  options,
  value,
  onValueChange,
  label,
}: SegmentedControlPillProps) {
  const handleSelect = (newValue: string | number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onValueChange?.(newValue);
  };

  return (
    <View className="gap-2">
      {label && <Text className="text-sm font-semibold text-foreground">{label}</Text>}

      <View
        className="flex-row gap-2 p-2 rounded-2xl"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
        }}
      >
        {options.map((option) => {
          const isSelected = value === option.value;

          return (
            <Pressable
              key={option.value}
              onPress={() => handleSelect(option.value)}
              className="flex-1"
            >
              {({ pressed }) => (
                <View
                  className={cn(
                    'py-2 px-3 rounded-xl items-center justify-center',
                    isSelected ? 'bg-primary' : 'bg-transparent',
                  )}
                  style={{
                    opacity: pressed ? 0.8 : 1,
                  }}
                >
                  <Text
                    className={cn(
                      'font-semibold text-sm',
                      isSelected ? 'text-white' : 'text-foreground',
                    )}
                  >
                    {option.label}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
