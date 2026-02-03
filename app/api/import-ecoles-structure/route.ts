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

    console.log('📂 Import structure écoles - Lecture du ZIP:', file.name);

    // Lire le contenu du ZIP
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const structures: any[] = [];

    // Parser chaque fichier HTML dans le ZIP
    for (const [filename, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir || (!filename.endsWith('.htm') && !filename.endsWith('.html'))) {
        continue;
      }

      try {
        const content = await zipEntry.async('text');
        const root = parse(content);

        let uai = '';
        const classes: any[] = [];
        const dispositifs: any[] = [];

        // Chercher l'UAI dans les tableaux
        const rows = root.querySelectorAll('tr');
        
        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          
          // Extraire UAI
          if (cells.length === 2) {
            const label = cells[0].text.trim();
            const value = cells[1].text.trim();
            if (label.includes('UAI')) {
              uai = value;
            }
          }
          
          // Extraire classes (généralement dans un tableau avec plusieurs colonnes)
          if (cells.length >= 4) {
            const libelle = cells[0]?.text.trim() || '';
            const enseignant = cells[1]?.text.trim() || '';
            const niveau = cells[2]?.text.trim() || '';
            const nbElevesText = cells[3]?.text.trim() || '0';
            
            if (libelle && !libelle.includes('Libellé')) {
              const classe = {
                libelle,
                enseignant,
                niveau,
                nbEleves: parseInt(nbElevesText) || 0,
                dedoublee: libelle.toLowerCase().includes('dédoublée') || libelle.includes('1') || libelle.includes('2')
              };
              
              // Détecter les dispositifs
              if (libelle.includes('RASED') || libelle.includes('ULIS') || libelle.includes('UPE2A')) {
                dispositifs.push({
                  libelle: libelle,
                  type: libelle.includes('RASED') ? 'RASED' : 
                        libelle.includes('ULIS') ? 'ULIS ECOLE' : 'UPE2A',
                  nbEleves: parseInt(nbElevesText) || 0
                });
              } else {
                classes.push(classe);
              }
            }
          }
        }

        if (uai && (classes.length > 0 || dispositifs.length > 0)) {
          structures.push({
            uai,
            classes,
            dispositifs
          });
          console.log(`✅ ${uai} - ${classes.length} classes, ${dispositifs.length} dispositifs`);
        }
      } catch (err) {
        console.error(`❌ Erreur parsing ${filename}:`, err);
      }
    }

    console.log(`📊 Total: ${structures.length} structures extraites`);

    if (structures.length === 0) {
      return NextResponse.json({ 
        error: 'Aucune structure trouvée dans le ZIP. Vérifiez le format des fichiers HTML.' 
      }, { status: 400 });
    }

    // Vider la table et insérer toutes les structures en bulk
    console.log('🗑️ Vidage de la table ecoles_structure...');
    await supabase.from('ecoles_structure').delete().neq('id', 0);

    console.log('💾 Insertion des structures dans Supabase...');
    const batchSize = 50;
    let imported = 0;

    for (let i = 0; i < structures.length; i += batchSize) {
      const batch = structures.slice(i, i + batchSize);
      
      const structuresToInsert = batch.map(structure => ({
        uai: structure.uai,
        classes: structure.classes,
        dispositifs: structure.dispositifs,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('ecoles_structure')
        .insert(structuresToInsert);

      if (error) {
        console.error(`❌ Erreur insertion batch ${i / batchSize + 1}:`, error);
      } else {
        imported += batch.length;
        console.log(`✅ Batch ${i / batchSize + 1}: ${batch.length} structures`);
      }
    }

    console.log(`✅ Import terminé: ${imported} structures importées`);

    return NextResponse.json({
      success: true,
      message: `Import réussi: ${imported} structures importées`,
      count: imported
    });

  } catch (error: any) {
    console.error('❌ Erreur lors de l\'import:', error);
    return NextResponse.json({ 
      error: error.message || 'Erreur lors de l\'import' 
    }, { status: 500 });
  }
}
