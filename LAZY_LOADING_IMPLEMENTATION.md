# ⚡ Lazy Loading Implementation - SafeWalk V10.0

**Objectif:** Réduire le bundle de 0.4 MB via lazy loading
**Effort:** 3h
**Impact:** -12.5% du bundle

---

## 📝 Changements à Appliquer

### 1. Lazy Load les Écrans dans `app/_layout.tsx`

```typescript
// ❌ AVANT
import Home from './home';
import NewSession from './new-session';
import ActiveSession from './active-session';
import Settings from './settings';
import PhoneVerification from './phone-verification';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="home" component={Home} />
      <Stack.Screen name="new-session" component={NewSession} />
      <Stack.Screen name="active-session" component={ActiveSession} />
      <Stack.Screen name="settings" component={Settings} />
      <Stack.Screen name="phone-verification" component={PhoneVerification} />
    </Stack>
  );
}

// ✅ APRÈS
import { lazy, Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';

const Home = lazy(() => import('./home'));
const NewSession = lazy(() => import('./new-session'));
const ActiveSession = lazy(() => import('./active-session'));
const Settings = lazy(() => import('./settings'));
const PhoneVerification = lazy(() => import('./phone-verification'));

const LoadingFallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#0a7ea4" />
  </View>
);

export default function RootLayout() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Stack>
        <Stack.Screen name="home" component={Home} />
        <Stack.Screen name="new-session" component={NewSession} />
        <Stack.Screen name="active-session" component={ActiveSession} />
        <Stack.Screen name="settings" component={Settings} />
        <Stack.Screen name="phone-verification" component={PhoneVerification} />
      </Stack>
    </Suspense>
  );
}
```

### 2. Lazy Load les Composants Lourds dans `components/index.ts`

```typescript
// ❌ AVANT
export { default as BatteryWarning } from './battery-warning';
export { default as GPSStatusIndicator } from './ui/gps-status-indicator';
export { default as FeedbackAnimation } from './ui/feedback-animation';
export { default as ScreenTransitionWrapper } from './ui/screen-transition-wrapper';

// ✅ APRÈS
export { lazy, Suspense } from 'react';

// Lazy load les composants lourds
export const BatteryWarning = lazy(() => import('./battery-warning'));
export const GPSStatusIndicator = lazy(() => import('./ui/gps-status-indicator'));
export const FeedbackAnimation = lazy(() => import('./ui/feedback-animation'));
export const ScreenTransitionWrapper = lazy(() => import('./ui/screen-transition-wrapper'));
```

### 3. Lazy Load les Services Lourds dans `lib/services/index.ts`

```typescript
// ❌ AVANT
export * from './trip-service';
export * from './sms-service';
export * from './notification.service';
export * from './error-monitoring.service';
export * from './cache-service';

// ✅ APRÈS
// Services légers (toujours importés)
export * from './api-client';
export * from './phone-validation-service';

// Services lourds (lazy loaded)
export async function getTripService() {
  return import('./trip-service');
}

export async function getSmsService() {
  return import('./sms-service');
}

export async function getNotificationService() {
  return import('./notification.service');
}

export async function getErrorMonitoringService() {
  return import('./error-monitoring.service');
}

export async function getCacheService() {
  return import('./cache-service');
}
```

### 4. Utiliser les Services Lazy Loaded dans les Écrans

```typescript
// ❌ AVANT
import { startTrip, checkin } from '@/lib/services/trip-service';
import { notify } from '@/lib/services/notification.service';

export default function NewSessionScreen() {
  const handleStart = async () => {
    await startTrip(...);
    notify('trip_started');
  };
}

// ✅ APRÈS
import { getTripService, getNotificationService } from '@/lib/services';

export default function NewSessionScreen() {
  const handleStart = async () => {
    const tripService = await getTripService();
    const notificationService = await getNotificationService();
    
    await tripService.startTrip(...);
    notificationService.notify('trip_started');
  };
}
```

### 5. Lazy Load les Hooks Lourds dans `hooks/index.ts`

```typescript
// ❌ AVANT
export { useAuth } from './use-auth';
export { useTrip } from './use-trip';
export { useDeadlineTimer } from './use-deadline-timer';
export { useBatteryWarning } from './use-battery-warning';
export { useReduceMotion } from './use-reduce-motion';

// ✅ APRÈS
// Hooks légers (toujours importés)
export { useAuth } from './use-auth';
export { useColorScheme } from './use-color-scheme';

// Hooks lourds (lazy loaded)
export async function getUseTrip() {
  return import('./use-trip');
}

export async function getUseDeadlineTimer() {
  return import('./use-deadline-timer');
}

export async function getUseBatteryWarning() {
  return import('./use-battery-warning');
}

export async function getUseReduceMotion() {
  return import('./use-reduce-motion');
}
```

