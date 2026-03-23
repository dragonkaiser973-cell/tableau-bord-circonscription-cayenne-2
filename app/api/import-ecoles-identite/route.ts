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

            // Nettoyage des caractères spéciaux liés à l'encodage des fichiers ONDE
            // Les fichiers HTM ONDE utilisent des caractères accentués qui peuvent être
            // mal décodés. On utilise des comparaisons robustes (includes partiel).

            if (label.includes('UAI')) {
              // ✅ "Code UAI" → uai
              ecoleData.uai = value;

            } else if (label.includes('Secteur') && !label.includes('scolaire')) {
              // ✅ "Secteur" → PUBLIC ou PRIVÉ
              ecoleData.secteur = value;

            } else if (label.includes('cole') && !label.includes('UAI') && !label.includes('scolaire')) {
              // ✅ CORRECTION : "École" (label = '?cole' après décodage) → type de l'école
              // Remplace l'ancien : label.includes('Type') qui ne matchait jamais
              ecoleData.type = value;
              // Déduire le sigle depuis le type
              if (!ecoleData.sigle) {
                const typeUpper = value.toUpperCase();
                if (typeUpper.includes('MATERNELLE')) {
                  ecoleData.sigle = 'E.M.PU';
                } else if (typeUpper.includes('LEMENTAIRE')) {
                  ecoleData.sigle = 'E.E.PU';
                } else if (typeUpper.includes('PRIMAIRE')) {
                  ecoleData.sigle = 'E.P.PU';
                } else {
                  ecoleData.sigle = 'E.PU';
                }
              }

            } else if (label.includes('Libell') && !ecoleData.nom) {
              // ✅ CORRECTION : "Libellé" (label = 'Libell?' après décodage) → nom de l'école
              // Remplace l'ancien : label.includes('Nom') qui ne matchait jamais
              ecoleData.nom = value;

            } else if (label.includes('SIRET')) {
              // ✅ "N° SIRET" → siret
              ecoleData.siret = value;

            } else if (label.includes('tat') && !label.includes('Candidat')) {
              // ✅ "État" (label = '?tat') → état de l'établissement
              ecoleData.etat = value;

            } else if (label.toLowerCase().includes('ouverture')) {
              // ✅ "Date d'ouverture" → date_ouverture
              ecoleData.date_ouverture = value;

            } else if (label.includes('Commune')) {
              // ✅ "Commune" → commune
              ecoleData.commune = value;

            } else if (label.includes('Civilit')) {
              // ✅ "Civilité" → civilite (Mme / M.)
              ecoleData.civilite_directeur = value;

            } else if ((label.includes('Directeur') || label.includes('Directrice')) && !label.includes('Civilit')) {
              // ✅ CORRECTION : capture aussi "Directrice" (pas seulement "Directeur")
              // Nettoyage des retours à la ligne et espaces multiples dans la valeur
              const dirValue = value
                .replace(/[\r\n\t]+/g, ' ')
                .replace(/\s{2,}/g, ' ')
                .trim();
              ecoleData.directeur = dirValue;

            } else if (label.includes('Adresse')) {
              // ✅ "Adresse" → adresse
              ecoleData.adresse = value;

            } else if (label.includes('Ville')) {
              // ✅ "Ville" → ville (code postal + ville)
              ecoleData.ville = value;

            } else if (label.includes('l') && label.includes('phone')) {
              // ✅ CORRECTION robuste : "Téléphone" (label = 'T?l?phone') → telephone
              // Remplace : label.includes('Téléphone') || label.includes('Telephone')
              // qui pouvait échouer selon l'encodage
              ecoleData.telephone = value;

            } else if (label.includes('Courriel') || label.includes('Mél') || label.includes('Email')) {
              // ✅ CORRECTION : "Courriel" est le label réel dans les fichiers ONDE
              // Remplace l'ancien : label.includes('Mél') || label.includes('Email')
              // qui ne matchait jamais car le label est "Courriel"
              ecoleData.email = value;

            } else if (label.includes('Coll') && label.includes('ge')) {
              // ✅ "Collège" de secteur → college (via RAR ou secteur scolaire)
              ecoleData.college = value;

            } else if (label.includes('Circonscription')) {
              // ✅ Bonus : capturer la circonscription de rattachement
              ecoleData.circonscription = value;

            } else if (label.includes('ZUS')) {
              // ✅ Bonus : capturer la zone urbaine sensible
              ecoleData.zus = value;
            }
          }
        }

        if (ecoleData.uai) {
          ecoles.push(ecoleData);
          console.log(`✅ ${ecoleData.uai} - ${ecoleData.nom || '⚠️ Sans nom'} (${ecoleData.commune || '?'})`);
        } else {
          console.warn(`⚠️ Fichier ignoré (pas d'UAI): ${filename}`);
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
      count: imported,
      ecoles: ecoles.map(e => ({ uai: e.uai, nom: e.nom, commune: e.commune, type: e.type }))
    });

  } catch (error: any) {
    console.error('❌ Erreur lors de l\'import:', error);
    return NextResponse.json({ 
      error: error.message || 'Erreur lors de l\'import' 
    }, { status: 500 });
  }
}
