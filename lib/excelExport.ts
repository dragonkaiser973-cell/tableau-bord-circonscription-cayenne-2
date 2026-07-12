import ExcelJS from 'exceljs';

/**
 * Export Excel « soigné » et réutilisable pour toutes les pages du tableau de bord.
 *
 * Contrairement à l'export PDF (qui photographie le DOM), l'export Excel a besoin
 * des DONNÉES structurées. Chaque page construit une ou plusieurs feuilles
 * (`ExcelSheetDef`) à partir de ses données déjà chargées, puis appelle
 * `exportStyledExcel(nomFichier, feuilles)`.
 *
 * Mise en forme automatique : titre, sous-titre, en-tête coloré figé, filtres,
 * lignes zébrées, bordures, largeurs de colonnes, ligne de totaux optionnelle.
 */

export interface ExcelColumnDef {
  /** Libellé affiché dans l'en-tête de colonne. */
  header: string;
  /** Clé correspondante dans les objets `rows`. */
  key: string;
  /** Largeur de colonne (caractères). Auto-calculée si absente. */
  width?: number;
  /** Format numérique Excel, ex. '0', '0.0', '0%', '0.00'. */
  numFmt?: string;
  /** Alignement horizontal. */
  align?: 'left' | 'center' | 'right';
}

export interface ExcelSheetDef {
  /** Nom de l'onglet (tronqué/nettoyé à 31 caractères). */
  name: string;
  /** Grand titre au-dessus du tableau. */
  title?: string;
  /** Ligne de métadonnées (date, filtres appliqués…). */
  subtitle?: string;
  columns: ExcelColumnDef[];
  rows: Array<Record<string, unknown>>;
  /** Ligne de totaux optionnelle (valeurs par clé de colonne). */
  totalsRow?: Record<string, unknown>;
}

const BRAND = 'FF0F766E';        // teal-700 (en-tête)
const BRAND_LIGHT = 'FFCCFBF1';  // teal-100 (ligne de totaux)
const STRIPE = 'FFF1F5F9';       // slate-100 (lignes paires)
const BORDER = 'FFCBD5E1';       // slate-300
const SUBTITLE = 'FF64748B';     // slate-500

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

function thinBorder(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: BORDER } };
  return { top: side, left: side, bottom: side, right: side };
}

function sanitizeSheetName(name: string): string {
  const cleaned = (name || 'Feuille').replace(/[[\]\\/?:*]/g, ' ').trim();
  return cleaned.slice(0, 31) || 'Feuille';
}

function ensureXlsx(filename: string): string {
  return /\.xlsx$/i.test(filename) ? filename : `${filename}.xlsx`;
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

function addSheet(wb: ExcelJS.Workbook, def: ExcelSheetDef, usedNames: Set<string>) {
  // Nom d'onglet unique
  let name = sanitizeSheetName(def.name);
  let suffix = 2;
  while (usedNames.has(name.toLowerCase())) {
    name = sanitizeSheetName(`${def.name} ${suffix++}`);
  }
  usedNames.add(name.toLowerCase());

  const ws = wb.addWorksheet(name);
  const nCols = Math.max(1, def.columns.length);
  const lastCol = colLetter(nCols);

  let r = 1;

  if (def.title) {
    ws.mergeCells(`A${r}:${lastCol}${r}`);
    const c = ws.getCell(`A${r}`);
    c.value = def.title;
    c.font = { bold: true, size: 15, color: { argb: BRAND } };
    c.alignment = { vertical: 'middle', horizontal: 'left' };
    ws.getRow(r).height = 22;
    r++;
  }
  if (def.subtitle) {
    ws.mergeCells(`A${r}:${lastCol}${r}`);
    const c = ws.getCell(`A${r}`);
    c.value = def.subtitle;
    c.font = { italic: true, size: 10, color: { argb: SUBTITLE } };
    c.alignment = { vertical: 'middle', horizontal: 'left' };
    r++;
  }
  if (def.title || def.subtitle) r++; // ligne d'espacement

  // En-tête du tableau
  const headerRowIdx = r;
  const headerRow = ws.getRow(headerRowIdx);
  def.columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } };
    cell.alignment = { vertical: 'middle', horizontal: col.align || 'left', wrapText: true };
    cell.border = thinBorder();
  });
  headerRow.height = 22;
  r++;

  // Lignes de données
  def.rows.forEach((row, ri) => {
    const dataRow = ws.getRow(r);
    def.columns.forEach((col, i) => {
      const cell = dataRow.getCell(i + 1);
      const v = row[col.key];
      cell.value = (v === undefined || v === null) ? '' : (v as ExcelJS.CellValue);
      cell.alignment = { vertical: 'middle', horizontal: col.align || 'left' };
      if (col.numFmt) cell.numFmt = col.numFmt;
      cell.border = thinBorder();
      if (ri % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STRIPE } };
      }
    });
    r++;
  });

  // Ligne de totaux
  if (def.totalsRow) {
    const totalRow = ws.getRow(r);
    def.columns.forEach((col, i) => {
      const cell = totalRow.getCell(i + 1);
      const v = def.totalsRow![col.key];
      cell.value = (v === undefined || v === null)
        ? (i === 0 ? 'TOTAL' : '')
        : (v as ExcelJS.CellValue);
      cell.font = { bold: true, color: { argb: BRAND } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_LIGHT } };
      if (col.numFmt) cell.numFmt = col.numFmt;
      cell.border = thinBorder();
      cell.alignment = { vertical: 'middle', horizontal: col.align || 'left' };
    });
    r++;
  }

  // Largeurs de colonnes
  def.columns.forEach((col, i) => {
    const auto = Math.max(
      col.header.length + 4,
      ...def.rows.map(row => String(row[col.key] ?? '').length + 2),
    );
    ws.getColumn(i + 1).width = col.width || Math.max(10, Math.min(45, auto));
  });

  // Filtres + en-tête figé
  ws.autoFilter = {
    from: { row: headerRowIdx, column: 1 },
    to: { row: headerRowIdx, column: nCols },
  };
  ws.views = [{ state: 'frozen', ySplit: headerRowIdx }];
}

/**
 * Construit le classeur ExcelJS mis en forme (pur, sans dépendance navigateur).
 * Séparé de `exportStyledExcel` pour être testable côté Node.
 */
export function buildStyledWorkbook(sheets: ExcelSheetDef[]): ExcelJS.Workbook {
  if (!sheets.length) throw new Error('Aucune feuille à exporter.');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Tableau de bord - Circonscription Cayenne 2';
  wb.created = new Date();

  const usedNames = new Set<string>();
  for (const def of sheets) addSheet(wb, def, usedNames);

  return wb;
}

export async function exportStyledExcel(filename: string, sheets: ExcelSheetDef[]): Promise<void> {
  const wb = buildStyledWorkbook(sheets);
  const out = await wb.xlsx.writeBuffer();
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, ensureXlsx(filename));
}
