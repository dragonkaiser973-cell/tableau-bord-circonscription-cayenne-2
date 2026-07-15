import ExcelJS from 'exceljs';
import {
  MISSIONS,
  MISSIONS_SUIVI,
  PacteAttribution,
  PacteRepartition,
  PacteSuivi,
  computeRepartitionStats,
  computeSuiviStats,
  moisLabelFromKey,
  totalHeuresLigne,
  totalParts,
} from './types';

// ─── Exports Excel de l'outil PACTE ───────────────────────────────────────────
// Reproduisent la structure des fichiers du Nuage (« Répartition pacte » et
// « Tableau de suivi pacte ») pour que l'impression reste identique au
// circuit actuel :
//   • Répartition : ligne 1 = parts attribuées (IEN), ligne 2 = parts réparties,
//     ligne 3 = école, tableau Nom/Prénom × 5 missions + « Nombre de parts ».
//   • Suivi : titre, Circonscription/École/« Mois de : », tableau Nom/Prénom/École
//     × 3 missions (heures, nombre d'élèves, niveau) + « Nombre d'heures ».
// Seule différence assumée : les lignes vides du gabarit ne sont pas émises.

const CIRCO = 'Circonscription : CAYENNE 2 ROURA';
const TEAL = 'FF0F766E';
const TEAL_LIGHT = 'FFE0F2F0';
const GRAY_LIGHT = 'FFF1F5F9';

const thin: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
};

function safeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '_').trim();
  return cleaned.slice(0, 100) || 'Pacte';
}

function triggerDownload(blob: Blob, fname: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function headerCell(cell: ExcelJS.Cell, text: string) {
  cell.value = text;
  cell.font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = thin;
}

function valueCell(cell: ExcelJS.Cell, value: ExcelJS.CellValue, opts?: { bold?: boolean; fill?: string; center?: boolean }) {
  cell.value = value;
  cell.font = { size: 10, bold: opts?.bold };
  if (opts?.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } };
  cell.alignment = { vertical: 'middle', horizontal: opts?.center === false ? 'left' : 'center' };
  cell.border = thin;
}

// ─── Bloc « répartition » (partagé entre l'export école et le récap circo) ───
// Écrit un bloc à partir de `startRow`, renvoie la ligne suivante disponible.
function writeRepartitionBlock(
  ws: ExcelJS.Worksheet,
  startRow: number,
  rep: PacteRepartition,
  attribution: PacteAttribution | null,
): number {
  const stats = computeRepartitionStats(rep, attribution);
  let r = startRow;

  // Lignes attribué / réparti (colonnes D..H = index 4..8, total en I, libellé en J).
  const rowAttr = ws.getRow(r);
  ws.mergeCells(r, 1, r, 2);
  valueCell(rowAttr.getCell(1), 'Parts attribuées (IEN)', { bold: true, fill: TEAL_LIGHT, center: false });
  MISSIONS.forEach((m, i) => valueCell(rowAttr.getCell(4 + i), stats.attribueParMission[m.key], { bold: true, fill: TEAL_LIGHT }));
  valueCell(rowAttr.getCell(9), stats.totalAttribue, { bold: true, fill: TEAL_LIGHT });
  valueCell(rowAttr.getCell(10), 'Total école attribué', { fill: TEAL_LIGHT, center: false });
  r++;

  const rowRep = ws.getRow(r);
  ws.mergeCells(r, 1, r, 2);
  valueCell(rowRep.getCell(1), 'Parts réparties', { bold: true, fill: GRAY_LIGHT, center: false });
  MISSIONS.forEach((m, i) => valueCell(rowRep.getCell(4 + i), stats.repartiParMission[m.key], { bold: true, fill: GRAY_LIGHT }));
  valueCell(rowRep.getCell(9), stats.totalReparti, { bold: true, fill: GRAY_LIGHT });
  valueCell(rowRep.getCell(10), 'Total école réparti', { fill: GRAY_LIGHT, center: false });
  r++;

  // École.
  const rowEcole = ws.getRow(r);
  rowEcole.getCell(1).value = `École : ${rep.ecole || ''}`;
  rowEcole.getCell(1).font = { bold: true, size: 11 };
  if (rep.auteur) {
    rowEcole.getCell(4).value = `Directeur·rice : ${rep.auteur}`;
    rowEcole.getCell(4).font = { size: 10, italic: true };
  }
  r++;

  // En-têtes du tableau.
  const rowHead = ws.getRow(r);
  rowHead.height = 42;
  headerCell(rowHead.getCell(1), 'Nom');
  headerCell(rowHead.getCell(2), 'Prénom');
  MISSIONS.forEach((m, i) => headerCell(rowHead.getCell(4 + i), m.label));
  headerCell(rowHead.getCell(10), 'Nombre de parts');
  r++;

  // Lignes enseignants.
  rep.lignes.forEach((l, li) => {
    const row = ws.getRow(r);
    valueCell(row.getCell(1), l.nom, { center: false });
    valueCell(row.getCell(2), l.prenom, { center: false });
    MISSIONS.forEach((m, i) => valueCell(row.getCell(4 + i), l.parts[m.key] || ''));
    valueCell(row.getCell(10), stats.totalParLigne[li] || 0, { bold: true });
    r++;
  });

  // Totaux.
  const rowTot = ws.getRow(r);
  ws.mergeCells(r, 1, r, 2);
  valueCell(rowTot.getCell(1), 'Total', { bold: true, fill: GRAY_LIGHT, center: false });
  MISSIONS.forEach((m, i) => valueCell(rowTot.getCell(4 + i), stats.repartiParMission[m.key], { bold: true, fill: GRAY_LIGHT }));
  valueCell(rowTot.getCell(10), stats.totalReparti, { bold: true, fill: GRAY_LIGHT });
  r++;

  return r;
}

