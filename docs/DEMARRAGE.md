# Guide de Démarrage - Application Circonscription

## 🚀 Installation et Lancement

### Première Installation

```bash
# 1. Se positionner dans le dossier du projet
cd circonscription-app-v2

# 2. Installer les dépendances
npm install

# 3. Compiler l'application
npm run build

# 4. Lancer en mode production
npm start
```

L'application sera accessible sur : **http://localhost:3000**

---

## 🔧 Commandes Disponibles

### Mode Développement (avec rechargement automatique)
```bash
npm run dev
```
- Idéal pour développer et tester
- Rechargement automatique à chaque modification
- Plus lent que le mode production
- Accès : http://localhost:3000

### Mode Production (recommandé pour utilisation)
```bash
# 1. Compiler une seule fois
npm run build

# 2. Lancer le serveur
npm start
```
- Plus rapide et optimisé
- À utiliser pour une utilisation quotidienne
- Nécessite de recompiler après chaque modification du code

---

## ⚠️ Résolution du Problème Actuel

### Erreur : "Could not find a production build"

**Cause :** L'application n'a pas été compilée

**Solution :**
```bash
# Dans le terminal PowerShell, exécutez :
npm run build

# Attendez la fin de la compilation (peut prendre 1-2 minutes)
# Puis lancez :
npm start
```

---

## 🔐 Première Connexion

Une fois l'application lancée :

1. Ouvrir **http://localhost:3000** dans votre navigateur
2. Cliquer sur **"Se connecter"**
3. Utiliser les identifiants par défaut :
   ```
   Username: superadmin
   Password: SuperAdmin2026!
   ```
4. ✅ Vous êtes connecté en tant que Super Administrateur

**⚠️ IMPORTANT :** Changez ce mot de passe dès la première connexion !

---

## 📋 Checklist Premier Lancement

- [ ] npm install ✓
- [ ] npm run build ✓
- [ ] npm start ✓
- [ ] Ouvrir http://localhost:3000 ✓
- [ ] Se connecter avec superadmin ✓
- [ ] Changer le mot de passe par défaut ✓
- [ ] Créer les autres utilisateurs ✓
- [ ] Importer les premières données ✓

---

## 🔄 Redémarrage Quotidien

Si vous arrêtez l'application et voulez la relancer :

```bash
# Simplement :
npm start
```

Pas besoin de refaire `npm run build` sauf si vous modifiez le code source.

---

## 🛑 Arrêter l'Application

Dans le terminal PowerShell :
```
Ctrl + C
```

---

## 📝 Notes Importantes

### Avertissement "Invalid next.config.js"
```
⚠ Invalid next.config.js options detected:
⚠ Unrecognized key(s) in object: 'turbopack'
```
**Ce n'est qu'un avertissement**, pas une erreur. L'application fonctionne normalement. Cela signifie juste qu'une option de configuration n'est pas reconnue dans cette version de Next.js.

### Port Déjà Utilisé
Si vous voyez :
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution :**
```bash
# Option 1 : Arrêter l'autre processus qui utilise le port 3000
# Option 2 : Utiliser un autre port
$env:PORT=3001; npm start
```

---

## 💾 Sauvegarde des Données

Les données sont stockées dans le dossier `data/` :
```
circonscription-app-v2/
└── data/
    ├── users.json           # Utilisateurs
    ├── enseignants.json     # TRM
    ├── evaluations.json     # Évaluations
    ├── ecoles.json          # Écoles
    └── archives/            # Archives annuelles
        ├── 2023-2024.json
        └── 2024-2025.json
```

**Recommandation :** Sauvegardez régulièrement ce dossier `data/`

---

## 🆘 Problèmes Courants

### "Module not found"
```bash
# Réinstaller les dépendances
rm -rf node_modules
npm install
npm run build
```

### L'application ne démarre pas
```bash
# Vérifier que le port 3000 est libre
# Vérifier qu'aucune autre instance ne tourne déjà
# Redémarrer le terminal
```

### Page blanche / Erreur 404
```bash
# Recompiler l'application
npm run build
npm start
```

---

## 📞 Support

En cas de problème persistant :
1. Vérifier les logs dans le terminal
2. Consulter la documentation dans les fichiers .md
3. Vérifier que Node.js est installé (version 18+)

---

**Bon démarrage avec votre application ! 🎉**
