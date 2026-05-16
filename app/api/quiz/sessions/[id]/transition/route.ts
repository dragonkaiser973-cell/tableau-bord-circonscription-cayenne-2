import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST — Pilote la machine à états de la session
//   { action: 'start' }    : lobby → question_active (1ʳᵉ question)
//   { action: 'stop' }     : question_active → resultats_question
//   { action: 'next' }     : resultats_question → question_active suivante OU podium
//   { action: 'close' }    : podium (ou autre) → terminee
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const body = await request.json();
  const action = body.action as 'start' | 'stop' | 'next' | 'close';
  if (!['start', 'stop', 'next', 'close'].includes(action)) {
    return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  }

  const { data: session } = await supabase
    .from('quiz_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  if (session.created_by !== username && request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  // Liste ordonnée des questions du quiz
  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('id, ordre')
    .eq('quiz_id', session.quiz_id)
    .order('ordre', { ascending: true });

  const total = (questions || []).length;
  if (total === 0) {
    return NextResponse.json({ error: 'Le quiz ne contient aucune question' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (action === 'start') {
    if (session.statut !== 'lobby') {
      return NextResponse.json({ error: 'La session n\'est pas en lobby' }, { status: 409 });
    }
    updates.statut = 'question_active';
    updates.current_question_index = 0;
    updates.current_question_id = questions![0].id;
    updates.question_started_at = new Date().toISOString();
  } else if (action === 'stop') {
    if (session.statut !== 'question_active') {
      return NextResponse.json({ error: 'Aucune question active' }, { status: 409 });
    }
    updates.statut = 'resultats_question';
  } else if (action === 'next') {
    if (session.statut !== 'resultats_question') {
      return NextResponse.json({ error: 'Affichez d\'abord les résultats' }, { status: 409 });
    }
    const nextIndex = (session.current_question_index ?? -1) + 1;
    if (nextIndex >= total) {
      updates.statut = 'podium';
      updates.current_question_id = null;
    } else {
      updates.statut = 'question_active';
      updates.current_question_index = nextIndex;
      updates.current_question_id = questions![nextIndex].id;
      updates.question_started_at = new Date().toISOString();
    }
  } else if (action === 'close') {
    updates.statut = 'terminee';
    updates.ended_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('quiz_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
