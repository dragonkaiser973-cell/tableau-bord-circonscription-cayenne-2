import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { genererPin } from '@/lib/quizScoring';

// GET — Liste les sessions de l'utilisateur (toutes statuts confondus)
export async function GET(request: NextRequest) {
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('*, quiz_quizzes(titre)')
    .eq('created_by', username)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// POST — Lance une session live à partir d'un quiz_id (génère un PIN unique)
export async function POST(request: NextRequest) {
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const body = await request.json();
  const { quiz_id, rythme } = body;
  if (!quiz_id) {
    return NextResponse.json({ error: 'quiz_id requis' }, { status: 400 });
  }

  // Vérifier que le quiz existe et appartient à l'utilisateur (ou admin)
  const { data: quiz } = await supabase
    .from('quiz_quizzes')
    .select('id, created_by, rythme')
    .eq('id', quiz_id)
    .single();

  if (!quiz) return NextResponse.json({ error: 'Quiz introuvable' }, { status: 404 });
  if (quiz.created_by !== username && request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  // Au moins une question dans le quiz
  const { count } = await supabase
    .from('quiz_questions')
    .select('*', { count: 'exact', head: true })
    .eq('quiz_id', quiz_id);
  if ((count || 0) === 0) {
    return NextResponse.json({ error: 'Le quiz ne contient aucune question' }, { status: 400 });
  }

  // Génération du PIN avec retry sur conflit (index unique partiel)
  const rythmeFinal: 'manuel' | 'auto' = rythme === 'auto' ? 'auto' : (quiz.rythme === 'auto' ? 'auto' : 'manuel');
  let session: { id: string; pin: string } | null = null;
  let lastError: string | null = null;
  for (let attempt = 0; attempt < 5 && !session; attempt++) {
    const pin = genererPin();
    const { data, error } = await supabase
      .from('quiz_sessions')
      .insert({
        quiz_id,
        pin,
        rythme: rythmeFinal,
        statut: 'lobby',
        created_by: username,
      })
      .select()
      .single();
    if (data) session = data;
    else lastError = error?.message || 'collision PIN';
  }

  if (!session) {
    return NextResponse.json({ error: lastError || 'Impossible de générer un PIN unique' }, { status: 500 });
  }

  return NextResponse.json(session, { status: 201 });
}
