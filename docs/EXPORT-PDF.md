# Fonctionnalité d'Export PDF

## 📄 Vue d'ensemble

Chaque page de l'application dispose d'un bouton **"📄 Exporter en PDF"** permettant de générer un document PDF de la page actuelle.

## 🎯 Pages avec Export PDF

### 1. **Page Circonscription** 
- **Bouton** : En haut à droite du header
- **Contenu exporté** : Vue complète avec graphiques et statistiques
- **Nom du fichier** : `Circonscription_Cayenne2_YYYY-MM-DD.pdf`

### 2. **Page Enseignants**
- **Bouton** : En haut à droite du header
- **Contenu exporté** : Tableau des enseignants filtrés
- **Colonnes** : Nom, Prénom, École, Statut, Niveau, Échelon
- **Nom du fichier** : `Enseignants_YYYY-MM-DD.pdf`

### 3. **Page Évaluations**
- **Bouton** : En haut à droite du header
- **Contenu exporté** : Statistiques et résultats des évaluations
- **Nom du fichier** : `Evaluations_YYYY-MM-DD.pdf`

### 4. **Page Écoles**
- **Bouton** : En haut à droite du header
- **Contenu exporté** : Liste complète des écoles avec leurs informations
- **Nom du fichier** : `Ecoles_YYYY-MM-DD.pdf`

### 5. **Page Statistiques**
- **Bouton** : En haut à droite du header
- **Contenu exporté** : Tableaux de bord et statistiques ONDE
- **Nom du fichier** : `Statistiques_YYYY-MM-DD.pdf`

### 6. **Page Calendrier**
- **Bouton** : En haut à droite du header
- **Contenu exporté** : Vue mensuelle ou annuelle du calendrier
- **Nom du fichier** : `Calendrier_YYYY-MM-DD.pdf`

## 🛠️ Fonctionnalités

### Export Visuel (Circonscription, Évaluations, Écoles, Statistiques, Calendrier)
- ✅ Capture complète de la page avec graphiques
- ✅ Qualité haute résolution (scale 2x)
- ✅ Pagination automatique si contenu > 1 page
- ✅ En-tête avec titre de la page
- ✅ Pied de page avec date et numéro de page

### Export Tabulaire (Enseignants)
- ✅ Tableau formaté avec en-têtes colorés
- ✅ Lignes alternées pour meilleure lisibilité
- ✅ Respect des filtres appliqués
- ✅ Pagination automatique
- ✅ Date de génération

## 📊 Exemple d'Utilisation

### Cas 1 : Exporter la vue circonscription

```
1. Aller sur "Circonscription"
2. Cliquer sur "📄 Exporter en PDF"
3. Attendre le message "Génération du PDF..."
4. Le fichier se télécharge automatiquement
```

### Cas 2 : Exporter une liste filtrée d'enseignants

```
1. Aller sur "Enseignants"
2. Appliquer des filtres (ex: Statut = Titulaire, École = MAXIMI LIEN SABA)
3. Cliquer sur "📄 Exporter en PDF"
4. Le PDF contient uniquement les enseignants filtrés
```

### Cas 3 : Exporter le calendrier

```
1. Aller sur "Calendrier"
2. Choisir vue mensuelle ou annuelle
3. Cliquer sur "📄 Exporter en PDF"
4. Le PDF reflète la vue actuelle
```

## ⚙️ Configuration

### Bibliothèques Utilisées

- **jsPDF** : Génération de PDF
- **html2canvas** : Capture d'écran HTML vers Canvas

### Fichier Utilitaire

`/lib/pdfExport.ts` contient deux fonctions :

#### `exportToPDF()`
Pour exporter une section HTML complète (avec graphiques)

```typescript
await exportToPDF(
  'element-id',           // ID de l'élément à capturer
  'nom-fichier',          // Nom du PDF (sans .pdf)
  {
    orientation: 'portrait',
    format: 'a4',
    scale: 2,
    includeHeader: true,
    headerText: 'Titre du document'
  }
);
```

#### `exportTableToPDF()`
Pour exporter des données tabulaires

```typescript
exportTableToPDF(
  'Titre du document',
  ['Colonne 1', 'Colonne 2', ...],  // En-têtes
  [                                  // Données
    ['Valeur 1', 'Valeur 2', ...],
    ['Valeur 1', 'Valeur 2', ...],
  ],
  'nom-fichier'
);
```

## 🎨 Personnalisation

### Modifier l'orientation

Dans le code de la page :

```typescript
await exportToPDF(
  'element-id',
  'fichier',
  {
    orientation: 'landscape'  // ou 'portrait'
  }
);
```

### Modifier l'échelle de capture

```typescript
await exportToPDF(
  'element-id',
  'fichier',
  {
    scale: 3  // Plus élevé = meilleure qualité mais plus lourd
  }
);
```

## 💡 Conseils

### Pour de Meilleurs Résultats

1. **Attendre le chargement complet** des graphiques avant d'exporter
2. **Utiliser la vue desktop** pour des exports optimaux
3. **Vérifier que tous les éléments** sont visibles (pas de scroll)
4. **Fermer les modals** avant d'exporter

### Dépannage

**Problème** : Le PDF ne contient pas tous les graphiques
**Solution** : Attendre 2-3 secondes après le chargement de la page

**Problème** : Le PDF est coupé
**Solution** : Zoomer/dézoomer la page avant l'export (Ctrl+0 pour reset)

**Problème** : Qualité pixelisée
**Solution** : Augmenter le paramètre `scale` à 3 ou 4

## 📅 Date de Génération

Chaque PDF inclut automatiquement :
- Date de génération en bas de page
- Numéro de page (ex: "Page 1/3")
- Format : "Généré le DD/MM/YYYY"

## 🔒 Permissions

- ✅ Tous les utilisateurs authentifiés peuvent exporter
- ✅ Les exports respectent les filtres appliqués
- ✅ Pas de limite de taille de fichier
- ✅ Génération côté client (navigateur)

## 🚀 Futures Améliorations Possibles

- [ ] Export en Excel (.xlsx)
- [ ] Export en CSV
- [ ] Choix du format (A4, Letter, A3)
- [ ] Inclusion/exclusion de sections spécifiques
- [ ] Modèles de rapport personnalisés
- [ ] Export planifié automatique

---

**Note** : La génération de PDF peut prendre quelques secondes pour les pages complexes avec beaucoup de graphiques.
