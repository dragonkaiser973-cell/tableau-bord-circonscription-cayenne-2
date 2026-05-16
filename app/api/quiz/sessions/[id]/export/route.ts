import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET — Export CSV des résultats d'une session.
//        Renvoie un fichier CSV avec : pseudo, score total, puis une colonne
//        par question (points gagnés). Une ligne par participant.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const { data: session } = await supabase
    .from('quiz_sessions')
    .select('id, created_by, quiz_id, created_at')
    .eq('id', id)
    .single();
  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  if (session.created_by !== username && request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { data: quiz } = await supabase
    .from('quiz_quizzes')
    .select('titre')
    .eq('id', session.quiz_id)
    .single();

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('id, ordre, enonce')
    .eq('quiz_id', session.quiz_id)
    .order('ordre', { ascending: true });

  const { data: participants } = await supabase
    .from('quiz_participants')
    .select('id, pseudo, score, joined_at')
    .eq('session_id', id)
    .order('score', { ascending: false });

  const { data: reponses } = await supabase
    .from('quiz_reponses')
    .select('participant_id, question_id, points_gagnes, est_correct, temps_ms')
    .eq('session_id', id);

  // Construit un index participant_id → question_id → points_gagnes
  const idx: Record<string, Record<string, { pts: number; ok: boolean; ms: number }>> = {};
  for (const r of reponses || []) {
    if (!idx[r.participant_id]) idx[r.participant_id] = {};
    idx[r.participant_id][r.question_id] = {
      pts: r.points_gagnes,
      ok: r.est_correct,
      ms: r.temps_ms,
    };
  }

  // Échappement CSV : guillemets autour, doublement des guillemets internes
  const escape = (v: unknown): string => {
    const s = String(v ?? '');
    return `"${s.replace(/"/g, '""')}"`;
  };

  const headerCols = [
    'Pseudo',
    'Score total',
    'Rang',
    ...(questions || []).map((q, i) => `Q${i + 1} — ${q.enonce.slice(0, 60)}`),
  ];

  const lignes = (participants || []).map((p, rang) => {
    const row = [p.pseudo, String(p.score), String(rang + 1)];
    for (const q of questions || []) {
      const r = idx[p.id]?.[q.id];
      if (!r) row.push('—');
      else row.push(`${r.pts} (${r.ok ? '✓' : '✗'} en ${(r.ms / 1000).toFixed(1)}s)`);
    }
    return row.map(escape).join(',');
  });

  // BOM UTF-8 pour qu'Excel reconnaisse correctement les accents
  const csv = '﻿' + [headerCols.map(escape).join(','), ...lignes].join('\n');

  const safeTitre = (quiz?.titre || 'quiz').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40);
  const dateIso = new Date(session.created_at).toISOString().slice(0, 10);
  const filename = `quiz_${safeTitre}_${dateIso}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
