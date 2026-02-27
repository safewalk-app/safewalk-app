# SafeWalk - Checklist de Test des Notifications

**Version:** V5.0
**Date:** 2026-02-26
**Statut:** À Tester

---

## 📋 Guide de Test

Pour chaque notification, vérifier:

- ✅ Le message s'affiche correctement
- ✅ Les variables sont remplacées (pas de `{variable}` visible)
- ✅ Le fallback est utilisé si variable manquante
- ✅ La durée est correcte (auto-dismiss ou persistant)
- ✅ Le type est correct (couleur, icône)
- ✅ Le mode d'affichage est correct (toast, banner, modal, alert)

---

## 🧪 Tests par Catégorie

### VOYAGE (Trip) - 5 notifications

#### ✅ trip.started

- **Clé:** `trip.started`
- **Type:** success
- **Display:** toast
- **Message:** "C'est noté, ta sortie a commencé."
- **Durée:** 2000ms
- **Test:** Démarrer une sortie dans new-session.tsx
- [ ] Message affiché correctement
- [ ] Toast disparaît après 2s
- [ ] Pas de variables à remplacer

#### ✅ trip.extended

- **Clé:** `trip.extended`
- **Type:** success
- **Display:** toast
- **Message:** "Ta sortie a été prolongée de {minutes} min."
- **Durée:** 2000ms
- **Variables:** minutes
- **Fallback:** 15
- **Test:** Prolonger une sortie dans active-session.tsx
- [ ] Message affiché avec minutes correcte (ex: "15 min")
- [ ] Toast disparaît après 2s
- [ ] Fallback "15" utilisé si variable manquante

#### ✅ trip.checked_in

- **Clé:** `trip.checked_in`
- **Type:** success
- **Display:** toast
- **Message:** "Ton retour a bien été confirmé."
- **Durée:** 2000ms
- **Test:** Cliquer "Je suis rentré" dans active-session.tsx
- [ ] Message affiché correctement
- [ ] Toast disparaît après 2s
- [ ] Pas de variables à remplacer

#### ✅ trip.stopped

- **Clé:** `trip.stopped`
- **Type:** success
- **Display:** toast
- **Message:** "Ta sortie a été arrêtée."
- **Durée:** 2000ms
- **Test:** Cliquer "Arrêter la sortie" dans active-session.tsx
- [ ] Message affiché correctement
- [ ] Toast disparaît après 2s
- [ ] Pas de variables à remplacer

#### ✅ trip.cancelled

- **Clé:** `trip.cancelled`
- **Type:** info
- **Display:** toast
- **Message:** "Ta sortie a été annulée."
- **Durée:** 2000ms
- **Test:** Annuler une sortie via confirmation
- [ ] Message affiché correctement
- [ ] Toast disparaît après 2s
- [ ] Pas de variables à remplacer

---

### ALERTES (Alert) - 4 notifications

#### ⚠️ alert.warning

- **Clé:** `alert.warning`
- **Type:** warning
- **Display:** banner
- **Message:** "Sans confirmation de ta part, {contactName} sera prévenu dans {minutes} min."
- **Durée:** 0 (persistant)
- **Variables:** contactName, minutes
- **Fallback:** contactName="ton contact", minutes="5"
- **Test:** Attendre 5 minutes avant deadline
- [ ] Banner affiché avec contactName correct
- [ ] Banner affiché avec minutes correct
- [ ] Banner persistant (ne disparaît pas)
- [ ] Fallback utilisé si variables manquantes

#### ✅ alert.sent

- **Clé:** `alert.sent`
- **Type:** success
- **Display:** toast
- **Message:** "{contactName} a bien été prévenu."
- **Durée:** 3000ms
- **Variables:** contactName
- **Fallback:** contactName="ton contact"
- **Test:** Alerte envoyée automatiquement
- [ ] Toast affiché avec contactName correct
- [ ] Toast disparaît après 3s
- [ ] Fallback utilisé si variable manquante

#### ❌ alert.failed

- **Clé:** `alert.failed`
- **Type:** error
- **Display:** banner
- **Message:** "On n'a pas réussi à envoyer l'alerte. Réessaie dès que possible."
- **Durée:** 0 (persistant)
- **Test:** Simuler erreur d'envoi d'alerte
- [ ] Banner affiché correctement
- [ ] Banner persistant
- [ ] Pas de variables à remplacer

