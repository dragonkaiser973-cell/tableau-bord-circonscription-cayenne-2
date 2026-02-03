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

    console.log('📂 Import statistiques ONDE - Lecture du ZIP:', file.name);

    // Lire le contenu du ZIP
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const statistiques: any[] = [];

    // Parser chaque fichier HTML dans le ZIP
    for (const [filename, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir || (!filename.endsWith('.htm') && !filename.endsWith('.html'))) {
        continue;
      }

      try {
        const content = await zipEntry.async('text');
        const root = parse(content);

        let uai = '';
        let nom = '';
        const effectifs: any = {};
        const repartitions: any = {};
        const totaux: any = {};

        // Extraire les données des tableaux
        const rows = root.querySelectorAll('tr');

        for (const row of rows) {
          const cells = row.querySelectorAll('td');

          if (cells.length === 2) {
            const label = cells[0].text.trim();
            const value = cells[1].text.trim();

            // Données générales
            if (label.includes('UAI')) {
              uai = value;
            } else if (label.includes('Nom') && uai) {
              nom = value;
            }
            // Effectifs (Inscrits, Admis, Radiés, etc.)
            else if (label.includes('Inscrit') && !label.includes('non')) {
              effectifs['Inscrits'] = parseInt(value) || 0;
            } else if (label.includes('Admissible')) {
              effectifs['Admissible'] = parseInt(value) || 0;
            } else if (label.includes('Admis') && !label.includes('accepté') && !label.includes('définitif')) {
              effectifs['Admis'] = parseInt(value) || 0;
            } else if (label.includes('Admis accepté')) {
              effectifs['Admis accepté'] = parseInt(value) || 0;
            } else if (label.includes('Admis définitifs')) {
              effectifs['Admis définitifs'] = parseInt(value) || 0;
            } else if (label.includes('Radiés') || label.includes('Radies')) {
              effectifs['Radiés'] = parseInt(value) || 0;
            } else if (label.includes('répartis') && !label.includes('non')) {
              effectifs['répartis'] = parseInt(value) || 0;
            } else if (label.includes('bloqué')) {
              effectifs['bloqué'] = parseInt(value) || 0;
            } else if (label.includes('attente d\'INE')) {
              effectifs['en attente d\'INE'] = parseInt(value) || 0;
            }
          }

          // Répartitions par niveau (PS, MS, GS, CP, CE1, etc.)
          if (cells.length >= 2) {
            const niveau = cells[0]?.text.trim() || '';
            const nb = cells[1]?.text.trim() || '';

            if (['TPS', 'PS', 'MS', 'GS', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'].includes(niveau)) {
              repartitions[niveau] = parseInt(nb) || 0;
            }

            // Totaux par cycle
            if (niveau.includes('CYCLE I')) {
              totaux['CYCLE I'] = parseInt(nb) || 0;
            } else if (niveau.includes('CYCLE II')) {
              totaux['CYCLE II'] = parseInt(nb) || 0;
            } else if (niveau.includes('CYCLE III')) {
              totaux['CYCLE III'] = parseInt(nb) || 0;
            } else if (niveau.includes('Total') && nb && !niveau.includes('CYCLE')) {
              totaux['Total'] = parseInt(nb) || 0;
            }
          }
        }

        if (uai && Object.keys(effectifs).length > 0) {
          statistiques.push({
            uai,
            nom,
            effectifs,
            repartitions,
            totaux
          });
          console.log(`✅ ${uai} - ${nom} - ${totaux.Total || 0} élèves`);
        }
      } catch (err) {
        console.error(`❌ Erreur parsing ${filename}:`, err);
      }
    }

    console.log(`📊 Total: ${statistiques.length} statistiques extraites`);

    if (statistiques.length === 0) {
      return NextResponse.json({ 
        error: 'Aucune statistique trouvée dans le ZIP. Vérifiez le format des fichiers HTML.' 
      }, { status: 400 });
    }

    // Vider la table et insérer toutes les statistiques en bulk
    console.log('🗑️ Vidage de la table statistiques_ecoles...');
    await supabase.from('statistiques_ecoles').delete().neq('id', 0);

    console.log('💾 Insertion des statistiques dans Supabase...');
    const batchSize = 50;
    let imported = 0;

    for (let i = 0; i < statistiques.length; i += batchSize) {
      const batch = statistiques.slice(i, i + batchSize);
      
      const statsToInsert = batch.map(stat => ({
        uai: stat.uai,
        nom: stat.nom,
        effectifs: stat.effectifs,
        repartitions: stat.repartitions,
        totaux: stat.totaux,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('statistiques_ecoles')
        .insert(statsToInsert);

      if (error) {
        console.error(`❌ Erreur insertion batch ${i / batchSize + 1}:`, error);
      } else {
        imported += batch.length;
        console.log(`✅ Batch ${i / batchSize + 1}: ${batch.length} statistiques`);
      }
    }

    console.log(`✅ Import terminé: ${imported} statistiques importées`);

    return NextResponse.json({
      success: true,
      message: `Import réussi: ${imported} statistiques importées`,
      count: imported
    });

  } catch (error: any) {
    console.error('❌ Erreur lors de l\'import:', error);
    return NextResponse.json({ 
      error: error.message || 'Erreur lors de l\'import' 
    }, { status: 500 });
  }
}
