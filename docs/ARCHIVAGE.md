# Système d'Archivage Annuel

## 📚 Vue d'ensemble

Le système d'archivage sauvegarde l'intégralité des données d'une année scolaire dans **Supabase**, afin de pouvoir les consulter les années suivantes. Il rend l'application pérenne : en année N+1, toutes les données des années passées restent accessibles en lecture seule.

> ⚠️ **Cette documentation décrit l'implémentation réelle (format v3.0, stockage Supabase).**
> Les anciennes versions reposaient sur des fichiers JSON dans `/data/archives/` — ce n'est **plus** le cas.

## 🗄️ Où sont stockées les archives ?

Table Supabase **`archives`** — une ligne par année scolaire :

| Colonne | Type | Contenu |
|---|---|---|
| `annee_scolaire` | text | Ex : `2025-2026` (clé fonctionnelle) |
| `version` | text | `3.0` |
| `date_creation` | timestamp | Date d'archivage |
| `metadata` | jsonb | Complétude + compteurs (nb écoles, enseignants, évaluations…) |
| `donnees_brutes` | jsonb | Les 14 jeux de données bruts (voir ci-dessous) |
| `donnees_calculees` | jsonb | Agrégats pré-calculés (pilotage, statistiques…) |

### `donnees_brutes` — 14 jeux de données
`ecoles_identite`, `ecoles_structure`, `evaluations`, `statistiques_ecoles`, `stagiaires_m2`, `enseignants`, `evenements`, `boussole_sessions`, `boussole_deposits`, `plan_formation`, `plan_formation_sessions`, `plan_formation_formateurs`, `previsions_structure`, `repartitions_108h`.

> Les deux derniers (`previsions_structure`, `repartitions_108h`) sont les **fiches directeurs publiées** — prévision de structure et répartition des 108h. Seule la version *publiée* de chaque école est archivée (pas l'historique des tables `*_versions`).

### `donnees_calculees` — agrégats
`pilotage` (indicateurs, RH, top5/bottom5 écoles), `circonscription` (stats générales), `statistiques` (totaux par niveau, classement), `enseignants` (par statut), `calendrier` (événements par type).

La logique de construction est centralisée dans **`lib/archives.ts`** → fonction `creerArchiveComplete(anneeScolaire, origin)`, réutilisée par les deux points d'entrée ci-dessous.

## 🎯 Deux façons de créer une archive

### 1. Manuellement (page Archives)
`Archives` → **« Nouvelle archive »** → saisir l'année → valider.
→ `POST /api/archives { anneeScolaire }` → snapshot des données **actuelles**. Les données en base ne sont **pas** modifiées.

### 2. Automatiquement (changement d'année scolaire)
`Administration → Changement d'année scolaire` → `POST /api/changer-annee`.
Ce flux **archive l'année sortante PUIS vide les tables** pour repartir sur une année vierge.

> 🔒 **Sécurité (depuis 2026-07)** : si la création de l'archive échoue, le changement d'année est **abandonné avant toute suppression** — aucune donnée n'est perdue. La purge ne s'exécute que si l'archive a réussi.

Tables vidées au changement d'année : `enseignants`, `evaluations`, `ecoles_identite`, `ecoles_structure`, `statistiques_ecoles`, `stagiaires_m2`, `evenements`, `effectifs`, `boussole_deposits`, `boussole_sessions`, `plan_formation_sessions`, `plan_formation`, `previsions_structure` (+ `previsions_structure_versions`), `repartition_108h` (+ `repartition_108h_versions`). Les tables `archives`, `config` et les référentiels annuaire (`annuaire_ecoles`, `annuaire_directions`) sont conservés.

> Pour les outils directeurs, on vide aussi les tables d'historique `*_versions` afin de repartir réellement à zéro — la version publiée de chaque fiche ayant déjà été capturée dans l'archive.

## 🔔 Alerte de changement d'année

Le composant `components/AlerteAnneeScolaire.tsx` (monté dans `app/layout.tsx`) compare l'année **détectée** (d'après la date système, cf. `lib/annee-scolaire.ts` — une année scolaire va de septembre à août) à `config.annee_scolaire_actuelle`.

En cas d'écart, une **carte discrète** apparaît en bas à droite (visible uniquement pour un utilisateur connecté), proposant d'aller sur la page de changement d'année. Elle peut être mise de côté pour la journée (« Plus tard »).

## 👁️ Consulter une archive

`Archives` → **« Consulter »** sur une année → `/archives/consulter?annee=YYYY-YYYY` (vue d'ensemble), puis sous-pages :

```
/archives/consulter/circonscription?annee=   Vue d'ensemble + liste des écoles (sigle, commune, IPS)
/archives/consulter/ecoles?annee=            Détails par école et structures
/archives/consulter/enseignants?annee=       Tableau complet + filtres + export Excel
/archives/consulter/evaluations?annee=       Résultats par niveau
/archives/consulter/statistiques?annee=      Effectifs, classements + export Excel
/archives/consulter/calendrier?annee=        Événements et vacances scolaires
/archives/consulter/formations/...           Boussole & plan de formation (si présents)
```

Toutes les pages sont en **lecture seule** et chargent les données via `GET /api/archives/data`.

## 🔧 APIs

| Appel | Effet |
|---|---|
| `GET /api/archives` | Liste des années : `{ archives: ["2025-2026", ...] }` |
| `GET /api/archives?annee=YYYY-YYYY` | Une archive complète (metadata + brutes + calculées) |
| `GET /api/archives/data?annee=YYYY-YYYY&type=<jeu>` | Un jeu de données brut (ex : `enseignants`, `ecoles_identite`, `statistiques_ecoles`…) |
| `POST /api/archives` | Crée une archive (`{ anneeScolaire }`) |
| `DELETE /api/archives?annee=YYYY-YYYY` | Supprime une archive (**irréversible**) |

**Sécurité** : ces routes sont réservées aux administrateurs par le middleware JWT. Côté serveur, Supabase utilise la clé `service_role` (contourne le RLS) ; la clé `anon` publique ne peut pas lire la table `archives`.

## 🔄 Workflow annuel recommandé

1. **Fin d'année (juin–août)** : vérifier que les données de l'année sont complètes.
2. **Bascule** : `Administration → Changement d'année scolaire`. Laisser l'option « Créer une archive » cochée → l'année sortante est archivée, puis les tables sont vidées.
3. **Rentrée (septembre)** : importer les nouvelles données (TRM, évaluations, structures…).

> Alternative sans purge : créer une archive manuellement depuis la page `Archives` à tout moment, sans toucher aux données courantes.

## ⚠️ Points importants

- **Suppression irréversible** : supprimer une archive efface définitivement la ligne Supabase. Aucune corbeille.
- **Archives immuables** : une archive fige les données telles quelles au moment de sa création. Corriger un bug de code ou une donnée source **ne réécrit pas** les archives déjà créées. Les pages de consultation compensent en **enrichissant à l'affichage** quand c'est possible (ex. la page Statistiques rejoint `ecoles_identite` par UAI pour retrouver le nom complet et le sigle des écoles).
- **Complétude** : une archive ne contient que les données présentes au moment du snapshot. Si une table était vide, elle sera vide dans l'archive (`metadata.completude` le signale).

## 🔮 Évolutions possibles

- [ ] Comparaison entre deux années
- [ ] Graphiques d'évolution pluriannuelle
- [ ] Export d'une archive complète (ZIP / classeur Excel multi-feuilles)
- [ ] Recherche transverse dans toutes les archives

---

**Le système d'archivage rend l'application pérenne et conserve un historique complet, année après année.** 📚🎓