#### 🚫 alert.quota_reached

- **Clé:** `alert.quota_reached`
- **Type:** critical
- **Display:** modal
- **Message:** "Tu as atteint la limite d'alertes pour aujourd'hui."
- **Durée:** 0 (persistant)
- **Test:** Dépasser le quota d'alertes
- [ ] Modal affiché correctement
- [ ] Modal persistant
- [ ] Pas de variables à remplacer

---

### SOS - 4 notifications

#### 📤 sos.sending

- **Clé:** `sos.sending`
- **Type:** critical
- **Display:** modal
- **Message:** "Envoi de l'alerte SOS..."
- **Durée:** 0 (persistant)
- **Test:** Déclencher SOS
- [ ] Modal affiché correctement
- [ ] Modal persistant pendant envoi
- [ ] Pas de variables à remplacer

#### ✅ sos.sent

- **Clé:** `sos.sent`
- **Type:** success
- **Display:** modal
- **Message:** "Alerte SOS envoyée. {contactName} a été prévenu."
- **Durée:** 3000ms
- **Variables:** contactName
- **Fallback:** contactName="ton contact"
- **Test:** SOS envoyé avec succès
- [ ] Modal affiché avec contactName correct
- [ ] Modal disparaît après 3s
- [ ] Fallback utilisé si variable manquante

#### ❌ sos.failed

- **Clé:** `sos.failed`
- **Type:** error
- **Display:** modal
- **Message:** "On n'a pas réussi à envoyer le SOS. Réessaie immédiatement."
- **Durée:** 0 (persistant)
- **Test:** Simuler erreur d'envoi SOS
- [ ] Modal affiché correctement
- [ ] Modal persistant
- [ ] Pas de variables à remplacer

#### 🚫 sos.quota_reached

- **Clé:** `sos.quota_reached`
- **Type:** critical
- **Display:** modal
- **Message:** "Tu as atteint la limite d'alertes SOS pour aujourd'hui."
- **Durée:** 0 (persistant)
- **Test:** Dépasser le quota SOS
- [ ] Modal affiché correctement
- [ ] Modal persistant
- [ ] Pas de variables à remplacer

---

### CONTACT - 4 notifications

#### ✅ contact.saved

- **Clé:** `contact.saved`
- **Type:** success
- **Display:** toast
- **Message:** "Contact sauvegardé."
- **Durée:** 2000ms
- **Test:** Sauvegarder un contact dans settings.tsx
- [ ] Toast affiché correctement
- [ ] Toast disparaît après 2s
- [ ] Pas de variables à remplacer

#### ✅ contact.deleted

- **Clé:** `contact.deleted`
- **Type:** info
- **Display:** toast
- **Message:** "Contact supprimé."
- **Durée:** 2000ms
- **Test:** Supprimer un contact dans settings.tsx
- [ ] Toast affiché correctement
- [ ] Toast disparaît après 2s
- [ ] Pas de variables à remplacer

#### 🚫 contact.missing

- **Clé:** `contact.missing`
- **Type:** error
- **Display:** modal
- **Message:** "Ajoute un contact d'urgence pour démarrer une sortie."
- **Durée:** 0 (persistant)
- **Test:** Essayer de démarrer sans contact
- [ ] Modal affiché correctement
- [ ] Modal persistant
- [ ] Bouton "Aller aux Paramètres" fonctionne

#### ❌ contact.invalid

- **Clé:** `contact.invalid`
- **Type:** error
- **Display:** toast
- **Message:** "Format invalide. Utilisez +33 suivi de 9 chiffres (ex: +33612345678)."
- **Durée:** 3000ms
- **Test:** Entrer un numéro invalide dans settings.tsx
- [ ] Toast affiché correctement
- [ ] Toast disparaît après 3s
- [ ] Pas de variables à remplacer

---

### AUTHENTIFICATION (Auth) - 4 notifications

#### 🚫 auth.otp_required

- **Clé:** `auth.otp_required`
- **Type:** error
- **Display:** modal
- **Message:** "Vérifie ton numéro pour activer les alertes SMS."
- **Durée:** 0 (persistant)
- **Test:** Essayer de démarrer sans OTP
- [ ] Modal affiché correctement
- [ ] Modal persistant
- [ ] Bouton "Vérifier maintenant" fonctionne

