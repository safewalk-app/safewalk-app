# SafeWalk - Guide des Animations de Feedback

**Version:** V4.1
**Date:** 2026-02-26

---

## 📋 Vue d'ensemble

Les animations de feedback subtiles améliorent la sensation de réactivité de l'app sans surcharger l'interface. Elles fournissent un retour visuel immédiat aux actions de l'utilisateur.

---

## 🎯 Animations Implémentées

### 1) Hook `useStateAnimation`

**Fichier:** `hooks/use-state-animation.ts`

**Objectif:** Fournir des valeurs animées pour les changements d'état

**États supportés:**

- `idle` - État normal (retour à 1 pour opacity et scale)
- `loading` - Chargement (fade out + scale down)
- `success` - Succès (pulse effect: scale 1 → 1.05 → 1)
- `error` - Erreur (shake effect: translateY haut-bas)

**Utilisation:**

```typescript
const { animatedStyle, opacity, scale, translateY } = useStateAnimation(state, {
  duration: 300,
  successDuration: 500,
  errorDuration: 600,
});

return (
  <Animated.View style={animatedStyle}>
    {/* Contenu */}
  </Animated.View>
);
```

**Animations Détaillées:**

#### Loading (300ms)

- Opacity: 1 → 0.8 (fade out léger)
- Scale: 1 → 0.98 (scale down subtil)
- Effet: Utilisateur voit que l'app "pense"

#### Success (500ms)

- Scale: 1 → 1.05 → 1 (pulse effect)
- Opacity: 1 (reste normal)
- Effet: Feedback positif subtil

#### Error (600ms)

- TranslateY: 0 → -8 → 8 → -4 → 0 (shake)
- Effet: Attire l'attention sans être agressif

#### Idle (300ms)

- Retour à l'état normal (opacity 1, scale 1, translateY 0)

---

### 2) Composant `FeedbackAnimation`

**Fichier:** `components/ui/feedback-animation.tsx`

**Objectif:** Wrapper réutilisable pour animer les changements d'état

**Props:**

```typescript
interface FeedbackAnimationProps {
  state: 'idle' | 'loading' | 'success' | 'error';
  children: React.ReactNode;
  duration?: number; // 300ms par défaut
  successDuration?: number; // 500ms par défaut
  errorDuration?: number; // 600ms par défaut
  style?: StyleProp<ViewStyle>;
}
```

**Utilisation:**

```typescript
<FeedbackAnimation state={isLoading ? 'loading' : 'idle'}>
  <Button>Démarrer</Button>
</FeedbackAnimation>
```

**Composants Inclus:**

#### LoadingIndicator

Indicateur de chargement avec animation

```typescript
<LoadingIndicator />
```

#### SuccessIndicator

Indicateur de succès avec animation

```typescript
<SuccessIndicator />
```

#### ErrorIndicator

Indicateur d'erreur avec animation

```typescript
<ErrorIndicator />
```

---

## 🔧 Intégrations Actuelles

### new-session.tsx

**État:** ✅ Intégré

**Implémentation:**

```typescript
const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

<FeedbackAnimation state={submitState}>
  <CushionPillButton
    label="Démarrer"
    onPress={handleStartSession}
  />
</FeedbackAnimation>
```

**Flux d'animation:**

1. Utilisateur clique "Démarrer"
2. `submitState` → `'loading'` (fade out + scale down)
3. Appel API en cours
4. Succès: `submitState` → `'success'` (pulse effect)
5. Navigation vers active-session
6. Retour: `submitState` → `'idle'`

---

## 📊 Directives de Design

### Quand Utiliser Chaque Animation

| État      | Quand          | Durée | Effet                 |
| --------- | -------------- | ----- | --------------------- |
| `loading` | API en cours   | 300ms | Fade out + scale down |
| `success` | Action réussie | 500ms | Pulse effect          |
| `error`   | Action échouée | 600ms | Shake effect          |
| `idle`    | État normal    | 300ms | Retour à la normale   |

