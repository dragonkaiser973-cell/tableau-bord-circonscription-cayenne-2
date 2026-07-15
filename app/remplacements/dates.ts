// ─── Helpers dates & couleurs pour la gestion des remplacements ──────────────
// Partagé entre la page live (/remplacements) et la consultation d'archive
// (/archives/consulter/remplacements).

import { getVacancesScolaires } from '@/lib/vacances-guyane';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Plage = 'journee' | 'matin' | 'apres-midi';

export interface TitulaireRemplacant {
  id: string;
  nom: string;
  ordre: number;
}

export interface Remplacement {
  id: string;
  tr_id: string;
  date_debut: string; // YYYY-MM-DD
  date_fin: string;   // YYYY-MM-DD
  plage: Plage;
  ecole_uai: string;
  ecole_nom: string;
  enseignants: string[];
}

export const PLAGE_LABELS: Record<Plage, string> = {
  journee: 'Toute la journée',
  matin: 'Matin',
  'apres-midi': 'Après-midi',
};

// ─── Mois de l'année scolaire (septembre → juillet) ──────────────────────────
// Même convention que la page 108h : indices calendaires 0-based.

export const MOIS_LABELS = [
  'Septembre', 'Octobre', 'Novembre', 'Décembre', 'Janvier', 'Février',
  'Mars', 'Avril', 'Mai', 'Juin', 'Juillet',
];
export const MOIS_INDICES = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6];

export const JOURS_COURTS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/** "2025-2026" → [2025, 2026] (fallback : année scolaire en cours). */
export function getYearsFromAnnee(annee: string): [number, number] {
  const m = /^(\d{4})-(\d{4})$/.exec(annee?.trim() || '');
  if (m) return [parseInt(m[1], 10), parseInt(m[2], 10)];
  const now = new Date();
  const y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return [y, y + 1];
}

/** Année calendaire du mois n° `moisIdx` (0 = septembre) de l'année scolaire. */
export function anneeDuMois(moisIdx: number, anneeDebut: number): number {
  return MOIS_INDICES[moisIdx] >= 8 ? anneeDebut : anneeDebut + 1;
}

export function daysInMonth(year: number, monthIdx0: number): number {
  return new Date(year, monthIdx0 + 1, 0).getDate();
}

/** Date locale → "YYYY-MM-DD" sans passage par UTC. */
export function toISO(year: number, monthIdx0: number, day: number): string {
  const mm = String(monthIdx0 + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

// ─── Vacances scolaires zone Guyane ──────────────────────────────────────────
// Dates codées en dur (même limitation assumée que app/calendrier/page.tsx) :
// à mettre à jour chaque année si le calendrier académique bouge.

export { getVacancesScolaires };
export type { PeriodeVacances } from '@/lib/vacances-guyane';

// ─── Jours fériés (France + Guyane) ──────────────────────────────────────────

/** Dimanche de Pâques (algorithme de Meeus/Butcher). */
function paques(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = mars, 4 = avril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function plusJours(date: Date, jours: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + jours);
  return d;
}

function isoOf(d: Date): string {
  return toISO(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Fériés d'une année calendaire : { "YYYY-MM-DD": libellé }. */
export function joursFeries(year: number): Record<string, string> {
  const p = paques(year);
  return {
    [`${year}-01-01`]: "Jour de l'an",
    [isoOf(plusJours(p, 1))]: 'Lundi de Pâques',
    [`${year}-05-01`]: 'Fête du travail',
    [`${year}-05-08`]: 'Victoire 1945',
    [isoOf(plusJours(p, 39))]: 'Ascension',
    [isoOf(plusJours(p, 50))]: 'Lundi de Pentecôte',
    [`${year}-06-10`]: "Abolition de l'esclavage (Guyane)",
    [`${year}-07-14`]: 'Fête nationale',
    [`${year}-08-15`]: 'Assomption',
    [`${year}-11-01`]: 'Toussaint',
    [`${year}-11-11`]: 'Armistice 1918',
    [`${year}-12-25`]: 'Noël',
  };
}

// ─── Jour non travaillé ? ─────────────────────────────────────────────────────

/**
 * Renvoie le motif ("Week-end", "Férié — Ascension", "Vacances de Noël")
 * si le jour n'est pas travaillé, sinon null.
 */
export function getJourNonTravaille(
  year: number,
  monthIdx0: number,
  day: number,
  anneeDebut: number
): string | null {
  const dow = new Date(year, monthIdx0, day).getDay();
  if (dow === 0 || dow === 6) return 'Week-end';

  const iso = toISO(year, monthIdx0, day);

  const feries = joursFeries(year);
  if (feries[iso]) return `Férié — ${feries[iso]}`;

  for (const v of getVacancesScolaires(anneeDebut)) {
    if (iso >= v.debut && iso <= v.fin) return v.nom;
  }

  return null;
}

// ─── Couleurs par école ───────────────────────────────────────────────────────
// Palette fixe de 12 couleurs contrastées. Attribution déterministe par ordre
// alphabétique du nom d'école → stable d'un affichage à l'autre.

export const ECOLE_PALETTE = [
  '#2dd4bf', // teal
  '#fbbf24', // ambre
  '#a78bfa', // violet
  '#f472b6', // rose
  '#60a5fa', // bleu
  '#a3e635', // citron vert
  '#fb923c', // orange
  '#22d3ee', // cyan
  '#f87171', // rouge
  '#4ade80', // vert
  '#e879f9', // fuchsia
  '#818cf8', // indigo
];

/**
 * Associe une couleur à chaque école présente dans les remplacements.
 * Clé = UAI, ordre alphabétique sur le nom.
 */
export function buildEcoleColors(
  remplacements: { ecole_uai: string; ecole_nom: string }[]
): Record<string, string> {
  const ecoles = new Map<string, string>();
  for (const r of remplacements) {
    if (r.ecole_uai && !ecoles.has(r.ecole_uai)) ecoles.set(r.ecole_uai, r.ecole_nom || r.ecole_uai);
  }
  const tries = [...ecoles.entries()].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  const out: Record<string, string> = {};
  tries.forEach(([uai], i) => {
    out[uai] = ECOLE_PALETTE[i % ECOLE_PALETTE.length];
  });
  return out;
}

// ─── Résolution des cases de la grille ────────────────────────────────────────

export interface CellRempl {
  /** Remplacement couvrant la journée entière (prioritaire à l'affichage). */
  journee?: Remplacement;
  matin?: Remplacement;
  apresMidi?: Remplacement;
}

/** Remplacements d'un TR couvrant un jour donné, ventilés par créneau. */
export function getCellRemplacements(
  remplacements: Remplacement[],
  trId: string,
  iso: string
): CellRempl {
  const cell: CellRempl = {};
  for (const r of remplacements) {
    if (r.tr_id !== trId) continue;
    if (iso < r.date_debut || iso > r.date_fin) continue;
    if (r.plage === 'journee') cell.journee = r;
    else if (r.plage === 'matin') cell.matin = r;
    else cell.apresMidi = r;
  }
  return cell;
}
