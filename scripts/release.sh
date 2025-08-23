#!/bin/bash

# Script de release pour MyHover Custom Translator
# Usage: ./scripts/release.sh <version>
# Exemple: ./scripts/release.sh 1.2.3

set -e

if [ $# -eq 0 ]; then
    echo "❌ Erreur: Veuillez spécifier une version"
    echo "Usage: $0 <version>"
    echo "Exemple: $0 1.2.3"
    exit 1
fi

VERSION=$1

# Validation du format de version (semver)
if [[ ! $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "❌ Erreur: Format de version invalide. Utilisez le format semver (ex: 1.2.3)"
    exit 1
fi

echo "🚀 Création de la release v$VERSION..."

# Vérifier que le working directory est propre
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Erreur: Il y a des modifications non commitées"
    echo "Veuillez commiter ou stasher vos modifications avant de créer une release"
    exit 1
fi

# Vérifier que nous sommes sur la branche main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Erreur: Vous devez être sur la branche main pour créer une release"
    echo "Branche actuelle: $CURRENT_BRANCH"
    exit 1
fi

# Mettre à jour la version dans le manifest
echo "📝 Mise à jour de la version dans manifest.json..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    powershell -Command "(Get-Content manifest.json) -replace '\"version\": \"[^\"]*\"', '\"version\": \"$VERSION\"' | Set-Content manifest.json"
else
    # Linux/macOS
    sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" manifest.json
fi

# Commiter la mise à jour de version
git add manifest.json
git commit -m "🔖 Bump version to $VERSION"

# Créer le tag
echo "🏷️  Création du tag v$VERSION..."
git tag -a "v$VERSION" -m "Release v$VERSION"

# Pousser les changements et le tag
echo "📤 Push des changements et du tag..."
git push origin main
git push origin "v$VERSION"

echo "✅ Release v$VERSION créée avec succès !"
echo ""
echo "📋 Prochaines étapes :"
echo "1. Vérifiez que le workflow GitHub Actions s'est exécuté correctement"
echo "2. Téléchargez le ZIP depuis la release GitHub"
echo "3. Mettez à jour l'extension sur le Chrome Web Store"
echo ""
echo "🔗 Liens utiles :"
echo "- GitHub Actions: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\/[^/]*\).*/\1/')/actions"
echo "- Releases: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^/]*\/[^/]*\).*/\1/')/releases"
