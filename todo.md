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


## FIX GLOBAL UI/UX (Manus Feedback)

### Règles générales
- [x] Réduire tous les vides (padding 16-18px, gaps 12-16px max)
- [x] Cards: opacity 0.94 + radius 28-32 + shadow soft
- [x] Boutons actifs: opacity 1.0 + shadow, désactivés: opacity 0.45
- [x] Tous les CTA doivent être bien visibles et en relief

### Écran "Je sors" (New Session)
- [x] Regrouper les cards avec gaps 12px
- [x] Bouton "Démarrer" sticky en bas (proche des cards)
- [x] Texte "Localisation" plus petit et sur 2 lignes max
- [x] Supprimer zones vides inutiles

### Écran "Sortie en cours" (Active Session)
- [x] Vérifier opacité des boutons (1.0 + shadow)
- [x] Card timer moins haute (py-6 au lieu de py-8)
- [x] Bloc boutons collé sous la card (gap 14-18)

### Écran Home
- [x] Ajouter mini card "📍 Sortie en cours" si session active
- [x] Tap sur mini card -> ouvre Active Session
- [x] Afficher uniquement si session active


## FINAL POLISH (Manus - Premium Mock)

### Active Session - CTA Pop
- [x] Bouton "✅ Je suis rentré": opacity 1.0, shadow soft, height 62-70, radius 30+
- [x] Bouton "+ 15 min": opacity 1.0, fond violet clair, shadow léger
- [x] Jamais opacity < 0.8 sur bouton actif
- [x] Card timer moins haute (réduire py)
- [x] Bloc boutons collé sous card (gap 14-18)

### Home - Mini Card Sortie en cours
- [x] Afficher mini card avec temps restant: "Temps restant: HH:MM:SS"
- [x] Tap sur mini card -> ouvre Active Session
- [x] Afficher uniquement si session active
- [x] Remplir l'espace vide + améliorer UX


## MENU OBLIGATOIRE PARTOUT (Nested Navigator + AppShell)

### Architecture
- [x] Créer AppShell avec nested Navigator
- [x] FloatingBottomNavCapsule en overlay (Positioned bottom)
- [x] Routes internes: /home, /settings, /new-session, /active-session, /alert-sent, /history
- [x] Bottom nav: 2 tabs (Accueil, Paramètres)

### Implémentation
- [x] Refactoriser _layout.tsx pour utiliser AppShell
- [x] Ajouter padding bottom sur tous les écrans
- [x] Tester navigation sur tous les écrans
- [x] Vérifier que la capsule reste visible partout

### QA
- [x] Screenshots: home, settings, new-session, active-session avec menu visible
- [x] Vérifier que le menu ne cache pas le contenu
- [x] Tester les transitions entre écrans


## PIXEL RULES EXACTES (Anti "trop d'espace")

### Global Layout
- [x] Screen padding horizontal: 16
- [x] Screen padding top: 12
- [x] Section gap standard: 12
- [x] Small gap: 8
- [x] Large gap max: 16 (INTERDIT au-delà)
- [x] Bottom spacer minimal: 8-12

### Bottom Nav Capsule
- [x] Height: 68
- [x] Side margin: 18
- [x] Bottom margin: 12
- [x] Content bottom padding: 68 + 12 + safeAreaBottom + 8

### Glass Card
- [x] Radius: 28
- [x] Padding H: 16
- [x] Padding V: 14 (max)
- [x] Shadow: y=10 blur=35 opacity 0.10
- [x] Title font: 16-18 semibold
- [x] Subtitle font: 13-14 regular

### Home Screen
- [x] "SafeWalk" font: 34-36 bold
- [x] Subtitle font: 15
- [x] HeroCard height: 230-250
- [x] HeroCard padding: 18
- [x] "Je sors" font: 34-36
- [x] Bouton "Commencer" height: 52, radius: 26
- [x] Gap hero -> status: 12
- [x] StatusCard height: 74-82
- [x] Mini card "Sortie en cours" height: 74-82

### Je Sors Screen
- [x] Title: 32-34 bold
- [x] Subtitle: 15 regular
- [x] Card "Heure limite" height: 92-104
- [x] Value "02:30" font: 40-44 bold
- [x] Card "Où vas-tu" height: 74-82
- [x] Card "Contact" height: 84-92
- [x] Card "Localisation" height: 84-96
- [x] CTA "Démarrer" height: 60, radius: 30
- [x] Gap au-dessus bouton: 12-16