function setupRepartitionColumns(ws: ExcelJS.Worksheet) {
  ws.columns = [
    { width: 26 }, // A Nom
    { width: 18 }, // B Prénom
    { width: 2 },  // C (séparateur, comme le fichier d'origine)
    { width: 15 }, // D..H missions
    { width: 22 },
    { width: 15 },
    { width: 14 },
    { width: 20 },
    { width: 8 },  // I total
    { width: 18 }, // J libellé / nombre de parts
  ];
}

// ─── Export « Répartition pacte » d'une école ─────────────────────────────────
export async function exportRepartitionXlsx(rep: PacteRepartition, attribution: PacteAttribution | null) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Répartition pacte', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  setupRepartitionColumns(ws);

  ws.mergeCells('A1:B1');
  const c1 = ws.getCell('A1');
  c1.value = CIRCO;
  c1.font = { bold: true, size: 12 };

  // Le bloc écrit son libellé « Parts attribuées » fusionné sur A:B — il doit
  // donc commencer sous le titre circo (déjà fusionné sur A1:B1), sinon ExcelJS
  // refuse la double fusion et l'export échoue.
  writeRepartitionBlock(ws, 2, rep, attribution);

  const buf = await wb.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${safeFilename(`Répartition pacte ${rep.anneeN} ${rep.ecole}`)}.xlsx`,
  );
}

// ─── Export « Tableau de suivi pacte » d'une école pour un mois ───────────────
export async function exportSuiviXlsx(suivi: PacteSuivi) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Suivi pacte', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  // Colonnes du gabarit d'origine : A Nom, B Prénom, C École, puis par mission
  // suivie [heures | nb élèves | niveau] avec une colonne vide de séparation,
  // et le total d'heures en dernière colonne.
  ws.columns = [
    { width: 24 }, // A Nom
    { width: 16 }, // B Prénom
    { width: 22 }, // C École
    { width: 2 },  // D
    { width: 18 }, { width: 10 }, { width: 10 }, // E F G soutien
    { width: 2 },  // H
    { width: 18 }, { width: 10 }, { width: 10 }, // I J K stage
    { width: 2 },  // L
    { width: 18 }, { width: 10 }, { width: 10 }, // M N O appui
    { width: 2 },  // P
    { width: 12 }, // Q total heures
  ];
  const MISSION_COLS = [5, 9, 13]; // E, I, M
  const TOTAL_COL = 17; // Q

  ws.mergeCells('B1:E1');
  const title = ws.getCell('B1');
  title.value = 'TABLEAU DE SUIVI PACTE';
  title.font = { bold: true, size: 14, color: { argb: TEAL } };

  ws.getCell('A2').value = 'Circonscription :';
  ws.getCell('B2').value = 'CAYENNE 2 ROURA';
  ws.getCell('A3').value = 'Ecole :';
  ws.getCell('B3').value = suivi.ecole;
  ws.getCell('A4').value = 'Mois de :';
  ws.getCell('B4').value = moisLabelFromKey(suivi.mois);
  for (const ref of ['A2', 'A3', 'A4']) ws.getCell(ref).font = { bold: true, size: 10 };
  for (const ref of ['B2', 'B3', 'B4']) ws.getCell(ref).font = { size: 10 };

  // En-têtes ligne 6.
  const head = ws.getRow(6);
  head.height = 42;
  headerCell(head.getCell(1), 'Nom');
  headerCell(head.getCell(2), 'Prénom');
  headerCell(head.getCell(3), 'Ecole');
  MISSIONS_SUIVI.forEach((m, i) => {
    const col = MISSION_COLS[i];
    headerCell(head.getCell(col), m.label);
    headerCell(head.getCell(col + 1), "Nombre d'élèves");
    headerCell(head.getCell(col + 2), 'Niveau');
  });
  headerCell(head.getCell(TOTAL_COL), "Nombre d'heures");

  let r = 7;
  for (const l of suivi.lignes) {
    const row = ws.getRow(r);
    valueCell(row.getCell(1), l.nom, { center: false });
    valueCell(row.getCell(2), l.prenom, { center: false });
    valueCell(row.getCell(3), l.ecole, { center: false });
    MISSIONS_SUIVI.forEach((m, i) => {
      const col = MISSION_COLS[i];
      const sm = l.missions[m.key];
      valueCell(row.getCell(col), sm?.heures || '');
      valueCell(row.getCell(col + 1), sm?.nbEleves || '');
      valueCell(row.getCell(col + 2), sm?.niveau || '');
    });
    valueCell(row.getCell(TOTAL_COL), totalHeuresLigne(l), { bold: true });
    r++;
  }

  // Ligne de totaux.
  const stats = computeSuiviStats(suivi);
  const rowTot = ws.getRow(r);
  ws.mergeCells(r, 1, r, 3);
  valueCell(rowTot.getCell(1), 'Total', { bold: true, fill: GRAY_LIGHT, center: false });
  MISSIONS_SUIVI.forEach((m, i) => {
    valueCell(rowTot.getCell(MISSION_COLS[i]), stats.heuresParMission[m.key], { bold: true, fill: GRAY_LIGHT });
    valueCell(rowTot.getCell(MISSION_COLS[i] + 1), '', { fill: GRAY_LIGHT });
    valueCell(rowTot.getCell(MISSION_COLS[i] + 2), '', { fill: GRAY_LIGHT });
  });
  valueCell(rowTot.getCell(TOTAL_COL), stats.totalHeures, { bold: true, fill: GRAY_LIGHT });

  const buf = await wb.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${safeFilename(`Tableau de suivi pacte ${suivi.ecole} ${suivi.mois}`)}.xlsx`,
  );
}

