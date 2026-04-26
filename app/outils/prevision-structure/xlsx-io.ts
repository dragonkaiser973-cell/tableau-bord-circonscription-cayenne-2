import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { NIVEAUX, NiveauKey, MAX_CLASSES, Prevision, makeEmptyPrevision } from './types';

const TEMPLATE_URL = '/templates/prevision-structure-template.xlsx';
const TEMPLATE_MAX_CLASSES = 34;

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
  const ecoleC2 = ws[cellRef(2, 2)];
  const ecoleA1 = ws[cellRef(0, 1)];
  const nbClassesCell = ws[cellRef(2, 3)];
  const nbClasses = Math.max(1, Math.min(MAX_CLASSES, Math.round(numeric(nbClassesCell?.v))));
  const fromC2 = typeof ecoleC2?.v === 'string' ? ecoleC2.v.trim() : '';
  const fromA1 = typeof ecoleA1?.v === 'string' ? ecoleA1.v.trim() : '';
  const rawName = fromC2 || fromA1 || sheetName;

  const p = makeEmptyPrevision(crypto.randomUUID());
  p.ecole = rawName;
  p.nbClasses = nbClasses || 1;

  const auteurCell = ws[cellRef(7, 2)];
  if (typeof auteurCell?.v === 'string' && auteurCell.v.trim()) {
    p.auteur = auteurCell.v.trim();
  }

  for (const n of NIVEAUX) {
    const row = TEMPLATE_ROW_BY_NIVEAU[n.key];
    const effCell = ws[cellRef(3, row)];
    p.effectifs[n.key] = numeric(effCell?.v);

    for (let c = 0; c < Math.min(34, nbClasses); c++) {
      const col = 6 + c;
      const cell = ws[cellRef(col, row)];
      p.repartition[n.key][c] = numeric(cell?.v);
    }
  }
  return p;
}

function isEmptyPrevision(p: Prevision): boolean {
  for (const n of NIVEAUX) if ((p.effectifs[n.key] || 0) > 0) return false;
  const name = p.ecole.trim();
  return !name || /^(EEPU NOM ECOLE|ECOLE\s*\d+)$/i.test(name);
}

export async function importFromTemplate(file: File): Promise<Prevision[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const previsions: Prevision[] = [];

  for (const sheetName of wb.SheetNames) {
    if (/^(AIDE|Exemple)$/i.test(sheetName)) continue;
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const extended = readExtendedSheet(ws, sheetName);
    const p = extended ?? readTemplateSheet(ws, sheetName);
    if (extended || !isEmptyPrevision(p)) previsions.push(p);
  }

  if (previsions.length === 0) throw new Error('Aucune feuille exploitable.');
  return previsions;
}

