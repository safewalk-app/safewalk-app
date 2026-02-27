import React, { useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FloatingBottomNavCapsule, type NavItem } from './ui/floating-bottom-nav-capsule';
import IndexScreen from '@/app/index';
import SettingsScreen from '@/app/settings';
import NewSessionScreen from '@/app/new-session';
import ActiveSessionScreen from '@/app/active-session';
import AlertSentScreen from '@/app/alert-sent';
import HistoryScreen from '@/app/history';

const Stack = createNativeStackNavigator();

export type RootStackParamList = {
  index: undefined;
  settings: undefined;
  'new-session': undefined;
  'active-session': undefined;
  'alert-sent': undefined;
  history: undefined;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Accueil', icon: 'home', route: 'index' },
  { label: 'Paramètres', icon: 'settings', route: 'settings' },
];

export function AppShellNested() {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const insets = useSafeAreaInsets();
  const [activeRoute, setActiveRoute] = useState<string>('index');

  const handleNavigation = (route: string) => {
    setActiveRoute(route);
    navigationRef.current?.navigate(route as keyof RootStackParamList);
  };

  return (
    <View style={styles.container}>
      <NavigationContainer
        ref={navigationRef}
        onStateChange={(state) => {
          if (state?.routes[state.index]) {
            setActiveRoute(state.routes[state.index].name);
          }
        }}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
          initialRouteName="index"
        >
          <Stack.Screen name="index" component={IndexScreen} options={{ title: 'Home' }} />
          <Stack.Screen
            name="settings"
            component={SettingsScreen}
            options={{ title: 'Settings' }}
          />
          <Stack.Screen
            name="new-session"
            component={NewSessionScreen}
            options={{ title: 'New Session' }}
          />
          <Stack.Screen
            name="active-session"
            component={ActiveSessionScreen}
            options={{ title: 'Active Session' }}
          />
          <Stack.Screen
            name="alert-sent"
            component={AlertSentScreen}
            options={{ title: 'Alert Sent' }}
          />
          <Stack.Screen name="history" component={HistoryScreen} options={{ title: 'History' }} />
        </Stack.Navigator>
      </NavigationContainer>

      {/* FloatingBottomNavCapsule Overlay */}
      <View
        style={[
          styles.navContainer,
          {
            bottom: insets.bottom + 12,
          },
        ]}
      >
        <FloatingBottomNavCapsule
          items={NAV_ITEMS}
          activeRoute={activeRoute}
          onPress={handleNavigation}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  navContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 100,
  },
});