// ─── Export récapitulatif circonscription ────────────────────────────────────
// Reproduit le fichier racine « Répartition pacte YYYY-YYYY.xlsx » : totaux
// circo puis les blocs école empilés — généré automatiquement.
export async function exportRecapCircoXlsx(
  annee: string,
  blocs: { repartition: PacteRepartition; attribution: PacteAttribution | null }[],
) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Répartition pacte', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  setupRepartitionColumns(ws);

  // Totaux circonscription.
  const totAttr: Record<string, number> = {};
  const totRep: Record<string, number> = {};
  for (const m of MISSIONS) { totAttr[m.key] = 0; totRep[m.key] = 0; }
  for (const b of blocs) {
    const stats = computeRepartitionStats(b.repartition, b.attribution);
    for (const m of MISSIONS) {
      totAttr[m.key] += stats.attribueParMission[m.key];
      totRep[m.key] += stats.repartiParMission[m.key];
    }
  }
  const sumAll = (o: Record<string, number>) => MISSIONS.reduce((s, m) => s + o[m.key], 0);

  ws.mergeCells('A1:B1');
  const c1 = ws.getCell('A1');
  c1.value = `${CIRCO} — Répartition pacte ${annee}`;
  c1.font = { bold: true, size: 12 };

  const row1 = ws.getRow(1);
  MISSIONS.forEach((m, i) => valueCell(row1.getCell(4 + i), totAttr[m.key], { bold: true, fill: TEAL_LIGHT }));
  valueCell(row1.getCell(9), sumAll(totAttr), { bold: true, fill: TEAL_LIGHT });
  valueCell(row1.getCell(10), 'Total circo attribué', { fill: TEAL_LIGHT, center: false });

  const row2 = ws.getRow(2);
  ws.mergeCells('A2:B2');
  valueCell(row2.getCell(1), `${blocs.length} école${blocs.length > 1 ? 's' : ''} publiée${blocs.length > 1 ? 's' : ''}`, { center: false });
  MISSIONS.forEach((m, i) => valueCell(row2.getCell(4 + i), totRep[m.key], { bold: true, fill: GRAY_LIGHT }));
  valueCell(row2.getCell(9), sumAll(totRep), { bold: true, fill: GRAY_LIGHT });
  valueCell(row2.getCell(10), 'Total circo réparti', { fill: GRAY_LIGHT, center: false });

  let r = 4;
  for (const b of blocs) {
    r = writeRepartitionBlock(ws, r, b.repartition, b.attribution);
    r++; // ligne vide entre blocs
  }

  const buf = await wb.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${safeFilename(`Répartition pacte ${annee}`)}.xlsx`,
  );
}

// ─── Export récap des suivis d'un mois (toutes écoles publiées) ───────────────
export async function exportSuivisMoisXlsx(mois: string, suivis: PacteSuivi[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Suivi pacte', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.columns = [
    { width: 24 }, { width: 16 }, { width: 22 }, { width: 2 },
    { width: 18 }, { width: 10 }, { width: 10 }, { width: 2 },
    { width: 18 }, { width: 10 }, { width: 10 }, { width: 2 },
    { width: 18 }, { width: 10 }, { width: 10 }, { width: 2 },
    { width: 12 },
  ];
  const MISSION_COLS = [5, 9, 13];
  const TOTAL_COL = 17;

  ws.mergeCells('B1:E1');
  const title = ws.getCell('B1');
  title.value = `TABLEAU DE SUIVI PACTE — ${moisLabelFromKey(mois)}`;
  title.font = { bold: true, size: 14, color: { argb: TEAL } };
  ws.getCell('A2').value = 'Circonscription :';
  ws.getCell('A2').font = { bold: true, size: 10 };
  ws.getCell('B2').value = 'CAYENNE 2 ROURA';

  const head = ws.getRow(4);
  head.height = 42;
  headerCell(head.getCell(1), 'Nom');
  headerCell(head.getCell(2), 'Prénom');
  headerCell(head.getCell(3), 'Ecole');
  MISSIONS_SUIVI.forEach((m, i) => {
    const col = MISSION_COLS[i];
    headerCell(head.getCell(col), m.label);
    headerCell(head.getCell(col + 1), "Nombre d'élèves");
    headerCell(head.getCell(col + 2), 'Niveau');
  });
  headerCell(head.getCell(TOTAL_COL), "Nombre d'heures");

  let r = 5;
  let totalHeures = 0;
  for (const s of suivis) {
    for (const l of s.lignes) {
      const row = ws.getRow(r);
      valueCell(row.getCell(1), l.nom, { center: false });
      valueCell(row.getCell(2), l.prenom, { center: false });
      valueCell(row.getCell(3), l.ecole || s.ecole, { center: false });
      MISSIONS_SUIVI.forEach((m, i) => {
        const col = MISSION_COLS[i];
        const sm = l.missions[m.key];
        valueCell(row.getCell(col), sm?.heures || '');
        valueCell(row.getCell(col + 1), sm?.nbEleves || '');
        valueCell(row.getCell(col + 2), sm?.niveau || '');
      });
      const t = totalHeuresLigne(l);
      totalHeures += t;
      valueCell(row.getCell(TOTAL_COL), t, { bold: true });
      r++;
    }
  }
  const rowTot = ws.getRow(r);
  ws.mergeCells(r, 1, r, 3);
  valueCell(rowTot.getCell(1), 'Total circonscription', { bold: true, fill: GRAY_LIGHT, center: false });
  valueCell(rowTot.getCell(TOTAL_COL), totalHeures, { bold: true, fill: GRAY_LIGHT });

  const buf = await wb.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${safeFilename(`Tableau de suivi pacte circo ${mois}`)}.xlsx`,
  );
}
