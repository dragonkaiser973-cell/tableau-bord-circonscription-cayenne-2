import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST — Réordonne les questions d'un quiz.
//        Body : { ordre: [question_id, question_id, ...] } (ordre voulu)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
  if (!Array.isArray(body.ordre)) {
    return NextResponse.json({ error: 'ordre (tableau d\'ids) requis' }, { status: 400 });
  }

  for (let i = 0; i < body.ordre.length; i++) {
    await supabase
      .from('quiz_questions')
      .update({ ordre: i })
      .eq('id', body.ordre[i])
      .eq('quiz_id', id);
  }

  await supabase
    .from('quiz_quizzes')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ success: true });
}
