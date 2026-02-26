# SafeWalk - Guide de Test VoiceOver/TalkBack

**Version:** V4.4
**Date:** 2026-02-26

---

## 📋 Vue d'ensemble

Ce guide fournit des instructions détaillées pour tester SafeWalk avec les lecteurs d'écran iOS (VoiceOver) et Android (TalkBack). L'objectif est de valider que l'app est entièrement utilisable pour les utilisateurs malvoyants.

---

## 🍎 Tester avec VoiceOver (iOS)

### Activation de VoiceOver

1. **Ouvrir les Paramètres**
   - Aller à: Paramètres → Accessibilité → VoiceOver
   - Activer le commutateur "VoiceOver"
   - Confirmer: "Activer VoiceOver?"

2. **Gestes de Base**
   - **Sélectionner un élément:** Appuyer une fois
   - **Activer un élément:** Appuyer deux fois
   - **Naviguer:** Balayer vers la droite (suivant) ou vers la gauche (précédent)
   - **Lire tout:** Balayer vers le bas avec deux doigts
   - **Pause/Reprendre:** Appuyer deux fois avec deux doigts

### Checklist de Test - Écran Home

#### Navigation Générale
- [ ] VoiceOver annonce le titre "SafeWalk"
- [ ] VoiceOver annonce le sous-titre "Reste en sécurité, partout."
- [ ] Tous les éléments sont accessibles en balayant vers la droite
- [ ] L'ordre de navigation est logique (de haut en bas)

#### Checklist d'État
- [ ] "Contact configuré" est annoncé correctement
- [ ] "Téléphone configuré" est annoncé correctement
- [ ] "Crédits disponibles" est annoncé correctement
- [ ] "Notifications activées" est annoncé correctement
- [ ] "Localisation activée" est annoncé correctement
- [ ] Les icônes ont des descriptions textuelles

#### Bouton "Je sors"
- [ ] Le bouton est annoncé comme "Bouton Je sors"
- [ ] Appuyer deux fois active le bouton
- [ ] VoiceOver annonce la navigation vers l'écran suivant

#### Texte de Contrat
- [ ] Le texte est lisible avec VoiceOver
- [ ] Les paragraphes sont bien séparés
- [ ] Les points clés sont annoncés clairement

#### Conseil du Jour
- [ ] Le titre "Conseil du jour" est annoncé
- [ ] Le contenu du conseil est lisible
- [ ] Les accents sont clairs

### Checklist de Test - Écran "Je sors"

#### Navigation Générale
- [ ] VoiceOver annonce le titre "Je sors"
- [ ] Tous les champs de formulaire sont accessibles
- [ ] L'ordre de navigation est logique

#### Sélecteur d'Heure
- [ ] Le label "Heure de retour" est annoncé
- [ ] Le sélecteur d'heure est accessible
- [ ] Les changements d'heure sont annoncés

#### Sélecteur de Contact
- [ ] Le label "Contact d'alerte" est annoncé
- [ ] Le sélecteur de contact est accessible
- [ ] Les changements de contact sont annoncés

#### Bouton "Commencer"
- [ ] Le bouton est annoncé comme "Bouton Commencer"
- [ ] Appuyer deux fois démarre la session
- [ ] VoiceOver annonce le succès ou l'erreur

#### Messages d'Erreur
- [ ] Les messages d'erreur sont annoncés clairement
- [ ] Les solutions sont proposées
- [ ] Les liens vers les paramètres sont accessibles

### Checklist de Test - Écran "Sortie en cours"

#### Affichage du Statut
- [ ] "Sortie en cours" est annoncé
- [ ] L'heure de retour est annoncée
- [ ] Le temps restant est annoncé
- [ ] Le statut GPS est annoncé

#### Boutons d'Action
- [ ] "Je suis rentré" est annoncé et accessible
- [ ] "+ 15 min" est annoncé et accessible
- [ ] "Arrêter la sortie" est annoncé et accessible
- [ ] "SOS" est annoncé comme "Bouton SOS - Appui long 2 secondes"

#### Indicateur GPS
- [ ] Le statut GPS est annoncé (🟢 actif, 🔴 inactif, etc.)
- [ ] Le timestamp est annoncé
- [ ] Les mises à jour sont annoncées

