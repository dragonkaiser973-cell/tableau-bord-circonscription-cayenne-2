import { NextRequest, NextResponse } from 'next/server';
import { getEnseignants } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters: any = {};
    
    if (searchParams.get('ecole_id')) {
      filters.ecole_id = parseInt(searchParams.get('ecole_id')!);
    }
    
    if (searchParams.get('annee_scolaire')) {
      filters.annee_scolaire = searchParams.get('annee_scolaire');
    }
    
    if (searchParams.get('nom')) {
      filters.nom = searchParams.get('nom');
    }
    
    if (searchParams.get('statut')) {
      filters.statut = searchParams.get('statut');
    }

    const enseignants = await getEnseignants(filters);
    return NextResponse.json(enseignants);
  } catch (error) {
    console.error('Erreur lors de la récupération des enseignants:', error);
    return NextResponse.json(
      { message: 'Erreur du serveur' },
      { status: 500 }
    );
  }
}
