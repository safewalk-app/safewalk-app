# SafeWalk - Rapport de Préparation aux Stores

**Date d'évaluation** : 3 février 2026

## Résumé Exécutif

SafeWalk est une application de sécurité personnelle fonctionnelle avec une architecture solide. Cependant, plusieurs éléments doivent être complétés avant la soumission aux stores (App Store et Google Play).

---

## ✅ Ce qui est PRÊT

### Fonctionnalités Core
| Élément | Statut | Notes |
|---------|--------|-------|
| Écran d'accueil | ✅ Complet | Design finalisé |
| Création de session | ✅ Complet | Sélection heure limite, note |
| Session active avec timer | ✅ Complet | Compte à rebours, états |
| Bouton "Je suis rentré" | ✅ Complet | Confirmation retour |
| Extension +15 min | ✅ Complet | Max 3 extensions |
| Bouton SOS | ✅ Complet | Alerte immédiate |
| Historique des sessions | ✅ Complet | Liste avec statuts |
| Paramètres utilisateur | ✅ Complet | Autosave |
| 2 contacts d'urgence | ✅ Complet | Nom + téléphone |
| Notifications locales | ✅ Complet | Rappels, alertes |
| Détection GPS | ✅ Complet | Position en temps réel |
| Détection réseau | ✅ Complet | Avertissement hors ligne |
| useKeepAwake | ✅ Complet | Écran reste allumé |

### Documentation
| Document | Statut |
|----------|--------|
| STORE_LISTING.md | ✅ Complet (FR + EN) |
| PRIVACY_POLICY.md | ✅ Complet |
| TERMS_OF_SERVICE.md | ✅ Complet |
| design.md | ✅ Complet |

### Assets
| Asset | Statut |
|-------|--------|
| Icône app (1024x1024) | ✅ Présent |
| Splash screen | ✅ Présent |
| Icône Android adaptive | ✅ Présent |

### Tests
| Métrique | Valeur |
|----------|--------|
| Tests totaux | 266 |
| Tests passés | 238 (89%) |
| Tests échoués | 11 |
| Tests skippés | 17 |

---

## ❌ Ce qui MANQUE (Critique)

### 1. Service SMS Fonctionnel
**Priorité : CRITIQUE**

Le service Twilio n'est pas configuré avec des identifiants valides. L'erreur 20003 (Authenticate) indique que les credentials sont invalides ou expirés.

**Actions requises :**
- [ ] Créer un nouveau compte Twilio (twilio.com/try-twilio)
- [ ] Obtenir Account SID, Auth Token, et numéro Twilio
- [ ] Configurer les variables d'environnement
- [ ] Tester l'envoi réel de SMS
- [ ] Vérifier la délivrabilité en France (+33)

**Estimation** : 30 minutes

### 2. Tests Échoués à Corriger
**Priorité : HAUTE**

11 tests échouent actuellement, principalement liés à la validation des numéros de téléphone.

**Actions requises :**
- [ ] Corriger la validation trop permissive des numéros
- [ ] Aligner les tests avec la logique métier
- [ ] Atteindre 100% de tests passés

**Estimation** : 1-2 heures

### 3. Build EAS (Expo Application Services)
**Priorité : CRITIQUE**

L'application n'a pas été buildée pour les stores. Il faut générer les fichiers IPA (iOS) et AAB (Android).

**Actions requises :**
- [ ] Configurer EAS Build (`eas.json`)
- [ ] Créer un compte Expo (expo.dev)
- [ ] Configurer les credentials iOS (Apple Developer Account requis - 99$/an)
- [ ] Configurer les credentials Android (Google Play Console - 25$ one-time)
- [ ] Lancer `eas build --platform all`
- [ ] Tester les builds sur appareils réels

