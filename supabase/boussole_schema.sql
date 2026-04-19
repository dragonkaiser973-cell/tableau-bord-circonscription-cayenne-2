-- Schéma des tables pour la Boussole d'état d'esprit (outil Formations)
-- À exécuter une seule fois dans l'éditeur SQL de Supabase.

create table if not exists boussole_sessions (
  id uuid primary key default gen_random_uuid(),
  titre text not null,
  description text,
  date_formation date not null default current_date,
  statut text not null default 'en_cours' check (statut in ('en_cours', 'terminee')),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists boussole_deposits (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references boussole_sessions(id) on delete cascade,
  phase text not null check (phase in ('avant', 'apres')),
  emoji text not null,
  label text,
  x numeric(5,2) not null,
  y numeric(5,2) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_boussole_deposits_session on boussole_deposits(session_id);
create index if not exists idx_boussole_sessions_created_by on boussole_sessions(created_by);
create index if not exists idx_boussole_sessions_date on boussole_sessions(date_formation desc);
