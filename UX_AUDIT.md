# SafeWalk - Audit UX Complet

**Objectif:** Rendre l'app plus claire, fiable, compréhensible et cohérente sans refaire le design.

**Date:** 2026-02-26
**Version:** V3.4 → V4.0 (UX Audit & Corrections)

---

## 1) AUDIT ÉCRAN HOME

### État Actuel
- Affiche "Je sors" (bouton principal)
- Affiche "Sécurité inactive" si pas de contact
- Affiche "Conseil du jour"

### Problèmes Identifiés

#### P0 - Bloquant
- [ ] **Pas clair si l'utilisateur peut démarrer immédiatement**
  - Problème: Le bouton "Je sors" est toujours visible, même si des conditions critiques manquent
  - Impact: Utilisateur clique, puis se retrouve bloqué avec message d'erreur confus
  - Fix: Afficher un statut clair avant le bouton (✅ Prêt / ⚠️ À configurer)

- [ ] **"Sécurité inactive" est trop vague**
  - Problème: Utilisateur ne sait pas si c'est bloquant ou juste informatif
  - Impact: Confusion sur la suite à faire
  - Fix: Remplacer par "Contact d'urgence manquant - Ajouter maintenant" avec lien

- [ ] **Pas d'indication sur les crédits gratuits restants**
  - Problème: Utilisateur ne sait pas s'il peut démarrer une sortie
  - Impact: Faux espoir, puis blocage à la dernière minute
  - Fix: Afficher "X alertes gratuites restantes" ou "Crédits insuffisants"

#### P1 - Important
- [ ] **Pas d'indication sur les permissions (localisation, notifications)**
  - Problème: Utilisateur ne sait pas si les alertes fonctionneront
  - Impact: Fausse sécurité
  - Fix: Afficher l'état des permissions (🟢 Actif / 🔴 Désactivé)

- [ ] **"Conseil du jour" prend trop de place**
  - Problème: Distrait de l'action principale
  - Impact: Utilisateur perd de vue l'objectif
  - Fix: Réduire la taille ou déplacer en bas

#### P2 - Amélioration
- [ ] **Pas de feedback sur la vérification du numéro de téléphone**
  - Problème: Utilisateur ne sait pas si son numéro est vérifié
  - Impact: Doute sur la fiabilité
  - Fix: Afficher "✅ Numéro vérifié" ou "⚠️ Vérification requise"

---

## 2) AUDIT ÉCRAN "JE SORS"

### État Actuel
- Formulaire avec:
  - Heure de retour prévu
  - Toggle "Partager ma position"
  - Bouton "Démarrer"
  - Affichage du contact d'urgence

### Problèmes Identifiés

#### P0 - Bloquant
- [ ] **Bouton "Démarrer" peut être grisé sans explication claire**
  - Problème: Utilisateur ne sait pas pourquoi il ne peut pas démarrer
  - Impact: Frustration, abandon
  - Fix: Afficher un message clair au-dessus du bouton (ex: "Contact manquant - Ajouter dans Paramètres")

- [ ] **Pas de confirmation du contact d'urgence**
  - Problème: Utilisateur ne sait pas à qui l'alerte sera envoyée
  - Impact: Risque d'erreur critique
  - Fix: Afficher "Alerte sera envoyée à: [Nom] [Numéro]" avec possibilité de changer

- [ ] **"Heure de retour prévu" vs "Heure d'alerte" - confusion**
  - Problème: Utilisateur ne comprend pas la différence
  - Impact: Mauvaise configuration
  - Fix: Simplifier en "Retour prévu à [HH:MM]" + "Alerte envoyée si tu ne confirmes pas"

#### P1 - Important
- [ ] **Toggle "Partager ma position" manque de contexte**
  - Problème: Utilisateur ne sait pas pourquoi partager sa position
  - Impact: Peut refuser par défaut par peur
  - Fix: Ajouter "Inclure ma position dans l'alerte pour plus de sécurité"

- [ ] **Pas de résumé avant de démarrer**
  - Problème: Utilisateur ne voit pas le contrat clair
  - Impact: Doute, relecture
  - Fix: Afficher "Résumé: Alerte SMS à [Contact] si pas de confirmation avant [HH:MM]"

#### P2 - Amélioration
- [ ] **Pas de validation du formulaire en temps réel**
  - Problème: Utilisateur peut soumettre un formulaire invalide
  - Impact: Erreur serveur confuse
  - Fix: Valider et afficher erreurs au fur et à mesure

---

## 3) AUDIT ÉCRAN "SORTIE EN COURS"

### État Actuel
- Affiche le countdown (HH:MM:SS)
- Affiche les heures (limite, alerte)
- Boutons: Je suis rentré, Prolonger, SOS, Arrêter
- Affiche l'état GPS et batterie

### Problèmes Identifiés