#### Bannière Batterie
- [ ] La batterie faible est annoncée
- [ ] Le pourcentage est annoncé
- [ ] Les recommandations sont claires

#### Bannière Réseau
- [ ] La déconnexion réseau est annoncée
- [ ] Les recommandations sont claires

### Checklist de Test - Écran Paramètres

#### Navigation Générale
- [ ] VoiceOver annonce le titre "Paramètres"
- [ ] Tous les éléments sont accessibles
- [ ] L'ordre de navigation est logique

#### Section Contact
- [ ] "Contact d'alerte" est annoncé
- [ ] Le champ de texte est accessible
- [ ] Les changements sont annoncés

#### Section Téléphone
- [ ] "Numéro de téléphone" est annoncé
- [ ] Le champ de texte est accessible
- [ ] Les validations sont annoncées
- [ ] Les messages d'erreur sont clairs

#### Section Notifications
- [ ] "Notifications" est annoncé
- [ ] Le commutateur est accessible
- [ ] Les changements sont annoncés

#### Section Localisation
- [ ] "Localisation" est annoncé
- [ ] Le commutateur est accessible
- [ ] Les changements sont annoncés

#### Bouton "Test SMS"
- [ ] Le bouton est annoncé
- [ ] Appuyer deux fois envoie un SMS de test
- [ ] Le succès ou l'erreur est annoncé

---

## 🤖 Tester avec TalkBack (Android)

### Activation de TalkBack

1. **Ouvrir les Paramètres**
   - Aller à: Paramètres → Accessibilité → TalkBack
   - Activer le commutateur "TalkBack"
   - Confirmer: "Activer TalkBack?"

2. **Gestes de Base**
   - **Sélectionner un élément:** Appuyer une fois
   - **Activer un élément:** Appuyer deux fois
   - **Naviguer:** Balayer vers la droite (suivant) ou vers la gauche (précédent)
   - **Lire tout:** Balayer vers le bas avec deux doigts
   - **Pause/Reprendre:** Appuyer deux fois avec deux doigts

### Checklist de Test - Écran Home

#### Navigation Générale
- [ ] TalkBack annonce le titre "SafeWalk"
- [ ] TalkBack annonce le sous-titre "Reste en sécurité, partout."
- [ ] Tous les éléments sont accessibles en balayant vers la droite
- [ ] L'ordre de navigation est logique

#### Checklist d'État
- [ ] "Contact configuré" est annoncé correctement
- [ ] "Téléphone configuré" est annoncé correctement
- [ ] "Crédits disponibles" est annoncé correctement
- [ ] "Notifications activées" est annoncé correctement
- [ ] "Localisation activée" est annoncé correctement
- [ ] Les icônes ont des descriptions textuelles

#### Bouton "Je sors"
- [ ] Le bouton est annoncé comme "Bouton Je sors"
- [ ] Appuyer deux fois active le bouton
- [ ] TalkBack annonce la navigation vers l'écran suivant

### Checklist de Test - Écran "Je sors"

#### Navigation Générale
- [ ] TalkBack annonce le titre "Je sors"
- [ ] Tous les champs de formulaire sont accessibles
- [ ] L'ordre de navigation est logique

#### Sélecteur d'Heure
- [ ] Le label "Heure de retour" est annoncé
- [ ] Le sélecteur d'heure est accessible
- [ ] Les changements d'heure sont annoncés

#### Sélecteur de Contact
- [ ] Le label "Contact d'alerte" est annoncé
- [ ] Le sélecteur de contact est accessible
- [ ] Les changements de contact sont annoncés

#### Bouton "Commencer"
- [ ] Le bouton est annoncé comme "Bouton Commencer"
- [ ] Appuyer deux fois démarre la session
- [ ] TalkBack annonce le succès ou l'erreur

### Checklist de Test - Écran "Sortie en cours"

#### Affichage du Statut
- [ ] "Sortie en cours" est annoncé
- [ ] L'heure de retour est annoncée
- [ ] Le temps restant est annoncé
- [ ] Le statut GPS est annoncé

#### Boutons d'Action
- [ ] "Je suis rentré" est annoncé et accessible
- [ ] "+ 15 min" est annoncé et accessible
- [ ] "Arrêter la sortie" est annoncé et accessible
- [ ] "SOS" est annoncé comme "Bouton SOS - Appui long 2 secondes"

