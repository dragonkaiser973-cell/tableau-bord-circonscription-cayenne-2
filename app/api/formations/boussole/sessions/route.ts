import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET — Liste des sessions de l'utilisateur connecté (tri : plus récentes d'abord)
export async function GET(request: NextRequest) {
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const { data: sessions, error } = await supabase
    .from('boussole_sessions')
    .select('*')
    .eq('created_by', username)
    .order('date_formation', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withCounts = await Promise.all(
    (sessions || []).map(async (s) => {
      const { count: avant } = await supabase
        .from('boussole_deposits')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', s.id)
        .eq('phase', 'avant');
      const { count: apres } = await supabase
        .from('boussole_deposits')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', s.id)
        .eq('phase', 'apres');
      return { ...s, nb_avant: avant || 0, nb_apres: apres || 0 };
    })
  );

  return NextResponse.json(withCounts);
}

// POST — Crée une nouvelle session
export async function POST(request: NextRequest) {
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const body = await request.json();
  const { titre, description, date_formation } = body;

  if (!titre || !titre.trim()) {
    return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('boussole_sessions')
    .insert({
      titre: titre.trim(),
      description: description?.trim() || null,
      date_formation: date_formation || new Date().toISOString().slice(0, 10),
      statut: 'en_cours',
      created_by: username,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
