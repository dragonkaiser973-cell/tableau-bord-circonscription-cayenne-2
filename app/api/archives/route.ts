import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');
const dataDir = path.join(process.cwd(), 'data');
const archivesDir = path.join(dataDir, 'archives');

// S'assurer que le dossier archives existe
async function ensureArchivesDir() {
  try {
    await mkdir(archivesDir, { recursive: true });
  } catch (error) {
    // Le dossier existe déjà
  }
}

// Fonction pour lire un fichier JSON en toute sécurité
async function readJSONFile(filePath: string): Promise<any> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

// Calculer les statistiques agrégées depuis les données brutes
function calculerStatistiquesCirconscription(data: any) {
  const ecoles = data.ecoles_structure || [];
  const statistiques = data.statistiques_ecoles || [];
  const enseignants = data.enseignants || [];
  
  // Calcul du nombre de classes dédoublées et standard
  let classesDedoublees = 0;
  let classesStandard = 0;
  let effectifsClassesDedoublees = 0;
  let effectifsClassesStandard = 0;
  
  ecoles.forEach((ecole: any) => {
    if (ecole.classes) {
      ecole.classes.forEach((classe: any) => {
        // CORRECTION: Utiliser nbEleves (pas effectif)
        const effectif = classe.nbEleves || 0;
        
        // CORRECTION: Se baser sur la propriété dedoublee, pas sur l'effectif
        if (classe.dedoublee === true) {
          classesDedoublees++;
          effectifsClassesDedoublees += effectif;
        } else {
          classesStandard++;
          effectifsClassesStandard += effectif;
        }
      });
    }
  });
  
  const totalClasses = classesDedoublees + classesStandard;
  const totalEffectifs = effectifsClassesDedoublees + effectifsClassesStandard;
  
  // Comptage des enseignants par statut (HORS circonscription)
  const ensHorsCirco = enseignants.filter((e: any) => {
    // CORRECTION: ecole_id 15 = circonscription
    return e.ecole_id !== 15;
  });
  
  // CORRECTION: Comparaison insensible à la casse pour les statuts
  const titulaires = ensHorsCirco.filter((e: any) => 
    e.statut && e.statut.toUpperCase() === 'TITULAIRE'
  ).length;
  const stagiaires = ensHorsCirco.filter((e: any) => 
    e.statut && e.statut.toUpperCase() === 'STAGIAIRE'
  ).length;
  const contractuels = ensHorsCirco.filter((e: any) => 
    e.statut && e.statut.toUpperCase() === 'CONTRACTUEL'
  ).length;
  
  return {
    nombreEcoles: ecoles.length,
    nombreClasses: totalClasses,
    classesDedoublees,
    classesStandard,
    totalEffectifs: totalEffectifs,
    moyenneElevesParClasse: totalClasses > 0 ? Math.round((totalEffectifs / totalClasses) * 10) / 10 : 0,
    moyenneClassesDedoublees: classesDedoublees > 0 ? Math.round((effectifsClassesDedoublees / classesDedoublees) * 10) / 10 : 0,
    moyenneClassesStandard: classesStandard > 0 ? Math.round((effectifsClassesStandard / classesStandard) * 10) / 10 : 0,
    enseignants: {
      total: ensHorsCirco.length,
      titulaires,
      stagiaires,
      contractuels,
      pctTitulaires: ensHorsCirco.length > 0 ? Math.round((titulaires / ensHorsCirco.length) * 100) : 0
    }
  };
}

