# 🔤 MyHover Custom Translator

[![CI](https://github.com/[USERNAME]/MyHoverCustomTranslator/workflows/CI/badge.svg)](https://github.com/[USERNAME]/MyHoverCustomTranslator/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Extension de navigateur moderne pour la traduction au survol avec dictionnaire personnalisable en JSON.

## ✨ Fonctionnalités

- 🎯 **Traduction au survol** : Affichage élégant des traductions avec bordure bleue
- 📝 **Dictionnaire personnalisable** : Support JSON récursif avec formatage automatique
- 🔍 **Recherche intelligente** : Correspondance exacte et partielle, insensible à la casse
- 🌐 **URLs ciblées** : Configuration des sites où l'extension est active
- 🎨 **Interface moderne** : Design élégant avec snackbars et footer sticky
- 📱 **Responsive** : Compatible mobile et desktop
- 🔧 **TypeScript** : Code typé et maintenable
- 🚀 **Cross-browser** : Chrome, Firefox, Safari, Edge

## 🛠️ Installation

### Développement

```bash
# Cloner le repository
git clone https://github.com/[USERNAME]/MyHoverCustomTranslator.git
cd MyHoverCustomTranslator

# Installer les dépendances
npm install

# Compiler l'extension
npm run build

# Lancer le mode développement
npm run dev
```

### Production

1. Exécuter `npm run build`
2. Charger le dossier `dist/` comme extension non empaquetée dans Chrome/Firefox
3. Ou télécharger la dernière release depuis GitHub

## 📋 Utilisation

1. **Configuration** : Ouvrir les options de l'extension
2. **Dictionnaire** : Ajouter vos traductions au format JSON
3. **URLs** : Spécifier les sites cibles (optionnel)
4. **Activation** : L'extension se lance automatiquement sur les pages configurées

## 🔧 Scripts NPM

```bash
npm run build      # Compiler l'extension
npm run dev        # Nettoyer et recompiler
npm run watch      # Compilation en temps réel
npm run lint       # Vérifier le code avec ESLint
npm run lint:fix   # Corriger automatiquement les erreurs
npm run clean      # Nettoyer le dossier dist/
```

## 🧪 Tests et CI/CD

Le projet utilise GitHub Actions pour :

- ✅ **Compilation TypeScript** : Vérification de la compilation
- ✅ **Linting ESLint** : Contrôle de qualité du code
- ✅ **Vérification des types** : TypeScript strict mode
- ✅ **Tests de build** : Validation des fichiers générés
- ✅ **Releases automatiques** : Création de releases sur tags

### Workflows

- **CI** : Vérifications sur push/PR
- **Release** : Création automatique de releases
- **PR Check** : Commentaires automatiques sur les PR

## 📁 Structure du projet

```
MyHoverCustomTranslator/
├── src/
│   ├── content.ts      # Script de contenu (hover logic)
│   ├── options.ts      # Page d'options
│   ├── popup.ts        # Interface popup
│   └── styles.css      # Styles globaux
├── dist/               # Fichiers compilés
├── icons/              # Icônes de l'extension
├── .github/workflows/  # GitHub Actions
└── package.json        # Configuration NPM
```

## 🎨 Interface

- **Footer sticky** : Barre de sauvegarde toujours visible
- **Snackbars modernes** : Notifications élégantes
- **Bordure bleue** : Indication visuelle des éléments traduisibles
- **Tooltip dégradé** : Affichage des traductions avec style moderne

## 🔒 Sécurité

- Aucune donnée envoyée vers des serveurs externes
- Stockage local uniquement via `chrome.storage.sync`
- Validation JSON stricte
- Gestion des erreurs robuste

## 📄 Licence

MIT License - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📞 Support

- 🐛 **Bugs** : [Issues GitHub](https://github.com/[USERNAME]/MyHoverCustomTranslator/issues)
- 💡 **Suggestions** : [Discussions GitHub](https://github.com/[USERNAME]/MyHoverCustomTranslator/discussions)
- 📧 **Contact** : [Votre email]

---

⭐ **N'oubliez pas de donner une étoile si ce projet vous aide !**
