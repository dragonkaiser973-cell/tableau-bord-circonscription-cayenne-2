import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import ExcelJS from 'exceljs';

// GET — Export Excel (.xlsx) des résultats d'une session, multi-onglets
//        inspirés du format Kahoot.
//        Onglets : Vue d'ensemble · Classement final · Synthèse · 1 Question, 2 Question…
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const { data: session } = await supabase
    .from('quiz_sessions')
    .select('id, created_by, quiz_id, pin, rythme, created_at, ended_at, current_question_index')
    .eq('id', id)
    .single();
  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  if (session.created_by !== username && request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { data: quiz } = await supabase
    .from('quiz_quizzes')
    .select('titre, description')
    .eq('id', session.quiz_id)
    .single();

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('id, ordre, type, enonce, duree_secondes, points_base')
    .eq('quiz_id', session.quiz_id)
    .order('ordre', { ascending: true });

  const { data: choixAll } = await supabase
    .from('quiz_choix')
    .select('id, question_id, ordre, libelle, est_correct')
    .in('question_id', (questions || []).map(q => q.id))
    .order('ordre', { ascending: true });

  const { data: participants } = await supabase
    .from('quiz_participants')
    .select('id, pseudo, score, joined_at')
    .eq('session_id', id)
    .order('score', { ascending: false });

  const { data: reponses } = await supabase
    .from('quiz_reponses')
    .select('participant_id, question_id, choix_id, ordre_choisi, points_gagnes, est_correct, temps_ms')
    .eq('session_id', id);

  // ─── Index pour accès O(1) ─────────────────────────────────────────────
  type ChoixRow = { id: string; question_id: string; ordre: number; libelle: string; est_correct: boolean };
  type ReponseRow = {
    participant_id: string; question_id: string;
    choix_id: string | null; ordre_choisi: string[] | null;
    points_gagnes: number; est_correct: boolean; temps_ms: number;
  };
  const choixByQuestion: Record<string, ChoixRow[]> = {};
  for (const c of (choixAll || []) as ChoixRow[]) {
    if (!choixByQuestion[c.question_id]) choixByQuestion[c.question_id] = [];
    choixByQuestion[c.question_id].push(c);
  }
  // (participant_id, question_id) → réponse
  const idxRep: Record<string, Record<string, ReponseRow>> = {};
  for (const r of (reponses || []) as ReponseRow[]) {
    if (!idxRep[r.participant_id]) idxRep[r.participant_id] = {};
    idxRep[r.participant_id][r.question_id] = r;
  }

  // Stats par question
  const statsParQuestion = (questions || []).map(q => {
    const rs = (reponses || []).filter(r => r.question_id === q.id);
    const nbCorrect = rs.filter(r => r.est_correct).length;
    const tempsMoyen = rs.length > 0
      ? rs.reduce((acc, r) => acc + r.temps_ms, 0) / rs.length / 1000
      : 0;
    return {
      q,
      nbReponses: rs.length,
      nbCorrect,
      pctCorrect: rs.length > 0 ? (nbCorrect / rs.length) * 100 : 0,
      tempsMoyenS: tempsMoyen,
    };
  });

  // ─── Construction du workbook ──────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Tableau de bord Cayenne 2';
  wb.created = new Date();

  // Couleurs (style Kahoot mais palette Mos'a teal)
  const VIOLET = 'FF2D8BA8';        // teal foncé pour les bandeaux titre
  const VIOLET_CLAIR = 'FFE0F2F1';  // teal clair pour sous-bandeaux
  const VERT_OK = 'FF45B8A0';       // vert mint pour bonne réponse
  const ROUGE_KO = 'FFEF4444';      // rouge pour mauvaise réponse
  const BLANC = 'FFFFFFFF';
  const GRIS_CLAIR = 'FFF1F5F9';

  const styleBandeauTitre = (cell: ExcelJS.Cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VIOLET } };
    cell.font = { bold: true, color: { argb: BLANC }, size: 14 };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  };
  const styleSousBandeau = (cell: ExcelJS.Cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VIOLET_CLAIR } };
    cell.font = { bold: true, color: { argb: 'FF0F172A' }, size: 11 };
  };
  const styleEntete = (cell: ExcelJS.Cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_CLAIR } };
    cell.font = { bold: true, size: 11 };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
  };
  const styleCellOK = (cell: ExcelJS.Cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERT_OK } };
    cell.font = { bold: true, color: { argb: BLANC } };
    cell.alignment = { horizontal: 'center' };
  };
  const styleCellKO = (cell: ExcelJS.Cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ROUGE_KO } };
    cell.font = { bold: true, color: { argb: BLANC } };
    cell.alignment = { horizontal: 'center' };
  };

  // ════════════════════════════════════════════════════════════════════
  //  Onglet 1 — Vue d'ensemble
  // ════════════════════════════════════════════════════════════════════
  const wsOverview = wb.addWorksheet('Vue d\'ensemble');
  wsOverview.columns = [
    { width: 30 },
    { width: 25 },
    { width: 25 },
    { width: 25 },
  ];

  // Bandeau titre
  wsOverview.mergeCells('A1:D1');
  wsOverview.getCell('A1').value = quiz?.titre || 'Quiz';
  styleBandeauTitre(wsOverview.getCell('A1'));
  wsOverview.getRow(1).height = 30;

  const ajouteLigneInfo = (ws: ExcelJS.Worksheet, row: number, label: string, value: string | number) => {
    ws.getCell(`A${row}`).value = label;
    ws.getCell(`A${row}`).font = { bold: true };
    ws.getCell(`B${row}`).value = value;
  };

  ajouteLigneInfo(wsOverview, 2, 'Date', new Date(session.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }));
  ajouteLigneInfo(wsOverview, 3, 'Animateur', session.created_by);
  ajouteLigneInfo(wsOverview, 4, 'PIN', session.pin);
  ajouteLigneInfo(wsOverview, 5, 'Mode', session.rythme === 'auto' ? 'Auto' : 'Manuel');
  ajouteLigneInfo(wsOverview, 6, 'Participants', participants?.length || 0);
  const questionsJouees = (statsParQuestion).filter(s => s.nbReponses > 0).length;
  ajouteLigneInfo(wsOverview, 7, 'Questions jouées', `${questionsJouees} / ${questions?.length || 0}`);

  // Sous-bandeau performance globale
  wsOverview.mergeCells('A9:D9');
  wsOverview.getCell('A9').value = 'Performance globale';
  styleSousBandeau(wsOverview.getCell('A9'));

  const totalReponses = (reponses || []).length;
  const totalCorrect = (reponses || []).filter(r => r.est_correct).length;
  const pctCorrectGlobal = totalReponses > 0 ? (totalCorrect / totalReponses) * 100 : 0;
  const scoreMoyen = (participants && participants.length > 0)
    ? participants.reduce((a, p) => a + p.score, 0) / participants.length
    : 0;

  ajouteLigneInfo(wsOverview, 10, 'Bonnes réponses', `${pctCorrectGlobal.toFixed(2)} %`);
  ajouteLigneInfo(wsOverview, 11, 'Mauvaises réponses', `${(100 - pctCorrectGlobal).toFixed(2)} %`);
  ajouteLigneInfo(wsOverview, 12, 'Score moyen', Math.round(scoreMoyen));

  if (quiz?.description) {
    wsOverview.mergeCells('A14:D14');
    wsOverview.getCell('A14').value = 'Description';
    styleSousBandeau(wsOverview.getCell('A14'));
    wsOverview.mergeCells('A15:D15');
    wsOverview.getCell('A15').value = quiz.description;
    wsOverview.getCell('A15').alignment = { wrapText: true };
    wsOverview.getRow(15).height = 40;
  }

  // ════════════════════════════════════════════════════════════════════
  //  Onglet 2 — Classement final
  // ════════════════════════════════════════════════════════════════════
  const wsScores = wb.addWorksheet('Classement final');
  wsScores.columns = [
    { width: 8 },   // Rang
    { width: 25 },  // Pseudo
    { width: 15 },  // Score
    { width: 18 },  // Bonnes réponses
    { width: 18 },  // Mauvaises réponses
  ];

  wsScores.mergeCells('A1:E1');
  wsScores.getCell('A1').value = `${quiz?.titre || 'Quiz'} — Classement final`;
  styleBandeauTitre(wsScores.getCell('A1'));
  wsScores.getRow(1).height = 28;

  const enteteScores = ['Rang', 'Pseudo', 'Score total', 'Bonnes réponses', 'Mauvaises réponses'];
  enteteScores.forEach((libelle, i) => {
    const cell = wsScores.getCell(2, i + 1);
    cell.value = libelle;
    styleEntete(cell);
  });

  (participants || []).forEach((p, idx) => {
    const rs = Object.values(idxRep[p.id] || {});
    const ok = rs.filter(r => r.est_correct).length;
    const ko = rs.length - ok;
    wsScores.getRow(idx + 3).values = [idx + 1, p.pseudo, p.score, ok, ko];
  });

  // ════════════════════════════════════════════════════════════════════
  //  Onglet 3 — Synthèse (matrice participants × questions)
  // ════════════════════════════════════════════════════════════════════
  const wsSynth = wb.addWorksheet('Synthèse');
  const colsSynth: Partial<ExcelJS.Column>[] = [
    { width: 8 }, { width: 25 }, { width: 15 },
    ...(questions || []).map(() => ({ width: 9 })),
  ];
  wsSynth.columns = colsSynth;

  wsSynth.mergeCells(1, 1, 1, 3 + (questions?.length || 0));
  wsSynth.getCell('A1').value = `${quiz?.titre || 'Quiz'} — Synthèse`;
  styleBandeauTitre(wsSynth.getCell('A1'));
  wsSynth.getRow(1).height = 28;

  // En-tête
  const enteteSynth = ['Rang', 'Pseudo', 'Score total', ...(questions || []).map((_, i) => `Q${i + 1}`)];
  enteteSynth.forEach((v, i) => {
    const cell = wsSynth.getCell(2, i + 1);
    cell.value = v;
    styleEntete(cell);
    cell.alignment = { horizontal: 'center' };
  });

  // Lignes participants
  (participants || []).forEach((p, idx) => {
    const row = wsSynth.getRow(idx + 3);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = p.pseudo;
    row.getCell(3).value = p.score;
    (questions || []).forEach((q, qi) => {
      const r = idxRep[p.id]?.[q.id];
      const cell = row.getCell(4 + qi);
      if (!r) {
        cell.value = '–';
        cell.alignment = { horizontal: 'center' };
        cell.font = { color: { argb: 'FF94A3B8' } };
      } else {
        cell.value = r.points_gagnes;
        if (r.est_correct) styleCellOK(cell);
        else styleCellKO(cell);
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════
  //  Onglets 4..N — Une feuille par question
  // ════════════════════════════════════════════════════════════════════
  (questions || []).forEach((q, qi) => {
    const stats = statsParQuestion[qi];
    const ws = wb.addWorksheet(`Q${qi + 1}`);
    ws.columns = [
      { width: 30 }, { width: 50 }, { width: 18 }, { width: 12 },
    ];

    // Bandeau titre
    ws.mergeCells('A1:D1');
    ws.getCell('A1').value = `Question ${qi + 1} — ${q.enonce}`;
    styleBandeauTitre(ws.getCell('A1'));
    ws.getRow(1).height = 28;

    ajouteLigneInfo(ws, 2, 'Type', q.type === 'qcm' ? 'QCM' : q.type === 'vrai_faux' ? 'Vrai / Faux' : 'Bon ordre');
    ajouteLigneInfo(ws, 3, 'Durée', `${q.duree_secondes} s`);
    ajouteLigneInfo(ws, 4, 'Points de base', q.points_base);
    ajouteLigneInfo(ws, 5, 'Bonnes réponses', `${stats.nbCorrect} / ${stats.nbReponses} (${stats.pctCorrect.toFixed(1)} %)`);
    ajouteLigneInfo(ws, 6, 'Temps moyen', `${stats.tempsMoyenS.toFixed(1)} s`);

    // Sous-bandeau choix
    ws.mergeCells('A8:D8');
    ws.getCell('A8').value = q.type === 'classement' ? 'Items à réordonner (ordre correct)' : 'Choix';
    styleSousBandeau(ws.getCell('A8'));

    const choix = choixByQuestion[q.id] || [];
    const enteteChoix = q.type === 'classement'
      ? ['Position correcte', 'Item', '', '']
      : ['Choix', 'Libellé', 'Bonne réponse', ''];
    enteteChoix.forEach((v, i) => {
      const cell = ws.getCell(9, i + 1);
      cell.value = v;
      styleEntete(cell);
    });
    choix.forEach((c, ci) => {
      const r = ws.getRow(10 + ci);
      if (q.type === 'classement') {
        r.getCell(1).value = c.ordre + 1;
        r.getCell(2).value = c.libelle;
      } else {
        r.getCell(1).value = String.fromCharCode(65 + ci); // A, B, C, D
        r.getCell(2).value = c.libelle;
        r.getCell(3).value = c.est_correct ? '✓' : '';
        if (c.est_correct) {
          r.getCell(3).font = { bold: true, color: { argb: VERT_OK } };
          r.getCell(3).alignment = { horizontal: 'center' };
        }
      }
    });

    // Sous-bandeau réponses détaillées
    const rowDetail = 10 + choix.length + 1;
    ws.mergeCells(rowDetail, 1, rowDetail, 4);
    ws.getCell(rowDetail, 1).value = 'Réponses des participants';
    styleSousBandeau(ws.getCell(rowDetail, 1));

    const enteteDetail = ['Pseudo', 'Réponse', 'Bonne ?', 'Points'];
    enteteDetail.forEach((v, i) => {
      const cell = ws.getCell(rowDetail + 1, i + 1);
      cell.value = v;
      styleEntete(cell);
    });

    // Lignes
    let rowIdx = rowDetail + 2;
    for (const p of participants || []) {
      const r = idxRep[p.id]?.[q.id];
      const row = ws.getRow(rowIdx++);
      row.getCell(1).value = p.pseudo;
      if (!r) {
        row.getCell(2).value = '— pas de réponse —';
        row.getCell(2).font = { italic: true, color: { argb: 'FF94A3B8' } };
        row.getCell(3).value = '';
        row.getCell(4).value = 0;
      } else {
        // Description de la réponse
        let descReponse = '';
        if (q.type === 'classement' && r.ordre_choisi) {
          const noms = (r.ordre_choisi as string[])
            .map(cid => choix.find(c => c.id === cid)?.libelle || '?')
            .join(' → ');
          descReponse = noms;
        } else if (r.choix_id) {
          const c = choix.find(x => x.id === r.choix_id);
          descReponse = c?.libelle || '?';
        }
        row.getCell(2).value = descReponse;
        const cellBon = row.getCell(3);
        cellBon.value = r.est_correct ? '✓' : '✗';
        if (r.est_correct) styleCellOK(cellBon); else styleCellKO(cellBon);
        row.getCell(4).value = r.points_gagnes;
        row.getCell(4).alignment = { horizontal: 'right' };
      }
    }
  });

  // ─── Génération du buffer ──────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();

  const safeTitre = (quiz?.titre || 'quiz').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40);
  const dateIso = new Date(session.created_at).toISOString().slice(0, 10);
  const filename = `quiz_${safeTitre}_${dateIso}.xlsx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
