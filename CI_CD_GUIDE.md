# 🚀 CI/CD Guide - SafeWalk V7.0

**Version:** V7.0
**Date:** 2026-02-26
**Statut:** Production-Ready

---

## 📋 Résumé Exécutif

SafeWalk V7.0 inclut un **pipeline CI/CD complet** avec:
- ✅ Linting automatique (ESLint + Prettier)
- ✅ Type checking (TypeScript)
- ✅ Tests unitaires (Vitest)
- ✅ Build verification
- ✅ Security scanning (npm audit + Snyk)
- ✅ Déploiement automatique (staging/production)
- ✅ Notifications Slack

---

## 🏗️ Architecture CI/CD

### Pipeline Workflow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Push/PR to main or develop                           │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌───────▼────────┐
│ Lint & Format  │   │ Type Check     │
│ (ESLint)       │   │ (TypeScript)   │
└───────┬────────┘   └───────┬────────┘
        │                     │
        └──────────┬──────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌───────▼────────┐
│ Unit Tests     │   │ Build Check    │
│ (Vitest)       │   │ (Metro)        │
└───────┬────────┘   └───────┬────────┘
        │                     │
        └──────────┬──────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌───────▼────────┐
│ Security Scan  │   │ Deploy         │
│ (npm audit)    │   │ (Staging/Prod) │
└───────┬────────┘   └───────┬────────┘
        │                     │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │ Notify Results      │
        │ (Slack)             │
        └─────────────────────┘
```

---

## 🛠️ Configuration

### 1. ESLint (.eslintrc.json)

Configuration stricte avec:
- ✅ TypeScript support
- ✅ React/React Native rules
- ✅ No `any` types
- ✅ Consistent formatting
- ✅ No console.log in production

**Règles principales:**
```json
{
  "@typescript-eslint/no-explicit-any": "error",
  "no-console": ["warn", { "allow": ["warn", "error"] }],
  "no-debugger": "error",
  "prefer-const": "error",
  "eqeqeq": ["error", "always"]
}
```

### 2. Prettier (.prettierrc.json)

Configuration de formatage:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100
}
```

### 3. Vitest (vitest.config.ts)

Configuration des tests:
```typescript
{
  environment: 'jsdom',
  coverage: {
    provider: 'v8',
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80
  }
}
```

### 4. GitHub Actions (.github/workflows/ci.yml)

Pipeline automatique avec 8 jobs:
1. **Lint** - ESLint + Prettier
2. **Type Check** - TypeScript
3. **Test** - Vitest + coverage
4. **Build** - Metro build
5. **Security** - npm audit + Snyk
6. **Deploy Staging** - Sur develop
7. **Deploy Production** - Sur main
8. **Notify** - Slack notifications

---

## 📦 Installation & Configuration

### 1. Installer les dépendances

```bash
npm install --save-dev \
  eslint \
  prettier \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint-config-prettier \
  vitest \
  @vitest/ui \
  @testing-library/react-native \
  @vitejs/plugin-react
```

### 2. Ajouter les scripts npm

```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "check": "tsc --noEmit"
  }
}
```

### 3. Configurer GitHub Secrets

Ajouter les secrets dans GitHub Settings → Secrets:

```
EXPO_TOKEN=<votre_token_expo>
SNYK_TOKEN=<votre_token_snyk>
SLACK_WEBHOOK=<votre_webhook_slack>
```

### 4. Configurer les branches protégées

Dans GitHub Settings → Branches:

```
Branch protection rules:
✅ Require status checks to pass before merging
✅ Require code reviews before merging
✅ Dismiss stale pull request approvals
✅ Require branches to be up to date
```

---

## 🚀 Utilisation

### Développement Local

```bash
# Linter le code
npm run lint

# Fixer les erreurs de linting
npm run lint:fix

# Formater le code
npm run format

# Vérifier la formatage
npm run format:check

# Exécuter les tests
npm test

# Exécuter les tests avec UI
npm run test:ui

# Générer le rapport de coverage
npm run test:coverage

# Type checking
npm run check
```

### Workflow Git

