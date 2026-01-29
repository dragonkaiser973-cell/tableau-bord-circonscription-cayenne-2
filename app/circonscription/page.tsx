'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import PDFExportModal from '@/components/PDFExportModal';
import { exportMultipleElementsToPDF, PDFExportOptions } from '@/lib/pdfExport';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

export default function CirconscriptionPage() {
  const [enseignants, setEnseignants] = useState<any[]>([]);
  const [ecoles, setEcoles] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);

  const handleExportPDF = async () => {
    setShowExportModal(true);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ensRes, ecolesRes, evalRes] = await Promise.all([
        fetch('/api/enseignants'),
        fetch('/api/ecoles'),
        fetch('/api/evaluations')
      ]);

      const ensData = await ensRes.json();
      const ecolesData = await ecolesRes.json();
      const evalData = await evalRes.json();

      console.log('=== DEBUG CIRCONSCRIPTION ===');
      console.log('Total enseignants:', ensData.length);
      console.log('Total écoles:', ecolesData.length);
      console.log('Total évaluations:', evalData.length);
      
      // Vérifier les enseignants de la circonscription
      const ensCirco = ensData.filter((e: any) => 
        e.ecole_nom && (e.ecole_nom.includes('9730456H') || e.ecole_nom.includes('CIRCONSCRIPTION'))
      );
      console.log('Enseignants circonscription:', ensCirco.length);
      if (ensCirco.length > 0) {
        console.log('Exemple:', ensCirco[0]);
      }
      
      // Vérifier les IPS
      const evalAvecIPS = evalData.filter((e: any) => e.ips);
      console.log('Évaluations avec IPS:', evalAvecIPS.length);
      if (evalAvecIPS.length > 0) {
        console.log('Exemple IPS:', evalAvecIPS[0]);
      }

      setEnseignants(ensData);
      setEcoles(ecolesData);
      setEvaluations(evalData);
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement:', error);
      setLoading(false);
    }
  };

  // Récupérer l'IPS d'une école depuis les évaluations (par UAI)
  const getIpsEcole = (ecoleUai: string) => {
    const evalEcole = evaluations.find(e => e.uai === ecoleUai && e.ips);
    return evalEcole?.ips || null;
  };

  // Récupérer l'UAI d'une école par son nom
  const getEcoleUai = (ecoleNom: string) => {
    const ecole = ecoles.find(e => e.nom === ecoleNom);
    return ecole?.uai || null;
  };

  // Statistiques enseignants (hors circonscription SAUF personnel de direction)
  const getStatsEnseignants = () => {
    const ensHorsCirco = enseignants.filter(e => {
      // Toujours inclure le personnel de direction
      if (e.statut && e.statut.toLowerCase().includes('direction')) {
        return true;
      }
      // Exclure les autres postes de circonscription
      return !e.ecole_nom.includes('IEN CAYENNE') && 
             !e.ecole_nom.includes('CIRCONSCRIPTION');
    });
    
    const total = ensHorsCirco.length;
    const parStatut = ensHorsCirco.reduce((acc: any, e) => {
      acc[e.statut] = (acc[e.statut] || 0) + 1;
      return acc;
    }, {});
    
    const parEcole = ensHorsCirco.reduce((acc: any, e) => {
      acc[e.ecole_nom] = (acc[e.ecole_nom] || 0) + 1;
      return acc;
    }, {});

    const avecSpecialite = ensHorsCirco.filter(e => 
      e.discipline && 
      !e.discipline.toUpperCase().includes('SANS SPECIALITE')
    ).length;

    return { total, parStatut, parEcole, avecSpecialite };
  };

  // Statistiques circonscription (personnel IEN)
  const getStatsCirconscription = () => {
    const personnelCirco = enseignants.filter(e => 
      e.ecole_nom.includes('IEN CAYENNE') || 
      e.ecole_nom.includes('CIRCONSCRIPTION')
    );

    const total = personnelCirco.length;
    
    const parSpecialite = personnelCirco.reduce((acc: any, e) => {
      const spec = e.discipline && !e.discipline.toUpperCase().includes('SANS SPECIALITE') 
        ? e.discipline 
        : 'Sans spécialité';
      acc[spec] = (acc[spec] || 0) + 1;
      return acc;
    }, {});

    // Calculer l'IPS moyen de la circonscription
    const ipsUniques = new Map<string, number>();
    evaluations.forEach(e => {
      if (e.ips && e.uai) {
        ipsUniques.set(e.uai, e.ips);
      }
    });
    const ipsMoyen = ipsUniques.size > 0 
      ? Array.from(ipsUniques.values()).reduce((sum, ips) => sum + ips, 0) / ipsUniques.size
      : 0;

    // Calculer le nombre total d'élèves (basé sur effectifs des évaluations)
    const elevesTotal = evaluations.reduce((sum, e) => sum + (e.effectif || 0), 0);

    return { total, parSpecialite, personnelCirco, ipsMoyen, elevesTotal };
  };

  // Statistiques écoles (hors circonscription)
  const getStatsEcoles = () => {
    const ecolesHorsCirco = ecoles.filter(e => e.uai !== '9730456H');
    const total = ecolesHorsCirco.length;
    
    const elementaires = ecolesHorsCirco.filter(e => {
      const nom = (e.nom || '').toUpperCase().replace(/\./g, '').replace(/\s/g, '');
      const sigle = (e.sigle || '').toUpperCase().replace(/\./g, '').replace(/\s/g, '');
      return nom.includes('EEPU') || sigle.includes('EEPU') || nom.includes('ELEMENTAIRE');
    }).length;
    
    const maternelles = ecolesHorsCirco.filter(e => {
      const nom = (e.nom || '').toUpperCase().replace(/\./g, '').replace(/\s/g, '');
      const sigle = (e.sigle || '').toUpperCase().replace(/\./g, '').replace(/\s/g, '');
      return nom.includes('EMPU') || sigle.includes('EMPU') || nom.includes('MATERNELLE');
    }).length;

    const primaires = ecolesHorsCirco.filter(e => {
      const nom = (e.nom || '').toUpperCase().replace(/\./g, '').replace(/\s/g, '');
      const sigle = (e.sigle || '').toUpperCase().replace(/\./g, '').replace(/\s/g, '');
      return nom.includes('EPPU') || sigle.includes('EPPU') || nom.includes('GROUPESCOLAIRE');
    }).length;

    return { total, elementaires, maternelles, primaires };
  };

  // Statistiques évaluations
  const getStatsEvaluations = () => {
    if (evaluations.length === 0) return { moyenneFrancais: 0, moyenneMaths: 0 };

    // Filtrer par matière
    const francais = evaluations.filter(e => e.matiere === 'français');
    const maths = evaluations.filter(e => e.matiere === 'mathématiques');

    // Grouper par compétence (libelle) et calculer la moyenne par compétence
    // comme dans la page évaluations pour avoir les mêmes résultats
    const calculateAverage = (data: any[]) => {
      if (data.length === 0) return 0;
      
      // Grouper par libellé
      const groupedByLibelle: { [key: string]: any[] } = {};
      data.forEach(e => {
        if (!groupedByLibelle[e.libelle]) {
          groupedByLibelle[e.libelle] = [];
        }
        groupedByLibelle[e.libelle].push(e);
      });

      // Calculer la moyenne pour chaque compétence
      const moyennesParCompetence = Object.keys(groupedByLibelle).map(libelle => {
        const items = groupedByLibelle[libelle];
        return items.reduce((sum, i) => sum + (i.tx_groupe_3 || 0), 0) / items.length;
      });

      // Calculer la moyenne des moyennes
      const moyenneFinale = moyennesParCompetence.reduce((sum, m) => sum + m, 0) / moyennesParCompetence.length;
      return moyenneFinale * 100;
    };

    const moyenneFrancais = calculateAverage(francais);
    const moyenneMaths = calculateAverage(maths);

    return { moyenneFrancais, moyenneMaths };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl text-white">Chargement...</p>
        </div>
      </div>
    );
  }

  const statsEns = getStatsEnseignants();
  const statsCirco = getStatsCirconscription();
  const statsEcoles = getStatsEcoles();
  const statsEval = getStatsEvaluations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      <div className="text-white py-16 px-6">
        <div className="container mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6">
            ← Retour à l'accueil
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
                🌍
              </div>
              <div>
                <h1 className="text-5xl font-bold">Circonscription Cayenne 2 - Roura</h1>
                <p className="text-xl opacity-90 mt-2">Vue d'ensemble et statistiques globales</p>
              </div>
            </div>
            <button
              onClick={handleExportPDF}
              className="bg-white text-primary-700 px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors flex items-center gap-2"
            >
              📄 Exporter en PDF
            </button>
          </div>
        </div>
      </div>

      <div id="circonscription-content" className="container mx-auto px-6 py-8">
        
        {/* Encart Circonscription */}
        <div className="card mb-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center text-2xl text-white">
              🏛️
            </div>
            <h3 className="text-2xl font-bold text-purple-900">Personnel de Circonscription (IEN)</h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-xs uppercase tracking-wider text-gray-600 mb-1">Personnel total</div>
              <div className="text-3xl font-bold text-purple-700">{statsCirco.total}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-xs uppercase tracking-wider text-gray-600 mb-1">IPS moyen circonscription</div>
              <div className="text-3xl font-bold text-purple-700">{statsCirco.ipsMoyen.toFixed(1)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="text-xs uppercase tracking-wider text-gray-600 mb-1">Spécialités</div>
              <div className="text-3xl font-bold text-purple-700">{Object.keys(statsCirco.parSpecialite).length}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-purple-200">
                  <th className="text-left py-2 px-3 text-sm font-semibold text-purple-900">Nom</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-purple-900">Spécialité</th>
                  <th className="text-center py-2 px-3 text-sm font-semibold text-purple-900">Statut</th>
                </tr>
              </thead>
              <tbody>
                {statsCirco.personnelCirco.map((p, idx) => (
                  <tr key={idx} className="border-b border-purple-100">
                    <td className="py-2 px-3 font-semibold text-gray-800">{p.nom} {p.prenom}</td>
                    <td className="py-2 px-3">
                      {p.discipline && !p.discipline.toUpperCase().includes('SANS SPECIALITE') ? (
                        <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                          {p.discipline}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        p.statut === 'Titulaire' ? 'bg-green-100 text-green-800' :
                        p.statut === 'Stagiaire' ? 'bg-orange-100 text-orange-800' :
                        p.statut === 'Contractuel' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {p.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid md:grid-cols-3 gap-3">
            {Object.entries(statsCirco.parSpecialite).map(([spec, count]) => (
              <div key={spec} className="bg-white p-3 rounded-lg shadow-sm flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-700">{spec}</span>
                <span className="text-lg font-bold text-purple-700">{count as number}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Statistiques globales */}
        <div className="grid md:grid-cols-4 gap-6 mb-6" id="stats-grid">
          <div className="card bg-gradient-to-br from-primary-500 to-primary-700 text-white">
            <div className="flex items-center gap-4">
              <div className="text-5xl">🏫</div>
              <div>
                <h3 className="text-xs uppercase tracking-wider opacity-90 mb-1">Écoles</h3>
                <div className="text-4xl font-bold">{statsEcoles.total}</div>
                <div className="text-sm opacity-90 mt-1">
                  {statsEcoles.elementaires} élémentaires • {statsEcoles.maternelles} maternelles • {statsEcoles.primaires} primaires
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-info to-primary-800 text-white">
            <div className="flex items-center gap-4">
              <div className="text-5xl">👨‍🏫</div>
              <div>
                <h3 className="text-xs uppercase tracking-wider opacity-90 mb-1">Enseignants</h3>
                <div className="text-4xl font-bold">{statsEns.total}</div>
                <div className="text-sm opacity-90 mt-1">
                  {statsEns.avecSpecialite} avec spécialité
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-500 to-purple-700 text-white">
            <div className="flex items-center gap-4">
              <div className="text-5xl">📚</div>
              <div>
                <h3 className="text-xs uppercase tracking-wider opacity-90 mb-1">Réussite Français</h3>
                <div className="text-4xl font-bold">{statsEval.moyenneFrancais.toFixed(1)}%</div>
                <div className="text-sm opacity-90 mt-1">
                  Moyenne au-dessus seuil 2
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-orange-500 to-orange-700 text-white">
            <div className="flex items-center gap-4">
              <div className="text-5xl">🔢</div>
              <div>
                <h3 className="text-xs uppercase tracking-wider opacity-90 mb-1">Réussite Maths</h3>
                <div className="text-4xl font-bold">{statsEval.moyenneMaths.toFixed(1)}%</div>
                <div className="text-sm opacity-90 mt-1">
                  Moyenne au-dessus seuil 2
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Graphiques en camembert */}
        <div className="grid md:grid-cols-2 gap-6 mb-6" id="charts-section">
          {/* Barres horizontales - Part des enseignants par école */}
          <div className="card">
            <h3 className="text-xl font-bold text-gray-800 mb-4">🏫 Répartition des enseignants par école</h3>
            <p className="text-sm text-gray-600 mb-4">Nombre d'enseignants par établissement</p>
            <div className="h-[400px]">
              <Bar 
                data={{
                  labels: Object.keys(statsEns.parEcole).map(nom => {
                    // Raccourcir les noms trop longs
                    if (nom.length > 30) {
                      return nom.substring(0, 27) + '...';
                    }
                    return nom;
                  }),
                  datasets: [{
                    label: 'Enseignants',
                    data: Object.values(statsEns.parEcole),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                  }]
                }}
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { 
                      display: false
                    },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => {
                          const value = context.parsed.x || 0;
                          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                          const percentage = ((value / total) * 100).toFixed(1);
                          return `${value} enseignants (${percentage}%)`;
                        },
                        title: (context: any) => {
                          // Afficher le nom complet dans le tooltip
                          const index = context[0].dataIndex;
                          return Object.keys(statsEns.parEcole)[index];
                        }
                      }
                    }
                  },
                  scales: {
                    x: { 
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1
                      }
                    },
                    y: {
                      ticks: {
                        font: {
                          size: 11
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Camembert - Statuts des enseignants */}
          <div className="card">
            <h3 className="text-xl font-bold text-gray-800 mb-4">👨‍🏫 Répartition par statut</h3>
            <p className="text-sm text-gray-600 mb-4">Part de chaque statut dans la population totale</p>
            <div className="h-[400px] flex items-center justify-center">
              <div style={{ width: '110%', height: '110%', maxWidth: '440px', maxHeight: '440px' }}>
                <Pie 
                  data={{
                    labels: Object.keys(statsEns.parStatut),
                    datasets: [{
                      data: Object.values(statsEns.parStatut),
                      backgroundColor: [
                        'rgba(16, 185, 129, 0.8)',   // Titulaires - vert
                        'rgba(251, 146, 60, 0.8)',   // Stagiaires - orange
                        'rgba(239, 68, 68, 0.8)',    // Contractuels - rouge
                        'rgba(59, 130, 246, 0.8)',   // Personnel de direction - bleu
                        'rgba(156, 163, 175, 0.8)'   // Autre - gris
                      ],
                      borderWidth: 3,
                      borderColor: '#fff',
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    layout: {
                      padding: {
                        top: 30,
                        bottom: 30,
                        left: 85,
                        right: 85
                      }
                    },
                    plugins: {
                      legend: { 
                        display: false
                      },
                      tooltip: {
                        callbacks: {
                          label: (context: any) => {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} enseignants (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                plugins={[{
                  id: 'externalLabels',
                  afterDatasetsDraw: (chart: any) => {
                    const { ctx, chartArea } = chart;
                    const { top, bottom, left, right, width, height } = chartArea;
                    const centerX = left + width / 2;
                    const centerY = top + height / 2;
                    
                    chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
                      const meta = chart.getDatasetMeta(datasetIndex);
                      
                      meta.data.forEach((element: any, index: number) => {
                        const label = chart.data.labels[index];
                        const value = dataset.data[index];
                        const total = dataset.data.reduce((a: number, b: number) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        
                        // Calculer l'angle du segment
                        const startAngle = element.startAngle;
                        const endAngle = element.endAngle;
                        const midAngle = startAngle + (endAngle - startAngle) / 2;
                        
                        // Rayon du graphique
                        const outerRadius = element.outerRadius;
                        
                        // Point de départ de la ligne (bord extérieur du segment)
                        const lineStartX = centerX + Math.cos(midAngle) * outerRadius;
                        const lineStartY = centerY + Math.sin(midAngle) * outerRadius;
                        
                        // Point intermédiaire de la ligne (un peu plus loin)
                        const extendDistance = 15;
                        const lineMidX = centerX + Math.cos(midAngle) * (outerRadius + extendDistance);
                        const lineMidY = centerY + Math.sin(midAngle) * (outerRadius + extendDistance);
                        
                        // Direction de l'étiquette - FORCER selon le label
                        let isRightSide;
                        
                        const labelLower = label.toLowerCase();
                        
                        if (labelLower.includes('stagiaire')) {
                          // Stagiaires : FORCER À DROITE
                          isRightSide = true;
                        } else if (labelLower.includes('contractuel')) {
                          // Contractuels : FORCER À GAUCHE
                          isRightSide = false;
                        } else {
                          // Autres (Titulaires, etc.) : suivre l'angle naturel
                          isRightSide = Math.cos(midAngle) >= 0;
                        }
                        
                        const horizontalLineLength = 25;
                        const lineEndX = isRightSide ? lineMidX + horizontalLineLength : lineMidX - horizontalLineLength;
                        const lineEndY = lineMidY;
                        
                        // Dessiner la ligne
                        ctx.save();
                        ctx.strokeStyle = dataset.backgroundColor[index];
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(lineStartX, lineStartY);
                        ctx.lineTo(lineMidX, lineMidY);
                        ctx.lineTo(lineEndX, lineEndY);
                        ctx.stroke();
                        
                        // Dessiner l'étiquette avec le pourcentage
                        ctx.fillStyle = dataset.backgroundColor[index];
                        ctx.font = 'bold 14px sans-serif';
                        ctx.textAlign = isRightSide ? 'left' : 'right';
                        ctx.textBaseline = 'bottom';
                        
                        const textX = isRightSide ? lineEndX + 5 : lineEndX - 5;
                        ctx.fillText(`${percentage}%`, textX, lineEndY - 2);
                        
                        // Texte du label (nom du groupe)
                        ctx.font = '12px sans-serif';
                        ctx.fillStyle = '#666';
                        ctx.textBaseline = 'top';
                        ctx.fillText(label, textX, lineEndY + 2);
                        
                        ctx.restore();
                      });
                    });
                  }
                }]}
              />
              </div>
            </div>
          </div>
        </div>

        {/* Graphique IPS */}
        <div className="card mb-6" id="section-graphique-ips">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📊 Indice de Position Sociale (IPS) des écoles</h3>
          <div className="h-80">
            <Bar 
              data={{
                labels: (() => {
                  // Récupérer tous les IPS uniques
                  const ipsData: { nom: string; ips: number; isCirco: boolean }[] = [];
                  
                  // Ajouter les écoles avec IPS
                  ecoles.forEach(e => {
                    const ips = getIpsEcole(e.uai);
                    if (ips && e.uai !== '9730456H') {
                      ipsData.push({
                        nom: e.nom,
                        ips: ips,
                        isCirco: false
                      });
                    }
                  });
                  
                  // Ajouter la circonscription avec son IPS depuis les évaluations
                  const ipsCirco = evaluations.length > 0 && evaluations[0].ips_cir 
                    ? evaluations[0].ips_cir 
                    : null;
                  
                  if (ipsCirco) {
                    ipsData.push({
                      nom: 'Circonscription',
                      ips: ipsCirco,
                      isCirco: true
                    });
                  }
                  
                  // Trier par IPS croissant
                  ipsData.sort((a, b) => a.ips - b.ips);
                  
                  return ipsData.map(d => d.nom);
                })(),
                datasets: [{
                  label: 'IPS',
                  data: (() => {
                    const ipsData: { nom: string; ips: number; isCirco: boolean }[] = [];
                    
                    ecoles.forEach(e => {
                      const ips = getIpsEcole(e.uai);
                      if (ips && e.uai !== '9730456H') {
                        ipsData.push({
                          nom: e.nom,
                          ips: ips,
                          isCirco: false
                        });
                      }
                    });
                    
                    const ipsCirco = evaluations.length > 0 && evaluations[0].ips_cir 
                      ? evaluations[0].ips_cir 
                      : null;
                    
                    if (ipsCirco) {
                      ipsData.push({
                        nom: 'Circonscription',
                        ips: ipsCirco,
                        isCirco: true
                      });
                    }
                    
                    ipsData.sort((a, b) => a.ips - b.ips);
                    
                    return ipsData.map(d => d.ips);
                  })(),
                  backgroundColor: (() => {
                    const ipsData: { nom: string; ips: number; isCirco: boolean }[] = [];
                    
                    ecoles.forEach(e => {
                      const ips = getIpsEcole(e.uai);
                      if (ips && e.uai !== '9730456H') {
                        ipsData.push({
                          nom: e.nom,
                          ips: ips,
                          isCirco: false
                        });
                      }
                    });
                    
                    const ipsCirco = evaluations.length > 0 && evaluations[0].ips_cir 
                      ? evaluations[0].ips_cir 
                      : null;
                    
                    if (ipsCirco) {
                      ipsData.push({
                        nom: 'Circonscription',
                        ips: ipsCirco,
                        isCirco: true
                      });
                    }
                    
                    ipsData.sort((a, b) => a.ips - b.ips);
                    
                    // Circonscription en violet, écoles en bleu
                    return ipsData.map(d => d.isCirco ? '#9333ea' : '#2563eb');
                  })(),
                  borderColor: (() => {
                    const ipsData: { nom: string; ips: number; isCirco: boolean }[] = [];
                    
                    ecoles.forEach(e => {
                      const ips = getIpsEcole(e.uai);
                      if (ips && e.uai !== '9730456H') {
                        ipsData.push({
                          nom: e.nom,
                          ips: ips,
                          isCirco: false
                        });
                      }
                    });
                    
                    const ipsCirco = evaluations.length > 0 && evaluations[0].ips_cir 
                      ? evaluations[0].ips_cir 
                      : null;
                    
                    if (ipsCirco) {
                      ipsData.push({
                        nom: 'Circonscription',
                        ips: ipsCirco,
                        isCirco: true
                      });
                    }
                    
                    ipsData.sort((a, b) => a.ips - b.ips);
                    
                    return ipsData.map(d => d.isCirco ? '#7e22ce' : '#1d4ed8');
                  })(),
                  borderWidth: 2
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  datalabels: { 
                    display: true,
                    anchor: 'end' as const,
                    align: 'end' as const,
                    color: '#1e293b',
                    font: {
                      weight: 'bold' as const,
                      size: 11
                    },
                    formatter: (value: number) => value.toFixed(1)
                  },
                  tooltip: {
                    callbacks: {
                      label: (context: any) => `IPS: ${context.parsed.y.toFixed(1)}`
                    }
                  }
                },
                scales: {
                  y: { 
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Indice IPS',
                      font: {
                        size: 13,
                        weight: 'bold'
                      }
                    }
                  },
                  x: {
                    ticks: {
                      autoSkip: false,
                      maxRotation: 45,
                      minRotation: 45,
                      font: {
                        size: 10
                      }
                    }
                  }
                }
              }}
            />
          </div>
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span className="text-sm font-medium text-gray-700">Écoles</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-600 rounded"></div>
              <span className="text-sm font-medium text-gray-700">Circonscription</span>
            </div>
          </div>
        </div>

        <div className="card" id="ecoles-list">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🏫 Liste des écoles</h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>École</th>
                  <th>Sigle</th>
                  <th>Commune</th>
                  <th>Enseignants</th>
                  <th>IPS</th>
                </tr>
              </thead>
              <tbody>
                {ecoles.filter(e => e.uai !== '9730456H').map(ecole => {
                  const nbEns = enseignants.filter(e => e.ecole_nom === ecole.nom).length;
                  const ips = getIpsEcole(ecole.uai);
                  
                  // Déterminer le sigle automatiquement à partir du nom
                  let sigle = ecole.sigle || '';
                  if (!sigle) {
                    const nomUpper = ecole.nom.toUpperCase();
                    if (nomUpper.includes('E.M.PU') || nomUpper.includes('EMPU') || nomUpper.includes('MATERNELLE')) {
                      sigle = 'E.M.PU';
                    } else if (nomUpper.includes('E.E.PU') || nomUpper.includes('EEPU') || nomUpper.includes('ELEMENTAIRE')) {
                      sigle = 'E.E.PU';
                    } else if (nomUpper.includes('E.P.PU') || nomUpper.includes('EPPU') || nomUpper.includes('PRIMAIRE')) {
                      sigle = 'E.P.PU';
                    } else {
                      // Par défaut, déduire du nom
                      sigle = 'E.PU';
                    }
                  }
                  
                  return (
                    <tr key={ecole.id}>
                      <td className="font-semibold">{ecole.nom}</td>
                      <td>{sigle}</td>
                      <td>{ecole.commune}</td>
                      <td className="text-center">{nbEns}</td>
                      <td className="text-center">
                        {ips ? ips.toFixed(1) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <footer className="text-center py-8 text-white/80">
        <p className="text-sm">
          Développé par <strong>LOUIS Olivier</strong> © 2026
        </p>
      </footer>

      {/* Modal d'export PDF */}
      <PDFExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={async (elements, options) => {
          setShowExportModal(false);
          await exportMultipleElementsToPDF(
            elements,
            `circonscription-cayenne2-${new Date().toISOString().split('T')[0]}`,
            options
          );
        }}
        availableElements={[
          { id: 'stats-grid', label: '📊 Statistiques Générales', selected: true },
          { id: 'charts-section', label: '📈 Graphiques et Analyses', selected: true },
          { id: 'section-graphique-ips', label: '📊 Graphique IPS', selected: true },
          { id: 'ecoles-list', label: '🏫 Liste des Écoles', selected: false }
        ]}
        defaultFilename="circonscription-cayenne2"
      />
    </div>
  );
}
