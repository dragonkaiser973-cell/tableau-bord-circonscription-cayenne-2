// ─── Référentiel et types de l'outil PACTE ────────────────────────────────────
// Le PACTE : missions complémentaires rémunérées (1 part = 1 250 € brut/an).
// L'IEN attribue des parts par mission à chaque école (pacte_attributions) ;
// le directeur les répartit entre enseignants volontaires (pacte_repartitions)
// puis déclare mensuellement les heures effectuées (pacte_suivis).

export type MissionKey =
  | 'devoirs-faits-6e'
  | 'soutien-renforce'
  | 'stage-reussite'
  | 'harcelement'
  | 'appui-besoins-particuliers';

export type Mission = {
  key: MissionKey;
  /** Libellé complet (colonnes du fichier de répartition). */
  label: string;
  /** Libellé court pour l'UI et les tableaux compacts. */
  shortLabel: string;
  /** Mission « en présence élèves » suivie en heures dans le tableau de suivi. */
  suiviHeures: boolean;
};

export const MISSIONS: Mission[] = [
  { key: 'devoirs-faits-6e', label: 'Devoirs faits en 6e', shortLabel: 'Devoirs faits 6e', suiviHeures: false },
  {
    key: 'soutien-renforce',
    label: "Soutien renforcé aux élèves en difficulté à l'école élémentaire",
    shortLabel: 'Soutien renforcé',
    suiviHeures: true,
  },
  { key: 'stage-reussite', label: 'Stage de réussite', shortLabel: 'Stage de réussite', suiviHeures: true },
  { key: 'harcelement', label: 'Harcèlement', shortLabel: 'Harcèlement', suiviHeures: false },
  {
    key: 'appui-besoins-particuliers',
    label: "Appui à la prise en charge d'élèves à besoin particuliers",
    shortLabel: 'Appui besoins part.',
    suiviHeures: true,
  },
];

export const MISSION_BY_KEY: Record<MissionKey, Mission> = MISSIONS.reduce(
  (acc, m) => ({ ...acc, [m.key]: m }),
  {} as Record<MissionKey, Mission>,
);

export const MISSIONS_SUIVI = MISSIONS.filter((m) => m.suiviHeures);

/** Nombre de lignes enseignants du gabarit Excel (lignes 5 à 26). */
export const MAX_LIGNES = 22;

// ─── Mois de l'année scolaire (suivi mensuel) ─────────────────────────────────

export const MOIS_LABELS = [
  'Septembre', 'Octobre', 'Novembre', 'Décembre', 'Janvier', 'Février',
  'Mars', 'Avril', 'Mai', 'Juin', 'Juillet',
];
export const MOIS_INDICES = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6];

/** "2025-2026" → [2025, 2026]. */
export function getYearsFromAnnee(annee: string): [number, number] {
  const m = /^(\d{4})-(\d{4})$/.exec(annee?.trim() || '');
  if (m) return [parseInt(m[1], 10), parseInt(m[2], 10)];
  const now = new Date();
  const y = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return [y, y + 1];
}

/** Clé de mois du suivi : moisIdx (0 = septembre) → "2025-09". */
export function moisKey(moisIdx: number, anneeScolaire: string): string {
  const [debut] = getYearsFromAnnee(anneeScolaire);
  const cal = MOIS_INDICES[moisIdx];
  const year = cal >= 8 ? debut : debut + 1;
  return `${year}-${String(cal + 1).padStart(2, '0')}`;
}

/** "2025-09" → "Septembre 2025" (fallback : la clé brute). */
export function moisLabelFromKey(key: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(key || '');
  if (!m) return key || '';
  const idx = MOIS_INDICES.indexOf(parseInt(m[2], 10) - 1);
  return idx >= 0 ? `${MOIS_LABELS[idx]} ${m[1]}` : key;
}

// ─── Attributions (parts fixées par l'IEN, par école) ─────────────────────────

export type PacteAttribution = {
  ecole_id: string;
  ecole_name: string;
  annee_n: string;
  parts: Partial<Record<MissionKey, number>>;
  updated_at?: string;
};

