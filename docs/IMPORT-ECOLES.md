# 📚 Guide d'Import des PDFs Écoles

## 🎯 Objectif

Rendre le processus d'import **consistant** et **automatique** pour extraire TOUTES les données des PDFs.

## 📋 Processus d'Import

### 1️⃣ Fichier Identité (identite_ecoles.pdf)

**Données extraites :**
- UAI de l'école
- Nom de l'école
- Type (Maternelle / Élémentaire / Primaire)
- Adresse complète
- Téléphone
- Email
- Directeur (civilité + nom)
- Date d'ouverture
- Collège de rattachement

**Parser :**
Le système recherche les blocs "Carte d'identité de l'école" et extrait toutes les informations avec des regex robustes.

### 2️⃣ Fichier Structure (structure_ecoles.pdf)

**Données extraites pour chaque école :**

**Classes :**
- Libellé de la classe (ex: "CE1 A1", "cours préparatoire ANANAS")
- Enseignant (Mme/M. + Nom)
- Niveau détecté (CP, CE1, CE2, CM1, CM2, GS, MS, PS, TPS)
- **Nombre d'élèves** (extrait automatiquement)
- Dédoublée (OUI/NON)

**Regroupements :**
- Libellé (ULIS, UPE2A, RASED...)
- Dispositif/Enseignant

## ⚙️ Comment ça marche ?

### Extraction du texte

```typescript
const buffer = Buffer.from(await file.arrayBuffer());
const text = buffer.toString('utf-8');
```

**Note :** Pour un vrai PDF binaire, il faudrait utiliser une bibliothèque comme `pdf-parse` ou `pdfplumber`.

### Parsing intelligent

**Pour les classes :**
```typescript
// Détecte le format : "CE1 A1 de Mme NOM - local 15 Dédoublée"
const nbElevesMatch = ligne.match(/\s(\d+)\s*(Dédoublée)?/);
const enseignantMatch = ligne.match(/(?:de\s+)?(?:M\.|Mme)\s+([A-Z\-\s]+)/);
```

**Détection du niveau :**
- Recherche de mots-clés (CP, CE1, etc.)
- Variantes acceptées ("cours préparatoire", "COURS PRÉPARATOIRE", "CP")
- Détection multi-niveaux si nécessaire

## ✅ Garantie de Consistance

### Pourquoi c'est consistant maintenant ?

1. **Parsing exhaustif** : Parcourt TOUTES les lignes du PDF
2. **Pattern matching robuste** : Accepte plusieurs formats
3. **Validation** : N'ajoute que si les données essentielles sont présentes
4. **Nombre d'élèves** : Extraction automatique des nombres dans le texte

### Exemple de parsing

**Texte brut :**
```
CE1 A1 de Mme AMARANTHE Gretta - mobil-home 15 Dédoublée Salle ptg
```

**Résultat :**
```json
{
  "libelle": "CE1 A1",
  "enseignant": "Mme AMARANTHE Gretta",
  "niveau": "CE1",
  "nbEleves": 15,
  "dedoublee": true
}
```

## 🔧 Limitations actuelles

### PDF binaire vs texte

**Actuellement :** Le code s'attend à du texte brut (copier-coller du PDF)

**Solution pour PDF binaire :**

```bash
# Installer pdf-parse
npm install pdf-parse --save-system-packages

# Dans l'API
import pdf from 'pdf-parse';

const dataBuffer = Buffer.from(await file.arrayBuffer());
const data = await pdf(dataBuffer);
const text = data.text;
```

### Formats de classes variés

Le parser gère plusieurs formats :
- ✅ "CE1 A1 de Mme NOM"
- ✅ "cours préparatoire ANANAS"
- ✅ "Section des grands A"
- ✅ "GRANDE SECTION 1"

## 📊 Résultat attendu

### ecoles_identite.json
```json
[
  {
    "uai": "9730128B",
    "nom": "ELIETTE DANGLADES",
    "type": "Élémentaire publique",
    "adresse": "RUE BOUGAINVILLIERS",
    "ville": "97300 CAYENNE",
    "telephone": "0594382192",
    "email": "ce.9730128B@ac-guyane.fr",
    "directeur": "Laurent LECANTE",
    "civilite": "M.",
    "dateOuverture": "01/10/1978",
    "college": "COLLEGE JUSTIN CATAYEE"
  }
]
```

### ecoles_structure.json
```json
[
  {
    "uai": "9730128B",
    "classes": [
      {
        "libelle": "CE1 A1",
        "enseignant": "Mme AMARANTHE Gretta",
        "niveau": "CE1",
        "nbEleves": 15,
        "dedoublee": true
      }
    ],
    "regroupements": [
      {
        "libelle": "ULIS-ECOLE",
        "dispositif": "Mme VERIN Yuna - salle 1"
      }
    ]
  }
]
```

## 🚀 Utilisation

1. **Ouvrir la page Écoles**
2. **Importer les 2 PDFs** (Identité + Structure)
3. **Visualiser** : Toutes les écoles apparaissent
4. **Cliquer** sur une école pour voir détails complets
5. **Modal** : Affiche carte d'identité + toutes les classes avec nb élèves

## 🔄 Mise à jour annuelle

Chaque année :
1. Exporter les nouveaux PDFs depuis l'application directeur
2. Uploader dans la page Données
3. Le système parse et met à jour automatiquement
4. Toutes les données sont actualisées

## 💡 Améliorations futures

- [ ] Support des PDF binaires (pdf-parse)
- [ ] Extraction des horaires d'ouverture
- [ ] Graphiques par école (évolution effectifs)
- [ ] Export Excel des structures
- [ ] Comparaison année N vs année N-1
