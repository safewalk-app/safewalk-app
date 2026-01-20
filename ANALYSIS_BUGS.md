# Analyse des Incohérences Logiques - SafeWalk

## 🔴 BUGS CRITIQUES TROUVÉS

### 1. **BUG: Sélecteur d'heure limite (Time Limit Picker)**

#### Problème
Le sélecteur d'heure limite a une logique confuse et contre-intuitive :

```typescript
// time-limit-picker.tsx ligne 40-52
if (selectedDay === 'today') {
  finalDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    tempDate.getHours(),
    tempDate.getMinutes()
  );

  // Si l'heure est passée, passer à demain
  if (finalDate < now) {
    finalDate.setDate(finalDate.getDate() + 1);
  }
}
```

**Problème 1 : Ambiguïté du jour sélectionné**
- L'utilisateur clique sur "Aujourd'hui" et sélectionne 14:00
- Si on est à 15:00, le système passe automatiquement à demain 14:00
- **Résultat** : L'utilisateur pense dire "rentrer à 14h aujourd'hui" mais le système comprend "rentrer demain à 14h"
- **UX Catastrophique** : Aucune indication visuelle que le jour a changé

**Problème 2 : Incohérence avec le bouton "Demain"**
- Si l'utilisateur clique "Demain" à 14:00 et qu'on est à 15:00, il y a une ambiguïté
- Le système devrait-il passer à surdemain ? Non, il reste à demain
- **Résultat** : Comportement imprévisible et non documenté

#### Exemple de scénario problématique
```
Heure actuelle : 15:30 (15h30)
Utilisateur : Clique "Aujourd'hui" → Sélectionne 14:00 → Valide

Résultat attendu : Alerte à 14:00 aujourd'hui (impossible, c'est dans le passé)
Résultat réel : Alerte à 14:00 DEMAIN (l'utilisateur ne le sait pas)
```

---

### 2. **BUG: Calcul du deadline (Tolérance)**

#### Problème
```typescript
// app-context.tsx ligne 154
const deadline = adjustedLimitTime + state.settings.tolerance * 60 * 1000;
```

**Problème 1 : Tolérance appliquée au mauvais moment**
- La tolérance devrait être appliquée **seulement si l'utilisateur ne confirme pas son retour**
- Actuellement, elle est appliquée **systématiquement** dès le départ
- **Résultat** : L'utilisateur pense avoir jusqu'à 14:00, mais l'alerte ne se déclenche qu'à 14:15

**Problème 2 : Confusion avec le check-in**
- Le check-in intervient au milieu du délai (midTime)
- Si l'utilisateur confirme "Je vais bien", il n'y a pas d'alerte
- Si l'utilisateur ne répond pas au check-in, il y a une 2e notification
- **Résultat** : La tolérance est appliquée même si l'utilisateur confirme au check-in

#### Exemple de scénario problématique
```
Utilisateur : "Je sors jusqu'à 14:00"
Tolérance : 15 min
Heure limite réelle : 14:00
Deadline réelle : 14:15

À 13:00 (midTime) : Notification "Tout va bien ?"
Utilisateur : Confirme "Je vais bien ✅"

Résultat attendu : Pas d'alerte, session terminée
Résultat réel : Pas d'alerte, mais deadline reste à 14:15 (confus)
```

---

### 3. **BUG: Gestion de l'extension de temps (+15 min)**

#### Problème
```typescript
// app-context.tsx ligne 191-196
const addTimeToSession = async (minutes: number) => {
  if (!state.currentSession) return;

  // Limiter max 60 min total de tolérance
  const newTolerance = Math.min(state.currentSession.tolerance + minutes, 60);
  const newDeadline = state.currentSession.limitTime + newTolerance * 60 * 1000;
```

**Problème 1 : Confusion entre tolérance et extension**
- `tolerance` = délai de grâce initial (15 min)
- `addTimeToSession(15)` = ajouter 15 min
- **Résultat** : Après une extension, `tolerance` devient 30 min
- **Confusion** : C'est plus une "deadline extension" qu'une "tolerance", le nom est trompeur

**Problème 2 : Limite de 60 min totale**
- Pourquoi 60 min ? C'est arbitraire et pas documenté
- Que se passe-t-il si l'utilisateur veut ajouter 30 min deux fois ?
- **Résultat** : Première extension : 15 → 30 min. Deuxième : 30 → 45 min. Troisième : 45 → 60 min. Quatrième : 60 → 60 min (bloquée)

**Problème 3 : Pas de feedback utilisateur**
- L'utilisateur ne sait pas qu'il a atteint la limite de 60 min
- L'extension silencieuse est confuse

---

### 4. **BUG: Incohérence entre limitTime et deadline**

#### Problème
```typescript
// app-context.tsx
limitTime: adjustedLimitTime,        // Heure limite choisie
deadline: adjustedLimitTime + tolerance * 60 * 1000;  // Heure limite + tolérance
```

**Problème 1 : Deux concepts différents, noms similaires**
- `limitTime` = "Je rentre à 14:00"
- `deadline` = "Alerte à 14:15"
- **Résultat** : Confusion totale dans le code et l'UI

