import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET — Liste tous les questionnaires (public: actifs seulement / admin: tous)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const admin = searchParams.get('admin') === 'true';
  const id = searchParams.get('id');

  // Récupérer un questionnaire avec ses questions
  if (id) {
    const { data: questionnaire, error } = await supabase
      .from('questionnaires')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !questionnaire) {
      return NextResponse.json({ error: 'Questionnaire non trouvé' }, { status: 404 });
    }

    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('questionnaire_id', id)
      .order('ordre');

    // Compter les soumissions
    const { count } = await supabase
      .from('soumissions')
      .select('*', { count: 'exact', head: true })
      .eq('questionnaire_id', id);

    return NextResponse.json({ ...questionnaire, questions: questions || [], nb_reponses: count || 0 });
  }

  // Liste
  let query = supabase
    .from('questionnaires')
    .select('*')
    .order('created_at', { ascending: false });

  if (!admin) {
    query = query.eq('statut', 'actif');
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Ajouter le nb de réponses pour chaque questionnaire
  const questionnairesAvecNb = await Promise.all(
    (data || []).map(async (q) => {
      const { count } = await supabase
        .from('soumissions')
        .select('*', { count: 'exact', head: true })
        .eq('questionnaire_id', q.id);
      return { ...q, nb_reponses: count || 0 };
    })
  );

  return NextResponse.json(questionnairesAvecNb);
}

// POST — Créer un questionnaire (admin) ou dupliquer (?action=duplicate&id=...)
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const username = request.headers.get('x-username') || 'admin';

  // ── Duplication ──
  if (action === 'duplicate') {
    const sourceId = searchParams.get('id');
    if (!sourceId) return NextResponse.json({ error: 'ID source requis' }, { status: 400 });

    const { data: source, error: errSrc } = await supabase
      .from('questionnaires').select('*').eq('id', sourceId).single();
    if (errSrc || !source) return NextResponse.json({ error: 'Questionnaire source introuvable' }, { status: 404 });

    const { data: srcQuestions } = await supabase
      .from('questions').select('*').eq('questionnaire_id', sourceId).order('ordre');

    const { data: clone, error: errClone } = await supabase
      .from('questionnaires')
      .insert({
        titre: `${source.titre} (copie)`,
        description: source.description,
        statut: 'brouillon',
        date_debut: source.date_debut,
        date_fin: source.date_fin,
        created_by: username,
        updated_at: new Date().toISOString()
      })
      .select().single();
    if (errClone) return NextResponse.json({ error: errClone.message }, { status: 500 });

    if (srcQuestions && srcQuestions.length > 0) {
      const questionsAInserer = srcQuestions.map((q: any, idx: number) => ({
        questionnaire_id: clone.id,
        ordre: idx,
        type: q.type,
        libelle: q.libelle,
        aide: q.aide,
        obligatoire: q.obligatoire,
        options: q.options,
        config: q.config
      }));
      await supabase.from('questions').insert(questionsAInserer);
    }

    return NextResponse.json({ success: true, id: clone.id });
  }

  const body = await request.json();
  const { titre, description, statut, date_debut, date_fin, questions } = body;

  if (!titre) {
    return NextResponse.json({ error: 'Titre requis' }, { status: 400 });
  }

  // Créer le questionnaire
  const { data: questionnaire, error } = await supabase
    .from('questionnaires')
    .insert({
      titre,
      description: description || null,
      statut: statut || 'brouillon',
      date_debut: date_debut || null,
      date_fin: date_fin || null,
      created_by: username,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Créer les questions si fournies
  if (questions && questions.length > 0) {
    const questionsAInserer = questions.map((q: any, idx: number) => ({
      questionnaire_id: questionnaire.id,
      ordre: idx,
      type: q.type,
      libelle: q.libelle,
      aide: q.aide || null,
      obligatoire: q.obligatoire !== false,
      options: q.options || null,
      config: q.config || null
    }));

    await supabase.from('questions').insert(questionsAInserer);
  }

  return NextResponse.json({ success: true, id: questionnaire.id });
}

// PUT — Modifier un questionnaire (admin)
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, titre, description, statut, date_debut, date_fin, questions } = body;

  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

  // Vérifier qu'il n'y a pas de réponses si on modifie les questions
  if (questions) {
    const { count } = await supabase
      .from('soumissions')
      .select('*', { count: 'exact', head: true })
      .eq('questionnaire_id', id);

    if ((count || 0) > 0) {
      return NextResponse.json(
        { error: 'Impossible de modifier les questions d\'un questionnaire ayant déjà des réponses' },
        { status: 400 }
      );
    }

    // Supprimer et recréer les questions
    await supabase.from('questions').delete().eq('questionnaire_id', id);

    const questionsAInserer = questions.map((q: any, idx: number) => ({
      questionnaire_id: id,
      ordre: idx,
      type: q.type,
      libelle: q.libelle,
      aide: q.aide || null,
      obligatoire: q.obligatoire !== false,
      options: q.options || null,
      config: q.config || null
    }));

    await supabase.from('questions').insert(questionsAInserer);
  }

  const { error } = await supabase
    .from('questionnaires')
    .update({
      titre,
      description: description || null,
      statut,
      date_debut: date_debut || null,
      date_fin: date_fin || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// DELETE — Supprimer un questionnaire (admin)
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

  const { error } = await supabase.from('questionnaires').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
