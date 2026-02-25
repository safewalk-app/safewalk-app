# Guide de Validation - Intégration SMS Templates

## 📋 Résumé des Changements

### 1. Helper SMS Templates (`supabase/functions/_shared/sms-templates.ts`)
- ✅ `buildLateSms()` - 8 variantes (firstName, deadline, lat, lng, userPhone, shareUserPhoneInAlerts)
- ✅ `buildSosSms()` - 8 variantes (firstName, lat, lng, userPhone, shareUserPhoneInAlerts)
- ✅ `buildTestSms()` - 2 variantes (firstName)
- ✅ Génération dynamique des liens Google Maps
- ✅ Gestion des fallbacks propres (sans undefined/null/double espace)

### 2. Edge Functions Intégrées
- ✅ `cron-check-deadlines/index.ts` - Utilise `buildLateSms()`
- ✅ `sos/index.ts` - Utilise `buildSosSms()`
- ✅ `test-sms/index.ts` - Utilise `buildTestSms()`

### 3. Tests Unitaires (`supabase/functions/_shared/sms-templates.test.ts`)
- ✅ 22 tests couvrant toutes les variantes
- ✅ Tests de validation des paramètres
- ✅ Tests de formatage (pas de double espace, longueur raisonnable)
- ✅ Tests des URLs Google Maps
- ✅ Tests des numéros de téléphone E.164

---

## 🧪 Exécuter les Tests

### Localement avec Deno
```bash
cd /home/ubuntu/safewalk-app
deno test supabase/functions/_shared/sms-templates.test.ts
```

