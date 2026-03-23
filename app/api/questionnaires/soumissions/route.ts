import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST — Soumettre une réponse (public)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { questionnaire_id, repondant_nom, session_id, reponses } = body;

  if (!questionnaire_id || !reponses) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
  }

  // Vérifier que le questionnaire est actif
  const { data: questionnaire } = await supabase
    .from('questionnaires')
    .select('statut, date_debut, date_fin')
    .eq('id', questionnaire_id)
    .single();

  if (!questionnaire || questionnaire.statut !== 'actif') {
    return NextResponse.json({ error: 'Ce questionnaire n\'est pas disponible' }, { status: 400 });
  }

  const now = new Date();
  if (questionnaire.date_debut && new Date(questionnaire.date_debut) > now) {
    return NextResponse.json({ error: 'Ce questionnaire n\'est pas encore ouvert' }, { status: 400 });
  }
  if (questionnaire.date_fin && new Date(questionnaire.date_fin) < now) {
    return NextResponse.json({ error: 'Ce questionnaire est expiré' }, { status: 400 });
  }

  // Vérifier doublon par session_id
  if (session_id) {
    const { data: existing } = await supabase
      .from('soumissions')
      .select('id')
      .eq('questionnaire_id', questionnaire_id)
      .eq('session_id', session_id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Vous avez déjà répondu à ce questionnaire' }, { status: 400 });
    }
  }

  // Créer la soumission
  const { data: soumission, error: errSoumission } = await supabase
    .from('soumissions')
    .insert({
      questionnaire_id,
      repondant_nom: repondant_nom || null,
      session_id: session_id || null
    })
    .select()
    .single();

  if (errSoumission) {
    return NextResponse.json({ error: errSoumission.message }, { status: 500 });
  }

  // Créer les réponses
  const reponsesAInserer = Object.entries(reponses).map(([question_id, valeur]) => ({
    soumission_id: soumission.id,
    question_id,
    valeur: JSON.stringify(valeur)
  }));

  const { error: errReponses } = await supabase.from('reponses').insert(reponsesAInserer);
  if (errReponses) {
    return NextResponse.json({ error: errReponses.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// GET — Récupérer les résultats d'un questionnaire (admin)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const questionnaire_id = searchParams.get('questionnaire_id');

  if (!questionnaire_id) {
    return NextResponse.json({ error: 'questionnaire_id requis' }, { status: 400 });
  }

  // Récupérer toutes les soumissions
  const { data: soumissions } = await supabase
    .from('soumissions')
    .select('*')
    .eq('questionnaire_id', questionnaire_id)
    .order('created_at', { ascending: false });

  // Récupérer toutes les réponses
  const { data: reponses } = await supabase
    .from('reponses')
    .select('*, questions(libelle, type, options, config)')
    .in('soumission_id', (soumissions || []).map(s => s.id));

  return NextResponse.json({
    soumissions: soumissions || [],
    reponses: reponses || []
  });
}
