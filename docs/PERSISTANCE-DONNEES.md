# Persistance des Données - Guide Utilisateur

## 📦 Comment Fonctionnent les Données ?

Toutes les données que vous importez (écoles, enseignants, évaluations, etc.) sont **automatiquement sauvegardées** dans le dossier `data/` de l'application.

## ✅ Ce qui est Persistant

### Données Sauvegardées Automatiquement
- ✅ Écoles importées
- ✅ Enseignants importés (fichier TRM)
- ✅ Évaluations nationales
- ✅ Effectifs et statistiques
- ✅ Comptes utilisateurs
- ✅ Logs d'imports

### Après Import
Une fois importées, vos données restent disponibles **indéfiniment** jusqu'à ce que vous les supprimiez volontairement.

## 🔄 Comportement Normal

### ✅ Vous NE devez PAS réimporter à chaque fois

**Scénario Normal :**
```
1. Premier lancement → Importer les fichiers
2. Fermer l'application
3. Rouvrir l'application → Les données sont TOUJOURS LÀ ✅
4. Naviguer dans les pages → Tout fonctionne ✅
```

### ❌ Si vous devez réimporter à chaque fois

**C'est ANORMAL** - Cela signifie qu'un de ces problèmes existe :

1. **Le dossier `data/` est supprimé** au redémarrage
   - Vérifier que le dossier existe : `circonscription-app-v2/data/`
   - S'assurer qu'il n'est pas dans `.gitignore` (sauf les `.db`)

2. **Les permissions sont incorrectes**
   - Le dossier doit avoir les droits d'écriture
   - Vérifier : `ls -la data/`

3. **L'application tourne en mode développement avec hot-reload**
   - En mode `npm run dev`, les données peuvent sembler se réinitialiser
   - **Solution** : Utiliser `npm run build` puis `npm start` pour tester

4. **Docker ou conteneur qui réinitialise**
   - Si vous utilisez Docker, le volume doit être monté
   - **Solution** : Créer un volume persistant pour `/data`

## 🛠️ Solutions par Environnement

### Mode Développement (npm run dev)

Les données **SONT** sauvegardées mais :
- Le hot-reload peut causer des confusions
- Vérifier dans le dossier physique : `./data/ecoles.json`

```bash
# Vérifier que les fichiers existent
ls -la data/

# Devrait afficher :
# users.json
# ecoles.json
# enseignants.json
# evaluations.json
# etc.
```

### Mode Production (npm run build + start)

```bash
# 1. Builder l'application
npm run build

# 2. Lancer en production
npm start

# Les données sont maintenant 100% persistantes
```

### Déploiement sur Serveur

**Important :** Le dossier `data/` doit être :
- ✅ Créé sur le serveur
- ✅ Accessible en écriture
- ✅ PAS supprimé lors des mises à jour

**Vercel / Netlify :**
- Ces plateformes sont **stateless** (sans état)
- Les données ne persistent PAS naturellement
- **Solution :** Utiliser une base de données externe (MongoDB, PostgreSQL, etc.)

**VPS / Serveur dédié :**
- Les données persistent naturellement
- S'assurer que le dossier `data/` existe
- Faire des backups réguliers

## 📊 Vérifier la Persistance

### Test Simple

1. Importer un fichier (ex: TRM)
2. Vérifier : "Enseignants" → Voir la liste
3. Fermer l'application complètement
4. Rouvrir l'application
5. Aller dans "Enseignants"
6. **Résultat attendu :** Les enseignants sont toujours là ✅

### Test Technique

```bash
# 1. Importer des données via l'interface

# 2. Vérifier que les fichiers sont créés
ls -lh data/

# Devrait montrer :
# ecoles.json (avec une taille > 0)
# enseignants.json (avec une taille > 0)
# etc.

# 3. Afficher le contenu d'un fichier
cat data/ecoles.json

# Devrait afficher du JSON avec vos écoles
```

## 🗑️ Réinitialiser les Données

