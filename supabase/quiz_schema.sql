-- Schéma des tables pour l'outil Quiz live (type Kahoot)
-- À exécuter une seule fois dans l'éditeur SQL de Supabase.

-- ─── Quiz (modèle réutilisable créé par l'animateur) ──────────────────────
create table if not exists quiz_quizzes (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  description text,
  rythme text not null default 'manuel' check (rythme in ('manuel','auto')),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quiz_quizzes(id) on delete cascade,
  ordre int not null,
  type text not null default 'qcm' check (type in ('qcm','vrai_faux')),
  enonce text not null,
  duree_secondes int not null default 20,
  points_base int not null default 1000,
  created_at timestamptz not null default now()
);

create table if not exists quiz_choix (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references quiz_questions(id) on delete cascade,
  ordre int not null,
  libelle text not null,
  est_correct boolean not null default false
);

-- ─── Session live (instance jouée) ────────────────────────────────────────
create table if not exists quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quiz_quizzes(id) on delete restrict,
  pin text not null,
  rythme text not null default 'manuel' check (rythme in ('manuel','auto')),
  statut text not null default 'lobby'
    check (statut in ('lobby','question_active','resultats_question','podium','terminee')),
  current_question_id uuid references quiz_questions(id) on delete set null,
  current_question_index int default -1,
  question_started_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

-- Un PIN ne peut être réutilisé que si la session précédente est terminée
create unique index if not exists uniq_quiz_pin_active
  on quiz_sessions(pin) where statut <> 'terminee';

create table if not exists quiz_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references quiz_sessions(id) on delete cascade,
  pseudo text not null,
  score int not null default 0,
  joined_at timestamptz not null default now(),
  unique (session_id, pseudo)
);

create table if not exists quiz_reponses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references quiz_sessions(id) on delete cascade,
  question_id uuid not null references quiz_questions(id) on delete cascade,
  participant_id uuid not null references quiz_participants(id) on delete cascade,
  choix_id uuid references quiz_choix(id) on delete set null,
  est_correct boolean not null,
  temps_ms int not null,
  points_gagnes int not null,
  created_at timestamptz not null default now(),
  unique (session_id, question_id, participant_id)
);

create index if not exists idx_quiz_reponses_session_question
  on quiz_reponses(session_id, question_id);
create index if not exists idx_quiz_participants_session
  on quiz_participants(session_id);
create index if not exists idx_quiz_questions_quiz_ordre
  on quiz_questions(quiz_id, ordre);
create index if not exists idx_quiz_sessions_created_by
  on quiz_sessions(created_by);

-- ─── Activation Realtime ──────────────────────────────────────────────────
-- Les clients écoutent ces tables via supabase.channel(...).on('postgres_changes', ...)
alter publication supabase_realtime add table quiz_sessions;
alter publication supabase_realtime add table quiz_participants;
alter publication supabase_realtime add table quiz_reponses;

-- ─── Seed d'un quiz de démonstration (V1 — utile pour tester) ─────────────
-- Décommenter pour insérer un quiz de test après exécution du schéma.
-- do $$
-- declare
--   q_id uuid;
--   q1_id uuid; q2_id uuid; q3_id uuid;
-- begin
--   insert into quiz_quizzes (titre, description, created_by)
--   values ('Quiz démo — culture générale', 'Quiz de test pour valider le système', 'admin')
--   returning id into q_id;
--
--   insert into quiz_questions (quiz_id, ordre, enonce, duree_secondes)
--   values (q_id, 0, 'Quelle est la capitale de la France ?', 15)
--   returning id into q1_id;
--   insert into quiz_choix (question_id, ordre, libelle, est_correct) values
--     (q1_id, 0, 'Marseille', false),
--     (q1_id, 1, 'Paris', true),
--     (q1_id, 2, 'Lyon', false),
--     (q1_id, 3, 'Bordeaux', false);
--
--   insert into quiz_questions (quiz_id, ordre, enonce, duree_secondes)
--   values (q_id, 1, 'Combien de continents y a-t-il ?', 15)
--   returning id into q2_id;
--   insert into quiz_choix (question_id, ordre, libelle, est_correct) values
--     (q2_id, 0, '5', false),
--     (q2_id, 1, '6', false),
--     (q2_id, 2, '7', true),
--     (q2_id, 3, '8', false);
--
--   insert into quiz_questions (quiz_id, ordre, enonce, duree_secondes)
--   values (q_id, 2, 'Quelle planète est la plus proche du Soleil ?', 15)
--   returning id into q3_id;
--   insert into quiz_choix (question_id, ordre, libelle, est_correct) values
--     (q3_id, 0, 'Vénus', false),
--     (q3_id, 1, 'Mercure', true),
--     (q3_id, 2, 'Mars', false),
--     (q3_id, 3, 'Terre', false);
-- end $$;
