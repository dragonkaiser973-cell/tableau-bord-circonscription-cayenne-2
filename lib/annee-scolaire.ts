/**
 * Librairie de gestion de l'année scolaire
 */

/**
 * Détecte l'année scolaire actuelle basée sur la date système
 * Une année scolaire commence en septembre (mois 8) et se termine en août (mois 7)
 */
export function detecterAnneeScolaire(): string {
  const maintenant = new Date();
  const mois = maintenant.getMonth(); // 0-11 (0=janvier, 8=septembre)
  const annee = maintenant.getFullYear();
  
  // Si on est entre septembre (8) et décembre (11), on commence une nouvelle année scolaire
  if (mois >= 8) {
    return `${annee}-${annee + 1}`;
  } else {
    // Si on est entre janvier (0) et août (7), on est dans la deuxième partie de l'année scolaire
    return `${annee - 1}-${annee}`;
  }
}

/**
 * Vérifie si un changement d'année scolaire est nécessaire
 */
export function verifierChangementAnnee(anneeActuelle: string): boolean {
  const anneeDetectee = detecterAnneeScolaire();
  return anneeActuelle !== anneeDetectee;
}

/**
 * Parse une année scolaire (ex: "2025-2026" -> { debut: 2025, fin: 2026 })
 */
export function parseAnneeScolaire(annee: string): { debut: number; fin: number } {
  const [debut, fin] = annee.split('-').map(Number);
  return { debut, fin };
}

/**
 * Génère l'année scolaire suivante
 */
export function anneeScolaireSuivante(annee: string): string {
  const { debut } = parseAnneeScolaire(annee);
  return `${debut + 1}-${debut + 2}`;
}

/**
 * Génère l'année scolaire précédente
 */
export function anneeScolairePrecedente(annee: string): string {
  const { debut } = parseAnneeScolaire(annee);
  return `${debut - 1}-${debut}`;
}
