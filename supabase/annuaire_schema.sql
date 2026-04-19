-- Schéma des tables pour l'Annuaire de la circonscription
-- À exécuter une seule fois dans l'éditeur SQL de Supabase.

-- ─── Équipe de circonscription (IEN, CPAIEN, CPC, secrétaire…) ───
create table if not exists annuaire_circo (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  role_long text not null,
  name text not null,
  email text,
  tels jsonb not null default '[]'::jsonb,
  accent text not null default 'from-slate-400 to-slate-500',
  icon_key text not null default 'folder' check (icon_key in ('star', 'folder', 'compass', 'activity', 'chip')),
  ordre integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Écoles ───
create table if not exists annuaire_ecoles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text check (type in ('EEPU', 'EMPU', 'EEPR', 'GS')),
  ordre integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Directeurs / directrices rattachés à une école ───
create table if not exists annuaire_directions (
  id uuid primary key default gen_random_uuid(),
  ecole_id uuid not null references annuaire_ecoles(id) on delete cascade,
  name text not null,
  role text,
  email text,
  tels jsonb not null default '[]'::jsonb,
  ordre integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_annuaire_circo_ordre on annuaire_circo(ordre);
create index if not exists idx_annuaire_ecoles_ordre on annuaire_ecoles(ordre);
create index if not exists idx_annuaire_directions_ecole on annuaire_directions(ecole_id);
create index if not exists idx_annuaire_directions_ordre on annuaire_directions(ordre);

-- Désactiver RLS (même approche que boussole / users / etc.) — l'accès est contrôlé
-- côté Next.js par le middleware JWT et les routes /api/admin/*.
alter table annuaire_circo disable row level security;
alter table annuaire_ecoles disable row level security;
alter table annuaire_directions disable row level security;

-- ─── Seed : Équipe de circonscription (année 2025-2026) ───
insert into annuaire_circo (role, role_long, name, email, tels, accent, icon_key, ordre) values
  ('IEN', 'Inspectrice de l''Éducation Nationale', 'Mme Lautric Chantal', 'chantal.lautric@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.27.19.24"},{"type":"mobile","number":"0694.27.25.32"}]'::jsonb,
    'from-amber-400 to-orange-500', 'star', 1),
  ('Secrétaire', 'Secrétaire de circonscription', 'Mme Pigree Anna', 'anna.pigree@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.27.19.13"}]'::jsonb,
    'from-sky-400 to-blue-500', 'folder', 2),
  ('CPAIEN', 'Conseillère pédagogique auprès de l''IEN', 'Mme Hernandez Mona', 'mona.hernandez@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.27.19.46"}]'::jsonb,
    'from-violet-400 to-purple-500', 'compass', 3),
  ('CPC EPS', 'Conseiller pédagogique — EPS', 'M. Pierre Gaelle Jean-Luc', 'j-luc.pierre@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.27.19.43"}]'::jsonb,
    'from-emerald-400 to-teal-500', 'activity', 4),
  ('CPC NE', 'Conseiller pédagogique — Numérique éducatif', 'M. Louis Olivier', 'olivier.louis@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.27.19.46"},{"type":"mobile","number":"0694.25.82.75"}]'::jsonb,
    'from-fuchsia-400 to-pink-500', 'chip', 5)
on conflict do nothing;

-- ─── Seed : Écoles (18, une entrée par directeur) ───
insert into annuaire_ecoles (name, type, ordre) values
  ('Eliette Danglades Élémentaire', 'EEPU', 1),
  ('Eliette Danglades Maternelle',  'EMPU', 2),
  ('Heder Élémentaire',              'EEPU', 3),
  ('Heder Maternelle',               'EMPU', 4),
  ('Gaetan Hermine Élémentaire',    'EEPU', 5),
  ('Gaetan Hermine Maternelle',     'EMPU', 6),
  ('Mont-Lucas Élémentaire',        'EEPU', 7),
  ('Mont-Lucas Maternelle',         'EMPU', 8),
  ('Vendome Élémentaire',           'EEPU', 9),
  ('Vendome Maternelle',            'EMPU', 10),
  ('Saba',                           'EEPU', 11),
  ('La Roseraie',                    'EMPU', 12),
  ('Léodate Volmar',                 'EMPU', 13),
  ('Jean-Marie Mortin',              'GS',   14),
  ('Augustine Duchange',             'GS',   15),
  ('De Cacao',                       'EEPR', 16),
  ('Saint-Paul',                     'EEPR', 17),
  ('La Persévérance',                'EEPR', 18)
on conflict (name) do nothing;

-- ─── Seed : Directions (1 directeur par école) ───
insert into annuaire_directions (ecole_id, name, role, email, tels, ordre)
select e.id, v.name, null, v.email, v.tels::jsonb, 1
from (values
  ('Eliette Danglades Élémentaire', 'M. Lecante Laurent', 'ce.9730128b@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.38.21.92"},{"type":"mobile","number":"0694.23.15.44"}]'),
  ('Eliette Danglades Maternelle', 'Mme Milzink-Seewgobind Line', 'ce.9730129c@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.31.59.90"},{"type":"mobile","number":"0694.21.83.66"}]'),
  ('Heder Élémentaire', 'Mme Said Katia', 'ce.9730114l@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.31.09.54"},{"type":"mobile","number":"0694.13.27.20"}]'),
  ('Heder Maternelle', 'Mme Lecante Travise', 'ce.9730117p@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.30.23.17"},{"type":"mobile","number":"0694.20.73.80"}]'),
  ('Gaetan Hermine Élémentaire', 'Mme William Marie-Agnès', 'ce.9730042h@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.31.28.51"},{"type":"mobile","number":"0694.38.95.25"}]'),
  ('Gaetan Hermine Maternelle', 'M. Agot Patrick', 'ce.9730189t@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.31.03.73"},{"type":"mobile","number":"0694.27.61.17"}]'),
  ('Mont-Lucas Élémentaire', 'Mme Mathurin Sonia', 'ce.9730211s@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.30.35.03"},{"type":"mobile","number":"0694.28.68.21"}]'),
  ('Mont-Lucas Maternelle', 'Mme Charles Maryse', 'ce.9730209p@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.30.35.05"},{"type":"mobile","number":"0694.24.31.42"}]'),
  ('Vendome Élémentaire', 'M. Madeleine Didier', 'ce.9730399w@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.25.22.51"},{"type":"mobile","number":"0694.26.31.89"}]'),
  ('Vendome Maternelle', 'Mme Waya Kety', 'ce.9730417r@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.25.22.52"},{"type":"mobile","number":"0694.24.36.37"}]'),
  ('Saba', 'Mme Portut Sarah', 'ce.9730104a@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.30.23.06"},{"type":"mobile","number":"0694.03.53.00"}]'),
  ('La Roseraie', 'Mme Deltoy Sylvie', 'ce.9730203h@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.31.44.46"},{"type":"mobile","number":"0694.28.28.68"}]'),
  ('Léodate Volmar', 'Mme Parfait Hadely', 'ce.9730326s@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.30.03.97"},{"type":"mobile","number":"0694.40.66.01"}]'),
  ('Jean-Marie Mortin', 'Mme Jean-Louis Béatrice', 'ce.9730200e@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.30.13.85"},{"type":"mobile","number":"0694.22.47.77"}]'),
  ('Augustine Duchange', 'M. Othily Ariès', 'ce.9730043j@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.37.05.21"},{"type":"mobile","number":"0694.40.28.19"}]'),
  ('De Cacao', 'Mme Rabinaud Véronique', 'ce.9730227j@ac-guyane.fr',
    '[{"type":"fixe","number":"0594.27.09.93"},{"type":"mobile","number":"0694.23.23.40"}]'),
  ('Saint-Paul', 'M. Lau Ndzeu Tchi George', 'secretariat.ecolesaintpaul.kko@orange.fr',
    '[{"type":"fixe","number":"0594.27.02.13"},{"type":"fixe","number":"0594.27.01.50"}]'),
  ('La Persévérance', 'M. Vouimba Hugues', 'directionperseverancecay@gmail.com',
    '[{"type":"fixe","number":"0594.30.06.78"},{"type":"mobile","number":"0767.04.02.75"}]')
) as v(ecole_name, name, email, tels)
join annuaire_ecoles e on e.name = v.ecole_name
where not exists (
  select 1 from annuaire_directions d where d.ecole_id = e.id and d.name = v.name
);
