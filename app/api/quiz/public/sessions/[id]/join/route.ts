import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST — Rejoint la session avec un pseudo. Crée un participant et retourne son id.
//        Le participant_id doit être conservé en localStorage côté client.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const pseudoBrut = String(body.pseudo || '').trim();

  if (pseudoBrut.length < 1 || pseudoBrut.length > 20) {
    return NextResponse.json({ error: 'Pseudo entre 1 et 20 caractères' }, { status: 400 });
  }

  const { data: session } = await supabase
    .from('quiz_sessions')
    .select('id, statut')
    .eq('id', id)
    .single();

  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  if (session.statut === 'terminee') {
    return NextResponse.json({ error: 'Cette session est terminée' }, { status: 409 });
  }

  // On n'autorise à rejoindre qu'avant le démarrage (en lobby)
  if (session.statut !== 'lobby') {
    return NextResponse.json({ error: 'Le quiz a déjà démarré' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('quiz_participants')
    .insert({
      session_id: id,
      pseudo: pseudoBrut,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ce pseudo est déjà pris' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