#### P0 - Bloquant
- [ ] **Bouton "SOS" n'est pas sécurisé**
  - Problème: Risque d'appui accidentel
  - Impact: Fausse alerte coûteuse
  - Fix: Implémenter appui long 2 secondes avec feedback visuel

- [ ] **"Arrêter sans alerter" n'existe pas ou est confus**
  - Problème: Utilisateur ne sait pas comment terminer sans alerte
  - Impact: Peut déclencher alerte par erreur
  - Fix: Créer bouton clair "Arrêter la sortie" avec confirmation

- [ ] **Distinction entre "Heure limite" et "Heure d'alerte" est confuse**
  - Problème: Utilisateur ne comprend pas quand l'alerte est envoyée
  - Impact: Mauvaise compréhension du timing
  - Fix: Simplifier en "Alerte envoyée à [HH:MM] si pas de confirmation"

#### P1 - Important
- [ ] **Bouton "Prolonger" n'offre pas de choix clair**
  - Problème: Utilisateur ne sait pas de combien prolonger
  - Impact: Hésitation, mauvaise durée
  - Fix: Afficher "Prolonger de: +15 min / +30 min / +60 min / Personnalisé"

- [ ] **Pas de feedback sur l'état de la localisation**
  - Problème: Utilisateur ne sait pas si sa position est partagée
  - Impact: Doute sur la sécurité
  - Fix: Afficher "🟢 Localisation active" ou "🔴 Localisation désactivée"

- [ ] **Pas de feedback clair sur l'état de la batterie**
  - Problème: Utilisateur ne sait pas si l'alerte peut être envoyée
  - Impact: Fausse sécurité
  - Fix: Afficher "⚠️ Batterie faible (15%)" en haut

#### P2 - Amélioration
- [ ] **Hiérarchie des boutons n'est pas claire**
  - Problème: "Je suis rentré" et "Arrêter" peuvent être confus
  - Impact: Utilisateur clique sur le mauvais
  - Fix: "Je suis rentré" = action principale (vert), "Arrêter" = action secondaire (gris)

- [ ] **"Conseil du jour" distrait de l'action principale**
  - Problème: Trop d'informations
  - Impact: Utilisateur perd de vue le countdown
  - Fix: Réduire ou supprimer

---

## 4) AUDIT ÉCRAN "PARAMÈTRES"

### État Actuel
- Prénom
- Contact d'urgence (nom + numéro)
- Toggle localisation
- Toggle notifications
- Bouton "Test SMS"
- Bouton "Supprimer données"

### Problèmes Identifiés

#### P0 - Bloquant
- [ ] **Pas de feedback clair sur la validation du numéro de téléphone**
  - Problème: Utilisateur ne sait pas si le numéro est valide
  - Impact: Alerte ne peut pas être envoyée
  - Fix: Afficher "✅ Numéro valide" ou "❌ Format invalide (ex: +33 6 12 34 56 78)"

- [ ] **"Test SMS" n'a pas de feedback clair**
  - Problème: Utilisateur ne sait pas si le SMS a été envoyé
  - Impact: Doute sur la fiabilité
  - Fix: Afficher "✅ SMS envoyé à [Numéro]" ou "❌ Erreur d'envoi"

#### P1 - Important
- [ ] **Pas de confirmation avant "Supprimer données"**
  - Problème: Risque de suppression accidentelle
  - Impact: Perte de données
  - Fix: Afficher une alerte de confirmation avec avertissement clair

- [ ] **Pas d'explication sur les permissions**
  - Problème: Utilisateur ne sait pas pourquoi activer localisation/notifications
  - Impact: Peut refuser par défaut
  - Fix: Ajouter texte explicatif court sous chaque toggle

- [ ] **Pas d'indication sur le statut des permissions**
  - Problème: Utilisateur ne sait pas si les permissions sont actives
  - Impact: Doute sur la sécurité
  - Fix: Afficher "🟢 Actif" ou "🔴 Désactivé" à côté de chaque toggle

#### P2 - Amélioration
- [ ] **Pas de feedback sur l'autosave**
  - Problème: Utilisateur ne sait pas si les changements sont sauvegardés
  - Impact: Doute
  - Fix: Afficher "✅ Sauvegardé" brièvement après chaque changement

---

## 5) PROBLÈMES TRANSVERSAUX

### P0 - Bloquant
- [ ] **Pas de "contrat utilisateur" clair au démarrage**
  - Problème: Utilisateur ne comprend pas le fonctionnement
  - Impact: Mauvaise utilisation
  - Fix: Ajouter un écran d'onboarding ou un texte explicatif clair

- [ ] **Messages d'erreur sont trop techniques**
  - Problème: Utilisateur ne comprend pas quoi faire
  - Impact: Abandon
  - Fix: Remplacer par messages clairs et orientés action

- [ ] **Navigation peut être confuse**
  - Problème: Utilisateur ne sait pas où aller pour corriger un problème
  - Impact: Frustration
  - Fix: Ajouter des liens directs vers Paramètres/OTP/Paywall depuis les messages d'erreur

