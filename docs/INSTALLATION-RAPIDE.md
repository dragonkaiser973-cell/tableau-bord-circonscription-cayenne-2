# 🚀 Installation Rapide - Application Circonscription

## ⚡ Démarrage en 3 Étapes

### 1️⃣ Installer les Dépendances
```powershell
npm install
```

### 2️⃣ Créer le Super Admin
```powershell
node create-admin.js
```
Cela va créer le fichier `data/users.json` avec le super administrateur.

### 3️⃣ Compiler et Lancer
```powershell
npm run build
npm start
```

L'application sera accessible sur **http://localhost:3000**

---

## 🔐 Connexion

**Identifiants par défaut :**
```
Username: superadmin
Password: SuperAdmin2026!
```

⚠️ **Changez ce mot de passe après la première connexion !**

---

## 🔴 Problème : "Identifiants invalides" ?

Si vous ne pouvez pas vous connecter, c'est que le fichier `data/users.json` n'a pas été créé.

### Solution Rapide :

**Option 1 - Script automatique (RECOMMANDÉ)**
```powershell
node create-admin.js
```

**Option 2 - Création manuelle**

1. Créez le dossier `data` s'il n'existe pas :
```powershell
mkdir data -Force
```

2. Créez le fichier `data/users.json` avec ce contenu :
```json
[
  {
    "id": 1,
    "username": "superadmin",
    "password": "$2a$10$rGEKWnHRzQqxZqZqZqZqZuFvGJqJqJqJqJqJqJqJqJqJqJqJqJqJq",
    "role": "admin",
    "created_at": "2026-01-24T00:00:00.000Z"
  }
]
```

3. Relancez l'application :
```powershell
npm start
```

---

## 📋 Commandes Utiles

| Commande | Description |
|----------|-------------|
| `node create-admin.js` | Créer le super admin |
| `npm install` | Installer les dépendances |
| `npm run build` | Compiler l'application |
| `npm start` | Lancer en mode production |
| `npm run dev` | Lancer en mode développement |
| `Ctrl + C` | Arrêter l'application |

---

## 📁 Structure des Fichiers

```
circonscription-app-v2/
├── data/                    ← Données de l'application
│   ├── users.json          ← Utilisateurs (créé par create-admin.js)
│   ├── enseignants.json    ← TRM (créé après import)
│   ├── evaluations.json    ← Évaluations (créé après import)
│   └── archives/           ← Archives annuelles
├── create-admin.js         ← Script de création admin
└── ...
```

---

## ✅ Checklist Installation

- [ ] `npm install` ✓
- [ ] `node create-admin.js` ✓
- [ ] `npm run build` ✓
- [ ] `npm start` ✓
- [ ] Ouvrir http://localhost:3000 ✓
- [ ] Se connecter avec superadmin ✓
- [ ] Changer le mot de passe ✓

---

## 🆘 Besoin d'Aide ?

Consultez les fichiers de documentation :
- **DEMARRAGE.md** - Guide de démarrage complet
- **CORRECTION-LOGIN.md** - Solutions aux problèmes de connexion
- **ADMINISTRATION.md** - Guide d'administration
- **ARCHIVAGE.md** - Guide du système d'archivage

---

**Bon démarrage ! 🎉**
