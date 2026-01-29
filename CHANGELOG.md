# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Versioning Sémantique](https://semver.org/lang/fr/).

## [Non publié]

### À venir
- Notifications par email
- Export Excel avancé
- Synchronisation avec ENT

---

## [3.0.0] - 2025-01-28

### ✨ Ajouté

#### Système de Changement d'Année Automatique
- Détection automatique du passage à une nouvelle année scolaire en septembre
- Alerte visuelle (banner rouge) pour signaler le changement nécessaire
- Interface dédiée `/admin/annee-scolaire` pour le changement en 1 clic
- Vérifications pré-changement (données complètes, archive existante)
- Archivage automatique de l'année précédente lors du changement
- Historique dynamique des effectifs (4 dernières années)
- Configuration JSON centralisée (`data/config.json`)
- Page de test `/test/annee-scolaire` pour simuler le changement
- Bouton "Reset Complet" pour les tests
- Documentation complète (guides de changement et de test)

#### Composants et Librairies
- Composant `AlerteAnneeScolaire` pour l'alerte automatique
- Librairie `lib/annee-scolaire.ts` pour la gestion des années
- API `/api/config` pour lire/écrire la configuration
- API `/api/changer-annee` pour effectuer le changement

### 🔄 Modifié

#### Graphiques et Affichages
- Graphique "Évolution des effectifs" affiche maintenant 4 années au lieu de 3
- L'année actuelle est calculée dynamiquement depuis la configuration
- L'historique garde les 3 dernières années + l'année actuelle

#### Page Pilotage
- Lecture de l'année scolaire depuis `config.json` au lieu de code en dur
- Affichage dynamique de l'historique des effectifs
- Indicateurs mis à jour avec la config

### 🐛 Corrigé

#### Calcul des Effectifs
- Correction du champ utilisé : `nbEleves` au lieu de `effectif`
- Page de test calculait toujours 0 élève → corrigé
- Effectif de l'année ajouté à l'historique avec la bonne valeur

#### Navigation Calendrier
- Correction de l'affichage du mois (logique inversée)
- Les mois s'enchaînent correctement de septembre à août
- Plus de saut d'année (ex: 2026 → 2028)
- Années scolaires respectées (Sept-Août)

#### Page Calendrier Archives
- Suppression des fonctions d'édition (lecture seule)
- Affichage correct des événements archivés
- Navigation cohérente avec le reste des archives

### 📚 Documentation

#### Nouveaux Documents
- `GUIDE-CHANGEMENT-ANNEE.md` - Guide complet du système
- `GUIDE-TEST-CHANGEMENT-ANNEE.md` - Comment tester
- `GESTION-ANNEE-SCOLAIRE.md` - Documentation technique
- `CORRECTION-BUG-EVOLUTION-EFFECTIFS.md` - Explication des bugs corrigés

---

## [2.0.0] - 2025-01-15

### ✨ Ajouté

#### Système d'Archives
- Création d'archives annuelles complètes
- Page de consultation des archives par année
- Export/Download des archives
- Conservation illimitée des années passées

#### Gestion des Stagiaires M2 SOPA
- Import depuis Excel avec 3 types de stages
- Tableau dédié dans la page enseignants archives
- Affichage des stages : filé, masse 1, masse 2

#### Amélioration des Imports
- Import écoles depuis 3 sources (identité, structure, statistiques)
- Enrichissement automatique des données écoles
- Correction encodage UTF-8
- IPS arrondi à 2 décimales

### 🔄 Modifié

#### Page Écoles
- Redesign complet avec grille de cartes
- Modal de détails pour chaque école
- Statistiques enrichies (IPS, effectif, classes)
- Cartographie visuelle

#### Page Pilotage
- Ajout de graphiques interactifs
- Statistiques par type de classe (standard/dédoublée)
- Amélioration des indicateurs clés

### 🐛 Corrigé
- Erreur référence circulaire dans les sources d'écoles
- Problème d'encodage UTF-8
- Affichage des statuts enseignants

---

## [1.0.0] - 2024-12-01

### ✨ Ajouté

#### Fonctionnalités de Base
- Tableau de bord de pilotage
- Gestion des enseignants
- Suivi des écoles
- Saisie des évaluations
- Statistiques détaillées
- Calendrier scolaire

#### Import de Données
- Import écoles depuis ONDE (CSV)
- Import structures depuis ONDE (CSV)
- Import enseignants depuis Excel
- Import évaluations depuis Excel

#### Authentification
- Système de connexion simple
- Gestion des utilisateurs (JSON)

#### Export
- Export PDF des tableaux de bord
- Export des listes d'enseignants

### 🔧 Technique
- Next.js 14 avec App Router
- TypeScript
- TailwindCSS
- Recharts pour les graphiques
- Base de données JSON (fichiers)

---

## Types de Changements

- `Ajouté` pour les nouvelles fonctionnalités.
- `Modifié` pour les changements aux fonctionnalités existantes.
- `Obsolète` pour les fonctionnalités bientôt supprimées.
- `Supprimé` pour les fonctionnalités maintenant supprimées.
- `Corrigé` pour les corrections de bugs.
- `Sécurité` en cas de vulnérabilités.

---

[Non publié]: https://forge.apps.education.fr/username/circonscription-app/compare/v3.0.0...HEAD
[3.0.0]: https://forge.apps.education.fr/username/circonscription-app/compare/v2.0.0...v3.0.0
[2.0.0]: https://forge.apps.education.fr/username/circonscription-app/compare/v1.0.0...v2.0.0
[1.0.0]: https://forge.apps.education.fr/username/circonscription-app/releases/tag/v1.0.0
