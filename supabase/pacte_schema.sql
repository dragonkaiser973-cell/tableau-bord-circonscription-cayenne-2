-- Schéma des tables de l'outil PACTE (missions complémentaires enseignants).
-- À exécuter dans l'éditeur SQL de Supabase, une seule fois.
--
-- Modèle :
--   • pacte_attributions        → parts attribuées par l'IEN, 1 ligne par école.
--     Écriture réservée aux utilisateurs authentifiés (côté circo), lecture publique.
--   • pacte_repartitions        → fiche « répartition » publiée par le directeur,
--     1 ligne par école (+ _versions, max 10 récentes) — calque previsions_structure.
--   • pacte_suivis              → suivi mensuel publié par le directeur,
--     1 ligne par (école, mois) (+ _versions, max 10 récentes par couple).
--
-- Politique d'identification (identique aux autres outils directeurs) :
--   • lecture publique ; publication directeur sans auth (sélection dans l'annuaire) ;
--   • filet de sécurité : l'historique des versions.
-- RLS désactivée — accès contrôlé côté Next.js (middleware + service_role serveur).

-- ─── Parts attribuées par l'IEN ───
create table if not exists pacte_attributions (
  ecole_id    uuid primary key references annuaire_ecoles(id) on delete cascade,
  ecole_name  text not null,
  annee_n     text not null,
  -- { "devoirs-faits-6e": 1, "soutien-renforce": 2, "stage-reussite": 16, ... }
  parts       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Répartition publiée par école ───
create table if not exists pacte_repartitions (
  ecole_id        uuid primary key references annuaire_ecoles(id) on delete cascade,
  directeur_id    uuid not null references annuaire_directions(id) on delete restrict,
  directeur_name  text not null,
  ecole_name      text not null,
  annee_n         text not null,
  -- [ { "nom": "...", "prenom": "...", "parts": { "stage-reussite": 1, ... } }, ... ] (22 max)
  lignes          jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  published_at    timestamptz not null default now(),
  client_id       text
);

create index if not exists idx_pacte_repartitions_published_at
  on pacte_repartitions (published_at desc);

create table if not exists pacte_repartitions_versions (
  id              uuid primary key default gen_random_uuid(),
  ecole_id        uuid not null references annuaire_ecoles(id) on delete cascade,
  directeur_id    uuid references annuaire_directions(id) on delete set null,
  directeur_name  text not null,
  ecole_name      text not null,
  annee_n         text not null,
  lignes          jsonb not null,
  published_at    timestamptz not null default now()
);

create index if not exists idx_pacte_repartitions_versions_ecole
  on pacte_repartitions_versions (ecole_id, published_at desc);

create or replace function pacte_repartitions_archive() returns trigger as $$
begin
  insert into pacte_repartitions_versions (
    ecole_id, directeur_id, directeur_name, ecole_name, annee_n, lignes, published_at
  ) values (
    NEW.ecole_id, NEW.directeur_id, NEW.directeur_name, NEW.ecole_name, NEW.annee_n, NEW.lignes, NEW.published_at
  );
  delete from pacte_repartitions_versions
  where id in (
    select id from pacte_repartitions_versions
    where ecole_id = NEW.ecole_id
    order by published_at desc
    offset 10
  );
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_pacte_repartitions_archive on pacte_repartitions;
create trigger trg_pacte_repartitions_archive
  after insert or update on pacte_repartitions
  for each row execute function pacte_repartitions_archive();

-- ─── Suivi mensuel publié par (école, mois) ───
create table if not exists pacte_suivis (
  id              uuid primary key default gen_random_uuid(),
  ecole_id        uuid not null references annuaire_ecoles(id) on delete cascade,
  directeur_id    uuid not null references annuaire_directions(id) on delete restrict,
  directeur_name  text not null,
  ecole_name      text not null,
  annee_n         text not null,
  -- Mois du suivi au format "2025-09" (septembre 2025).
  mois            text not null check (mois ~ '^\d{4}-\d{2}$'),
  -- [ { "nom", "prenom", "ecole", "missions": { "soutien-renforce": { "heures": 2, "nbEleves": 6, "niveau": "CP" } } }, ... ]
  lignes          jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  published_at    timestamptz not null default now(),
  constraint pacte_suivis_ecole_mois unique (ecole_id, mois)
);

create index if not exists idx_pacte_suivis_mois
  on pacte_suivis (mois, ecole_name);

create table if not exists pacte_suivis_versions (
  id              uuid primary key default gen_random_uuid(),
  ecole_id        uuid not null references annuaire_ecoles(id) on delete cascade,
  directeur_id    uuid references annuaire_directions(id) on delete set null,
  directeur_name  text not null,
  ecole_name      text not null,
  annee_n         text not null,
  mois            text not null,
  lignes          jsonb not null,
  published_at    timestamptz not null default now()
);

create index if not exists idx_pacte_suivis_versions_ecole_mois
  on pacte_suivis_versions (ecole_id, mois, published_at desc);

create or replace function pacte_suivis_archive() returns trigger as $$
begin
  insert into pacte_suivis_versions (
    ecole_id, directeur_id, directeur_name, ecole_name, annee_n, mois, lignes, published_at
  ) values (
    NEW.ecole_id, NEW.directeur_id, NEW.directeur_name, NEW.ecole_name, NEW.annee_n, NEW.mois, NEW.lignes, NEW.published_at
  );
  delete from pacte_suivis_versions
  where id in (
    select id from pacte_suivis_versions
    where ecole_id = NEW.ecole_id and mois = NEW.mois
    order by published_at desc
    offset 10
  );
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_pacte_suivis_archive on pacte_suivis;
create trigger trg_pacte_suivis_archive
  after insert or update on pacte_suivis
  for each row execute function pacte_suivis_archive();

-- RLS désactivée — cohérent avec le reste du dashboard.
alter table pacte_attributions          disable row level security;
alter table pacte_repartitions          disable row level security;
alter table pacte_repartitions_versions disable row level security;
alter table pacte_suivis                disable row level security;
alter table pacte_suivis_versions       disable row level security;
