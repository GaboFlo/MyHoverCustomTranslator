# 🔧 Guide de Dépannage - MyHover Custom Translator

## Erreur : "Impossible de charger le fichier JavaScript"

### ✅ Solution 1 : Vérification de l'installation

1. **Assurez-vous que l'extension est compilée** :

   ```bash
   npm install
   npm run build
   ```

2. **Vérifiez que le dossier `dist/` contient tous les fichiers** :
   - `manifest.json`
   - `content.js`
   - `options.js`
   - `popup.js`
   - `styles.css`
   - `options.html`
   - `popup.html`
   - `icons/` (dossier)

### ✅ Solution 2 : Installation correcte dans Chrome

1. **Ouvrez Chrome** et allez dans `chrome://extensions/`
2. **Activez le "Mode développeur"** (toggle en haut à droite)
3. **Cliquez sur "Charger l'extension non empaquetée"**
4. **Sélectionnez le dossier `dist/`** (pas le dossier racine du projet)
5. **Vérifiez qu'aucune erreur n'apparaît** dans la liste des extensions

### ✅ Solution 3 : Vérification des fichiers

1. **Ouvrez le dossier `dist/`** dans votre explorateur de fichiers
2. **Vérifiez que `manifest.json` pointe vers les bons fichiers** :

   ```json
   {
     "content_scripts": [
       {
         "js": ["content.js"],
         "css": ["styles.css"]
       }
     ],
     "options_page": "options.html",
     "action": {
       "default_popup": "popup.html"
     }
   }
   ```

3. **Vérifiez que les fichiers HTML pointent vers les bons scripts** :
   - `options.html` : `<script src="options.js"></script>`
   - `popup.html` : `<script src="popup.js"></script>`

### ✅ Solution 4 : Rechargement de l'extension

1. **Dans `chrome://extensions/`**, cliquez sur le bouton "🔄" de votre extension
2. **Ou supprimez et réinstallez l'extension** :
   - Cliquez sur "Supprimer"
   - Rechargez l'extension depuis le dossier `dist/`

### ✅ Solution 5 : Vérification de la console

1. **Ouvrez la console du navigateur** (F12)
2. **Allez sur une page web**
3. **Vérifiez s'il y a des erreurs JavaScript**
4. **Les erreurs courantes** :
   - `chrome.storage is not defined` : Extension mal installée
   - `content.js not found` : Chemin incorrect dans le manifest

## Erreur : "Extension ne fonctionne pas"

### ✅ Vérifications de base

1. **L'extension est-elle activée ?**

   - Cliquez sur l'icône de l'extension
   - Vérifiez que le statut est "Actif"

2. **Le dictionnaire est-il configuré ?**

   - Ouvrez les options de l'extension
   - Ajoutez des traductions dans le JSON
   - Cliquez sur "Sauvegarder"

3. **Êtes-vous sur un site autorisé ?**
   - Vérifiez la liste des URLs ciblées dans les options
   - Laissez vide pour activer sur tous les sites

### ✅ Test de l'extension

1. **Utilisez le fichier de test** :

   - Ouvrez `test-extension.html` dans votre navigateur
   - Survolez les mots de test
   - Vérifiez que les bulles apparaissent

2. **Testez sur un site simple** :
   - Allez sur `https://example.com`
   - Survolez du texte
   - Vérifiez la console pour les erreurs

## Erreur : "Bulle de traduction n'apparaît pas"

### ✅ Causes possibles

1. **Délai d'affichage trop long** :

   - Vérifiez le délai dans les options (par défaut : 300ms)
   - Réduisez-le si nécessaire

2. **Mot non trouvé dans le dictionnaire** :

   - Vérifiez que le mot existe dans votre JSON
   - La recherche est insensible à la casse

3. **CSS en conflit** :
   - Vérifiez que `styles.css` est bien chargé
   - Inspectez l'élément `#hover-translator-tooltip`