### Checklist de Test - Écran Paramètres

#### Navigation Générale
- [ ] TalkBack annonce le titre "Paramètres"
- [ ] Tous les éléments sont accessibles
- [ ] L'ordre de navigation est logique

#### Sections
- [ ] Tous les champs sont accessibles
- [ ] Les labels sont clairs
- [ ] Les validations sont annoncées

---

## 🔍 Points Critiques à Tester

### 1. Navigation Logique
- [ ] L'ordre de tabulation suit l'ordre visuel (haut → bas, gauche → droite)
- [ ] Les éléments cachés ne sont pas annoncés
- [ ] Les éléments désactivés sont annoncés comme "désactivé"

### 2. Labels et Descriptions
- [ ] Tous les boutons ont des labels clairs
- [ ] Tous les champs de texte ont des labels
- [ ] Les icônes ont des descriptions textuelles
- [ ] Les messages d'erreur sont clairs et actionnables

### 3. Feedback Utilisateur
- [ ] Les changements d'état sont annoncés
- [ ] Les chargements sont annoncés
- [ ] Les succès sont annoncés
- [ ] Les erreurs sont annoncées avec solutions

### 4. Gestes Spéciaux
- [ ] L'appui long sur SOS est annoncé (2 secondes)
- [ ] Les gestes de navigation fonctionnent correctement
- [ ] Les confirmations modales sont accessibles

### 5. Animations
- [ ] Les animations ne gênent pas la lecture
- [ ] Les changements d'état sont clairs sans animation
- [ ] Les transitions entre écrans sont fluides

---

## 📝 Modèle de Rapport de Test

```markdown
# Rapport de Test VoiceOver/TalkBack - SafeWalk

**Date:** [Date]
**Testeur:** [Nom]
**Appareil:** [iOS/Android, Modèle]
**Version de l'App:** [Version]

## Résumé
[Résumé général du test]

## Écran Home
- [ ] Navigation: ✅ / ❌
- [ ] Checklist d'état: ✅ / ❌
- [ ] Bouton "Je sors": ✅ / ❌
- Problèmes: [Lister les problèmes]

## Écran "Je sors"
- [ ] Navigation: ✅ / ❌
- [ ] Sélecteurs: ✅ / ❌
- [ ] Bouton "Commencer": ✅ / ❌
- Problèmes: [Lister les problèmes]

## Écran "Sortie en cours"
- [ ] Affichage du statut: ✅ / ❌
- [ ] Boutons d'action: ✅ / ❌
- [ ] Indicateur GPS: ✅ / ❌
- Problèmes: [Lister les problèmes]

## Écran Paramètres
- [ ] Navigation: ✅ / ❌
- [ ] Champs de texte: ✅ / ❌
- [ ] Validations: ✅ / ❌
- Problèmes: [Lister les problèmes]

## Problèmes Critiques
[Lister les problèmes P0]

## Problèmes Importants
[Lister les problèmes P1]

## Suggestions d'Amélioration
[Lister les suggestions]

## Conclusion
[Conclusion générale]
```

---

## 🎯 Prochaines Étapes

1. **Tester avec VoiceOver (iOS)**
   - Utiliser un iPhone ou iPad
   - Suivre la checklist complète
   - Documenter les problèmes

2. **Tester avec TalkBack (Android)**
   - Utiliser un téléphone Android
   - Suivre la checklist complète
   - Documenter les problèmes

3. **Corriger les Problèmes**
   - Ajouter des labels manquants
   - Améliorer les descriptions
   - Corriger l'ordre de navigation

4. **Retester**
   - Vérifier que les corrections fonctionnent
   - Documenter les résultats

---

## 📚 Ressources

### Documentation Officielle
- [Apple VoiceOver User Guide](https://www.apple.com/accessibility/voiceover/)
- [Android TalkBack Documentation](https://support.google.com/accessibility/android/answer/6283677)
- [WCAG 2.1 - Screen Reader Testing](https://www.w3.org/WAI/test-evaluate/preliminary/)

### Outils de Test
- [NVDA (Windows)](https://www.nvaccess.org/)
- [JAWS (Windows)](https://www.freedomscientific.com/products/software/jaws/)
- [WebAIM - Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)

---

**Fin du guide VoiceOver/TalkBack**