### Bonnes Pratiques

1. **Durées subtiles:** 300-600ms (jamais > 1s)
2. **Pas de surcharge:** Max 1-2 animations simultanées
3. **Feedback immédiat:** Animer dès que l'utilisateur agit
4. **Clarté:** Animations doivent clarifier, pas distraire
5. **Accessibilité:** Respecter les préférences d'animation du système

---

## 🚀 Prochaines Étapes

### À Implémenter

1. **active-session.tsx**
   - Animer le bouton "Je suis rentré"
   - Animer le bouton "Prolonger"
   - Animer le bouton "Arrêter la sortie"

2. **settings.tsx**
   - Animer le bouton "Enregistrer"
   - Animer le bouton "Test SMS"
   - Animer le bouton "Supprimer données"

3. **Autres écrans**
   - home.tsx: Animer les transitions
   - phone-verification.tsx: Animer la vérification OTP
   - Tous les modals: Animer les transitions

### Améliorations Futures

1. **Animations de transition entre écrans**
   - Fade in/out des écrans
   - Slide in/out des modals

2. **Animations de liste**
   - Stagger effect pour les items
   - Swipe to delete avec animation

3. **Animations de notification**
   - Toast slide in/out
   - Notification pulse effect

4. **Animations de geste**
   - Haptic feedback sur les gestes
   - Animation des gestes longs

---

## 📚 Exemples de Code

### Exemple 1: Bouton avec Animation de Chargement

```typescript
import { FeedbackAnimation } from '@/components/ui/feedback-animation';
import { useState } from 'react';

export function MyButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handlePress = async () => {
    setState('loading');
    try {
      await doSomething();
      setState('success');
      setTimeout(() => setState('idle'), 1000);
    } catch (error) {
      setState('error');
      setTimeout(() => setState('idle'), 1000);
    }
  };

  return (
    <FeedbackAnimation state={state}>
      <Pressable onPress={handlePress}>
        <Text>Cliquez-moi</Text>
      </Pressable>
    </FeedbackAnimation>
  );
}
```

### Exemple 2: Utiliser le Hook Directement

```typescript
import { useStateAnimation } from '@/hooks/use-state-animation';
import Animated from 'react-native-reanimated';

export function MyComponent() {
  const [state, setState] = useState<'idle' | 'loading'>('idle');
  const { animatedStyle } = useStateAnimation(state);

  return (
    <Animated.View style={animatedStyle}>
      {/* Contenu */}
    </Animated.View>
  );
}
```

### Exemple 3: Animation Personnalisée

```typescript
const { animatedStyle, opacity, scale } = useStateAnimation(state, {
  duration: 400, // Durée personnalisée
  successDuration: 600,
  errorDuration: 800,
});

// Utiliser les valeurs animées directement
const customStyle = useAnimatedStyle(() => ({
  opacity: opacity.value,
  transform: [{ scale: scale.value }],
}));
```

---

## 🎨 Paramètres d'Animation

### Timings Recommandés

```typescript
// Rapide (feedback immédiat)
duration: 200ms

// Normal (feedback subtil)
duration: 300ms

// Lent (feedback dramatique)
duration: 500ms
```

### Easing Functions

```typescript
// Utilisé dans useStateAnimation
Easing.inOut(Easing.ease); // Smooth in and out
Easing.out(Easing.ease); // Smooth out
Easing.in(Easing.ease); // Smooth in
```

---

## ✅ Checklist d'Implémentation

- [x] Hook `useStateAnimation` créé
- [x] Composant `FeedbackAnimation` créé
- [x] Intégration dans new-session.tsx
- [ ] Intégration dans active-session.tsx
- [ ] Intégration dans settings.tsx
- [ ] Intégration dans phone-verification.tsx
- [ ] Intégration dans home.tsx
- [ ] Tests des animations
- [ ] Vérification de l'accessibilité
- [ ] Documentation complète

---

**Fin du guide des animations**
