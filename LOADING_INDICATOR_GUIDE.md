# Loading Indicator Guide

Guide complet pour utiliser les indicateurs de chargement avec le lazy loading.

## Architecture

### Contexte de Chargement
- **Fichier:** `lib/context/loading-context.tsx`
- **Fournit:** LoadingProvider, useLoading()
- **Responsabilité:** Tracker l'état de chargement global

### Hook useLoadingIndicator
- **Fichier:** `hooks/use-loading-indicator.ts`
- **Fournit:** useLoadingIndicator(), useLoadingWrapper()
- **Responsabilité:** Afficher les indicateurs dans les composants

### Composants d'Affichage
- **Fichier:** `components/ui/loading-indicator.tsx`
- **Composants:**
  - `LoadingIndicator` - Barre de progression avec détails
  - `LoadingOverlay` - Overlay semi-transparent
  - `LoadingBar` - Barre simple en haut
  - `LoadingBadge` - Badge avec nombre d'items

## Installation

### 1. Ajouter LoadingProvider au layout principal

```tsx
// app/_layout.tsx
import { LoadingProvider } from '@/lib/context/loading-context';

export default function RootLayout() {
  return (
    <LoadingProvider>
      {/* Autres providers */}
      <YourApp />
    </LoadingProvider>
  );
}
```

### 2. Ajouter les composants d'affichage

```tsx
// app/_layout.tsx
import { LoadingBar } from '@/components/ui/loading-indicator';

export default function RootLayout() {
  return (
    <LoadingProvider>
      {/* Autres providers */}
      <YourApp />
      <LoadingBar /> {/* Affiche la barre de progression */}
    </LoadingProvider>
  );
}
```

## Utilisation

### Option 1: useLoadingWrapper (Recommandé)

Utiliser le hook `useLoadingWrapper` pour wrapper les appels async:

```tsx
import { useLoadingWrapper } from '@/hooks';
import { getTripService } from '@/lib/services';

export default function NewSessionScreen() {
  const withLoading = useLoadingWrapper({
    name: 'Trip Service',
    type: 'service',
    minDuration: 300,
  });

  const handleStartSession = async () => {
    const tripService = await withLoading(() => getTripService());
    await tripService.startTrip(...);
  };

  return (
    <Button onPress={handleStartSession}>
      Commencer la sortie
    </Button>
  );
}
```

### Option 2: useLoadingIndicator (Manuel)

Contrôle manuel du chargement:

```tsx
import { useLoadingIndicator } from '@/hooks';
import { getTripService } from '@/lib/services';

export default function NewSessionScreen() {
  const { start, finish } = useLoadingIndicator({
    name: 'Trip Service',
    type: 'service',
  });

  const handleStartSession = async () => {
    start();
    try {
      const tripService = await getTripService();
      await tripService.startTrip(...);
    } finally {
      finish();
    }
  };

  return (
    <Button onPress={handleStartSession}>
      Commencer la sortie
    </Button>
  );
}
```

### Option 3: Contexte Direct

Accès direct au contexte de chargement:

```tsx
import { useLoading } from '@/lib/context/loading-context';

export default function MyComponent() {
  const { loadingItems, isLoading, totalProgress } = useLoading();

  return (
    <View>
      {isLoading && (
        <Text>
          Chargement: {totalProgress}% ({loadingItems.length} items)
        </Text>
      )}
    </View>
  );
}
```

## Composants d'Affichage

### LoadingIndicator
Barre de progression avec détails optionnels:

```tsx
import { LoadingIndicator } from '@/components/ui/loading-indicator';

// Barre simple en haut
<LoadingIndicator position="top" showDetails={false} />

// Barre avec détails
<LoadingIndicator position="top" showDetails={true} />

// Barre au centre
<LoadingIndicator position="center" showDetails={false} />
```

### LoadingOverlay
Overlay semi-transparent:

```tsx
import { LoadingOverlay } from '@/components/ui/loading-indicator';

// Overlay simple
<LoadingOverlay showText={true} message="Chargement..." />

// Overlay sans texte
<LoadingOverlay showText={false} />
```

### LoadingBar
Barre simple (raccourci):

```tsx
import { LoadingBar } from '@/components/ui/loading-indicator';

<LoadingBar />
```

### LoadingBadge
Badge avec nombre d'items:

