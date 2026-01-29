# Architecture de l'application

## Vue d'ensemble

Application web full-stack construite avec Next.js 14 (App Router) et TypeScript.

## Structure des dossiers

```
circonscription-app/
├── app/                          # Routes et pages Next.js
│   ├── api/                      # API Routes
│   │   ├── auth/login/          # Authentification
│   │   ├── ecoles/              # CRUD écoles
│   │   ├── enseignants/         # CRUD enseignants
│   │   ├── evaluations/         # CRUD évaluations
│   │   └── import/              # Import fichiers Excel
│   ├── circonscription/         # Page circonscription
│   ├── donnees/                 # Page gestion données (auth)
│   ├── ecoles/                  # Page écoles
│   ├── enseignants/             # Page enseignants
│   ├── evaluations/             # Page évaluations (dashboard)
│   ├── statistiques/            # Page statistiques
│   ├── globals.css              # Styles globaux
│   ├── layout.tsx               # Layout principal
│   └── page.tsx                 # Page d'accueil
├── lib/                         # Utilitaires
│   └── database.ts              # Gestion SQLite
├── data/                        # Base de données SQLite
│   └── circonscription.db       # DB (créée automatiquement)
├── public/                      # Assets statiques
├── package.json                 # Dépendances npm
├── tsconfig.json                # Configuration TypeScript
├── tailwind.config.js           # Configuration Tailwind
├── next.config.js               # Configuration Next.js
└── README.md                    # Documentation

```

## Flux de données

### 1. Authentification
```
Client → POST /api/auth/login
       ← JWT Token
Client stocke le token dans localStorage
Requêtes suivantes incluent le token dans les headers
```

### 2. Import de données
```
Client (page /donnees) → POST /api/import (multipart/form-data)
Server lit le fichier Excel (xlsx)
Server parse les données
Server insère dans SQLite
Server ← Retourne le résultat
```

### 3. Consultation des données
```
Client (page /evaluations) → GET /api/evaluations?filters
Server lit SQLite
Server ← Retourne JSON
Client affiche avec Chart.js
```

## Base de données (SQLite)

### Tables principales

**users**
- id (PK)
- username (unique)
- password (hashed)
- role
- created_at

**ecoles**
- id (PK)
- uai (unique, code école)
- nom
- sigle
- commune
- rep_plus (boolean)
- ips (indicateur de position sociale)

**enseignants**
- id (PK)
- ecole_id (FK → ecoles)
- annee_scolaire
- civilite
- nom, prenom
- statut (T1, T2, T3, CT, ST, PEMF)
- type_poste
- niveau_classe
- classe_specialisee
- effectif_classe
- quotite (0.0 à 1.0)
- decharge_binome
- nom_decharge_binome
- mode_affectation
- individu (code unique)

**evaluations**
- id (PK)
- rentree (année)
- uai (code école)
- denomination (nom école)
- classe (CP, CE1, CE2, CM1, CM2, 6ème)
- matiere (français, mathématiques)
- libelle (nom de la compétence)
- tx_groupe_1 (% élèves à besoin)
- tx_groupe_2 (% élèves fragiles)
- tx_groupe_3 (% élèves au-dessus seuil 2)
- tx_cir_groupe_* (moyennes circonscription)
- ips, ips_cir

**effectifs**
- id (PK)
- ecole_id (FK)
- annee_scolaire
- niveau
- effectif

**sync_logs**
- id (PK)
- type (trm, evaluations, nas_sync)
- status (success, error)
- message
- filename
- created_at

## API Endpoints

### Authentification
- `POST /api/auth/login` : Connexion
  - Body : `{ username, password }`
  - Retour : `{ token, user }`

### Écoles
- `GET /api/ecoles` : Liste toutes les écoles
- `GET /api/ecoles?id=X` : Récupère une école

### Enseignants
- `GET /api/enseignants` : Liste avec filtres
  - Query params : ecole_id, annee_scolaire, nom, statut

### Évaluations
- `GET /api/evaluations` : Liste avec filtres
  - Query params : rentree, uai, classe, matiere

### Import
- `POST /api/import` : Import fichiers Excel
  - Body : FormData avec file et type (trm/evaluations)

## Authentification et sécurité

### JWT (JSON Web Tokens)
- Utilisé pour l'authentification
- Durée de vie : 24h
- Stocké dans localStorage côté client
- Vérifié côté serveur (à implémenter pour les routes protégées)

### Middleware (à implémenter)
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.headers.get('authorization');
  // Vérifier le token JWT
  // Rediriger si non authentifié
}
```

## Synchronisation NAS

### Architecture prévue
```
Application ↔ SQLite (local)
     ↓
   Sync Service
     ↓
   NAS Server
     ↓
   Backups (JSON/SQLite)
```

### Fonctionnalités à implémenter
1. Export automatique vers NAS
2. Import/restore depuis NAS
3. Versionning des données
4. Logs de synchronisation
5. Détection de conflits

## Déploiement

### Développement local
```bash
npm run dev
```

### Production (Vercel)
1. Push sur GitHub
2. Import dans Vercel
3. Vercel build automatiquement
4. Variables d'environnement à configurer

### Limitations Vercel
- SQLite ne persiste pas entre déploiements
- Solutions :
  - PostgreSQL (Vercel Postgres)
  - PlanetScale (MySQL)
  - Supabase (PostgreSQL)
  - Synchronisation NAS au démarrage

## Performance

### Optimisations actuelles
- Server Components par défaut (Next.js 14)
- Code splitting automatique
- Images optimisées (next/image)
- CSS purgé (Tailwind)

### À optimiser
- Pagination des résultats
- Cache des requêtes
- Lazy loading des graphiques
- Service Worker pour offline

## Tests (à implémenter)

### Tests unitaires
- Jest pour la logique métier
- Testing Library pour les composants

### Tests d'intégration
- Playwright pour les tests E2E
- Tests d'API avec Supertest

### Tests de performance
- Lighthouse CI
- Load testing avec k6

## Évolutions futures

### Court terme
- Compléter toutes les pages
- Recherche avancée enseignants
- Export PDF complet
- Statistiques détaillées

### Moyen terme
- Migration vers PostgreSQL
- API REST complète
- Authentification multi-utilisateurs
- Rôles et permissions

### Long terme
- Application mobile (React Native)
- Notifications push
- Machine Learning pour prédictions
- Intégration avec d'autres systèmes

## Conformité RGPD

### Données personnelles
- Noms des enseignants
- Informations de contact (à venir)

### Mesures
- Authentification obligatoire
- Encryption des mots de passe (bcrypt)
- Logs d'accès (à implémenter)
- Droit à l'oubli (suppression)
- Export des données personnelles

## Support et maintenance

### Logs
- Logs de synchronisation (table sync_logs)
- Logs d'erreurs (console.error)
- À implémenter : Winston/Pino

### Monitoring
- À implémenter : Sentry pour les erreurs
- Vercel Analytics pour les métriques

### Backups
- Automatiques via NAS
- Rétention : 1 an minimum
- Tests de restauration mensuels

---

**Dernière mise à jour** : Janvier 2026
**Développeur** : LOUIS Olivier
