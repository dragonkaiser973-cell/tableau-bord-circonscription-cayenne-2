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
    const decoder = new TextDecoder('iso-8859-1'); // ONDE utilise ISO-8859-1
    const content = decoder.decode(arrayBuffer);
    
    const root = parse(content);
    const ecoleData: any = {};

    // Extraire toutes les tables
    const tables = root.querySelectorAll('table');
    
    // TABLE 1 : Informations générales (UAI, Secteur, Type, Nom, SIRET, État, Date ouverture)
    if (tables[0]) {
      const rows = tables[0].querySelectorAll('tr');
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length === 2) {
          const label = cells[0].text.trim();
          const value = cells[1].text.trim();

          if (label.includes('UAI')) ecoleData.uai = value;
          else if (label.includes('Secteur')) ecoleData.secteur = value;
          else if (label.includes('École') || label.includes('Ecole')) ecoleData.type = value;
          else if (label.includes('Libellé') || label.includes('Libelle')) ecoleData.nom = value;
          else if (label.includes('SIRET')) ecoleData.siret = value;
          else if (label.includes('État') || label.includes('Etat')) ecoleData.etat = value;
          else if (label.toLowerCase().includes('ouverture')) ecoleData.date_ouverture = value;
        }
      }
    }

    // TABLE 2 : Localisation (Commune, etc.)
    if (tables[1]) {
      const rows = tables[1].querySelectorAll('tr');
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length === 2) {
          const label = cells[0].text.trim();
          const value = cells[1].text.trim();
          if (label.includes('Commune')) ecoleData.commune = value;
        }
      }
    }

    // TABLE 4 : Direction et contact (Directeur, Adresse, Téléphone, Email)
    if (tables[3]) {
      const rows = tables[3].querySelectorAll('tr');
      let adresse = '';
      let ville = '';
      
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 1) {
          const label = cells[0]?.text.trim() || '';
          const value = cells.length === 2 ? cells[1].text.trim() : '';

          if (label.includes('Directeur')) {
            // Extraire civilité + nom
            const fullText = value.replace(/\s+/g, ' ').trim();
            if (fullText.startsWith('M.') || fullText.startsWith('Mme')) {
              ecoleData.civilite = fullText.startsWith('M.') ? 'M.' : 'Mme';
              ecoleData.directeur = fullText.replace(/^(M\.|Mme)\s*/, '');
            } else {
              ecoleData.directeur = fullText;
            }
          }
          else if (label.includes('Adresse')) {
            adresse = value;
          }
          else if (label === '' && value.match(/^\d{5}/)) {
            // Ligne vide avec code postal + ville
            ville = value;
          }
          else if (label.includes('Téléphone') || label.includes('Telephone')) {
            ecoleData.telephone = value;
          }
          else if (label.includes('Courriel') || label.includes('Mél') || label.includes('Email')) {
            ecoleData.email = value;
          }
        }
      }
      
      ecoleData.adresse = adresse;
      ecoleData.ville = ville;
    }

    // TABLE 5 : Collège de secteur
    if (tables[4]) {
      const cells = tables[4].querySelectorAll('td');
      if (cells.length > 0) {
        const text = cells[0].text.trim();
        // Format: "9730247F - COLLEGE JUSTIN CATAYEE 97327"
        if (text.includes('-')) {
          ecoleData.college = text.split('-')[1].trim();
        } else {
          ecoleData.college = text;
        }
      }
    }

    // Validation
    if (!ecoleData.uai) {
      return NextResponse.json({ 
        error: 'UAI non trouvé dans le fichier HTML' 
      }, { status: 400 });
    }

    // Valeurs par défaut pour champs manquants
    ecoleData.ville = ecoleData.ville || '';
    ecoleData.telephone = ecoleData.telephone || '';
    ecoleData.email = ecoleData.email || '';
    ecoleData.college = ecoleData.college || '';
    ecoleData.directeur = ecoleData.directeur || '';
    ecoleData.civilite = ecoleData.civilite || '';
    ecoleData.adresse = ecoleData.adresse || '';
    ecoleData.commune = ecoleData.commune || '';

    console.log(`✅ Import identité: ${ecoleData.uai} - ${ecoleData.nom}`);

    // Insérer ou mettre à jour dans Supabase
    const { error } = await supabase
      .from('ecoles_identite')
      .upsert({
        ...ecoleData,
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
      message: `${ecoleData.nom} importée`,
      uai: ecoleData.uai
    });

  } catch (error: any) {
    console.error('❌ Erreur import identité:', error);
    return NextResponse.json({ 
      error: error.message || 'Erreur lors de l\'import' 
    }, { status: 500 });
  }
}
