import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST — Duplique un quiz existant (titre + questions + choix) au profit
//        de l'utilisateur connecté. La copie a un titre suffixé « (copie) ».
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  // Lire le quiz source (les non-propriétaires peuvent dupliquer aussi)
  const { data: source } = await supabase
    .from('quiz_quizzes')
    .select('*')
    .eq('id', id)
    .single();
  if (!source) return NextResponse.json({ error: 'Quiz introuvable' }, { status: 404 });

  // Créer la copie
  const { data: copie, error: errCreate } = await supabase
    .from('quiz_quizzes')
    .insert({
      titre: `${source.titre} (copie)`,
      description: source.description,
      rythme: source.rythme,
      created_by: username,
    })
    .select()
    .single();
  if (errCreate || !copie) {
    return NextResponse.json({ error: errCreate?.message || 'Erreur duplication' }, { status: 500 });
  }

  // Copier les questions et leurs choix
  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('quiz_id', id)
    .order('ordre', { ascending: true });

  for (const q of questions || []) {
    const { data: nouvelleQ } = await supabase
      .from('quiz_questions')
      .insert({
        quiz_id: copie.id,
        ordre: q.ordre,
        type: q.type,
        enonce: q.enonce,
        duree_secondes: q.duree_secondes,
        points_base: q.points_base,
      })
      .select()
      .single();
    if (!nouvelleQ) continue;
    const { data: choix } = await supabase
      .from('quiz_choix')
      .select('*')
      .eq('question_id', q.id)
      .order('ordre', { ascending: true });
    if (choix && choix.length > 0) {
      await supabase.from('quiz_choix').insert(
        choix.map(c => ({
          question_id: nouvelleQ.id,
          ordre: c.ordre,
          libelle: c.libelle,
          est_correct: c.est_correct,
        }))
      );
    }
  }

  return NextResponse.json(copie, { status: 201 });
}
