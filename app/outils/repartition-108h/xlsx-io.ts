import ExcelJS from 'exceljs';
import {
  CATEGORIES,
  CategoryKey,
  EcoleType,
  PeriodeEvent,
  Repartition108h,
  dayKey,
  makeEmptyRepartition,
} from './types';

const TEMPLATE_BY_TYPE: Record<EcoleType, string> = {
  elementaire: '/templates/108h-elementaire.xlsx',
  maternelle: '/templates/108h-maternelle.xlsx',
};

// Calendar layout per month (0=Jan..11=Dec). Row 14 = headers, rows 15..45 = days 1..31.
// Each month block: dayLabel | num | vacances | slot1 | slot2 | slot3 | slot4
// The vacances column is purple-filled by the template on Guyane school-holiday days
// and is reserved — only the 4 slot columns are user-colorable.
const MONTH_COLS: Record<number, { dayLabel: number; num: number; vacances: number; slot1: number }> = {
  8:  { dayLabel: 2,  num: 4,  vacances: 5,  slot1: 6  },  // Septembre
  9:  { dayLabel: 10, num: 11, vacances: 12, slot1: 13 },  // Octobre
  10: { dayLabel: 17, num: 18, vacances: 19, slot1: 20 },  // Novembre
  11: { dayLabel: 24, num: 25, vacances: 26, slot1: 27 },  // Décembre
  0:  { dayLabel: 32, num: 33, vacances: 34, slot1: 35 },  // Janvier
  1:  { dayLabel: 39, num: 40, vacances: 41, slot1: 42 },  // Février
  2:  { dayLabel: 46, num: 47, vacances: 48, slot1: 49 },  // Mars
  3:  { dayLabel: 53, num: 54, vacances: 55, slot1: 56 },  // Avril
  4:  { dayLabel: 60, num: 61, vacances: 62, slot1: 63 },  // Mai
  5:  { dayLabel: 67, num: 68, vacances: 69, slot1: 70 },  // Juin
  6:  { dayLabel: 74, num: 75, vacances: 76, slot1: 77 },  // Juillet
};

const MAX_SLOTS_PER_DAY_TPL = 4;

const ROW_RANGE_BY_CATEGORY: Record<CategoryKey, [number, number]> = {
  concertation: [3, 9],
  'conseil-ecole': [10, 16],
  apc: [17, 19],
  organisation: [20, 26],
  'reunion-parents': [0, -1], // not in periode tables
};

const ARGB_BY_CATEGORY: Record<CategoryKey, string> = {
  concertation: 'FF9DC3E6',
  'conseil-ecole': 'FFF8CBAD',
  'reunion-parents': 'FFFFE699',
  apc: 'FFC5E0B4',
  organisation: 'FFC55A11',
};

const CATEGORY_BY_ARGB: Record<string, CategoryKey> = Object.entries(ARGB_BY_CATEGORY).reduce(
  (acc, [key, argb]) => ({ ...acc, [argb.toUpperCase()]: key as CategoryKey }),
  {} as Record<string, CategoryKey>,
);

function safeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '_').trim();
  return cleaned.slice(0, 80) || 'Repartition-108h';
}

function safeSheetName(name: string): string {
  const cleaned = name.replace(/[[\]\\/?:*]/g, '_').trim();
  return cleaned.slice(0, 31) || 'CALCUL 108H';
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

function setSlotColor(ws: ExcelJS.Worksheet, row: number, col: number, argb: string | null) {
  const cell = ws.getRow(row).getCell(col);
  // Detach the cell's style so we don't mutate a shared template style across other cells.
  cell.style = JSON.parse(JSON.stringify(cell.style || {}));
  if (!argb) {
    cell.fill = { type: 'pattern', pattern: 'none' };
    return;
  }
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb },
    bgColor: { argb },
  };
}

const JOURS_COURTS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];

