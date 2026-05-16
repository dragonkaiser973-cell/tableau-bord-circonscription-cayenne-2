import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET — Liste les quiz de l'utilisateur connecté
export async function GET(request: NextRequest) {
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const { data: quizzes, error } = await supabase
    .from('quiz_quizzes')
    .select('*')
    .eq('created_by', username)
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withCounts = await Promise.all(
    (quizzes || []).map(async (q) => {
      const { count } = await supabase
        .from('quiz_questions')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_id', q.id);
      return { ...q, nb_questions: count || 0 };
    })
  );

  return NextResponse.json(withCounts);
}

// POST — Crée un nouveau quiz (squelette vide ou avec questions imbriquées)
export async function POST(request: NextRequest) {
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const body = await request.json();
  const { titre, description, rythme, questions } = body;

  if (!titre || !titre.trim()) {
    return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
  }

  const { data: quiz, error } = await supabase
    .from('quiz_quizzes')
    .insert({
      titre: titre.trim(),
      description: description?.trim() || null,
      rythme: rythme === 'auto' ? 'auto' : 'manuel',
      created_by: username,
    })
    .select()
    .single();

  if (error || !quiz) return NextResponse.json({ error: error?.message || 'Erreur création' }, { status: 500 });

  // Insertion optionnelle des questions imbriquées
  if (Array.isArray(questions) && questions.length > 0) {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const { data: question } = await supabase
        .from('quiz_questions')
        .insert({
          quiz_id: quiz.id,
          ordre: i,
          type: q.type === 'vrai_faux' ? 'vrai_faux' : 'qcm',
          enonce: String(q.enonce || '').trim(),
          duree_secondes: Number(q.duree_secondes) || 20,
          points_base: Number(q.points_base) || 1000,
        })
        .select()
        .single();
      if (question && Array.isArray(q.choix)) {
        await supabase.from('quiz_choix').insert(
          q.choix.map((c: { libelle: string; est_correct?: boolean }, idx: number) => ({
            question_id: question.id,
            ordre: idx,
            libelle: String(c.libelle || '').trim(),
            est_correct: !!c.est_correct,
          }))
        );
      }
    }
  }

  return NextResponse.json(quiz, { status: 201 });
}