```bash
# 1. Créer une branche feature
git checkout -b feature/my-feature

# 2. Faire les changements
# ... edit files ...

# 3. Linter et formater
npm run lint:fix
npm run format

# 4. Exécuter les tests
npm test

# 5. Commit et push
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature

# 6. Créer une Pull Request
# GitHub Actions exécutera automatiquement le CI/CD

# 7. Merge après approbation
# Déploiement automatique sur staging
```

### Déploiement

**Staging (develop branch):**
```bash
git push origin feature/my-feature
# PR → develop
# ✅ CI/CD passe
# Merge → Déploiement automatique sur staging
```

**Production (main branch):**
```bash
git push origin develop
# PR → main
# ✅ CI/CD passe
# Merge → Déploiement automatique en production
# Release créée automatiquement
```

---

## 📊 Métriques & Rapports

### Coverage Report

```bash
npm run test:coverage
```

Génère:
- `coverage/index.html` - Rapport HTML interactif
- `coverage/lcov.info` - Format LCOV pour Codecov

### Lint Report

```bash
npm run lint
```

Affiche:
- Erreurs (doivent être fixées)
- Avertissements (recommandé de fixer)

### Type Report

```bash
npm run check
```

Affiche:
- Erreurs TypeScript
- Warnings

---

## 🔒 Sécurité

### npm audit

```bash
npm audit
npm audit fix
```

Vérifie les vulnérabilités dans les dépendances.

### Snyk

```bash
snyk auth
snyk test
snyk monitor
```

Scanning avancé des vulnérabilités.

### Secrets Management

**Ne jamais commiter:**
- `.env` files
- API keys
- Tokens
- Credentials

**Utiliser:**
- GitHub Secrets
- Environment variables
- `.env.example` (template)

---

## 🐛 Troubleshooting

### ESLint errors

```bash
# Voir les erreurs
npm run lint

# Fixer automatiquement
npm run lint:fix

# Pour un fichier spécifique
npx eslint app/home.tsx --fix
```

### TypeScript errors

```bash
# Voir les erreurs
npm run check

# Vérifier un fichier
npx tsc app/home.tsx --noEmit
```

### Test failures

```bash
# Exécuter les tests en mode watch
npm test -- --watch

# Exécuter un test spécifique
npm test -- app/home.test.tsx

# Exécuter avec UI
npm run test:ui
```

### Build failures

```bash
# Nettoyer et reconstruire
rm -rf dist node_modules
npm install
npm run build
```

---

## 📈 Bonnes Pratiques

### 1. Commits

```bash
# ✅ Bon
git commit -m "feat: add user authentication"
git commit -m "fix: resolve memory leak in useAuth"
git commit -m "docs: update README"

# ❌ Mauvais
git commit -m "fix stuff"
git commit -m "update"
```

### 2. Pull Requests

```
Title: feat: add user authentication

Description:
- Implemented OAuth 2.0 login
- Added secure token storage
- Added unit tests (85% coverage)

Closes #123
```

### 3. Code Review

- ✅ Vérifier que CI/CD passe
- ✅ Vérifier la couverture de tests
- ✅ Vérifier la documentation
- ✅ Vérifier les performances

### 4. Testing

- ✅ Écrire des tests pour les nouvelles features
- ✅ Maintenir >80% coverage
- ✅ Tester les cas d'erreur
- ✅ Tester les edge cases

---

## 📚 Ressources

### Documentation
- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)
- [Vitest](https://vitest.dev/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Snyk](https://snyk.io/)

### Outils
- [Codecov](https://codecov.io/) - Coverage tracking
- [SonarQube](https://www.sonarqube.org/) - Code quality
- [Dependabot](https://dependabot.com/) - Dependency updates

---

## 🎯 Prochaines Étapes

1. **Implémenter les tests unitaires** - Ajouter des tests pour 80%+ du code
2. **Ajouter les tests d'intégration** - Tester les workflows complets
3. **Ajouter les tests E2E** - Tester avec Detox
4. **Améliorer la couverture** - Atteindre 90%+ coverage
5. **Ajouter le monitoring** - Sentry, DataDog, etc.

---

**Fin du CI/CD Guide**
