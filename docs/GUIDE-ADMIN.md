# Système d'Administration - Super Utilisateur

## 👑 Vue d'ensemble

L'application dispose d'un système d'administration avec deux types d'utilisateurs :
- **Utilisateurs normaux** : Accès à toutes les pages (Circonscription, Écoles, Enseignants, etc.)
- **Super Admin** : Accès à tout + Gestion des utilisateurs + Gestion des archives

## 🔐 Identifiants par Défaut

### Super Administrateur (créé automatiquement)
```
Username: superadmin
Password: SuperAdmin2026!
Rôle: admin
```

⚠️ **IMPORTANT** : Changez ce mot de passe dès la première connexion !

## 📋 Fonctionnalités du Super Admin

### 1. Gestion des Utilisateurs

**Accès** : Page d'accueil > Carte "👑 Administration"

**Actions disponibles :**
- ✅ **Créer** un nouvel utilisateur
- ✅ **Modifier** un utilisateur existant (username, password, rôle)
- ✅ **Supprimer** un utilisateur (sauf dernier admin)
- ✅ **Voir la liste** de tous les utilisateurs

**Informations affichées :**
- ID utilisateur
- Username
- Rôle (👤 Utilisateur / 👑 Admin)
- Date de création
- Dernière connexion

### 2. Gestion des Archives

**Accès** : Page d'accueil > Carte "👑 Administration"

**Actions disponibles :**
- ✅ **Voir** toutes les archives existantes
- ✅ **Supprimer** une archive

## 🚀 Utilisation

### Première Connexion

**1. Lancer l'application**
```bash
npm install
npm run build
npm start
```

**2. Se connecter**
- Cliquer sur "Se connecter" sur la page d'accueil
- Saisir : `superadmin` / `SuperAdmin2026!`
- ✅ Vous êtes connecté en tant que Super Admin

**3. Accéder à l'administration**
- Vous verrez une carte "👑 Administration" sur la page d'accueil
- Cliquer dessus pour accéder au panneau d'administration

### Créer un Nouvel Utilisateur

**Étape par étape :**
```
1. Page d'accueil → Administration
2. Section "Utilisateurs" → Cliquer "➕ Nouvel utilisateur"
3. Remplir le formulaire :
   - Username: jean.dupont
   - Password: MotDePasse123!
   - Rôle: Utilisateur (ou Administrateur)
4. Cliquer "✅ Créer"
5. ✅ L'utilisateur peut maintenant se connecter
```

### Modifier un Utilisateur

**Étape par étape :**
```
1. Administration → Section "Utilisateurs"
2. Trouver l'utilisateur dans le tableau
3. Cliquer "✏️ Modifier"
4. Modifier les champs souhaités :
   - Username
   - Mot de passe (laisser vide pour ne pas changer)
   - Rôle
5. Cliquer "✅ Modifier"
```

### Supprimer un Utilisateur

**Étape par étape :**
```
1. Administration → Section "Utilisateurs"
2. Trouver l'utilisateur dans le tableau
3. Cliquer "🗑️ Supprimer"
4. Confirmer la suppression
5. ⚠️ Action irréversible !
```

### Gérer les Archives

**Supprimer une archive :**
```
1. Administration → Section "Gestion des Archives"
2. Trouver l'archive (ex: 2023-2024)
3. Cliquer "🗑️" sur la carte
4. Confirmer la suppression
5. ⚠️ Action irréversible !
```

## 🔒 Sécurité

### Bonnes Pratiques

**1. Changer le mot de passe par défaut**
```
1. Se connecter en tant que superadmin
2. Administration → Section Utilisateurs
3. Modifier "superadmin" → Nouveau mot de passe
4. ✅ Mot de passe sécurisé
```

**2. Créer des utilisateurs avec des mots de passe forts**
- Minimum 8 caractères
- Mélange majuscules, minuscules, chiffres, symboles
- Exemples : `Circo2026!`, `IEN_Cayenne#2024`

**3. Ne pas créer trop d'administrateurs**
- Limiter les comptes admin au strict nécessaire
- La plupart des utilisateurs doivent être des "Utilisateurs" normaux

**4. Supprimer les comptes inactifs**
- Vérifier régulièrement la liste des utilisateurs
- Supprimer les comptes qui ne sont plus utilisés

### Protections Intégrées

- ✅ **Mots de passe hashés** : bcrypt avec salt
- ✅ **Tokens JWT** : Authentification sécurisée
- ✅ **Vérification admin** : Toutes les actions admin vérifient le rôle
- ✅ **Dernier admin** : Impossible de supprimer le dernier admin
- ✅ **Confirmation** : Double confirmation avant suppression