**Estimation** : 2-4 heures (hors temps d'attente Apple)

### 4. Compte Apple Developer
**Priorité : CRITIQUE pour iOS**

**Coût** : 99$/an
**Délai** : 24-48h pour validation

**Actions requises :**
- [ ] Créer un compte sur developer.apple.com
- [ ] Payer les frais annuels
- [ ] Attendre la validation
- [ ] Générer les certificats et provisioning profiles

### 5. Compte Google Play Console
**Priorité : CRITIQUE pour Android**

**Coût** : 25$ (one-time)
**Délai** : Immédiat

**Actions requises :**
- [ ] Créer un compte sur play.google.com/console
- [ ] Payer les frais d'inscription
- [ ] Configurer le profil développeur

---

## ⚠️ Ce qui MANQUE (Recommandé)

### 6. Screenshots pour les Stores
**Priorité : HAUTE**

Les stores exigent des captures d'écran de l'application.

**Formats requis :**
- iPhone 6.7" (1290 x 2796 px) - iPhone 15 Pro Max
- iPhone 6.5" (1242 x 2688 px) - iPhone 11 Pro Max
- iPhone 5.5" (1242 x 2208 px) - iPhone 8 Plus
- iPad Pro 12.9" (2048 x 2732 px)
- Android Phone (1080 x 1920 px minimum)
- Android Tablet (1200 x 1920 px)

**Actions requises :**
- [ ] Capturer 5-8 screenshots par format
- [ ] Ajouter des textes marketing sur les screenshots
- [ ] Créer des versions FR et EN

**Estimation** : 2-3 heures

### 7. Vidéo de Présentation (Optionnel)
**Priorité : MOYENNE**

Une vidéo de 15-30 secondes améliore significativement les conversions.

**Actions requises :**
- [ ] Créer une vidéo de démonstration
- [ ] Formats : MP4, 1080p minimum

**Estimation** : 1-2 heures

### 8. URL de Support et Politique de Confidentialité
**Priorité : HAUTE**

Les stores exigent des URLs publiques pour :
- Page de support
- Politique de confidentialité
- Conditions d'utilisation

**Actions requises :**
- [ ] Héberger les pages sur un domaine (safewalk.app ou GitHub Pages)
- [ ] Configurer les URLs dans app.config.ts

**Estimation** : 1 heure

### 9. Tests sur Appareils Réels
**Priorité : HAUTE**

L'application doit être testée sur de vrais appareils avant soumission.

**Actions requises :**
- [ ] Tester sur iPhone (iOS 15+)
- [ ] Tester sur Android (API 24+)
- [ ] Vérifier les notifications en arrière-plan
- [ ] Vérifier le GPS en mouvement
- [ ] Tester l'envoi réel de SMS

**Estimation** : 2-4 heures

### 10. Localisation Complète
**Priorité : MOYENNE**

L'application est en français mais pourrait bénéficier d'une version anglaise.

**Actions requises :**
- [ ] Extraire les strings dans des fichiers de traduction
- [ ] Traduire en anglais
- [ ] Implémenter i18n

**Estimation** : 4-6 heures

---

## 📋 Checklist de Soumission

### App Store (iOS)
- [ ] Compte Apple Developer actif (99$/an)
- [ ] Certificats et provisioning profiles
- [ ] Build IPA signé
- [ ] Screenshots (5+ par format)
- [ ] Description (FR + EN)
- [ ] Mots-clés
- [ ] URL politique de confidentialité
- [ ] URL support
- [ ] Catégorie : Lifestyle > Safety
- [ ] Age rating : 12+
- [ ] Répondre aux questions de review (localisation, notifications)

### Google Play (Android)
- [ ] Compte Google Play Console (25$)
- [ ] Build AAB signé
- [ ] Screenshots (8+ par format)
- [ ] Description (FR + EN)
- [ ] Feature graphic (1024 x 500 px)
- [ ] URL politique de confidentialité
- [ ] Questionnaire de contenu
- [ ] Catégorie : Lifestyle > Safety
- [ ] Target audience : 13+
- [ ] Data safety form

---

## 📊 Estimation Totale

| Tâche | Temps | Coût |
|-------|-------|------|
| Configurer Twilio | 30 min | 0$ (15$ crédit gratuit) |
| Corriger tests | 1-2h | 0$ |
| Compte Apple Developer | 24-48h | 99$/an |
| Compte Google Play | Immédiat | 25$ |
| EAS Build | 2-4h | 0$ (plan gratuit) |
| Screenshots | 2-3h | 0$ |
| Hébergement pages | 1h | 0$ (GitHub Pages) |
| Tests appareils | 2-4h | 0$ |
| **TOTAL** | **~10-16h** | **~124$** |

---

## 🚀 Plan d'Action Recommandé

### Jour 1 (4-6h)
1. Créer compte Twilio et configurer SMS
2. Corriger les tests échoués
3. Créer comptes Apple Developer et Google Play

### Jour 2 (4-6h)
1. Configurer EAS Build
2. Générer les builds iOS et Android
3. Tester sur appareils réels

### Jour 3 (2-4h)
1. Créer screenshots
2. Héberger pages légales
3. Soumettre aux stores

### Jour 4+ (Attente)
- Review Apple : 24-48h (parfois plus)
- Review Google : 1-7 jours

---

## Conclusion

SafeWalk est **fonctionnellement prêt** à environ **85%**. Les éléments manquants sont principalement :

1. **Service SMS fonctionnel** (critique)
2. **Builds pour les stores** (critique)
3. **Comptes développeur** (critique)
4. **Screenshots et assets marketing** (requis)

Avec 10-16 heures de travail et ~124$ d'investissement, l'application peut être soumise aux stores dans les 3-4 jours.
