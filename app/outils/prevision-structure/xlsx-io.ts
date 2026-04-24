import * as XLSX from 'xlsx';
import { NIVEAUX, NiveauKey, MAX_CLASSES, Prevision, makeEmptyPrevision } from './types';

const TEMPLATE_ROW_BY_NIVEAU: Record<NiveauKey, number> = {
  TPS: 4,
  PS: 5,
  MS: 6,
  GS: 7,
  CP: 8,
  CE1: 9,
  CE2: 10,
  CM1: 11,
  CM2: 12,
  ULIS: 13,
  AUTRE: 14,
};

function cellRef(col: number, row: number) {
  return XLSX.utils.encode_cell({ c: col, r: row - 1 });
}

function numeric(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v.replace(',', '.').trim());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

const LEVEL_BY_LABEL: Record<string, NiveauKey> = NIVEAUX.reduce(
  (acc, n) => {
    acc[n.label.toLowerCase()] = n.key;
    return acc;
  },
  {} as Record<string, NiveauKey>,
);

function readString(ws: XLSX.WorkSheet, col: number, row: number): string {
  const v = ws[cellRef(col, row)]?.v;
  return typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';
}

/**
 * Read one sheet written by our extended export.
 * Layout: row 1 title, row 2 meta, row 4 column headers "Niveau | Effectif | Répartis | Reste | C1 | ..."
 */
function readExtendedSheet(ws: XLSX.WorkSheet, sheetName: string): Prevision | null {
  const headerA4 = readString(ws, 0, 4).toLowerCase();
  if (!headerA4.startsWith('niveau')) return null;

  const p = makeEmptyPrevision(crypto.randomUUID());
  const title = readString(ws, 0, 1);
  const m = title.match(/—\s*(.+)$/);
  p.ecole = (m ? m[1].trim() : sheetName).trim();

  const meta2 = readString(ws, 0, 2);
  const meta2b = readString(ws, 1, 2);
  const meta2c = readString(ws, 2, 2);
  const auteurM = [meta2, meta2b, meta2c].find((s) => /auteur/i.test(s));
  if (auteurM) p.auteur = auteurM.replace(/^.*:\s*/, '').trim();
  const anneeM = [meta2, meta2b, meta2c].find((s) => /année\s*n\s*:/i.test(s));
  if (anneeM) p.anneeN = anneeM.replace(/^.*:\s*/, '').trim();
  const nbM = [meta2, meta2b, meta2c].find((s) => /nb\s*classes/i.test(s));
  const nbFromMeta = nbM ? Number(nbM.replace(/[^0-9]/g, '')) : 0;

  let maxClassCol = 0;
  for (let c = 4; c < 4 + MAX_CLASSES; c++) {
    const h = readString(ws, c, 4);
    if (!h) break;
    maxClassCol = c;
  }
  const nbClasses = Math.max(1, Math.min(MAX_CLASSES, nbFromMeta || maxClassCol - 3));
  p.nbClasses = nbClasses;

  for (let r = 5; r <= 15; r++) {
    const label = readString(ws, 0, r).toLowerCase();
    if (!label) continue;
    const key = LEVEL_BY_LABEL[label];
    if (!key) continue;
    p.effectifs[key] = numeric(ws[cellRef(1, r)]?.v);
    for (let c = 0; c < nbClasses; c++) {
      const col = 4 + c;
      p.repartition[key][c] = numeric(ws[cellRef(col, r)]?.v);
    }
  }

  return p;
}

/**
 * Read the official circo Excel template.
 * The template has 15 class columns (G..U = col 6..20) and 11 levels (rows 4..14).
 * Each school is in its own sheet.
 */
