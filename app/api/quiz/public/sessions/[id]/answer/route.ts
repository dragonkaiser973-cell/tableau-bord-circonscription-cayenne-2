import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculerPoints } from '@/lib/quizScoring';

// POST — Enregistre la réponse d'un participant à la question courante.
//        Calcul des points 100 % côté serveur (anti-triche).
//        Body : { participant_id, question_id, choix_id }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { participant_id, question_id, choix_id } = body;

  if (!participant_id || !question_id) {
    return NextResponse.json({ error: 'participant_id et question_id requis' }, { status: 400 });
  }

  const { data: session } = await supabase
    .from('quiz_sessions')
    .select('id, statut, current_question_id, question_started_at')
    .eq('id', id)
    .single();

  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  if (session.statut !== 'question_active') {
    return NextResponse.json({ error: 'Aucune question active' }, { status: 409 });
  }
  if (session.current_question_id !== question_id) {
    return NextResponse.json({ error: 'Question incorrecte' }, { status: 409 });
  }

  // Vérifier que le participant existe et appartient à la session
  const { data: participant } = await supabase
    .from('quiz_participants')
    .select('id, score')
    .eq('id', participant_id)
    .eq('session_id', id)
    .maybeSingle();
  if (!participant) {
    return NextResponse.json({ error: 'Participant inconnu' }, { status: 404 });
  }

  // Récupérer la question + choix pour valider et calculer
  const { data: question } = await supabase
    .from('quiz_questions')
    .select('id, duree_secondes, points_base')
    .eq('id', question_id)
    .single();
  if (!question) return NextResponse.json({ error: 'Question introuvable' }, { status: 404 });

  // Calcul du temps écoulé depuis le top de départ serveur
  const startMs = session.question_started_at
    ? new Date(session.question_started_at).getTime()
    : Date.now();
  const tempsMs = Math.max(0, Date.now() - startMs);
  const dureeMs = question.duree_secondes * 1000;

  // Hors-temps : on accepte mais 0 point
  const horsTemps = tempsMs > dureeMs + 1500; // tolérance de 1.5s

  // Si choix_id fourni, vérifier qu'il appartient bien à la question
  let estCorrect = false;
  if (choix_id) {
    const { data: choix } = await supabase
      .from('quiz_choix')
      .select('id, est_correct')
      .eq('id', choix_id)
      .eq('question_id', question_id)
      .maybeSingle();
    if (!choix) {
      return NextResponse.json({ error: 'Choix invalide' }, { status: 400 });
    }
    estCorrect = !!choix.est_correct;
  }

  const pointsGagnes = horsTemps ? 0 : calculerPoints(estCorrect, tempsMs, question.duree_secondes, question.points_base);

  // Insertion de la réponse (unique par session+question+participant)
  const { error: insertErr } = await supabase
    .from('quiz_reponses')
    .insert({
      session_id: id,
      question_id,
      participant_id,
      choix_id: choix_id || null,
      est_correct: estCorrect,
      temps_ms: tempsMs,
      points_gagnes: pointsGagnes,
    });

  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json({ error: 'Vous avez déjà répondu à cette question' }, { status: 409 });
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Mise à jour du score cumulé du participant
  if (pointsGagnes > 0) {
    await supabase
      .from('quiz_participants')
      .update({ score: participant.score + pointsGagnes })
      .eq('id', participant_id);
  }

  return NextResponse.json({
    est_correct: estCorrect,
    points_gagnes: pointsGagnes,
    score_total: participant.score + pointsGagnes,
    temps_ms: tempsMs,
  });
}
