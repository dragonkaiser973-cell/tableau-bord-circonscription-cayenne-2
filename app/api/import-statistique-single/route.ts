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

    // Extraire UAI du contenu texte
    const allText = root.text;
    const uaiMatch = allText.match(/\b\d{7}[A-Z]\b/);
    
    if (!uaiMatch) {
      return NextResponse.json({ 
        error: 'UAI non trouvé dans le fichier HTML' 
      }, { status: 400 });
    }

    const uai = uaiMatch[0];

    // Extraire le nom de l'école (chercher après UAI dans le texte)
    const nomMatch = allText.match(/\d{7}[A-Z]\s*-\s*([A-ZÀ-ÿ\s']+)/);
    const nom = nomMatch ? nomMatch[1].trim() : '';

    const tables = root.querySelectorAll('table');
    
    const effectifs: any = {};
    const repartitions: any = {};
    const totaux: any = {};

    // TABLEAU 2 : Effectifs
    if (tables.length > 1) {
      const rows = tables[1].querySelectorAll('tr');
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length === 2) {
          const label = cells[1].text.trim();
          const value = parseInt(cells[0].text.trim()) || 0;
          
          effectifs[label] = value;
        }
      }
    }

    // TABLEAU 4 : Répartitions par niveau
    if (tables.length > 3) {
      const rows = tables[3].querySelectorAll('tr');
      for (let i = 1; i < rows.length; i++) {  // Skip header
        const cells = rows[i].querySelectorAll('td');
        if (cells.length === 2) {
          const niveau = cells[0].text.trim();
          const nb = parseInt(cells[1].text.trim()) || 0;
          
          // Séparer les totaux des répartitions
          if (niveau.includes('CYCLE') || niveau === 'Total') {
            totaux[niveau] = nb;
          } else if (['TPS', 'PS', 'MS', 'GS', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'].includes(niveau)) {
            repartitions[niveau] = nb;
          }
        }
      }
    }

    console.log(`✅ Import stats: ${uai} - ${nom} - ${totaux.Total || 0} élèves`);

    // Insérer ou mettre à jour dans Supabase
    const { error } = await supabase
      .from('statistiques_ecoles')
      .upsert({
        uai,
        nom,
        effectifs,
        repartitions,
        totaux,
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
      message: `Statistiques ${nom || uai} importées`,
      uai,
      totalEleves: totaux.Total || 0
    });

  } catch (error: any) {
    console.error('❌ Erreur import statistiques:', error);
    return NextResponse.json({ 
      error: error.message || 'Erreur lors de l\'import' 
    }, { status: 500 });
  }
}
