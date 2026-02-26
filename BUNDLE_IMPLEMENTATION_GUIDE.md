# 📦 Bundle Optimization Implementation - SafeWalk V9.0

**Objectif:** Réduire le bundle de 3.2 MB à < 2 MB
**Statut:** Guide d'implémentation étape par étape

---

## 🎯 Phase 1: Tree-Shaking (Impact: -0.3 MB)

### Étape 1.1: Vérifier les imports dans `lib/utils.ts`

```typescript
// ❌ Avant: Importe tout lodash
import * as lodash from 'lodash';
import * as dateUtils from 'date-fns';

export const debounce = lodash.debounce;
export const formatDate = dateUtils.format;

// ✅ Après: Importe uniquement ce qui est nécessaire
export { debounce } from 'lodash-es';
export { format as formatDate } from 'date-fns';
```

### Étape 1.2: Mettre à jour `package.json`

```json
{
  "sideEffects": false,
  "exports": {
    ".": {
      "import": "./lib/index.js",
      "require": "./lib/index.cjs"
    }
  }
}
```

### Étape 1.3: Vérifier les imports dans les services

```typescript
// ❌ Avant
import * as ApiClient from './api-client';

// ✅ Après
import { apiCall, handleError } from './api-client';
```

### Étape 1.4: Tester le tree-shaking

```bash
# Vérifier la taille avant
npm run build
du -sh dist/

# Vérifier les imports inutilisés
npx depcheck
```

---

## 🎯 Phase 2: Lazy Loading (Impact: -0.4 MB)

### Étape 2.1: Lazy load les écrans

```typescript
// app/_layout.tsx
import { lazy, Suspense } from 'react';
import { ActivityIndicator } from 'react-native';

// ❌ Avant
import Home from './home';
import NewSession from './new-session';
import ActiveSession from './active-session';
import Settings from './settings';

// ✅ Après
const Home = lazy(() => import('./home'));
const NewSession = lazy(() => import('./new-session'));
const ActiveSession = lazy(() => import('./active-session'));
const Settings = lazy(() => import('./settings'));

export default function RootLayout() {
  return (
    <Suspense fallback={<ActivityIndicator />}>
      {/* Routes */}
    </Suspense>
  );
}
```

### Étape 2.2: Lazy load les composants lourds

```typescript
// components/index.ts
export { default as BatteryWarning } from './battery-warning';
export { default as GPSStatusIndicator } from './ui/gps-status-indicator';

// Dans les écrans
import { lazy } from 'react';

const BatteryWarning = lazy(() => import('./battery-warning'));
const GPSStatusIndicator = lazy(() => import('./ui/gps-status-indicator'));
```

### Étape 2.3: Lazy load les services lourds

```typescript
// lib/services/index.ts
// ❌ Avant: Tous les services chargés
export * from './trip-service';
export * from './sms-service';
export * from './notification.service';

// ✅ Après: Charger à la demande
export async function getTripService() {
  return import('./trip-service');
}

export async function getSmsService() {
  return import('./sms-service');
}
```

### Étape 2.4: Tester le lazy loading

```bash
# Vérifier que les écrans se chargent correctement
npm run dev

# Vérifier la taille du bundle principal
npm run build
ls -lh dist/
```

---

## 🎯 Phase 3: Code Splitting (Impact: -0.3 MB)

### Étape 3.1: Splitter les services par fonctionnalité

```typescript
// lib/services/trip/index.ts
export { startTrip } from './start-trip';
export { checkin } from './checkin';
export { extendTrip } from './extend-trip';

// lib/services/sms/index.ts
export { sendEmergencySMS } from './send-emergency-sms';
export { sendFriendlyAlert } from './send-friendly-alert';

// Dans les écrans
import { startTrip } from '@/lib/services/trip';
import { sendEmergencySMS } from '@/lib/services/sms';
```

### Étape 3.2: Splitter les hooks par domaine

```typescript
// hooks/auth/index.ts
export { useAuth } from './use-auth';
export { useLogin } from './use-login';

// hooks/trip/index.ts
export { useTrip } from './use-trip';
export { useDeadlineTimer } from './use-deadline-timer';

// Dans les écrans
import { useAuth } from '@/hooks/auth';
import { useTrip } from '@/hooks/trip';
```

### Étape 3.3: Vérifier les imports circulaires

```bash
# Identifier les imports circulaires
npx madge --circular lib/
```

---

## 🎯 Phase 4: Minification (Impact: -0.2 MB)

