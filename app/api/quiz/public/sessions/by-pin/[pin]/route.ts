import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET — Vérifie qu'un PIN correspond à une session active
//        Renvoie un minimum d'infos publiques (id, statut, titre du quiz)
export async function GET(_request: NextRequest, { params }: { params: Promise<{ pin: string }> }) {
  const { pin } = await params;
  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: 'PIN invalide (6 chiffres attendus)' }, { status: 400 });
  }

  const { data: session } = await supabase
    .from('quiz_sessions')
    .select('id, statut, quiz_id')
    .eq('pin', pin)
    .neq('statut', 'terminee')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    return NextResponse.json({ error: 'Aucune session active pour ce PIN' }, { status: 404 });
  }

  const { data: quiz } = await supabase
    .from('quiz_quizzes')
    .select('titre')
    .eq('id', session.quiz_id)
    .single();

  return NextResponse.json({
    session_id: session.id,
    statut: session.statut,
    titre: quiz?.titre || 'Quiz',
  });
}
