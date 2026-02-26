# Audit UX/Wording - Écran "Je sors" (new-session.tsx)

## État Actuel vs. Problèmes Identifiés

### SECTION 1: TITRE ET SOUS-TITRE

#### Titre principal
- **Actuel:** "Je sors"
- **Problème:** ✅ Correct, pas de changement nécessaire
- **Nouveau:** "Je sors" (garder)

#### Sous-titre
- **Actuel:** "Définis une heure de retour. Un proche est prévenu si tu ne confirmes pas."
- **Problème:** ❌ Trop long, peu naturel, "Un proche" est vague
- **Nouveau:** "Tu penses rentrer vers quelle heure ?"

**Raison:** Plus naturel, plus humain, plus court. Le "contrat utilisateur" sera explicité dans les microcopies.

---

### SECTION 2: BLOC HEURE

#### Label du bloc
- **Actuel:** "Heure limite"
- **Problème:** ❌ Trop froid, technique, ambigu (limite de quoi ?)
- **Nouveau:** "Retour prévu"

#### Microcopy sous l'heure
- **Actuel:** ❌ MANQUANTE
- **Problème:** L'utilisateur ne comprend pas le rôle de cette heure
- **Nouveau:** "Si tu ne confirmes pas ton retour, ton contact sera prévenu automatiquement."

**Raison:** Explicite le "contrat utilisateur" - pourquoi cette heure est importante.

---

### SECTION 3: BLOC DESTINATION

#### Label du bloc
- **Actuel:** "Note (optionnel)"
- **Problème:** ❌ Ambigu - "Note" peut signifier n'importe quoi
- **Nouveau:** "Où vas-tu ? (optionnel)"

#### Placeholder
- **Actuel:** "Ex: Je vais à la gym, puis au café..."
- **Problème:** ✅ Correct, mais peut être amélioré
- **Nouveau:** "Ex. Soirée chez Karim" (plus court, plus naturel)

**Raison:** "Où vas-tu ?" est plus clair que "Note". L'utilisateur comprend immédiatement qu'il peut décrire sa destination.

---

### SECTION 4: BLOC CONTACT D'URGENCE

#### État actuel
- **Problème:** ❌ MANQUANT COMPLÈTEMENT
- L'écran n'affiche pas le contact d'urgence configuré
- L'utilisateur ne sait pas qui sera prévenu
- Aucune indication si le contact est configuré ou non

#### Nouveau bloc à ajouter
- **Label:** "Contact d'urgence"
- **Contenu si configuré:** Afficher le nom et numéro du contact
- **Microcopy:** "Cette personne recevra une alerte si tu ne confirmes pas ton retour."
- **État si non configuré:** "Ajoute un contact d'urgence pour activer les alertes." (lien vers settings)

**Raison:** Crucial pour la transparence. L'utilisateur doit savoir qui sera prévenu.

---

### SECTION 5: BLOC LOCALISATION

#### État actuel
- **Problème:** ❌ MANQUANT COMPLÈTEMENT
- L'écran ne montre pas l'état de la localisation
- L'utilisateur ne sait pas si sa position sera partagée
- Aucun contrôle visible sur le partage de position

#### Nouveau bloc à ajouter
- **Label:** "Partager ma position en cas d'alerte"
- **Type:** Toggle (switch)
- **État:** Refléter le paramètre de settings.locationEnabled
- **Microcopy:** "Ta position n'est envoyée qu'en cas d'alerte."
- **Si désactivé:** "La localisation est désactivée. Tu peux continuer sans elle."

**Raison:** Transparence et contrôle. L'utilisateur doit voir et contrôler le partage de position.

---

### SECTION 6: BOUTON PRINCIPAL

#### Label du bouton
- **Actuel:** "Commencer"
- **Problème:** ❌ Trop vague, peu explicite
- **Nouveau:** "Démarrer la sortie"

