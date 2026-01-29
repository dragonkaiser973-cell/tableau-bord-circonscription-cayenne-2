import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { 
  createOrUpdateEcole,
  getEcoleByUai,
  createOrUpdateEvaluation, 
  createEnseignant,
  logSync 
} from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'trm' ou 'evaluations'

    if (!file) {
      return NextResponse.json(
        { message: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);

    if (type === 'evaluations') {
      return await importEvaluations(workbook, file.name);
    } else if (type === 'trm') {
      return await importTRM(workbook, file.name);
    } else {
      return NextResponse.json(
        { message: 'Type de fichier non reconnu' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Erreur lors de l\'importation:', error);
    return NextResponse.json(
      { message: 'Erreur lors de l\'importation: ' + error.message },
      { status: 500 }
    );
  }
}

async function importEvaluations(workbook: XLSX.WorkBook, filename: string) {
  try {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      defval: null,
      raw: true  // Garder les valeurs numériques brutes
    });

    console.log(`📊 Import évaluations: ${data.length} lignes à traiter`);

    let imported = 0;
    let errors = 0;
    const ecolesCache = new Set();
    const evaluationsToSave: any[] = [];

    // Créer d'abord toutes les écoles
    console.log('🏫 Création des écoles...');
    let ecoles_created = 0;
    for (const row of data as any[]) {
      if (row.uai && row.denomination && !ecolesCache.has(row.uai)) {
        createOrUpdateEcole({
          uai: row.uai,
          nom: row.denomination,
          sigle: row.sigle || '',
          commune: row.commune || '',
          rep_plus: row.repplus === 'REP+',
          ips: row.ips ? parseFloat(row.ips) : null
        });
        ecolesCache.add(row.uai);
        ecoles_created++;
      }
    }
    console.log(`✅ ${ecoles_created} écoles créées`);

    // Préparer toutes les évaluations en mémoire
    console.log('📝 Préparation des évaluations...');
    let sampleLogged = false;
    for (const row of data as any[]) {
      try {
        if (row.rentree && row.uai && row.classe && row.matiere && row.libelle) {
          const evalData = {
            rentree: parseInt(row.rentree),
            uai: row.uai,
            denomination: row.denomination,
            classe: row.classe,
            matiere: row.matiere,
            libelle: row.libelle,
            tx_groupe_1: row.tx_groupe_1 ? parseFloat(row.tx_groupe_1) : 0,
            tx_groupe_2: row.tx_groupe_2 ? parseFloat(row.tx_groupe_2) : 0,
            tx_groupe_3: row.tx_groupe_3 ? parseFloat(row.tx_groupe_3) : 0,
            tx_cir_groupe_1: row.tx_cir_groupe_1 ? parseFloat(row.tx_cir_groupe_1) : 0,
            tx_cir_groupe_2: row.tx_cir_groupe_2 ? parseFloat(row.tx_cir_groupe_2) : 0,
            tx_cir_groupe_3: row.tx_cir_groupe_3 ? parseFloat(row.tx_cir_groupe_3) : 0,
            tx_aca_groupe_1: row.tx_aca_groupe_1 ? parseFloat(row.tx_aca_groupe_1) : 0,
            tx_aca_groupe_2: row.tx_aca_groupe_2 ? parseFloat(row.tx_aca_groupe_2) : 0,
            tx_aca_groupe_3: row.tx_aca_groupe_3 ? parseFloat(row.tx_aca_groupe_3) : 0,
            ips: row.ips ? parseFloat(row.ips) : null,
            ips_cir: row.ips_cir ? parseFloat(row.ips_cir) : null
          };
          
          // Logger un exemple pour debug
          if (!sampleLogged && row.matiere === 'français') {
            console.log('📊 Exemple d\'évaluation importée:', {
              matiere: evalData.matiere,
              tx_groupe_3_raw: row.tx_groupe_3,
              tx_groupe_3_parsed: evalData.tx_groupe_3,
              type_raw: typeof row.tx_groupe_3,
              type_parsed: typeof evalData.tx_groupe_3
            });
            sampleLogged = true;
          }
          
          evaluationsToSave.push(evalData);
        }
      } catch (err: any) {
        errors++;
      }
    }

    // Sauvegarder par gros lots
    console.log(`💾 Sauvegarde de ${evaluationsToSave.length} évaluations...`);
    const batchSize = 500;
    for (let i = 0; i < evaluationsToSave.length; i += batchSize) {
      const batch = evaluationsToSave.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(evaluationsToSave.length / batchSize);
      
      console.log(`💾 Batch ${batchNum}/${totalBatches} (${batch.length} évaluations)`);
      
      for (const evaluation of batch) {
        createOrUpdateEvaluation(evaluation);
        imported++;
      }
      
      // Petite pause
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`✅ Import terminé: ${imported} évaluations, ${ecoles_created} écoles, ${errors} erreurs`);

    logSync('evaluations', 'success', `${imported} évaluations importées, ${ecoles_created} écoles, ${errors} erreurs`, filename);

    return NextResponse.json({
      message: `Import réussi: ${imported} évaluations importées`,
      imported,
      errors,
      ecoles_created
    });
  } catch (error: any) {
    console.error('❌ Erreur import évaluations:', error);
    logSync('evaluations', 'error', error.message, filename);
    throw error;
  }
}

