'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PDFExportModal from '@/components/PDFExportModal';
import { exportMultipleElementsToPDF, PDFElement, PDFExportOptions } from '@/lib/pdfExport';

export default function PilotagePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enseignants, setEnseignants] = useState<any[]>([]);
  const [ecoles, setEcoles] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [selectedEcoleDetail, setSelectedEcoleDetail] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [config, setConfig] = useState<any>(null);
  
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/');
    } else {
      setIsAuthenticated(true);
      loadData();
    }
  }, [router]);

  const loadData = async () => {
    try {
      const [ensRes, ecolesRes, evalRes, structRes, configRes] = await Promise.all([
        fetch('/api/enseignants'),
        fetch('/api/statistiques-ecoles'),  // Charger statistiques au lieu de identite
        fetch('/api/evaluations'),
        fetch('/api/ecoles-structure'),  // Utiliser la structure au lieu des statistiques
        fetch('/api/config')
      ]);

      const ensData = await ensRes.json();
      const ecolesData = await ecolesRes.json();
      const evalData = await evalRes.json();
      const structData = await structRes.json();
      const configData = await configRes.json();

      console.log('📊 Pilotage - Évaluations reçues:', evalData.length, evalData);
      console.log('📋 Exemple évaluation:', evalData[0]);
      console.log('🔍 Champ tx_reussite:', evalData[0]?.tx_reussite);
      console.log('🏫 Écoles chargées:', ecolesData.length);

      setEnseignants(Array.isArray(ensData) ? ensData : []);
      setEcoles(Array.isArray(ecolesData) ? ecolesData : []);
      setEvaluations(Array.isArray(evalData) ? evalData : []);
      setStructures(Array.isArray(structData) ? structData : []);
      setConfig(configData);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calcul des indicateurs clés
  const getIndicateurs = () => {
    // Année scolaire depuis la configuration
    const anneeScolaire = config?.annee_scolaire_actuelle || '2025-2026';
    
    let effectifTotal = 0;
    let nbClassesTotal = 0;
    let nbClassesDedoublees = 0;
    let nbClassesStandard = 0;
    let totalElevesDedoublees = 0;
    let totalElevesStandard = 0;

    // Parcourir toutes les écoles et leurs classes
    structures.forEach(ecole => {
      if (ecole.classes && Array.isArray(ecole.classes)) {
        ecole.classes.forEach((classe: any) => {
          const nbEleves = classe.nbEleves || 0;
          effectifTotal += nbEleves;
          nbClassesTotal++;
          
          if (classe.dedoublee) {
            nbClassesDedoublees++;
            totalElevesDedoublees += nbEleves;
          } else {
            nbClassesStandard++;
            totalElevesStandard += nbEleves;
          }
        });
      }
    });

    // Moyenne élèves par classe globale
    const moyenneEleves = nbClassesTotal > 0 ? (effectifTotal / nbClassesTotal).toFixed(1) : 0;
    
    // Moyenne pour classes dédoublées
    const moyenneDedoublees = nbClassesDedoublees > 0 ? (totalElevesDedoublees / nbClassesDedoublees).toFixed(1) : 0;
    
    // Moyenne pour classes standard
    const moyenneStandard = nbClassesStandard > 0 ? (totalElevesStandard / nbClassesStandard).toFixed(1) : 0;

    // Taux de réussite global (évaluations)
    // Utiliser tx_groupe_3 (satisfaisant) comme indicateur de réussite
    const evalAvecTaux = evaluations.filter(e => e.tx_groupe_3 != null && e.tx_groupe_3 !== undefined);
    console.log('🎯 Évaluations avec taux:', evalAvecTaux.length, 'sur', evaluations.length);
    console.log('🎯 Exemple avec taux:', evalAvecTaux[0]);
    
    const tauxMoyen = evalAvecTaux.length > 0 
      ? ((evalAvecTaux.reduce((sum, e) => sum + parseFloat(e.tx_groupe_3), 0) / evalAvecTaux.length) * 100).toFixed(1)
      : 0;

    // Enseignants par statut
    const titulaires = enseignants.filter(e => e.statut === 'Titulaire').length;
    const stagiaires = enseignants.filter(e => e.statut === 'Stagiaire').length;
    const contractuels = enseignants.filter(e => e.statut === 'Contractuel').length;

    // Pourcentage de titulaires
    const pctTitulaires = enseignants.length > 0 
      ? ((titulaires / enseignants.length) * 100).toFixed(0)
      : 0;

    return {
      anneeScolaire,
      effectifTotal,
      nbClasses: nbClassesTotal,
      nbClassesDedoublees,
      nbClassesStandard,
      moyenneEleves,
      moyenneDedoublees,
      moyenneStandard,
      tauxMoyen,
      titulaires,
      stagiaires,
      contractuels,
      pctTitulaires
    };
  };

  // Évolution des effectifs (depuis la configuration)
  const getEvolutionEffectifs = () => {
    if (!config) return [];
    
    const indicateurs = getIndicateurs();
    
    return [
      ...config.historique_effectifs,
      { annee: config.annee_scolaire_actuelle, effectif: indicateurs.effectifTotal }
    ];
  };

  // Extraire le sigle d'une école (E.E.PU, E.M.PU, E.P.PU)
  const getSigleEcole = (nomComplet: string) => {
    const match = nomComplet.match(/^(E\.[EMPE]+\.PU)/);
    return match ? match[1] : '';
  };

  // Extraire le nom court (sans le sigle)
  const getNomCourtEcole = (nomComplet: string) => {
    const sigle = getSigleEcole(nomComplet);
    if (sigle) {
      return nomComplet.replace(sigle, '').trim();
    }
    return nomComplet;
  };

  // Comparaison écoles - Top 5 et Bottom 5 en effectifs
  const getComparaisonEcoles = () => {
    const ecolesAvecEffectifs = structures.map(ecole => {
      let effectif = 0;
      let nbClasses = 0;
      
      if (ecole.classes && Array.isArray(ecole.classes)) {
        ecole.classes.forEach((classe: any) => {
          effectif += classe.nbEleves || 0;
          nbClasses++;
        });
      }
      
      // Trouver le nom de l'école depuis les données d'identité
      const ecoleIdentite = ecoles.find(ei => ei.uai === ecole.uai);
      const nomEcole = ecoleIdentite?.nom || ecole.nom || `École ${ecole.uai}`;
      const sigle = getSigleEcole(nomEcole);
      const nomCourt = getNomCourtEcole(nomEcole);
      
      return {
        nom: nomEcole,
        nomCourt: nomCourt,
        sigle: sigle,
        effectif: effectif,
        nbClasses: nbClasses
      };
    }).filter(e => e.effectif > 0);

    const sorted = [...ecolesAvecEffectifs].sort((a, b) => b.effectif - a.effectif);
    
    return {
      top5: sorted.slice(0, 5),
      bottom5: sorted.slice(-5).reverse()
    };
  };

  // Alertes
  const getAlertes = () => {
    const alertes: any[] = [];
    const indicateurs = getIndicateurs();

    // Alerte si moyenne élèves/classe > 25
    if (parseFloat(String(indicateurs.moyenneEleves)) > 25) {
      alertes.push({
        type: 'warning',
        titre: 'Surcharge des classes',
        message: `Moyenne de ${indicateurs.moyenneEleves} élèves/classe (seuil: 25)`
      });
    }

    // Alerte si taux de réussite < 70%
    if (parseFloat(String(indicateurs.tauxMoyen)) < 70) {
      alertes.push({
        type: 'danger',
        titre: 'Résultats préoccupants',
        message: `Taux de réussite moyen: ${indicateurs.tauxMoyen}% (seuil: 70%)`
      });
    }

    // Alerte si % titulaires < 80%
    if (parseFloat(String(indicateurs.pctTitulaires)) < 80) {
      alertes.push({
        type: 'warning',
        titre: 'Stabilité de l\'équipe',
        message: `Seulement ${indicateurs.pctTitulaires}% de titulaires (objectif: 80%)`
      });
    }

    return alertes;
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl">Chargement...</p>
        </div>
      </div>
    );
  }

  const indicateurs = getIndicateurs();
  const evolution = getEvolutionEffectifs();
  const comparaison = getComparaisonEcoles();
  const alertes = getAlertes();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      {/* Header */}
      <div className="text-white py-16 px-6">
        <div className="container mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6">
            ← Retour à l'accueil
          </Link>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
                📊
              </div>
              <div>
                <h1 className="text-5xl font-bold">Pilotage</h1>
                <p className="text-xl opacity-90 mt-2">Tableaux de bord et analyses · Année {indicateurs.anneeScolaire}</p>
              </div>
            </div>
            <button
              onClick={() => setShowExportModal(true)}
              className="px-6 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-white/90 transition-colors shadow-lg flex items-center gap-2"
            >
              📥 Exporter en PDF
            </button>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="container mx-auto px-6 py-8">
        
        {/* Alertes */}
        {alertes.length > 0 && (
          <div className="mb-8 space-y-4">
            {alertes.map((alerte, idx) => (
              <div key={idx} className={`card border-2 ${
                alerte.type === 'danger' ? 'bg-red-50 border-red-300' : 'bg-orange-50 border-orange-300'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{alerte.type === 'danger' ? '🔴' : '⚠️'}</span>
                  <div className="flex-1">
                    <h3 className={`font-bold text-lg mb-1 ${
                      alerte.type === 'danger' ? 'text-red-800' : 'text-orange-800'
                    }`}>
                      {alerte.titre}
                    </h3>
                    <p className={alerte.type === 'danger' ? 'text-red-700' : 'text-orange-700'}>
                      {alerte.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Indicateurs Clés */}
        <div className="card mb-8" id="section-indicateurs">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">🎯 Indicateurs Clés</h2>
          
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="text-4xl mb-2">👥</div>
              <div className="text-4xl font-bold text-blue-700">{indicateurs.effectifTotal}</div>
              <div className="text-sm text-gray-600 mt-2">Élèves total</div>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className="text-4xl mb-2">🚪</div>
              <div className="text-4xl font-bold text-green-700">{indicateurs.nbClasses}</div>
              <div className="text-sm text-gray-600 mt-2">Classes total</div>
            </div>

            <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
              <div className="text-4xl mb-2">📈</div>
              <div className="text-4xl font-bold text-orange-700">{indicateurs.tauxMoyen}%</div>
              <div className="text-sm text-gray-600 mt-2">Réussite moyenne</div>
            </div>
          </div>

          {/* Détail Classes Dédoublées vs Standard */}
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div className="p-4 bg-cyan-50 border-2 border-cyan-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">Classes Dédoublées (CP/CE1)</span>
                <span className="text-2xl font-bold text-cyan-700">{indicateurs.nbClassesDedoublees}</span>
              </div>
              <div className="text-xs text-gray-600 mb-2">Moyenne élèves/classe : {indicateurs.moyenneDedoublees}</div>
              <div className="bg-cyan-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-cyan-600"
                  style={{ width: `${(parseFloat(indicateurs.moyenneDedoublees.toString()) / 12) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">Objectif : 12 élèves max</div>
            </div>

            <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">Classes Standard</span>
                <span className="text-2xl font-bold text-indigo-700">{indicateurs.nbClassesStandard}</span>
              </div>
              <div className="text-xs text-gray-600 mb-2">Moyenne élèves/classe : {indicateurs.moyenneStandard}</div>
              <div className="bg-indigo-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600"
                  style={{ width: `${(parseFloat(indicateurs.moyenneStandard.toString()) / 25) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">Objectif : 25 élèves max</div>
            </div>
          </div>
        </div>

        {/* Détail par École */}
        <div className="card mb-8" id="section-ec-detail">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">🏫 Effectifs par Classe - Détail École</h2>
          
          {/* Sélecteur d'école */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Sélectionner une école</label>
            <select
              value={selectedEcoleDetail}
              onChange={(e) => setSelectedEcoleDetail(e.target.value)}
              className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">-- Choisir une école --</option>
              {structures
                .filter(e => e.classes && e.classes.length > 0)
                .map((ecole, idx) => {
                  // Trouver le nom de l'école depuis les données d'identité
                  const ecoleIdentite = ecoles.find(ei => ei.uai === ecole.uai);
                  const nomEcole = ecoleIdentite?.nom || ecole.nom || `École ${ecole.uai}`;
                  return { ...ecole, nomAffiche: nomEcole };
                })
                .sort((a, b) => a.nomAffiche.localeCompare(b.nomAffiche))
                .map((ecole, idx) => (
                  <option key={idx} value={ecole.uai || idx}>
                    {ecole.nomAffiche}
                  </option>
                ))}
            </select>
          </div>

          {/* Affichage des classes de l'école sélectionnée */}
          {selectedEcoleDetail && (() => {
            const ecole = structures.find(e => (e.uai || structures.indexOf(e).toString()) === selectedEcoleDetail);
            if (!ecole || !ecole.classes || ecole.classes.length === 0) {
              return (
                <div className="text-center py-8 text-gray-500">
                  Aucune classe trouvée pour cette école
                </div>
              );
            }

            // Trouver le nom de l'école
            const ecoleIdentite = ecoles.find(ei => ei.uai === ecole.uai);
            const nomEcole = ecoleIdentite?.nom || ecole.nom || `École ${ecole.uai}`;

            return (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                  {nomEcole} - {ecole.classes.length} classe(s)
                </h3>
                
                <div className="space-y-3">
                  {ecole.classes.map((classe: any, idx: number) => {
                    const nbEleves = classe.nbEleves || 0;
                    const isDedoublee = classe.dedoublee;
                    const maxEleves = isDedoublee ? 12 : 25;
                    const pourcentage = (nbEleves / maxEleves) * 100;
                    const estSurcharge = pourcentage > 100;
                    
                    return (
                      <div key={idx} className={`p-4 rounded-lg border-2 ${
                        isDedoublee ? 'bg-cyan-50 border-cyan-200' : 'bg-indigo-50 border-indigo-200'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800">
                              {classe.libelle || classe.niveau || 'Classe'}
                            </div>
                            <div className="text-xs text-gray-600">
                              {classe.enseignant || 'Enseignant non renseigné'}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className={`text-2xl font-bold ${
                              estSurcharge ? 'text-red-700' : isDedoublee ? 'text-cyan-700' : 'text-indigo-700'
                            }`}>
                              {nbEleves}
                            </div>
                            <div className="text-xs text-gray-600">
                              {isDedoublee ? '(dédoublée)' : '(standard)'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mb-1">
                          <div className={`h-3 rounded-full overflow-hidden ${
                            isDedoublee ? 'bg-cyan-200' : 'bg-indigo-200'
                          }`}>
                            <div 
                              className={`h-full transition-all ${
                                estSurcharge 
                                  ? 'bg-red-600' 
                                  : isDedoublee 
                                  ? 'bg-cyan-600' 
                                  : 'bg-indigo-600'
                              }`}
                              style={{ width: `${Math.min(pourcentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className={estSurcharge ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                            {pourcentage.toFixed(0)}% du max ({maxEleves} élèves)
                          </span>
                          {estSurcharge && (
                            <span className="text-red-600 font-semibold">
                              ⚠️ Dépassement de {(nbEleves - maxEleves)} élève(s)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Évolution des Effectifs */}
        <div className="card mb-8" id="section-evolution-effectifs">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📈 Évolution des Effectifs</h2>
          
          <div className="space-y-3">
            {evolution.map((annee, idx) => {
              const isLast = idx === evolution.length - 1;
              const pctChange = idx > 0 
                ? (((annee.effectif - evolution[idx - 1].effectif) / evolution[idx - 1].effectif) * 100).toFixed(1)
                : null;
              
              return (
                <div key={idx} className={`p-4 rounded-lg ${isLast ? 'bg-primary-50 border-2 border-primary-300' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className={`text-lg font-bold ${isLast ? 'text-primary-700' : 'text-gray-700'}`}>
                        {annee.annee}
                      </span>
                      {isLast && <span className="text-xs bg-primary-600 text-white px-2 py-1 rounded">En cours</span>}
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className={`text-2xl font-bold ${isLast ? 'text-primary-700' : 'text-gray-700'}`}>
                        {annee.effectif}
                      </span>
                      {pctChange && (
                        <span className={`text-sm font-semibold ${
                          parseFloat(pctChange) > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {parseFloat(pctChange) > 0 ? '↗' : '↘'} {Math.abs(parseFloat(pctChange))}%
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Barre de progression */}
                  <div className="mt-2 bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${isLast ? 'bg-primary-600' : 'bg-gray-400'}`}
                      style={{ width: `${(annee.effectif / 3500) * 100}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ressources Humaines */}
        <div className="card mb-8" id="section-ressources-humaines">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">👨‍🏫 Ressources Humaines</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Titulaires</span>
                <span className="text-3xl font-bold text-green-700">{indicateurs.titulaires}</span>
              </div>
              <div className="text-xs text-gray-600">{indicateurs.pctTitulaires}% du total</div>
              <div className="mt-2 bg-green-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-600"
                  style={{ width: `${indicateurs.pctTitulaires}%` }}
                ></div>
              </div>
            </div>

            <div className="p-6 bg-orange-50 rounded-lg border-2 border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Stagiaires</span>
                <span className="text-3xl font-bold text-orange-700">{indicateurs.stagiaires}</span>
              </div>
              <div className="text-xs text-gray-600">
                {enseignants.length > 0 ? ((indicateurs.stagiaires / enseignants.length) * 100).toFixed(0) : 0}% du total
              </div>
              <div className="mt-2 bg-orange-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-600"
                  style={{ width: `${enseignants.length > 0 ? ((indicateurs.stagiaires / enseignants.length) * 100).toFixed(0) : 0}%` }}
                ></div>
              </div>
            </div>

            <div className="p-6 bg-red-50 rounded-lg border-2 border-red-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Contractuels</span>
                <span className="text-3xl font-bold text-red-700">{indicateurs.contractuels}</span>
              </div>
              <div className="text-xs text-gray-600">
                {enseignants.length > 0 ? ((indicateurs.contractuels / enseignants.length) * 100).toFixed(0) : 0}% du total
              </div>
              <div className="mt-2 bg-red-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-600"
                  style={{ width: `${enseignants.length > 0 ? ((indicateurs.contractuels / enseignants.length) * 100).toFixed(0) : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Comparaison Écoles */}
        <div className="grid md:grid-cols-2 gap-6 mb-8" id="section-comparaison">
          {/* Top 5 */}
          <div className="card">
            <h3 className="text-xl font-bold text-gray-800 mb-4">🏆 Top 5 - Effectifs</h3>
            <div className="space-y-2">
              {comparaison.top5.map((ecole, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-green-700">#{idx + 1}</span>
                    <div>
                      <div className="font-semibold text-gray-800">{ecole.nom}</div>
                      <div className="text-xs text-gray-600">{ecole.nbClasses} classe(s)</div>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-green-700">{ecole.effectif}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom 5 */}
          <div className="card">
            <h3 className="text-xl font-bold text-gray-800 mb-4">📉 Plus Petites Écoles</h3>
            <div className="space-y-2">
              {comparaison.bottom5.map((ecole, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-blue-700">#{idx + 1}</span>
                    <div>
                      <div className="font-semibold text-gray-800">{ecole.nom}</div>
                      <div className="text-xs text-gray-600">{ecole.nbClasses} classe(s)</div>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-blue-700">{ecole.effectif}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="card bg-blue-50 border-2 border-blue-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-bold text-blue-900 mb-2">À propos de ces indicateurs</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Les données sont calculées en temps réel à partir des fichiers importés</li>
                <li>• Les alertes se déclenchent automatiquement selon des seuils prédéfinis</li>
                <li>• L'évolution pluriannuelle sera disponible après plusieurs années d'utilisation</li>
                <li>• Consultez régulièrement ces indicateurs pour un pilotage optimal</li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      {/* Modal d'export PDF */}
      <PDFExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={async (elements, options) => {
          setShowExportModal(false);
          await exportMultipleElementsToPDF(
            elements,
            `pilotage-circonscription-${new Date().toISOString().split('T')[0]}`,
            options
          );
        }}
        availableElements={[
          { id: 'section-indicateurs', label: '🎯 Indicateurs Clés', selected: true },
          { id: 'section-evolution-effectifs', label: '📈 Évolution des Effectifs', selected: true },
          { id: 'section-ressources-humaines', label: '👨‍🏫 Ressources Humaines', selected: true },
          { id: 'section-comparaison', label: '📊 Top 5 et Plus Petites Écoles', selected: true },
          { id: 'section-ec-detail', label: '🏫 Effectifs par Classe - Détail École', selected: false }
        ]}
        defaultFilename="pilotage-circonscription"
      />

    </div>
  );
}
