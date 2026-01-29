# Système d'Archivage Annuel

## 📚 Vue d'ensemble

Le système d'archivage permet de sauvegarder et consulter les données de chaque année scolaire passée, rendant l'application pérenne sur plusieurs années.

## 🎯 Fonctionnalités

### 1. Création d'Archives
- Sauvegarde complète de toutes les données actuelles
- Format : Année scolaire (ex: 2024-2025)
- Recommandé : Chaque 1er septembre avant d'importer les nouvelles données

### 2. Consultation d'Archives
- **Interface complète** : Les données archivées sont consultables dans l'interface normale
- **Toutes les pages disponibles** : Circonscription, Écoles, Enseignants, Évaluations, Statistiques
- **Mode lecture seule** : Les archives ne peuvent pas être modifiées

### 3. Gestion des Archives
- Liste de toutes les archives disponibles
- Suppression d'archives (avec confirmation)
- Métadonnées : Date d'archivage, année scolaire

## 📂 Structure des Données

### Emplacement
```
data/
├── archives/
│   ├── 2023-2024.json
│   ├── 2024-2025.json
│   └── 2025-2026.json
├── ecoles.json           (données actuelles)
├── enseignants.json      (données actuelles)
└── ...
```

### Contenu d'une Archive
```json
{
  "anneeScolaire": "2024-2025",
  "dateArchivage": "2025-09-01T10:30:00.000Z",
  "data": {
    "ecoles": [...],
    "ecoles_identite": [...],
    "ecoles_structure": [...],
    "enseignants": [...],
    "evaluations": [...],
    "statistiques_ecoles": [...],
    "stagiaires_sopa": [...]
  }
}
```

## 🔄 Workflow Annuel Recommandé

### Fin d'Année Scolaire (Août)

**1. Créer une Archive**
```
1. Aller sur "Archives"
2. Cliquer "➕ Nouvelle archive"
3. Saisir l'année : "2024-2025"
4. Valider
→ Toutes les données sont sauvegardées
```

**2. Réinitialiser les Données Actuelles**
```
1. Aller sur "Gestion des données"
2. Section "Zone Dangereuse"
3. Cliquer "Réinitialiser toutes les données"
4. Confirmer
→ Les données actuelles sont effacées
```

**3. Importer les Nouvelles Données**
```
1. Importer nouveau TRM
2. Importer nouvelles évaluations
3. Importer fichiers écoles
4. Etc.
→ Prêt pour la nouvelle année scolaire
```

### Début d'Année Scolaire (Septembre)

L'application contient les nouvelles données, l'archive contient les anciennes.

## 🖥️ Utilisation de l'Interface

### Accéder aux Archives

**Depuis la Page d'Accueil**
```
1. Se connecter
2. Cliquer sur la carte "📚 Archives"
→ Liste de toutes les archives
```

### Consulter une Archive

**Navigation**
```
1. Sur la page Archives
2. Cliquer "👁️ Consulter" sur une année
3. Choisir la section à consulter :
   - Circonscription
   - Écoles
   - Enseignants
   - Évaluations
   - Statistiques
```

**Exemple : Consulter les Enseignants 2023-2024**
```
Archives > 2023-2024 > Consulter > Enseignants
→ Affichage du tableau des enseignants avec les données de 2023-2024
```

## 📊 Pages de Consultation d'Archives

### Structure des URLs
```
/archives                                    → Liste des archives
/archives/consulter?annee=2024-2025         → Vue d'ensemble d'une archive
/archives/consulter/circonscription?annee=  → Page Circonscription archivée ✅
/archives/consulter/ecoles?annee=           → Page Écoles archivée ✅
/archives/consulter/enseignants?annee=      → Page Enseignants archivée ✅
/archives/consulter/evaluations?annee=      → Page Évaluations archivée ✅
/archives/consulter/statistiques?annee=     → Page Statistiques archivée ✅
```

### Pages Créées ✅

Toutes les pages de consultation sont maintenant disponibles :
- ✅ `/archives/consulter/circonscription/page.tsx` - Vue d'ensemble avec statistiques
- ✅ `/archives/consulter/ecoles/page.tsx` - Liste complète des écoles
- ✅ `/archives/consulter/enseignants/page.tsx` - Tableau complet avec filtres
- ✅ `/archives/consulter/evaluations/page.tsx` - Résultats par niveau
- ✅ `/archives/consulter/statistiques/page.tsx` - Effectifs et données ONDE

**Fonctionnalités communes à toutes les pages :**
- Banner "Mode Consultation Archive" pour rappeler qu'on consulte des données passées
- Fil d'Ariane pour navigation facile
- Chargement des données depuis l'API `/api/archives/data`
- Interface identique aux pages normales (même UX)

## 🔧 APIs Disponibles

### Liste des Archives
```
GET /api/archives
→ { archives: ["2024-2025", "2023-2024", ...] }
```

### Créer une Archive
```
POST /api/archives
Body: { anneeScolaire: "2024-2025" }
→ Sauvegarde toutes les données actuelles
```

### Récupérer une Archive Complète
```
GET /api/archives/data?annee=2024-2025
→ { anneeScolaire, dateArchivage, data: {...} }
```

### Récupérer des Données Spécifiques
```
GET /api/archives/data?annee=2024-2025&type=enseignants
→ [...] (liste des enseignants de 2024-2025)
```

### Supprimer une Archive
```
DELETE /api/archives?annee=2024-2025
→ Supprime l'archive (irréversible)
```

## 💡 Conseils d'Utilisation

### Nommage des Archives
- **Format recommandé** : `YYYY-YYYY` (ex: 2024-2025)
- **Cohérent** : Utilisez toujours le même format
- **Explicite** : L'année de début correspond à septembre

### Fréquence de Sauvegarde
- **Minimum** : 1 fois par an (1er septembre)
- **Recommandé** : Avant chaque import massif de données
- **Backup** : Considérer aussi des sauvegardes du dossier `/data`

### Espace Disque
- Une archive complète : ~1-5 MB
- 10 années archivées : ~10-50 MB
- Négligeable pour un serveur moderne

### Sécurité
- Les archives sont **en lecture seule** dans l'interface
- Seuls les utilisateurs authentifiés peuvent créer/supprimer
- Aucune modification possible des archives via l'interface

## 🔮 Évolutions Futures Possibles

- [ ] Export d'archives au format ZIP
- [ ] Comparaison entre deux années
- [ ] Graphiques d'évolution sur plusieurs années
- [ ] Import d'archives depuis un fichier
- [ ] Recherche dans toutes les archives

## ⚠️ Points Importants

### Avant de Réinitialiser
```
✅ TOUJOURS créer une archive avant de réinitialiser les données
❌ NE JAMAIS réinitialiser sans avoir archivé
```

### Suppression d'Archives
```
⚠️ La suppression est IRREVERSIBLE
💾 Envisager un export avant suppression
```

### Consultation vs Données Actuelles
```
📚 Archives = Données PASSÉES (lecture seule)
📊 Pages normales = Données ACTUELLES (modifiables)
```

## 🆘 Dépannage

### "Archive non trouvée"
- Vérifier que le fichier existe dans `/data/archives/`
- Vérifier le nom de l'année (format exact)

### "Données manquantes dans l'archive"
- L'archive ne contient que les données présentes au moment de sa création
- Si un fichier était vide, il sera vide dans l'archive

### "Erreur lors de la création"
- Vérifier les permissions du dossier `/data/archives/`
- Vérifier l'espace disque disponible

---

**Le système d'archivage rend l'application pérenne et permet de garder un historique complet de plusieurs années scolaires !** 📚🎓