### Sortie en Cours Screen
- [x] Title: 32-34
- [x] Card timer height: 200-230 (max)
- [x] Label "Temps restant" font: 14
- [x] Countdown font: 64-72 bold
- [x] Gap card -> boutons: 16
- [x] Bouton "Je suis rentré" height: 62, radius: 31, opacity: 1.0
- [x] Bouton "+ 15 min" height: 48-52, radius: 24-26
- [x] "Annuler" marginTop: 10-12


## REFACTOR FINAL (UX type Uber)

### Navigation Architecture
- [x] Menu capsule visible UNIQUEMENT sur /home et /settings
- [x] Écrans flow SANS menu: /new-session, /active-session, /alert-sent, /history
- [x] AppShell contient seulement HomeScreen + SettingsScreen
- [x] Navigation vers flow via Navigator.push depuis AppShell
- [x] Écrans flow ont leur propre Scaffold plein écran

### Home/Settings (avec menu)
- [x] Capsule flottante visible
- [x] Padding bottom = navHeight + safeArea + 10
- [x] Comportement identique au mock

### Flow Screens (sans menu)
- [x] /new-session: PAS de capsule, CTA "Démarrer" sticky bottom
- [x] /active-session: PAS de capsule, boutons sticky bottom
- [x] /alert-sent: PAS de capsule, plein écran
- [x] /history: PAS de capsule, plein écran
- [x] Contenu compact en haut, pas de désert
- [x] CTA sticky bottom autorisé

### QA & Screenshots
- [x] Screenshot 1: Home avec menu capsule
- [x] Screenshot 2: Paramètres avec menu capsule
- [x] Screenshot 3: Je sors SANS menu + bouton sticky
- [x] Screenshot 4: Sortie en cours SANS menu + boutons sticky


## CORRECTION ESPACES + STRUCTURE (FINAL)

### Règles Globales
- [x] Supprimer tous les Spacer()
- [x] Supprimer tous les Expanded()
- [x] Supprimer MainAxisAlignment.spaceBetween/center
- [x] Supprimer SizedBox(height > 20) sans justification
- [x] Utiliser SingleChildScrollView + padding compact

### Je Sors (New Session)
- [x] Restructurer avec SingleChildScrollView
- [x] Padding: 16 horizontal, 12 top, bottomPadding = CTA_HEIGHT + safeArea + 12
- [x] CTA "Démarrer" sticky via bottomSheet (Positioned)
- [x] Zéro vide artificiel
- [x] SafeArea top correct (titre pas coupé)

### Paramètres (Settings)
- [x] Restructurer avec SingleChildScrollView
- [x] Ajouter section "Infos" en bas:
  - Card "Confidentialité"
  - Card "Version" (v1.0.0)
  - Card "Support" (contact@email)
- [x] Bouton "Supprimer mes données" pas isolé au milieu
- [x] Bottom padding = safeArea + 16

### Home
- [x] Ajouter contenu utile sous "Sécurité active":
  - Si session active: mini card "Sortie en cours" + temps restant
  - Sinon: mini card "Conseil sécurité du jour"
- [x] Remplir l'espace avec contenu léger et utile
- [x] Pas de désert blanc

### QA & Screenshots
- [x] Screenshot Home sans désert
- [x] Screenshot Paramètres avec section Infos
- [x] Screenshot Je sors avec CTA sticky


## FIX ÉCRAN "SORTIE EN COURS" (Trop d'espace + Boutons invisibles)

### Problème actuel
- [x] Énorme vide entre card timer et actions
- [x] Boutons trop bas et en opacity faible
- [x] Spacer/Expanded qui pousse les boutons en bas

### Objectif: Layout compact
- [x] Card timer en haut (height 200-230 max)
- [x] Bouton "Je suis rentré" juste sous la card (visible, opacity 1.0)
- [x] "+15 min" + "Annuler la sortie" juste dessous (gap 12)
- [x] Pas de désert blanc

### Structure obligatoire
- [x] Utiliser SingleChildScrollView + Column (pas de Spacer/Expanded)
- [x] Padding: 16H, 12T, bottomPadding = safeArea + 16
- [x] MainAxisAlignment.start (pas center/spaceBetween)
- [x] Jamais opacity < 0.9 sur boutons actifs

