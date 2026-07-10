-- ============================================================================
-- SÉCURISATION RLS — Circonscription Cayenne 2
-- ============================================================================
-- Objectif : empêcher tout accès direct aux tables via la clé « anon » publique
-- (celle qui est livrée au navigateur). Après cette migration :
--   • le SERVEUR (routes API) accède à tout via la clé service_role (bypass RLS) ;
--   • le NAVIGATEUR (clé anon) ne peut plus lire aucune table sensible ;
--   • seul le temps réel du quiz reste ouvert en lecture (données de jeu).
--
-- ⚠️ ORDRE DE DÉPLOIEMENT (important) :
--   1. Ajouter la variable SUPABASE_SERVICE_ROLE_KEY à l'hébergement (Vercel)
--      ET dans .env.local, puis mettre le nouveau code en ligne.
--   2. Vérifier que l'application fonctionne toujours (le RLS est encore désactivé).
--   3. SEULEMENT ENSUITE, exécuter ce script dans l'éditeur SQL de Supabase.
--   Si vous lancez ce script AVANT d'avoir la clé service_role en place, le
--   serveur (encore sur la clé anon) sera bloqué et l'application tombera.
--
-- Ce script est IDEMPOTENT : il peut être relancé sans risque.
-- ============================================================================

-- ── 1) Activer le RLS sur TOUTES les tables du schéma public ─────────────────
-- Une boucle garantit qu'aucune table (présente ou future) n'est oubliée.
-- Avec le RLS activé et AUCUNE policy, le rôle « anon » n'a plus aucun accès.
-- Le rôle « service_role » (utilisé par le serveur) contourne le RLS.
do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', r.tablename);
    raise notice 'RLS activé sur : %', r.tablename;
  end loop;
end $$;

-- ── 2) Temps réel du quiz : lecture autorisée pour le navigateur ─────────────
-- Le navigateur (rôle « anon ») s'abonne aux changements de ces 3 tables pour le
-- quiz en direct. Sans policy SELECT, Supabase Realtime ne délivrerait aucun
-- événement. Les données concernées (sessions, pseudos, réponses de jeu) ne sont
-- pas sensibles et sont déjà visibles publiquement pendant la partie.
do $$
declare
  t text;
begin
  foreach t in array array['quiz_sessions', 'quiz_participants', 'quiz_reponses']
  loop
    execute format(
      'drop policy if exists %I on public.%I;',
      'anon_realtime_read_' || t, t
    );
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true);',
      'anon_realtime_read_' || t, t
    );
    raise notice 'Policy realtime créée sur : %', t;
  end loop;
end $$;

-- ── 3) Vérification (facultatif) ─────────────────────────────────────────────
-- Décommentez pour lister l'état du RLS après exécution :
-- select tablename, rowsecurity as rls_actif
-- from pg_tables where schemaname = 'public' order by tablename;
