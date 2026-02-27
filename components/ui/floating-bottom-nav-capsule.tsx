import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { cn } from '@/lib/utils';
import * as Haptics from 'expo-haptics';

export interface NavItem {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  route: string;
}

export interface FloatingBottomNavCapsuleProps {
  items: NavItem[];
  activeRoute?: string;
  onPress?: (route: string) => void;
}

/**
 * FloatingBottomNavCapsule - Navigation capsule flottante (88-92% width, 64-72px height)
 * Affiche 2 tabs (Accueil / Paramètres) avec icônes et labels
 */
export function FloatingBottomNavCapsule({
  items,
  activeRoute,
  onPress,
}: FloatingBottomNavCapsuleProps) {
  const insets = useSafeAreaInsets();

  const handlePress = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(route);
  };

  return (
    <View
      className="absolute bottom-0 left-0 right-0 items-center"
      style={{
        paddingBottom: Math.max(insets.bottom, 12),
        paddingHorizontal: 16,
      }}
    >
      <View
        className="flex-row rounded-full bg-white overflow-hidden"
        style={{
          width: '88%',
          height: 68,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.11,
          shadowRadius: 35,
          elevation: 8,
        }}
      >
        {items.map((item, index) => {
          const isActive = activeRoute === item.route;
          const isFirst = index === 0;
          const isLast = index === items.length - 1;

          return (
            <Pressable
              key={item.route}
              onPress={() => handlePress(item.route)}
              className={cn(
                'flex-1 items-center justify-center gap-1',
                isFirst && 'border-r border-border',
              )}
              style={{
                backgroundColor: isActive ? 'rgba(108, 99, 255, 0.10)' : 'transparent',
              }}
            >
              {({ pressed }) => (
                <View
                  className="items-center justify-center gap-1"
                  style={{
                    opacity: pressed ? 0.7 : 1,
                  }}
                >
                  <MaterialIcons
                    name={item.icon}
                    size={24}
                    color={isActive ? '#6C63FF' : '#9CA3AF'}
                  />
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color: isActive ? '#6C63FF' : '#9CA3AF',
                    }}
                  >
                    {item.label}
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
