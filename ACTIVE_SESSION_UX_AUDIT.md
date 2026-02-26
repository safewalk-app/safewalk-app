# Audit UX/Wording - Écran "Sortie active" (active-session.tsx)

## État Actuel vs. Problèmes Identifiés

### SECTION 1: TITRE PRINCIPAL

#### Titre
- **Actuel:** "Sortie en cours"
- **Problème:** ✅ Correct, pas de changement nécessaire
- **Nouveau:** "Sortie en cours" (garder)

---

### SECTION 2: CARTE TIMER

#### Label du timer
- **Actuel:** "Temps avant retour" / "Période de grâce" / "En retard depuis"
- **Problème:** ✅ Correct, labels dynamiques selon l'état
- **Nouveau:** Garder les labels actuels

#### Informations détaillées
- **Actuel:** "Heure limite (retour prévu)" et "Heure d'alerte"
- **Problème:** ❌ Trop technique, pas assez naturel
- **Nouveau:** 
  - "Retour prévu:" (au lieu de "Heure limite (retour prévu)")
  - "Alerte à:" (au lieu de "Heure d'alerte")

**Raison:** Plus naturel et cohérent avec l'écran Home ("Retour prévu").

#### Messages d'état
- **Actuel (grace):** "⚠️ Vous êtes en retard par rapport à votre heure limite. L'alerte sera déclenchée à {deadlineStr}."
- **Problème:** ❌ Trop formel ("Vous"), trop technique
- **Nouveau:** "⚠️ Tu es en retard. L'alerte sera déclenchée à {deadlineStr}."

- **Actuel (overdue):** "🚨 Alerte déclenchée ! Vos contacts d'urgence ont été notifiés."
- **Problème:** ❌ Trop formel ("Vos"), pas assez rassurant
- **Nouveau:** "🚨 Alerte déclenchée ! Ton contact a été prévenu."

**Raison:** Plus humain, plus rassurant, cohérent avec le ton de l'app.

---

### SECTION 3: BANNIÈRE GPS

#### État actuel
- **Actuel:** "Suivi GPS actif" / "Erreur GPS" / "Suivi GPS inactif"
- **Problème:** ✅ Correct, labels dynamiques
- **Nouveau:** Garder les labels actuels

#### Message d'alerte GPS
- **Actuel:** "Position GPS active" / "Position GPS désactivée"
- **Problème:** ❌ Trop technique, pas assez naturel
- **Nouveau:**
  - Activée: "Ta position est partagée en cas d'alerte."
  - Désactivée: "Activate la localisation dans Paramètres pour partager ta position en cas d'alerte."

**Raison:** Plus naturel, plus cohérent avec l'écran Home.

---

### SECTION 4: BANNIÈRE RÉSEAU

#### État actuel
- **Actuel:** "Aucune connexion Internet" + "L'alerte SMS ne pourra pas être envoyée. Vérifiez votre connexion WiFi ou cellulaire."
- **Problème:** ❌ Trop formel ("Vérifiez"), trop technique
- **Nouveau:** "Aucune connexion Internet. L'alerte SMS ne pourra pas être envoyée. Vérifie ta connexion WiFi ou cellulaire."

**Raison:** Plus naturel, tutoiement cohérent.

---

### SECTION 5: BOUTONS D'ACTION

#### Bouton "Je suis rentré"
- **Actuel:** "✅ Je suis rentré"
- **Problème:** ✅ Correct, pas de changement nécessaire
- **Nouveau:** "✅ Je suis rentré" (garder)

#### Bouton "Prolonger"
- **Actuel:** "+ 15 min"
- **Problème:** ❌ Trop vague, pas explicite
- **Nouveau:** "Prolonger de 15 min"

**Raison:** Plus explicite sur l'action.

#### Bouton SOS
- **Actuel:** "SOS" (avec long press 2s)
- **Problème:** ✅ Correct, pas de changement nécessaire
- **Nouveau:** "SOS" (garder)

#### Bouton "Annuler la sortie"
- **Actuel:** "Annuler la sortie"
- **Problème:** ✅ Correct, pas de changement nécessaire
- **Nouveau:** "Annuler la sortie" (garder)

---

### SECTION 6: MESSAGES D'ALERTE

