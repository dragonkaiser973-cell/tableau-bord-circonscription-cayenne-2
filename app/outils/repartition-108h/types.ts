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
  // Identifiants annuaire — vides tant que le directeur ne s'est pas sélectionné
  // dans le dropdown. Bloquent l'export et la publication.
  ecoleId: string;
  directeurId: string;
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

/** Déduit le type d'école 108h (mater/élém) depuis le type annuaire (EEPU/EMPU/EEPR/GS). */
export function ecoleTypeToKind(annuaireType?: string | null): EcoleType {
  return annuaireType === 'EMPU' ? 'maternelle' : 'elementaire';
}

// Format renvoyé par /api/repartitions-108h (snake_case côté Supabase).
export type Repartition108hPubliee = {
  ecole_id: string;
  directeur_id: string;
  directeur_name: string;
  ecole_name: string;
  annee_n: string;
  type: EcoleType;
  selections: Record<DayKey, DaySelection>;
  periodes: Record<string, PeriodeEvent[]>;
  notes: Record<string, string>;
  periode_bounds: Record<string, { start: string; end: string }>;
  published_at: string;
  client_id?: string | null;
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

/** Returns the current school year as "YYYY-YYYY" — Aug+ starts a new year. */
export function currentSchoolYear(): string {
  const now = new Date();
  const m = now.getMonth(); // 0..11, 7 = August
  const y = now.getFullYear();
  const start = m >= 7 ? y : y - 1;
  return `${start}-${start + 1}`;
}

export function makeEmptyRepartition(id: string, anneeN = currentSchoolYear()): Repartition108h {
  const startYear = Number(anneeN.split('-')[0]) || new Date().getFullYear();
  return {
    id,
    ecoleId: '',
    directeurId: '',
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

// Convertit une publication serveur en Repartition108h locale (pour l'affichage
// en lecture seule via les composants existants).
export function publicationToRepartition(pub: Repartition108hPubliee, id: string): Repartition108h {
  const base = makeEmptyRepartition(id, pub.annee_n);
  base.ecoleId = pub.ecole_id;
  base.directeurId = pub.directeur_id;
  base.ecole = pub.ecole_name;
  base.auteur = pub.directeur_name;
  base.type = pub.type === 'maternelle' ? 'maternelle' : 'elementaire';

  const rawSel = pub.selections && typeof pub.selections === 'object' ? pub.selections : {};
  base.selections = {};
  for (const [dKey, sel] of Object.entries(rawSel)) {
    if (!sel || typeof sel !== 'object') continue;
    const slots = Math.max(1, Math.min(MAX_SLOTS_PER_DAY, Number(sel.slots) || 1));
    base.selections[dKey] = { category: sel.category, slots };
  }
  for (const k of PERIODES) {
    base.periodes[k] = Array.isArray(pub.periodes?.[k]) ? pub.periodes[k] : [];
    base.notes[k] = typeof pub.notes?.[k] === 'string' ? pub.notes[k] : '';
    const b = pub.periode_bounds?.[k];
    if (b?.start && b?.end) base.periodeBounds[k] = b;
  }
  base.updatedAt = new Date(pub.published_at).getTime();
  return base;
}

// Convertit le format local (Repartition108h) en payload API (snake_case).
export function repartitionToApiPayload(p: Repartition108h) {
  const periodes: Record<string, PeriodeEvent[]> = {};
  const notes: Record<string, string> = {};
  const periodeBounds: Record<string, { start: string; end: string }> = {};
  for (const k of PERIODES) {
    periodes[k] = p.periodes[k] || [];
    notes[k] = p.notes[k] || '';
    periodeBounds[k] = p.periodeBounds[k];
  }
  return {
    directeur_id: p.directeurId,
    ecole_id: p.ecoleId,
    directeur_name: p.auteur,
    ecole_name: p.ecole,
    annee_n: p.anneeN,
    type: p.type,
    selections: p.selections,
    periodes,
    notes,
    periode_bounds: periodeBounds,
    client_id: p.id,
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
