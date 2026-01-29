import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

// Fonction pour nettoyer le texte HTML
function cleanText(text: string): string {
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/\s+/g, ' ');
  return text.trim();
}

// Fonction pour parser un tableau HTML
function parseTable(tableHtml: string): string[][] {
  const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
  const rows = [];
  let match;

  while ((match = rowRegex.exec(tableHtml)) !== null) {
    const rowHtml = match[1];
    const cellRegex = /<t[dh][^>]*>(.*?)<\/t[dh]>/gis;
    const cells = [];
    let cellMatch;

    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells.push(cleanText(cellMatch[1]));
    }

    if (cells.length > 0 && cells.some(c => c)) {
      rows.push(cells);
    }
  }

  return rows;
}

// Fonction pour parser un fichier HTML ONDE
function parseOndeFile(content: string) {
  // Extraire UAI et nom de l'école
  const schoolMatch = content.match(/Application.*?(\d{7}\w)\s*-\s*([^<\r\n]+)/is);
  
  let uai = null;
  let schoolName = "École inconnue";
  
  if (schoolMatch) {
    uai = schoolMatch[1].trim();
    const fullName = schoolMatch[2].trim();
    const nameParts = fullName.split('-');
    schoolName = nameParts[0].trim();
  }

  const result: any = {
    uai: uai,
    nom: schoolName,
    effectifs: {},
    repartitions: {},
    totaux: {}
  };

  // Extraire le tableau des effectifs
  const effectifsMatch = content.match(/<h2[^>]*>Les effectifs<\/h2>(.*?)<\/table>/is);
  
  if (effectifsMatch) {
    const tableHtml = effectifsMatch[1];
    const data = parseTable(tableHtml);
    
    for (const row of data) {
      if (row.length >= 2) {
        try {
          const value = parseInt(row[0]);
          const key = row[1];
          if (!isNaN(value)) {
            result.effectifs[key] = value;
          }
        } catch (e) {
          // Ignore
        }
      }
    }
  }

  // Extraire le tableau des répartitions
  const repartitionsMatch = content.match(/<h2[^>]*>Les répartitions<\/h2>(.*?)<\/table>/is);
  
  if (repartitionsMatch) {
    const tableHtml = repartitionsMatch[1];
    const data = parseTable(tableHtml);
    
    for (const row of data) {
      if (row.length >= 2) {
        const niveau = row[0];
        
        // Skip les en-têtes et lignes vides
        if (!niveau || niveau.includes('Répartition') || !row[1]) {
          continue;
        }
        
        try {
          const effectif = parseInt(row[1]);
          
          if (!isNaN(effectif)) {
            // Séparer les cycles des niveaux individuels
            if (niveau.toUpperCase().includes('CYCLE') || niveau.toUpperCase() === 'TOTAL') {
              result.totaux[niveau] = effectif;
            } else {
              result.repartitions[niveau] = effectif;
            }
          }
        } catch (e) {
          // Ignore
        }
      }
    }
  }

  // Déterminer le type d'école
  const niveaux = new Set(Object.keys(result.repartitions));
  const maternelleNiveaux = new Set(['PS', 'MS', 'GS']);
  const elementaireNiveaux = new Set(['CP', 'CE1', 'CE2', 'CM1', 'CM2']);
  
  const hasMaternelle = [...niveaux].some(n => maternelleNiveaux.has(n));
  const hasElementaire = [...niveaux].some(n => elementaireNiveaux.has(n));
  
  let typeEcole = 'E.PU';
  if (hasMaternelle && hasElementaire) {
    typeEcole = 'E.P.PU'; // École Primaire
  } else if (hasMaternelle) {
    typeEcole = 'E.M.PU'; // École Maternelle
  } else if (hasElementaire) {
    typeEcole = 'E.E.PU'; // École Élémentaire
  }
  
  result.type = typeEcole;
  result.nom = `${typeEcole} ${schoolName}`;
  
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Vérifier que c'est un ZIP
    if (!file.name.endsWith('.zip')) {
      return NextResponse.json(
        { error: 'Le fichier doit être un ZIP' },
        { status: 400 }
      );
    }

    // Lire le contenu du ZIP
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    let zip;
    try {
      zip = new AdmZip(buffer);
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Fichier ZIP invalide ou corrompu' },
        { status: 400 }
      );
    }

    const zipEntries = zip.getEntries();
    const allSchools = [];

    console.log(`Fichiers trouvés dans le ZIP: ${zipEntries.length}`);

    for (const entry of zipEntries) {
      // Ignorer les dossiers et fichiers non HTML
      if (entry.isDirectory || !entry.entryName.match(/\.html?$/i)) {
        continue;
      }

      try {
        // Extraire le contenu du fichier HTML
        const content = entry.getData().toString('latin1'); // windows-1252 ~ latin1
        
        const schoolData = parseOndeFile(content);
        
        if (schoolData.uai) {
          allSchools.push(schoolData);
          console.log(`✓ ${schoolData.nom} (${schoolData.uai}) - ${Object.keys(schoolData.repartitions).length} niveaux`);
        } else {
          console.log(`⚠ ${entry.entryName} - UAI non trouvé`);
        }
      } catch (error: any) {
        console.error(`✗ Erreur avec ${entry.entryName}:`, error.message);
      }
    }

    // Sauvegarder dans le fichier JSON dans data/
    const dataDir = path.join(process.cwd(), 'data');
    const outputPath = path.join(dataDir, 'statistiques_ecoles.json');
    await fs.writeFile(outputPath, JSON.stringify(allSchools, null, 2), 'utf-8');

    console.log(`\n✅ ${allSchools.length} écoles extraites`);

    return NextResponse.json({
      success: true,
      message: 'Statistiques importées avec succès',
      count: allSchools.length
    });

  } catch (error: any) {
    console.error('Erreur import statistiques:', error);
    return NextResponse.json(
      { error: 'Erreur serveur: ' + error.message },
      { status: 500 }
    );
  }
}