function readTemplateSheet(ws: XLSX.WorkSheet, sheetName: string): Prevision {
  const ecoleCell = ws[cellRef(0, 1)];
  const nbClassesCell = ws[cellRef(2, 3)];
  const nbClasses = Math.max(1, Math.min(MAX_CLASSES, Math.round(numeric(nbClassesCell?.v))));
  const rawName =
    typeof ecoleCell?.v === 'string' && ecoleCell.v.trim().length > 0
      ? ecoleCell.v.trim()
      : sheetName;

  const p = makeEmptyPrevision(crypto.randomUUID());
  p.ecole = rawName;
  p.nbClasses = nbClasses || 1;

  for (const n of NIVEAUX) {
    const row = TEMPLATE_ROW_BY_NIVEAU[n.key];
    const effCell = ws[cellRef(3, row)];
    p.effectifs[n.key] = numeric(effCell?.v);

    for (let c = 0; c < Math.min(15, nbClasses); c++) {
      const col = 6 + c;
      const cell = ws[cellRef(col, row)];
      p.repartition[n.key][c] = numeric(cell?.v);
    }
  }
  return p;
}

export async function importFromTemplate(file: File): Promise<Prevision[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const previsions: Prevision[] = [];

  for (const sheetName of wb.SheetNames) {
    if (/^AIDE$/i.test(sheetName)) continue;
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const extended = readExtendedSheet(ws, sheetName);
    previsions.push(extended ?? readTemplateSheet(ws, sheetName));
  }

  if (previsions.length === 0) throw new Error('Aucune feuille exploitable.');
  return previsions;
}

/**
 * Export as an extended .xlsx — 35 class columns.
 * Not identical to the circo template but readable by any spreadsheet.
 */
export function exportToXlsx(previsions: Prevision[]) {
  const wb = XLSX.utils.book_new();

  for (const p of previsions) {
    const header: (string | number)[][] = [];

    header.push([`Prévision de structure ${p.anneeN1} — ${p.ecole || 'École'}`]);
    header.push([`Auteur : ${p.auteur || '—'}`, `Année n : ${p.anneeN}`, `Nb classes : ${p.nbClasses}`]);
    header.push([]);

    const row1: (string | number)[] = ['Niveau', 'Effectif', 'Répartis', 'Reste'];
    for (let c = 0; c < p.nbClasses; c++) row1.push(`Classe ${c + 1}`);
    header.push(row1);

    for (const n of NIVEAUX) {
      const eff = p.effectifs[n.key] || 0;
      const row = p.repartition[n.key] || [];
      const reparti = row.slice(0, p.nbClasses).reduce((s, v) => s + (v || 0), 0);
      const line: (string | number)[] = [n.label, eff, reparti, eff - reparti];
      for (let c = 0; c < p.nbClasses; c++) line.push(row[c] || 0);
      header.push(line);
    }

    header.push([]);
    const totaux: (string | number)[] = ['Total classe', '', '', ''];
    const niveaux: (string | number)[] = ['Nb niveaux', '', '', ''];
    for (let c = 0; c < p.nbClasses; c++) {
      let tot = 0;
      let nn = 0;
      for (const n of NIVEAUX) {
        const v = p.repartition[n.key][c] || 0;
        if (v > 0) {
          tot += v;
          nn += 1;
        }
      }
      totaux.push(tot);
      niveaux.push(nn);
    }
    header.push(totaux);
    header.push(niveaux);

    header.push([]);
    header.push(['Commentaires positifs']);
    header.push([p.commPositifs || '']);
    header.push(['Commentaires négatifs']);
    header.push([p.commNegatifs || '']);

    const ws = XLSX.utils.aoa_to_sheet(header);
    ws['!cols'] = [
      { wch: 14 },
      { wch: 10 },
      { wch: 10 },
      { wch: 8 },
      ...Array.from({ length: p.nbClasses }, () => ({ wch: 9 })),
    ];

    const safeName = (p.ecole || 'Ecole').slice(0, 28).replace(/[\[\]\*\/\\\?:]/g, '_');
    XLSX.utils.book_append_sheet(wb, ws, safeName || `Ecole`);
  }

  const fname = `previsions_structure_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fname);
}
