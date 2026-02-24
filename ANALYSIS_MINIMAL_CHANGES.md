# SafeWalk V1.90 - Analyse des Changements Minimaux

**Date:** 24 Feb 2026  
**Version actuelle:** V1.89 (GPS tracking intégré)  
**Objectif:** Implémenter 6 changements minimaux pour compléter le MVP

---

## 📋 Analyse du Code Existant

### ✅ CE QUI EXISTE

| Composant | Fichier | Statut |
|-----------|---------|--------|
| **Auth Hook** | `hooks/use-auth.ts` | ✅ Complet (web + native) |
| **OTP Hook** | `hooks/use-otp-verification.ts` | ✅ Complet (local AsyncStorage) |
| **App Context** | `lib/context/app-context.tsx` | ✅ Complet (sessions, settings) |
| **Trip Service** | `lib/services/trip-service.ts` | ✅ Complet (Edge Functions) |
| **Home Screen** | `app/home.tsx` | ✅ Complet (checklist permissions) |
| **New Session Screen** | `app/new-session.tsx` | ✅ Complet (config + gating contact) |
| **Active Session Screen** | `app/active-session.tsx` | ✅ Complet (GPS tracking) |
| **Settings Screen** | `app/settings.tsx` | ⚠️ Partiel (contacts CRUD?) |
| **OTP Verification Screen** | `app/otp-verification.tsx` | ✅ Complet |

### ❌ CE QUI MANQUE

| Changement | Impact | Effort |
|-----------|--------|--------|
| A) Auth anonyme au démarrage | Critique | Faible |
| B) Affichage crédits/subscription | Important | Faible |
| C) Gating OTP + paywall | Critique | Moyen |
| D) SOS long-press + cancel-trip | Important | Moyen |
| E) CRUD contacts + Test SMS | Important | Moyen |
| F) Error handling toasts | Important | Faible |

---

## 🔧 CHANGEMENT A) - Auth Anonyme + OTP Flow

### Fichiers à modifier
- `lib/context/app-context.tsx` - Ajouter `signInAnonymously` au démarrage
- `app/new-session.tsx` - Ajouter check `phone_verified` avant `startSession`
- `lib/services/trip-service.ts` - Ajouter check `phone_verified` dans `startTrip`, `triggerSos`, `sendTestSms`

### Logique
```typescript
// Au démarrage (app-context ou _layout)
if (!user) {
  await supabase.auth.signInAnonymously();
}

// Avant start-trip / sos / test-sms
if (!user.phone_verified) {
  // Afficher modal OTP
  // Appeler OTP flow
  // Attendre confirmation
}
```

### Points clés
- OTP hook existe déjà (`use-otp-verification.ts`)
- Screen OTP existe déjà (`app/otp-verification.tsx`)
- Juste besoin de connecter les pièces

---

## 🔧 CHANGEMENT B) - Affichage Home

### Fichiers à modifier
- `app/home.tsx` - Ajouter affichage crédits + subscription + phone_verified

### Logique
```typescript
// Lire depuis profiles Supabase
const profile = await supabase
  .from('profiles')
  .select('free_alerts_remaining, subscription_active, phone_verified')
  .single();

// Afficher dans checklist
{
  id: 'credits',
  label: `Crédits: ${profile.free_alerts_remaining}`,
  status: profile.free_alerts_remaining > 0 ? 'ok' : 'warning',
}
```

### Points clés
- Utiliser Supabase client directement ou via app-context
- Ajouter 2-3 items au checklist existant

---

## 🔧 CHANGEMENT C) - Gating New-Session

### Fichiers à modifier
- `app/new-session.tsx` - Ajouter checks avant `startSession`

### Logique
```typescript
const handleStartSession = async () => {
  // 1. Check contact
  if (!settings.emergencyContactName) {
    router.push('/settings');
    return;
  }
  
  // 2. Check phone verified
  if (!phoneVerified) {
    setShowOtpModal(true);
    return;
  }
  
  // 3. Check crédits
  if (credits <= 0 && !subscriptionActive) {
    setShowPaywallModal(true);
    return;
  }
  
  // 4. Appeler start-trip
  await startSession(limitTime, note);
  router.push('/active-session');
};
```

### Points clés
- Paywall screen existe déjà (probablement)
- OTP modal peut être réutilisé
- Ajouter 3 checks simples

---