function injectDates(ws: ExcelJS.Worksheet, anneeN: string) {
  const startYear = Number((anneeN || '').split('-')[0]);
  if (!startYear) return;
  // The template merges Feb's unused day-29..day-31 cells (AM43:AS45). On leap years
  // we need day 29 to be writeable, so unmerge it first.
  try {
    (ws as unknown as { unMergeCells: (range: string) => void }).unMergeCells('AM43:AS45');
  } catch {
    /* not merged or unsupported */
  }
  for (const monthIdxStr of Object.keys(MONTH_COLS)) {
    const monthIdx0 = Number(monthIdxStr);
    const layout = MONTH_COLS[monthIdx0];
    // Sept-Dec → startYear; Jan-Jul → startYear+1
    const yr = monthIdx0 >= 8 ? startYear : startYear + 1;
    const totalDays = new Date(yr, monthIdx0 + 1, 0).getDate();
    for (let d = 1; d <= 31; d++) {
      const row = 14 + d;
      const labelCell = ws.getRow(row).getCell(layout.dayLabel);
      const numCell = ws.getRow(row).getCell(layout.num);
      labelCell.style = JSON.parse(JSON.stringify(labelCell.style || {}));
      numCell.style = JSON.parse(JSON.stringify(numCell.style || {}));
      if (d <= totalDays) {
        const wd = new Date(yr, monthIdx0, d).getDay();
        labelCell.value = JOURS_COURTS[wd];
        numCell.value = d;
      } else {
        labelCell.value = null;
        numCell.value = null;
      }
    }
  }
}

// CALCUL column V (top-left of merged V{row}:Y{row}) – row by category in the legend.
const CALCUL_ROW_BY_CATEGORY: Record<CategoryKey, number> = {
  concertation: 6,
  'conseil-ecole': 7,
  'reunion-parents': 8,
  apc: 9,
  organisation: 10,
};

function injectCalendar(ws: ExcelJS.Worksheet, p: Repartition108h) {
  // Color slots according to selections
  for (const [dKey, sel] of Object.entries(p.selections)) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dKey);
    if (!m) continue;
    const monthIdx0 = Number(m[2]) - 1;
    const day = Number(m[3]);
    const layout = MONTH_COLS[monthIdx0];
    if (!layout) continue;
    const row = 14 + day;
    const argb = ARGB_BY_CATEGORY[sel.category];
    const slots = Math.max(1, Math.min(MAX_SLOTS_PER_DAY_TPL, sel.slots || 1));
    for (let s = 0; s < slots; s++) {
      setSlotColor(ws, row, layout.slot1 + s, argb);
    }
  }
}

function injectCalcul(ws: ExcelJS.Worksheet, p: Repartition108h) {
  const hoursPerSlot = p.type === 'maternelle' ? 0.5 : 1;
  const hoursByCategory: Record<CategoryKey, number> = {
    concertation: 0,
    'conseil-ecole': 0,
    'reunion-parents': 0,
    apc: 0,
    organisation: 0,
  };
  for (const sel of Object.values(p.selections)) {
    if (!sel || !sel.slots) continue;
    hoursByCategory[sel.category] =
      (hoursByCategory[sel.category] || 0) + sel.slots * hoursPerSlot;
  }
  for (const cat of CATEGORIES) {
    const row = CALCUL_ROW_BY_CATEGORY[cat.key];
    const cell = ws.getCell(`V${row}`);
    // Detach the style so we don't mutate a shared template style.
    cell.style = JSON.parse(JSON.stringify(cell.style || {}));
    // Replace the macro formula by a static value in days (1h = 1/24).
    cell.value = hoursByCategory[cat.key] / 24;
    // Preserve the [h]"h"mm format from the template if missing.
    if (!cell.numFmt) cell.numFmt = '[h]"h"mm';
  }
}

type PeriodeRow = {
  category: CategoryKey;
  date: string; // YYYY-MM-DD
  hours: number; // 0 if unknown (manual event without calendar match)
  objet: string;
  theme: string;
};

