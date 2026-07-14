-- Schéma des tables pour les répartitions 108h publiées.
-- À exécuter dans l'éditeur SQL de Supabase, une seule fois.
--
-- Modèle (calqué sur previsions_structure) :
--   • repartition_108h          → 1 ligne par école (version "live", publiée)
--   • repartition_108h_versions → historique (max 10 versions récentes par école)
--
-- Politique d'identification :
--   • Pas d'authentification côté lecture (la page /outils/repartition-108h est
--     publique). Pas d'auth côté écriture non plus — le directeur se sélectionne
--     dans la liste annuaire_directions au moment de publier.
--   • Filet de sécurité contre les modifications mal intentionnées : l'historique
--     des versions, jamais effacé sauf au-delà de 10 par école.

-- ─── Table principale : version publiée par école ───
create table if not exists repartition_108h (
  -- L'école est la clé : une seule fiche publiée à la fois par école.
  ecole_id        uuid primary key references annuaire_ecoles(id) on delete cascade,

  -- Auteur de la dernière publication. On garde son nom au moment T pour
  -- l'affichage public, même si le directeur quitte l'école plus tard.
  directeur_id    uuid not null references annuaire_directions(id) on delete restrict,
  directeur_name  text not null,
  ecole_name      text not null,

  -- Métadonnées.
  annee_n         text not null,
  type            text not null check (type in ('maternelle', 'elementaire')),

  -- Données structurées. Validées côté API avant insert.
  -- selections     : { "2025-09-01": { "category": "concertation", "slots": 2 }, ... }
  -- periodes       : { "1": [ { id, category, date, objet, theme }, ... ], ... "5": [...] }
  -- notes          : { "1": "…", ... "5": "…" }
  -- periode_bounds : { "1": { "start": "2025-09-01", "end": "2025-10-17" }, ... }
  selections      jsonb not null default '{}'::jsonb,
  periodes        jsonb not null default '{}'::jsonb,
  notes           jsonb not null default '{}'::jsonb,
  periode_bounds  jsonb not null default '{}'::jsonb,

  -- Suivi.
  created_at      timestamptz not null default now(),
  published_at    timestamptz not null default now(),
  client_id       text                                              -- id local optionnel pour le client
);

-- Index pour le tri par publication décroissante (vue par défaut côté UI).
create index if not exists idx_repartition_108h_published_at
  on repartition_108h (published_at desc);

create index if not exists idx_repartition_108h_ecole_name
  on repartition_108h (ecole_name);

-- ─── Historique : toutes les versions, conservées par école ───
create table if not exists repartition_108h_versions (
  id              uuid primary key default gen_random_uuid(),
  ecole_id        uuid not null references annuaire_ecoles(id) on delete cascade,
  directeur_id    uuid references annuaire_directions(id) on delete set null,
  directeur_name  text not null,
  ecole_name      text not null,
  annee_n         text not null,
  type            text not null,
  selections      jsonb not null,
  periodes        jsonb not null,
  notes           jsonb not null,
  periode_bounds  jsonb not null,
  published_at    timestamptz not null default now()
);

create index if not exists idx_repartition_108h_versions_ecole_published
  on repartition_108h_versions (ecole_id, published_at desc);

-- ─── Trigger : à chaque publication, on archive la nouvelle ligne dans versions
-- et on purge au-delà des 10 plus récentes pour la même école.
create or replace function repartition_108h_archive() returns trigger as $$
begin
  insert into repartition_108h_versions (
    ecole_id, directeur_id, directeur_name, ecole_name,
    annee_n, type, selections, periodes, notes, periode_bounds, published_at
  ) values (
    NEW.ecole_id, NEW.directeur_id, NEW.directeur_name, NEW.ecole_name,
    NEW.annee_n, NEW.type, NEW.selections, NEW.periodes, NEW.notes, NEW.periode_bounds, NEW.published_at
  );

  -- Purge : on garde les 10 versions les plus récentes par école.
  delete from repartition_108h_versions
  where id in (
    select id from repartition_108h_versions
    where ecole_id = NEW.ecole_id
    order by published_at desc
    offset 10
  );

  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_repartition_108h_archive on repartition_108h;
create trigger trg_repartition_108h_archive
  after insert or update on repartition_108h
  for each row execute function repartition_108h_archive();

-- RLS désactivée — cohérent avec le reste du dashboard (previsions_structure, annuaire…).
-- L'accès est contrôlé côté Next.js (lecture publique, écriture via /api/).
alter table repartition_108h          disable row level security;
alter table repartition_108h_versions disable row level security;
