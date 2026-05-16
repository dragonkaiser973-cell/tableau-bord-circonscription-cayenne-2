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

// Génère un PIN à 6 chiffres (entre 100000 et 999999)
export function genererPin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
