export type NiveauKey =
  | 'TPS'
  | 'PS'
  | 'MS'
  | 'GS'
  | 'CP'
  | 'CE1'
  | 'CE2'
  | 'CM1'
  | 'CM2'
  | 'ULIS'
  | 'AUTRE';

export type Niveau = {
  key: NiveauKey;
  label: string;
  cycle: 1 | 2 | 3 | 0;
};

export const NIVEAUX: Niveau[] = [
  { key: 'TPS', label: 'TPS', cycle: 1 },
  { key: 'PS', label: 'PS', cycle: 1 },
  { key: 'MS', label: 'MS', cycle: 1 },
  { key: 'GS', label: 'GS', cycle: 1 },
  { key: 'CP', label: 'CP', cycle: 2 },
  { key: 'CE1', label: 'CE1', cycle: 2 },
  { key: 'CE2', label: 'CE2', cycle: 3 },
  { key: 'CM1', label: 'CM1', cycle: 3 },
  { key: 'CM2', label: 'CM2', cycle: 3 },
  { key: 'ULIS', label: 'ULIS', cycle: 0 },
  { key: 'AUTRE', label: 'Autre', cycle: 0 },
];

export const MAX_CLASSES = 35;

export type Prevision = {
  id: string;
  // Identifiants annuaire — vides tant que le directeur ne s'est pas sélectionné
  // dans le dropdown. Bloquent l'export et la publication.
  ecoleId: string;
  directeurId: string;
  ecole: string;
  auteur: string;
  anneeN: string;
  anneeN1: string;
  nbClasses: number;
  repPlus: boolean;
  effectifs: Record<NiveauKey, number>;
  repartition: Record<NiveauKey, number[]>;
  commPositifs: string;
  commNegatifs: string;
  updatedAt: number;
};

export const REP_PLUS_MAX = 12;
export const REP_PLUS_NIVEAUX: NiveauKey[] = ['CP', 'CE1'];

// Format renvoyé par /api/previsions-structure (snake_case côté Supabase).
export type PrevisionPubliee = {
  ecole_id: string;
  directeur_id: string;
  directeur_name: string;
  ecole_name: string;
  annee_n: string;
  annee_n1: string;
  nb_classes: number;
  rep_plus: boolean;
  effectifs: Record<NiveauKey, number>;
  repartition: Record<NiveauKey, number[]>;
  comm_positifs: string;
  comm_negatifs: string;
  published_at: string;
  client_id?: string | null;
};

// Convertit une publication serveur en Prevision locale (pour l'affichage
// en lecture seule via les composants existants).
export function publicationToPrevision(pub: PrevisionPubliee, id: string): Prevision {
  const base = makeEmptyPrevision(id);
  base.ecoleId = pub.ecole_id;
  base.directeurId = pub.directeur_id;
  base.ecole = pub.ecole_name;
  base.auteur = pub.directeur_name;
  base.anneeN = pub.annee_n;
  base.anneeN1 = pub.annee_n1;
  base.nbClasses = Math.max(1, Math.min(35, pub.nb_classes));
  base.repPlus = Boolean(pub.rep_plus);
  for (const n of NIVEAUX) {
    base.effectifs[n.key] = Number(pub.effectifs?.[n.key]) || 0;
    const arr = Array.isArray(pub.repartition?.[n.key]) ? pub.repartition[n.key] : [];
    for (let c = 0; c < arr.length && c < base.repartition[n.key].length; c++) {
      base.repartition[n.key][c] = Number(arr[c]) || 0;
    }
  }
  base.commPositifs = pub.comm_positifs ?? '';
  base.commNegatifs = pub.comm_negatifs ?? '';
  base.updatedAt = new Date(pub.published_at).getTime();
  return base;
}

// Convertit le format local (Prevision) en payload API (snake_case),
// en tronquant repartition aux nb_classes effectives.
export function previsionToApiPayload(p: Prevision) {
  const repartition = {} as Record<NiveauKey, number[]>;
  for (const n of NIVEAUX) {
    repartition[n.key] = (p.repartition[n.key] || []).slice(0, p.nbClasses);
  }
  return {
    directeur_id: p.directeurId,
    ecole_id: p.ecoleId,
    directeur_name: p.auteur,
    ecole_name: p.ecole,
    annee_n: p.anneeN,
    annee_n1: p.anneeN1,
    nb_classes: p.nbClasses,
    rep_plus: p.repPlus,
    effectifs: p.effectifs,
    repartition,
    comm_positifs: p.commPositifs,
    comm_negatifs: p.commNegatifs,
    client_id: p.id,
  };
}