#### États du bouton
- **Actuel:** Affiche "Attendre Xs" pendant le cooldown
- **Problème:** ❌ Pas de messages d'erreur explicites si blocage
- **Nouveau:** Afficher des messages clairs selon le blocage:
  - "Ajoute un contact d'urgence pour continuer."
  - "Vérifie ton numéro pour activer les alertes."
  - "Tu n'as plus d'alertes disponibles."
  - "Un abonnement est nécessaire pour continuer."

---

### SECTION 7: LOGIQUE DE BLOCAGE

#### État actuel
- **Problème:** ❌ Blocages affichés via notifications externes
- L'utilisateur ne voit pas pourquoi le bouton ne fonctionne pas
- Les messages de blocage ne sont pas contextuels à l'écran

#### Nouveau comportement
- **Contact manquant:** Afficher un message clair + bouton "Aller aux Paramètres"
- **Numéro non vérifié:** Afficher un message clair + bouton "Vérifier maintenant"
- **Crédits à 0:** Afficher un message clair + bouton "Ajouter des crédits"
- **GPS désactivé:** Afficher un avertissement, mais autoriser quand même le démarrage
- **Tout OK:** Bouton actif, prêt à démarrer

**Raison:** Meilleure UX - l'utilisateur comprend immédiatement pourquoi il ne peut pas continuer.

---

## 🎯 Ambiguïtés Principales à Résoudre

| Ambiguïté | Avant | Après | Résultat |
|-----------|-------|-------|----------|
| Rôle de l'heure | "Heure limite" (vague) | "Retour prévu" + microcopy | ✅ Clair |
| Destination | "Note (optionnel)" (ambigu) | "Où vas-tu ? (optionnel)" | ✅ Clair |
| Contact prévenu | ❌ Pas affiché | Bloc "Contact d'urgence" avec nom/numéro | ✅ Transparent |
| Partage position | ❌ Pas visible | Toggle "Partager ma position en cas d'alerte" | ✅ Contrôlé |
| Pourquoi blocage ? | Notification externe | Message clair sur le bouton | ✅ Contextuel |
| Bouton principal | "Commencer" (vague) | "Démarrer la sortie" | ✅ Explicite |

---

## 📊 Ton et Langage

### Critères à Appliquer

- ✅ **Clair:** Chaque action est explicite
- ✅ **Humain:** Utilisation de "tu", "ta", "ton" (tutoiement)
- ✅ **Rassurant:** Explications sur ce qui se passe
- ✅ **Non technique:** Pas de jargon
- ✅ **Cohérent:** Unifié avec mission de sécurité

### Exemples de Ton

**Avant (froid):**
- "Heure limite"
- "Note (optionnel)"
- "Commencer"

**Après (humain et rassurant):**
- "Retour prévu" + "Si tu ne confirmes pas ton retour, ton contact sera prévenu automatiquement."
- "Où vas-tu ? (optionnel)" + "Ex. Soirée chez Karim"
- "Démarrer la sortie"

---

## ✅ Résumé des Changements Nécessaires

1. **Sous-titre:** "Définis une heure..." → "Tu penses rentrer vers quelle heure ?"
2. **Label heure:** "Heure limite" → "Retour prévu"
3. **Microcopy heure:** AJOUTÉE - "Si tu ne confirmes pas ton retour..."
4. **Label destination:** "Note (optionnel)" → "Où vas-tu ? (optionnel)"
5. **Placeholder destination:** Garder "Ex. Soirée chez Karim"
6. **Bloc contact:** AJOUTÉ - Afficher le contact configuré + microcopy
7. **Bloc localisation:** AJOUTÉ - Toggle + microcopy
8. **Bouton:** "Commencer" → "Démarrer la sortie"
9. **Logique blocage:** Afficher des messages clairs sur le bouton
10. **Feedback:** Messages d'erreur contextuels et rassurants

---

## 🔍 Prochaines Étapes

1. Appliquer le nouveau wording dans le code
2. Ajouter les blocs manquants (contact, localisation)
3. Corriger la logique de blocage
4. Tester avec des utilisateurs réels
