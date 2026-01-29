import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // S'assurer que le dossier public existe
    const publicDir = path.join(process.cwd(), 'public');
    try {
      await mkdir(publicDir, { recursive: true });
    } catch (error) {
      // Le dossier existe déjà
    }

    // Lire le fichier Excel
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log('=== EXTRACTION STAGIAIRES SOPA ===');
    console.log(`Nombre de lignes: ${data.length}`);

    // Parser les stagiaires
    const stagiaires = parseStagiairesFromExcel(data as any[][]);

    console.log(`✅ ${stagiaires.length} stagiaires extraits`);

    // Sauvegarder dans public/ (cohérent avec les autres imports)
    const outputPath = path.join(publicDir, 'stagiaires_m2.json');
    await writeFile(outputPath, JSON.stringify(stagiaires, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Stagiaires SOPA importés avec succès',
      count: stagiaires.length,
      stagiaires: stagiaires
    });

  } catch (error: any) {
    console.error('Erreur lors de l\'import des stagiaires:', error);
    return NextResponse.json({ 
      error: error.message || 'Erreur lors de l\'import' 
    }, { status: 500 });
  }
}

function parseStagiairesFromExcel(data: any[][]): any[] {
  const stagiaires: any[] = [];
  
  // Les données commencent à la ligne 2 (index 2, après les 2 lignes d'en-tête)
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    
    // Vérifier que la ligne contient des données
    if (!row || row.length < 3) continue;
    
    const numero = row[0]; // Colonne A (Unnamed: 0)
    const nom = row[1];    // Colonne B (IEN CAYENNE 2...)
    const prenom = row[2]; // Colonne C (Unnamed: 2)
    const statut = row[3]; // Colonne D (Unnamed: 3)
    
    // Vérifier que c'est bien une ligne de stagiaire
    if (!numero || !nom || !prenom) continue;
    
    console.log(`Stagiaire trouvé: ${numero}. ${nom} ${prenom}`);
    
    // Stage 1 (Période 1 - colonnes 4-8) - Stage Filé
    const stageFile = row[5] ? {
      ecole: row[5],     // EEPU G. HERMINE
      tuteur: row[6],    // Mme DOMPUT
      prenom_tuteur: row[7], // Cindy
      niveau: row[8]     // CP
    } : { ecole: '', tuteur: '', prenom_tuteur: '', niveau: '' };
    
    // Stage 2 (Période 2 - colonnes 9-12) - Stage Massé 1
    const stageMasse1 = row[9] ? {
      ecole: row[9],     // EMPU G. HERMINE
      tuteur: row[10],   // Mme BOUSSATON DEFERT
      prenom_tuteur: row[11], // Sophie
      niveau: row[12]    // PS
    } : { ecole: '', tuteur: '', prenom_tuteur: '', niveau: '' };
    
    // Stage 3 (Période 3 - colonnes 13-16) - Stage Massé 2
    const stageMasse2 = row[13] ? {
      ecole: row[13],    // EEPU G. HERMINE
      tuteur: row[14],   // M. DORLIPO
      prenom_tuteur: row[15], // Steddy
      niveau: row[16]    // CM2
    } : { ecole: '', tuteur: '', prenom_tuteur: '', niveau: '' };
    
    const stagiaire = {
      numero: parseInt(String(numero)),
      nom: nom,
      prenom: prenom,
      statut: statut || 'M2 SOPA',
      stage_file: stageFile,
      stage_masse_1: stageMasse1,
      stage_masse_2: stageMasse2,
      annee_scolaire: '2025-2026' // TODO: Récupérer depuis la config
    };
    
    stagiaires.push(stagiaire);
  }
  
  return stagiaires;
}

// GET - Récupérer les stagiaires
export async function GET() {
  try {
    // Lire depuis public/ (fichier importé)
    const filePath = path.join(process.cwd(), 'public', 'stagiaires_m2.json');
    
    try {
      const data = await readFile(filePath, 'utf-8');
      return NextResponse.json(JSON.parse(data));
    } catch (error) {
      // Fichier n'existe pas encore
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Erreur lecture stagiaires:', error);
    return NextResponse.json([]);
  }
}