### Étape 4.1: Configurer Metro minifier

```javascript
// metro.config.js
const config = {
  project: {
    ios: {},
    android: {},
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  minifierConfig: {
    keep_fnames: false,
    mangle: true,
    compress: {
      drop_console: true,
      drop_debugger: true,
      unused: true,
    },
  },
};

module.exports = config;
```

### Étape 4.2: Configurer Tailwind purge

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,tsx}',
    './components/**/*.{js,ts,tsx}',
    './lib/**/*.{js,ts,tsx}',
  ],
  safelist: [],
  theme: {
    extend: {
      // Minimiser les extensions
    },
  },
  plugins: [],
};
```

### Étape 4.3: Tester la minification

```bash
# Build production
npm run build

# Vérifier la taille
du -sh dist/
```

---

## 🎯 Phase 5: Cleanup (Impact: -0.2 MB)

### Étape 5.1: Identifier les dépendances non utilisées

```bash
# Audit des dépendances
npx depcheck

# Vérifier les imports inutilisés
npx unimported
```

### Étape 5.2: Supprimer les dépendances non utilisées

```bash
# Supprimer les dépendances non utilisées
npm uninstall unused-package-name

# Mettre à jour package.json
npm prune
```

### Étape 5.3: Nettoyer les fichiers de configuration

```typescript
// Supprimer les imports inutilisés
// ❌ Avant
import { unused } from './utils';
import { alsoUnused } from './helpers';

// ✅ Après
import { used } from './utils';
```

---

## 📊 Checklist d'Implémentation

### Phase 1: Tree-Shaking
- [ ] Mettre à jour `lib/utils.ts`
- [ ] Ajouter `"sideEffects": false` dans `package.json`
- [ ] Vérifier les imports dans les services
- [ ] Tester le build
- **Résultat attendu:** -0.3 MB

### Phase 2: Lazy Loading
- [ ] Lazy load les écrans
- [ ] Lazy load les composants lourds
- [ ] Lazy load les services lourds
- [ ] Ajouter Suspense boundaries
- [ ] Tester la navigation
- **Résultat attendu:** -0.4 MB

### Phase 3: Code Splitting
- [ ] Splitter les services
- [ ] Splitter les hooks
- [ ] Vérifier les imports circulaires
- [ ] Tester les imports
- **Résultat attendu:** -0.3 MB

### Phase 4: Minification
- [ ] Configurer Metro minifier
- [ ] Configurer Tailwind purge
- [ ] Tester le build production
- **Résultat attendu:** -0.2 MB

### Phase 5: Cleanup
- [ ] Identifier les dépendances non utilisées
- [ ] Supprimer les imports inutilisés
- [ ] Nettoyer les fichiers
- **Résultat attendu:** -0.2 MB

---

## 📈 Résultats Attendus

### Avant Optimisation
```
Bundle Size: 3.2 MB
├── React Native: 1.2 MB (37.5%)
├── Expo: 0.8 MB (25%)
├── Navigation: 0.4 MB (12.5%)
└── Autres: 0.8 MB (25%)
```

### Après Optimisation
```
Bundle Size: 1.8 MB (-43.75%)
├── React Native: 0.9 MB (50%)
├── Expo: 0.5 MB (27.8%)
├── Navigation: 0.2 MB (11.1%)
└── Autres: 0.2 MB (11.1%)
```

---

## 🔧 Commandes Utiles

```bash
# Analyser le bundle
npm run build
du -sh dist/

# Vérifier les imports inutilisés
npx depcheck
npx unimported

# Vérifier les imports circulaires
npx madge --circular lib/

# Profiler le bundle
npx expo export --bundle-analyzer

# Tester le build
npm run build
npm start
```

---

## 🎯 Timeline d'Implémentation

| Phase | Effort | Impact | Priorité | Timeline |
|-------|--------|--------|----------|----------|
| 1. Tree-shaking | 1h | -0.3 MB | P0 | Jour 1 |
| 2. Lazy loading | 3h | -0.4 MB | P0 | Jour 1-2 |
| 3. Code splitting | 2h | -0.3 MB | P1 | Jour 2 |
| 4. Minification | 1h | -0.2 MB | P0 | Jour 2 |
| 5. Cleanup | 1h | -0.2 MB | P1 | Jour 3 |
| **Total** | **8h** | **-1.4 MB** | - | **3 jours** |

---

**Fin du guide d'implémentation**
