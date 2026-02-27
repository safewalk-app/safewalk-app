import { View, Text, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';

export interface ChecklistItem {
  id: string;
  label: string;
  status: 'ok' | 'pending' | 'disabled';
  onPress?: () => void;
}

interface StatusChecklistProps {
  items: ChecklistItem[];
}

export function StatusChecklist({ items }: StatusChecklistProps) {
  const colors = useColors();

  const getStatusColor = (status: 'ok' | 'pending' | 'disabled') => {
    switch (status) {
      case 'ok':
        return '#22C55E'; // green
      case 'pending':
        return '#F59E0B'; // amber
      case 'disabled':
        return '#9CA3AF'; // gray
    }
  };

  const getStatusIcon = (status: 'ok' | 'pending' | 'disabled') => {
    switch (status) {
      case 'ok':
        return 'check-circle';
      case 'pending':
        return 'info';
      case 'disabled':
        return 'cancel';
    }
  };

  return (
    <View className="gap-2">
      {items.map((item) => (
        <Pressable key={item.id} onPress={item.onPress} disabled={!item.onPress}>
          {({ pressed }) => (
            <View
              className="flex-row items-center gap-3 p-3 rounded-lg"
              style={{
                backgroundColor: colors.surface,
                opacity: pressed && item.onPress ? 0.7 : 1,
              }}
            >
              <MaterialIcons
                name={getStatusIcon(item.status)}
                size={20}
                color={getStatusColor(item.status)}
              />
              <Text className="flex-1 text-sm font-medium text-foreground" numberOfLines={1}>
                {item.label}
              </Text>
              {item.onPress && (
                <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
              )}
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}
