import { NextRequest, NextResponse } from 'next/server';
import { getEvaluations } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters: any = {};
    
    if (searchParams.get('rentree')) {
      filters.rentree = parseInt(searchParams.get('rentree')!);
    }
    
    if (searchParams.get('uai')) {
      filters.uai = searchParams.get('uai');
    }
    
    if (searchParams.get('classe')) {
      filters.classe = searchParams.get('classe');
    }
    
    if (searchParams.get('matiere')) {
      filters.matiere = searchParams.get('matiere');
    }

    const evaluations = getEvaluations(filters);
    return NextResponse.json(evaluations);
  } catch (error) {
    console.error('Erreur lors de la récupération des évaluations:', error);
    return NextResponse.json(
      { message: 'Erreur du serveur' },
      { status: 500 }
    );
  }
}