### 6. Mettre à jour les Imports dans les Écrans

```typescript
// ❌ AVANT
import { useTrip } from '@/hooks';
import { useBatteryWarning } from '@/hooks';
import { useDeadlineTimer } from '@/hooks';

export default function ActiveSessionScreen() {
  const trip = useTrip();
  const { level } = useBatteryWarning();
  const { timeLeft } = useDeadlineTimer();
}

// ✅ APRÈS
import { getUseTrip, getUseBatteryWarning, getUseDeadlineTimer } from '@/hooks';

export default function ActiveSessionScreen() {
  const [trip, setTrip] = useState(null);
  const [battery, setBattery] = useState(null);
  const [deadline, setDeadline] = useState(null);
  
  useEffect(() => {
    (async () => {
      const useTrip = await getUseTrip();
      const useBattery = await getUseBatteryWarning();
      const useDeadline = await getUseDeadlineTimer();
      
      // Utiliser les hooks
    })();
  }, []);
}
```

---

## 🔍 Vérification du Lazy Loading

### Commande 1: Vérifier le bundle après lazy loading

```bash
# Build production
npm run build

# Vérifier la taille
du -sh dist/

# Résultat attendu:
# 2.8 MB (réduit de 0.4 MB)
```

### Commande 2: Analyser le bundle

```bash
# Installer source-map-explorer
npm install --save-dev source-map-explorer

# Analyser le bundle
npx source-map-explorer 'dist/**/*.js'

# Résultat attendu:
# Voir les chunks séparés pour les écrans et services
```

### Commande 3: Vérifier le chargement des écrans

```bash
# Tester en développement
npm run dev

# Vérifier les logs:
# [Lazy] Loading Home screen...
# [Lazy] Loaded Home screen (150ms)
```

---

## 📊 Checklist d'Implémentation

### Phase 1: Lazy Load les Écrans
- [ ] Mettre à jour `app/_layout.tsx`
- [ ] Ajouter Suspense boundary
- [ ] Ajouter LoadingFallback
- [ ] Tester la navigation

### Phase 2: Lazy Load les Composants
- [ ] Mettre à jour `components/index.ts`
- [ ] Lazy load BatteryWarning
- [ ] Lazy load GPSStatusIndicator
- [ ] Lazy load FeedbackAnimation
- [ ] Lazy load ScreenTransitionWrapper

### Phase 3: Lazy Load les Services
- [ ] Mettre à jour `lib/services/index.ts`
- [ ] Lazy load trip-service
- [ ] Lazy load sms-service
- [ ] Lazy load notification.service
- [ ] Lazy load error-monitoring.service
- [ ] Lazy load cache-service

### Phase 4: Lazy Load les Hooks
- [ ] Mettre à jour `hooks/index.ts`
- [ ] Lazy load useTrip
- [ ] Lazy load useDeadlineTimer
- [ ] Lazy load useBatteryWarning
- [ ] Lazy load useReduceMotion

### Phase 5: Mettre à jour les Écrans
- [ ] Mettre à jour new-session.tsx
- [ ] Mettre à jour active-session.tsx
- [ ] Mettre à jour settings.tsx
- [ ] Mettre à jour home.tsx

### Phase 6: Tester
- [ ] Build production
- [ ] Vérifier la taille du bundle
- [ ] Tester la navigation
- [ ] Tester le chargement des écrans

---

## 📈 Résultats Attendus

### Avant Lazy Loading
```
Bundle Size: 3.2 MB
├── Écrans: 0.8 MB (25%)
├── Services: 0.6 MB (18.75%)
├── Composants: 0.4 MB (12.5%)
└── Autres: 1.4 MB (43.75%)

Initial Load: 1.2 MB
```

### Après Lazy Loading
```
Bundle Size: 2.8 MB (-0.4 MB, -12.5%)
├── Écrans: 0.2 MB (7.1%) - Lazy loaded
├── Services: 0.15 MB (5.4%) - Lazy loaded
├── Composants: 0.1 MB (3.6%) - Lazy loaded
└── Autres: 2.35 MB (83.9%)

Initial Load: 0.8 MB (-33%)
```

---

## 🎯 Timeline

| Étape | Temps | Effort |
|-------|-------|--------|
| Lazy load écrans | 30min | Facile |
| Lazy load composants | 30min | Facile |
| Lazy load services | 1h | Moyen |
| Lazy load hooks | 30min | Moyen |
| Mettre à jour écrans | 1h | Moyen |
| Tester | 30min | Facile |
| **Total** | **3h** | - |

---

**Fin du guide lazy loading**