export function totalParts(parts: Partial<Record<MissionKey, number>> | undefined): number {
  if (!parts) return 0;
  return MISSIONS.reduce((s, m) => s + (Number(parts[m.key]) || 0), 0);
}

// ─── Répartition (fiche directeur) ────────────────────────────────────────────

export type LigneRepartition = {
  nom: string;
  prenom: string;
  parts: Partial<Record<MissionKey, number>>;
};

export type PacteRepartition = {
  id: string;
  ecoleId: string;
  directeurId: string;
  ecole: string;
  auteur: string;
  anneeN: string;
  lignes: LigneRepartition[];
  updatedAt: number;
};

// Format renvoyé par /api/pacte/repartitions (snake_case côté Supabase).
export type PacteRepartitionPubliee = {
  ecole_id: string;
  directeur_id: string;
  directeur_name: string;
  ecole_name: string;
  annee_n: string;
  lignes: LigneRepartition[];
  published_at: string;
  client_id?: string | null;
};

export function makeEmptyRepartition(id: string): PacteRepartition {
  return {
    id,
    ecoleId: '',
    directeurId: '',
    ecole: '',
    auteur: '',
    anneeN: '2025-2026',
    lignes: [],
    updatedAt: Date.now(),
  };
}

function sanitizeLignes(raw: unknown): LigneRepartition[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l): l is Record<string, unknown> => !!l && typeof l === 'object')
    .slice(0, MAX_LIGNES)
    .map((l) => {
      const parts: Partial<Record<MissionKey, number>> = {};
      const rawParts = (l.parts && typeof l.parts === 'object' ? l.parts : {}) as Record<string, unknown>;
      for (const m of MISSIONS) {
        const v = Math.max(0, Math.min(99, Math.floor(Number(rawParts[m.key]) || 0)));
        if (v > 0) parts[m.key] = v;
      }
      return {
        nom: String(l.nom ?? '').trim().slice(0, 120),
        prenom: String(l.prenom ?? '').trim().slice(0, 120),
        parts,
      };
    })
    .filter((l) => l.nom || l.prenom || totalParts(l.parts) > 0);
}

export function publicationToRepartition(pub: PacteRepartitionPubliee, id: string): PacteRepartition {
  const base = makeEmptyRepartition(id);
  base.ecoleId = pub.ecole_id;
  base.directeurId = pub.directeur_id;
  base.ecole = pub.ecole_name;
  base.auteur = pub.directeur_name;
  base.anneeN = pub.annee_n;
  base.lignes = sanitizeLignes(pub.lignes);
  base.updatedAt = new Date(pub.published_at).getTime();
  return base;
}

export function repartitionToApiPayload(p: PacteRepartition) {
  return {
    directeur_id: p.directeurId,
    ecole_id: p.ecoleId,
    directeur_name: p.auteur,
    ecole_name: p.ecole,
    annee_n: p.anneeN,
    lignes: sanitizeLignes(p.lignes),
    client_id: p.id,
  };
}

export function computeRepartitionStats(p: PacteRepartition, attribution?: PacteAttribution | null) {
  const repartiParMission = {} as Record<MissionKey, number>;
  for (const m of MISSIONS) repartiParMission[m.key] = 0;
  let totalReparti = 0;
  const totalParLigne = p.lignes.map((l) => {
    let t = 0;
    for (const m of MISSIONS) {
      const v = Number(l.parts[m.key]) || 0;
      repartiParMission[m.key] += v;
      t += v;
    }
    totalReparti += t;
    return t;
  });

  const attribueParMission = {} as Record<MissionKey, number>;
  for (const m of MISSIONS) attribueParMission[m.key] = Number(attribution?.parts?.[m.key]) || 0;
  const totalAttribue = totalParts(attribution?.parts);

  const depassements = MISSIONS.filter(
    (m) => repartiParMission[m.key] > attribueParMission[m.key],
  ).map((m) => m.key);

  return {
    repartiParMission,
    attribueParMission,
    totalParLigne,
    totalReparti,
    totalAttribue,
    depassements,
    nbEnseignants: p.lignes.filter((l) => totalParts(l.parts) > 0).length,
  };
}

// ─── Suivi mensuel ────────────────────────────────────────────────────────────