#### ✅ auth.otp_sent

- **Clé:** `auth.otp_sent`
- **Type:** success
- **Display:** toast
- **Message:** "Code OTP envoyé par SMS."
- **Durée:** 2000ms
- **Test:** Demander OTP dans phone-verification.tsx
- [ ] Toast affiché correctement
- [ ] Toast disparaît après 2s
- [ ] Pas de variables à remplacer

#### ✅ auth.otp_verified

- **Clé:** `auth.otp_verified`
- **Type:** success
- **Display:** toast
- **Message:** "Numéro vérifié ! Tu peux maintenant démarrer une sortie."
- **Durée:** 2000ms
- **Test:** Vérifier OTP correctement
- [ ] Toast affiché correctement
- [ ] Toast disparaît après 2s
- [ ] Pas de variables à remplacer

#### ❌ auth.otp_failed

- **Clé:** `auth.otp_failed`
- **Type:** error
- **Display:** toast
- **Message:** "Code OTP invalide. Réessaie."
- **Durée:** 3000ms
- **Test:** Entrer OTP invalide
- [ ] Toast affiché correctement
- [ ] Toast disparaît après 3s
- [ ] Pas de variables à remplacer

---

### CRÉDITS - 3 notifications

#### 🚫 credits.empty

- **Clé:** `credits.empty`
- **Type:** error
- **Display:** modal
- **Message:** "Tu as atteint la limite d'aujourd'hui. Ajoute des crédits pour continuer."
- **Durée:** 0 (persistant)
- **Test:** Dépasser le quota de crédits
- [ ] Modal affiché correctement
- [ ] Modal persistant
- [ ] Pas de variables à remplacer

#### ⚠️ credits.low

- **Clé:** `credits.low`
- **Type:** warning
- **Display:** banner
- **Message:** "Il te reste {remaining} alertes avant la limite."
- **Durée:** 0 (persistant)
- **Variables:** remaining
- **Fallback:** remaining="1"
- **Test:** Avoir peu de crédits restants
- [ ] Banner affiché avec remaining correct
- [ ] Banner persistant
- [ ] Fallback utilisé si variable manquante

#### ✅ credits.added

- **Clé:** `credits.added`
- **Type:** success
- **Display:** toast
- **Message:** "Crédits ajoutés. Tu peux continuer."
- **Durée:** 2000ms
- **Test:** Ajouter des crédits
- [ ] Toast affiché correctement
- [ ] Toast disparaît après 2s
- [ ] Pas de variables à remplacer

---

### PERMISSIONS - 3 notifications

#### 🚫 permission.location_required

- **Clé:** `permission.location_required`
- **Type:** error
- **Display:** modal
- **Message:** "Active la localisation dans Paramètres pour partager ta position en cas d'alerte."
- **Durée:** 0 (persistant)
- **Test:** Essayer de démarrer sans localisation
- [ ] Modal affiché correctement
- [ ] Modal persistant
- [ ] Bouton "Aller aux Paramètres" fonctionne

#### ⚠️ permission.notifications_required

- **Clé:** `permission.notifications_required`
- **Type:** warning
- **Display:** banner
- **Message:** "Active les notifications pour recevoir les alertes."
- **Durée:** 0 (persistant)
- **Test:** Notifications désactivées
- [ ] Banner affiché correctement
- [ ] Banner persistant
- [ ] Pas de variables à remplacer

#### 🚫 permission.phone_required

- **Clé:** `permission.phone_required`
- **Type:** error
- **Display:** modal
- **Message:** "Ajoute un numéro de téléphone pour activer les alertes SMS."
- **Durée:** 0 (persistant)
- **Test:** Essayer de démarrer sans numéro
- [ ] Modal affiché correctement
- [ ] Modal persistant
- [ ] Bouton "Aller aux Paramètres" fonctionne

---

### ERREURS - 3 notifications

#### ❌ error.network

- **Clé:** `error.network`
- **Type:** error
- **Display:** banner
- **Message:** "Pas de connexion internet. Réessaie dès que possible."
- **Durée:** 0 (persistant)
- **Test:** Désactiver internet et essayer une action
- [ ] Banner affiché correctement
- [ ] Banner persistant
- [ ] Pas de variables à remplacer