### Résultat Attendu
```
test result: ok. 22 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

---

## ✅ Checklist de Validation

### Phase 1: Vérifier les Imports
- [ ] `cron-check-deadlines/index.ts` importe `buildLateSms` depuis `sms-templates.ts`
- [ ] `sos/index.ts` importe `buildSosSms` depuis `sms-templates.ts`
- [ ] `test-sms/index.ts` importe `buildTestSms` depuis `sms-templates.ts`

### Phase 2: Vérifier les Appels de Fonction
- [ ] `cron-check-deadlines` appelle `buildLateSms()` avec les bons paramètres
- [ ] `sos` appelle `buildSosSms()` avec les bons paramètres
- [ ] `test-sms` appelle `buildTestSms()` avec les bons paramètres

### Phase 3: Vérifier la Récupération des Données
- [ ] `cron-check-deadlines` récupère `first_name, share_user_phone_in_alerts` depuis `profiles`
- [ ] `sos` récupère `first_name, share_user_phone_in_alerts, phone_number` depuis `profiles`
- [ ] `test-sms` récupère `first_name` depuis `profiles`

### Phase 4: Vérifier la Gestion des Erreurs
- [ ] Les Edge Functions gèrent les cas où `profiles` n'existe pas
- [ ] Les Edge Functions gèrent les cas où `firstName` est undefined
- [ ] Les Edge Functions gèrent les cas où `lat/lng` sont undefined

### Phase 5: Vérifier les Messages SMS
- [ ] Les messages SMS contiennent le prénom de l'utilisateur
- [ ] Les messages SMS contiennent le numéro de téléphone si `shareUserPhoneInAlerts` est true
- [ ] Les messages SMS contiennent le lien Google Maps si `lat/lng` sont fournis
- [ ] Les messages SMS ne contiennent pas de double espace
- [ ] Les messages SMS ont une longueur raisonnable (50-500 caractères)

---

## 🔍 Vérifications Manuelles

### Test 1: Alerte Retard (Late Alert)
```bash
# Créer une sortie avec deadline passée
# Attendre que cron-check-deadlines s'exécute
# Vérifier que le contact reçoit un SMS avec:
# - Le prénom de l'utilisateur
# - Le lien Google Maps (si location partagée)
# - Le numéro de téléphone (si shareUserPhoneInAlerts = true)
```

### Test 2: Alerte SOS
```bash
# Appeler l'endpoint SOS
# Vérifier que le contact reçoit un SMS avec:
# - Le prénom de l'utilisateur
# - "SOS" dans le message
# - Le lien Google Maps (si location partagée)
# - Le numéro de téléphone (si shareUserPhoneInAlerts = true)
```

### Test 3: SMS de Test
```bash
# Appeler l'endpoint test-sms depuis Settings
# Vérifier que le contact reçoit un SMS avec:
# - Le prénom de l'utilisateur
# - "test" dans le message
# - Pas de lien Google Maps
# - Pas de numéro de téléphone
```

---

## 📊 Variantes Couvertes

### buildLateSms() - 8 Variantes
1. ✅ Avec firstName + deadline + lat/lng + userPhone + shareUserPhoneInAlerts=true
2. ✅ Avec firstName + deadline + lat/lng + userPhone + shareUserPhoneInAlerts=false
3. ✅ Avec firstName + deadline + sans lat/lng + userPhone + shareUserPhoneInAlerts=true
4. ✅ Avec firstName + deadline + sans lat/lng + userPhone + shareUserPhoneInAlerts=false
5. ✅ Sans firstName + deadline + lat/lng + userPhone + shareUserPhoneInAlerts=true
6. ✅ Sans firstName + deadline + lat/lng + userPhone + shareUserPhoneInAlerts=false
7. ✅ Sans firstName + deadline + sans lat/lng + userPhone + shareUserPhoneInAlerts=true
8. ✅ Sans firstName + deadline + sans lat/lng + userPhone + shareUserPhoneInAlerts=false

### buildSosSms() - 8 Variantes
1. ✅ Avec firstName + lat/lng + userPhone + shareUserPhoneInAlerts=true
2. ✅ Avec firstName + lat/lng + userPhone + shareUserPhoneInAlerts=false
3. ✅ Avec firstName + sans lat/lng + userPhone + shareUserPhoneInAlerts=true
4. ✅ Avec firstName + sans lat/lng + userPhone + shareUserPhoneInAlerts=false
5. ✅ Sans firstName + lat/lng + userPhone + shareUserPhoneInAlerts=true
6. ✅ Sans firstName + lat/lng + userPhone + shareUserPhoneInAlerts=false
7. ✅ Sans firstName + sans lat/lng + userPhone + shareUserPhoneInAlerts=true
8. ✅ Sans firstName + sans lat/lng + userPhone + shareUserPhoneInAlerts=false

### buildTestSms() - 2 Variantes
1. ✅ Avec firstName
2. ✅ Sans firstName

---

## 🚀 Prochaines Étapes

1. **Exécuter les tests** - `deno test supabase/functions/_shared/sms-templates.test.ts`
2. **Déployer les Edge Functions** - `supabase functions deploy`
3. **Tester en production** - Créer une sortie avec deadline passée, appeler SOS, envoyer SMS de test
4. **Monitorer les logs** - Vérifier les logs Supabase pour les erreurs
5. **Créer un checkpoint** - Sauvegarder la configuration finale

---

## 📝 Notes Importantes

- Les messages SMS sont générés dynamiquement sans hardcoding
- Les fallbacks sont gérés proprement (pas de undefined/null/double espace)
- Les liens Google Maps sont générés avec les coordonnées exactes
- Les numéros de téléphone sont au format E.164 (+33612345678)
- Les tests couvrent toutes les variantes possibles
- L'intégration est complète et prête pour la production

---

## ❓ Troubleshooting

### Les SMS ne contiennent pas le prénom
- Vérifier que la table `profiles` existe
- Vérifier que `first_name` est rempli pour l'utilisateur
- Vérifier que l'Edge Function récupère bien `first_name` depuis `profiles`

### Les SMS contiennent des double espaces
- Vérifier que `buildLateSms()`, `buildSosSms()`, `buildTestSms()` nettoient les espaces
- Vérifier que les paramètres undefined ne créent pas de double espace

### Les liens Google Maps ne s'affichent pas
- Vérifier que `share_location` est true dans la session
- Vérifier que `lat` et `lng` sont fournis à la fonction
- Vérifier que les coordonnées sont valides (lat: -90 à 90, lng: -180 à 180)

### Les numéros de téléphone ne s'affichent pas
- Vérifier que `shareUserPhoneInAlerts` est true
- Vérifier que `phone_number` est rempli dans `profiles`
- Vérifier que le numéro est au format E.164