export type SuiviMission = {
  heures: number;
  nbEleves: number;
  niveau: string;
};

export type LigneSuivi = {
  nom: string;
  prenom: string;
  /** École d'exercice de la mission (par défaut celle de la fiche, modifiable). */
  ecole: string;
  missions: Partial<Record<MissionKey, SuiviMission>>;
};

export type PacteSuivi = {
  ecoleId: string;
  directeurId: string;
  ecole: string;
  auteur: string;
  anneeN: string;
  /** "2025-09" */
  mois: string;
  lignes: LigneSuivi[];
  updatedAt: number;
};

export type PacteSuiviPublie = {
  ecole_id: string;
  directeur_id: string;
  directeur_name: string;
  ecole_name: string;
  annee_n: string;
  mois: string;
  lignes: LigneSuivi[];
  published_at: string;
};

export function makeEmptySuivi(ecoleId: string, mois: string): PacteSuivi {
  return {
    ecoleId,
    directeurId: '',
    ecole: '',
    auteur: '',
    anneeN: '2025-2026',
    mois,
    lignes: [],
    updatedAt: Date.now(),
  };
}

export function sanitizeLignesSuivi(raw: unknown): LigneSuivi[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l): l is Record<string, unknown> => !!l && typeof l === 'object')
    .slice(0, 60)
    .map((l) => {
      const missions: Partial<Record<MissionKey, SuiviMission>> = {};
      const rawMissions = (l.missions && typeof l.missions === 'object' ? l.missions : {}) as Record<string, unknown>;
      for (const m of MISSIONS_SUIVI) {
        const rm = rawMissions[m.key];
        if (!rm || typeof rm !== 'object') continue;
        const heures = Math.max(0, Math.min(200, Number((rm as any).heures) || 0));
        const nbEleves = Math.max(0, Math.min(999, Math.floor(Number((rm as any).nbEleves) || 0)));
        const niveau = String((rm as any).niveau ?? '').trim().slice(0, 60);
        if (heures > 0 || nbEleves > 0 || niveau) missions[m.key] = { heures, nbEleves, niveau };
      }
      return {
        nom: String(l.nom ?? '').trim().slice(0, 120),
        prenom: String(l.prenom ?? '').trim().slice(0, 120),
        ecole: String(l.ecole ?? '').trim().slice(0, 200),
        missions,
      };
    })
    .filter((l) => l.nom || l.prenom || Object.keys(l.missions).length > 0);
}

export function publicationToSuivi(pub: PacteSuiviPublie): PacteSuivi {
  return {
    ecoleId: pub.ecole_id,
    directeurId: pub.directeur_id,
    ecole: pub.ecole_name,
    auteur: pub.directeur_name,
    anneeN: pub.annee_n,
    mois: pub.mois,
    lignes: sanitizeLignesSuivi(pub.lignes),
    updatedAt: new Date(pub.published_at).getTime(),
  };
}

export function suiviToApiPayload(s: PacteSuivi) {
  return {
    ecole_id: s.ecoleId,
    directeur_id: s.directeurId,
    directeur_name: s.auteur,
    ecole_name: s.ecole,
    annee_n: s.anneeN,
    mois: s.mois,
    lignes: sanitizeLignesSuivi(s.lignes),
  };
}

export function totalHeuresLigne(l: LigneSuivi): number {
  return MISSIONS_SUIVI.reduce((s, m) => s + (Number(l.missions[m.key]?.heures) || 0), 0);
}

export function computeSuiviStats(s: PacteSuivi) {
  const heuresParMission = {} as Record<MissionKey, number>;
  for (const m of MISSIONS_SUIVI) heuresParMission[m.key] = 0;
  let totalHeures = 0;
  let totalEleves = 0;
  for (const l of s.lignes) {
    for (const m of MISSIONS_SUIVI) {
      heuresParMission[m.key] += Number(l.missions[m.key]?.heures) || 0;
      totalEleves += Number(l.missions[m.key]?.nbEleves) || 0;
    }
    totalHeures += totalHeuresLigne(l);
  }
  return { heuresParMission, totalHeures, totalEleves, nbLignes: s.lignes.length };
}
