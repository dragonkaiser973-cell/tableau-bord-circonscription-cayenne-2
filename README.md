# 📊 Tableau de Bord Circonscription

[![Licence](https://img.shields.io/badge/Licence-Ouverte%202.0-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-3.0.0-green.svg)](CHANGELOG.md)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)

Application complète de gestion et pilotage pour les circonscriptions de l'Éducation Nationale.

---

## 🎯 Fonctionnalités

### 📈 Pilotage
- **Tableau de bord synthétique** avec indicateurs clés
- **Évolution des effectifs** sur 4 ans avec historique automatique
- **Statistiques détaillées** par école, niveau et type de classe
- **Graphiques interactifs** pour visualiser les données

### 👥 Gestion des Enseignants
- **Annuaire complet** avec filtres avancés
- **Suivi des stagiaires M2 SOPA** (stages filé, masse 1 et 2)
- **Export PDF** des listes

### 🏫 Suivi des Écoles
- **Fiches complètes** : identité, structure, effectifs, IPS
- **Import ONDE** automatique depuis CSV
- **Historique** des données

### 📝 Évaluations
- **Saisie centralisée** CP et CE1
- **Graphiques comparatifs** avec repères académiques
- **Taux de réussite** automatiques

### 📅 Calendrier Scolaire
- **Gestion des événements** et vacances
- **Vues multiples** (mensuelle/annuelle)
- **Export PDF**

### 📦 Archives
- **Sauvegarde annuelle** automatique
- **Consultation** des années précédentes
- **Conservation illimitée**

### 🔄 Changement d'Année Automatique
- **Détection automatique** en septembre
- **Alerte visuelle** pour le changement
- **Archivage automatique** de l'année précédente
- **Historique dynamique** des 4 dernières années

---

## 🚀 Installation

### Prérequis

- Node.js 18+
- npm ou yarn
- 2 Go d'espace disque

### Installation rapide

```bash
# Cloner le projet
git clone https://forge.apps.education.fr/votre-username/circonscription-app.git
cd circonscription-app

# Installer les dépendances
npm install

# Configuration initiale
cp data/users.json.example data/users.json
mkdir -p data/archives

# Lancer
npm run dev
```

**Accès :** http://localhost:3000

**Connexion par défaut :**
- Login : `admin`
- Mot de passe : `admin123`

⚠️ **Changez le mot de passe dès la première connexion !**

📖 **Guide complet :** [INSTALLATION.md](docs/INSTALLATION.md)

---

## 📚 Documentation

- 📦 [Guide d'Installation](docs/INSTALLATION.md)
- 👤 [Guide Utilisateur](docs/GUIDE-UTILISATEUR.md)
- 🔧 [Guide Administrateur](docs/GUIDE-ADMIN.md)
- 🔄 [Changement d'Année](docs/GUIDE-CHANGEMENT-ANNEE.md)
- 🏗️ [Architecture](docs/ARCHITECTURE.md)

---

## 🔧 Technologies

- **Next.js 14** - Framework React
- **TypeScript** - Typage statique
- **TailwindCSS** - Styles
- **Recharts** - Graphiques
- **Node.js** - Backend
- **JSON** - Base de données fichiers

---

## 📦 Imports Supportés

- **ONDE** : Écoles, structures, statistiques (CSV)
- **Enseignants** : Excel (.xlsx)
- **Stagiaires** : Excel (.xlsx)
- **Évaluations** : Excel (.xlsx)

---

## 🐳 Docker

```bash
# Build
docker build -t circonscription-app .

# Run
docker run -p 3000:3000 -v $(pwd)/data:/app/data circonscription-app
```

---

## 🤝 Contribution

Les contributions sont bienvenues ! Voir [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 📄 Licence

**Licence Ouverte 2.0 / Open Licence 2.0**

Vous êtes libre de reproduire, diffuser, adapter et exploiter, y compris à titre commercial.

Voir [LICENSE](LICENSE) pour les détails.

---

## 🏛️ Contexte

Développé pour les circonscriptions du premier degré de l'Éducation Nationale.

Initialement créé pour la circonscription Cayenne 2 Roura (Académie de Guyane), adaptable à toutes les circonscriptions de France.

---

## 📞 Support

- 🐛 [Créer une issue](https://forge.apps.education.fr/votre-username/circonscription-app/issues)
- 📧 Contact : votre.email@ac-guyane.fr

---

## 🗓️ Version 3.0.0 (2025-01-28)

### ✨ Nouveautés
- Système de changement d'année automatique
- Détection et alerte en septembre
- Archivage automatique
- Historique dynamique 4 ans

### 🐛 Corrections
- Calcul effectifs
- Navigation calendrier
- Affichage mois

Voir [CHANGELOG.md](CHANGELOG.md) pour l'historique complet.

---

**Développé avec ❤️ pour l'Éducation Nationale**
