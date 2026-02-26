# Audit UX/Wording - Écran Home (index.tsx)

## État Actuel vs. Problèmes Identifiés

### SECTION 1: HEADER

#### Titre principal
- **Actuel:** "SafeWalk"
- **Problème:** ✅ Correct, pas de changement nécessaire
- **Nouveau:** "SafeWalk" (garder)

#### Sous-titre
- **Actuel:** "Reste en sécurité, partout."
- **Problème:** ❌ Trop générique, "partout" est vague et peu naturel
- **Nouveau:** "Reste en sécurité, où que tu sois."

**Raison:** Plus naturel, plus humain, plus chaleureux. "Où que tu sois" est plus engageant que "partout".

---

### SECTION 2: CARTE PRINCIPALE "JE SORS"

#### Titre
- **Actuel:** "Je sors"
- **Problème:** ✅ Correct, pas de changement nécessaire
- **Nouveau:** "Je sors" (garder)

#### Description
- **Actuel:** "Définis une heure de retour. Un proche est prévenu si tu ne confirmes pas."
- **Problème:** ❌ Trop abrupt, "Un proche" est vague, manque de fluidité
- **Nouveau:** "Définis une heure de retour. Ton contact est prévenu automatiquement si tu ne confirmes pas ton retour."

**Raison:** Plus fluide, plus précis, plus naturel. "Ton contact" est plus personnel que "Un proche". "Automatiquement" et "ton retour" renforcent la clarté.

#### Bouton
- **Actuel:** "Commencer"
- **Problème:** ❌ Trop vague, ne décrit pas l'action réelle
- **Nouveau:** "Démarrer une sortie"

**Raison:** Plus explicite. L'utilisateur comprend immédiatement qu'il va créer une nouvelle sortie.

---

### SECTION 3: CARTE D'ÉTAT DE SÉCURITÉ

#### État actuel
- **Problème:** ❌ STATIQUE ET INCOMPLET
- Affiche "Sécurité active" si contact existe
- Affiche "Sécurité inactive" si contact n'existe pas
- Ne tient pas compte d'autres facteurs (téléphone vérifié, crédits, permissions)

#### Logique recommandée
La carte doit refléter dynamiquement l'état réel du système :

**Cas 1: Aucun contact configuré**
- **Titre:** "Sécurité inactive"
- **Sous-titre:** "Ajoute un contact d'urgence pour activer les alertes."
- **Action:** Aller aux paramètres

**Cas 2: Contact existe mais configuration incomplète**
- **Titre:** "Sécurité incomplète"
- **Sous-titre:** "Finalise la configuration pour activer les alertes."
- **Raisons possibles:**
  - Téléphone non vérifié
  - Crédits épuisés
  - Permissions manquantes (localisation)

**Cas 3: Tout est prêt**
- **Titre:** "Sécurité active"
- **Sous-titre:** "Tes alertes sont prêtes."
- **Conditions:**
  - Contact configuré ✅
  - Téléphone vérifié ✅
  - Crédits disponibles ✅

**Raison:** Transparence et clarté. L'utilisateur comprend immédiatement l'état réel de sa sécurité.

---

### SECTION 4: CARTE "CONSEIL DU JOUR"

#### Texte actuel
- **Actuel:** "Partage toujours ton heure de retour avec un proche de confiance."
- **Problème:** ❌ Trop moralisateur, pas assez naturel, redondant avec la promesse principale

#### Nouveau texte
- **Option 1:** "Un petit réflexe utile : fixe toujours une heure de retour."
- **Option 2:** "Pense à définir une heure de retour quand tu sors seul(e)."

**Raison:** Plus naturel, moins moralisateur, plus friendly. Le ton est plus conversationnel.

---

### SECTION 5: LOGIQUE DU CTA PRINCIPAL

#### État actuel
- **Problème:** ❌ LOGIQUE INCOMPLÈTE
- Si contact manque → rediriger vers settings
- Si tout est OK → aller vers new-session
- Pas de gestion des autres cas (téléphone non vérifié, crédits épuisés)

#### Logique recommandée
Le bouton "Démarrer une sortie" doit avoir un comportement clair selon les cas :

**Cas 1: Contact manquant**
- Afficher un message clair
- Rediriger vers la configuration contact

**Cas 2: Téléphone non vérifié**
- Afficher un message clair
- Lancer le flow OTP

**Cas 3: Crédits épuisés**
- Afficher un message clair
- Ouvrir le paywall

**Cas 4: Tout est prêt**
- Aller vers l'écran "Je sors" (new-session)

**Raison:** Meilleure UX. L'utilisateur ne se retrouve jamais bloqué sans savoir pourquoi.

---

### SECTION 6: CARTE "SORTIE EN COURS"

#### État actuel
- **Problème:** ✅ Correct, affiche bien le temps restant
- **Nouveau:** Garder la logique actuelle

**Raison:** La carte est bien conçue et utile. Pas de changement nécessaire.

---

## 🎯 Ambiguïtés Principales à Résoudre

| Ambiguïté | Avant | Après | Résultat |
|-----------|-------|-------|----------|
| Sous-titre | "Reste en sécurité, partout." (vague) | "Reste en sécurité, où que tu sois." | ✅ Plus naturel |
| Description carte | "Un proche est prévenu..." (vague) | "Ton contact est prévenu automatiquement..." | ✅ Plus clair |
| Bouton principal | "Commencer" (vague) | "Démarrer une sortie" | ✅ Plus explicite |
| État sécurité | Statique (contact ou pas) | Dynamique (3 états) | ✅ Plus transparent |
| Conseil du jour | Trop moralisateur | Plus naturel et friendly | ✅ Meilleur ton |
| Logique CTA | Incomplète | Complète avec tous les cas | ✅ Moins frustrant |

---

## 📊 Ton et Langage

### Critères à Appliquer

- ✅ **Clair:** Chaque action est explicite
- ✅ **Humain:** Utilisation de "tu", "ta", "ton" (tutoiement)
- ✅ **Rassurant:** Explications sur ce qui se passe
- ✅ **Non technique:** Pas de jargon
- ✅ **Cohérent:** Unifié avec mission de sécurité

### Exemples de Ton

**Avant (froid et vague):**
- "Reste en sécurité, partout."
- "Un proche est prévenu si tu ne confirmes pas."
- "Commencer"
- "Sécurité active / inactive"

**Après (humain et rassurant):**
- "Reste en sécurité, où que tu sois."
- "Ton contact est prévenu automatiquement si tu ne confirmes pas ton retour."
- "Démarrer une sortie"
- "Sécurité active / incomplète / inactive" avec messages explicites

---

## ✅ Résumé des Changements Nécessaires

1. **Sous-titre header:** "Reste en sécurité, partout." → "Reste en sécurité, où que tu sois."
2. **Description carte:** "Un proche est prévenu..." → "Ton contact est prévenu automatiquement..."
3. **Bouton:** "Commencer" → "Démarrer une sortie"
4. **Logique état sécurité:** Ajouter l'état "incomplète" et la logique dynamique
5. **Messages état sécurité:** Rendre les messages plus explicites et utiles
6. **Conseil du jour:** "Partage toujours..." → "Un petit réflexe utile..."
7. **Logique CTA:** Gérer tous les cas (contact, téléphone, crédits)

---

## 🔍 Prochaines Étapes

1. Appliquer le nouveau wording dans le code
2. Ajouter la logique dynamique pour l'état de sécurité
3. Corriger la logique du CTA principal
4. Tester avec des utilisateurs réels