## 🔧 CHANGEMENT D) - Active Session Améliorations

### Fichiers à modifier
- `app/active-session.tsx` - Remplacer SOS bouton par long-press
- `lib/services/trip-service.ts` - Ajouter `cancelTrip` endpoint

### Logique SOS Long-Press
```typescript
// Remplacer le bouton SOS actuel par LongPressable
<LongPressable
  onLongPress={async () => {
    await Haptics.impactAsync(ImpactFeedbackStyle.Heavy);
    await triggerSOS();
  }}
  duration={2000}
>
  <View className="bg-red-500 rounded-full p-6">
    <Text>SOS</Text>
  </View>
</LongPressable>
```

### Logique Cancel-Trip
```typescript
// Ajouter endpoint dans trip-service
export async function cancelTrip(tripId: string) {
  return await supabase
    .from('sessions')
    .update({ status: 'cancelled' })
    .eq('id', tripId);
}
```

### Points clés
- Utiliser `react-native-gesture-handler` (déjà installé)
- Ajouter haptics feedback
- Appel simple à Supabase

---

## 🔧 CHANGEMENT E) - Settings Améliorations

### Fichiers à modifier
- `app/settings.tsx` - Ajouter CRUD contacts + Test SMS

### Logique CRUD Contacts
```typescript
// Lire contacts
const contacts = await supabase
  .from('emergency_contacts')
  .select('*')
  .eq('user_id', user.id);

// Créer/Modifier/Supprimer contacts
// UI: Form simple avec input phone + nom
```

### Logique Test SMS
```typescript
const handleTestSms = async () => {
  // Check phone_verified
  if (!phoneVerified) {
    setShowOtpModal(true);
    return;
  }
  
  // Appeler test-sms
  const result = await tripService.sendTestSms();
  
  // Afficher toast
  if (result.success) {
    showToast('SMS de test envoyé');
  } else {
    showToast(`Erreur: ${result.error}`);
  }
};
```

### Points clés
- Réutiliser composants UI existants
- Appel simple à `tripService.sendTestSms()`
- Gating OTP + crédits test

---

## 🔧 CHANGEMENT F) - Error Handling

### Fichiers à modifier
- `app/new-session.tsx` - Ajouter toasts pour erreurs
- `app/active-session.tsx` - Ajouter toasts pour erreurs
- `lib/services/trip-service.ts` - Ajouter logging erreurs

### Erreurs à gérer

| Erreur | Message | Action |
|--------|---------|--------|
| `no_credits` | "Crédits insuffisants" | Afficher paywall |
| `quota_reached` | "Limite atteinte aujourd'hui" | Toast warning |
| `phone_not_verified` | "Vérifie ton numéro" | Afficher OTP modal |
| `twilio_failed` | "Impossible d'envoyer l'alerte" | Toast error + retry |
| `no_contact` | "Configure un contact d'urgence" | Rediriger settings |

### Points clés
- Utiliser `ToastPop` component existant
- Ajouter checks simples avant appels
- Log erreurs pour debugging

---

## 📊 Résumé des Changements

| Phase | Fichiers | Lignes | Effort | Priorité |
|-------|----------|--------|--------|----------|
| A) Auth | 3 | ~50 | 1h | 🔴 Critique |
| B) Home | 1 | ~20 | 30min | 🟡 Important |
| C) Gating | 1 | ~30 | 1h | 🔴 Critique |
| D) Active Session | 2 | ~40 | 1h | 🟡 Important |
| E) Settings | 1 | ~60 | 1.5h | 🟡 Important |
| F) Error Handling | 3 | ~30 | 1h | 🟡 Important |
| **TOTAL** | **11** | **~230** | **~6h** | - |

---

## 🎯 Ordre d'Implémentation Recommandé

1. **A) Auth anonyme** - Fondation pour tout le reste
2. **C) Gating New-Session** - Critique pour MVP
3. **B) Affichage Home** - UX importante
4. **F) Error Handling** - Améliore UX
5. **D) Active Session** - Polish
6. **E) Settings** - Polish

---

## 📝 Notes Importantes

- **Pas de refactorisation** - Juste ajouter/modifier ce qui manque
- **Réutiliser composants** - `ToastPop`, `OTP Modal`, etc.
- **Tester avec Supabase** - Vérifier que les RPC/Edge Functions marchent
- **Logs détaillés** - Utiliser `logger` pour debugging

