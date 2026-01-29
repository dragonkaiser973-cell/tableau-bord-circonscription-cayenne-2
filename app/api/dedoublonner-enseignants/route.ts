import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const enseignantsFile = path.join(dataDir, 'enseignants.json');
    
    if (!fs.existsSync(enseignantsFile)) {
      return NextResponse.json({
        success: false,
        message: 'Aucun fichier enseignants trouvé'
      });
    }

    // Lire les enseignants
    const data = fs.readFileSync(enseignantsFile, 'utf-8');
    const enseignants = JSON.parse(data);

    console.log(`📊 Nombre d'enseignants avant dédoublonnage: ${enseignants.length}`);

    // Créer une map pour identifier les doublons
    // Clé: nom + prénom + année_scolaire + ecole_id
    const uniqueMap = new Map<string, any>();
    let doublonsSupprimes = 0;

    enseignants.forEach((ens: any) => {
      const key = `${ens.nom}|${ens.prenom}|${ens.annee_scolaire}|${ens.ecole_id}`;
      
      if (uniqueMap.has(key)) {
        // Doublon trouvé - on garde celui avec l'ID le plus bas (le plus ancien)
        const existing = uniqueMap.get(key);
        if (ens.id < existing.id) {
          uniqueMap.set(key, ens);
        }
        doublonsSupprimes++;
      } else {
        uniqueMap.set(key, ens);
      }
    });

    // Convertir la map en tableau
    const enseignantsUniques = Array.from(uniqueMap.values());

    console.log(`✅ Nombre d'enseignants après dédoublonnage: ${enseignantsUniques.length}`);
    console.log(`🗑️ Doublons supprimés: ${doublonsSupprimes}`);

    // Sauvegarder
    fs.writeFileSync(enseignantsFile, JSON.stringify(enseignantsUniques, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: `✅ Dédoublonnage réussi`,
      details: {
        avant: enseignants.length,
        apres: enseignantsUniques.length,
        supprimes: doublonsSupprimes
      }
    });

  } catch (error: any) {
    console.error('Erreur lors du dédoublonnage:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Erreur lors du dédoublonnage',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
