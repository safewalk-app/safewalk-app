# Guide de Configuration des Produits Stripe

## Vue d'ensemble

Pour que l'app SafeWalk fonctionne avec les prix dynamiques, vous devez créer **6 produits** dans Stripe Dashboard. Les Edge Functions récupéreront automatiquement les prix depuis Stripe.

---

## Produit 1: Premium Mensuel (Abonnement)

### Formulaire Stripe

| Champ | Valeur |
| --- | --- |
| **Nom** | Premium Mensuel |
| **Description** | Alertes SMS illimitées chaque mois |
| **Type de tarif** | Récurrent |
| **Montant** | 9.99 |
| **Devise** | EUR (ou USD selon votre région) |
| **Période de facturation** | Mensuelle |

### Métadonnées (Important!)

Après remplir le formulaire, cliquez sur **"Plus d'options"** et ajoutez:

```
Clé: type
Valeur: 

Clé: plan_id
Valeur: premium

Clé: interval
Valeur: month
```

**Étapes:**

1. Aller à Stripe Dashboard → Products

1. Cliquer "Add product"

1. Remplir le formulaire ci-dessus

1. Cliquer "Save product"

1. Aller à l'onglet "Pricing" → Cliquer sur le prix créé

1. Cliquer "Edit" → "More options"

1. Ajouter les métadonnées ci-dessus

1. Cliquer "Save"

---

## Produit 2: Premium Annuel (Abonnement)

| Champ | Valeur |
| --- | --- |
| **Nom** | Premium Annuel |
| **Description** | Alertes SMS illimitées pendant 1 an (20% de réduction) |
| **Type de tarif** | Récurrent |
| **Montant** | 79.99 |
| **Devise** | EUR (ou USD) |
| **Période de facturation** | Annuelle |

### Métadonnées

```
Clé: type
Valeur: subscription

Clé: plan_id
Valeur: premium_annual

Clé: interval
Valeur: year
```

---

## Produit 3: 10 Crédits (Paiement unique)

| Champ | Valeur |
| --- | --- |
| **Nom** | 10 Crédits |
| **Description** | 10 alertes SMS (1 crédit = 1 SMS) |
| **Type de tarif** | Ponctuel |
| **Montant** | 0.99 |
| **Devise** | EUR (ou USD) |

### Métadonnées

```
Clé: type
Valeur: credits

Clé: credits
Valeur: 10
```

---

## Produit 4: 50 Crédits (Paiement unique)

| Champ | Valeur |
| --- | --- |
| **Nom** | 50 Crédits |
| **Description** | 50 alertes SMS (meilleure valeur) |
| **Type de tarif** | Ponctuel |
| **Montant** | 4.99 |
| **Devise** | EUR (ou USD) |

### Métadonnées

```
Clé: type
Valeur: credits

Clé: credits
Valeur: 50
```

---

## Produit 5: 100 Crédits (Paiement unique)

| Champ | Valeur |
| --- | --- |
| **Nom** | 100 Crédits |
| **Description** | 100 alertes SMS |
| **Type de tarif** | Ponctuel |
| **Montant** | 9.99 |
| **Devise** | EUR (ou USD) |

### Métadonnées

```
Clé: type
Valeur: credits

Clé: credits
Valeur: 100
```

---

## Produit 6: 500 Crédits (Paiement unique)

| Champ | Valeur |
| --- | --- |
| **Nom** | 500 Crédits |
| **Description** | 500 alertes SMS (meilleure valeur pour les gros utilisateurs) |
| **Type de tarif** | Ponctuel |
| **Montant** | 39.99 |
| **Devise** | EUR (ou USD) |

### Métadonnées

```
Clé: type
Valeur: credits

Clé: credits
Valeur: 500
```

---

## Ajouter les Métadonnées (Étapes détaillées)

### Pour chaque produit:

1. **Aller à Stripe Dashboard** → Products → [Votre produit]

1. **Cliquer sur l'onglet "Pricing"**

1. **Cliquer sur le prix** (par exemple "€9.99 / month")

1. **Cliquer le bouton "Edit"** (crayon)

1. **Cliquer "More options"** (en bas)

1. **Ajouter les métadonnées:**
  - Cliquer "+ Add metadata"
  - Entrer la clé (ex: "type")
  - Entrer la valeur (ex: "subscription")
  - Cliquer "+ Add metadata" pour ajouter une autre

1. **Cliquer "Save"**

---

## Vérifier que tout est configuré

Après créer tous les produits, vérifiez:

1. **Aller à Stripe Dashboard** → Products

1. **Vous devez voir 6 produits:**
  - ✅ Premium Mensuel (€9.99/month)
  - ✅ Premium Annuel (€79.99/year)
  - ✅ 10 Crédits (€0.99)
  - ✅ 50 Crédits (€4.99)
  - ✅ 100 Crédits (€9.99)
  - ✅ 500 Crédits (€39.99)

1. **Chaque produit doit avoir les métadonnées:**
  - Cliquer sur le produit
  - Aller à "Pricing"
  - Cliquer sur le prix
  - Vérifier que "type" et "credits" (ou "plan_id") sont présents

---

## Comment ça marche après configuration

1. **L'app appelle l'Edge Function** `get-stripe-products`

1. **L'Edge Function récupère tous les produits** depuis Stripe API

1. **Les prix s'affichent automatiquement** dans le Paywall

1. **Si vous changez un prix dans Stripe**, l'app le reflète automatiquement (après 5 minutes de cache)

---

## Troubleshooting

### Les produits ne s'affichent pas dans l'app

**Vérifier:**

1. Les produits sont **actifs** (pas archivés)

1. Les métadonnées sont **correctes** (type: "subscription" ou "credits")

1. L'Edge Function `get-stripe-products` est **déployée** sur Supabase

1. La clé `STRIPE_SECRET_KEY` est **configurée** dans Supabase

### Les prix sont incorrects

**Vérifier:**

1. Le montant est en **cents** ou **euros** (Stripe utilise les cents)

1. La devise est **correcte** (EUR ou USD)

1. Les métadonnées sont **exactes** (pas d'espaces)

### Les métadonnées ne sont pas sauvegardées

**Solution:**

1. Cliquer "Edit" sur le prix

1. Cliquer "More options"

1. Ajouter les métadonnées

1. **Cliquer "Save"** (important!)

---

## Résumé

Après créer les 6 produits avec les métadonnées, l'app SafeWalk sera **complètement dynamique**:

- ✅ Les prix viennent de Stripe

- ✅ Changez les prix dans Stripe Dashboard

- ✅ L'app se met à jour automatiquement

- ✅ Pas besoin de redéployer l'app