### P1 - Important
- [ ] **Pas de cohérence dans les libellés**
  - Problème: Vocabulaire change entre écrans
  - Impact: Confusion
  - Fix: Unifier: "sortie", "retour prévu", "alerte", "contact d'urgence", "position"

- [ ] **Pas de feedback sur les actions en cours**
  - Problème: Utilisateur ne sait pas si l'app fonctionne
  - Impact: Clique plusieurs fois
  - Fix: Afficher loading/spinner pendant les appels API

### P2 - Amélioration
- [ ] **Pas de feedback positif après succès**
  - Problème: Utilisateur ne sait pas si l'action a réussi
  - Impact: Doute
  - Fix: Afficher toast/notification de succès

---

## 6) RÈGLES MÉTIER UX À CLARIFIER

### Quand on peut démarrer une sortie
- ✅ Contact d'urgence configuré
- ✅ Numéro de téléphone vérifié
- ✅ Crédits disponibles (ou gratuit)
- ✅ Permissions actives (localisation, notifications)

### Quand on bloque le démarrage
- ❌ Pas de contact d'urgence → Afficher "Ajouter un contact dans Paramètres"
- ❌ Numéro non vérifié → Afficher "Vérifier ton numéro via OTP"
- ❌ Pas de crédits → Afficher paywall
- ❌ Permissions refusées → Afficher "Activer les permissions dans Paramètres"

### Quand on affiche un paywall
- Utilisateur a 0 crédits gratuits
- Utilisateur a atteint le quota quotidien
- Message: "Tu as atteint la limite d'aujourd'hui. Ajoute des crédits pour continuer."

### Quand on demande OTP
- Utilisateur n'a jamais vérifié son numéro
- Utilisateur a changé son numéro
- Message: "Vérifie ton numéro pour activer les alertes"

### Quand on affiche une erreur
- Erreur réseau → "Impossible de se connecter. Vérifiez votre connexion."
- Erreur SMS → "Impossible d'envoyer l'alerte pour le moment. Réessayera automatiquement."
- Erreur serveur → "Une erreur est survenue. Réessayez."

### Quand on confirme une action sensible
- SOS → Appui long 2 secondes
- Arrêter sans alerter → Confirmation modale
- Supprimer données → Confirmation modale avec avertissement

---

## 7) CHECKLIST DE VALIDATION UX

### Scénario 1: Utilisateur sans contact
- [ ] Home affiche "Contact d'urgence manquant"
- [ ] Bouton "Je sors" est visible mais affiche message d'erreur clair
- [ ] Message propose d'aller ajouter un contact
- [ ] Lien vers Paramètres fonctionne

### Scénario 2: Utilisateur non vérifié
- [ ] Home affiche "Numéro non vérifié"
- [ ] Bouton "Je sors" affiche message d'erreur clair
- [ ] Message propose de vérifier le numéro
- [ ] Lien vers OTP fonctionne

### Scénario 3: Utilisateur sans crédits
- [ ] Home affiche "Crédits insuffisants"
- [ ] Bouton "Je sors" affiche message d'erreur clair
- [ ] Message propose d'ajouter des crédits
- [ ] Lien vers paywall fonctionne

### Scénario 4: Permission refusée
- [ ] Home affiche "Localisation désactivée"
- [ ] Bouton "Je sors" affiche message d'erreur clair
- [ ] Message propose d'activer la permission
- [ ] Lien vers Paramètres fonctionne

### Scénario 5: Sortie active
- [ ] Countdown affiche le temps restant
- [ ] Bouton "Je suis rentré" est visible et clair
- [ ] Bouton "SOS" est sécurisé (appui long)
- [ ] Bouton "Prolonger" affiche les options
- [ ] Bouton "Arrêter" affiche une confirmation

### Scénario 6: SOS
- [ ] Appui long 2 secondes déclenche l'alerte
- [ ] Feedback visuel pendant l'appui
- [ ] Confirmation après envoi
- [ ] Message de succès ou d'erreur clair

### Scénario 7: Fin de sortie
- [ ] "Je suis rentré" termine la sortie
- [ ] Message de confirmation
- [ ] Retour à Home
- [ ] Pas d'alerte envoyée

### Scénario 8: Erreur réseau
- [ ] Message d'erreur clair
- [ ] Bouton "Réessayer" visible
- [ ] Pas de blocage permanent
- [ ] Feedback sur l'état de la connexion

---

## 8) PROCHAINES ÉTAPES

1. **Corriger Home** → Afficher statut clair et blocages
2. **Corriger Je sors** → Clarifier le contrat utilisateur
3. **Corriger Sortie en cours** → Sécuriser SOS et clarifier actions
4. **Corriger Paramètres** → Valider et donner feedback
5. **Unifier les textes** → Vocabulaire cohérent
6. **Tester tous les scénarios** → Validation manuelle

---

**Fin de l'audit**
