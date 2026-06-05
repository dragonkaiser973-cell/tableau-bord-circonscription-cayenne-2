-- Schéma des tables pour les prévisions de structure publiées.
-- À exécuter dans l'éditeur SQL de Supabase, une seule fois.
--
-- Modèle :
--   • previsions_structure          → 1 ligne par école (version "live", publiée)
--   • previsions_structure_versions → historique (toutes les versions, max 10 récentes)
--
-- Politique d'identification :
--   • Pas d'authentification côté lecture (la page /outils/prevision-structure
--     est publique). Pas d'auth côté écriture non plus dans la v1 — le directeur
--     se sélectionne dans la liste annuaire_directions au moment de publier.
--   • Le filet de sécurité contre les modifications mal intentionnées est
--     l'historique des versions, jamais effacé sauf au-delà de 10 par école.

-- ─── Table principale : version publiée par école ───
create table if not exists previsions_structure (
  -- L'école est la clé : une seule fiche publiée à la fois par école.
  ecole_id        uuid primary key references annuaire_ecoles(id) on delete cascade,

  -- Auteur de la dernière publication. On garde aussi son nom au moment T pour
  -- l'affichage public, même si le directeur quitte l'école plus tard.
  directeur_id    uuid not null references annuaire_directions(id) on delete restrict,
  directeur_name  text not null,
  ecole_name      text not null,

  -- Métadonnées pédagogiques.
  annee_n         text not null,
  annee_n1        text not null,
  nb_classes      integer not null check (nb_classes between 1 and 35),
  rep_plus        boolean not null default false,

  -- Données structurées. Validées côté API avant insert.
  -- effectifs : { TPS: 0, PS: 12, ..., AUTRE: 0 }
  -- repartition : { TPS: [0,0,...], PS: [12,0,...], ... } — un array par niveau, longueur = nb_classes
  effectifs       jsonb not null,
  repartition     jsonb not null,

  -- Commentaires sur la structure (publics).
  comm_positifs   text not null default '',
  comm_negatifs   text not null default '',

  -- Suivi.
  created_at      timestamptz not null default now(),
  published_at    timestamptz not null default now(),
  client_id       text                                              -- id local optionnel pour le client
);

-- Index pour le tri par publication décroissante (vue par défaut côté UI).
create index if not exists idx_previsions_structure_published_at
  on previsions_structure (published_at desc);

create index if not exists idx_previsions_structure_ecole_name
  on previsions_structure (ecole_name);

-- ─── Historique : toutes les versions, conservées par école ───
create table if not exists previsions_structure_versions (
  id              uuid primary key default gen_random_uuid(),
  ecole_id        uuid not null references annuaire_ecoles(id) on delete cascade,
  directeur_id    uuid references annuaire_directions(id) on delete set null,
  directeur_name  text not null,
  ecole_name      text not null,
  annee_n         text not null,
  annee_n1        text not null,
  nb_classes      integer not null,
  rep_plus        boolean not null,
  effectifs       jsonb not null,
  repartition     jsonb not null,
  comm_positifs   text not null default '',
  comm_negatifs   text not null default '',
  published_at    timestamptz not null default now()
);

create index if not exists idx_previsions_versions_ecole_published
  on previsions_structure_versions (ecole_id, published_at desc);

-- ─── Trigger : à chaque publication, on archive la nouvelle ligne dans versions
-- et on purge au-delà des 10 plus récentes pour la même école.
create or replace function previsions_structure_archive() returns trigger as $$
begin
  insert into previsions_structure_versions (
    ecole_id, directeur_id, directeur_name, ecole_name,
    annee_n, annee_n1, nb_classes, rep_plus,
    effectifs, repartition, comm_positifs, comm_negatifs, published_at
  ) values (
    NEW.ecole_id, NEW.directeur_id, NEW.directeur_name, NEW.ecole_name,
    NEW.annee_n, NEW.annee_n1, NEW.nb_classes, NEW.rep_plus,
    NEW.effectifs, NEW.repartition, NEW.comm_positifs, NEW.comm_negatifs, NEW.published_at
  );

  -- Purge : on garde les 10 versions les plus récentes par école.
  delete from previsions_structure_versions
  where id in (
    select id from previsions_structure_versions
    where ecole_id = NEW.ecole_id
    order by published_at desc
    offset 10
  );

  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_previsions_structure_archive on previsions_structure;
create trigger trg_previsions_structure_archive
  after insert or update on previsions_structure
  for each row execute function previsions_structure_archive();

-- RLS désactivée — cohérent avec le reste du dashboard (boussole, annuaire…).
-- L'accès est contrôlé côté Next.js (lecture publique, écriture via /api/).
alter table previsions_structure          disable row level security;
alter table previsions_structure_versions disable row level security;
