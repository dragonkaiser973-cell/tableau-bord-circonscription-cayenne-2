// ====================================================================
// Vacances scolaires — académie de Guyane
// Source officielle : https://www.ac-guyane.fr/le-calendrier-scolaire-121444
//
// Convention : `debut` et `fin` sont les jours VAQUÉS, inclus.
// (Le départ officiel « après la classe le jour X » donne debut = X+1 ;
//  la reprise officielle « le matin du jour Y » donne fin = Y-1.)
//
// ⚠️ À compléter chaque année dès la parution du calendrier officiel.
// ====================================================================

export interface PeriodeVacances {
  nom: string;
  debut: string; // YYYY-MM-DD inclus
  fin: string;   // YYYY-MM-DD inclus
}

// Clé = année civile de début de l'année scolaire (2026 pour 2026-2027).
const VACANCES_OFFICIELLES: Record<number, PeriodeVacances[]> = {
  2023: [
    { nom: 'Vacances de la Toussaint', debut: '2023-10-21', fin: '2023-11-05' },
    { nom: 'Vacances de Noël', debut: '2023-12-23', fin: '2024-01-07' },
    { nom: 'Vacances de Carnaval', debut: '2024-02-10', fin: '2024-02-25' },
    { nom: 'Pont à Pâques', debut: '2024-03-29', fin: '2024-04-02' },
    { nom: 'Vacances de Pâques', debut: '2024-04-20', fin: '2024-05-01' },
    { nom: "Pont de l'Ascension", debut: '2024-05-10', fin: '2024-05-12' },
    { nom: "Vacances d'été", debut: '2024-07-07', fin: '2024-08-31' },
  ],
  2024: [
    { nom: 'Vacances de la Toussaint', debut: '2024-10-19', fin: '2024-11-03' },
    { nom: 'Vacances de Noël', debut: '2024-12-21', fin: '2025-01-05' },
    { nom: 'Vacances de Carnaval', debut: '2025-02-22', fin: '2025-03-09' },
    { nom: 'Vacances de Pâques', debut: '2025-04-18', fin: '2025-05-04' },
    { nom: "Pont de l'Ascension", debut: '2025-05-30', fin: '2025-06-01' },
    { nom: "Vacances d'été", debut: '2025-07-06', fin: '2025-08-31' },
  ],
  2025: [
    { nom: 'Vacances de la Toussaint', debut: '2025-10-18', fin: '2025-11-02' },
    { nom: 'Vacances de Noël', debut: '2025-12-20', fin: '2026-01-04' },
    { nom: 'Vacances de Carnaval', debut: '2026-02-07', fin: '2026-02-22' },
    { nom: 'Vacances de Pâques', debut: '2026-04-02', fin: '2026-04-15' },
    { nom: "Pont de l'Ascension", debut: '2026-05-15', fin: '2026-05-17' },
    { nom: "Vacances d'été", debut: '2026-07-05', fin: '2026-08-31' },
  ],
  2026: [
    { nom: 'Vacances de la Toussaint', debut: '2026-10-17', fin: '2026-11-02' },
    { nom: 'Vacances de Noël', debut: '2026-12-19', fin: '2027-01-03' },
    { nom: 'Vacances de Carnaval', debut: '2027-02-06', fin: '2027-02-17' },
    { nom: 'Vacances de Pâques', debut: '2027-03-26', fin: '2027-04-11' },
    { nom: "Pont de l'Ascension", debut: '2027-04-30', fin: '2027-05-09' },
    { nom: "Vacances d'été", debut: '2027-07-04', fin: '2027-08-31' },
  ],
};

/**
 * Vacances scolaires de la Guyane pour l'année scolaire commençant en `anneeDebut`.
 * Années sans calendrier officiel saisi : approximation générique (à remplacer
 * dès la parution du calendrier de l'académie).
 */
/**
 * Formate une date ISO (YYYY-MM-DD) en JJ/MM/AAAA sans passer par `new Date()` :
 * une date ISO seule serait interprétée en UTC puis reculée d'un jour à
 * l'affichage en heure de Guyane (UTC-3).
 */
export function formatDateFr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso ?? '');
}

export function getVacancesScolaires(anneeDebut: number): PeriodeVacances[] {
  const officiel = VACANCES_OFFICIELLES[anneeDebut];
  if (officiel) return officiel;
  return [
    { nom: 'Vacances de la Toussaint', debut: `${anneeDebut}-10-18`, fin: `${anneeDebut}-11-02` },
    { nom: 'Vacances de Noël', debut: `${anneeDebut}-12-20`, fin: `${anneeDebut + 1}-01-04` },
    { nom: 'Vacances de Carnaval', debut: `${anneeDebut + 1}-02-07`, fin: `${anneeDebut + 1}-02-21` },
    { nom: 'Vacances de Pâques', debut: `${anneeDebut + 1}-04-01`, fin: `${anneeDebut + 1}-04-15` },
    { nom: "Vacances d'été", debut: `${anneeDebut + 1}-07-05`, fin: `${anneeDebut + 1}-08-31` },
  ];
}
