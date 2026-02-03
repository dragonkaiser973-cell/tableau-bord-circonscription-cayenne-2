import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import JSZip from 'jszip';
import { parse } from 'node-html-parser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    if (!file.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'Le fichier doit être un ZIP' }, { status: 400 });
    }

    console.log('📂 Import identité écoles - Lecture du ZIP:', file.name);

    // Lire le contenu du ZIP
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const ecoles: any[] = [];

    // Parser chaque fichier HTML dans le ZIP
    for (const [filename, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir || (!filename.endsWith('.htm') && !filename.endsWith('.html'))) {
        continue;
      }

      try {
        const content = await zipEntry.async('text');
        const root = parse(content);

        const ecoleData: any = {};

        // Extraire les données du tableau HTML
        const rows = root.querySelectorAll('tr');

        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length === 2) {
            const label = cells[0].text.trim();
            const value = cells[1].text.trim();

            if (label.includes('UAI')) {
              ecoleData.uai = value;
            } else if (label.includes('Secteur')) {
              ecoleData.secteur = value;
            } else if (label.includes('Type')) {
              ecoleData.type = value;
            } else if (label.includes('Nom') && ecoleData.uai) {
              ecoleData.nom = value;
            } else if (label.includes('SIRET')) {
              ecoleData.siret = value;
            } else if (label.includes('État') || label.includes('Etat')) {
              ecoleData.etat = value;
            } else if (label.toLowerCase().includes('ouverture')) {
              ecoleData.date_ouverture = value;
            } else if (label.includes('Commune')) {
              ecoleData.commune = value;
            } else if (label.includes('Civilité') || label.includes('Civilite')) {
              ecoleData.civilite = value;
            } else if (label.includes('Directeur') && !label.includes('Civilité')) {
              ecoleData.directeur = value;
            } else if (label.includes('Adresse')) {
              ecoleData.adresse = value;
            } else if (label.includes('Ville')) {
              ecoleData.ville = value;
            } else if (label.includes('Téléphone') || label.includes('Telephone')) {
              ecoleData.telephone = value;
            } else if (label.includes('Mél') || label.includes('Email')) {
              ecoleData.email = value;
            } else if (label.includes('Collège') || label.includes('College')) {
              ecoleData.college = value;
            }
          }
        }

        if (ecoleData.uai) {
          ecoles.push(ecoleData);
          console.log(`✅ ${ecoleData.uai} - ${ecoleData.nom || 'Sans nom'}`);
        }
      } catch (err) {
        console.error(`❌ Erreur parsing ${filename}:`, err);
      }
    }

    console.log(`📊 Total: ${ecoles.length} écoles extraites`);

    if (ecoles.length === 0) {
      return NextResponse.json({ 
        error: 'Aucune école trouvée dans le ZIP. Vérifiez le format des fichiers HTML.' 
      }, { status: 400 });
    }

    // Vider la table et insérer toutes les écoles en bulk
    console.log('🗑️ Vidage de la table ecoles_identite...');
    await supabase.from('ecoles_identite').delete().neq('id', 0);

    console.log('💾 Insertion des écoles dans Supabase...');
    const batchSize = 100;
    let imported = 0;

    for (let i = 0; i < ecoles.length; i += batchSize) {
      const batch = ecoles.slice(i, i + batchSize);
      
      const ecolesToInsert = batch.map(ecole => ({
        ...ecole,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('ecoles_identite')
        .insert(ecolesToInsert);

      if (error) {
        console.error(`❌ Erreur insertion batch ${i / batchSize + 1}:`, error);
      } else {
        imported += batch.length;
        console.log(`✅ Batch ${i / batchSize + 1}: ${batch.length} écoles`);
      }
    }

    console.log(`✅ Import terminé: ${imported} écoles importées`);

    return NextResponse.json({
      success: true,
      message: `Import réussi: ${imported} écoles importées`,
      count: imported
    });

  } catch (error: any) {
    console.error('❌ Erreur lors de l\'import:', error);
    return NextResponse.json({ 
      error: error.message || 'Erreur lors de l\'import' 
    }, { status: 500 });
  }
}
