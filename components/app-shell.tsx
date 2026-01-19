import React, { useMemo } from 'react';
import { View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { FloatingBottomNavCapsule } from './ui/floating-bottom-nav-capsule';

export interface AppShellProps {
  children: React.ReactNode;
}

/**
 * AppShell - Shell personnalisée avec FloatingBottomNavCapsule
 * Affiche la navigation capsule flottante sur tous les écrans
 */
export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Navigation items pour la capsule flottante
  const navItems = useMemo(
    () => [
      { label: 'Accueil', icon: 'home' as const, route: '/home' },
      { label: 'Paramètres', icon: 'settings' as const, route: '/settings' },
    ],
    []
  );

  const handleNavPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <View className="flex-1 relative">
      {/* Main content */}
      {children}

      {/* Floating Bottom Nav Capsule */}
      <FloatingBottomNavCapsule
        items={navItems}
        activeRoute={pathname}
        onPress={handleNavPress}
      />
    </View>
  );
}