```tsx
import { LoadingBadge } from '@/components/ui/loading-indicator';

<LoadingBadge />
```

## Exemple Complet

```tsx
import { useLoadingWrapper } from '@/hooks';
import { getTripService } from '@/lib/services';
import { LoadingBar } from '@/components/ui/loading-indicator';

export default function NewSessionScreen() {
  const withLoading = useLoadingWrapper({
    name: 'Trip Service',
    type: 'service',
    minDuration: 300,
  });

  const handleStartSession = async () => {
    try {
      const tripService = await withLoading(() => getTripService());
      const result = await tripService.startTrip({
        deadline: limitTime,
        note,
      });

      if (result.success) {
        notify('trip.started');
        router.replace('/active-session');
      }
    } catch (error) {
      notify('error.unknown');
    }
  };

  return (
    <ScreenContainer>
      <LoadingBar />
      
      <ScrollView>
        {/* Contenu de l'écran */}
        <Button onPress={handleStartSession}>
          Commencer
        </Button>
      </ScrollView>
    </ScreenContainer>
  );
}
```

## Configuration

### Options de useLoadingIndicator

```typescript
interface LoadingIndicatorOptions {
  // Nom du service/hook
  name: string;
  
  // Type de chargement
  type?: 'service' | 'hook' | 'component';
  
  // Durée minimale d'affichage (ms)
  minDuration?: number;
}
```

### Options de LoadingIndicator

```typescript
interface LoadingIndicatorProps {
  // Position: 'top' | 'center' | 'bottom'
  position?: 'top';
  
  // Afficher les détails de chargement
  showDetails?: boolean;
}
```

## Bonnes Pratiques

### 1. Utiliser useLoadingWrapper
Préférer `useLoadingWrapper` pour une intégration simple:

```tsx
// ✅ BON
const withLoading = useLoadingWrapper({ name: 'Service' });
const result = await withLoading(() => getService());

// ❌ MAUVAIS
const { start, finish } = useLoadingIndicator({ name: 'Service' });
start();
// ... oublier de finish()
```

### 2. Noms Descriptifs
Utiliser des noms clairs pour les indicateurs:

```tsx
// ✅ BON
{ name: 'Trip Service' }
{ name: 'OTP Verification' }
{ name: 'Profile Data' }

// ❌ MAUVAIS
{ name: 'Service' }
{ name: 'Loading' }
```

### 3. Durée Minimale
Définir une durée minimale pour éviter les flashs:

```tsx
// ✅ BON
{ minDuration: 300 } // Au moins 300ms d'affichage

// ❌ MAUVAIS
{ minDuration: 0 } // Flash rapide
```

### 4. Placement des Composants
Placer les composants d'affichage au niveau du layout:

```tsx
// ✅ BON
// app/_layout.tsx
<LoadingProvider>
  <YourApp />
  <LoadingBar />
</LoadingProvider>

// ❌ MAUVAIS
// Chaque écran avec son propre LoadingBar
```

## Dépannage

### L'indicateur ne s'affiche pas

1. Vérifier que `LoadingProvider` est dans le layout
2. Vérifier que le composant d'affichage (LoadingBar, etc.) est présent
3. Vérifier que `useLoadingWrapper` est appelé avant l'async

### L'indicateur reste bloqué

1. Vérifier que `finish()` est appelé (utiliser try/finally)
2. Vérifier que `minDuration` n'est pas trop long
3. Vérifier les erreurs dans la console

### Performance

- Les indicateurs sont légers et n'impactent pas les performances
- La progression est simulée (0-90%) puis complétée à 100%
- Les items complétés sont retirés après 300ms pour une transition fluide

## Migration depuis V12.0

Pour ajouter les indicateurs à votre code existant:

```tsx
// Avant (V12.0)
const tripService = await getTripService();

// Après (V12.1)
const withLoading = useLoadingWrapper({
  name: 'Trip Service',
  type: 'service',
});
const tripService = await withLoading(() => getTripService());
```

## Fichiers Créés

- `lib/context/loading-context.tsx` - Contexte de chargement
- `hooks/use-loading-indicator.ts` - Hook pour les indicateurs
- `components/ui/loading-indicator.tsx` - Composants d'affichage
- `LOADING_INDICATOR_GUIDE.md` - Ce guide