function colLetter(col1: number): string {
  let n = col1;
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function injectPrevisionExcelJS(ws: ExcelJS.Worksheet, p: Prevision) {
  if (p.ecole) ws.getCell('C2').value = p.ecole;
  if (p.auteur) ws.getCell('H2').value = p.auteur;
  ws.getCell('C3').value = p.nbClasses;

  // Force a uniform visible style on every class header (G3..AN3) so we don't
  // depend on the theme color resolution which has caused some cells to render
  // invisibly in the user's Excel.
  for (let c = 0; c < TEMPLATE_MAX_CLASSES; c++) {
    const cell = ws.getCell(`${colLetter(7 + c)}3`);
    cell.style = JSON.parse(JSON.stringify(cell.style || {}));
    cell.font = {
      name: 'Aptos Narrow',
      family: 2,
      size: 10,
      bold: false,
      color: { argb: 'FF000000' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', shrinkToFit: true };
  }

  for (const n of NIVEAUX) {
    const row = TEMPLATE_ROW_BY_NIVEAU[n.key];
    ws.getCell(`C${row}`).value = n.label;
    const eff = p.effectifs[n.key] || 0;
    ws.getCell(`D${row}`).value = eff > 0 ? eff : null;
    const rep = p.repartition[n.key] || [];
    const maxCols = Math.min(TEMPLATE_MAX_CLASSES, p.nbClasses);
    for (let c = 0; c < maxCols; c++) {
      const ref = `${colLetter(7 + c)}${row}`;
      const v = rep[c] || 0;
      ws.getCell(ref).value = v > 0 ? v : null;
    }
  }

  // Replace the moyenne locale formulas (which referenced the missing defined
  // names moyloc1/2/3) with explicit OFFSET expressions wrapped in IFERROR so
  // the cells display "" while the user hasn't filled the zone bounds.
  const moyenneFormula = (anchorCol: 'B' | 'D' | 'G') =>
    `IFERROR(IF(SUM(OFFSET(G21,0,${anchorCol}28-1,1,${anchorCol}30+1-${anchorCol}28))=0,"",AVERAGE(OFFSET(G21,0,${anchorCol}28-1,1,${anchorCol}30+1-${anchorCol}28))),"")`;
  ws.getCell('C26').value = { formula: moyenneFormula('B') } as ExcelJS.CellFormulaValue;
  ws.getCell('E26').value = { formula: moyenneFormula('D') } as ExcelJS.CellFormulaValue;
  ws.getCell('H26').value = { formula: moyenneFormula('G') } as ExcelJS.CellFormulaValue;

  // Profils des classes (I18 simples, AE18 doubles, AH18 triples, AK18 autres).
  // The template formulas use COUNTIF(PlageProfils, N) which depends on the
  // PlageProfils defined name we strip on export — replace with direct values.
  let simples = 0;
  let doubles = 0;
  let triples = 0;
  let autres = 0;
  const nb = Math.max(0, Math.min(TEMPLATE_MAX_CLASSES, p.nbClasses));
  for (let c = 0; c < nb; c++) {
    let count = 0;
    for (const n of NIVEAUX) {
      const v = p.repartition[n.key]?.[c] || 0;
      if (v > 0) count++;
    }
    if (count === 1) simples++;
    else if (count === 2) doubles++;
    else if (count === 3) triples++;
    else if (count >= 4) autres++;
  }
  ws.getCell('I18').value = simples;
  ws.getCell('AE18').value = doubles;
  ws.getCell('AH18').value = triples;
  // AK18 = autres types (4+ niveaux) + classes vides (nbClasses - simples - doubles - triples - autres>=4).
  // We mirror the template formula intent (C3 - simples - doubles - triples) which
  // also catches classes with 0 levels filled.
  ws.getCell('AK18').value = nb - simples - doubles - triples;
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

function safeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '_').trim();
  return cleaned.slice(0, 80) || 'Ecole';
}

function safeSheetName(name: string): string {
  const cleaned = name.replace(/[[\]\\/?:*]/g, '_').trim();
  return cleaned.slice(0, 31) || 'École';
}

/**
 * Export into a copy of the official circo template, preserving merges, column widths,
 * formulas (reste per niveau, totaux, moyennes, écart-type), fills, borders and fonts.
 * One xlsx file per school, with the sheet renamed to the school name.
 */
export async function exportToXlsx(previsions: Prevision[]) {
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) throw new Error('Template Excel introuvable (public/templates/).');
  const buf = await res.arrayBuffer();

  for (let i = 0; i < previsions.length; i++) {
    const p = previsions[i];
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    if (!ws) throw new Error('Template invalide.');

    if (p.ecole) ws.name = safeSheetName(p.ecole);
    injectPrevisionExcelJS(ws, p);

    // Strip broken defined names so Excel doesn't display a "named range repair"
    // warning when opening the file. We drop any name with #REF! or an external
    // workbook reference like [1]Sheet.
    try {
      const dnObj = (wb as unknown as { definedNames?: { model: { name: string; ranges: string[] }[] } }).definedNames;
      if (dnObj && Array.isArray(dnObj.model)) {
        dnObj.model = dnObj.model.filter((n) =>
          n.ranges.every((r) => !/#REF|\[\d+\]/.test(r)),
        );
      }
    } catch {
      /* noop */
    }

    const out = await wb.xlsx.writeBuffer();
    const blob = new Blob([out], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const fname = `${safeFilename(p.ecole || `École ${i + 1}`)}.xlsx`;
    triggerDownload(blob, fname);

    if (i < previsions.length - 1) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
}
