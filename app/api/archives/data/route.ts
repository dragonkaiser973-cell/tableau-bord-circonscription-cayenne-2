import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const archivesDir = path.join(process.cwd(), 'data', 'archives');

// GET - Récupérer les données d'une archive spécifique
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const anneeScolaire = searchParams.get('annee');
    const section = searchParams.get('section'); // pilotage, circonscription, evaluations, etc.
    const type = searchParams.get('type'); // brutes, calculees, OU ancien format (enseignants, ecoles, etc.)
    
    if (!anneeScolaire) {
      return NextResponse.json({ error: 'Année scolaire manquante' }, { status: 400 });
    }
    
    const archivePath = path.join(archivesDir, `${anneeScolaire}.json`);
    const content = await readFile(archivePath, 'utf-8');
    const archive = JSON.parse(content);
    
    // ====================================================================
    // RÉTROCOMPATIBILITÉ - Support ancien format
    // ====================================================================
    
    // Ancien appel : ?annee=2024&type=enseignants
    if (type && !section) {
      // Mapping ancien → nouveau format
      const mapping: any = {
        'enseignants': 'enseignants',
        'ecoles': 'ecoles_structure',
        'ecoles_identite': 'ecoles_identite',
        'evaluations': 'evaluations',
        'statistiques_ecoles': 'statistiques_ecoles',
        'stagiaires_sopa': 'stagiaires_m2',
        'stagiaires_m2': 'stagiaires_m2',
        'evenements': 'evenements'
      };
      
      const newKey = mapping[type] || type;
      
      // Essayer nouveau format d'abord
      if (archive.donnees_brutes && archive.donnees_brutes[newKey]) {
        return NextResponse.json(archive.donnees_brutes[newKey]);
      }
      
      // Fallback ancien format
      if (archive.data && archive.data[type]) {
        return NextResponse.json(archive.data[type]);
      }
      
      // Retourner tableau vide si pas trouvé
      return NextResponse.json([]);
    }
    
    // ====================================================================
    // NOUVEAU FORMAT
    // ====================================================================
    
    // Appel : ?annee=2024&section=pilotage&type=calculees
    if (section && type) {
      if (type === 'brutes') {
        return NextResponse.json(archive.donnees_brutes || archive.data || {});
      } else if (type === 'calculees') {
        if (section === 'all') {
          return NextResponse.json(archive.donnees_calculees || {});
        }
        return NextResponse.json(archive.donnees_calculees?.[section] || {});
      }
    }
    
    // Appel : ?annee=2024&type=brutes
    if (type === 'brutes' && !section) {
      return NextResponse.json(archive.donnees_brutes || archive.data || {});
    }
    
    // Appel : ?annee=2024&type=calculees
    if (type === 'calculees' && !section) {
      return NextResponse.json(archive.donnees_calculees || {});
    }
    
    // ====================================================================
    // PAR DÉFAUT - Retourner toute l'archive
    // ====================================================================
    return NextResponse.json(archive);
    
  } catch (error: any) {
    console.error('Erreur lecture archive:', error);
    return NextResponse.json({ 
      error: error.message || 'Archive non trouvée' 
    }, { status: 404 });
  }
}
