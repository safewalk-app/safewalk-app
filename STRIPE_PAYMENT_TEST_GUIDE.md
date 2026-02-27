# Guide de Test des Paiements Stripe - SafeWalk

## 1. Configuration Préalable

### 1.1 Clés Stripe

- ✅ **Clé Publique** (EXPO_PUBLIC_STRIPE_PUBLIC_KEY) - Déjà configurée dans Manus
- ⏳ **Clé Secrète** (STRIPE_SECRET_KEY) - À ajouter dans Supabase Edge Functions

### 1.2 Ajouter la clé secrète dans Supabase

```bash
# Via Supabase Dashboard:
1. Aller à: Supabase Console → Project Settings → Edge Functions
2. Ajouter une nouvelle variable d'environnement:
   - Clé: STRIPE_SECRET_KEY
   - Valeur: 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
3. Cliquer "Save"
```

### 1.3 Configurer les webhooks Stripe

```bash
# Dans Stripe Dashboard:
1. Aller à: Developers → Webhooks
2. Cliquer "Add endpoint"
3. URL: https://[votre-projet].supabase.co/functions/v1/handle-stripe-webhook
4. Événements à sélectionner:
   - checkout.session.completed
   - charge.failed
   - customer.subscription.updated
   - customer.subscription.deleted
5. Cliquer "Add endpoint"
6. Copier le "Signing secret" (commence par whsec_)
7. Ajouter dans Supabase: STRIPE_WEBHOOK_SECRET = [signing_secret]
```

---

## 2. Cartes de Test Stripe

### 2.1 Cartes Valides (Paiement Réussi)

| Numéro              | CVC  | Date  | Résultat  |
| ------------------- | ---- | ----- | --------- |
| 4242 4242 4242 4242 | Tout | Futur | ✅ Succès |
| 4000 0000 0000 0002 | Tout | Futur | ✅ Succès |
| 5555 5555 5555 4444 | Tout | Futur | ✅ Succès |

### 2.2 Cartes d'Erreur (Tester les Cas d'Erreur)

| Numéro              | CVC  | Date  | Erreur                      |
| ------------------- | ---- | ----- | --------------------------- |
| 4000 0000 0000 0002 | Tout | Futur | ❌ Carte déclinée           |
| 4000 0025 0000 3155 | Tout | Futur | ❌ Adresse invalide         |
| 4000 0000 0000 9995 | Tout | Futur | ❌ CVC invalide             |
| 4000 0000 0000 9987 | Tout | Futur | ❌ Authentification requise |
| 4000 0000 0000 0069 | Tout | Futur | ❌ Expiration invalide      |

### 2.3 Données de Test

```
Nom: Test User
Email: test@safewalk.app
Adresse: 123 Test Street
Ville: Test City
Code Postal: 12345
Pays: United States
```

---

## 3. Flux de Test Complet

### 3.1 Test 1: Achat d'Abonnement Premium (Succès)

**Étapes:**

1. Ouvrir SafeWalk app
2. Aller à Settings → Paywall
3. Cliquer "Premium Monthly" ($4.99/mois)
4. WebView Stripe s'ouvre
5. Entrer les données:
   - Carte: 4242 4242 4242 4242
   - CVC: 123
   - Date: 12/26
   - Nom: Test User
6. Cliquer "Pay"

**Vérifications:**

- ✅ Paiement confirmé dans Stripe Dashboard
- ✅ Webhook reçu (check Supabase logs)
- ✅ Crédits/Subscription mis à jour dans DB
- ✅ App affiche "Succès - Paiement confirmé"
- ✅ Paywall se ferme automatiquement

**Vérifier dans Supabase:**

```sql
SELECT * FROM subscriptions WHERE user_id = '[user_id]' ORDER BY created_at DESC LIMIT 1;
-- Doit montrer: plan='premium_monthly', status='active', stripe_customer_id rempli
```

---

### 3.2 Test 2: Achat de Crédits (Succès)

**Étapes:**

1. Ouvrir SafeWalk app
2. Aller à Settings → Paywall → Onglet "Crédits"
3. Cliquer "10 Crédits" ($0.99)
4. WebView Stripe s'ouvre
5. Entrer les données (carte valide)
6. Cliquer "Pay"

**Vérifications:**

- ✅ Paiement confirmé
- ✅ Crédits ajoutés au compte
- ✅ Historique visible dans `user_credits` table

**Vérifier dans Supabase:**

```sql
SELECT * FROM user_credits WHERE user_id = '[user_id]' ORDER BY created_at DESC LIMIT 1;
-- Doit montrer: amount=10, type='purchased', status='completed'
```

---

### 3.3 Test 3: Paiement Échoué (Carte Déclinée)

**Étapes:**

1. Ouvrir SafeWalk app
2. Aller à Settings → Paywall
3. Cliquer "Premium Monthly"
4. WebView Stripe s'ouvre
5. Entrer les données:
   - Carte: 4000 0000 0000 0002 (Carte déclinée)
   - CVC: 123
   - Date: 12/26
