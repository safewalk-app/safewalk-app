# 🌳 Tree-Shaking Implementation - SafeWalk V10.0

**Objectif:** Réduire le bundle de 0.3 MB via tree-shaking
**Effort:** 2h
**Impact:** -9.4% du bundle

---

## 📝 Changements à Appliquer

### 1. Mettre à jour `package.json`

```json
{
  "name": "safewalk-app",
  "version": "10.0.0",
  "sideEffects": false,
  "exports": {
    ".": {
      "import": "./lib/index.js",
      "require": "./lib/index.cjs"
    }
  },
  "dependencies": {
    "lodash-es": "^4.17.21",
    "date-fns": "^3.0.0"
  }
}
```

### 2. Mettre à jour `lib/utils.ts`

```typescript
// ❌ AVANT
import * as lodash from 'lodash';
import * as dateUtils from 'date-fns';

export const debounce = lodash.debounce;
export const throttle = lodash.throttle;
export const formatDate = dateUtils.format;
export const parseDate = dateUtils.parse;

// ✅ APRÈS
export { debounce, throttle } from 'lodash-es';
export { format as formatDate, parse as parseDate } from 'date-fns';
```

### 3. Mettre à jour les imports dans `lib/services/api-client.ts`

```typescript
// ❌ AVANT
import * as axios from 'axios';

const api = axios.default.create({
  baseURL: process.env.API_URL,
});

// ✅ APRÈS
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.API_URL,
});
```

### 4. Mettre à jour les imports dans `lib/services/trip-service.ts`

```typescript
// ❌ AVANT
import * as supabase from '@supabase/supabase-js';
import * as tripApi from './api-client';

// ✅ APRÈS
import { createClient } from '@supabase/supabase-js';
import { apiCall } from './api-client';

const supabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
```

### 5. Mettre à jour les imports dans `lib/services/sms-service.ts`

```typescript
// ❌ AVANT
import * as twilio from 'twilio';

// ✅ APRÈS
import twilio from 'twilio';
```

### 6. Mettre à jour les imports dans `lib/services/notification.service.ts`

```typescript
// ❌ AVANT
import * as Toast from 'react-native-toast-notifications';

// ✅ APRÈS
import { useToastShowParams, Toast } from 'react-native-toast-notifications';
```

### 7. Mettre à jour les imports dans `hooks/use-auth.ts`

```typescript
// ❌ AVANT
import * as SecureStore from 'expo-secure-store';
import * as auth from '@/lib/_core/auth';

// ✅ APRÈS
import { getItemAsync, setItemAsync } from 'expo-secure-store';
import { saveSessionToken, getSessionToken } from '@/lib/_core/auth';
```

### 8. Mettre à jour les imports dans les écrans

```typescript
// ❌ AVANT
import * as TripService from '@/lib/services/trip-service';
import * as NotificationService from '@/lib/services/notification.service';

export default function NewSessionScreen() {
  const handleStart = async () => {
    await TripService.startTrip(...);
    NotificationService.notify('trip_started');
  };
}

// ✅ APRÈS
import { startTrip } from '@/lib/services/trip-service';
import { notify } from '@/lib/services/notification.service';

export default function NewSessionScreen() {
  const handleStart = async () => {
    await startTrip(...);
    notify('trip_started');
  };
}
```

---

## 🔍 Vérification du Tree-Shaking

### Commande 1: Vérifier les imports inutilisés

```bash
# Installer depcheck
npm install --save-dev depcheck

# Vérifier les dépendances non utilisées
npx depcheck

# Résultat attendu:
# Unused dependencies: (none)
# Unused devDependencies: (none)
```

### Commande 2: Vérifier les imports circulaires

```bash
# Installer madge
npm install --save-dev madge

# Vérifier les imports circulaires
npx madge --circular lib/

# Résultat attendu:
# No circular dependencies found
```

### Commande 3: Analyser le bundle

```bash
# Installer source-map-explorer
npm install --save-dev source-map-explorer

# Analyser le bundle
npm run build
npx source-map-explorer 'dist/**/*.js'

# Résultat attendu:
# Voir la réduction de taille des dépendances
```

---

## 📊 Checklist d'Implémentation

### Phase 1: Mettre à jour package.json

- [ ] Ajouter `"sideEffects": false`
- [ ] Ajouter `"exports"` field
- [ ] Vérifier les versions des dépendances

### Phase 2: Mettre à jour les imports

- [ ] `lib/utils.ts` - lodash-es, date-fns
- [ ] `lib/services/api-client.ts` - axios
- [ ] `lib/services/trip-service.ts` - supabase
- [ ] `lib/services/sms-service.ts` - twilio
- [ ] `lib/services/notification.service.ts` - toast
- [ ] `hooks/use-auth.ts` - secure-store
- [ ] Tous les écrans - services

### Phase 3: Vérifier le tree-shaking

- [ ] Exécuter `npx depcheck`
- [ ] Exécuter `npx madge --circular lib/`
- [ ] Exécuter `npx source-map-explorer`
- [ ] Vérifier la réduction de taille

### Phase 4: Tester

- [ ] `npm run build`
- [ ] Vérifier la taille du bundle
- [ ] Tester l'app en développement
- [ ] Tester l'app en production

---

## 📈 Résultats Attendus

### Avant Tree-Shaking

```
Bundle Size: 3.2 MB
├── lodash: 0.15 MB (4.7%)
├── date-fns: 0.08 MB (2.5%)
├── axios: 0.05 MB (1.6%)
└── Autres: 2.92 MB (91.2%)
```

### Après Tree-Shaking

```
Bundle Size: 2.9 MB (-0.3 MB, -9.4%)
├── lodash-es: 0.05 MB (1.7%)
├── date-fns: 0.03 MB (1%)
├── axios: 0.02 MB (0.7%)
└── Autres: 2.8 MB (96.6%)
```

---

## 🎯 Timeline

| Étape                      | Temps  | Effort |
| -------------------------- | ------ | ------ |
| Mettre à jour package.json | 15min  | Facile |
| Mettre à jour les imports  | 1h     | Moyen  |
| Vérifier le tree-shaking   | 30min  | Facile |
| Tester                     | 15min  | Facile |
| **Total**                  | **2h** | -      |

---

**Fin du guide tree-shaking**