#### Confirmation SOS
- **Actuel:** "Declencher SOS ?" + "Etes-vous en danger ? Cette action alertera vos contacts d'urgence."
- **Problème:** ❌ Trop formel ("Etes-vous"), typo ("Declencher")
- **Nouveau:** "Déclencher SOS ?" + "Es-tu en danger ? Cette action alertera ton contact d'urgence."

**Raison:** Plus naturel, tutoiement cohérent, correction typo.

#### Confirmation annulation
- **Actuel:** "Annuler la sortie ?" + "Êtes-vous sûr de vouloir annuler cette sortie ?"
- **Problème:** ❌ Trop formel ("Êtes-vous")
- **Nouveau:** "Annuler la sortie ?" + "Es-tu sûr de vouloir annuler cette sortie ?"

**Raison:** Plus naturel, tutoiement cohérent.

---

### SECTION 7: NOTIFICATIONS

#### Notification extension
- **Actuel:** "✅ +15 minutes ajoutées" + "Nouvelle heure limite : {time}"
- **Problème:** ❌ Trop technique ("Nouvelle heure limite")
- **Nouveau:** "✅ +15 minutes ajoutées" + "Nouveau retour prévu : {time}"

**Raison:** Plus naturel, cohérent avec le vocabulaire de l'app.

#### Notification confirmation
- **Actuel:** "✅ Contact rassuré" + "{contactName} a été informé que vous êtes bien rentré"
- **Problème:** ❌ Trop formel ("vous")
- **Nouveau:** "✅ Contact rassuré" + "{contactName} a été informé que tu es bien rentré"

**Raison:** Plus naturel, tutoiement cohérent.

---

## 🎯 Ambiguïtés Principales à Résoudre

| Ambiguïté | Avant | Après | Résultat |
|-----------|-------|-------|----------|
| Labels timer | Corrects | Garder | ✅ OK |
| Infos détaillées | "Heure limite" (technique) | "Retour prévu" | ✅ Plus naturel |
| Message grace | "Vous êtes en retard" (formel) | "Tu es en retard" | ✅ Plus humain |
| Message overdue | "Vos contacts" (formel) | "Ton contact" | ✅ Plus rassurant |
| Alerte GPS | Trop technique | Plus naturel | ✅ Plus clair |
| Bouton prolonger | "+ 15 min" (vague) | "Prolonger de 15 min" | ✅ Plus explicite |
| Alerte SOS | Trop formel | Plus naturel | ✅ Plus humain |
| Notification | "Nouvelle heure limite" (technique) | "Nouveau retour prévu" | ✅ Plus naturel |

---

## 📊 Ton et Langage

### Critères à Appliquer

- ✅ **Clair:** Chaque action est explicite
- ✅ **Humain:** Tutoiement cohérent ("tu", "ta", "ton")
- ✅ **Rassurant:** Explications sur ce qui se passe
- ✅ **Non technique:** Pas de jargon
- ✅ **Cohérent:** Unifié avec Home et autres écrans

### Exemples de Ton

**Avant (formel et technique):**
- "Vous êtes en retard par rapport à votre heure limite."
- "Vos contacts d'urgence ont été notifiés."
- "Heure limite (retour prévu)"
- "Nouvelle heure limite"

**Après (humain et naturel):**
- "Tu es en retard."
- "Ton contact a été prévenu."
- "Retour prévu"
- "Nouveau retour prévu"

---

## ✅ Résumé des Changements Nécessaires

1. **Labels timer:** Garder les labels actuels (dynamiques)
2. **Infos détaillées:** "Heure limite" → "Retour prévu" + "Heure d'alerte" → "Alerte à"
3. **Message grace:** Tutoiement + plus court
4. **Message overdue:** Tutoiement + plus rassurant
5. **Alerte GPS:** Plus naturel et cohérent
6. **Bannière réseau:** Tutoiement
7. **Bouton prolonger:** "+ 15 min" → "Prolonger de 15 min"
8. **Alerte SOS:** Tutoiement + correction typo
9. **Alerte annulation:** Tutoiement
10. **Notifications:** Tutoiement + vocabulaire cohérent

---

## 🔍 Prochaines Étapes

1. Appliquer le nouveau wording dans le code
2. Corriger les messages d'alerte
3. Tester avec des utilisateurs réels