export function makeEmptyPrevision(id: string): Prevision {
  const effectifs = {} as Record<NiveauKey, number>;
  const repartition = {} as Record<NiveauKey, number[]>;
  for (const n of NIVEAUX) {
    effectifs[n.key] = 0;
    repartition[n.key] = Array.from({ length: MAX_CLASSES }, () => 0);
  }
  return {
    id,
    ecoleId: '',
    directeurId: '',
    ecole: '',
    auteur: '',
    anneeN: '2025-2026',
    anneeN1: '2026-2027',
    nbClasses: 5,
    repPlus: false,
    effectifs,
    repartition,
    commPositifs: '',
    commNegatifs: '',
    updatedAt: Date.now(),
  };
}

export function computeStats(p: Prevision) {
  const perClasse: number[] = Array.from({ length: p.nbClasses }, () => 0);
  const niveauxParClasse: number[] = Array.from({ length: p.nbClasses }, () => 0);
  const resteParNiveau: Partial<Record<NiveauKey, number>> = {};
  let totalEffectif = 0;
  let totalReparti = 0;
  let cycle1 = 0;
  let elem = 0;
  let cycle2 = 0;
  let cycle3 = 0;

  const classesByNiveau: Record<NiveauKey, number> = NIVEAUX.reduce(
    (acc, n) => ({ ...acc, [n.key]: 0 }),
    {} as Record<NiveauKey, number>,
  );

  for (const n of NIVEAUX) {
    const eff = p.effectifs[n.key] || 0;
    totalEffectif += eff;
    if (n.cycle === 1) cycle1 += eff;
    else elem += eff;
    if (n.cycle === 2) cycle2 += eff;
    if (n.cycle === 3) cycle3 += eff;

    const row = p.repartition[n.key] || [];
    let sumRow = 0;
    for (let c = 0; c < p.nbClasses; c++) {
      const v = row[c] || 0;
      if (v > 0) {
        perClasse[c] += v;
        niveauxParClasse[c] += 1;
        classesByNiveau[n.key] += 1;
      }
      sumRow += v;
    }
    totalReparti += sumRow;
    resteParNiveau[n.key] = eff - sumRow;
  }

  const moyenneTheorique = p.nbClasses > 0 ? totalEffectif / p.nbClasses : 0;

  const classesRemplies = perClasse.filter((v) => v > 0);
  const moyenneActuelle =
    classesRemplies.length > 0
      ? classesRemplies.reduce((s, v) => s + v, 0) / classesRemplies.length
      : 0;

  const variance =
    classesRemplies.length > 0
      ? classesRemplies.reduce((s, v) => s + Math.pow(v - moyenneActuelle, 2), 0) /
        classesRemplies.length
      : 0;
  const ecartType = Math.sqrt(variance);

  let simples = 0;
  let doubles = 0;
  let triples = 0;
  let autres = 0;
  for (let c = 0; c < p.nbClasses; c++) {
    const nn = niveauxParClasse[c];
    if (nn === 1) simples++;
    else if (nn === 2) doubles++;
    else if (nn === 3) triples++;
    else if (nn >= 4) autres++;
  }

  const repPlusViolations: { niveau: NiveauKey; classe: number; value: number }[] = [];
  if (p.repPlus) {
    for (const key of REP_PLUS_NIVEAUX) {
      const row = p.repartition[key] || [];
      for (let c = 0; c < p.nbClasses; c++) {
        const v = row[c] || 0;
        if (v > REP_PLUS_MAX) repPlusViolations.push({ niveau: key, classe: c, value: v });
      }
    }
  }

  return {
    perClasse,
    niveauxParClasse,
    resteParNiveau,
    totalEffectif,
    totalReparti,
    resteGlobal: totalEffectif - totalReparti,
    cycle1,
    elem,
    cycle2,
    cycle3,
    moyenneTheorique,
    moyenneActuelle,
    ecartType,
    simples,
    doubles,
    triples,
    autres,
    classesNonVides: classesRemplies.length,
    classesByNiveau,
    repPlusViolations,
  };
}
