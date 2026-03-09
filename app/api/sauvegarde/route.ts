import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET — Récupérer la date de dernière sauvegarde confirmée
export async function GET(request: NextRequest) {
  const { data, error } = await supabase
    .from('config')
    .select('derniere_sauvegarde')
    .eq('id', 1)
    .single();

  if (error) {
    return NextResponse.json({ derniere_sauvegarde: null });
  }

  return NextResponse.json({ derniere_sauvegarde: data?.derniere_sauvegarde || null });
}

// POST — Confirmer que la sauvegarde a été effectuée ce mois-ci
export async function POST(request: NextRequest) {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('config')
    .update({ derniere_sauvegarde: now })
    .eq('id', 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ derniere_sauvegarde: now });
}
