import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ====================================================================
// FONCTIONS DE CALCUL (identiques au projet original)
// ====================================================================

function calculerStatistiquesCirconscription(data: any) {
  const ecoles = data.ecoles_structure || [];
  const enseignants = data.enseignants || [];
  
  let classesDedoublees = 0;
  let classesStandard = 0;
  let effectifsClassesDedoublees = 0;
  let effectifsClassesStandard = 0;
  
  ecoles.forEach((ecole: any) => {
    if (ecole.classes) {
      ecole.classes.forEach((classe: any) => {
        const effectif = classe.nbEleves || 0;
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
  
  const ensHorsCirco = enseignants.filter((e: any) => e.ecole_id !== 15);
  
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
    totalEffectifs,
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

function genererDonneesClassement(statistiques: any[]) {
  return statistiques
    .map(stat => ({
      uai: stat.uai,
      nom: stat.nom,
      effectif: stat.effectifs?.['Admis définitifs'] || stat.effectifs?.['Admis'] || 0
    }))
    .sort((a, b) => b.effectif - a.effectif);
}

// ====================================================================
// GET - Liste toutes les archives OU rÃ©cupÃ¨re une archive spÃ©cifique
// ====================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const annee = searchParams.get('annee');

    // CAS 1 : RÃ©cupÃ©rer une archive spÃ©cifique
    if (annee) {
      console.log(`ðŸ“– Chargement archive: ${annee}`);

      const { data, error } = await supabase
        .from('archives')
        .select('*')
        .eq('annee_scolaire', annee)
        .single();

      if (error || !data) {
        console.error('Erreur Supabase:', error);
        return NextResponse.json({ error: 'Archive non trouvÃ©e' }, { status: 404 });
      }

      console.log(`âœ… Archive trouvÃ©e: ${data.annee_scolaire}`);

      return NextResponse.json({
        anneeScolaire: data.annee_scolaire,
        dateArchivage: data.date_creation,
        version: data.version || '3.0',
        metadata: data.metadata || {},
        donnees_brutes: data.donnees_brutes || {},
        donnees_calculees: data.donnees_calculees || {}
      });
    }

    // CAS 2 : Lister toutes les archives
    const { data, error } = await supabase
      .from('archives')
      .select('annee_scolaire, date_creation, metadata')
      .order('annee_scolaire', { ascending: false });

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json({ archives: [] });
    }

    return NextResponse.json({ 
      archives: data?.map(a => a.annee_scolaire) || [] 
    });
  } catch (error) {
    console.error('Erreur lecture archives:', error);
    return NextResponse.json({ archives: [] });
  }
}

// ====================================================================
// POST - CrÃ©er une nouvelle archive COMPLÃˆTE depuis Supabase
// ====================================================================
export async function POST(request: NextRequest) {
  try {
    const { anneeScolaire } = await request.json();
    
    if (!anneeScolaire) {
      return NextResponse.json({ error: 'AnnÃ©e scolaire manquante' }, { status: 400 });
    }
    
    console.log(`📦 Début de l'archivage pour ${anneeScolaire}`);
    
    // ====================================================================
    // Ã‰TAPE 1 : CHARGER TOUTES LES DONNÃ‰ES DEPUIS SUPABASE
    // ====================================================================
    
    console.log('📥 Chargement des données depuis Supabase...');
    
    const [
      resEnseignants,
      resEvaluations,
      resEcoles,
      resStagiaires,
      resEvenementsData
    ] = await Promise.all([
      supabase.from('enseignants').select('*'),
      supabase.from('evaluations').select('*'),
      supabase.from('ecoles').select('*'),
      supabase.from('stagiaires_m2').select('*').eq('annee_scolaire', anneeScolaire),
      fetch(`${request.nextUrl.origin}/api/evenements`).then(r => r.json()).catch(() => [])
    ]);

    const enseignants = resEnseignants.data || [];
    const evaluations = resEvaluations.data || [];
    const ecoles = resEcoles.data || [];
    const stagiaires_m2 = resStagiaires.data || [];
    const evenements = Array.isArray(resEvenementsData) ? resEvenementsData : [];
    
    console.log(`✅ Données chargées:`);
    console.log(`   - ${enseignants.length} enseignants`);
    console.log(`   - ${evaluations.length} évaluations`);
    console.log(`   - ${ecoles.length} écoles`);
    console.log(`   - ${stagiaires_m2.length} stagiaires M2`);
    console.log(`   - ${evenements.length} événements`);
    
    // Charger directement depuis Supabase (plus fiable que fetch)
    console.log('📥 Chargement structures et stats depuis Supabase...');

    // Charger structures et stats depuis Supabase
const [resStructures, resStats] = await Promise.all([
  supabase.from('ecoles_structure').select('*'),
  supabase.from('statistiques_ecoles').select('*')
]);

const ecoles_structure = resStructures.data || [];
const statistiques_ecoles = resStats.data || [];

// Charger ecoles_identite depuis l'API (plus complet que table ecoles)
console.log('📥 Chargement ecoles_identite depuis API...');
let ecoles_identite = [];

try {
  // Essayer avec l'origine de la requête
  const baseUrl = request.nextUrl.origin;
  console.log(`Tentative fetch depuis: ${baseUrl}/api/ecoles-identite`);
  
  const identiteResponse = await fetch(`${baseUrl}/api/ecoles-identite`, {
    headers: { 'Accept': 'application/json' }
  });
  
  if (!identiteResponse.ok) {
    console.error(`Erreur API ecoles-identite: ${identiteResponse.status}`);
    throw new Error('API failed');
  }
  
  const data = await identiteResponse.json();
  ecoles_identite = Array.isArray(data) ? data : [];
  
} catch (error) {
  console.error('Erreur chargement ecoles_identite via API, fallback vers table Supabase:', error);
  
  // Fallback: charger depuis la table ecoles_identite
  const { data } = await supabase.from('ecoles_identite').select('*');
  ecoles_identite = data || [];
  console.log(`   - Fallback: ${ecoles_identite.length} identités chargées depuis Supabase`);
}

console.log(`   - ${ecoles_structure.length} structures chargées`);
console.log(`   - ${statistiques_ecoles.length} statistiques chargées`);
console.log(`   - ${Array.isArray(ecoles_identite) ? ecoles_identite.length : 0} identités chargées`);

    console.log(`   - ${ecoles_structure.length} structures chargées`);
    console.log(`   - ${statistiques_ecoles.length} statistiques chargées`);
    console.log(`   - ${ecoles_identite.length} identités chargées`);
    
    console.log(`   - ${ecoles_structure.length} structures`);
    console.log(`   - ${statistiques_ecoles.length} statistiques`);
    console.log(`   - ${ecoles_identite.length} identitÃ©s`);
    
    // ====================================================================
    // Ã‰TAPE 2 : CALCULER LES DONNÃ‰ES AGRÃ‰GÃ‰ES
    // ====================================================================
    
    console.log('ðŸ“Š Calcul des statistiques...');
    
    const sources = {
      enseignants,
      evaluations,
      ecoles_structure,
      statistiques_ecoles,
      stagiaires_m2,
      evenements,
      ecoles_identite
    };
    
    const statsCirconscription = calculerStatistiquesCirconscription(sources);
    const statsParNiveau = calculerStatistiquesParNiveau(statistiques_ecoles);
    const classementEcoles = genererDonneesClassement(statistiques_ecoles);
    
    const top5 = classementEcoles.slice(0, 5);
    const bottom5 = classementEcoles.slice(-5).reverse();
    
    // ====================================================================
    // Ã‰TAPE 3 : CONSTRUIRE L'ARCHIVE COMPLÃˆTE
    // ====================================================================
    
    const metadata = {
      source: 'Application Circonscription Cayenne 2',
      completude: {
        ecoles: ecoles_identite.length > 0 && ecoles_structure.length > 0,
        enseignants: enseignants.length > 0,
        evaluations: evaluations.length > 0,
        statistiques: statistiques_ecoles.length > 0,
        stagiaires: stagiaires_m2.length > 0,
        calendrier: evenements.length > 0
      },
      stats: {
        nombreEcoles: ecoles_identite.length,
        nombreClasses: statsCirconscription.nombreClasses,
        totalEffectifs: statsCirconscription.totalEffectifs,
        nombreEnseignants: enseignants.length,
        nombreStagiaires: stagiaires_m2.length,
        nombreEvaluations: evaluations.length,
        nombreEvenements: evenements.length
      }
    };
    
    console.log(`📊 Nombre d'évaluations chargées: ${evaluations.length}`);

const donnees_brutes = {
  // ...
      ecoles_identite,
      ecoles_structure,
      evaluations,
      statistiques_ecoles,
      stagiaires_m2,
      enseignants,
      evenements
    };
    
    const donnees_calculees = {
      pilotage: {
        indicateurs: {
          anneeScolaire,
          nombreClasses: statsCirconscription.nombreClasses,
          totalEffectifs: statsCirconscription.totalEffectifs,
          moyenneElevesParClasse: statsCirconscription.moyenneElevesParClasse
        },
        ressources_humaines: statsCirconscription.enseignants,
        top5_ecoles: top5,
        bottom5_ecoles: bottom5
      },
      circonscription: {
        statistiques_generales: {
          nombreEcoles: ecoles_identite.length,
          nombreEnseignants: enseignants.length,
          nombreClasses: statsCirconscription.nombreClasses,
          classesDedoublees: statsCirconscription.classesDedoublees,
          classesStandard: statsCirconscription.classesStandard,
          moyenneElevesParClasse: statsCirconscription.moyenneElevesParClasse,
          moyenneClassesDedoublees: statsCirconscription.moyenneClassesDedoublees,
          moyenneClassesStandard: statsCirconscription.moyenneClassesStandard
        }
      },
      statistiques: {
        totaux_par_niveau: statsParNiveau,
        classement_par_effectif: classementEcoles
      },
      enseignants: {
        total: enseignants.length,
        par_statut: {
          titulaires: statsCirconscription.enseignants.titulaires,
          stagiaires: statsCirconscription.enseignants.stagiaires,
          contractuels: statsCirconscription.enseignants.contractuels
        }
      },
      calendrier: {
        total_evenements: evenements.length,
        evenements_par_type: {
          vacances: evenements.filter((e: any) => e.type === 'vacances').length,
          pedagogique: evenements.filter((e: any) => e.type === 'pedagogique').length,
          administratif: evenements.filter((e: any) => e.type === 'administratif').length
        }
      }
    };
    
    console.log('âœ… Archive construite');
    
    // ====================================================================
    // Ã‰TAPE 4 : SAUVEGARDER DANS SUPABASE
    // ====================================================================
    
    const { data, error } = await supabase
      .from('archives')
      .insert({
        annee_scolaire: anneeScolaire,
        version: '3.0',
        metadata,
        donnees_brutes,
        donnees_calculees
      })
      .select()
      .single();

    if (error) {
      console.error('âŒ Erreur Supabase:', error);
      return NextResponse.json({ 
        error: error.message || 'Erreur lors de la sauvegarde' 
      }, { status: 500 });
    }
    
    console.log(`âœ… Archive sauvegardÃ©e dans Supabase pour ${anneeScolaire}`);
    
    return NextResponse.json({
      success: true,
      message: `Archive crÃ©Ã©e pour l'annÃ©e ${anneeScolaire}`,
      anneeScolaire,
      metadata,
      taille: {
        donnees_brutes: Object.keys(donnees_brutes).length,
        donnees_calculees: Object.keys(donnees_calculees).length
      }
    });
    
  } catch (error: any) {
    console.error('âŒ Erreur crÃ©ation archive:', error);
    return NextResponse.json({ 
      error: error.message || 'Erreur lors de la crÃ©ation de l\'archive' 
    }, { status: 500 });
  }
}

// ====================================================================
// DELETE - Supprimer une archive depuis Supabase
// ====================================================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const anneeScolaire = searchParams.get('annee');
    
    if (!anneeScolaire) {
      return NextResponse.json({ error: 'AnnÃ©e scolaire manquante' }, { status: 400 });
    }
    
    const { error } = await supabase
      .from('archives')
      .delete()
      .eq('annee_scolaire', anneeScolaire);

    if (error) {
      console.error('Erreur suppression:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Erreur suppression archive:', error);
    return NextResponse.json({ 
      error: error.message || 'Erreur lors de la suppression' 
    }, { status: 500 });
  }
}