6. Cliquer "Pay"

**Vérifications:**

- ✅ Erreur affichée: "Carte déclinée"
- ✅ WebView reste ouvert (utilisateur peut réessayer)
- ✅ Aucun crédit/abonnement ajouté
- ✅ Logs Supabase montrent l'erreur

---

### 3.4 Test 4: Annulation du Paiement

**Étapes:**

1. Ouvrir SafeWalk app
2. Aller à Settings → Paywall
3. Cliquer "Premium Monthly"
4. WebView Stripe s'ouvre
5. Cliquer le bouton "X" (Fermer)

**Vérifications:**

- ✅ WebView se ferme
- ✅ Paywall reste visible
- ✅ Aucun paiement traité
- ✅ Utilisateur peut réessayer

---

## 4. Vérifications Techniques

### 4.1 Vérifier les Logs Supabase

```bash
# Via Supabase Dashboard:
1. Aller à: Logs → Edge Functions
2. Chercher: handle-stripe-webhook
3. Vérifier les logs pour:
   - Webhook reçu (status 200)
   - Signature valide
   - Crédits/Subscription mis à jour
```

### 4.2 Vérifier les Webhooks Stripe

```bash
# Dans Stripe Dashboard:
1. Aller à: Developers → Webhooks
2. Cliquer sur votre endpoint
3. Voir "Events" pour les derniers webhooks
4. Vérifier les statuts (200 = succès)
```

### 4.3 Vérifier la Base de Données

```sql
-- Vérifier les transactions
SELECT * FROM stripe_transactions
WHERE user_id = '[user_id]'
ORDER BY created_at DESC LIMIT 5;

-- Vérifier les abonnements
SELECT * FROM subscriptions
WHERE user_id = '[user_id]'
ORDER BY created_at DESC LIMIT 5;

-- Vérifier les crédits
SELECT * FROM user_credits
WHERE user_id = '[user_id]'
ORDER BY created_at DESC LIMIT 5;
```

---

## 5. Checklist de Test

- [ ] **Paiement Réussi** - Abonnement acheté avec succès
- [ ] **Crédits Achetés** - 10 crédits ajoutés au compte
- [ ] **Paiement Échoué** - Erreur affichée correctement
- [ ] **Annulation** - Utilisateur peut annuler
- [ ] **Webhook Reçu** - Logs Supabase montrent le webhook
- [ ] **DB Mise à Jour** - Crédits/Abonnement dans la base de données
- [ ] **Paywall Fermé** - App se rafraîchit après succès
- [ ] **Erreur Gérée** - Messages d'erreur clairs en français
- [ ] **Sécurité** - Clé secrète jamais exposée côté client
- [ ] **UX** - WebView fluide, pas de redirection externe

---

## 6. Troubleshooting

### Problème: "Impossible de créer la session de paiement"

**Causes possibles:**

1. Clé publique Stripe invalide
2. Produits Stripe non créés
3. Erreur dans `createCheckoutSession`

**Solution:**

```bash
# Vérifier les clés dans Manus
echo $EXPO_PUBLIC_STRIPE_PUBLIC_KEY

# Vérifier les produits dans Stripe Dashboard
# Aller à: Products & Prices
```

---

### Problème: "Webhook non reçu"

**Causes possibles:**

1. URL webhook incorrecte
2. Signing secret invalide
3. Edge Function down

**Solution:**

```bash
# Vérifier l'URL dans Stripe Dashboard
# Aller à: Developers → Webhooks → Endpoint

# Vérifier les logs Supabase
# Aller à: Logs → Edge Functions
```

---

### Problème: "Crédits non ajoutés après paiement"

**Causes possibles:**

1. Webhook non reçu
2. Erreur dans `handle-stripe-webhook`
3. DB transaction échouée

**Solution:**

```sql
-- Vérifier les transactions
SELECT * FROM stripe_transactions WHERE status = 'failed';

-- Vérifier les logs
SELECT * FROM stripe_webhook_logs ORDER BY created_at DESC LIMIT 10;
```

---

## 7. Mode Production vs Test

### Mode Test (Actuellement)

- ✅ Utilise les clés `pk_live_` et `sk_live_` (clés de test)
- ✅ Cartes de test disponibles
- ✅ Pas d'argent réel débité
- ✅ Webhooks testables

### Mode Production (Futur)

- ⏳ Utiliser les vraies clés Stripe
- ⏳ Vrai paiement
- ⏳ Vrai argent débité
- ⏳ Webhooks en production

---

## 8. Support

Si vous rencontrez des problèmes:

1. **Vérifier les logs Supabase** - Aller à Logs → Edge Functions
2. **Vérifier Stripe Dashboard** - Aller à Developers → Webhooks
3. **Vérifier la base de données** - Exécuter les requêtes SQL ci-dessus
4. **Contacter Stripe Support** - https://support.stripe.com
