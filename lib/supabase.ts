import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('🔍 DEBUG - Supabase URL:', supabaseUrl ? 'CONFIGURÉ ✅' : 'MANQUANT ❌');
console.log('🔍 DEBUG - Supabase Key:', supabaseAnonKey ? 'CONFIGURÉ ✅' : 'MANQUANT ❌');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials missing, falling back to JSON files');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper pour vérifier si Supabase est configuré
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};
