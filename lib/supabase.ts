import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ─────────────────────────────────────────────────────────────────────────────
// Sélection de la clé selon l'environnement d'exécution.
//
// • Côté SERVEUR (routes API, `typeof window === 'undefined'`) : on utilise la
//   clé `service_role`. Elle contourne le RLS (Row Level Security) et permet au
//   serveur — déjà protégé par le middleware JWT — d'accéder à toutes les tables.
//   Cette variable n'est PAS préfixée `NEXT_PUBLIC_` : Next.js ne l'inclut donc
//   JAMAIS dans le bundle envoyé au navigateur (elle y vaut `undefined`).
//
// • Côté NAVIGATEUR : on reste sur la clé `anon` publique. Elle ne sert plus qu'au
//   temps réel du quiz (abonnements Realtime), désormais encadré par des policies
//   RLS restrictives. La clé anon ne peut plus lire les tables sensibles.
//
// Repli : si `SUPABASE_SERVICE_ROLE_KEY` n'est pas encore configurée, le serveur
// retombe sur la clé anon. Cela permet un déploiement en douceur : mettre le code
// en ligne d'abord (l'app continue de fonctionner tant que le RLS est encore
// désactivé), puis activer le RLS une fois la clé service_role en place.
// ─────────────────────────────────────────────────────────────────────────────
const serviceRoleKey =
  typeof window === 'undefined' ? (process.env.SUPABASE_SERVICE_ROLE_KEY || '') : '';

const activeKey = serviceRoleKey || supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Identifiants Supabase manquants (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY).');
}

export const supabase = createClient(supabaseUrl, activeKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Helper pour vérifier si Supabase est configuré (basé sur la clé publique,
// présente dans les deux environnements).
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};
