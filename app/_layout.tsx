import "@/global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState, Suspense } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Platform } from "react-native";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import {
  SafeAreaFrameContext,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import type { EdgeInsets, Metrics, Rect } from "react-native-safe-area-context";

import { initManusRuntime, subscribeSafeAreaInsets } from "@/lib/_core/manus-runtime";
import { AppProvider } from "@/lib/context/app-context";
import { ToastProvider } from "@/lib/context/toast-context";
import { LoadingProvider } from "@/lib/context/loading-context";
import { PermissionsCheck } from "@/components/permissions-check";
import { ToastContainer } from "@/components/ui/toast";
import { LoadingBar } from "@/components/ui/loading-indicator";
import { useToast } from "@/lib/context/toast-context";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { initializeCertificatePinning, certificatePinningService } from "@/lib/services/certificate-pinning.service";
import { initializeBiometricAuth } from "@/lib/services/biometric-auth.service";
import { initializeDeviceBinding } from "@/lib/services/device-binding.service";
import { initializeTokenRotation, tokenRotationService } from "@/lib/services/token-rotation.service";
import { logger } from "@/lib/logger";

const DEFAULT_WEB_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
const DEFAULT_WEB_FRAME: Rect = { x: 0, y: 0, width: 0, height: 0 };

export const unstable_settings = {
  initialRouteName: "index",
};

function ToastContainerWrapper() {
  const { toasts, removeToast } = useToast();
  return <ToastContainer toasts={toasts} onDismiss={removeToast} />;
}

function PushNotificationsSetup() {
  usePushNotifications({
    onNotificationReceived: (notification) => {
      console.log('📬 Notification reçue:', notification);
    },
    onNotificationResponse: (response) => {
      console.log('👆 Notification tap:', response);
    },
  });
  return null;
}

function SecurityServicesSetup() {
  useEffect(() => {
    const initializeSecurityServices = async () => {
      try {
        logger.info('🔐 Initializing security services...');
        initializeCertificatePinning();
        logger.info('✅ Certificate Pinning initialized');
        await initializeBiometricAuth();
        logger.info('✅ Biometric Authentication initialized');
        await initializeDeviceBinding();
        logger.info('✅ Device Binding initialized');
        await initializeTokenRotation();
        logger.info('✅ Token Rotation initialized');
        logger.info('🔐 All security services initialized');
      } catch (error) {
        logger.error('❌ Error initializing security services:', error);
      }
    };
    initializeSecurityServices();
    return () => {
      tokenRotationService.cleanup();
    };
  }, []);
  return null;
}

/**
 * Fallback component shown while screens are loading
 * Used by Suspense boundary for lazy-loaded screens
 */
function ScreenLoadingFallback() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
      <ActivityIndicator size="large" color="#0a7ea4" />
    </View>
  );
}

export default function RootLayout() {
  const initialInsets = initialWindowMetrics?.insets ?? DEFAULT_WEB_INSETS;
  const initialFrame = initialWindowMetrics?.frame ?? DEFAULT_WEB_FRAME;

  const [insets, setInsets] = useState<EdgeInsets>(initialInsets);
  const [frame, setFrame] = useState<Rect>(initialFrame);

  // Initialize Manus runtime for cookie injection from parent container
  useEffect(() => {
    initManusRuntime();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handleSafeAreaUpdate = (metrics: Metrics) => {
      setInsets(metrics.insets);
      setFrame(metrics.frame);
    };
    const unsubscribe = subscribeSafeAreaInsets(handleSafeAreaUpdate);
    return () => unsubscribe();
  }, []);

  // Create clients once and reuse them
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  // Ensure minimum 8px padding for top and bottom on mobile
  const providerInitialMetrics = useMemo(() => {
    const metrics = initialWindowMetrics ?? { insets: initialInsets, frame: initialFrame };
    return {
      ...metrics,
      insets: {
        ...metrics.insets,
        top: Math.max(metrics.insets.top, 16),
        bottom: Math.max(metrics.insets.bottom, 12),
      },
    };
  }, [initialInsets, initialFrame]);

  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LoadingProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AppProvider>
              <PermissionsCheck />
              <ToastContainerWrapper />
              <PushNotificationsSetup />
              <SecurityServicesSetup />
              {/* Suspense boundary for lazy-loaded screens */}
              <Suspense fallback={<ScreenLoadingFallback />}>
                {/* Stack with all routes - flow screens without nav */}
                {/* Expo Router Stack uses default slide animation from right */}
                <Stack
                  screenOptions={{
                    headerShown: false,
                    // Slide animation from right (default for Expo Router)
                    animation: 'slide_from_right',
                  }}
                  initialRouteName="index"
                >
                  {/* Onboarding */}
                  <Stack.Screen name="onboarding" />
                  
                  {/* Main screens with nav */}
                  <Stack.Screen name="index" />
                  <Stack.Screen name="settings" />
                  
                  {/* Flow screens without nav */}
                  <Stack.Screen name="new-session" />
                  <Stack.Screen name="active-session" />
                  <Stack.Screen name="alert-sent" />
                  <Stack.Screen name="history" />
                  
                  <Stack.Screen name="oauth/callback" />
                </Stack>
                <StatusBar style="auto" />
              </Suspense>
            </AppProvider>
          </ToastProvider>
        </QueryClientProvider>
        {/* Global loading indicator - visible across all screens */}
        <LoadingBar />
      </LoadingProvider>
    </GestureHandlerRootView>
  );

  const shouldOverrideSafeArea = Platform.OS === "web";

  if (shouldOverrideSafeArea) {
    return (
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={providerInitialMetrics}>
          <SafeAreaFrameContext.Provider value={frame}>
            <SafeAreaInsetsContext.Provider value={insets}>
              {content}
            </SafeAreaInsetsContext.Provider>
          </SafeAreaFrameContext.Provider>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={providerInitialMetrics}>{content}</SafeAreaProvider>
    </ThemeProvider>
  );
}
