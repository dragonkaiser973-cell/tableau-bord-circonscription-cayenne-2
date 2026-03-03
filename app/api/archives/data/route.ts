import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Récupérer les données d'une archive spécifique
// Compatible avec l'ancien système de paramètres
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const anneeScolaire = searchParams.get('annee');
    const section = searchParams.get('section'); // pilotage, circonscription, evaluations, etc.
    const type = searchParams.get('type'); // brutes, calculees, OU ancien format (enseignants, ecoles, etc.)
    
    if (!anneeScolaire) {
      return NextResponse.json({ error: 'Année scolaire manquante' }, { status: 400 });
    }
    
    console.log(`📖 Chargement archive: ${anneeScolaire}, type: ${type}, section: ${section}`);
    
    // Charger l'archive depuis Supabase
    const { data: archive, error } = await supabase
      .from('archives')
      .select('*')
      .eq('annee_scolaire', anneeScolaire)
      .single();

    if (error || !archive) {
      console.error('Archive non trouvée:', error);
      return NextResponse.json({ 
        error: 'Archive non trouvée' 
      }, { status: 404 });
    }
    
    console.log(`✅ Archive trouvée: ${archive.annee_scolaire}`);
    
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
        console.log(`✅ Retour données brutes: ${newKey}`);
        return NextResponse.json(archive.donnees_brutes[newKey]);
      }
      
      // Fallback ancien format (si migration partielle)
      if (archive.data && archive.data[type]) {
        console.log(`✅ Retour données anciennes: ${type}`);
        return NextResponse.json(archive.data[type]);
      }
      
      // Retourner tableau vide si pas trouvé
      console.warn(`⚠️  Données non trouvées pour type: ${type}`);
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
    
    // Construire la structure complète pour compatibilité
    const fullArchive = {
      anneeScolaire: archive.annee_scolaire,
      dateArchivage: archive.date_creation,
      version: archive.version || '3.0',
      metadata: archive.metadata || {},
      donnees_brutes: archive.donnees_brutes || {},
      donnees_calculees: archive.donnees_calculees || {},
      // Rétrocompatibilité ancien format
      data: archive.donnees_brutes || {}
    };
    
    return NextResponse.json(fullArchive);
    
  } catch (error: any) {
    console.error('❌ Erreur lecture archive:', error);
    return NextResponse.json({ 
      error: error.message || 'Erreur lors de la lecture de l\'archive' 
    }, { status: 500 });
  }
}
