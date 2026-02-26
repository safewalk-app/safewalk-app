# 📦 Bundle Size Optimization Guide - SafeWalk V8.0

**Objectif:** Réduire le bundle size de 3.2 MB à < 2 MB
**Cible:** -37.5% réduction

---

## 📊 Analyse Actuelle

### Bundle Size Breakdown (3.2 MB)

```
node_modules/
├── react-native (1.2 MB) - 37.5%
├── expo (0.8 MB) - 25%
├── @react-navigation (0.4 MB) - 12.5%
├── react-native-reanimated (0.3 MB) - 9.4%
├── autres (0.5 MB) - 15.6%
└── Total: 3.2 MB
```

### Opportunités d'Optimisation

| Stratégie | Impact | Effort | Priorité |
|-----------|--------|--------|----------|
| Tree-shaking | -0.3 MB | Faible | P0 |
| Lazy loading | -0.4 MB | Moyen | P0 |
| Code splitting | -0.3 MB | Moyen | P1 |
| Minification | -0.2 MB | Faible | P0 |
| Dépendances non utilisées | -0.2 MB | Faible | P1 |

**Total possible:** -1.4 MB (43.75% réduction)

---

## 🎯 Stratégies d'Optimisation

### 1. Tree-Shaking (Éliminer le code mort)

#### Vérifier les imports

```typescript
// ❌ Mauvais: importe tout
import * as lodash from 'lodash';
const result = lodash.debounce(fn, 300);

// ✅ Bon: importe uniquement ce qui est nécessaire
import { debounce } from 'lodash-es';
const result = debounce(fn, 300);
```

#### Configurer le tree-shaking dans `package.json`

```json
{
  "sideEffects": false,
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

#### Modules à optimiser

```typescript
// lib/utils.ts - Exporter uniquement les fonctions utilisées
export { cn } from 'clsx';
export { debounce } from 'lodash-es';
export { formatDate } from 'date-fns';

// ❌ Éviter
export * from 'lodash'; // Importe tout
```

### 2. Lazy Loading (Charger à la demande)

#### Lazy load les écrans

```typescript
// ❌ Avant: Tous les écrans chargés au démarrage
import Home from './app/home';
import NewSession from './app/new-session';
import ActiveSession from './app/active-session';
import Settings from './app/settings';

// ✅ Après: Lazy loading avec Expo Router
const Home = lazy(() => import('./app/home'));
const NewSession = lazy(() => import('./app/new-session'));
const ActiveSession = lazy(() => import('./app/active-session'));
const Settings = lazy(() => import('./app/settings'));
```

#### Lazy load les composants lourds

```typescript
// ❌ Avant
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReanimatedView } from 'react-native-reanimated';

// ✅ Après: Charger uniquement si nécessaire
const GestureHandlerRootView = lazy(() =>
  import('react-native-gesture-handler').then(m => ({
    default: m.GestureHandlerRootView
  }))
);
```

### 3. Code Splitting (Diviser le code)

#### Splitter par fonctionnalité

```typescript
// lib/services/index.ts
export { tripService } from './trip-service';
export { smsService } from './sms-service';

// Dans les écrans, importer uniquement ce qui est nécessaire
import { tripService } from '@/lib/services';
```

#### Splitter les hooks

```typescript
// hooks/index.ts - Exporter uniquement les hooks utilisés
export { useAuth } from './use-auth';
export { useCooldownTimer } from './use-cooldown-timer';
export { useDeadlineTimer } from './use-deadline-timer';

// ❌ Éviter
export * from './hooks'; // Importe tous les hooks
```

### 4. Minification & Compression

#### Configuration Metro (React Native bundler)

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
  // Minification
  minifierConfig: {
    keep_fnames: false,
    mangle: true,
    compress: {
      drop_console: true,
      drop_debugger: true,
    },
  },
};

module.exports = config;
```

#### Configuration Tailwind (NativeWind)

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './app/**/*.{js,ts,tsx}',
    './components/**/*.{js,ts,tsx}',
    './lib/**/*.{js,ts,tsx}',
  ],
  // Purge unused styles
  safelist: [],
  theme: {
    extend: {
      // Minimiser les extensions
    },
  },
};
```

### 5. Dépendances Non Utilisées

#### Audit des dépendances

```bash
# Identifier les dépendances non utilisées
npm ls --depth=0

# Vérifier les imports inutilisés
npx depcheck
```

#### Dépendances à considérer

```json
{
  "dependencies": {
    "axios": "^1.13.2",        // ✅ Utilisé pour API
    "react-native-svg": "15.12.1", // ✅ Utilisé pour icônes
    "expo-audio": "~1.1.0",    // ✅ Utilisé pour audio
    "expo-video": "~3.0.15",   // ⚠️ À vérifier
    "expo-notifications": "~0.32.15" // ✅ Utilisé pour notifications
  }
}
```

---

## 📋 Checklist d'Optimisation

### Phase 1: Tree-Shaking (Impact: -0.3 MB)

- [ ] Remplacer `import * as lodash` par `import { debounce }`
- [ ] Vérifier les imports dans `lib/utils.ts`
- [ ] Ajouter `"sideEffects": false` dans `package.json`
- [ ] Tester le build

### Phase 2: Lazy Loading (Impact: -0.4 MB)

- [ ] Lazy load les écrans avec `React.lazy()`
- [ ] Lazy load les composants lourds (GestureHandler, Reanimated)
- [ ] Ajouter Suspense boundaries
- [ ] Tester la navigation

### Phase 3: Code Splitting (Impact: -0.3 MB)

- [ ] Splitter les services par fonctionnalité
- [ ] Splitter les hooks par domaine
- [ ] Vérifier les imports circulaires
- [ ] Tester les imports

### Phase 4: Minification (Impact: -0.2 MB)

- [ ] Configurer Metro minifier
- [ ] Configurer Tailwind purge
- [ ] Tester le build production
- [ ] Vérifier la taille du bundle

### Phase 5: Cleanup (Impact: -0.2 MB)

- [ ] Identifier les dépendances non utilisées
- [ ] Supprimer les imports inutilisés
- [ ] Nettoyer les fichiers de configuration
- [ ] Tester le build final

---

## 🔧 Commandes Utiles

```bash
# Analyser la taille du bundle
npm run build
du -sh dist/

# Vérifier les imports inutilisés
npx depcheck

# Analyser les dépendances
npm ls --depth=0

# Profiler le bundle (Expo)
npx expo export --bundle-analyzer

# Minifier le code
npx terser app/home.tsx -o app/home.min.tsx
```

---

## 📈 Résultats Attendus

### Avant Optimisation
```
Total: 3.2 MB
├── React Native: 1.2 MB (37.5%)
├── Expo: 0.8 MB (25%)
├── Navigation: 0.4 MB (12.5%)
└── Autres: 0.8 MB (25%)
```

### Après Optimisation
```
Total: 1.8 MB (-43.75%)
├── React Native: 0.9 MB (50%)
├── Expo: 0.5 MB (27.8%)
├── Navigation: 0.2 MB (11.1%)
└── Autres: 0.2 MB (11.1%)
```

---

## 🎯 Prochaines Étapes

1. **Implémenter Phase 1-2** - Tree-shaking et lazy loading (impact: -0.7 MB)
2. **Mesurer le bundle** - Vérifier la réduction réelle
3. **Implémenter Phase 3-5** - Code splitting et cleanup
4. **Tester en production** - Vérifier les performances
5. **Monitorer** - Suivre la taille du bundle dans CI/CD

---

**Fin du guide d'optimisation**