### Boutons
- [x] "Je suis rentré": opacity 1.0, height 62, radius 31, shadow visible
- [x] "+15 min": opacity 1.0, height 50, radius 25
- [x] "Annuler la sortie": opacity 1.0, height 50, radius 25
- [x] Gap entre boutons: 12px

### QA
- [x] Screenshot après correction
- [x] Vérifier pas de vide artificiel
- [x] Tous les boutons visibles et actifs


## REFAIRE ÉCRAN "SORTIE EN COURS" EXACTEMENT COMME LE MOCK

### Structure visuelle (ordre exact)
- [x] Titre en haut: "Sortie en cours" (H1)
- [x] Petite pill card sous titre: "😊 Tu foras après" (fine)
- [x] Grosse card principale (timer card) au centre:
  - Header "🌚 Heure limite"
  - Grand chiffre au centre (02:30)
  - Sous-bloc info: "Heure limite : 02:30" + "Tolérance : 15 min"
  - Bouton vert dans la card: "✅ Je suis rentré"
- [x] Sous la grande card: 2 boutons en ligne (mêmes largeurs):
  - Gauche: "+ 15 min" (secondary)
  - Droite: "Annuler la sortie" (danger outline + icône ⚠️)
- [x] En bas: menu capsule (Accueil / Paramètres) visible

### Règles de layout
- [x] PAS de Spacer(), PAS de Expanded()
- [x] PAS de MainAxisAlignment.spaceBetween
- [x] Tout compact, centré en haut, gaps constants

### Spacing target
- [x] Title top padding: safeAreaTop + 8
- [x] Gap titre -> pill: 12
- [x] Gap pill -> timer card: 16
- [x] Gap timer card -> row buttons: 14
- [x] Gap row buttons -> nav capsule: 18
- [x] Aucun padding vertical excessif

### Composants
- [x] TimerCard: radius 28-32, padding 16, timer font 64-72, bouton vert height 56-60
- [x] Row buttons: height 50-54, radius 18-22, gap 12
- [x] Bouton danger: outline (gris clair + texte rouge) + icône warning

### QA
- [x] Screenshot final identique au mock
- [x] Pas de désert blanc
- [x] Grande card tient dans l'écran sans scroll (iPhone 13/14)
- [x] Capsule bottom nav collée au bas (floating) sans pousser contenu


## VÉRIFICATION LIENS ET BOUTONS FONCTIONNELS

### Écran Home (Accueil)
- [x] Bouton "Commencer" -> ouvre New Session
- [x] Card "Sécurité inactive" -> ouvre Settings
- [x] Menu capsule "Accueil" -> reste sur Home
- [x] Menu capsule "Paramètres" -> ouvre Settings
- [x] Mini card "Sortie en cours" (si session active) -> ouvre Active Session

### Écran Settings (Paramètres)
- [x] Champs texte (prénom, contact) -> autosave
- [x] Toggle localisation -> autosave
- [x] Segmented control tolérance -> autosave
- [x] Bouton "Supprimer mes données" -> confirmation + suppression
- [x] Menu capsule "Accueil" -> ouvre Home
- [x] Menu capsule "Paramètres" -> reste sur Settings

### Écran New Session (Je sors)
- [x] Champ "Heure limite" -> time picker modal
- [x] Champ "Où vas-tu" -> texte libre
- [x] Bouton "Démarrer" -> crée session + ouvre Active Session
- [x] Bouton retour (back) -> retour à Home

### Écran Active Session (Sortie en cours)
- [x] Bouton "Je suis rentré" -> confirme retour + retour à Home
- [x] Bouton "+ 15 min" -> ajoute 15 min au timer
- [x] Texte "Annuler la sortie" -> confirmation modal + annule session + retour à Home
- [x] Bouton retour (back) -> retour à Home (avec confirmation si session active)

### Écran Alert Sent (Alerte envoyée)
- [x] Bouton "Je vais bien" -> ferme alerte + retour à Home
- [x] Bouton "Appeler contact" -> appel (simulé ou réel)
- [x] Bouton "Appeler 112" -> appel d'urgence (simulé ou réel)

### Écran History (Historique)
- [x] Liste des sorties -> tap ouvre détails
- [x] Détails sortie -> affiche info complète
- [x] Bouton retour -> retour à History