async function importTRM(workbook: XLSX.WorkBook, filename: string) {
  try {
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Le fichier TRM a une structure complexe avec des sections par école
    // On doit le parser manuellement
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    let imported = 0;
    let errors = 0;
    let currentEcole: any = null;
    let currentDiscipline = '';
    const anneeScolaire = '2024-2025';

    for (let rowNum = 0; rowNum <= range.e.r; rowNum++) {
      try {
        // Lire la ligne
        const col3 = worksheet[XLSX.utils.encode_cell({ r: rowNum, c: 2 })]?.v; // Colonne C (école)
        const col4 = worksheet[XLSX.utils.encode_cell({ r: rowNum, c: 3 })]?.v; // Colonne D (discipline)
        const col5 = worksheet[XLSX.utils.encode_cell({ r: rowNum, c: 4 })]?.v; // Colonne E (individu)
        const col7 = worksheet[XLSX.utils.encode_cell({ r: rowNum, c: 6 })]?.v; // Colonne G (grade)
        const col8 = worksheet[XLSX.utils.encode_cell({ r: rowNum, c: 7 })]?.v; // Colonne H (Début OCC)
        const col9 = worksheet[XLSX.utils.encode_cell({ r: rowNum, c: 8 })]?.v; // Colonne I (Fin OCC)
        const col11 = worksheet[XLSX.utils.encode_cell({ r: rowNum, c: 10 })]?.v; // Colonne K (Q occ)
        const col12 = worksheet[XLSX.utils.encode_cell({ r: rowNum, c: 11 })]?.v; // Colonne L (Q dec)
        const col13 = worksheet[XLSX.utils.encode_cell({ r: rowNum, c: 12 })]?.v; // Colonne M (Apport)

        // Détecter une nouvelle école
        if (col3 && typeof col3 === 'string' && col3.includes('-')) {
          const parts = col3.split('-');
          if (parts.length >= 2) {
            const uai = parts[0].trim();
            const nom = parts.slice(1).join('-').trim();
            
            console.log(`🏫 École détectée: ${uai} - ${nom}`);
            
            // Créer ou récupérer l'école (y compris la circonscription)
            let ecole = getEcoleByUai(uai);
            if (!ecole) {
              createOrUpdateEcole({
                uai,
                nom,
                sigle: parts[1]?.split(' ')[0] || '',
                commune: 'CAYENNE',
                rep_plus: false,
                ips: null
              });
              ecole = getEcoleByUai(uai);
            }
            currentEcole = ecole;
            currentDiscipline = ''; // Réinitialiser la discipline pour la nouvelle école
            
            if (uai === '9730456H') {
              console.log(`✅ Circonscription trouvée, currentEcole:`, currentEcole);
            }
          }
        }

        // Détecter une discipline/spécialité
        // La discipline peut être sur la même ligne que l'enseignant ou sur une ligne séparée
        if (col4 && typeof col4 === 'string' && col4.length > 2) {
          const discipline = col4.trim().toUpperCase();
          // Exclure les en-têtes
          if (discipline !== 'DISCIPLINE' && discipline !== 'MS' && discipline !== 'GRADE') {
            currentDiscipline = col4.trim();
          }
        }

        // Détecter un enseignant
        if (col5 && typeof col5 === 'string' && col5.length > 3 && currentEcole) {
          const nom = col5.trim();
          
          // Exclure les en-têtes et valeurs invalides
          const exclusions = ['Individu', 'individu', 'INDIVIDU', 'MS', 'Grade', 'Discipline'];
          if (exclusions.includes(nom) || nom.toLowerCase().includes('début') || nom.toLowerCase().includes('fin')) {
            continue;
          }
          
          // Vérifier Q occ : si = 0, ignorer (poste non actif)
          if (col11 !== undefined && col11 !== null) {
            const qOcc = typeof col11 === 'number' ? col11 : parseFloat(String(col11).replace(',', '.'));
            if (!isNaN(qOcc) && qOcc === 0) {
              // Poste non mis en œuvre, on ignore cette ligne
              continue;
            }
          }
          
          // Parser le nom (peut être "NOM Prénom" ou juste "NOM")
          const nameParts = nom.split(' ');
          const nomFamille = nameParts[0];
          const prenom = nameParts.slice(1).join(' ') || '';
          
          // Vérifier que c'est bien un nom valide (au moins 2 caractères alphabétiques)
          if (nomFamille.length < 2 || !/[a-zA-ZÀ-ÿ]/.test(nomFamille)) {
            continue;
          }

          // Déterminer statut administratif depuis la discipline ET le grade
          let statutAdministratif = 'Autre';
          
          // Lire la discipline sur LA MÊME LIGNE que l'enseignant (col4)
          const disciplineLigne = col4 ? String(col4).trim() : '';
          
          // D'abord vérifier la discipline pour les stagiaires PE
          // IMPORTANT : Seuls les "PROFESSEUR DES ECOLES STAGIAIRE" sont des stagiaires
          if (disciplineLigne && 
              disciplineLigne.toUpperCase().includes('PROFESSEUR') && 
              disciplineLigne.toUpperCase().includes('ECOLES') &&
              disciplineLigne.toUpperCase().includes('STAGIAIRE')) {
            statutAdministratif = 'Stagiaire';
            console.log(`🎓 STAGIAIRE détecté: ${nomFamille} ${prenom} - Discipline: ${disciplineLigne}`);
          }
          // Sinon utiliser le grade
          else if (col7) {
            const grade = String(col7);
            
            // Codes 6151, 6152, 6153 = Professeurs des écoles Titulaires
            if (grade === '6151' || grade === '6152' || grade === '6153') {
              statutAdministratif = 'Titulaire';
            }
            // Codes 40XX/41XX = Stagiaires (ancienne méthode, au cas où)
            else if (grade.startsWith('40') || grade.startsWith('41')) {
              statutAdministratif = 'Stagiaire';
              console.log(`🎓 STAGIAIRE détecté (grade 40/41): ${nomFamille} ${prenom} - Grade: ${grade}`);
            }
            // Codes 78XX = Contractuels
            else if (grade.startsWith('78')) {
              statutAdministratif = 'Contractuel';
            }
          }
          
          // Si on n'a pas de discipline sur cette ligne, utiliser currentDiscipline pour le champ discipline
          const disciplineFinale = disciplineLigne || currentDiscipline;

          // Calculer l'ancienneté basée sur Début OCC
          let anciennete = 0;
          if (col8) {
            try {
              let dateDebut: Date;
              if (typeof col8 === 'number') {
                // Format Excel (nombre de jours depuis 1900)
                dateDebut = new Date((col8 - 25569) * 86400 * 1000);
              } else {
                dateDebut = new Date(col8);
              }
              
              if (!isNaN(dateDebut.getTime())) {
                const maintenant = new Date();
                const diffMs = maintenant.getTime() - dateDebut.getTime();
                anciennete = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
                if (anciennete < 0) anciennete = 0;
              }
            } catch (e) {
              console.error('Erreur parsing date:', e);
            }
          }

          // Déterminer le mode d'affectation basé sur Fin OCC
          let modeAffectation = 'Indéterminé';
          if (col9) {
            try {
              let dateFin: Date;
              if (typeof col9 === 'number') {
                dateFin = new Date((col9 - 25569) * 86400 * 1000);
              } else {
                dateFin = new Date(col9);
              }
              
              if (!isNaN(dateFin.getTime())) {
                // Si fin = 9999-12-31 ou après 2100 → Définitive
                if (dateFin.getFullYear() >= 2100) {
                  modeAffectation = 'Affectation Définitive';
                }
                // Si fin = 31/08/2026 ou entre 2025-2027 → Provisoire
                else if (dateFin.getFullYear() >= 2025 && dateFin.getFullYear() <= 2027) {
                  modeAffectation = 'Affectation Provisoire';
                }
              }
            } catch (e) {
              console.error('Erreur parsing date fin:', e);
            }
          }

          // Extraire la quotité depuis Apport (colonne M)
          let quotite = 1.0;
          if (col13 && typeof col13 === 'number') {
            quotite = col13;
          } else if (col13 && typeof col13 === 'string') {
            // Parfois c'est une chaîne "0.5" ou "0,5"
            const parsed = parseFloat(col13.replace(',', '.'));
            if (!isNaN(parsed)) {
              quotite = parsed;
            }
          }

          // Détecter les décharges depuis Q dec (colonne L)
          let decharge = '';
          if (col12 !== undefined && col12 !== null) {
            const qDec = typeof col12 === 'number' ? col12 : parseFloat(String(col12).replace(',', '.'));
            if (!isNaN(qDec) && qDec > 0) {
              // Il y a une décharge
              const pourcentageDecharge = (qDec * 100).toFixed(0);
              decharge = `Décharge ${pourcentageDecharge}%`;
            }
          }

          // Créer l'enseignant
          const enseignantData = {
            ecole_id: currentEcole.id,
            annee_scolaire: anneeScolaire,
            civilite: '',
            nom: nomFamille,
            prenom: prenom,
            statut: statutAdministratif,
            anciennete: anciennete,
            code_grade: col7 ? String(col7) : '',
            discipline: disciplineFinale || '',
            type_poste: '',
            niveau_classe: '',
            classe_specialisee: '',
            effectif_classe: 0,
            quotite: quotite,
            decharge_binome: decharge,
            nom_decharge_binome: '',
            mode_affectation: modeAffectation,
            individu: nom
          };
          
          if (nomFamille === 'LOUIS') {
            console.log(`👤 Création LOUIS OLIVIER:`, enseignantData);
          }
          
          createEnseignant(enseignantData);

          imported++;
        }
      } catch (err: any) {
        console.error('Erreur ligne TRM:', rowNum, err.message);
        errors++;
      }
    }

    logSync('trm', 'success', `${imported} enseignants importés, ${errors} erreurs`, filename);

    return NextResponse.json({
      message: `Import réussi: ${imported} enseignants importés`,
      imported,
      errors
    });
  } catch (error: any) {
    console.error('Erreur import TRM:', error);
    logSync('trm', 'error', error.message, filename);
    throw error;
  }
}
