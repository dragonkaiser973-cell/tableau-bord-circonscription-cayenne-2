import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Lire le fichier Excel
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log('=== EXTRACTION STAGIAIRES SOPA ===');
    console.log(`Nombre de lignes: ${data.length}`);

    // Parser les stagiaires (données commencent à la ligne 3, index 2 après skip des headers)
    const stagiaires = parseStagiairesFromExcel(data as any[][]);

    console.log(`✅ ${stagiaires.length} stagiaires extraits`);

    if (stagiaires.length === 0) {
      return NextResponse.json({ 
        error: 'Aucun stagiaire trouvé dans le fichier' 
      }, { status: 400 });
    }

    // SAUVEGARDER DANS SUPABASE
    console.log('💾 Sauvegarde dans Supabase...');

    // Vider la table
    await supabase.from('stagiaires_m2').delete().neq('id', 0);

    // Insérer en batch
    const batchSize = 50;
    let imported = 0;

    for (let i = 0; i < stagiaires.length; i += batchSize) {
      const batch = stagiaires.slice(i, i + batchSize);
      
      const stagairesToInsert = batch.map(stag => ({
        ...stag,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('stagiaires_m2')
        .insert(stagairesToInsert);

      if (error) {
        console.error(`❌ Erreur insertion batch ${i / batchSize + 1}:`, error);
      } else {
        imported += batch.length;
        console.log(`✅ Batch ${i / batchSize + 1}: ${batch.length} stagiaires`);
      }
    }

    console.log(`✅ Import terminé: ${imported} stagiaires dans Supabase`);

    return NextResponse.json({
      success: true,
      message: 'Stagiaires SOPA importés avec succès',
      count: imported
    });

  } catch (error: any) {
    console.error('❌ Erreur lors de l\'import des stagiaires:', error);
    return NextResponse.json({ 
      error: error.message || 'Erreur lors de l\'import' 
    }, { status: 500 });
  }
}

function parseStagiairesFromExcel(data: any[][]): any[] {
  const stagiaires: any[] = [];
  
  // Les données commencent à la ligne 4 (index 3)
  // Ligne 0 = Titre
  // Ligne 1 = En-têtes principaux
  // Ligne 2 = Sous-en-têtes
  // Ligne 3+ = Données
  
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    
    // Vérifier que la ligne contient des données
    if (!row || row.length < 3) continue;
    
    const nom = row[1];
    const prenom = row[2];
    
    // Vérifier que c'est bien une ligne de stagiaire
    if (!nom || !prenom) continue;
    
    console.log(`Stagiaire trouvé: ${nom} ${prenom}`);
    
    // Stage filé (colonnes 4-8)
    const stageFile = {
      commune: row[4] || '',
      ecole: row[5] || '',
      tuteur: `${row[6] || ''} ${row[7] || ''}`.trim(),
      niveau: row[8] || ''
    };
    
    // Stage masse 1 (colonnes 9-12)
    const stageMasse1 = {
      ecole: row[9] || '',
      tuteur: `${row[10] || ''} ${row[11] || ''}`.trim(),
      niveau: row[12] || ''
    };
    
    // Stage masse 2 (colonnes 13-16)
    const stageMasse2 = {
      ecole: row[13] || '',
      tuteur: `${row[14] || ''} ${row[15] || ''}`.trim(),
      niveau: row[16] || ''
    };
    
    const stagiaire = {
      nom: String(nom).trim(),
      prenom: String(prenom).trim(),
      statut: row[3] || 'M2 SOPA',
      stage_file: stageFile,
      stage_masse_1: stageMasse1,
      stage_masse_2: stageMasse2,
      annee_scolaire: '2025-2026'
    };
    
    stagiaires.push(stagiaire);
  }
  
  return stagiaires;
}

// GET - Récupérer les stagiaires depuis Supabase
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('stagiaires_m2')
      .select('*')
      .order('nom', { ascending: true });

    if (error) {
      console.error('Supabase error fetching stagiaires:', error);
      return NextResponse.json([]);
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Erreur lecture stagiaires:', error);
    return NextResponse.json([]);
  }
}