// Calculer les statistiques par niveau
function calculerStatistiquesParNiveau(statistiques: any[]) {
  const niveaux = ['PS', 'MS', 'GS', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'];
  const totaux: any = {};
  
  niveaux.forEach(niveau => {
    totaux[niveau] = 0;
  });
  
  statistiques.forEach((stat: any) => {
    if (stat.repartitions) {
      Object.keys(stat.repartitions).forEach(niveau => {
        if (totaux[niveau] !== undefined) {
          totaux[niveau] += stat.repartitions[niveau];
        }
      });
    }
  });
  
  return totaux;
}

// Générer les données pour les graphiques de classement
function genererDonneesClassement(statistiques: any[]) {
  return statistiques
    .map(stat => ({
      uai: stat.uai,
      nom: stat.nom,
      effectif: stat.effectifs['Admis définitifs'] || stat.effectifs['Admis'] || 0
    }))
    .sort((a, b) => b.effectif - a.effectif);
}

// GET - Liste toutes les archives disponibles
export async function GET() {
  try {
    await ensureArchivesDir();
    
    const files = await readdir(archivesDir);
    const archives = files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
      .sort()
      .reverse(); // Plus récent en premier
    
    return NextResponse.json({ archives });
  } catch (error) {
    console.error('Erreur lecture archives:', error);
    return NextResponse.json({ archives: [] });
  }
}

// POST - Créer une nouvelle archive COMPLÈTE
export async function POST(request: NextRequest) {
  try {
    const { anneeScolaire } = await request.json();
    
    if (!anneeScolaire) {
      return NextResponse.json({ error: 'Année scolaire manquante' }, { status: 400 });
    }
    
    await ensureArchivesDir();
    
    console.log(`📦 Début de l'archivage pour ${anneeScolaire}`);
    
    // ====================================================================
    // ÉTAPE 1 : LIRE TOUS LES FICHIERS SOURCES
    // ====================================================================
    
    const sources = {
      // Fichiers dans public/
      ecoles_identite: await readJSONFile(path.join(publicDir, 'ecoles_identite.json')),
      ecoles_structure: await readJSONFile(path.join(publicDir, 'ecoles_structure.json')),
      evaluations_public: await readJSONFile(path.join(publicDir, 'evaluations.json')),
      statistiques_ecoles: await readJSONFile(path.join(publicDir, 'statistiques_ecoles.json')),
      stagiaires_m2: await readJSONFile(path.join(publicDir, 'stagiaires_m2.json')),
      
      // Fichiers dans data/
      enseignants_bruts: await readJSONFile(path.join(dataDir, 'enseignants.json')),
      ecoles_db: await readJSONFile(path.join(dataDir, 'ecoles.json')),
      evaluations_data: await readJSONFile(path.join(dataDir, 'evaluations.json')),
      evenements: await readJSONFile(path.join(dataDir, 'evenements.json'))
    };
    
    // Fonction pour corriger l'encodage UTF-8 mal interprété
    function fixUTF8(text: string): string {
      if (!text) return text;
      return text
        .replace(/Ã‰/g, 'É')
        .replace(/Ã©/g, 'é')
        .replace(/Ã /g, 'à')
        .replace(/Ã¨/g, 'è')
        .replace(/Ã´/g, 'ô')
        .replace(/Ã»/g, 'û')
        .replace(/Ã§/g, 'ç')
        .replace(/lÃ©/g, 'lé');
    }
    
    // Corriger l'encodage dans ecoles_identite
    if (sources.ecoles_identite && Array.isArray(sources.ecoles_identite)) {
      sources.ecoles_identite = sources.ecoles_identite.map((ecole: any) => ({
        ...ecole,
        type: fixUTF8(ecole.type || ''),
        nom: fixUTF8(ecole.nom || ''),
        directeur: fixUTF8(ecole.directeur || ''),
        adresse: fixUTF8(ecole.adresse || '')
      }));
    }
    
    // IMPORTANT: Reproduire la logique de getEnseignants() qui ajoute ecole_nom
    let enseignants = (sources.enseignants_bruts || []).map((e: any) => {
      const ecole = (sources.ecoles_db || []).find((ec: any) => ec.id === e.ecole_id);
      return {
        ...e,
        ecole_nom: ecole ? ecole.nom : '',
        uai: ecole ? ecole.uai : ''
      };
    });
    
    // Fusionner les évaluations (data/ a priorité pour l'IPS, public/ pour le reste)
    const evaluations = sources.evaluations_data || sources.evaluations_public || [];
    
    // Utiliser ces enseignants enrichis partout
    sources.enseignants = enseignants;
    sources.evaluations = evaluations;
    
    // Enrichir ecoles_structure avec les noms et infos depuis ecoles.json et ecoles_identite
    const ecolesStructureEnrichies = (sources.ecoles_structure || []).map((ecole: any) => {
      // Trouver le nom depuis ecoles.json (data/)
      const ecoleDB = (sources.ecoles_db || []).find((edb: any) => edb.uai === ecole.uai);
      
      // Trouver les infos depuis ecoles_identite (public/)
      const identite = sources.ecoles_identite?.find((ei: any) => ei.uai === ecole.uai);
      
      return {
        ...ecole,
        nom: ecoleDB?.nom || identite?.nom || ecole.uai,
        commune: ecoleDB?.commune || identite?.commune || 'N/A',
        type: identite?.type || ecoleDB?.sigle || 'N/A'
      };
    });
    
    // Enrichir ecoles_identite OU le construire s'il est vide
    let ecolesIdentiteEnrichies = [];
    
    if (sources.ecoles_identite && sources.ecoles_identite.length > 0) {
      // Si on a ecoles_identite, l'enrichir (garder TOUTES les infos)
      ecolesIdentiteEnrichies = sources.ecoles_identite.map((ei: any) => {
        const ecoleDB = (sources.ecoles_db || []).find((edb: any) => edb.uai === ei.uai);
        return {
          ...ei, // ← GARDER TOUT (directeur, adresse, téléphone, etc.)
          nom: ei.nom || ecoleDB?.nom || ei.uai,
          commune: ei.commune || ecoleDB?.commune || 'N/A',
          type: ei.type || ecoleDB?.sigle || 'École publique' // Type déjà corrigé par fixUTF8
        };
      });
      console.log(`   - ${ecolesIdentiteEnrichies.length} écoles identité enrichies (AVEC directeur, adresse, etc.)`);
    } else {
      // Sinon, construire depuis ecoles_structure et ecoles_db
      console.log(`   - ecoles_identite vide, génération automatique depuis ecoles_structure + ecoles_db`);
      
      const uaisUniques = new Set<string>();
      
      // Récupérer tous les UAIs depuis ecoles_structure
      (sources.ecoles_structure || []).forEach((es: any) => {
        if (es.uai) uaisUniques.add(es.uai);
      });
      
      // Récupérer tous les UAIs depuis ecoles_db
      (sources.ecoles_db || []).forEach((edb: any) => {
        if (edb.uai) uaisUniques.add(edb.uai);
      });
      
      // Construire ecoles_identite depuis ces UAIs
      ecolesIdentiteEnrichies = Array.from(uaisUniques).map((uai: string) => {
        const ecoleStruct = (sources.ecoles_structure || []).find((es: any) => es.uai === uai);
        const ecoleDB = (sources.ecoles_db || []).find((edb: any) => edb.uai === uai);
        
        // Déterminer le type d'école
        let type = '';
        const sigle = ecoleDB?.sigle || '';
        const nomEcole = ecoleDB?.nom || ecoleStruct?.nom || '';
        
        if (sigle === 'E.M.PU' || nomEcole.includes('E.M.PU')) {
          type = 'Maternelle publique';
        } else if (sigle === 'E.E.PU' || nomEcole.includes('E.E.PU')) {
          type = 'Élémentaire publique';
        } else if (sigle === 'E.P.PU' || nomEcole.includes('E.P.PU')) {
          type = 'Primaire publique';
        } else if (sigle === 'E.P.PR' || nomEcole.includes('E.P.PR')) {
          type = 'Primaire privée';
        } else {
          type = ecoleStruct?.type || sigle || 'École publique';
        }
        
        return {
          uai: uai,
          secteur: 'SECTEUR PUBLIC',
          type: type,
          nom: ecoleDB?.nom || ecoleStruct?.nom || uai,
          siret: '',
          etat: 'ETABLISSEMENT OUVERT',
          dateOuverture: '',
          commune: ecoleDB?.commune || ecoleStruct?.commune || 'N/A',
          civilite: '',
          directeur: '',
          adresse: '',
          ville: '',
          telephone: '',
          email: '',
          college: ''
        };
      });
    }

    console.log('✅ Fichiers sources lus');
    console.log(`   - ${enseignants.length} enseignants avec ecole_nom enrichi`);
    console.log(`   - ${evaluations.length} évaluations chargées`);
    
    // Vérifier IPS
    const evalAvecIPS = evaluations.filter((e: any) => e.ips);
    console.log(`   - ${evalAvecIPS.length} évaluations avec IPS`);
    console.log(`   - ${ecolesStructureEnrichies.length} écoles avec structure enrichie`);
    
    // ====================================================================
    // ÉTAPE 2 : GÉNÉRER LES DONNÉES CALCULÉES
    // ====================================================================
    
    // Remplacer par les versions enrichies dans sources
    sources.ecoles_structure = ecolesStructureEnrichies;
    sources.ecoles_identite = ecolesIdentiteEnrichies;
    
    // Statistiques de la circonscription
    const statsCirconscription = calculerStatistiquesCirconscription(sources);
    
    // Statistiques par niveau
    const statsParNiveau = calculerStatistiquesParNiveau(sources.statistiques_ecoles || []);
    
    // Classement des écoles
    const classementEcoles = genererDonneesClassement(sources.statistiques_ecoles || []);
    
    // Top 5 et Bottom 5 avec noms enrichis
    const top5 = classementEcoles.slice(0, 5).map((e: any) => {
      const ecoleDB = (sources.ecoles_db || []).find((edb: any) => edb.uai === e.uai);
      const ecoleStruct = ecolesStructureEnrichies.find((es: any) => es.uai === e.uai);
      return {
        ...e,
        nom: ecoleDB?.nom || ecoleStruct?.nom || e.nom
      };
    });
    const bottom5 = classementEcoles.slice(-5).reverse().map((e: any) => {
      const ecoleDB = (sources.ecoles_db || []).find((edb: any) => edb.uai === e.uai);
      const ecoleStruct = ecolesStructureEnrichies.find((es: any) => es.uai === e.uai);
      return {
        ...e,
        nom: ecoleDB?.nom || ecoleStruct?.nom || e.nom
      };
    });
    
    console.log('✅ Données calculées générées');
    
    // ====================================================================
    // ÉTAPE 3 : CRÉER ecoles_identite si vide
    // ====================================================================
    
    let ecolesIdentite = sources.ecoles_identite;
    
    if (!ecolesIdentite || ecolesIdentite.length === 0) {
      console.log('⚠️  ecoles_identite vide, génération depuis statistiques_ecoles');
      ecolesIdentite = (sources.statistiques_ecoles || []).map((stat: any) => ({
        uai: stat.uai,
        nom: stat.nom,
        commune: stat.nom.includes('CACAO') || stat.nom.includes('DUCHANGE') ? 'ROURA' : 'CAYENNE',
        type: stat.type
      }));
    }
    
    // ====================================================================
    // ÉTAPE 4 : CONSTRUIRE L'ARCHIVE COMPLÈTE
    // ====================================================================
    
    const archiveData = {
      // Métadonnées
      anneeScolaire,
      dateArchivage: new Date().toISOString(),
      version: '3.0',
      
      // Métadonnées de complétude
      metadata: {
        source: 'Application Circonscription Cayenne 2',
        completude: {
          ecoles: (ecolesIdentite?.length || 0) > 0 && (sources.ecoles_structure?.length || 0) > 0,
          enseignants: (sources.enseignants?.length || 0) > 0,
          evaluations: (sources.evaluations?.length || 0) > 0,
          statistiques: (sources.statistiques_ecoles?.length || 0) > 0,
          stagiaires: (sources.stagiaires_m2?.length || 0) > 0,
          calendrier: (sources.evenements?.length || 0) > 0
        },
        stats: {
          nombreEcoles: ecolesIdentite?.length || 0,
          nombreClasses: statsCirconscription.nombreClasses,
          totalEffectifs: statsCirconscription.totalEffectifs,
          nombreEnseignants: sources.enseignants?.length || 0,
          nombreStagiaires: sources.stagiaires_m2?.length || 0,
          nombreEvaluations: sources.evaluations?.length || 0,
          nombreEvenements: sources.evenements?.length || 0
        }
      },
      
      // ================================================================
      // DONNÉES BRUTES (fichiers sources ENRICHIS)
      // ================================================================
      donnees_brutes: {
        ecoles_identite: ecolesIdentiteEnrichies || [],
        ecoles_structure: ecolesStructureEnrichies || [],
        evaluations: sources.evaluations || [],
        statistiques_ecoles: sources.statistiques_ecoles || [],
        stagiaires_m2: sources.stagiaires_m2 || [],
        enseignants: sources.enseignants || [],
        evenements: sources.evenements || []
      },
      
      // ================================================================
      // DONNÉES CALCULÉES (pour affichage direct)
      // ================================================================
      donnees_calculees: {
        // Vue PILOTAGE
        pilotage: {
          indicateurs: {
            anneeScolaire,
            nombreClasses: statsCirconscription.nombreClasses,
            totalEffectifs: statsCirconscription.totalEffectifs,
            moyenneElevesParClasse: statsCirconscription.moyenneElevesParClasse,
            tauxReussite: 82.3 // TODO: Calculer depuis évaluations
          },
          evolution_effectifs: [
            { annee: '2022-2023', effectif: 3150 },
            { annee: '2023-2024', effectif: 3280 },
            { annee: '2024-2025', effectif: 3420 },
            { annee: anneeScolaire, effectif: statsCirconscription.totalEffectifs }
          ],
          ressources_humaines: statsCirconscription.enseignants,
          top5_ecoles: top5,
          bottom5_ecoles: bottom5
        },
        
        // Vue CIRCONSCRIPTION
        circonscription: {
          statistiques_generales: {
            nombreEcoles: ecolesIdentiteEnrichies?.length || 0,
            nombreEnseignants: sources.enseignants?.length || 0,
            nombreClasses: statsCirconscription.nombreClasses,
            classesDedoublees: statsCirconscription.classesDedoublees,
            classesStandard: statsCirconscription.classesStandard,
            moyenneElevesParClasse: statsCirconscription.moyenneElevesParClasse,
            moyenneClassesDedoublees: statsCirconscription.moyenneClassesDedoublees,
            moyenneClassesStandard: statsCirconscription.moyenneClassesStandard
          },
          repartition_par_type: {
            'E.E.PU': ecolesIdentiteEnrichies?.filter((e: any) => {
              const type = e.type || '';
              return type.includes('Élémentaire') || type.includes('lÃ©mentaire') || type === 'E.E.PU';
            }).length || 0,
            'E.M.PU': ecolesIdentiteEnrichies?.filter((e: any) => {
              const type = e.type || '';
              return type.includes('Maternelle') || type === 'E.M.PU';
            }).length || 0,
            'E.P.PU': ecolesIdentiteEnrichies?.filter((e: any) => {
              const type = e.type || '';
              return type.includes('Primaire') || type === 'E.P.PU';
            }).length || 0
          },
          // PERSONNEL DE CIRCONSCRIPTION (ecole_id = 15)
          personnel_ien: (sources.enseignants || []).filter((e: any) => 
            e.ecole_id === 15
          ),
          // STATS PAR STATUT (pour graphique camembert, HORS circonscription)
          stats_par_statut: (sources.enseignants || [])
            .filter((e: any) => e.ecole_id !== 15)
            .reduce((acc: any, e: any) => {
              const statut = e.statut || 'Non renseigné';
              acc[statut] = (acc[statut] || 0) + 1;
              return acc;
            }, {}),
          // STATS PAR ÉCOLE (pour graphique en BARRES, HORS circonscription)
          stats_par_ecole: (sources.enseignants || [])
            .filter((e: any) => e.ecole_id !== 15)
            .reduce((acc: any, e: any) => {
              const ecoleNom = e.ecole_nom || 'Non renseigné';
              acc[ecoleNom] = (acc[ecoleNom] || 0) + 1;
              return acc;
            }, {}),
          // GRAPHIQUE IPS (barres)
          graphique_ips: (sources.ecoles_structure || [])
            .map((ecole: any) => {
              // Trouver l'IPS depuis evaluations par UAI
              const evalEcole = (sources.evaluations || []).find((e: any) => 
                e.uai === ecole.uai && e.ips
              );
              
              // Trouver le nom depuis ecoles enrichies (déjà contient nom, commune, type)
              return {
                nom: ecole.nom || 'École inconnue',
                uai: ecole.uai,
                ips: evalEcole?.ips ? Math.round(evalEcole.ips * 10) / 10 : null
              };
            })
            .filter((e: any) => e.ips !== null)
            .sort((a: any, b: any) => (b.ips || 0) - (a.ips || 0)),
          // LISTE ÉCOLES COMPLÈTE (avec nom, commune, nb enseignants et IPS)
          liste_ecoles_complete: ecolesStructureEnrichies.map((ecole: any) => {
            // Trouver l'école dans ecoles_db pour avoir l'ID
            const ecoleDB = (sources.ecoles_db || []).find((edb: any) => edb.uai === ecole.uai);
            
            // Compter UNIQUEMENT les enseignants de CETTE école
            const enseignantsEcole = (sources.enseignants || []).filter((e: any) => {
              // Méthode 1: Par ID d'école (le plus fiable)
              if (ecoleDB && e.ecole_id === ecoleDB.id) {
                return true;
              }
              // Méthode 2: Par nom d'école (exact)
              if (e.ecole_nom && ecole.nom && e.ecole_nom === ecole.nom) {
                return true;
              }
              // Méthode 3: Par UAI
              if (e.uai && ecole.uai && e.uai === ecole.uai) {
                return true;
              }
              return false;
            });
            
            // Trouver l'IPS depuis evaluations par UAI
            const evalEcole = (sources.evaluations || []).find((e: any) => 
              e.uai === ecole.uai && e.ips
            );
            
            // ecole a déjà nom, commune, type depuis l'enrichissement
            return {
              uai: ecole.uai,
              nom: ecole.nom || 'N/A',
              commune: ecole.commune || 'N/A',
              type: ecole.type || 'N/A',
              nb_enseignants: enseignantsEcole.length,
              nb_classes: ecole.classes?.length || 0,
              ips: evalEcole?.ips ? Math.round(evalEcole.ips * 10) / 10 : null
            };
          })
        },
        
        // Vue STATISTIQUES
        statistiques: {
          totaux_par_niveau: statsParNiveau,
          classement_par_effectif: classementEcoles,
          distribution_effectifs: (sources.statistiques_ecoles || []).map((stat: any) => ({
            nom: stat.nom,
            effectif: stat.effectifs['Admis définitifs'] || stat.effectifs['Admis'] || 0,
            type: stat.type
          }))
        },
        
        // Vue ENSEIGNANTS
        enseignants: {
          total: sources.enseignants?.length || 0,
          par_statut: {
            titulaires: statsCirconscription.enseignants.titulaires,
            stagiaires: statsCirconscription.enseignants.stagiaires,
            contractuels: statsCirconscription.enseignants.contractuels
          },
          par_ecole: {} // TODO: Calculer si besoin
        },
        
        // Vue CALENDRIER
        calendrier: {
          total_evenements: sources.evenements?.length || 0,
          evenements_par_type: {
            vacances: (sources.evenements || []).filter((e: any) => e.type === 'vacances').length,
            pedagogique: (sources.evenements || []).filter((e: any) => e.type === 'pedagogique').length,
            administratif: (sources.evenements || []).filter((e: any) => e.type === 'administratif').length
          }
        }
      }
    };
    
    // ====================================================================
    // ÉTAPE 5 : SAUVEGARDER L'ARCHIVE
    // ====================================================================
    
    const archivePath = path.join(archivesDir, `${anneeScolaire}.json`);
    await writeFile(archivePath, JSON.stringify(archiveData, null, 2), 'utf-8');
    
    console.log(`✅ Archive créée : ${archivePath}`);
    console.log(`📊 Taille : ${JSON.stringify(archiveData).length} bytes`);
    
    return NextResponse.json({
      success: true,
      message: `Archive créée pour l'année ${anneeScolaire}`,
      anneeScolaire,
      metadata: archiveData.metadata,
      taille: {
        donnees_brutes: Object.keys(archiveData.donnees_brutes).length,
        donnees_calculees: Object.keys(archiveData.donnees_calculees).length
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erreur création archive:', error);
    return NextResponse.json({ 
      error: error.message || 'Erreur lors de la création de l\'archive' 
    }, { status: 500 });
  }
}

// DELETE - Supprimer une archive
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const anneeScolaire = searchParams.get('annee');
    
    if (!anneeScolaire) {
      return NextResponse.json({ error: 'Année scolaire manquante' }, { status: 400 });
    }
    
    const archivePath = path.join(archivesDir, `${anneeScolaire}.json`);
    const fs = require('fs');
    
    if (fs.existsSync(archivePath)) {
      fs.unlinkSync(archivePath);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Archive non trouvée' }, { status: 404 });
    }
    
  } catch (error: any) {
    console.error('Erreur suppression archive:', error);
    return NextResponse.json({ 
      error: error.message || 'Erreur lors de la suppression' 
    }, { status: 500 });
  }
}
