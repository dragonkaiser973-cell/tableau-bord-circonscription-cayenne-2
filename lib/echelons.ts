/**
 * Calcul de l'échelon d'un enseignant selon son ancienneté et sa classe
 * Basé sur les grilles officielles 2024
 */

// Grilles de durées par classe (en années)
const GRILLE_CLASSE_NORMALE = [
  { echelon: 1, duree: 1 },
  { echelon: 2, duree: 1 },
  { echelon: 3, duree: 2 },
  { echelon: 4, duree: 2 },
  { echelon: 5, duree: 2 },
  { echelon: 6, duree: 2.5 }, // 2 ou 3 ans selon bonification, on prend moyenne
  { echelon: 7, duree: 3 },
  { echelon: 8, duree: 3 },
  { echelon: 9, duree: 3 },
  { echelon: 10, duree: 3 },
  { echelon: 11, duree: Infinity }
];

const GRILLE_HORS_CLASSE = [
  { echelon: 1, duree: 2 },
  { echelon: 2, duree: 2 },
  { echelon: 3, duree: 2 },
  { echelon: 4, duree: 3 },
  { echelon: 5, duree: 3 },
  { echelon: 6, duree: 3 },
  { echelon: 7, duree: Infinity }
];

const GRILLE_CLASSE_EXCEPTIONNELLE = [
  { echelon: 1, duree: 3 },
  { echelon: 2, duree: 3 },
  { echelon: 3, duree: 3 },
  { echelon: 4, duree: 3 },
  { echelon: 5, duree: Infinity } // Chevrons HEA/HEB
];

/**
 * Détermine la classe depuis le code grade
 */
export function determinerClasse(codeGrade: string): 'CN' | 'HC' | 'CE' | 'Autre' {
  if (!codeGrade) return 'Autre';
  
  const grade = String(codeGrade);
  
  // Codes spécifiques pour chaque classe
  if (grade === '6151') return 'CN'; // Classe Normale
  if (grade === '6152') return 'HC'; // Hors Classe
  if (grade === '6153') return 'CE'; // Classe Exceptionnelle
  
  // Codes 78XX = Contractuels (pas de classe)
  if (grade.startsWith('78')) return 'Autre';
  
  // Autres codes non reconnus
  return 'Autre';
}

/**
 * Calcule l'échelon selon l'ancienneté et la classe
 */
export function calculerEchelon(anciennete: number, classe: 'CN' | 'HC' | 'CE' | 'Autre'): string {
  if (anciennete === 0) return '-';
  if (classe === 'Autre') return '-';
  
  let grille: typeof GRILLE_CLASSE_NORMALE;
  
  switch (classe) {
    case 'CN':
      grille = GRILLE_CLASSE_NORMALE;
      break;
    case 'HC':
      grille = GRILLE_HORS_CLASSE;
      break;
    case 'CE':
      grille = GRILLE_CLASSE_EXCEPTIONNELLE;
      break;
    default:
      return '-';
  }
  
  let anneesAccumulees = 0;
  
  for (const palier of grille) {
    anneesAccumulees += palier.duree;
    
    if (anciennete < anneesAccumulees) {
      return `${palier.echelon}`;
    }
  }
  
  // Si on dépasse toutes les durées, on est au dernier échelon
  return `${grille[grille.length - 1].echelon}`;
}

/**
 * Retourne le libellé complet de la classe
 */
export function getLibelleClasse(classe: 'CN' | 'HC' | 'CE' | 'Autre'): string {
  switch (classe) {
    case 'CN': return 'Classe Normale';
    case 'HC': return 'Hors Classe';
    case 'CE': return 'Classe Exceptionnelle';
    default: return '-';
  }
}

/**
 * Calcule l'échelon complet avec classe et échelon
 */
export function calculerEchelonComplet(anciennete: number, codeGrade: string): {
  classe: string;
  echelon: string;
  affichage: string;
} {
  const classeCode = determinerClasse(codeGrade);
  const classe = getLibelleClasse(classeCode);
  const echelon = calculerEchelon(anciennete, classeCode);
  
  if (echelon === '-') {
    return { classe: '-', echelon: '-', affichage: '-' };
  }
  
  const affichage = `${classe} - Éch. ${echelon}`;
  
  return { classe, echelon, affichage };
}