**Problème 2 : Affichage du timer**
```typescript
// active-session.tsx ligne 27
const remaining = deadline - now;  // Utilise deadline, pas limitTime
```
- Le timer affiche le temps jusqu'à `deadline` (14:15)
- Mais l'utilisateur pense qu'il a jusqu'à `limitTime` (14:00)
- **Résultat** : L'utilisateur voit 15 minutes de plus que prévu

---

### 5. **BUG: Pas de distinction entre "retard" et "alerte"**

#### Problème
```typescript
// active-session.tsx ligne 38-46
if (remaining > 0) {
  setIsOverdue(false);
  // Affiche le timer normal
} else {
  setIsOverdue(true);
  // Affiche "En retard"
}
```

**Problème 1 : Trois états différents, deux variables**
1. **Avant limitTime** : "Je dois rentrer à 14:00" (timer normal)
2. **Entre limitTime et deadline** : "Je suis en retard, mais alerte pas encore déclenchée" (pas d'état)
3. **Après deadline** : "Alerte déclenchée" (isOverdue = true)

**Résultat** : L'état 2 n'est pas géré, l'UI ne montre pas la différence

---

### 6. **BUG: Logique du check-in incompatible avec la tolérance**

#### Problème
```typescript
// use-check-in-notifications.ts
const midTime = now + (limitTime - now) / 2;  // Milieu du délai
```

**Problème 1 : midTime ne tient pas compte de la tolérance**
- Si limitTime = 14:00 et tolérance = 15 min
- midTime = 13:00 (milieu entre maintenant et 14:00)
- **Résultat** : Le check-in intervient avant la deadline, c'est logique
- **MAIS** : Si l'utilisateur ne répond pas au check-in, il y a une 2e notification à 13:10
- **Résultat** : Deux notifications avant le deadline, confus

**Problème 2 : Pas de lien entre check-in et alerte**
- Si l'utilisateur confirme "Je vais bien" au check-in
- L'alerte devrait être annulée
- **Résultat** : `checkInOk` est stocké, mais jamais utilisé pour annuler l'alerte

---

## 📋 RÉSUMÉ DES PROBLÈMES

| # | Problème | Sévérité | Impact |
|---|----------|----------|--------|
| 1 | Sélecteur d'heure ambigüe | 🔴 Critique | Utilisateur ne sait pas quand il rentre |
| 2 | Tolérance appliquée systématiquement | 🔴 Critique | Alerte décalée de 15 min sans raison |
| 3 | Extension de temps confuse | 🟠 Majeur | Limite arbitraire, pas de feedback |
| 4 | limitTime vs deadline | 🔴 Critique | Timer affiche le mauvais temps |
| 5 | Pas d'état "en retard" | 🟠 Majeur | UI ne montre pas l'état intermédiaire |
| 6 | Check-in incompatible | 🟠 Majeur | Logique de notification confuse |

---

## ✅ SOLUTIONS PROPOSÉES

### Solution 1: Clarifier le sélecteur d'heure
```typescript
// Afficher CLAIREMENT le jour sélectionné
// "Aujourd'hui à 14:00" → "Demain à 14:00" (si passé)
// Avec confirmation visuelle du changement
```

### Solution 2: Séparer limitTime et deadline
```typescript
// Renommer pour clarté
limitTime: 14:00  // "Je rentre à 14:00"
graceTime: 15:00  // "Alerte à 15:00" (après tolérance)

// Ou mieux encore:
returnTime: 14:00    // Heure de retour prévue
alertTime: 14:15     // Heure de l'alerte
```

### Solution 3: Gérer les 3 états correctement
```typescript
enum SessionState {
  ACTIVE = 'active',           // Avant limitTime
  GRACE_PERIOD = 'grace',      // Entre limitTime et deadline
  OVERDUE = 'overdue',         // Après deadline
  RETURNED = 'returned',       // Utilisateur confirmé retour
}
```

### Solution 4: Lier check-in à l'alerte
```typescript
// Si checkInOk = true, annuler l'alerte
if (currentSession.checkInOk) {
  // Pas d'alerte
  return;
}
```

### Solution 5: Limiter les extensions de manière logique
```typescript
// Au lieu de limiter à 60 min total
// Limiter à N extensions maximum (ex: 3 fois)
const MAX_EXTENSIONS = 3;
if (extensionsCount >= MAX_EXTENSIONS) {
  // Bloquer avec message clair
}
```

---

## 🔧 FICHIERS À CORRIGER

1. `components/ui/time-limit-picker.tsx` - Clarifier la sélection du jour
2. `lib/context/app-context.tsx` - Séparer limitTime et deadline
3. `app/active-session.tsx` - Gérer les 3 états
4. `hooks/use-check-in-notifications.ts` - Lier check-in à l'alerte
5. `app/alert-sent.tsx` - Afficher les bons timestamps

---

## 🎯 PRIORITÉ DE CORRECTION

1. **URGENT** : Sélecteur d'heure (utilisateur ne sait pas quand il rentre)
2. **URGENT** : Timer affiche le mauvais temps (limitTime vs deadline)
3. **IMPORTANT** : Check-in lié à l'alerte (logique de notification)
4. **IMPORTANT** : États intermédiaires (UI confuse)
5. **NICE-TO-HAVE** : Limiter les extensions de manière logique
