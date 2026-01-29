import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

const configPath = path.join(process.cwd(), 'data', 'config.json');

// POST - Changer l'année scolaire
export async function POST(request: NextRequest) {
  try {
    const { nouvelleAnnee, effectifActuel, creerArchive } = await request.json();
    
    if (!nouvelleAnnee) {
      return NextResponse.json(
        { success: false, message: 'Nouvelle année manquante' },
        { status: 400 }
      );
    }
    
    // 1. Lire la config actuelle
    const configData = await readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);
    
    const ancienneAnnee = config.annee_scolaire_actuelle;
    
    // 2. Si demandé, créer une archive de l'année actuelle
    if (creerArchive) {
      try {
        const archiveRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/archives`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            anneeScolaire: ancienneAnnee,
            auto_created: true
          })
        });
        
        if (!archiveRes.ok) {
          console.warn('Impossible de créer l\'archive automatiquement');
        }
      } catch (error) {
        console.warn('Erreur création archive:', error);
        // Continue même si l'archive échoue
      }
    }
    
    // 3. Ajouter l'année actuelle à l'historique
    const nouvelHistorique = [
      ...config.historique_effectifs,
      {
        annee: ancienneAnnee,
        effectif: effectifActuel || 0
      }
    ].slice(-3); // Garder seulement les 3 dernières années (la 4ème sera l'année actuelle)
    
    // 4. Mettre à jour la configuration
    const nouvelleConfig = {
      annee_scolaire_actuelle: nouvelleAnnee,
      historique_effectifs: nouvelHistorique,
      date_derniere_mise_a_jour: new Date().toISOString()
    };
    
    await writeFile(configPath, JSON.stringify(nouvelleConfig, null, 2), 'utf-8');
    
    return NextResponse.json({
      success: true,
      message: `Année scolaire changée de ${ancienneAnnee} à ${nouvelleAnnee}`,
      config: nouvelleConfig,
      archive_creee: creerArchive
    });
    
  } catch (error: any) {
    console.error('Erreur changement année:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
