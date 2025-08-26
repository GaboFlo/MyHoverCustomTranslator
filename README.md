# 🔤 Traducteur au survol

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Extension de navigateur pour la traduction au survol avec dictionnaire personnalisable.

## Productions
- **Chrome Web Store** : https://chromewebstore.google.com/detail/traducteur-personnalis%C3%A9-a/nmknpgpdoclllikijfkhocimieblajmh
- **Firefox** : Prochainement


## Exemples

### Utilisation où le dictionnaire contient la traduction des codes APE

![Exemple d'utilisation où le dictionnaire contient la traduction des codes APE](assets/hover-example.gif)

### Extension activable site par site directement

<img src="assets/popup-example.png" alt="Extension activable site par site directement" style="max-height: 400px; width: auto;" />

### Configuration dans la page dédiée

![Exemple de configuration dans la page dédiée de l'extension](assets/hover-config-example.gif)

### En résumé 

- 🔧 Configuration : Paramétrez l’extension via les options.
- 📖 Dictionnaire : Ajoutez des traductions (JSON ou manuel).
- 🌐 URLs ciblées : Activez l’extension sur des sites spécifiques.
- 🎯 Survol & copie : Traduction au survol + copie en un clic.
- 🔍 Recherche : Ctrl+Maj+F pour chercher dans la page.

---
## 🛠️ Installation pour les développeuses et développeurs

```bash
# Cloner le repository
git clone https://github.com/gaboflo/MyHoverCustomTranslator.git
cd MyHoverCustomTranslator

# Installer les dépendances
npm install

# Compiler l'extension dans dossier dist
npm run build

```

### Installation sur Chrome/Edge

1. Ouvrir Chrome/Edge et aller dans `chrome://extensions/` ou `edge://extensions/`
2. Activer le **Mode développeur** (toggle en haut à droite)
3. Cliquer sur **"Charger l'extension non empaquetée"**
4. Sélectionner le dossier `dist/` du projet
5. L'extension apparaît dans la barre d'outils

### Installation sur Firefox

Ressource : <https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/>

```bash
npm run dev:firefox
```

Permettra d'observer en direct l'extension, il suffira juste de lancer `npm run build` pour tester le nouveau code, puis `R` dans le shell pour refresh.

**✅ Vérification de l'installation :**

- L'icône de l'extension doit apparaître dans la barre d'outils
- Cliquer sur l'icône doit ouvrir la popup avec les options
- L'extension doit être listée dans `about:addons` (Firefox) ou `chrome://extensions/` (Chrome/Edge)

**⚠️ Note Firefox :** L'extension est temporaire et disparaîtra au redémarrage de Firefox. Pour une installation permanente, utilisez le fichier `.xpi` (voir section Production).

## 📄 Licence

MIT License - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🤝 Contribution

Elles sont bienvenues ! Ouvrez une PR.

## 🔧 Dépannage

### Problèmes courants sur Firefox

**L'extension ne fonctionne pas après installation :**

1. Vérifier que l'extension est bien chargée dans `about:debugging`
2. Redémarrer Firefox après l'installation
3. Vérifier les permissions dans `about:addons`
4. Vérifier que l'ID d'extension est présent dans le manifest (déjà inclus)

**Erreur "storage API will not work with a temporary addon ID" :**

- L'extension inclut déjà un ID explicite dans le manifest
- Recharger l'extension dans `about:debugging`
- Redémarrer Firefox si nécessaire

**L'extension disparaît au redémarrage :**

- C'est normal pour les extensions temporaires. Utilisez le fichier `.xpi` pour une installation permanente.

**Les traductions ne s'affichent pas :**

1. Vérifier que l'extension est activée dans les options
2. Vérifier que les URLs cibles sont correctement configurées
3. Ouvrir la console développeur (F12) pour voir les erreurs éventuelles

### Problèmes courants sur Chrome/Edge

**L'extension ne se charge pas :**

1. Vérifier que le mode développeur est activé
2. Recharger l'extension dans `chrome://extensions/`
3. Vérifier que tous les fichiers sont présents dans le dossier `dist/`

## 📞 Support

- 🐛 **Bugs** : [Issues GitHub](https://github.com/gaboflo/MyHoverCustomTranslator/issues)
- 💡 **Suggestions** : [Discussions GitHub](https://github.com/gaboflo/MyHoverCustomTranslator/discussions)
- 📧 **Contact** : [contact@gaboflo.fr](mailto:contact@gaboflo.fr)

---

⭐ **N'oubliez pas de donner une étoile si ce projet vous aide !**
Projet développé avec l'aide de Cursor