function buildPeriodeRows(
  selections: Repartition108h['selections'],
  events: PeriodeEvent[],
  bounds: { start: string; end: string },
  hoursPerSlot: number,
): PeriodeRow[] {
  // 1. Calendar selections falling within the period bounds → auto rows.
  const rows: PeriodeRow[] = [];
  for (const [dKey, sel] of Object.entries(selections)) {
    if (!sel || !sel.slots) continue;
    if (dKey < bounds.start || dKey > bounds.end) continue;
    rows.push({
      category: sel.category,
      date: dKey,
      hours: sel.slots * hoursPerSlot,
      objet: '',
      theme: '',
    });
  }

  // 2. Overlay manual events: match by category + date and copy objet/theme.
  //    Manual events without a matching calendar row are appended (hours=0).
  const matched = new Set<number>();
  for (const ev of events) {
    if (!ev) continue;
    let foundIdx = -1;
    if (ev.date) {
      foundIdx = rows.findIndex(
        (r, i) => !matched.has(i) && r.category === ev.category && r.date === ev.date,
      );
    }
    if (foundIdx >= 0) {
      rows[foundIdx].objet = ev.objet || '';
      rows[foundIdx].theme = ev.theme || '';
      matched.add(foundIdx);
    } else if ((ev.objet && ev.objet.trim()) || (ev.theme && ev.theme.trim()) || ev.date) {
      rows.push({
        category: ev.category,
        date: ev.date || '',
        hours: 0,
        objet: ev.objet || '',
        theme: ev.theme || '',
      });
    }
  }

  // 3. Sort each category by date, then return.
  rows.sort((a, b) => {
    if (a.category !== b.category) return 0; // grouping is done at write time
    return a.date.localeCompare(b.date);
  });
  return rows;
}

function writeDateCell(ws: ExcelJS.Worksheet, row: number, dateIso: string) {
  const cell = ws.getCell(row, 9);
  cell.style = JSON.parse(JSON.stringify(cell.style || {}));
  if (!dateIso) {
    cell.value = null;
    return;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso);
  const dt = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0)
    : new Date(dateIso);
  cell.value = dt;
  cell.numFmt = 'dd/mm/yyyy';
}

function writeHoursCell(ws: ExcelJS.Worksheet, row: number, hours: number) {
  const cell = ws.getCell(row, 8);
  cell.style = JSON.parse(JSON.stringify(cell.style || {}));
  cell.value = hours > 0 ? hours / 24 : null;
  if (!cell.numFmt) cell.numFmt = '[h]"h"mm';
}

function injectPeriode(
  ws: ExcelJS.Worksheet,
  events: PeriodeEvent[],
  note: string,
  selections: Repartition108h['selections'],
  bounds: { start: string; end: string },
  hoursPerSlot: number,
) {
  const allRows = buildPeriodeRows(selections, events, bounds, hoursPerSlot);
  const byCat: Record<CategoryKey, PeriodeRow[]> = CATEGORIES.reduce(
    (acc, c) => ({ ...acc, [c.key]: [] as PeriodeRow[] }),
    {} as Record<CategoryKey, PeriodeRow[]>,
  );
  for (const r of allRows) byCat[r.category]?.push(r);

  for (const cat of CATEGORIES) {
    const range = ROW_RANGE_BY_CATEGORY[cat.key];
    if (!range || range[1] < range[0]) continue;
    const list = byCat[cat.key].sort((a, b) => a.date.localeCompare(b.date));

    // Col H is merged across the whole category block (e.g. H3:H9 for Concertation).
    // Write the period total only on the master cell (top of the range).
    const totalHours = list.reduce((s, r) => s + (r.hours || 0), 0);
    writeHoursCell(ws, range[0], totalHours);

    for (let i = 0; i < list.length && range[0] + i <= range[1]; i++) {
      const row = range[0] + i;
      const r = list[i];
      writeDateCell(ws, row, r.date);
      const objetCell = ws.getCell(row, 10);
      const themeCell = ws.getCell(row, 11);
      objetCell.style = JSON.parse(JSON.stringify(objetCell.style || {}));
      themeCell.style = JSON.parse(JSON.stringify(themeCell.style || {}));
      objetCell.value = r.objet || null;
      themeCell.value = r.theme || null;
    }

    // Clear extra rows below the data (date + objet + theme). H stays on the master cell.
    for (let row = range[0] + list.length; row <= range[1]; row++) {
      writeDateCell(ws, row, '');
      const objetCell = ws.getCell(row, 10);
      const themeCell = ws.getCell(row, 11);
      objetCell.style = JSON.parse(JSON.stringify(objetCell.style || {}));
      themeCell.style = JSON.parse(JSON.stringify(themeCell.style || {}));
      objetCell.value = null;
      themeCell.value = null;
    }
  }

  // Note placement: use a free row below the table — col F at row 28 is free
  if (note && note.trim()) {
    ws.getCell(28, 6).value = `Précisions : ${note.trim()}`;
  }
}

