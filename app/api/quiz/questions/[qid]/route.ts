import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// PATCH — Met à jour une question (énoncé, durée, points, type, ordre) et/ou
// remplace ses choix d'un coup.
//   Body : { enonce?, type?, duree_secondes?, points_base?, ordre?,
//            choix?: [{ id?, libelle, est_correct, ordre? }, ...] }
// Si `choix` est fourni, on supprime tous les choix existants et on les recrée.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ qid: string }> }) {
  const { qid } = await params;
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  // Vérifier que l'utilisateur est bien le propriétaire du quiz parent
  const { data: question } = await supabase
    .from('quiz_questions')
    .select('id, quiz_id')
    .eq('id', qid)
    .single();
  if (!question) return NextResponse.json({ error: 'Question introuvable' }, { status: 404 });

  const { data: quiz } = await supabase
    .from('quiz_quizzes')
    .select('created_by')
    .eq('id', question.quiz_id)
    .single();
  if (!quiz) return NextResponse.json({ error: 'Quiz introuvable' }, { status: 404 });
  if (quiz.created_by !== username && request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (typeof body.enonce === 'string') updates.enonce = body.enonce.trim();
  if (['qcm', 'vrai_faux', 'classement'].includes(body.type)) updates.type = body.type;
  if (Number.isFinite(body.duree_secondes)) {
    updates.duree_secondes = Math.max(5, Math.min(120, Number(body.duree_secondes)));
  }
  if (Number.isFinite(body.points_base)) {
    updates.points_base = Math.max(100, Math.min(2000, Number(body.points_base)));
  }
  if (Number.isFinite(body.ordre)) updates.ordre = Number(body.ordre);

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('quiz_questions')
      .update(updates)
      .eq('id', qid);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Remplacement intégral des choix si fourni
  if (Array.isArray(body.choix)) {
    await supabase.from('quiz_choix').delete().eq('question_id', qid);
    if (body.choix.length > 0) {
      const rows = body.choix.map((c: { libelle?: string; est_correct?: boolean; ordre?: number }, idx: number) => ({
        question_id: qid,
        ordre: Number.isFinite(c.ordre) ? Number(c.ordre) : idx,
        libelle: String(c.libelle || '').trim(),
        est_correct: !!c.est_correct,
      }));
      const { error } = await supabase.from('quiz_choix').insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  await supabase
    .from('quiz_quizzes')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', question.quiz_id);

  // Retourne la question rechargée avec ses choix
  const { data: q } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('id', qid)
    .single();
  const { data: choix } = await supabase
    .from('quiz_choix')
    .select('*')
    .eq('question_id', qid)
    .order('ordre', { ascending: true });

  return NextResponse.json({ ...q, choix: choix || [] });
}

// DELETE — Supprime la question et ses choix (cascade).
//          Réindexe ensuite les ordres des questions restantes du quiz.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ qid: string }> }) {
  const { qid } = await params;
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const { data: question } = await supabase
    .from('quiz_questions')
    .select('id, quiz_id')
    .eq('id', qid)
    .single();
  if (!question) return NextResponse.json({ error: 'Question introuvable' }, { status: 404 });

  const { data: quiz } = await supabase
    .from('quiz_quizzes')
    .select('created_by')
    .eq('id', question.quiz_id)
    .single();
  if (!quiz) return NextResponse.json({ error: 'Quiz introuvable' }, { status: 404 });
  if (quiz.created_by !== username && request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { error } = await supabase.from('quiz_questions').delete().eq('id', qid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Réindexe l'ordre des questions restantes
  const { data: restantes } = await supabase
    .from('quiz_questions')
    .select('id, ordre')
    .eq('quiz_id', question.quiz_id)
    .order('ordre', { ascending: true });
  for (let i = 0; i < (restantes || []).length; i++) {
    if (restantes![i].ordre !== i) {
      await supabase.from('quiz_questions').update({ ordre: i }).eq('id', restantes![i].id);
    }
  }

  await supabase
    .from('quiz_quizzes')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', question.quiz_id);

  return NextResponse.json({ success: true });
}
