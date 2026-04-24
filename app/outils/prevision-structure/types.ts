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
  ecole: string;
  auteur: string;
  anneeN: string;
  anneeN1: string;
  nbClasses: number;
  effectifs: Record<NiveauKey, number>;
  repartition: Record<NiveauKey, number[]>;
  commPositifs: string;
  commNegatifs: string;
  updatedAt: number;
};

export function makeEmptyPrevision(id: string): Prevision {
  const effectifs = {} as Record<NiveauKey, number>;
  const repartition = {} as Record<NiveauKey, number[]>;
  for (const n of NIVEAUX) {
    effectifs[n.key] = 0;
    repartition[n.key] = Array.from({ length: MAX_CLASSES }, () => 0);
  }
  return {
    id,
    ecole: '',
    auteur: '',
    anneeN: '2025-2026',
    anneeN1: '2026-2027',
    nbClasses: 5,
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
  };
}
