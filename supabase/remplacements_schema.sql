-- Schéma des tables pour la gestion des remplacements (Titulaires Remplaçants).
-- À exécuter dans l'éditeur SQL de Supabase, une seule fois.
--
-- Modèle :
--   • remplacements_tr → la liste des TR de la circonscription, gérée par la
--     secrétaire directement dans l'outil (/remplacements). PAS purgée au
--     changement d'année (l'équipe de TR persiste), mais archivée en photo.
--   • remplacements    → un enregistrement par remplacement (peut couvrir
--     plusieurs jours). Purgé au changement d'année après archivage.
--
-- Politique d'accès :
--   • Lecture publique (GET via /api/), écriture réservée aux utilisateurs
--     authentifiés (token JWT vérifié par middleware.ts — PUBLIC_READ_AUTH_WRITE).
--   • RLS désactivée — cohérent avec le reste du dashboard : l'accès est
--     contrôlé côté Next.js (clé service_role côté serveur uniquement).

-- ─── Liste des Titulaires Remplaçants ───
create table if not exists remplacements_tr (
  id          uuid primary key default gen_random_uuid(),
  nom         text not null,
  ordre       int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_remplacements_tr_ordre
  on remplacements_tr (ordre, nom);

-- ─── Remplacements ───
create table if not exists remplacements (
  id          uuid primary key default gen_random_uuid(),
  tr_id       uuid not null references remplacements_tr(id) on delete cascade,

  date_debut  date not null,
  date_fin    date not null,
  -- 'journee' occupe toute la case ; 'matin' / 'apres-midi' une demi-case.
  plage       text not null check (plage in ('journee', 'matin', 'apres-midi')),

  -- École où s'effectue le remplacement. Le nom est un snapshot dénormalisé :
  -- l'archive reste lisible même si l'école change ou disparaît.
  ecole_uai   text not null,
  ecole_nom   text not null,

  -- Le ou les enseignants remplacés : tableau JSON de noms (strings).
  enseignants jsonb not null default '[]'::jsonb,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint remplacements_dates_ok check (date_fin >= date_debut)
);

create index if not exists idx_remplacements_tr_debut
  on remplacements (tr_id, date_debut);

-- RLS désactivée — accès contrôlé côté Next.js (voir en-tête).
alter table remplacements_tr disable row level security;
alter table remplacements    disable row level security;
