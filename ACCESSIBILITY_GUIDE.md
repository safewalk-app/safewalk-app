# SafeWalk - Guide d'Accessibilité des Animations

**Version:** V4.3
**Date:** 2026-02-26

---

## 📋 Vue d'ensemble

SafeWalk respecte les préférences d'accessibilité du système, notamment la préférence "Réduire les animations" (reduceMotionEnabled). Cela améliore l'expérience pour les utilisateurs avec des sensibilités au mouvement, des problèmes vestibulaires, ou d'autres conditions nécessitant des animations réduites.

---

## 🎯 Implémentation

### Hook `useReduceMotion`

**Fichier:** `hooks/use-reduce-motion.ts`

Détecte automatiquement les préférences d'accessibilité du système:

```typescript
const reduceMotion = useReduceMotion();

if (reduceMotion) {
  // Pas d'animation ou animation très rapide (0ms)
} else {
  // Animation normale
}
```

**Détection:**

- ✅ Lecteur d'écran activé (iOS/Android)
- ✅ Texte gras activé (iOS/Android)
- ✅ Réduire les animations (iOS)
- ✅ Mode sombre/clair (détecté via AccessibilityInfo)

### Composants Adaptés

Tous les composants d'animation respectent `reduceMotionEnabled`:

#### 1. ScreenTransitionWrapper

```typescript
<ScreenTransitionWrapper type="fade" duration={300}>
  {/* Animation fade: 300ms normal, 0ms si réduire les animations */}
  <HomeScreen />
</ScreenTransitionWrapper>
```

**Comportement:**

- Normal: Fade in/slide up/slide down (300ms)
- Réduit: Affichage immédiat (0ms)

#### 2. FeedbackAnimation

```typescript
<FeedbackAnimation state={submitState}>
  {/* Animation feedback: 300-600ms normal, 0ms si réduit */}
  <Button>Démarrer</Button>
</FeedbackAnimation>
```

**Comportement:**

- Normal: Loading (300ms), Success (500ms), Error (600ms)
- Réduit: Changements d'état instantanés (0ms)

#### 3. useStateAnimation

```typescript
const { animatedStyle } = useStateAnimation(state, {
  duration: 300,
  successDuration: 500,
  errorDuration: 600,
});
```

**Comportement:**

- Normal: Animations subtiles (pulse, shake, fade)
- Réduit: Pas d'animation (durée 0ms)

---

## ✅ Checklist d'Accessibilité

### Animations

- [x] Hook `useReduceMotion` implémenté
- [x] ScreenTransitionWrapper respecte reduceMotionEnabled
- [x] FeedbackAnimation respecte reduceMotionEnabled
- [x] useStateAnimation respecte reduceMotionEnabled
- [x] Tous les composants d'animation adaptés

### Contraste et Couleurs

- [ ] Vérifier le contraste WCAG AA (4.5:1 pour le texte)
- [ ] Tester avec un simulateur de daltonisme
- [ ] Vérifier que les couleurs seules ne transmettent pas l'information

### Lecteur d'Écran

- [ ] Tester avec VoiceOver (iOS) et TalkBack (Android)
- [ ] Vérifier les labels accessibles
- [ ] Vérifier la structure sémantique

### Navigation au Clavier

- [ ] Tester la navigation au clavier (Tab, Shift+Tab)
- [ ] Vérifier l'ordre de focus
- [ ] Vérifier les touches d'accès rapide

### Tailles de Texte

- [ ] Tester avec des tailles de texte augmentées
- [ ] Vérifier que le texte ne se coupe pas
- [ ] Vérifier la lisibilité

---

## 🧪 Tests d'Accessibilité

### iOS (VoiceOver)

1. **Activer VoiceOver:**
   - Paramètres → Accessibilité → VoiceOver → Activer

2. **Tester les animations:**
   - Naviguer avec VoiceOver
   - Vérifier que les animations ne gênent pas la lecture

