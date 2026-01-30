import { NextRequest, NextResponse } from 'next/server';
import { getEcoles, getEcoleById } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const ecole = await getEcoleById(parseInt(id));
      if (!ecole) {
        return NextResponse.json(
          { message: 'École non trouvée' },
          { status: 404 }
        );
      }
      return NextResponse.json(ecole);
    }

    const ecoles = await getEcoles();
    return NextResponse.json(ecoles);
  } catch (error) {
    console.error('Erreur lors de la récupération des écoles:', error);
    return NextResponse.json(
      { message: 'Erreur du serveur' },
      { status: 500 }
    );
  }
}
