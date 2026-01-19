# SafeWalk V1 - TODO (Pop Bubble Design)

## Phase 1: Design System & Composants UI
- [x] Créer theme.dart (tokens, text styles)
- [x] Implémenter BubbleBackground (cercles flous décoratives)
- [x] Créer GlassCard/BubbleCard (cards translucides)
- [x] Implémenter HeroCardPremium (bubbles + rocket + gradient)
- [x] Créer CushionPillButton (boutons gonflés)
- [x] Implémenter StatusCard (success/warning + chevron)
- [x] Créer PopTextField (champs texte stylisés)
- [x] Implémenter SegmentedControlPill (10/15/30 min)
- [x] Créer BigSuccessButton (Je suis rentré - vert mint)
- [x] Implémenter ToastPop + Haptics + PressAnimation

## Phase 2: Navigation & Shell
- [x] Créer FloatingBottomNavCapsule (88-92% width, 64-72px height)
- [x] Implémenter navigation Stack + SafeArea
- [x] Configurer routes push (new-session, active-session, alert-sent, history)
- [x] Tester padding bottom sur tous les écrans

## Phase 3: Écran Home (Accueil)
- [x] Layout : "SafeWalk" + sous-titre
- [x] HeroCard violette avec rocket + "Je sors" + description
- [x] Bouton pill "Commencer"
- [x] StatusCard (✅ ou ⚠️)
- [x] Logique : Si contact non configuré → toast + redirect Settings
- [x] Pixel-perfect matching des maquettes

## Phase 4: Écran Settings (Paramètres) - AUTOSAVE
- [x] Card prénom (autosave)
- [x] Card contact nom + tel (autosave)
- [x] Segmented control tolérance 10/15/30 (autosave)
- [x] Toggle localisation (autosave)
- [x] Bouton danger "Supprimer mes données"
- [x] Toast confirmation autosave
- [x] Aucun bouton "Enregistrer"
- [x] Pixel-perfect matching

## Phase 5: Écran Je sors (New Session)
- [x] Title "Je sors" + sous-titre
- [x] Card "Heure limite" (02:30 format) + time picker modal
- [x] Card "Où vas-tu ? (optionnel)"
- [x] Card "Contact d'urgence" (nom + tel + icône appel)
- [x] Card "Localisation" (toggle)
- [x] CTA "Démarrer" (pill button)
- [x] Logique : Créer session, naviguer vers Active Session
- [x] Pixel-perfect matching

## Phase 6: Écran Sortie en cours (Active Session)
- [x] Title "Sortie en cours"
- [x] Card avec gros affichage "02:30"
- [x] Bouton vert "Je suis rentré" (BigSuccessButton)
- [x] Bouton "+15 min"
- [x] Bouton danger "Annuler ta sortie" + confirm modal
- [x] Logique : Confirmer retour, ajouter temps, annuler
- [x] Pixel-perfect matching
- [x] CORRECTION: Implémenter compte à rebours "Temps restant" (HH:MM:SS)
- [x] CORRECTION: Afficher "Heure limite" et "Tolérance" sous le timer
- [x] CORRECTION: Gérer l'état "En retard" quand remaining <= 0
- [x] CORRECTION: Réduire les espaces vides (gap 14-18px)
- [x] CORRECTION: Boutons visibles à opacité 1.0 + shadow

## Phase 7: Écran Alerte envoyée (Alert Sent)
- [x] Title "🚨 Alerte envoyée"
- [x] Recap + position si dispo
- [x] Bouton "Je vais bien"
- [x] Bouton "Appeler contact"
- [x] Bouton "Appeler 112"
- [x] Logique : Simulation alerte
- [x] Pixel-perfect matching

## Phase 8: Écran Historique (History)
- [x] Liste cards (date + statut ✅/🚨/⛔)
- [x] Tap sur card → détails
- [x] Scroll fluide
- [x] Pixel-perfect matching

## Phase 9: Logique Métier
- [x] Implémenter Settings local (AsyncStorage)
- [x] Créer Session model (id, dueTime, tolerance, note, status)
- [x] Implémenter GPS snapshot (si toggle ON)
- [x] Implémenter logique alerte (now > dueTime + tolerance)
- [x] Tester tous les flux

## Phase 10: QA & Finalisation
- [x] Vérifier spacing compact (pas de vides)
- [x] Tester responsive (iPhone SE / iPhone 13)
- [x] Haptics + press animations OK
- [x] Tous les écrans sans erreurs
- [ ] Créer checkpoint final avec timer corrigé
