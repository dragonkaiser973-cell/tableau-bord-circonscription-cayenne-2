import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const configPath = path.join(process.cwd(), 'data', 'config.json');

// GET - Récupérer la configuration
export async function GET() {
  try {
    const data = await readFile(configPath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error('Erreur lecture config:', error);
    // Retourner une config par défaut si le fichier n'existe pas
    return NextResponse.json({
      annee_scolaire_actuelle: '2025-2026',
      historique_effectifs: [
        { annee: '2022-2023', effectif: 3150 },
        { annee: '2023-2024', effectif: 3280 },
        { annee: '2024-2025', effectif: 3420 }
      ],
      date_derniere_maj: new Date().toISOString().split('T')[0]
    });
  }
}

// PUT - Mettre à jour la configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Ajouter la date de mise à jour
    body.date_derniere_maj = new Date().toISOString().split('T')[0];
    
    await writeFile(configPath, JSON.stringify(body, null, 2), 'utf-8');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Configuration mise à jour',
      config: body
    });
  } catch (error: any) {
    console.error('Erreur mise à jour config:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
