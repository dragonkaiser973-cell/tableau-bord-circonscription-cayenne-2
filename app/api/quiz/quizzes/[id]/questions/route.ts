import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST — Ajoute une nouvelle question (vide ou avec choix) à un quiz.
//        Body : { type, enonce, duree_secondes?, points_base?, choix?: [{libelle, est_correct?}, ...] }
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
  const type = ['qcm', 'vrai_faux', 'classement'].includes(body.type) ? body.type : 'qcm';
  const enonce = String(body.enonce || '').trim() || 'Nouvelle question';
  const dureeSecondes = Math.max(5, Math.min(120, Number(body.duree_secondes) || 20));
  const pointsBase = Math.max(100, Math.min(2000, Number(body.points_base) || 1000));

  // Détermine le prochain ordre disponible
  const { data: maxRow } = await supabase
    .from('quiz_questions')
    .select('ordre')
    .eq('quiz_id', id)
    .order('ordre', { ascending: false })
    .limit(1)
    .maybeSingle();
  const ordre = (maxRow?.ordre ?? -1) + 1;

  const { data: question, error } = await supabase
    .from('quiz_questions')
    .insert({
      quiz_id: id,
      ordre,
      type,
      enonce,
      duree_secondes: dureeSecondes,
      points_base: pointsBase,
    })
    .select()
    .single();

  if (error || !question) {
    return NextResponse.json({ error: error?.message || 'Erreur création' }, { status: 500 });
  }

  // Choix par défaut selon le type
  let choixDefauts: { libelle: string; est_correct: boolean }[] = [];
  if (Array.isArray(body.choix) && body.choix.length > 0) {
    choixDefauts = body.choix.map((c: { libelle?: string; est_correct?: boolean }) => ({
      libelle: String(c.libelle || '').trim(),
      est_correct: !!c.est_correct,
    }));
  } else if (type === 'qcm') {
    choixDefauts = [
      { libelle: 'Choix 1', est_correct: true },
      { libelle: 'Choix 2', est_correct: false },
      { libelle: 'Choix 3', est_correct: false },
      { libelle: 'Choix 4', est_correct: false },
    ];
  } else if (type === 'vrai_faux') {
    choixDefauts = [
      { libelle: 'Vrai', est_correct: true },
      { libelle: 'Faux', est_correct: false },
    ];
  } else if (type === 'classement') {
    choixDefauts = [
      { libelle: 'Élément 1', est_correct: false },
      { libelle: 'Élément 2', est_correct: false },
      { libelle: 'Élément 3', est_correct: false },
      { libelle: 'Élément 4', est_correct: false },
    ];
  }

  if (choixDefauts.length > 0) {
    await supabase.from('quiz_choix').insert(
      choixDefauts.map((c, idx) => ({
        question_id: question.id,
        ordre: idx,
        libelle: c.libelle,
        est_correct: c.est_correct,
      }))
    );
  }

  await supabase
    .from('quiz_quizzes')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id);

  // Renvoie la question + ses choix
  const { data: choix } = await supabase
    .from('quiz_choix')
    .select('*')
    .eq('question_id', question.id)
    .order('ordre', { ascending: true });

  return NextResponse.json({ ...question, choix: choix || [] }, { status: 201 });
}