## 📊 Structure des Données

### Fichier users.json
```json
[
  {
    "id": 1,
    "username": "superadmin",
    "password": "$2a$10$...", // Hashé avec bcrypt
    "role": "admin",
    "created_at": "2026-01-23T10:00:00.000Z"
  },
  {
    "id": 2,
    "username": "jean.dupont",
    "password": "$2a$10$...",
    "role": "user",
    "created_at": "2026-01-23T11:00:00.000Z",
    "lastLogin": "2026-01-23T14:30:00.000Z"
  }
]
```

### Rôles Disponibles

**`admin`** (Super Admin)
- ✅ Accès à toutes les pages
- ✅ Accès à la page Administration
- ✅ Gestion des utilisateurs
- ✅ Gestion des archives
- ✅ Toutes les fonctionnalités

**`user`** (Utilisateur Normal)
- ✅ Accès à toutes les pages
- ✅ Import de données
- ✅ Consultation des archives
- ✅ Export PDF
- ❌ Pas d'accès à l'administration

## 🔧 APIs Disponibles

### Gestion des Utilisateurs (Admin Seulement)

**GET `/api/admin/users`**
```javascript
Headers: { Authorization: 'Bearer <token>' }
→ Liste tous les utilisateurs (sans les mots de passe)
```

**POST `/api/admin/users`**
```javascript
Headers: { Authorization: 'Bearer <token>' }
Body: { username: 'user', password: 'pass', role: 'user' }
→ Crée un nouvel utilisateur
```

**PUT `/api/admin/users`**
```javascript
Headers: { Authorization: 'Bearer <token>' }
Body: { id: 1, username: 'newname', password: 'newpass', role: 'admin' }
→ Modifie un utilisateur
```

**DELETE `/api/admin/users?id=2`**
```javascript
Headers: { Authorization: 'Bearer <token>' }
→ Supprime un utilisateur
```

## ⚠️ Cas d'Urgence

### Mot de Passe Oublié (Admin)

Si vous perdez le mot de passe admin, vous pouvez le réinitialiser manuellement :

**Option 1 : Supprimer le fichier users.json**
```bash
# 1. Arrêter l'application
# 2. Supprimer le fichier
rm data/users.json
# 3. Redémarrer l'application
npm start
# 4. Le super admin sera recréé avec le mot de passe par défaut
```

**Option 2 : Modifier directement le fichier**
```bash
# 1. Générer un nouveau hash de mot de passe
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('NouveauMotDePasse', 10));"

# 2. Copier le hash
# 3. Éditer data/users.json
# 4. Remplacer le champ "password" de l'admin
# 5. Redémarrer l'application
```

### Réinitialisation Complète

Pour repartir de zéro :
```bash
rm data/users.json
npm start
# Le fichier sera recréé avec le super admin par défaut
```

## 📝 Scénarios d'Usage

### Scénario 1 : Nouveau IEN Prend Ses Fonctions

```
1. Super Admin crée un compte pour le nouvel IEN
   - Username: ien.dupont
   - Password: IEN2026!
   - Rôle: Utilisateur

2. Envoie les identifiants au nouvel IEN
3. L'IEN se connecte et change son mot de passe
4. L'IEN a accès à toutes les données
```

### Scénario 2 : Conseiller Pédagogique

```
1. Super Admin crée un compte
   - Username: cpc.martin
   - Password: CPC2026!
   - Rôle: Utilisateur

2. Le CPC peut consulter toutes les données
3. Le CPC peut créer des archives
4. Le CPC ne peut PAS gérer les utilisateurs
```

### Scénario 3 : Administrateur Supplémentaire

```
1. Super Admin crée un compte admin
   - Username: admin.cayenne2
   - Password: Admin2026!
   - Rôle: Administrateur

2. Ce nouvel admin a les mêmes droits
3. Il peut gérer les autres utilisateurs
4. Utile en cas d'absence du super admin principal
```

## 🎯 Recommandations

### Nombre d'Utilisateurs

- **1-2 Administrateurs** : Super Admin + 1 backup
- **3-5 Utilisateurs** : IEN, CPC, Secrétaire, etc.
- **Total recommandé** : 4-7 utilisateurs maximum

### Renouvellement des Mots de Passe

- **Obligatoire** : Changer le mot de passe par défaut
- **Recommandé** : Changer les mots de passe tous les 6 mois
- **Bonnes pratiques** : Ne pas partager les comptes

### Sauvegarde

Sauvegarder régulièrement le fichier `data/users.json` :
```bash
cp data/users.json data/users.json.backup
```

---

**Le système d'administration permet une gestion complète et sécurisée des accès à l'application !** 👑🔐