### ✅ Debug

1. **Ajoutez des logs dans la console** :

   - Ouvrez les outils de développement
   - Allez dans l'onglet "Console"
   - Survolez du texte et vérifiez les messages

2. **Vérifiez le DOM** :
   - Inspectez la page
   - Cherchez l'élément `#hover-translator-tooltip`
   - Vérifiez qu'il est bien créé

## Erreur : "Problème de compilation TypeScript"

### ✅ Solutions

1. **Vérifiez les dépendances** :

   ```bash
   npm install
   ```

2. **Nettoyez et recompilez** :

   ```bash
   npm run clean
   npm run build
   ```

3. **Vérifiez la configuration TypeScript** :
   - `tsconfig.json` est-il correct ?
   - Les types sont-ils bien définis ?

## Erreur : "Aucun bouton ne fonctionne"

### ✅ Solution 1 : Erreur de syntaxe JavaScript

1. **Vérifiez la console** (F12) pour les erreurs :

   - `Uncaught SyntaxError: Unexpected token 'export'`
   - `Uncaught ReferenceError: chrome is not defined`

2. **Recompilez l'extension** :

   ```bash
   npm run clean
   npm run build
   ```

3. **Rechargez l'extension** dans `chrome://extensions/`

### ✅ Solution 2 : Vérification des logs

1. **Ouvrez la console** (F12) sur la page d'options
2. **Cherchez les logs** commençant par `🔧` :

   - `🔧 OptionsManager: Initialisation...`
   - `🔧 Éléments trouvés: {...}`
   - `🔧 Tous les événements liés avec succès`

3. **Si les logs n'apparaissent pas**, l'extension n'est pas chargée

### ✅ Solution 3 : Test simple

1. **Ouvrez le fichier** `test-simple.html` dans Chrome
2. **Vérifiez le statut** en haut de la page
3. **Si l'extension est détectée**, le problème vient de la configuration

## Erreur : "Le bouton Options ne fonctionne pas"

### ✅ Solution 1 : Vérification de l'API Chrome

1. **Ouvrez le fichier de test** `test-chrome-api.html` dans Chrome
2. **Cliquez sur "Tester ouverture options"**
3. **Vérifiez les résultats** pour identifier le problème

### ✅ Solution 2 : Méthodes alternatives

1. **Clic droit sur l'icône de l'extension** :

   - Sélectionnez "Options" dans le menu contextuel

2. **Accès direct via URL** :

   - Ouvrez un nouvel onglet
   - Tapez : `chrome-extension://[ID_EXTENSION]/options.html`
   - Remplacez `[ID_EXTENSION]` par l'ID de votre extension

3. **Via les paramètres Chrome** :
   - Allez dans `chrome://extensions/`
   - Trouvez votre extension
   - Cliquez sur "Détails"
   - Cliquez sur "Options"

### ✅ Solution 3 : Rechargement de l'extension

1. **Dans `chrome://extensions/`**, cliquez sur le bouton "🔄"
2. **Ou supprimez et réinstallez l'extension**
3. **Testez à nouveau le bouton Options**

## Erreur : "Problème de permissions"

### ✅ Vérifications

1. **Permissions dans le manifest** :

   ```json
   {
     "permissions": ["storage", "activeTab"],
     "host_permissions": ["<all_urls>"]
   }
   ```

2. **Autorisez l'extension** :
   - Chrome peut demander des permissions supplémentaires
   - Cliquez sur "Autoriser" si demandé

## Support

Si le problème persiste :

1. **Vérifiez la console** pour les erreurs détaillées
2. **Testez sur un autre navigateur** (Firefox, Edge)
3. **Vérifiez la version de Node.js** (>=18.0.0)
4. **Consultez les logs** dans `chrome://extensions/`

---

**💡 Conseil** : Commencez toujours par un `npm run clean && npm run build` pour vous assurer que l'extension est correctement compilée.
