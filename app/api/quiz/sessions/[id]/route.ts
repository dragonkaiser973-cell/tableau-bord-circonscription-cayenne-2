import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET — Vue animateur complète : session + quiz + questions/choix (avec est_correct)
//        + participants triés par score + comptes de réponses par question
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const { data: session, error } = await supabase
    .from('quiz_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  }

  if (session.created_by !== username && request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { data: quiz } = await supabase
    .from('quiz_quizzes')
    .select('*')
    .eq('id', session.quiz_id)
    .single();

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', session.quiz_id)
    .order('ordre', { ascending: true });

  const questionsAvecChoix = await Promise.all(
    (questions || []).map(async (q) => {
      const { data: choix } = await supabase
        .from('quiz_choix')
        .select('*')
        .eq('question_id', q.id)
        .order('ordre', { ascending: true });
      return { ...q, choix: choix || [] };
    })
  );

  const { data: participants } = await supabase
    .from('quiz_participants')
    .select('*')
    .eq('session_id', id)
    .order('score', { ascending: false })
    .order('joined_at', { ascending: true });

  // Comptes de réponses pour la question courante (utile pour l'animateur)
  let countsByChoix: Record<string, number> = {};
  let nbReponsesQuestion = 0;
  if (session.current_question_id) {
    const { data: rs } = await supabase
      .from('quiz_reponses')
      .select('choix_id')
      .eq('session_id', id)
      .eq('question_id', session.current_question_id);
    nbReponsesQuestion = (rs || []).length;
    for (const r of rs || []) {
      const key = r.choix_id || 'null';
      countsByChoix[key] = (countsByChoix[key] || 0) + 1;
    }
  }

  return NextResponse.json({
    ...session,
    quiz,
    questions: questionsAvecChoix,
    participants: participants || [],
    counts_by_choix: countsByChoix,
    nb_reponses_question_courante: nbReponsesQuestion,
  });
}

// DELETE — Supprime une session live (cascade participants + réponses)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const { data: session } = await supabase
    .from('quiz_sessions')
    .select('created_by')
    .eq('id', id)
    .single();

  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  if (session.created_by !== username && request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { error } = await supabase.from('quiz_sessions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
