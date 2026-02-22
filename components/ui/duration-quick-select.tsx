import { View, Text, Pressable } from 'react-native';
import { useColors } from '@/hooks/use-colors';

export interface DurationOption {
  label: string;
  minutes: number;
}

interface DurationQuickSelectProps {
  options: DurationOption[];
  onSelect: (minutes: number) => void;
}

export function DurationQuickSelect({
  options,
  onSelect,
}: DurationQuickSelectProps) {
  const colors = useColors();

  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold text-muted uppercase tracking-wide">
        Durée rapide
      </Text>
      <View className="flex-row gap-2 flex-wrap">
        {options.map((option) => (
          <Pressable
            key={option.minutes}
            onPress={() => onSelect(option.minutes)}
          >
            {({ pressed }) => (
              <View
                className="px-4 py-2 rounded-full border"
                style={{
                  backgroundColor: pressed ? colors.primary : colors.surface,
                  borderColor: colors.primary,
                  opacity: pressed ? 0.9 : 1,
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{
                    color: pressed ? '#FFFFFF' : colors.primary,
                  }}
                >
                  {option.label}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
