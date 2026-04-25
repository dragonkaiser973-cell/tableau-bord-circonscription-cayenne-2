export type CategoryKey =
  | 'concertation'
  | 'conseil-ecole'
  | 'reunion-parents'
  | 'apc'
  | 'organisation';

export type Category = {
  key: CategoryKey;
  label: string;
  shortLabel: string;
  color: string;
  textColor: string;
};

export const CATEGORIES: Category[] = [
  { key: 'concertation', label: 'Concertation', shortLabel: 'Concertation', color: '#9DC3E6', textColor: '#0F2A4A' },
  { key: 'conseil-ecole', label: "Conseil d'école", shortLabel: 'Conseil', color: '#F8CBAD', textColor: '#4A1F00' },
  { key: 'reunion-parents', label: 'Réunion parents', shortLabel: 'Parents', color: '#FFE699', textColor: '#4A3F00' },
  { key: 'apc', label: 'APC', shortLabel: 'APC', color: '#C5E0B4', textColor: '#0F4A1F' },
  { key: 'organisation', label: 'Organisation', shortLabel: 'Organisation', color: '#C55A11', textColor: '#FFFFFF' },
];

export const CATEGORY_BY_KEY: Record<CategoryKey, Category> = CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.key]: c }),
  {} as Record<CategoryKey, Category>,
);

export type EcoleType = 'maternelle' | 'elementaire';

export const HOURS_PER_SLOT: Record<EcoleType, number> = {
  elementaire: 1,
  maternelle: 0.5,
};

export const TOTAL_HOURS = 108;
// 4 slots per day (the first cell after the date number is reserved for the
// Guyane school-holiday marker, coloured in purple in the template).
export const MAX_SLOTS_PER_DAY = 4;

export type DayKey = string;

export type DaySelection = {
  category: CategoryKey;
  slots: number;
};

export type PeriodeEvent = {
  id: string;
  category: CategoryKey;
  date: string;
  objet: string;
  theme: string;
};

export type Periode = 1 | 2 | 3 | 4 | 5;
export const PERIODES: Periode[] = [1, 2, 3, 4, 5];

export type Repartition108h = {
  id: string;
  ecole: string;
  auteur: string;
  anneeN: string;
  type: EcoleType;
  selections: Record<DayKey, DaySelection>;
  periodes: Record<Periode, PeriodeEvent[]>;
  notes: Record<Periode, string>;
  periodeBounds: Record<Periode, { start: string; end: string }>;
  updatedAt: number;
};

export function dayKey(year: number, monthIdx0: number, day: number): DayKey {
  const m = String(monthIdx0 + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function parseDayKey(key: DayKey): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) - 1, day: Number(m[3]) };
}

export function defaultPeriodeBounds(anneeStartYear: number): Record<Periode, { start: string; end: string }> {
  const y0 = anneeStartYear;
  const y1 = anneeStartYear + 1;
  return {
    1: { start: `${y0}-09-01`, end: `${y0}-10-17` },
    2: { start: `${y0}-11-04`, end: `${y0}-12-19` },
    3: { start: `${y1}-01-06`, end: `${y1}-02-13` },
    4: { start: `${y1}-03-03`, end: `${y1}-04-10` },
    5: { start: `${y1}-04-28`, end: `${y1}-07-04` },
  };
}

export function makeEmptyRepartition(id: string, anneeN = '2025-2026'): Repartition108h {
  const startYear = Number(anneeN.split('-')[0]) || new Date().getFullYear();
  return {
    id,
    ecole: '',
    auteur: '',
    anneeN,
    type: 'elementaire',
    selections: {},
    periodes: { 1: [], 2: [], 3: [], 4: [], 5: [] },
    notes: { 1: '', 2: '', 3: '', 4: '', 5: '' },
    periodeBounds: defaultPeriodeBounds(startYear),
    updatedAt: Date.now(),
  };
}

export type Stats108h = {
  hoursByCategory: Record<CategoryKey, number>;
  totalHours: number;
  slotsByCategory: Record<CategoryKey, number>;
  totalSlots: number;
  daysWithSelection: number;
  hoursPerSlot: number;
  remaining: number;
};

export function computeStats(p: Repartition108h): Stats108h {
  const hoursPerSlot = HOURS_PER_SLOT[p.type];
  const slotsByCategory = CATEGORIES.reduce(
    (acc, c) => ({ ...acc, [c.key]: 0 }),
    {} as Record<CategoryKey, number>,
  );
  let totalSlots = 0;
  let daysWithSelection = 0;

  for (const sel of Object.values(p.selections)) {
    if (!sel || !sel.slots) continue;
    slotsByCategory[sel.category] = (slotsByCategory[sel.category] || 0) + sel.slots;
    totalSlots += sel.slots;
    daysWithSelection += 1;
  }

  const hoursByCategory = CATEGORIES.reduce(
    (acc, c) => ({ ...acc, [c.key]: slotsByCategory[c.key] * hoursPerSlot }),
    {} as Record<CategoryKey, number>,
  );
  const totalHours = totalSlots * hoursPerSlot;

  return {
    hoursByCategory,
    totalHours,
    slotsByCategory,
    totalSlots,
    daysWithSelection,
    hoursPerSlot,
    remaining: TOTAL_HOURS - totalHours,
  };
}

export function periodeForDate(p: Repartition108h, dateIso: string): Periode | null {
  for (const per of PERIODES) {
    const b = p.periodeBounds[per];
    if (dateIso >= b.start && dateIso <= b.end) return per;
  }
  return null;
}
