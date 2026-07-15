import { supabase } from './supabase';

// ====================================================================
// LOGIQUE D'ARCHIVAGE PARTAGÉE
// Utilisée par la route POST /api/archives (admin) ET par
// /api/changer-annee, qui l'appelle directement (sans passer par HTTP)
// pour éviter tout problème d'authentification sur l'appel interne.
// ====================================================================

// ── Fonctions de calcul (identiques au projet original) ──────────────

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

export type ResultatArchivage =
  | { success: true; anneeScolaire: string; metadata: any; taille: { donnees_brutes: number; donnees_calculees: number } }
  | { success: false; error: string };

// ── Fonction principale ──────────────────────────────────────────────
// `origin` sert à charger ecoles_identite via l'API (fallback Supabase).
export async function creerArchiveComplete(
  anneeScolaire: string,
  origin: string
): Promise<ResultatArchivage> {
  if (!anneeScolaire) {
    return { success: false, error: 'Année scolaire manquante' };
  }

  console.log(`📦 Début de l'archivage pour ${anneeScolaire}`);
  console.log('📥 Chargement des données depuis Supabase...');

  const [
    resEnseignants,
    resStagiaires,
    resEvenementsData,
    resBoussoleSessions,
    resBoussoleDeposits,
    resPlanFormation,
    resPlanFormationSessions,
    resPlanFormationFormateurs
  ] = await Promise.all([
    supabase.from('enseignants').select('*'),
    supabase.from('stagiaires_m2').select('*').eq('annee_scolaire', anneeScolaire),
    supabase.from('evenements').select('*').order('date_debut', { ascending: true }),
    supabase.from('boussole_sessions').select('*').order('date_formation', { ascending: false }),
    supabase.from('boussole_deposits').select('*'),
    supabase.from('plan_formation').select('*').order('ordre', { ascending: true }),
    supabase.from('plan_formation_sessions').select('*').order('ordre', { ascending: true }),
    supabase.from('plan_formation_formateurs').select('*').order('ordre', { ascending: true })
  ]);

  // Charger TOUTES les évaluations avec pagination
  console.log('📥 Chargement évaluations avec pagination...');
  let evaluations: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('evaluations')
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Erreur chargement évaluations page', page, error);
      break;
    }

    if (data && data.length > 0) {
      evaluations = evaluations.concat(data);
      console.log(`  Page ${page + 1}: ${data.length} évaluations (total: ${evaluations.length})`);
      page++;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  const enseignants = resEnseignants.data || [];
  const stagiaires_m2 = resStagiaires.data || [];
  const boussole_sessions = resBoussoleSessions.data || [];
  const boussole_deposits = resBoussoleDeposits.data || [];
  const plan_formation = resPlanFormation.data || [];
  const plan_formation_sessions = resPlanFormationSessions.data || [];
  const plan_formation_formateurs = resPlanFormationFormateurs.data || [];
  // Adapter le format Supabase (snake_case) → camelCase attendu dans l'archive
  const evenements = (resEvenementsData.data || []).map((e: any) => ({
    id: e.id,
    titre: e.titre,
    type: e.type,
    dateDebut: e.date_debut,
    dateFin: e.date_fin,
    lieu: e.lieu || ''
  }));

  console.log(`✅ Données chargées:`);
  console.log(`   - ${enseignants.length} enseignants`);
  console.log(`   - ${evaluations.length} évaluations`);
  console.log(`   - ${stagiaires_m2.length} stagiaires M2`);
  console.log(`   - ${evenements.length} événements`);

  // Charger structures, stats et outils directeurs (prévisions + 108h) depuis Supabase
  console.log('📥 Chargement structures, stats et outils directeurs depuis Supabase...');
  const [resStructures, resStats, resPrevisions, resRepartitions108h, resRemplacementsTr, resRemplacements] = await Promise.all([
    supabase.from('ecoles_structure').select('*'),
    supabase.from('statistiques_ecoles').select('*'),
    supabase.from('previsions_structure').select('*').order('published_at', { ascending: false }),
    supabase.from('repartition_108h').select('*').order('published_at', { ascending: false }),
    supabase.from('remplacements_tr').select('*').order('ordre', { ascending: true }),
    supabase.from('remplacements').select('*').order('date_debut', { ascending: true })
  ]);

  const ecoles_structure = resStructures.data || [];
  const statistiques_ecoles = resStats.data || [];
  const previsions_structure = resPrevisions.data || [];
  const repartitions_108h = resRepartitions108h.data || [];
  const remplacements_tr = resRemplacementsTr.data || [];
  const remplacements = resRemplacements.data || [];

  // Charger ecoles_identite depuis l'API (plus complet que table ecoles)
  console.log('📥 Chargement ecoles_identite depuis API...');
  let ecoles_identite: any[] = [];

  try {
    console.log(`Tentative fetch depuis: ${origin}/api/ecoles-identite`);
    const identiteResponse = await fetch(`${origin}/api/ecoles-identite`, {
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
    const { data } = await supabase.from('ecoles_identite').select('*');
    ecoles_identite = data || [];
    console.log(`   - Fallback: ${ecoles_identite.length} identités chargées depuis Supabase`);
  }

  console.log(`   - ${ecoles_structure.length} structures chargées`);
  console.log(`   - ${statistiques_ecoles.length} statistiques chargées`);
  console.log(`   - ${ecoles_identite.length} identités chargées`);
  console.log(`   - ${previsions_structure.length} prévisions de structure publiées`);
  console.log(`   - ${repartitions_108h.length} répartitions 108h publiées`);
  console.log(`   - ${remplacements.length} remplacements (${remplacements_tr.length} TR)`);

  // ── Calculs agrégés ─────────────────────────────────────────────
  console.log('📊 Calcul des statistiques...');

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

  // ── Construction de l'archive ───────────────────────────────────
  const metadata = {
    source: 'Application Circonscription Cayenne 2',
    completude: {
      ecoles: ecoles_identite.length > 0 && ecoles_structure.length > 0,
      enseignants: enseignants.length > 0,
      evaluations: evaluations.length > 0,
      statistiques: statistiques_ecoles.length > 0,
      stagiaires: stagiaires_m2.length > 0,
      calendrier: evenements.length > 0,
      boussole: boussole_sessions.length > 0,
      planFormation: plan_formation.length > 0,
      previsionsStructure: previsions_structure.length > 0,
      repartitions108h: repartitions_108h.length > 0,
      remplacements: remplacements.length > 0
    },
    stats: {
      nombreEcoles: ecoles_identite.length,
      nombreClasses: statsCirconscription.nombreClasses,
      totalEffectifs: statsCirconscription.totalEffectifs,
      nombreEnseignants: enseignants.length,
      nombreStagiaires: stagiaires_m2.length,
      nombreEvaluations: evaluations.length,
      nombreEvenements: evenements.length,
      nombreBoussoleSessions: boussole_sessions.length,
      nombreBoussoleDeposits: boussole_deposits.length,
      nombrePlanFormation: plan_formation.length,
      nombrePlanFormationSessions: plan_formation_sessions.length,
      nombrePlanFormationSessionsFaites: plan_formation_sessions.filter((s: any) => s.fait).length,
      nombrePrevisionsStructure: previsions_structure.length,
      nombreRepartitions108h: repartitions_108h.length,
      nombreRemplacements: remplacements.length,
      nombreTR: remplacements_tr.length
    }
  };

  const donnees_brutes = {
    ecoles_identite,
    ecoles_structure,
    evaluations,
    statistiques_ecoles,
    stagiaires_m2,
    enseignants,
    evenements,
    boussole_sessions,
    boussole_deposits,
    plan_formation,
    plan_formation_sessions,
    plan_formation_formateurs,
    previsions_structure,
    repartitions_108h,
    remplacements,
    remplacements_tr
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

  console.log('✅ Archive construite');

  // ── Sauvegarde dans Supabase ────────────────────────────────────
  const { error } = await supabase
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
    console.error('❌ Erreur Supabase:', error);
    return { success: false, error: error.message || 'Erreur lors de la sauvegarde' };
  }

  console.log(`✅ Archive sauvegardée dans Supabase pour ${anneeScolaire}`);

  return {
    success: true,
    anneeScolaire,
    metadata,
    taille: {
      donnees_brutes: Object.keys(donnees_brutes).length,
      donnees_calculees: Object.keys(donnees_calculees).length
    }
  };
}