3. **Activer "Réduire les animations":**
   - Paramètres → Accessibilité → Mouvement → Réduire les animations
   - Vérifier que les animations sont désactivées

### Android (TalkBack)

1. **Activer TalkBack:**
   - Paramètres → Accessibilité → TalkBack → Activer

2. **Tester les animations:**
   - Naviguer avec TalkBack
   - Vérifier que les animations ne gênent pas la lecture

3. **Activer "Réduire les animations":**
   - Paramètres → Accessibilité → Affichage → Réduire les animations
   - Vérifier que les animations sont désactivées

---

## 📊 Normes de Conformité

### WCAG 2.1

SafeWalk vise la conformité WCAG 2.1 niveau AA:

| Critère                           | Statut | Notes                        |
| --------------------------------- | ------ | ---------------------------- |
| 2.3.3 Animation from Interactions | ✅     | Respecte reduceMotionEnabled |
| 1.4.3 Contrast (Minimum)          | 🔄     | À vérifier                   |
| 2.1.1 Keyboard                    | 🔄     | À vérifier                   |
| 4.1.3 Status Messages             | 🔄     | À vérifier                   |

### ADA (Americans with Disabilities Act)

SafeWalk respecte les directives ADA pour l'accessibilité mobile.

---

## 🔧 Directives de Développement

### Quand Ajouter une Animation

1. **Vérifier si c'est nécessaire:**
   - L'animation améliore-t-elle l'UX?
   - Est-ce un feedback utilisateur important?

2. **Utiliser les composants existants:**
   - `ScreenTransitionWrapper` pour les transitions
   - `FeedbackAnimation` pour les changements d'état
   - `useStateAnimation` pour les animations personnalisées

3. **Respecter les préférences:**

   ```typescript
   const reduceMotion = useReduceMotion();
   const duration = reduceMotion ? 0 : 300;
   ```

4. **Tester l'accessibilité:**
   - Tester avec reduceMotionEnabled activé
   - Vérifier que l'UX reste bonne sans animation

### Bonnes Pratiques

1. **Durées subtiles:** 300-600ms (jamais > 1s)
2. **Pas de clignotement:** Éviter les animations > 3 clignotements/seconde
3. **Feedback clair:** Les animations doivent clarifier, pas distraire
4. **Respect des préférences:** Toujours utiliser `useReduceMotion`
5. **Alternatives:** Fournir du feedback non-animé (couleur, texte, son)

---

## 📚 Ressources

### Documentation Officielle

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Apple Human Interface Guidelines - Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Android Accessibility Guidelines](https://developer.android.com/guide/topics/ui/accessibility)

### Outils de Test

- [WAVE Web Accessibility Evaluation Tool](https://wave.webaim.org/)
- [Axe DevTools](https://www.deque.com/axe/devtools/)
- [Lighthouse (Chrome DevTools)](https://developers.google.com/web/tools/lighthouse)

### Ressources Supplémentaires

- [WebAIM - Web Accessibility In Mind](https://webaim.org/)
- [The A11Y Project](https://www.a11yproject.com/)
- [Accessible Colors](https://accessible-colors.com/)

---

## 🎯 Prochaines Étapes

1. **Tester avec VoiceOver/TalkBack**
   - Vérifier que l'app est utilisable sans animation
   - Vérifier que les labels sont clairs

2. **Vérifier le contraste des couleurs**
   - Utiliser un outil de vérification de contraste
   - Vérifier WCAG AA (4.5:1)

3. **Tester la navigation au clavier**
   - Vérifier que tous les éléments sont accessibles
   - Vérifier l'ordre de focus

4. **Ajouter des descriptions alternatives**
   - Ajouter des labels accessibles
   - Ajouter des descriptions pour les images

5. **Documenter les décisions d'accessibilité**
   - Créer une checklist d'accessibilité
   - Documenter les tests effectués

---

**Fin du guide d'accessibilité**
