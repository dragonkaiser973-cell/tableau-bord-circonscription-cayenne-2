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

    console.log('📂 Lecture fichier Excel stagiaires...');

    // Lire le fichier Excel
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`📊 Nombre de lignes dans Excel: ${data.length}`);

    // Parser les stagiaires
    const stagiaires = parseStagiairesFromExcel(data as any[][]);

    console.log(`✅ ${stagiaires.length} stagiaires extraits`);

    if (stagiaires.length === 0) {
      return NextResponse.json({ 
        error: 'Aucun stagiaire trouvé dans le fichier. Vérifiez la structure du fichier Excel.' 
      }, { status: 400 });
    }

    // SAUVEGARDER DANS SUPABASE
    console.log('💾 Sauvegarde dans Supabase...');

    // Vider la table
    const { error: deleteError } = await supabase
      .from('stagiaires_m2')
      .delete()
      .neq('id', 0);

    if (deleteError) {
      console.error('Erreur vidage table:', deleteError);
    }

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
        console.error(`❌ Erreur insertion batch:`, error);
        return NextResponse.json({ 
          error: `Erreur Supabase: ${error.message}` 
        }, { status: 500 });
      } else {
        imported += batch.length;
        console.log(`✅ Batch: ${batch.length} stagiaires importés`);
      }
    }

    console.log(`🎉 Import terminé: ${imported} stagiaires dans Supabase`);

    return NextResponse.json({
      success: true,
      message: `${imported} stagiaires SOPA importés avec succès`,
      count: imported
    });

  } catch (error: any) {
    console.error('❌ Erreur import stagiaires:', error);
    return NextResponse.json({ 
      error: error.message || 'Erreur lors de l\'import' 
    }, { status: 500 });
  }
}

function parseStagiairesFromExcel(data: any[][]): any[] {
  const stagiaires: any[] = [];
  
  console.log('\n=== PARSING STAGIAIRES ===');
  
  // Les données commencent à data[3] (ligne 4 dans Excel)
  // data[0] = Titre
  // data[1] = En-têtes principaux
  // data[2] = Sous-en-têtes
  // data[3+] = Données stagiaires
  
  for (let i = 3; i < data.length; i++) {
    const row = data[i];
    
    // Debug: afficher la ligne
    console.log(`\nLigne ${i}: ${row.length} colonnes`);
    
    // Vérifier que la ligne contient des données
    if (!row || row.length < 3) {
      console.log(`  ⚠️ Ligne ${i} ignorée (trop courte)`);
      continue;
    }
    
    const nom = row[1];
    const prenom = row[2];
    
    // Vérifier que c'est bien une ligne de stagiaire
    if (!nom || nom === '' || !prenom || prenom === '') {
      console.log(`  ⚠️ Ligne ${i} ignorée (nom ou prénom vide)`);
      continue;
    }
    
    console.log(`  ✅ Stagiaire: ${nom} ${prenom}`);
    
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
      statut: row[3] ? String(row[3]).trim() : 'M2 SOPA',
      stage_file: stageFile,
      stage_masse_1: stageMasse1,
      stage_masse_2: stageMasse2,
      annee_scolaire: '2025-2026'
    };
    
    stagiaires.push(stagiaire);
  }
  
  console.log(`\n📊 Total stagiaires parsés: ${stagiaires.length}\n`);
  
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
      console.error('Erreur Supabase stagiaires:', error);
      return NextResponse.json([]);
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Erreur lecture stagiaires:', error);
    return NextResponse.json([]);
  }
}
