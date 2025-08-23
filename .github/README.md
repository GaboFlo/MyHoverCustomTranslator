# GitHub Actions

Ce projet utilise GitHub Actions pour automatiser les tests, la compilation et les releases.

## Workflows disponibles

### 🔄 CI (Continuous Integration)

**Fichier :** `.github/workflows/ci.yml`

**Déclencheurs :**

- Push sur les branches `main` et `develop`
- Pull Requests vers `main` et `develop`

**Actions :**

- ✅ Compilation TypeScript
- ✅ Vérification ESLint
- ✅ Contrôle des types TypeScript
- ✅ Validation des fichiers de build
- ✅ Upload des artefacts de build

**Matrices :**

- Node.js 18.x et 20.x

### 🚀 Release

**Fichier :** `.github/workflows/release.yml`

**Déclencheurs :**

- Push de tags commençant par `v*` (ex: `v1.0.0`)

**Actions :**

- ✅ Tests complets
- ✅ Build de l'extension
- ✅ Création automatique de release GitHub
- ✅ Upload des fichiers de l'extension

### 📝 PR Check

**Fichier :** `.github/workflows/pr-check.yml`

**Déclencheurs :**

- Ouverture/modification de Pull Requests

**Actions :**

- ✅ Vérifications de qualité
- ✅ Commentaires automatiques sur les PR
- ✅ Feedback en temps réel

## Utilisation

### Pour les développeurs

1. **Fork et clone** le repository
2. **Créez une branche** pour votre fonctionnalité
3. **Développez** avec les scripts locaux :
   ```bash
   npm install
   npm run build
   npm run lint
   ```
4. **Poussez** votre code et créez une PR
5. Les **GitHub Actions** vérifieront automatiquement votre code

### Pour les releases

#### Méthode automatique (recommandée)

```bash
# Linux/macOS
npm run release 1.2.3

# Windows
npm run release:win 1.2.3
```

#### Méthode manuelle

```bash
# 1. Mettre à jour la version dans manifest.json
# 2. Créer un tag
git tag v1.2.3
git push origin v1.2.3
```

Le workflow **Release** va automatiquement :

- ✅ Mettre à jour la version dans le manifest selon le tag
- ✅ Compiler l'extension
- ✅ Créer un fichier ZIP pour Chrome Store
- ✅ Créer une release GitHub avec le ZIP
- ✅ Uploader tous les artefacts

## Scripts locaux

```bash
npm run build      # Compiler l'extension
npm run lint       # Vérifier le code
npm run dev        # Mode développement
npm run clean      # Nettoyer le build
```

## Statut des workflows

Les badges de statut sont affichés dans le README principal :

- ![CI](https://github.com/[USERNAME]/MyHoverCustomTranslator/workflows/CI/badge.svg)
- ![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)
- ![License](https://img.shields.io/badge/License-MIT-green.svg)

## Dépannage

### Erreurs courantes

1. **Échec de compilation TypeScript**

   - Vérifiez les types dans votre code
   - Exécutez `npx tsc --noEmit` localement

2. **Erreurs ESLint**

   - Exécutez `npm run lint:fix` pour corriger automatiquement
   - Vérifiez les règles dans `.eslintrc.json`

3. **Échec de build**
   - Vérifiez que tous les fichiers nécessaires sont présents
   - Exécutez `npm run build` localement

### Support

Pour toute question sur les GitHub Actions :

- Consultez les logs dans l'onglet "Actions" de GitHub
- Ouvrez une issue avec les détails de l'erreur
