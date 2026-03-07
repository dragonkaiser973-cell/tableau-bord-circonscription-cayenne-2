import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { parse } from 'node-html-parser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Lire le fichier HTML
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder('iso-8859-1');
    const content = decoder.decode(arrayBuffer);
    
    const root = parse(content);

    // Extraire UAI du contenu texte (regex)
    const allText = root.text;
    const uaiMatch = allText.match(/\b\d{7}[A-Z]\b/);
    
    if (!uaiMatch) {
      return NextResponse.json({ 
        error: 'UAI non trouvé dans le fichier HTML' 
      }, { status: 400 });
    }

    const uai = uaiMatch[0];

    // Extraire les classes du tableau 2
    const tables = root.querySelectorAll('table');
    const classes: any[] = [];
    const dispositifs: any[] = [];

    // TABLE 1 : Classes (index 1)
    if (tables.length > 1) {
      const rows = tables[1].querySelectorAll('tr');
      
      // Skip header (première ligne)
      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        
        if (cells.length >= 4) {
          const libelle = cells[0].text.trim();
          const enseignant = cells[1].text.trim();
          
          let niveau = '';
          let nbEleves = 0;
          
          const col2 = cells[2]?.text.trim() || '';
          const col3 = cells[3]?.text.trim() || '';
          
          if (/^(TPS|PS|MS|GS|CP|CE1|CE2|CM1|CM2)/.test(col2)) {
            niveau = col2;
            nbEleves = parseInt(col3) || 0;
          } else if (/^(TPS|PS|MS|GS|CP|CE1|CE2|CM1|CM2)/.test(col3)) {
            niveau = col3;
            nbEleves = parseInt(cells[4]?.text.trim() || '0') || 0;
          } else {
            niveau = col3;
            nbEleves = parseInt(cells[4]?.text.trim() || '0') || 0;
          }

          if (libelle) {
            classes.push({
              libelle,
              enseignant: enseignant || '',
              niveau,
              nbEleves,
              dedoublee: libelle.toLowerCase().includes('dédoublée') || 
                        libelle.toLowerCase().includes('dedoublee') ||
                        libelle.match(/\s[12]$/) !== null
            });
          }
        }
      }
    }

    // TABLE 2 : Dispositifs (index 2)
    // Format ONDE : [Libellé, Type (ULIS ECOLE / UPE2A / RASED / ...), Nb d'élèves]
    if (tables.length > 2) {
      const rows = tables[2].querySelectorAll('tr');

      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        const col0 = cells[0]?.text.trim() || '';

        // Ignorer l'en-tête et la ligne "Aucun élément trouvé"
        if (!col0 || col0.toLowerCase().includes('dispositif') || col0.toLowerCase().includes('aucun')) {
          continue;
        }

        const libelle = col0;
        const typeRaw = (cells[1]?.text.trim() || '').toUpperCase();
        const nbEleves = parseInt(cells[2]?.text.trim() || '0') || 0;

        // Normaliser le type
        let type = 'AUTRE';
        if (typeRaw.includes('ULIS')) type = 'ULIS ECOLE';
        else if (typeRaw.includes('UPE2A')) type = 'UPE2A';
        else if (typeRaw.includes('RASED')) type = 'RASED';
        else if (typeRaw.includes('SEGPA')) type = 'SEGPA';
        else if (typeRaw) type = typeRaw;

        dispositifs.push({ libelle, type, nbEleves });
      }
    }

    console.log(`✅ Import structure: ${uai} - ${classes.length} classes, ${dispositifs.length} dispositifs`);

    // Insérer ou mettre à jour dans Supabase
    const { error } = await supabase
      .from('ecoles_structure')
      .upsert({
        uai,
        classes,
        dispositifs,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'uai' });

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json({ 
        error: `Erreur base de données: ${error.message}` 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${classes.length} classes importées`,
      uai,
      classesCount: classes.length,
      dispositifsCount: dispositifs.length
    });

  } catch (error: any) {
    console.error('❌ Erreur import structure:', error);
    return NextResponse.json({ 
      error: error.message || 'Erreur lors de l\'import' 
    }, { status: 500 });
  }
}
