/**
 * Loading Indicator Integration Example
 * 
 * Cet exemple montre comment intégrer les indicateurs de chargement
 * dans les écrans avec lazy loading
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Button } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { LoadingBar } from '@/components/ui/loading-indicator';
import { useLoadingWrapper } from '@/hooks';
import { getTripService } from '@/lib/services';

/**
 * Exemple 1: Utiliser useLoadingWrapper avec getTripService
 */
export function Example1_NewSessionScreen() {
  const [tripStarted, setTripStarted] = useState(false);

  // Créer le wrapper avec indicateur de chargement
  const withLoading = useLoadingWrapper({
    name: 'Trip Service',
    type: 'service',
    minDuration: 300,
  });

  const handleStartSession = async () => {
    try {
      // L'indicateur s'affichera automatiquement pendant le chargement
      const tripService = await withLoading(() => getTripService());

      // Utiliser le service
      console.log('Trip service loaded:', tripService);
      setTripStarted(true);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  return (
    <ScreenContainer>
      <LoadingBar />

      <ScrollView>
        <View style={{ gap: 16, padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            Nouvelle Sortie
          </Text>

          <Button
            title="Commencer la sortie"
            onPress={handleStartSession}
            disabled={tripStarted}
          />

          {tripStarted && (
            <Text style={{ color: 'green' }}>
              ✓ Sortie commencée
            </Text>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

/**
 * Exemple 2: Utiliser useLoadingIndicator avec contrôle manuel
 */
export function Example2_ManualLoadingControl() {
  const [data, setData] = useState(null);
  const { useLoadingIndicator } = require('@/hooks');

  const { start, finish } = useLoadingIndicator({
    name: 'Custom Data',
    type: 'service',
    minDuration: 500,
  });

  const handleLoadData = async () => {
    start();
    try {
      // Simuler un appel API
      await new Promise(resolve => setTimeout(resolve, 2000));
      setData({ id: 1, name: 'Example Data' });
    } finally {
      finish();
    }
  };

  return (
    <ScreenContainer>
      <LoadingBar />

      <ScrollView>
        <View style={{ gap: 16, padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            Chargement Manuel
          </Text>

          <Button
            title="Charger les données"
            onPress={handleLoadData}
          />

          {data && (
            <Text>
              Données: {JSON.stringify(data)}
            </Text>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

/**
 * Exemple 3: Charger plusieurs services avec indicateurs
 */
export function Example3_MultipleServices() {
  const [status, setStatus] = useState('idle');

  const withTripLoading = useLoadingWrapper({
    name: 'Trip Service',
    type: 'service',
  });

  const withOtpLoading = useLoadingWrapper({
    name: 'OTP Service',
    type: 'service',
  });

  const handleLoadMultiple = async () => {
    setStatus('loading');
    try {
      // Les deux indicateurs s'affichent simultanément
      const [tripService, otpService] = await Promise.all([
        withTripLoading(() => getTripService()),
        withOtpLoading(async () => {
          const module = await import('@/lib/services');
          return module.getOtpService();
        }),
      ]);

      console.log('Services loaded:', { tripService, otpService });
      setStatus('success');
    } catch (error) {
      console.error('Failed to load services:', error);
      setStatus('error');
    }
  };

  return (
    <ScreenContainer>
      <LoadingBar />

      <ScrollView>
        <View style={{ gap: 16, padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            Charger Plusieurs Services
          </Text>

          <Button
            title="Charger Trip + OTP"
            onPress={handleLoadMultiple}
            disabled={status === 'loading'}
          />

          <Text>
            Status: {status}
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

/**
 * Exemple 4: Afficher les détails de chargement
 */
export function Example4_DetailedLoading() {
  const { LoadingIndicator } = require('@/components/ui/loading-indicator');

  const withLoading = useLoadingWrapper({
    name: 'Complex Operation',
    type: 'service',
  });

  const handleComplexOperation = async () => {
    await withLoading(async () => {
      // Simuler une opération complexe
      await new Promise(resolve => setTimeout(resolve, 3000));
    });
  };

  return (
    <ScreenContainer>
      {/* Afficher avec détails */}
      <LoadingIndicator position="top" showDetails={true} />

      <ScrollView>
        <View style={{ gap: 16, padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            Chargement Détaillé
          </Text>

          <Button
            title="Opération Complexe"
            onPress={handleComplexOperation}
          />

          <Text style={{ fontSize: 12, color: '#666' }}>
            Les détails de chargement s'affichent en haut
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

/**
 * Exemple 5: Intégration dans app/_layout.tsx
 */
export function Example5_LayoutIntegration() {
  return `
// app/_layout.tsx
import { LoadingProvider } from '@/lib/context/loading-context';
import { LoadingBar } from '@/components/ui/loading-indicator';

export default function RootLayout() {
  return (
    <LoadingProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AppProvider>
              <Suspense fallback={<ScreenLoadingFallback />}>
                <Stack>
                  {/* Routes */}
                </Stack>
              </Suspense>
            </AppProvider>
          </ToastProvider>
        </QueryClientProvider>
        {/* Afficher la barre de progression globalement */}
        <LoadingBar />
      </GestureHandlerRootView>
    </LoadingProvider>
  );
}
  `;
}

/**
 * Exemple 6: Utiliser avec des hooks lazy loading
 */
export function Example6_LazyHooks() {
  const { useLoadingWrapper } = require('@/hooks');
  const { getUseDeadlineTimer } = require('@/hooks');

  const withLoading = useLoadingWrapper({
    name: 'Deadline Timer Hook',
    type: 'hook',
  });

  const [useDeadlineTimer, setUseDeadlineTimer] = useState(null);

  useEffect(() => {
    withLoading(() => getUseDeadlineTimer())
      .then(module => setUseDeadlineTimer(() => module.useDeadlineTimer))
      .catch(error => console.error('Failed to load hook:', error));
  }, []);

  if (!useDeadlineTimer) {
    return (
      <ScreenContainer>
        <LoadingBar />
        <Text>Chargement du hook...</Text>
      </ScreenContainer>
    );
  }

  // Utiliser le hook
  return (
    <ScreenContainer>
      <LoadingBar />
      <Text>Hook chargé avec succès</Text>
    </ScreenContainer>
  );
}

export default Example1_NewSessionScreen;