// ─── Calendrier natif dessiné sur chaque feuille PERIODE ─────────────────────
// Le template contient une image « appareil photo » liée au calendrier de la
// feuille CALCUL : elle reste vide (sans couleurs) une fois le fichier exporté.
// On la remplace donc par un vrai calendrier en cellules colorées, dans les
// colonnes libres A→E (le tableau THEMATIQUES occupe F→K), montrant les mois de
// la période avec les jours coloriés par catégorie et le nombre d'heures.

const CAL_MONTH_NAMES = [
  'JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
  'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE',
];

function fmtSlotHours(h: number): string {
  if (h <= 0) return '';
  if (h < 1) return `${Math.round(h * 60)}min`;
  const whole = Math.floor(h + 1e-9);
  const rem = h - whole;
  if (rem >= 0.5 - 1e-9) return `${whole}h30`;
  return `${whole}h`;
}

// Mois couverts par la période (inclusif), en {year, monthIdx0}.
function periodeMonths(bounds: { start: string; end: string } | undefined): { year: number; monthIdx0: number }[] {
  const ms = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bounds?.start || '');
  const me = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bounds?.end || '');
  if (!ms || !me) return [];
  let y = Number(ms[1]);
  let m = Number(ms[2]) - 1;
  const ey = Number(me[1]);
  const em = Number(me[2]) - 1;
  const out: { year: number; monthIdx0: number }[] = [];
  let guard = 0;
  while ((y < ey || (y === ey && m <= em)) && guard++ < 24) {
    out.push({ year: y, monthIdx0: m });
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return out;
}

const CAL_THIN = { style: 'thin' as const, color: { argb: 'FFBFBFBF' } };
const CAL_BORDER = { top: CAL_THIN, left: CAL_THIN, bottom: CAL_THIN, right: CAL_THIN };

