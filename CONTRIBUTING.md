# 🤝 Guide de Contribution

Merci de votre intérêt pour contribuer au Tableau de Bord Circonscription !

## 📋 Table des Matières

- [Code de Conduite](#code-de-conduite)
- [Comment Contribuer](#comment-contribuer)
- [Signaler un Bug](#signaler-un-bug)
- [Proposer une Amélioration](#proposer-une-amélioration)
- [Soumettre du Code](#soumettre-du-code)
- [Standards de Code](#standards-de-code)
- [Processus de Review](#processus-de-review)

---

## 📜 Code de Conduite

En participant à ce projet, vous vous engagez à maintenir un environnement respectueux et inclusif.

### Nos engagements

- **Respectueux** : Traiter tous les contributeurs avec respect
- **Constructif** : Donner des retours constructifs
- **Inclusif** : Accueillir toutes les contributions
- **Professionnel** : Maintenir un ton professionnel

### Comportements inacceptables

- Harcèlement ou discrimination
- Commentaires offensants
- Attaques personnelles
- Publication d'informations privées

---

## 💡 Comment Contribuer

Il existe plusieurs façons de contribuer :

### 1. Signaler un Bug 🐛

Vous avez trouvé un bug ? Créez une issue !

### 2. Proposer une Amélioration ✨

Vous avez une idée ? Partagez-la !

### 3. Améliorer la Documentation 📚

Corrections, clarifications, traductions...

### 4. Soumettre du Code 💻

Corrections de bugs, nouvelles fonctionnalités...

---

## 🐛 Signaler un Bug

### Avant de Créer une Issue

1. **Vérifiez** que le bug n'a pas déjà été signalé
2. **Testez** avec la dernière version
3. **Collectez** les informations nécessaires

### Créer une Issue

Utilisez le template suivant :

```markdown
## Description du Bug

[Description claire et concise]

## Étapes pour Reproduire

1. Aller sur '...'
2. Cliquer sur '...'
3. Faire défiler jusqu'à '...'
4. Observer l'erreur

## Comportement Attendu

[Ce qui devrait se passer]

## Comportement Actuel

[Ce qui se passe réellement]

## Captures d'Écran

[Si pertinent, ajoutez des captures d'écran]

## Environnement

- **OS :** [ex: Windows 11, macOS 14]
- **Navigateur :** [ex: Chrome 120, Firefox 121]
- **Version :** [ex: 3.0.0]

## Informations Supplémentaires

[Tout autre détail utile]
```

---

## ✨ Proposer une Amélioration

### Avant de Proposer

1. **Vérifiez** que la fonctionnalité n'existe pas déjà
2. **Cherchez** dans les issues existantes
3. **Réfléchissez** à la valeur ajoutée

### Créer une Proposition

Utilisez le template suivant :

```markdown
## Description de la Fonctionnalité

[Description claire de ce que vous voulez]

## Cas d'Usage

[Pourquoi cette fonctionnalité est utile]

Exemple : "En tant qu'IEN, je veux pouvoir..."

## Solution Proposée

[Comment vous imaginez la fonctionnalité]

## Alternatives Considérées

[Autres approches possibles]

## Mockups / Exemples

[Captures d'écran, schémas, exemples...]
```

---

## 💻 Soumettre du Code

### 1. Fork le Projet

```bash
# Cliquez sur "Fork" sur la page du projet
```

### 2. Cloner Votre Fork

```bash
git clone https://forge.apps.education.fr/votre-username/circonscription-app.git
cd circonscription-app
```

### 3. Créer une Branche

```bash
git checkout -b feature/ma-fonctionnalite
# ou
git checkout -b fix/correction-bug
```

**Conventions de nommage :**
- `feature/` - Nouvelle fonctionnalité
- `fix/` - Correction de bug
- `docs/` - Documentation
- `refactor/` - Refactoring
- `test/` - Tests

### 4. Faire Vos Modifications

```bash
# Éditez les fichiers
# Testez vos modifications
npm run dev
```

### 5. Commiter

```bash
git add .
git commit -m "feat: ajout fonctionnalité X"
```

**Conventions de commit :**
- `feat:` - Nouvelle fonctionnalité
- `fix:` - Correction de bug
- `docs:` - Documentation
- `style:` - Formatage, pas de changement de code
- `refactor:` - Refactoring
- `test:` - Ajout de tests
- `chore:` - Maintenance

### 6. Pousser

```bash
git push origin feature/ma-fonctionnalite
```

### 7. Créer une Pull Request

1. Allez sur votre fork sur la Forge
2. Cliquez sur "New Pull Request"
3. Remplissez la description
4. Attendez la review

---

## 📏 Standards de Code

### TypeScript

```typescript
// ✅ BON
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): User | null {
  // ...
}

// ❌ MAUVAIS
function getUser(id) {
  // Pas de typage
}
```

### Commentaires

```typescript
// ✅ BON - Commentaires en français
/**
 * Calcule l'effectif total d'une école
 * @param ecole - Les données de l'école
 * @returns L'effectif total
 */
function calculerEffectif(ecole: Ecole): number {
  // ...
}

// ❌ MAUVAIS - Pas de commentaire
function calc(e) {
  // ...
}
```

### Nommage

```typescript
// ✅ BON
const enseignantsTitulaires = enseignants.filter(e => e.statut === 'Titulaire');
const nombreEcoles = ecoles.length;

// ❌ MAUVAIS
const ens = enseignants.filter(e => e.s === 'T');
const n = ecoles.length;
```

### Formatage

- **Indentation :** 2 espaces
- **Guillemets :** Simples `'` pour les strings
- **Point-virgule :** Oui
- **Longueur ligne :** Max 100 caractères

---

## 🔍 Processus de Review

### Ce que nous Vérifions

1. **Code Quality**
   - Respect des standards
   - Pas de code dupliqué
   - Commentaires pertinents

2. **Fonctionnalité**
   - Fonctionne comme prévu
   - Pas de régression
   - Tests passent

3. **Documentation**
   - README mis à jour si nécessaire
   - Commentaires dans le code
   - Changelog mis à jour

### Délais

- **Accusé de réception :** 48h
- **Première review :** 7 jours
- **Merge :** Après validation

### Après la Review

Des modifications peuvent être demandées. C'est normal !

```bash
# Faire les modifications
git add .
git commit -m "fix: correction selon review"
git push origin feature/ma-fonctionnalite
```

La Pull Request se mettra à jour automatiquement.

---

## 🧪 Tests

### Lancer les Tests

```bash
npm test
```

### Ajouter des Tests

```typescript
// tests/utils.test.ts
import { calculerEffectif } from '@/lib/utils';

describe('calculerEffectif', () => {
  it('devrait calculer l\'effectif total', () => {
    const ecole = {
      classes: [
        { nbEleves: 20 },
        { nbEleves: 25 }
      ]
    };
    
    expect(calculerEffectif(ecole)).toBe(45);
  });
});
```

---

## 📚 Ressources

### Documentation Technique

- [Next.js](https://nextjs.org/docs)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [TailwindCSS](https://tailwindcss.com/docs)
- [Recharts](https://recharts.org/en-US/)

### Guides du Projet

- [Architecture](docs/ARCHITECTURE.md)
- [Guide Admin](docs/GUIDE-ADMIN.md)

---

## ❓ Questions

Vous avez des questions ? N'hésitez pas !

- **Issues** : Pour les questions techniques
- **Email** : votre.email@ac-guyane.fr
- **Forum Tribu** : Pour les discussions générales

---

## 🙏 Remerciements

Merci de contribuer à améliorer cet outil pour toute la communauté éducative !

Chaque contribution, petite ou grande, est appréciée. 🎉

---

**Bonne contribution ! 🚀**
