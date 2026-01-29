import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const publicDir = path.join(process.cwd(), 'public');
    
    // Fichiers data/ à réinitialiser (tout sauf users.json pour garder l'authentification)
    const dataFilesToReset = [
      'ecoles.json',
      'enseignants.json',
      'evaluations.json',
      'effectifs.json',
      'evenements.json',
      'sync_logs.json',
    ];

    // Fichiers public/ à réinitialiser
    const publicFilesToReset = [
      'ecoles_identite.json',
      'ecoles_structure.json',
      'statistiques_ecoles.json',
      'stagiaires_m2.json',
      'evaluations.json'
    ];

    let resetCount = 0;

    // Réinitialiser fichiers data/
    for (const file of dataFilesToReset) {
      const filePath = path.join(dataDir, file);
      if (fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
        resetCount++;
      }
    }

    // Réinitialiser fichiers public/
    for (const file of publicFilesToReset) {
      const filePath = path.join(publicDir, file);
      if (fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
        resetCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `✅ Réinitialisation réussie`,
      details: `${resetCount} fichiers réinitialisés`,
      files: {
        data: dataFilesToReset,
        public: publicFilesToReset
      }
    });

  } catch (error: any) {
    console.error('Erreur lors de la réinitialisation:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Erreur lors de la réinitialisation',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
