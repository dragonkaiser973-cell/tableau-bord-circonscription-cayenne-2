import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET — Détail d'un quiz avec ses questions et choix
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const { data: quiz, error } = await supabase
    .from('quiz_quizzes')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !quiz) {
    return NextResponse.json({ error: 'Quiz introuvable' }, { status: 404 });
  }

  if (quiz.created_by !== username && request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', id)
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

  return NextResponse.json({ ...quiz, questions: questionsAvecChoix });
}

// PATCH — Met à jour les métadonnées du quiz
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const { data: quiz } = await supabase
    .from('quiz_quizzes')
    .select('created_by')
    .eq('id', id)
    .single();

  if (!quiz) return NextResponse.json({ error: 'Quiz introuvable' }, { status: 404 });
  if (quiz.created_by !== username && request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.titre === 'string') updates.titre = body.titre.trim();
  if (typeof body.description === 'string') updates.description = body.description.trim() || null;
  if (body.rythme === 'manuel' || body.rythme === 'auto') updates.rythme = body.rythme;

  const { data, error } = await supabase
    .from('quiz_quizzes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — Supprime un quiz et tout son contenu (cascade)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const { data: quiz } = await supabase
    .from('quiz_quizzes')
    .select('created_by')
    .eq('id', id)
    .single();

  if (!quiz) return NextResponse.json({ error: 'Quiz introuvable' }, { status: 404 });
  if (quiz.created_by !== username && request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  // Refuse la suppression si une session active utilise ce quiz
  const { count } = await supabase
    .from('quiz_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', id)
    .neq('statut', 'terminee');
  if ((count || 0) > 0) {
    return NextResponse.json(
      { error: 'Impossible de supprimer : une session est en cours sur ce quiz' },
      { status: 409 }
    );
  }

  const { error } = await supabase.from('quiz_quizzes').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
