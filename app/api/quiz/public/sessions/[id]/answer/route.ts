import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculerPoints, calculerPointsClassement } from '@/lib/quizScoring';

// POST — Enregistre la réponse d'un participant à la question courante.
//        Calcul des points 100 % côté serveur (anti-triche).
//        Body : { participant_id, question_id, choix_id }                  (qcm/vrai_faux)
//             | { participant_id, question_id, ordre_choisi: string[] }    (classement)
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { participant_id, question_id, choix_id, ordre_choisi } = body;

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

  // Récupérer la question + tous ses choix
  const { data: question } = await supabase
    .from('quiz_questions')
    .select('id, type, duree_secondes, points_base')
    .eq('id', question_id)
    .single();
  if (!question) return NextResponse.json({ error: 'Question introuvable' }, { status: 404 });

  const { data: tousLesChoix } = await supabase
    .from('quiz_choix')
    .select('id, ordre, est_correct')
    .eq('question_id', question_id)
    .order('ordre', { ascending: true });

  // Calcul du temps écoulé depuis le top de départ serveur
  const startMs = session.question_started_at
    ? new Date(session.question_started_at).getTime()
    : Date.now();
  const tempsMs = Math.max(0, Date.now() - startMs);
  const dureeMs = question.duree_secondes * 1000;

  // Hors-temps : on accepte mais 0 point
  const horsTemps = tempsMs > dureeMs + 1500; // tolérance de 1.5s

  let estCorrect = false;
  let pointsGagnes = 0;
  let ordreChoisiNormalise: string[] | null = null;

  if (question.type === 'classement') {
    if (!Array.isArray(ordre_choisi) || ordre_choisi.length === 0) {
      return NextResponse.json({ error: 'ordre_choisi (tableau d\'ids) requis' }, { status: 400 });
    }
    const validIds = new Set((tousLesChoix || []).map(c => c.id));
    const ordreValide = ordre_choisi.every((cid: unknown) => typeof cid === 'string' && validIds.has(cid));
    if (!ordreValide || ordre_choisi.length !== (tousLesChoix || []).length) {
      return NextResponse.json({ error: 'Ordre invalide (tous les items doivent être présents une fois)' }, { status: 400 });
    }
    // Vérif unicité
    if (new Set(ordre_choisi).size !== ordre_choisi.length) {
      return NextResponse.json({ error: 'Items dupliqués dans l\'ordre' }, { status: 400 });
    }
    ordreChoisiNormalise = ordre_choisi;
    const ordreCorrect = (tousLesChoix || []).slice().sort((a, b) => a.ordre - b.ordre).map(c => c.id);
    if (horsTemps) {
      pointsGagnes = 0;
    } else {
      const r = calculerPointsClassement(ordreCorrect, ordre_choisi, tempsMs, question.duree_secondes, question.points_base);
      pointsGagnes = r.points;
      estCorrect = r.nbCorrects === r.total;
    }
  } else {
    // QCM ou vrai_faux : un seul choix
    if (choix_id) {
      const choix = (tousLesChoix || []).find(c => c.id === choix_id);
      if (!choix) {
        return NextResponse.json({ error: 'Choix invalide' }, { status: 400 });
      }
      estCorrect = !!choix.est_correct;
    }
    pointsGagnes = horsTemps ? 0 : calculerPoints(estCorrect, tempsMs, question.duree_secondes, question.points_base);
  }

  // Insertion de la réponse (unique par session+question+participant)
  const { error: insertErr } = await supabase
    .from('quiz_reponses')
    .insert({
      session_id: id,
      question_id,
      participant_id,
      choix_id: question.type === 'classement' ? null : (choix_id || null),
      ordre_choisi: ordreChoisiNormalise,
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