// Dessine un mois (label "Lun. 1" en labelCol, case couleur+heures en colorCol).
// Retourne le nombre de jours écrits.
function drawCalendarMonth(
  ws: ExcelJS.Worksheet,
  p: Repartition108h,
  year: number,
  monthIdx0: number,
  headerRow: number,
  labelCol: number,
  colorCol: number,
): number {
  const daysInMonth = new Date(year, monthIdx0 + 1, 0).getDate();
  const hoursPerSlot = p.type === 'maternelle' ? 0.5 : 1;

  ws.mergeCells(headerRow, labelCol, headerRow, colorCol);
  const hc = ws.getCell(headerRow, labelCol);
  hc.value = `${CAL_MONTH_NAMES[monthIdx0]} ${year}`;
  hc.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1F3B4D' } };
  hc.alignment = { horizontal: 'center', vertical: 'middle' };
  hc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF1F5' } };
  hc.border = CAL_BORDER;
  ws.getCell(headerRow, colorCol).border = CAL_BORDER;

  for (let d = 1; d <= daysInMonth; d++) {
    const row = headerRow + d;
    const wd = new Date(year, monthIdx0, d).getDay();
    const isWE = wd === 0 || wd === 6;
    const labelCell = ws.getCell(row, labelCol);
    const colorCell = ws.getCell(row, colorCol);

    labelCell.value = `${JOURS_COURTS[wd]} ${d}`;
    labelCell.font = { name: 'Calibri', size: 8, color: { argb: isWE ? 'FF9AA0A6' : 'FF333333' } };
    labelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    labelCell.border = CAL_BORDER;
    if (isWE) labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };

    const dKey = `${year}-${String(monthIdx0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const sel = p.selections[dKey];
    colorCell.border = CAL_BORDER;
    colorCell.alignment = { horizontal: 'center', vertical: 'middle' };
    if (sel && sel.slots) {
      const argb = ARGB_BY_CATEGORY[sel.category];
      colorCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb }, bgColor: { argb } };
      colorCell.value = fmtSlotHours(sel.slots * hoursPerSlot);
      const dark = sel.category === 'organisation';
      colorCell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: dark ? 'FFFFFFFF' : 'FF1A1A1A' } };
    } else {
      colorCell.value = null;
    }
  }
  return daysInMonth;
}

function injectPeriodeCalendar(
  ws: ExcelJS.Worksheet,
  p: Repartition108h,
  bounds: { start: string; end: string } | undefined,
) {
  // Retire l'image « appareil photo » liée (vide dans l'export).
  try {
    (ws as unknown as { _media: unknown[] })._media = [];
  } catch {
    /* pas d'image ou API indisponible */
  }

  const months = periodeMonths(bounds);
  if (months.length === 0) return;

  // Largeurs des colonnes du calendrier (A..E) — le tableau démarre en F.
  ws.getColumn(1).width = 8.5; // label mois gauche
  ws.getColumn(2).width = 7;   // couleur/heures gauche
  ws.getColumn(3).width = 8.5; // label mois droit
  ws.getColumn(4).width = 7;   // couleur/heures droit
  ws.getColumn(5).width = 2;   // séparation avant le tableau

  const title = ws.getCell(1, 1);
  title.value = 'CALENDRIER DE LA PÉRIODE';
  title.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF1F3B4D' } };

  // 2 mois par bande (A-B et C-D), les bandes suivantes s'empilent en dessous.
  const BAND_GAP = 2;
  let bandTop = 2;
  for (let i = 0; i < months.length; i += 2) {
    const left = months[i];
    const right = months[i + 1];
    const dLeft = drawCalendarMonth(ws, p, left.year, left.monthIdx0, bandTop, 1, 2);
    let dRight = 0;
    if (right) dRight = drawCalendarMonth(ws, p, right.year, right.monthIdx0, bandTop, 3, 4);
    bandTop += 1 + Math.max(dLeft, dRight) + BAND_GAP;
  }
}

export async function exportRepartition(p: Repartition108h) {
  const url = TEMPLATE_BY_TYPE[p.type];
  const res = await fetch(url);
  if (!res.ok) throw new Error('Template Excel introuvable.');
  const buf = await res.arrayBuffer();

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const calc = wb.getWorksheet('CALCUL 108H');
  if (!calc) throw new Error('Feuille CALCUL 108H absente du template.');
  injectDates(calc, p.anneeN);
  injectCalendar(calc, p);
  injectCalcul(calc, p);

  if (p.ecole.trim()) {
    calc.name = safeSheetName(`108H ${p.ecole}`);
  }

  const hoursPerSlot = p.type === 'maternelle' ? 0.5 : 1;
  for (let per = 1; per <= 5; per++) {
    const ws = wb.getWorksheet(`PERIODE ${per}`);
    if (!ws) continue;
    const periodeKey = per as 1 | 2 | 3 | 4 | 5;
    injectPeriode(
      ws,
      p.periodes[periodeKey] || [],
      p.notes[periodeKey] || '',
      p.selections,
      p.periodeBounds[periodeKey],
      hoursPerSlot,
    );
    injectPeriodeCalendar(ws, p, p.periodeBounds[periodeKey]);
  }

  const out = await wb.xlsx.writeBuffer();
  const blob = new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const baseName = p.ecole.trim() || `108h ${p.type}`;
  triggerDownload(blob, `${safeFilename(baseName)} - 108h.xlsx`);
}

export async function exportAll(items: Repartition108h[]) {
  for (let i = 0; i < items.length; i++) {
    await exportRepartition(items[i]);
    if (i < items.length - 1) await new Promise((r) => setTimeout(r, 250));
  }
}

function readPeriode(ws: ExcelJS.Worksheet): { events: PeriodeEvent[]; note: string } {
  const events: PeriodeEvent[] = [];
  for (const cat of CATEGORIES) {
    const range = ROW_RANGE_BY_CATEGORY[cat.key];
    if (!range || range[1] < range[0]) continue;
    for (let r = range[0]; r <= range[1]; r++) {
      const dateCell = ws.getCell(r, 9).value;
      const objetCell = ws.getCell(r, 10).value;
      const themeCell = ws.getCell(r, 11).value;
      let dateStr = '';
      if (dateCell instanceof Date) {
        const y = dateCell.getFullYear();
        const m = String(dateCell.getMonth() + 1).padStart(2, '0');
        const d = String(dateCell.getDate()).padStart(2, '0');
        dateStr = `${y}-${m}-${d}`;
      } else if (typeof dateCell === 'string') {
        dateStr = dateCell;
      }
      const objet = typeof objetCell === 'string' ? objetCell : objetCell ? String(objetCell) : '';
      const theme = typeof themeCell === 'string' ? themeCell : themeCell ? String(themeCell) : '';
      if (dateStr || objet.trim() || theme.trim()) {
        events.push({
          id: crypto.randomUUID(),
          category: cat.key,
          date: dateStr,
          objet,
          theme,
        });
      }
    }
  }
  // Note from F28
  const noteCell = ws.getCell(28, 6).value;
  let note = '';
  if (typeof noteCell === 'string') {
    note = noteCell.replace(/^Précisions\s*:\s*/i, '').trim();
  }
  return { events, note };
}

function readCalendar(ws: ExcelJS.Worksheet): Record<string, { category: CategoryKey; slots: number }> {
  const selections: Record<string, { category: CategoryKey; slots: number }> = {};
  // Iterate months → days
  for (const [mIdxStr, layout] of Object.entries(MONTH_COLS)) {
    const monthIdx0 = Number(mIdxStr);
    for (let day = 1; day <= 31; day++) {
      const row = 14 + day;
      // Per-day: count colored slots (4 user slots) and detect their category (1 cat/day)
      const slotColors: string[] = [];
      for (let s = 0; s < MAX_SLOTS_PER_DAY_TPL; s++) {
        const cell = ws.getRow(row).getCell(layout.slot1 + s);
        const fill = cell.style?.fill;
        const argb =
          fill && fill.type === 'pattern' ? fill.fgColor?.argb : undefined;
        if (argb) slotColors.push(argb.toUpperCase());
      }
      if (slotColors.length === 0) continue;
      const matched = slotColors.find((a) => CATEGORY_BY_ARGB[a]);
      if (!matched) continue;
      const cat = CATEGORY_BY_ARGB[matched];
      const slots = slotColors.filter((a) => a === matched).length;
      // Need a year to build dayKey: assume current school year derived from sheet (we don't store year);
      // caller provides year context.
      const placeholder = `__M${monthIdx0}-${day}__`;
      selections[placeholder] = { category: cat, slots };
    }
  }
  return selections;
}

export async function importRepartition(file: File): Promise<Repartition108h[]> {
  const buf = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const out: Repartition108h[] = [];
  // Find the CALCUL sheet (template has one; may be renamed). Heuristic: first sheet whose name contains "CALCUL" or "108".
  const calc =
    wb.worksheets.find((w) => /CALCUL\s*108/i.test(w.name) || /108h/i.test(w.name)) ||
    wb.worksheets[0];
  if (!calc) throw new Error('Aucune feuille exploitable.');

  // Try to detect type from a heuristic: count cells with HALF-hour granularity in the template? Without
  // explicit type info in the file, default to elementaire.
  const item = makeEmptyRepartition(crypto.randomUUID());
  const ecoleFromName = calc.name.replace(/^108H\s+/i, '').trim();
  if (ecoleFromName && ecoleFromName !== 'CALCUL 108H') item.ecole = ecoleFromName;

  // Read calendar — placeholder selections (need year resolution)
  const placeholders = readCalendar(calc);
  // Try to infer year from the day-label column of September row 15 (e.g., "Lun." matches a known weekday for some year)
  // We don't store year in the template, so assume default from item.anneeN
  const startYear = Number(item.anneeN.split('-')[0]) || new Date().getFullYear();
  for (const [k, sel] of Object.entries(placeholders)) {
    const m = /^__M(\d+)-(\d+)__$/.exec(k);
    if (!m) continue;
    const monthIdx0 = Number(m[1]);
    const day = Number(m[2]);
    const year = monthIdx0 >= 8 ? startYear : startYear + 1;
    const dKey = dayKey(year, monthIdx0, day);
    item.selections[dKey] = sel;
  }

  // Read each PERIODE
  for (let per = 1; per <= 5; per++) {
    const ws = wb.getWorksheet(`PERIODE ${per}`);
    if (!ws) continue;
    const { events, note } = readPeriode(ws);
    item.periodes[per as 1 | 2 | 3 | 4 | 5] = events;
    item.notes[per as 1 | 2 | 3 | 4 | 5] = note;
  }

  out.push(item);
  return out;
}
