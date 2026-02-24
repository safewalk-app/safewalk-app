# Validation des Edge Functions Déployées

## État du Déploiement

✅ **7 Edge Functions déployées il y a 5 heures:**
1. `checkin` - Confirme l'arrivée
2. `cron-check-deadlines` - Vérifie les deadlines (cron)
3. `extend` - Prolonge la durée d'une sortie
4. `ping-location` - Envoie la localisation
5. `sos` - Déclenche une alerte SOS
6. `start-trip` - Crée une nouvelle sortie
7. `test-sms` - Envoie un SMS de test

✅ **1 Edge Function déployée il y a 4 jours:**
- `trigger-sos` - Déclenche une alerte SOS (ancienne version)

## Codes d'Erreur Implémentés

### Dans les Edge Functions

| Code | HTTP | Description | Fonctions |
|------|------|-------------|-----------|
| `phone_not_verified` | 403 | Téléphone non vérifié | start-trip, test-sms, sos |
| `no_credits` | 402 | Pas de crédits | start-trip, test-sms, sos |
| `quota_reached` | 402 | Limite quotidienne | start-trip, test-sms, sos |
| `twilio_failed` | 500 | Erreur SMS Twilio | test-sms, sos |

### Dans le Client (trip-service.ts)

✅ **startTrip()** - Gère les codes d'erreur:
```typescript
- no_credits → "Crédits insuffisants"
- quota_reached → "Limite atteinte aujourd'hui"
- twilio_failed → "Impossible d'envoyer l'alerte, réessaiera"
- phone_not_verified → Check client avant appel Edge Function
```

✅ **sendTestSms()** - Gère les codes d'erreur:
```typescript
- no_credits → "Crédits insuffisants"
- quota_reached → "Limite atteinte aujourd'hui"
- twilio_failed → "Impossible d'envoyer l'alerte, réessaiera"
- phone_not_verified → Check client avant appel Edge Function
```

✅ **triggerSos()** - Gère les codes d'erreur:
```typescript
- no_credits → "Crédits insuffisants"
- quota_reached → "Limite atteinte aujourd'hui"
- twilio_failed → "Impossible d'envoyer l'alerte, réessaiera"
- phone_not_verified → Check client avant appel Edge Function
```

## Flux de Validation

### 1. Vérification Client (trip-service.ts)

```
┌─────────────────────────────────────┐
│ startTrip / sendTestSms / triggerSos│
└────────────┬────────────────────────┘
             │
             ├─→ Check user authenticated?
             │   └─→ UNAUTHORIZED
             │
             ├─→ Check phone_verified?
             │   └─→ PHONE_NOT_VERIFIED
             │
             └─→ Call Edge Function
                 └─→ Handle error codes
```

### 2. Vérification Edge Function (start-trip, test-sms, sos)

```
┌──────────────────────────────────┐
│ Edge Function (start-trip, etc)  │
└────────────┬─────────────────────┘
             │
             ├─→ Verify JWT token
             │   └─→ INVALID_TOKEN (401)
             │
             ├─→ Check phone_verified
             │   └─→ phone_not_verified (403)
             │
             ├─→ Check credits/subscription
             │   └─→ no_credits (402)
             │
             ├─→ Check quota
             │   └─→ quota_reached (402)
             │
             └─→ Send SMS (Twilio)
                 └─→ twilio_failed (500)
```

## Tests Unitaires

✅ **6 tests des codes d'erreur** dans `lib/services/__tests__/edge-functions.test.ts`:
```
✓ start-trip should return phone_not_verified error code
✓ start-trip should return no_credits error code
✓ test-sms should return no_credits error code
✓ test-sms should return quota_reached error code
✓ test-sms should return twilio_failed error code
✓ should use consistent error codes across edge functions
```

✅ **5 tests d'intégration** dans `tests/edge-functions-integration.test.ts`:
```
✓ start-trip should handle phone_not_verified error
✓ test-sms should handle phone_not_verified error
✓ triggerSos should handle phone_not_verified error
✓ should use consistent error codes across functions
✓ should return French error messages
✓ edge functions should be accessible
```

## Validation Manuelle

### Test 1: Vérifier que les Edge Functions répondent

```bash
# Tester ping-location
curl -X POST https://your-project.supabase.co/functions/v1/ping-location \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"tripId": "test", "lat": 48.8566, "lng": 2.3522}'
```

### Test 2: Tester avec l'app mobile

1. **Signer in** → Créer un compte anonyme
2. **Vérifier téléphone** → Entrer un numéro et vérifier via OTP
3. **Créer une sortie** → Cliquer "Je sors"
   - ✅ Si succès → Affiche la session active
   - ❌ Si no_credits → Affiche "Crédits insuffisants" + paywall
   - ❌ Si quota_reached → Affiche "Limite atteinte aujourd'hui"
4. **Tester SMS** → Aller dans Settings → Test SMS
   - ✅ Si succès → Affiche "SMS envoyé"
   - ❌ Si twilio_failed → Affiche "Impossible d'envoyer"
5. **Déclencher SOS** → Long-press le bouton SOS
   - ✅ Si succès → Affiche "Alerte envoyée"
   - ❌ Si erreur → Affiche le message d'erreur

## Monitoring en Production

### Logs des Edge Functions

Accédez à la console Supabase:
1. Aller à **Edge Functions**
2. Cliquer sur la fonction (ex: `start-trip`)
3. Voir les logs en bas de l'écran

### Erreurs Courantes

| Erreur | Cause | Solution |
|--------|-------|----------|
| `INVALID_TOKEN` | JWT expiré | Rediriger vers login |
| `phone_not_verified` | Téléphone non vérifié | Afficher OTP flow |
| `no_credits` | Pas de crédits | Afficher paywall |
| `quota_reached` | Limite quotidienne | Afficher message "Réessayez demain" |
| `twilio_failed` | Erreur Twilio | Afficher message "Réessayez" |

## Checklist de Validation

- [x] 7 Edge Functions déployées sur Supabase
- [x] Codes d'erreur implémentés dans les Edge Functions
- [x] Gestion des codes d'erreur dans trip-service.ts
- [x] Messages d'erreur en français
- [x] 6 tests unitaires des codes d'erreur
- [x] 5 tests d'intégration avec les Edge Functions
- [x] Documentation de déploiement
- [ ] Tests manuels avec l'app mobile
- [ ] Monitoring en production
- [ ] Alertes pour les erreurs critiques

## Prochaines Étapes

1. ✅ Tester manuellement avec l'app mobile
2. ✅ Vérifier les logs en production
3. ✅ Ajouter des alertes pour les erreurs critiques
4. ✅ Documenter les erreurs courantes et solutions
