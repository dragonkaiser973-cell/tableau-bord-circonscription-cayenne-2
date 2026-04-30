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

  // Récupérer toutes les réponses (sans join pour éviter les erreurs de FK)
  const soumissionIds = (soumissions || []).map(s => s.id);
  let reponses: any[] = [];
  if (soumissionIds.length > 0) {
    const { data } = await supabase
      .from('reponses')
      .select('*')
      .in('soumission_id', soumissionIds);
    reponses = data || [];
  }

  return NextResponse.json({
    soumissions: soumissions || [],
    reponses: reponses || []
  });
}

// DELETE — Supprimer une soumission précise (?id=...) ou toutes (?questionnaire_id=...&all=true)
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const questionnaire_id = searchParams.get('questionnaire_id');
  const all = searchParams.get('all') === 'true';

  if (id) {
    await supabase.from('reponses').delete().eq('soumission_id', id);
    const { error } = await supabase.from('soumissions').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (questionnaire_id && all) {
    const { data: soumissions } = await supabase
      .from('soumissions').select('id').eq('questionnaire_id', questionnaire_id);
    const ids = (soumissions || []).map(s => s.id);
    if (ids.length > 0) {
      await supabase.from('reponses').delete().in('soumission_id', ids);
      const { error } = await supabase.from('soumissions').delete().in('id', ids);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, deleted: ids.length });
  }

  return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
}