### QA Global
- [x] Aucune erreur console
- [x] Aucun crash lors de la navigation
- [x] Tous les boutons répondent au tap
- [x] Transitions fluides entre écrans
- [x] Pas de dead ends (tous les écrans ont un retour


## LOGIQUE D'ALERTE COMPLÈTE (Définitions + Règles)

### Définitions
- [x] Heure limite = heure choisie par l'utilisateur
- [x] Tolérance = minutes de marge (10/15/30)
- [x] Deadline (alerte) = heure_limite + tolérance
- [ ] Implémenter dans Session model

### Démarrage d'une sortie
- [ ] Enregistrer startTime = now
- [ ] Enregistrer limitTime = heure choisie (timestamp)
- [ ] Enregistrer toleranceMin
- [ ] Calculer deadline = limitTime + toleranceMin
- [ ] Mettre status = active
- [ ] Gestion jour suivant : si limitTime < now alors limitTime += 1 jour

### Temps restant affiché
- [x] Temps restant = deadline - now
- [x] Si > 0 → affichage normal (compte à rebours)
- [x] Si <= 0 → affichage "En retard" + déclenchement alerte

### Déclenchement de l'alerte
- [ ] À l'instant now >= deadline :
  - [ ] Vérifier status != returned et status != cancelled
  - [ ] Mettre status = overdue
  - [ ] Envoyer SMS au contact d'urgence
  - [ ] Message SMS : "ALERTE: je n'ai pas confirmé mon retour. Heure limite: XX:XX, tolérance: YY min. Position: {position_si_activée}"
  - [ ] Capturer position GPS si toggle ON
  - [ ] Rediriger vers écran "Alerte envoyée"

### Boutons actions
- [x] Je suis rentré : dispo à tout moment
  - [ ] Mettre status = returned
  - [ ] Stop timers
  - [ ] Aucun SMS
- [ ] + 15 min :
  - [ ] Ajouter 15 min à toleranceMin (ou directement à deadline)
  - [ ] Limiter max 60 min total
  - [ ] Incrémenter extensionsCount++
- [x] Annuler la sortie :
  - [ ] Mettre status = cancelled
  - [ ] Stop timers
  - [ ] Aucun SMS

### GPS (simple)
- [ ] Si GPS ON : capturer une seule position au moment de l'alerte (pas de tracking continu)
- [ ] Si GPS OFF : SMS sans position
- [ ] Stocker position dans Session model

### Écran "Alerte envoyée"
- [ ] Afficher titre "🚨 Alerte envoyée"
- [ ] Afficher recap : contact, heure alerte, position si dispo
- [ ] Bouton "Je vais bien" → status = returned + retour Home
- [ ] Bouton "Appeler contact" → appel simulé
- [ ] Bouton "Appeler 112" → appel d'urgence simulé

### Historique
- [ ] Enregistrer chaque session (startTime, limitTime, tolerance, status, endTime, extensionsCount, position)
- [ ] Afficher liste des sorties avec statut (✅ rentré / 🚨 alerte / ⛔ annulé)
- [ ] Tap sur sortie → affiche détails complets


## SÉLECTEUR "HEURE LIMITE" (UI + Logique)

### UI
- [x] Card "Heure limite": afficher HH:MM en grand + icône horloge/crayon
- [x] Tap sur card OU icône => ouvrir bottomSheet modal
- [x] BottomSheet titre: "Choisir l'heure limite"
- [x] CupertinoDatePicker mode time (minuteInterval = 5)
- [x] Pills "Aujourd'hui" / "Demain" (optionnel mais recommandé)
- [x] Bouton "Valider" primaire

### Logique Date
- [x] Stocker limitTime en timestamp complet (date + heure)
- [x] Calcul: limit = DateTime(today.year, today.month, today.day, HH, MM)
- [x] Si limit < now => limit = limit + 1 day
- [x] Pills Aujourd'hui/Demain:
  - [x] "Aujourd'hui" force dateToday
  - [x] "Demain" force dateToday+1
  - [x] Si "Aujourd'hui" choisi et limit < now => auto-switch "Demain" OU afficher warning
- [x] Après validation: update limitTime + recalculer deadline
- [x] Affichage instantané

### Contraintes (optionnel)
- [x] Min = now + 10 min (optionnel)
- [x] Sinon autoriser tout

### Composants
- [x] Créer composant TimeLimitPicker (bottomSheet + CupertinoDatePicker)
- [x] Intégrer dans New Session screen
- [x] Tester logique jour suivant
