// Calcul des points style Kahoot : plus tu réponds vite, plus tu gagnes.
// Si la réponse est fausse → 0 point.
// Si la réponse est juste, on gagne entre 50 % et 100 % des points de base
// selon le temps de réponse (1.0 si instantané, 0.5 si on a pris tout le temps).

export function calculerPoints(
  estCorrect: boolean,
  tempsMs: number,
  dureeSecondes: number,
  pointsBase: number
): number {
  if (!estCorrect) return 0;
  const dureeMs = dureeSecondes * 1000;
  if (tempsMs >= dureeMs) return Math.round(pointsBase * 0.5);
  const ratio = 1 - (tempsMs / dureeMs) / 2; // ∈ [0.5, 1.0]
  return Math.round(pointsBase * ratio);
}

// Scoring spécifique au classement : on attribue (n_correctes / n_total) des points,
// puis on module par la rapidité comme pour les QCM.
// `ordreCorrect` et `ordreChoisi` sont des tableaux d'IDs de mêmes éléments.
export function calculerPointsClassement(
  ordreCorrect: string[],
  ordreChoisi: string[],
  tempsMs: number,
  dureeSecondes: number,
  pointsBase: number
): { points: number; nbCorrects: number; total: number } {
  const total = ordreCorrect.length;
  if (total === 0) return { points: 0, nbCorrects: 0, total: 0 };
  let nbCorrects = 0;
  for (let i = 0; i < total; i++) {
    if (ordreChoisi[i] && ordreChoisi[i] === ordreCorrect[i]) nbCorrects++;
  }
  if (nbCorrects === 0) return { points: 0, nbCorrects: 0, total };
  const ratioJustesse = nbCorrects / total; // ∈ ]0, 1]
  const dureeMs = dureeSecondes * 1000;
  const ratioRapidite = tempsMs >= dureeMs
    ? 0.5
    : 1 - (tempsMs / dureeMs) / 2; // ∈ [0.5, 1.0]
  return {
    points: Math.round(pointsBase * ratioJustesse * ratioRapidite),
    nbCorrects,
    total,
  };
}

// Mélange déterministe basé sur un seed (pour que tous les participants
// reçoivent les items dans le même ordre mélangé pendant la session)
export function melangerAvecSeed<T>(arr: T[], seed: string): T[] {
  const out = [...arr];
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const j = (h >>> 0) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Génère un PIN à 6 chiffres (entre 100000 et 999999)
export function genererPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