### Via l'Interface (Recommandé)

1. Aller dans **"Gestion des données"**
2. Section **"Zone Dangereuse - Réinitialisation"**
3. Cliquer sur **"Réinitialiser toutes les données"**
4. Confirmer

**Résultat :** Toutes les données sont effacées (sauf les comptes utilisateurs)

### Manuellement (Avancé)

```bash
# Supprimer tous les fichiers de données
rm data/ecoles.json
rm data/enseignants.json
rm data/evaluations.json
rm data/effectifs.json
rm data/sync_logs.json

# OU supprimer tout le dossier
rm -rf data/

# Redémarrer l'application
# Le dossier sera recréé automatiquement
```

## 🔐 Sécurité

### Backup Recommandé

Avant une mise à jour majeure :

```bash
# Créer une sauvegarde datée
cp -r data/ data_backup_$(date +%Y%m%d_%H%M%S)/
```

### Restauration

```bash
# Restaurer depuis une sauvegarde
cp -r data_backup_YYYYMMDD_HHMMSS/* data/
```

## 📝 Cas d'Usage

### Scénario 1 : Utilisation Quotidienne
```
Septembre : Importer TRM → Données sauvegardées
Octobre : Importer évaluations → Ajoutées aux données
Novembre : Consulter statistiques → Tout est là
...toute l'année... → Données toujours présentes
Juin : Réinitialiser → Prêt pour l'année suivante
```

### Scénario 2 : Mise à Jour Annuelle
```
1. Fin août : Réinitialiser les données
2. Début septembre : Importer nouveau TRM
3. Importer nouvelles évaluations
4. Toute l'année : Les données restent
```

### Scénario 3 : Migration vers Nouveau Serveur
```
1. Sur ancien serveur : Backup du dossier data/
2. Sur nouveau serveur : Installer l'application
3. Copier le dossier data/ sauvegardé
4. Démarrer l'application → Toutes les données sont là
```

## ❓ FAQ

### Q: Dois-je importer à chaque démarrage ?
**R: NON.** Si c'est le cas, il y a un problème de configuration.

### Q: Où sont stockées mes données ?
**R:** Dans le dossier `data/` à la racine du projet, au format JSON.

### Q: Puis-je éditer manuellement les fichiers JSON ?
**R:** Oui, mais **à vos risques**. Préférez l'interface web.

### Q: Les données sont-elles sécurisées ?
**R:** Elles sont stockées localement sur votre serveur. Pensez aux backups.

### Q: Que se passe-t-il en cas de corruption de données ?
**R:** Restaurez depuis un backup ou réinitialisez et réimportez.

### Q: Puis-je exporter mes données ?
**R:** Oui, copiez simplement le dossier `data/` entier.

## 🆘 Problèmes Courants

### Problème : "Je dois réimporter à chaque fois"

**Cause probable :**
- Le dossier `data/` est supprimé ou non accessible
- L'application tourne en mode sans état (Vercel/Netlify)
- Problème de permissions

**Solution :**
1. Vérifier que `data/` existe et a les bonnes permissions
2. Utiliser un serveur avec système de fichiers persistant
3. Ou migrer vers une vraie base de données

### Problème : "Les données disparaissent parfois"

**Cause probable :**
- Crash de l'application pendant une écriture
- Disque plein
- Corruption du fichier JSON

**Solution :**
1. Vérifier l'espace disque
2. Consulter les logs : `console.log` dans le terminal
3. Restaurer depuis un backup

### Problème : "Erreur lors de la lecture des données"

**Cause probable :**
- Fichier JSON corrompu
- Encodage incorrect

**Solution :**
```bash
# Vérifier la validité du JSON
cat data/ecoles.json | jq .

# Si erreur, restaurer ou réinitialiser
rm data/ecoles.json
```

---

**En résumé :** Vos données doivent être **persistantes** automatiquement. Si ce n'est pas le cas, c'est un problème de configuration à résoudre, pas un comportement normal de l'application.