#### ❌ error.sms_failed

- **Clé:** `error.sms_failed`
- **Type:** error
- **Display:** banner
- **Message:** "Impossible d'envoyer le SMS. Réessaiera automatiquement."
- **Durée:** 0 (persistant)
- **Test:** Simuler erreur SMS
- [ ] Banner affiché correctement
- [ ] Banner persistant
- [ ] Pas de variables à remplacer

#### ❌ error.unknown

- **Clé:** `error.unknown`
- **Type:** error
- **Display:** modal
- **Message:** "Une erreur est survenue. Réessaie."
- **Durée:** 0 (persistant)
- **Test:** Simuler erreur inconnue
- [ ] Modal affiché correctement
- [ ] Modal persistant
- [ ] Pas de variables à remplacer

---

### SMS - 2 notifications

#### ✅ sms.test_sent

- **Clé:** `sms.test_sent`
- **Type:** success
- **Display:** toast
- **Message:** "SMS de test envoyé à {phone}."
- **Durée:** 2000ms
- **Variables:** phone
- **Fallback:** phone="ton numéro"
- **Test:** Envoyer SMS de test dans settings.tsx
- [ ] Toast affiché avec phone correct
- [ ] Toast disparaît après 2s
- [ ] Fallback utilisé si variable manquante

#### ❌ sms.test_failed

- **Clé:** `sms.test_failed`
- **Type:** error
- **Display:** toast
- **Message:** "Impossible d'envoyer le SMS de test. Réessaie."
- **Durée:** 3000ms
- **Test:** Simuler erreur d'envoi SMS de test
- [ ] Toast affiché correctement
- [ ] Toast disparaît après 3s
- [ ] Pas de variables à remplacer

---

### CONFIRMATIONS - 3 notifications

#### confirm.stop_trip

- **Clé:** `confirm.stop_trip`
- **Type:** info
- **Display:** modal
- **Message:** "Êtes-vous sûr de vouloir annuler cette sortie ?"
- **Durée:** 0 (persistant)
- **Test:** Cliquer "Arrêter la sortie"
- [ ] Modal affiché correctement
- [ ] Boutons "Annuler" et "Confirmer" fonctionnent
- [ ] Pas de variables à remplacer

#### confirm.delete_data

- **Clé:** `confirm.delete_data`
- **Type:** critical
- **Display:** modal
- **Message:** "Supprimer toutes les données ? Cette action est irréversible."
- **Durée:** 0 (persistant)
- **Test:** Cliquer "Supprimer mes données"
- [ ] Modal affiché correctement
- [ ] Boutons "Annuler" et "Confirmer" fonctionnent
- [ ] Pas de variables à remplacer

#### confirm.trigger_sos

- **Clé:** `confirm.trigger_sos`
- **Type:** critical
- **Display:** modal
- **Message:** "Êtes-vous en danger ? Cette action alertera vos contacts d'urgence."
- **Durée:** 0 (persistant)
- **Test:** Appui long sur bouton SOS
- [ ] Modal affiché correctement
- [ ] Boutons "Annuler" et "Confirmer" fonctionnent
- [ ] Pas de variables à remplacer

---

## 📊 Résumé du Test

| Catégorie  | Total  | Testées | Passées | Échouées |
| ---------- | ------ | ------- | ------- | -------- |
| Trip       | 5      | 0       | 0       | 0        |
| Alert      | 4      | 0       | 0       | 0        |
| SOS        | 4      | 0       | 0       | 0        |
| Contact    | 4      | 0       | 0       | 0        |
| Auth       | 4      | 0       | 0       | 0        |
| Credits    | 3      | 0       | 0       | 0        |
| Permission | 3      | 0       | 0       | 0        |
| Error      | 3      | 0       | 0       | 0        |
| SMS        | 2      | 0       | 0       | 0        |
| Confirm    | 3      | 0       | 0       | 0        |
| **TOTAL**  | **40** | **0**   | **0**   | **0**    |

---

## 🚀 Prochaines Étapes

1. **Refactoriser les écrans** - Utiliser le système centralisé
2. **Refactoriser les services** - Utiliser le système centralisé
3. **Tester chaque notification** - Cocher les cases
4. **Documenter les cas d'usage** - Guide pour les développeurs

---

**Fin de la checklist de test**
