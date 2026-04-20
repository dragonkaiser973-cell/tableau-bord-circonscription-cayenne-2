-- Schéma des tables pour le Plan de formation de la circonscription (outil Formations)
-- À exécuter une seule fois dans l'éditeur SQL de Supabase.

-- ─── Référentiel formateurs ──────────────────────────────────────────
create table if not exists plan_formation_formateurs (
  id uuid primary key default gen_random_uuid(),
  raccourci text not null unique,
  nom_complet text not null,
  statut text not null,
  ordre integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Formations (1 ligne = 1 dispositif du plan) ─────────────────────
create table if not exists plan_formation (
  id uuid primary key default gen_random_uuid(),
  annee_scolaire text not null default '2025-2026',
  cycle integer not null check (cycle in (1, 2, 3)),
  niveaux text[] not null default '{}',
  titre text not null,
  duree_h numeric(5,2) not null default 0,
  type text not null check (type in (
    'plan_maths', 'plan_francais', 'plan_lecture',
    'anim_ped', 'plan_laicite', 'plan_phare',
    'anglais', 'savoir_rouler', 'autre'
  )),
  pilote_sofia text,
  -- formateurs : tableau de groupes (binôme/trinôme/constellation/choix d'anim)
  -- [{ "label": "Narramus"?, "membres": [{"raccourci": "Dumaison"}, ...] }]
  formateurs jsonb not null default '[]'::jsonb,
  statut text not null default 'prevu' check (statut in ('prevu', 'en_cours', 'termine', 'annule')),
  valide_admin boolean not null default false,
  notes text,
  ordre integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (annee_scolaire, cycle, titre)
);

-- ─── Sessions (N dates pour une formation) ───────────────────────────
create table if not exists plan_formation_sessions (
  id uuid primary key default gen_random_uuid(),
  formation_id uuid not null references plan_formation(id) on delete cascade,
  date_session date,
  date_libre text,
  duree_h numeric(5,2),
  lieu text,
  modalite text not null default 'presentiel' check (modalite in ('presentiel', 'distanciel', 'observation')),
  description text,
  fait boolean not null default false,
  ordre integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_plan_formation_annee on plan_formation(annee_scolaire);
create index if not exists idx_plan_formation_cycle on plan_formation(cycle);
create index if not exists idx_plan_formation_ordre on plan_formation(ordre);
create index if not exists idx_plan_formation_sessions_formation on plan_formation_sessions(formation_id);
create index if not exists idx_plan_formation_sessions_date on plan_formation_sessions(date_session);
create index if not exists idx_plan_formation_formateurs_ordre on plan_formation_formateurs(ordre);

alter table plan_formation_formateurs disable row level security;
alter table plan_formation disable row level security;
alter table plan_formation_sessions disable row level security;

-- ─── Seed : Formateurs (Doc Formateurs.docx) ─────────────────────────
insert into plan_formation_formateurs (raccourci, nom_complet, statut, ordre) values
  ('Louis',               'Louis Olivier',              'CPC NE',                         1),
  ('Hernandez',           'Hernandez Mona',             'CPAIEN',                         2),
  ('Bahro',               'Bahro Céline',               'CPC EPS',                        3),
  ('Ligneel',             'Ligneel Marietta',           'PEMF',                           10),
  ('Luce',                'Luce Mario',                 'PEMF',                           11),
  ('Alexander',           'Alexander Sandrine',         'PEMF',                           12),
  ('Boitard',             'Boitard Rosie',              'PEMF',                           13),
  ('Priam',               'Priam Catherine',            'PEMF',                           14),
  ('Mangatalle MS',       'Mangatalle Marie-Sergine',   'PEMF',                           15),
  ('Dumaison',            'Dumaison Venite',            'PEMF',                           16),
  ('Dol',                 'Dol Julie',                  'PEMF',                           17),
  ('Cherubin-Jeannette',  'Cherubin-Jeannette Laura',   'PEMF',                           18),
  ('Borges-Haussler',     'Borges-Haussler Christiane', 'Candidate CAFIPEMF',             30),
  ('Calumey',             'Calumey Louis-Mike',         'Candidat CAFIPEMF',              31),
  ('Madeleine',           'Madeleine Nora',             'Candidate CAFIPEMF',             32),
  ('Coupra',              'Coupra Chris',               'Candidat CAFIPEMF',              33),
  ('Melgire',             'Melgire Lénaïck',            'Candidate CAFIPEMF',             34),
  ('Malbranche',          'Malbranche Roselène',        'Candidate CAFIPEMF',             35),
  ('Mangatalle C',        'Mangatalle Clothilde',       'Candidate CAFIPEMF',             36),
  ('Le Cheviller',        'Le Cheviller Sidonie',       'Candidate CAFIPEMF',             37),
  ('Milzink-Sewgobind',   'Milzink-Sewgobind Line',     'Candidate CAFIPEMF',             38),
  ('Janin Romuald',       'Janin Romuald',              'IEN Maternelle',                 50),
  ('Vatonne',             'Vatonne Catherine',          'IEN plan lecture',               51),
  ('Lautric',             'Lautric Chantal',            'IEN Circo Cayenne 2 – Roura',    52),
  ('IEN Laïcité',         'Freinet Cynthia',            'IEN Laïcité',                    53),
  ('Dufay',               'Dufay Franck',               'CPD EDD',                        60),
  ('Quillot',             'Quillot Nicolas',            'CPD AP',                         61),
  ('Cotte',               'Cotte Alexia',               'CPD généraliste',                62),
  ('Montoute',            'Montout Rodrigue',           'CPD langue',                     63),
  ('Jully',               'Jully Alexandre',            'CPD mathématiques',              64),
  ('Lecante',             'Lecante Travise',            'Référente langue',               65),
  ('Coutant',             'Coutant Astrid',             'Maître E',                       70),
  ('Boyer',               'Boyer-Fraisse Nathalie',     'Maître E',                       71)
on conflict (raccourci) do update
  set nom_complet = excluded.nom_complet,
      statut      = excluded.statut,
      ordre       = excluded.ordre,
      updated_at  = now();

-- ─── Seed : Formations 2025-2026 (extraites du PDF V10) ──────────────
insert into plan_formation (annee_scolaire, cycle, niveaux, titre, duree_h, type, pilote_sofia, formateurs, ordre, notes) values
  -- Cycle 1
  ('2025-2026', 1, '{PS,MS}', 'Plan Maths 30H - 5 constellations', 30, 'plan_maths', 'Louis Olivier',
    '[
      {"membres":[{"raccourci":"Louis"},{"raccourci":"Borges-Haussler"}]},
      {"membres":[{"raccourci":"Bahro"},{"raccourci":"Ligneel"},{"raccourci":"Calumey"}]},
      {"membres":[{"raccourci":"Hernandez"}]},
      {"membres":[{"raccourci":"Luce"},{"raccourci":"Madeleine"}]},
      {"membres":[{"raccourci":"Alexander"}]}
    ]'::jsonb, 1, null),

  ('2025-2026', 1, '{GS}', 'Préparation Plan Maths 9H', 9, 'plan_maths', 'Hernandez Mona',
    '[{"membres":[{"raccourci":"Janin Romuald"}]}]'::jsonb, 2, 'EM Vendôme'),

  ('2025-2026', 1, '{GS}', 'Animations Pédagogiques au choix 9H (Cycle 1)', 9, 'anim_ped', 'Hernandez Mona',
    '[
      {"label":"Faire des sciences","membres":[{"raccourci":"Dufay"}]},
      {"label":"Narramus","membres":[{"raccourci":"Dumaison"},{"raccourci":"Dol"}]},
      {"label":"Art et langage","membres":[{"raccourci":"Quillot"}]}
    ]'::jsonb, 3, 'Salles en attente INSPE'),

  -- Cycle 2
  ('2025-2026', 2, '{CP,CE1}', 'Suivi Plan Français 9H (CP+CE1)', 9, 'plan_francais', 'Louis Olivier',
    '[{"membres":[{"raccourci":"Bahro"},{"raccourci":"Cotte"}]}]'::jsonb, 10,
    'En 2 groupes, 2*4,5h. Gp 1 : EE Danglades — Gp 2 : EE Hermine'),

  ('2025-2026', 2, '{CP,CE1}', 'Plan Français 30H (CP+CE1) - 4 constellations', 30, 'plan_francais', 'Hernandez Mona',
    '[
      {"membres":[{"raccourci":"Hernandez"}]},
      {"membres":[{"raccourci":"Boitard"},{"raccourci":"Coupra"},{"raccourci":"Melgire"}]},
      {"membres":[{"raccourci":"Priam"},{"raccourci":"Malbranche"},{"raccourci":"Mangatalle C"}]},
      {"membres":[{"raccourci":"Mangatalle MS"},{"raccourci":"Le Cheviller"},{"raccourci":"Milzink-Sewgobind"}]}
    ]'::jsonb, 11, null),

  ('2025-2026', 2, '{CE2}', 'Plan LECTURE - Préparation Plan Français 9H', 9, 'plan_lecture', 'Hernandez Mona',
    '[{"membres":[{"raccourci":"Vatonne"}]}]'::jsonb, 12, 'Salle en attente INSPE'),

  ('2025-2026', 2, '{CP,CE1,CE2}', 'Groupe 1 Plan Laïcité 9H', 9, 'plan_laicite', 'IEN Laïcité',
    '[{"membres":[{"raccourci":"IEN Laïcité"}]}]'::jsonb, 13, 'Lieu à confirmer'),

  ('2025-2026', 2, '{CP,CE1,CE2}', 'Groupe 2 Plan Phare/CPS 9H', 9, 'plan_phare', 'Louis Olivier',
    '[{"membres":[{"raccourci":"Bahro"},{"raccourci":"Coutant"},{"raccourci":"Boyer"},{"raccourci":"Lautric"}]}]'::jsonb,
    14, 'EE Vendôme'),

  ('2025-2026', 2, '{CE2}', 'Animations Pédagogiques au choix 9H (Cycle 2)', 9, 'anim_ped', 'Hernandez Mona',
    '[
      {"label":"Anglais GRAC","membres":[{"raccourci":"Lecante"},{"raccourci":"Montoute"}]},
      {"label":"EDD","membres":[{"raccourci":"Dufay"},{"raccourci":"Boitard"}]},
      {"label":"Arts visuels","membres":[{"raccourci":"Quillot"}]}
    ]'::jsonb, 15, 'Salles en attente INSPE'),

  -- Cycle 3
  ('2025-2026', 3, '{CM1,CM2}', 'Suivi du Plan Maths 9H', 9, 'plan_maths', 'Hernandez Mona',
    '[{"membres":[{"raccourci":"Jully"}]}]'::jsonb, 20, 'EE Mont-Lucas'),

  ('2025-2026', 3, '{CM1,CM2}', 'Anglais 6H', 6, 'anglais', 'Louis Olivier',
    '[{"label":"GRAC","membres":[{"raccourci":"Lecante"},{"raccourci":"Cherubin-Jeannette"},{"raccourci":"Dumaison"}]}]'::jsonb,
    21, 'EE Mont-Lucas'),

  ('2025-2026', 3, '{CM1}', 'Savoir rouler 3H - EE Héder', 3, 'savoir_rouler', 'Louis Olivier',
    '[{"membres":[{"raccourci":"Bahro"}]}]'::jsonb, 22, null),

  ('2025-2026', 3, '{CM2}', 'Savoir rouler 3H - EE Vendôme', 3, 'savoir_rouler', 'Louis Olivier',
    '[{"membres":[{"raccourci":"Bahro"}]}]'::jsonb, 23, null)
on conflict (annee_scolaire, cycle, titre) do nothing;

-- ─── Seed : Sessions ─────────────────────────────────────────────────
-- Astuce : on insère via SELECT avec jointure sur le titre de la formation
with f as (
  select id, titre, cycle from plan_formation where annee_scolaire = '2025-2026'
)
insert into plan_formation_sessions (formation_id, date_session, date_libre, duree_h, lieu, modalite, description, ordre)
select f.id, v.date_session::date, v.date_libre, v.duree_h, v.lieu, v.modalite, v.description, v.ordre
from (values
  -- Plan Maths 30H (Cycle 1)
  ('Plan Maths 30H - 5 constellations', 1, '2025-09-17', null, 2.0, 'Salle polyvalente, rte Madeleine', 'presentiel', 'Lancement',              1),
  ('Plan Maths 30H - 5 constellations', 1, '2025-09-29', null, 3.0, null,                                 'observation','OBS 1 (29+30/09)',        2),
  ('Plan Maths 30H - 5 constellations', 1, '2025-10-01', null, 4.0, 'EE Saba',                            'presentiel', null,                       3),
  ('Plan Maths 30H - 5 constellations', 1, '2025-11-12', null, 3.0, 'EE Saba',                            'presentiel', null,                       4),
  ('Plan Maths 30H - 5 constellations', 1, '2025-12-04', null, 3.0, null,                                 'observation','OBS 2 (4+5/12)',           5),
  ('Plan Maths 30H - 5 constellations', 1, '2025-12-10', null, 3.0, 'EE Saba',                            'presentiel', null,                       6),
  ('Plan Maths 30H - 5 constellations', 1, '2026-01-07', null, 1.0, null,                                 'distanciel', 'Distanciel 1',             7),
  ('Plan Maths 30H - 5 constellations', 1, '2026-01-28', null, 1.0, null,                                 'distanciel', 'Distanciel 2',             8),
  ('Plan Maths 30H - 5 constellations', 1, '2026-02-23', null, 3.0, null,                                 'observation','OBS 3 (23+24/02)',         9),
  ('Plan Maths 30H - 5 constellations', 1, '2026-02-25', null, 4.0, 'EE Saba',                            'presentiel', null,                      10),
  ('Plan Maths 30H - 5 constellations', 1, null,         'Entre le 11/05 et le 22/05', 3.0, null,         'observation','OBS 4',                   11),

  -- Préparation Plan Maths 9H (Cycle 1 / GS)
  ('Préparation Plan Maths 9H',         1, '2026-01-14', null, 3.0, 'EM Vendôme',                         'presentiel', null,                       1),
  ('Préparation Plan Maths 9H',         1, '2026-01-21', null, 3.0, 'EM Vendôme',                         'presentiel', null,                       2),
  ('Préparation Plan Maths 9H',         1, '2026-03-18', null, 3.0, 'EM Vendôme',                         'presentiel', null,                       3),

  -- Animations Pédagogiques C1
  ('Animations Pédagogiques au choix 9H (Cycle 1)', 1, '2025-11-05', null, 3.0, 'Salle en attente INSPE', 'presentiel', null,                       1),
  ('Animations Pédagogiques au choix 9H (Cycle 1)', 1, '2025-11-26', null, 3.0, 'Salle en attente INSPE', 'presentiel', null,                       2),
  ('Animations Pédagogiques au choix 9H (Cycle 1)', 1, '2026-03-04', null, 3.0, 'Salle en attente INSPE', 'presentiel', null,                       3),

  -- Suivi Plan Français 9H (CP+CE1)
  ('Suivi Plan Français 9H (CP+CE1)',   2, '2025-10-08', null, 4.5, 'EE Danglades',                       'presentiel', 'Groupe 1',                 1),
  ('Suivi Plan Français 9H (CP+CE1)',   2, '2025-11-26', null, 4.5, 'EE Danglades',                       'presentiel', 'Groupe 1',                 2),
  ('Suivi Plan Français 9H (CP+CE1)',   2, '2025-11-19', null, 4.5, 'EE Hermine',                         'presentiel', 'Groupe 2',                 3),
  ('Suivi Plan Français 9H (CP+CE1)',   2, '2025-12-03', null, 4.5, 'EE Hermine',                         'presentiel', 'Groupe 2',                 4),

  -- Plan Français 30H (Cycle 2)
  ('Plan Français 30H (CP+CE1) - 4 constellations', 2, '2025-09-17', null, 2.0, 'Salle polyvalente, rte Madeleine', 'presentiel', 'Lancement',     1),
  ('Plan Français 30H (CP+CE1) - 4 constellations', 2, '2025-10-02', null, 3.0, null,                                'observation','OBS 1 (2+3/10)',  2),
  ('Plan Français 30H (CP+CE1) - 4 constellations', 2, '2025-10-08', null, 4.0, 'EE Saba',                           'presentiel', null,             3),
  ('Plan Français 30H (CP+CE1) - 4 constellations', 2, '2025-11-19', null, 3.0, 'EE Saba',                           'presentiel', null,             4),
  ('Plan Français 30H (CP+CE1) - 4 constellations', 2, '2025-12-01', null, 3.0, null,                                'observation','OBS 2 (1+2/12)',  5),
  ('Plan Français 30H (CP+CE1) - 4 constellations', 2, '2025-12-03', null, 3.0, 'EE Saba',                           'presentiel', null,             6),
  ('Plan Français 30H (CP+CE1) - 4 constellations', 2, '2026-01-07', null, 1.0, null,                                'distanciel', 'Distanciel 1',    7),
  ('Plan Français 30H (CP+CE1) - 4 constellations', 2, '2026-01-28', null, 1.0, null,                                'distanciel', 'Distanciel 2',    8),
  ('Plan Français 30H (CP+CE1) - 4 constellations', 2, '2026-02-26', null, 3.0, null,                                'observation','OBS 3 (26+27/02)',9),
  ('Plan Français 30H (CP+CE1) - 4 constellations', 2, '2026-03-04', null, 4.0, 'EE Saba',                           'presentiel', null,            10),
  ('Plan Français 30H (CP+CE1) - 4 constellations', 2, null,         'Entre le 11/05 et le 22/05', 3.0, null,        'observation','OBS 4',         11),

  -- Plan LECTURE
  ('Plan LECTURE - Préparation Plan Français 9H',   2, '2025-11-26', null, 3.0, 'Salle en attente INSPE', 'presentiel', null,                      1),
  ('Plan LECTURE - Préparation Plan Français 9H',   2, '2025-12-10', null, 3.0, 'Salle en attente INSPE', 'presentiel', null,                      2),
  ('Plan LECTURE - Préparation Plan Français 9H',   2, '2025-12-17', null, 3.0, 'Salle en attente INSPE', 'presentiel', null,                      3),

  -- Plan Laïcité
  ('Groupe 1 Plan Laïcité 9H',          2, '2025-11-05', null, 4.5, null,                                 'presentiel', null,                       1),
  ('Groupe 1 Plan Laïcité 9H',          2, '2025-12-10', null, 4.5, null,                                 'presentiel', null,                       2),

  -- Plan Phare / CPS
  ('Groupe 2 Plan Phare/CPS 9H',        2, '2025-11-05', null, 4.5, 'EE Vendôme',                         'presentiel', null,                       1),
  ('Groupe 2 Plan Phare/CPS 9H',        2, '2025-12-10', null, 4.5, 'EE Vendôme',                         'presentiel', null,                       2),

  -- Animations Pédagogiques C2
  ('Animations Pédagogiques au choix 9H (Cycle 2)', 2, '2026-03-11', null, 3.0, 'Salle en attente INSPE', 'presentiel', null,                      1),
  ('Animations Pédagogiques au choix 9H (Cycle 2)', 2, '2026-03-25', null, 3.0, 'Salle en attente INSPE', 'presentiel', null,                      2),
  ('Animations Pédagogiques au choix 9H (Cycle 2)', 2, '2026-04-29', null, 3.0, 'Salle en attente INSPE', 'presentiel', null,                      3),

  -- Cycle 3 — Suivi Plan Maths
  ('Suivi du Plan Maths 9H',            3, '2025-11-19', null, 3.0, 'EE Mont-Lucas',                      'presentiel', null,                       1),
  ('Suivi du Plan Maths 9H',            3, '2025-12-03', null, 3.0, 'EE Mont-Lucas',                      'presentiel', null,                       2),
  ('Suivi du Plan Maths 9H',            3, '2026-01-14', null, 3.0, 'EE Mont-Lucas',                      'presentiel', null,                       3),

  -- Cycle 3 — Anglais 6H
  ('Anglais 6H',                        3, '2026-01-21', null, 6.0, 'EE Mont-Lucas',                      'presentiel', null,                       1),

  -- Cycle 3 — Savoir rouler
  ('Savoir rouler 3H - EE Héder',       3, '2025-09-24', null, 3.0, 'EE Héder',                           'presentiel', null,                       1),
  ('Savoir rouler 3H - EE Vendôme',     3, '2025-10-15', null, 3.0, 'EE Vendôme',                         'presentiel', null,                       1)
) as v(formation_titre, formation_cycle, date_session, date_libre, duree_h, lieu, modalite, description, ordre)
join f on f.titre = v.formation_titre and f.cycle = v.formation_cycle
where not exists (
  select 1 from plan_formation_sessions s where s.formation_id = f.id and s.ordre = v.ordre
);
