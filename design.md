# SafeWalk V1 - Design System "Pop Bubble"

## Objectifs
1. **UI pixel-perfect** : Copier exactement le style des maquettes (pop/bubble/Apple-friendly)
2. **UX simple** : 2 taps pour démarrer, 1 tap pour terminer
3. **Paramètres autosave** : Aucun bouton "Enregistrer", sauvegarde automatique + toast

---

## Design Tokens

| Token | Valeur | Usage |
|-------|--------|-------|
| **Primary Purple** | #6C63FF | Boutons, accents, hero card |
| **Primary Blue** | #3A86FF | Accents secondaires |
| **Mint** | #2DE2A6 | Succès, confirmation |
| **Danger** | #FF4D4D | Actions dangereuses |
| **Text** | #0B1220 | Texte principal |
| **Secondary** | #6B7280 | Texte secondaire |
| **Background** | #F6F7FF | Fond avec bulles (opacity 0.04–0.08) |
| **Card** | Blanc translucide (opacity 0.92–0.96) | Cards principales |

---

## Spacing (Compact)
- Padding horizontal global : 16–18px
- Header → Hero : 12–16px
- Hero → Status : 12–16px
- Status → Bottom capsule : 18–26px
- Réduire tous les SizedBox trop grands

---

## Composants UI à Coder

1. **theme.dart** : Tokens + text styles
2. **BubbleBackground** : Cercles flous décoratives
3. **GlassCard/BubbleCard** : Cards translucides avec radius 28–32
4. **HeroCardPremium** : Bubbles + rocket + gradient léger
5. **CushionPillButton** : Boutons "gonflés" avec glossy highlight
6. **StatusCard** : Success/warning + chevron
7. **PopTextField** : Champs texte stylisés
8. **SegmentedControlPill** : Sélecteur 10/15/30 min
9. **BigSuccessButton** : "Je suis rentré" (vert mint)
10. **ToastPop** : Notifications avec haptics + press animations

---

## Bottom Nav Capsule (DOIT MATCHER LE MOCK)

- **Capsule blanche flottante** (pas full width)
- **Width** : 88–92% de l'écran
- **Height** : 64–72px
- **Radius** : 22–26px
- **Shadow** : y=10, blur=35, opacity 0.10–0.12
- **Placement** : SafeArea(bottom) + 10–14px
- **Items** : 2 tabs (Accueil / Paramètres)
  - Icône 24–26px + label 12–13px
  - Actif : violet (#6C63FF) + petit highlight (opacity 0.10)
  - Inactif : gris (#9CA3AF)

**Important** : Le contenu de chaque page doit avoir un padding bottom pour ne pas être caché par la capsule.

---

## Écrans V1 Obligatoires

### 1. Accueil (Home)
- "SafeWalk" grand + sous-titre "Restez en sécurité, partout."
- HeroCard violette avec rocket visible, "Je sors", description, bouton pill "Commencer"
- StatusCard : ✅ "Sécurité active" / "Contact configuré" OU ⚠️ "Sécurité inactive" / "Configurer un contact"
- Pas de grosse card "Paramètres" (le menu suffit)

### 2. Paramètres (Settings) - AUTOSAVE
- Cards : prénom, contact (nom+tel) + microcopy
- Tolérance segmented 10/15/30
- Toggle localisation + microcopy
- Danger : "Supprimer mes données"
- Aucun bouton enregistrer (autosave + toast)

### 3. Je sors (New Session)
- Title "Je sors" + sous-titre
- Card "Heure limite" avec valeur large (02:30) + tap ouvre time picker modal
- Card "Où vas-tu ? (optionnel)"
- Card "Contact d'urgence" (nom + tel) + icône appeler
- Card "Localisation" (toggle)
- CTA "Démarrer"

### 4. Sortie en cours (Active Session)
- "Sortie en cours"
- Card avec gros "02:30"
- Bouton vert "Je suis rentré"
- Bouton "+15 min"
- "Annuler ta sortie" (danger) + confirm modal

### 5. Alerte envoyée (Alert Sent)
- "🚨 Alerte envoyée"
- Recap + position si dispo
- "Je vais bien" + appeler contact / 112

### 6. Historique (History)
- Liste cards (date + statut ✅/🚨/⛔)

---

## Navigation

- **Shell principal** : Stack + SafeArea + FloatingBottomNavCapsule
- **Routes push** :
  - `/new-session` (depuis Home)
  - `/active-session` (si session active)
  - `/alert-sent` (si alerte)
  - `/history` (depuis Home)

**Règles** :
- Si contact non configuré : Home CTA redirige vers Paramètres + toast "Configure un contact"
- Une seule session active max

---

## Logique V1 (Simple)

- **Settings** : Local (AsyncStorage ou Hive)
- **Session model** : id, dueTime, tolerance, note, status
- **GPS** : Snapshot au démarrage uniquement si toggle ON (pas de tracking)
- **Alerte** : Si now > dueTime + tolerance → status alerted + écran Alert Sent (simulation)

---

## Ordre d'Exécution

1. theme.dart + bottom capsule + glass card
2. Home pixel-perfect
3. Settings autosave pixel-perfect
4. Je sors + Sortie en cours
5. Alert + History
6. QA spacing & responsive
