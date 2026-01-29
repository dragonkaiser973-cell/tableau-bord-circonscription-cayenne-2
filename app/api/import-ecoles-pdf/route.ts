import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // S'assurer que le dossier data existe
    const dataDir = path.join(process.cwd(), 'data');
    try {
      await mkdir(dataDir, { recursive: true });
    } catch (error) {
      // Le dossier existe déjà
    }
    
    let data;
    
    if (type === 'identite') {
      data = await parseIdentiteZip(buffer);
      await writeFile(
        path.join(dataDir, 'ecoles_identite.json'),
        JSON.stringify(data, null, 2)
      );
    } else if (type === 'structure') {
      data = await parseStructureZip(buffer);
      await writeFile(
        path.join(dataDir, 'ecoles_structure.json'),
        JSON.stringify(data, null, 2)
      );
    }

    return NextResponse.json({ 
      success: true, 
      count: data.length,
      totalClasses: type === 'structure' ? data.reduce((sum: number, s: any) => sum + s.classes.length, 0) : 0
    });
  } catch (error) {
    console.error('Error importing ZIP:', error);
    return NextResponse.json({ error: 'Import failed: ' + error }, { status: 500 });
  }
}

async function parseIdentiteZip(buffer: Buffer) {
  const zip = new AdmZip(buffer);
  const zipEntries = zip.getEntries();
  const ecoles = [];

  for (const entry of zipEntries) {
    if (!entry.entryName.endsWith('.htm') && !entry.entryName.endsWith('.html')) {
      continue;
    }

    try {
      const content = entry.getData().toString('latin1');
      
      // Extraire tous les tableaux
      const tableMatches = content.matchAll(/<table[^>]*>(.*?)<\/table>/gs);
      const tables = Array.from(tableMatches).map(m => m[1]);
      
      const ecole: any = {};
      
      // MÉTHODE 1 : Format standard (tableaux d'identité)
      // TABLEAU 1 : Identification (toujours présent en position 0)
      if (tables.length > 0) {
        const rowMatches = tables[0].matchAll(/<tr[^>]*>(.*?)<\/tr>/gs);
        for (const rowMatch of rowMatches) {
          const cellMatches = Array.from(rowMatch[1].matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/gs));
          if (cellMatches.length >= 2) {
            const label = cellMatches[0][1].replace(/<[^>]+>/g, '').trim();
            const value = cellMatches[1][1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
            
            if (label.includes('Code UAI')) ecole.uai = value;
            else if (label.includes('Secteur')) ecole.secteur = value;
            else if (label.includes('cole')) ecole.type = value;
            else if (label.includes('Libell')) ecole.nom = value;
            else if (label.includes('SIRET')) ecole.siret = value;
            else if (label.includes('tat')) ecole.etat = value;
            else if (label.includes('ouverture')) ecole.dateOuverture = value;
          }
        }
      }
      
      // MÉTHODE 2 : Format alternatif (fichiers de structure avec info établissement)
      if (!ecole.uai || !ecole.nom) {
        const etablissementMatch = content.match(/tablissement<\/strong>\s*:\s*(\d{7}[A-Z])\s*-\s*([^-<\r\n]+)/i);
        if (etablissementMatch) {
          if (!ecole.uai) ecole.uai = etablissementMatch[1].trim();
          if (!ecole.nom) ecole.nom = etablissementMatch[2].trim();
        }
        
        const uaiHidden = content.match(/id="numeroUAI"[^>]*value="(\d{7}[A-Z])"/i);
        if (uaiHidden && !ecole.uai) {
          ecole.uai = uaiHidden[1];
        }
        
        const nomHidden = content.match(/id="nomEtablissement"[^>]*value="([^"]+)"/i);
        if (nomHidden && !ecole.nom) {
          ecole.nom = nomHidden[1].trim();
        }
      }
      
      // TABLEAU 2 : Localisation (toujours présent en position 1)
      if (tables.length > 1) {
        const rowMatches = tables[1].matchAll(/<tr[^>]*>(.*?)<\/tr>/gs);
        for (const rowMatch of rowMatches) {
          const cellMatches = Array.from(rowMatch[1].matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/gs));
          if (cellMatches.length >= 2) {
            const label = cellMatches[0][1].replace(/<[^>]+>/g, '').trim();
            const value = cellMatches[1][1].replace(/<[^>]+>/g, '').trim();
            if (label.includes('Commune')) ecole.commune = value;
          }
        }
      }
      
      // Extraire commune depuis le texte établissement si non trouvée
      if (!ecole.commune) {
        const etablissementMatch = content.match(/tablissement<\/strong>\s*:\s*\d{7}[A-Z]\s*-\s*[^-]+\s*-\s*([^<\r\n]+)/i);
        if (etablissementMatch) {
          ecole.commune = etablissementMatch[1].trim();
        }
      }
      
      // TABLEAU DIRECTION : Position variable (2 ou 3)
      // Trouver le tableau qui contient "Directeur" ou "Directrice"
      let directionTableIndex = -1;
      for (let i = 0; i < tables.length; i++) {
        if (tables[i].includes('Directeur') || tables[i].includes('Directrice')) {
          directionTableIndex = i;
          break;
        }
      }
      
      if (directionTableIndex >= 0) {
        const rowMatches = tables[directionTableIndex].matchAll(/<tr[^>]*>(.*?)<\/tr>/gs);
        for (const rowMatch of rowMatches) {
          const cellMatches = Array.from(rowMatch[1].matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/gs));
          if (cellMatches.length >= 2) {
            const label = cellMatches[0][1].replace(/<[^>]+>/g, '').trim();
            let value = cellMatches[1][1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ').replace(/&nbsp;/g, ' ');
            
            if (label.includes('Directeur') || label.includes('Directrice')) {
              // Extraire civilité et nom
              if (value.includes('Mme')) {
                ecole.civilite = 'Mme';
                ecole.directeur = value.replace('Mme', '').trim();
              } else if (value.includes('M.')) {
                ecole.civilite = 'M.';
                ecole.directeur = value.replace('M.', '').trim();
              } else {
                ecole.directeur = value;
              }
            } else if (label.includes('Adresse')) {
              ecole.adresse = value;
            } else if (label.includes('l phone') || label.includes('Téléphone')) {
              ecole.telephone = value;
            } else if (label.includes('Courriel')) {
              ecole.email = value;
            } else if (label === 'RAR' || label.includes('rattachement')) {
              // RAR = Collège de rattachement (parfois juste le nom)
              if (value && value.length > 3) {
                ecole.college = value;
              }
            }
          } else if (cellMatches.length === 1) {
            // Ligne sans label (souvent la ville après l'adresse)
            const value = cellMatches[0][1].replace(/<[^>]+>/g, '').trim().replace(/&nbsp;/g, ' ');
            if (/^973\d{2}/.test(value) && !ecole.ville) {
              ecole.ville = value;
            }
          }
        }
      }
      
      // Chercher le collège complet dans un tableau suivant (avec UAI complet)
      // Il y a souvent un tableau dédié au collège avec format: "9730091L - COLLEGE PAUL KAPEL 97305 CAYENNE CEDEX"
      if (!ecole.college || ecole.college.length < 10) {
        for (let i = directionTableIndex + 1; i < tables.length; i++) {
          const tableText = tables[i];
          // Chercher un pattern UAI - texte contenant COLLEGE
          const collegeMatch = tableText.match(/(\d{7}[A-Z]\s*-\s*[^<\r\n]{5,150}(?:COLLEGE|COLLÈGE|college|collège)[^<\r\n]{0,100})/i);
          if (collegeMatch) {
            let cleanCollege = collegeMatch[1]
              .replace(/<[^>]+>/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .replace(/\s+/g, ' ')
              .replace(/Présence d'une classe.*$/gi, '')
              .replace(/Non\s+Non$/gi, '')
              .trim();
            
            // Couper au premier retour à la ligne ou balise si présent
            const firstLine = cleanCollege.split(/[\r\n]+/)[0].trim();
            if (firstLine.length > 10) {
              ecole.college = firstLine;
              break;
            }
          }
        }
      }
      
      // Si toujours pas de collège, chercher juste le nom sans UAI
      if (!ecole.college || ecole.college.length < 5) {
        for (let i = directionTableIndex + 1; i < tables.length; i++) {
          const tableText = tables[i];
          // Pattern plus simple : juste "COLLEGE XXXX"
          const simpleMatch = tableText.match(/((?:COLLEGE|COLLÈGE|college|collège)\s+[A-Z][A-Za-z\s\-]{5,80})/i);
          if (simpleMatch) {
            let cleanCollege = simpleMatch[1]
              .replace(/<[^>]+>/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            
            if (cleanCollege.length > 5 && !cleanCollege.toLowerCase().includes('aucun')) {
              ecole.college = cleanCollege;
              break;
            }
          }
        }
      }
      
      // Valeurs par défaut
      ecole.secteur = ecole.secteur || '';
      ecole.siret = ecole.siret || '';
      ecole.etat = ecole.etat || '';
      ecole.commune = ecole.commune || '';
      ecole.civilite = ecole.civilite || '';
      ecole.directeur = ecole.directeur || '';
      ecole.adresse = ecole.adresse || '';
      ecole.ville = ecole.ville || '';
      ecole.telephone = ecole.telephone || '';
      ecole.email = ecole.email || `ce.${ecole.uai}@ac-guyane.fr`;
      ecole.dateOuverture = ecole.dateOuverture || '';
      ecole.college = ecole.college || '';

      if (ecole.uai && ecole.nom) {
        console.log(`✅ École extraite: ${ecole.nom} (${ecole.uai})`);
        if (ecole.college) {
          console.log(`   → Collège: ${ecole.college}`);
        } else {
          console.log(`   ⚠️ Pas de collège trouvé`);
        }
        ecoles.push(ecole);
      } else {
        console.log(`⚠️ École ignorée (UAI ou nom manquant): ${entry.entryName}`);
      }
    } catch (err) {
      console.error(`Error parsing ${entry.entryName}:`, err);
    }
  }

  return ecoles;
}

async function parseStructureZip(buffer: Buffer) {
  const zip = new AdmZip(buffer);
  const zipEntries = zip.getEntries();
  const structures = [];

  for (const entry of zipEntries) {
    if (!entry.entryName.endsWith('.htm') && !entry.entryName.endsWith('.html')) {
      continue;
    }

    try {
      const content = entry.getData().toString('latin1');
      
      // Extraire UAI
      const uaiMatch = content.match(/Application directeur.*?(\d{7}[A-Z])/);
      if (!uaiMatch) continue;

      const uai = uaiMatch[1];

      // Extraire les lignes de classes (avec javascript:visu)
      const visuLinesRegex = /<tr>(.*?javascript:visu.*?)<\/tr>/gs;
      const classes = [];
      let match;
      
      while ((match = visuLinesRegex.exec(content)) !== null) {
        const line = match[1];
        
        // Extraire le libellé depuis le lien
        const libelleMatch = line.match(/javascript:visu[^>]*>([^<]+)<\/a>/);
        if (!libelleMatch) continue;
        
        const libelle = libelleMatch[1].replace(/\s+/g, ' ').trim();
        
        // Extraire toutes les cellules <td>
        const cellMatches = Array.from(line.matchAll(/<td[^>]*>(.*?)<\/td>/gs));
        const cells = cellMatches.map(m => {
          let clean = m[1].replace(/<[^>]+>/g, ' ');
          clean = clean.replace(/\s+/g, ' ').trim();
          clean = clean.replace(/&nbsp;/g, '');
          return clean;
        });
        
        // Détecter le format de ligne
        // Format long (10+ cellules) : cellule 6 = enseignants, 7 = niveau, 8 = nb élèves
        // Format court (5 cellules) : cellule 1 = enseignants, 2 = niveau, 3 = nb élèves
        
        let enseignant = '';
        let niveau = '';
        let nbEleves = 0;
        
        if (cells.length >= 9) {
          // Format long (première ligne avec filtres)
          enseignant = cells[6] || '';
          niveau = cells[7] || '';
          const nbStr = cells[8] || '0';
          nbEleves = parseInt(nbStr.replace(/\D/g, '') || '0');
        } else if (cells.length >= 4) {
          // Format court (lignes normales)
          enseignant = cells[1] || '';
          niveau = cells[2] || '';
          const nbStr = cells[3] || '0';
          nbEleves = parseInt(nbStr.replace(/\D/g, '') || '0');
        } else {
          continue;
        }
        
        // Détecter si dédoublée
        const dedoublee = cells.join(' ').toLowerCase().includes('dédoublée') || 
                         cells.join(' ').toLowerCase().includes('dedoublee');
        
        if (libelle) {
          classes.push({
            libelle,
            enseignant: enseignant || 'Non renseigné',
            niveau: niveau || 'Multi-niveaux',
            nbEleves,
            dedoublee
          });
        }
      }

      // Extraire dispositifs (regroupements)
      const dispositifs: any[] = [];
      const regSection = content.match(/<h2>REGROUPEMENTS<\/h2>(.*?)(?:<h2>|<div class="panel-footer">|$)/s);
      if (regSection) {
        const regRows = regSection[1].matchAll(/<tr>(.*?)<\/tr>/gs);
        for (const regMatch of regRows) {
          const cells = Array.from(regMatch[1].matchAll(/<td[^>]*>(.*?)<\/td>/gs));
          
          if (cells.length >= 3) {
            // Cellule 0 = Libellé, Cellule 1 = Type, Cellule 2 = Nb élèves
            const libelle = cells[0][1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
            const type = cells[1][1].replace(/<[^>]+>/g, '').trim();
            const nbStr = cells[2][1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim();
            
            // Ignorer "Aucun élément trouvé"
            if (libelle && !libelle.toLowerCase().includes('aucun')) {
              const nbEleves = parseInt(nbStr.replace(/\D/g, '') || '0');
              
              dispositifs.push({
                libelle,
                type,
                nbEleves
              });
            }
          }
        }
      }

      if (classes.length > 0) {
        structures.push({
          uai,
          classes,
          dispositifs
        });
      }
    } catch (err) {
      console.error(`Error parsing ${entry.entryName}:`, err);
    }
  }

  return structures;
}
