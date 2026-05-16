import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET — Vue PARTICIPANT (sans révéler les bonnes réponses).
//        Renvoie le statut, la question courante (si active) et le score du participant.
//        ?participant_id=xxx (optionnel) pour récupérer son score
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const participantId = new URL(request.url).searchParams.get('participant_id');

  const { data: session } = await supabase
    .from('quiz_sessions')
    .select('id, statut, current_question_id, current_question_index, question_started_at, rythme, quiz_id')
    .eq('id', id)
    .single();

  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });

  let participant = null;
  let aDejaRepondu = false;
  if (participantId) {
    const { data: p } = await supabase
      .from('quiz_participants')
      .select('id, pseudo, score')
      .eq('id', participantId)
      .eq('session_id', id)
      .maybeSingle();
    participant = p;

    if (p && session.current_question_id) {
      const { data: r } = await supabase
        .from('quiz_reponses')
        .select('id, est_correct, points_gagnes, choix_id')
        .eq('participant_id', participantId)
        .eq('question_id', session.current_question_id)
        .maybeSingle();
      if (r) aDejaRepondu = true;
    }
  }

  // Question courante : on strip est_correct des choix sauf si on est en phase de résultats
  let questionCourante = null;
  let bonneReponseId: string | null = null;
  if (session.current_question_id) {
    const { data: q } = await supabase
      .from('quiz_questions')
      .select('id, ordre, type, enonce, duree_secondes, points_base')
      .eq('id', session.current_question_id)
      .single();
    if (q) {
      const { data: choix } = await supabase
        .from('quiz_choix')
        .select('id, ordre, libelle, est_correct')
        .eq('question_id', q.id)
        .order('ordre', { ascending: true });

      const choixPublic = (choix || []).map(c => ({
        id: c.id,
        ordre: c.ordre,
        libelle: c.libelle,
      }));

      // Lors de la phase résultats on peut révéler la bonne réponse
      if (session.statut === 'resultats_question') {
        bonneReponseId = (choix || []).find(c => c.est_correct)?.id || null;
      }

      questionCourante = { ...q, choix: choixPublic };
    }
  }

  // Compte total de questions du quiz (utile pour afficher "Question 2/10")
  const { count: totalQuestions } = await supabase
    .from('quiz_questions')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', session.quiz_id);

  return NextResponse.json({
    session: {
      id: session.id,
      statut: session.statut,
      current_question_index: session.current_question_index,
      question_started_at: session.question_started_at,
      rythme: session.rythme,
    },
    participant,
    a_deja_repondu: aDejaRepondu,
    bonne_reponse_id: bonneReponseId,
    question: questionCourante,
    total_questions: totalQuestions || 0,
  });
}
