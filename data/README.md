# Dossier Data - Persistance des Données

Ce dossier contient toutes les données de l'application :

## 📁 Fichiers de Données

- `users.json` - Comptes utilisateurs
- `ecoles.json` - Liste des écoles
- `enseignants.json` - Liste des enseignants
- `evaluations.json` - Résultats des évaluations
- `effectifs.json` - Effectifs des classes
- `sync_logs.json` - Logs de synchronisation

## 🔒 Persistance

**Ces fichiers sont PERSISTANTS et ne doivent PAS être supprimés automatiquement.**

Les données restent sauvegardées entre les redémarrages de l'application.

## 🗑️ Réinitialisation

Pour effacer toutes les données :

1. **Via l'interface** (recommandé) :
   - Aller dans "Gestion des données"
   - Cliquer sur "Réinitialiser toutes les données"

2. **Manuellement** :
   - Supprimer tous les fichiers `.json` de ce dossier
   - OU supprimer le dossier entier et relancer l'application

## ⚠️ Important

- **NE PAS** supprimer ce dossier en production
- **NE PAS** ajouter ce dossier à `.gitignore` complètement
- Les fichiers `.json` DOIVENT persister entre les déploiements

## 🔄 Backup

Il est recommandé de faire des sauvegardes régulières de ce dossier :

```bash
# Créer une sauvegarde
cp -r data/ data_backup_$(date +%Y%m%d)/

# Restaurer une sauvegarde
cp -r data_backup_YYYYMMDD/* data/
```

## 📝 Notes de Développement

- Le dossier est créé automatiquement au premier lancement
- Les fichiers sont créés à la demande lors des imports
- Un utilisateur admin par défaut est créé si aucun utilisateur n'existe
