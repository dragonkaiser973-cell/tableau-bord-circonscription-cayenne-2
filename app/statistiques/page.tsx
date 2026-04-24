'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import PDFExportModal from '@/components/PDFExportModal';
import AuroraHeader from '@/components/AuroraHeader';
import StatPill from '@/components/StatPill';
import { exportMultipleElementsToPDF, PDFExportOptions } from '@/lib/pdfExport';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

interface StatsEcole {
  uai: string;
  nom: string;
  effectifs: {
    [key: string]: number;
  };
  repartitions: {
    [key: string]: number;
  };
  totaux: {
    [key: string]: number;
  };
}

export default function StatistiquesPage() {
  const [loading, setLoading] = useState(true);
  const [statsEcoles, setStatsEcoles] = useState<StatsEcole[]>([]);
  const [ecoles, setEcoles] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [enseignants, setEnseignants] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      const [statsRes, ecolesRes, structuresRes, ensRes, evalRes] = await Promise.all([
        fetch('/api/statistiques-ecoles').catch(() => ({ ok: false })),
        fetch('/api/ecoles').catch(() => ({ ok: false })),
        fetch('/api/ecoles-structure').catch(() => ({ ok: false })),
        fetch('/api/enseignants').catch(() => ({ ok: false })),
        fetch('/api/evaluations').catch(() => ({ ok: false }))
      ]);

      if (statsRes.ok && 'json' in statsRes) {
        const statsData = await statsRes.json();
        setStatsEcoles(statsData);
      }

      if (ecolesRes.ok && 'json' in ecolesRes) {
        const ecolesData = await ecolesRes.json();
        setEcoles(ecolesData);
      }

      if (structuresRes.ok && 'json' in structuresRes) {
        const structuresData = await structuresRes.json();
        setStructures(structuresData);
      }

      if (ensRes.ok && 'json' in ensRes) {
        const ensData = await ensRes.json();
        setEnseignants(ensData);
      }

      if (evalRes.ok && 'json' in evalRes) {
        const evalData = await evalRes.json();
        setEvaluations(evalData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement données:', error);
      setLoading(false);
    }
  };

  // Calculs globaux
  const totalEleves = statsEcoles.reduce((sum, ecole) => 
    sum + (ecole.effectifs['Admis définitifs'] || ecole.effectifs['Admis'] || 0), 0
  );

  const totalClasses = structures.reduce((sum, s) => sum + (s.classes?.length || 0), 0);
  const totalEnseignants = enseignants.length;
  const totalEcoles = ecoles.length;

  // Totaux par niveau pour la circonscription
  const getTotauxParNiveau = () => {
    const totaux: { [key: string]: number } = {};
    
    statsEcoles.forEach(ecole => {
      Object.entries(ecole.repartitions).forEach(([niveau, effectif]) => {
        totaux[niveau] = (totaux[niveau] || 0) + effectif;
      });
    });

    return totaux;
  };

  const totauxNiveau = getTotauxParNiveau();

  // Répartition par cycle (utiliser les totaux de cycle des écoles, pas les niveaux)
  const getCycleData = () => {
    const cycles: { [key: string]: number } = {
      'Maternelle': 0,
      'Cycle 2': 0,
      'Cycle 3': 0
    };
    
    statsEcoles.forEach(ecole => {
      // Utiliser les totaux de cycles fournis par ONDE
      if (ecole.totaux['CYCLE I']) {
        cycles['Maternelle'] += ecole.totaux['CYCLE I'];
      }
      if (ecole.totaux['CYCLE II']) {
        cycles['Cycle 2'] += ecole.totaux['CYCLE II'];
      }
      if (ecole.totaux['CYCLE III']) {
        cycles['Cycle 3'] += ecole.totaux['CYCLE III'];
      }
    });

    return cycles;
  };

  const cycleData = getCycleData();

  // Données pour le graphique des cycles
  const cycleChartData = {
    labels: Object.keys(cycleData),
    datasets: [{
      label: 'Effectifs par cycle',
      data: Object.values(cycleData),
      backgroundColor: [
        '#8b5cf6',
        '#3b82f6',
        '#10b981',
        '#f59e0b',
      ],
    }]
  };

  // Données pour le graphique des niveaux
  const niveauxChartData = {
    labels: Object.keys(totauxNiveau).filter(n => totauxNiveau[n] > 0),
    datasets: [{
      label: 'Effectifs par niveau',
      data: Object.keys(totauxNiveau).filter(n => totauxNiveau[n] > 0).map(n => totauxNiveau[n]),
      backgroundColor: [
        '#a855f7', // PS - Violet
        '#8b5cf6', // MS - Violet foncé
        '#7c3aed', // GS - Violet plus foncé
        '#3b82f6', // CP - Bleu
        '#2563eb', // CE1 - Bleu foncé
        '#1d4ed8', // CE2 - Bleu plus foncé
        '#10b981', // CM1 - Vert
        '#059669', // CM2 - Vert foncé
      ],
    }]
  };

  // Moyennes évaluations
  const getMoyennesEvaluations = () => {
    if (evaluations.length === 0) {
      console.log('⚠️ Aucune évaluation chargée');
      return null;
    }

    console.log(`📊 ${evaluations.length} évaluations trouvées`);

    const latest = Math.max(...evaluations.map(e => e.rentree));
    const latestEvals = evaluations.filter(e => e.rentree === latest);

    console.log(`📅 Année la plus récente: ${latest}, ${latestEvals.length} évaluations`);

    const francais = latestEvals.filter(e => e.matiere === 'français');
    const maths = latestEvals.filter(e => e.matiere === 'mathématiques');

    console.log(`📝 Français: ${francais.length} évaluations, Maths: ${maths.length} évaluations`);

    // Vérifier les valeurs
    if (francais.length > 0) {
      const sampleFr = francais[0];
      console.log(`Exemple français - tx_groupe_3: ${sampleFr.tx_groupe_3}, type: ${typeof sampleFr.tx_groupe_3}`);
    }

    // tx_groupe_3 est un nombre décimal (ex: 0.65 pour 65%)
    // Il faut le multiplier par 100 pour avoir un pourcentage
    const sumFr = francais.reduce((sum, e) => {
      const val = parseFloat(e.tx_groupe_3) || 0;
      return sum + val;
    }, 0);
    
    const sumMa = maths.reduce((sum, e) => {
      const val = parseFloat(e.tx_groupe_3) || 0;
      return sum + val;
    }, 0);

    const avgFr = francais.length > 0 
      ? ((sumFr / francais.length) * 100).toFixed(1)
      : '0';

    const avgMa = maths.length > 0
      ? ((sumMa / maths.length) * 100).toFixed(1)
      : '0';

    console.log(`✅ Moyennes calculées - Français: ${avgFr}%, Maths: ${avgMa}%`);

    return { francais: avgFr, maths: avgMa, annee: latest };
  };

  const moyennesEval = getMoyennesEvaluations();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
        <div className="text-center text-white">
          <div className="w-12 h-12 rounded-full border-4 border-white/30 border-t-white animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AuroraHeader
        kicker="Cayenne 2 — Roura"
        title="Statistiques"
        titleAccent="globales."
        subtitle="Vision agrégée : élèves, classes, enseignants, moyennes aux évaluations nationales."
        backLabel="Retour à l'accueil"
        action={
          <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-md text-primary-700 px-5 py-2.5 rounded-full font-semibold text-sm shadow-lg hover:bg-white hover:-translate-y-0.5 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exporter en PDF
          </button>
        }
      />

      {/* Contenu */}
      <div className="container mx-auto max-w-7xl px-6 py-8 -mt-20 relative z-10">
        
        {/* Cards statistiques principales */}
        <div className="flex flex-wrap gap-3 mb-8" id="section-stats-generales">
          <StatPill
            value={totalEleves}
            label="Élèves"
            gradient="from-sky-400 via-cyan-400 to-teal-400"
            variant="light"
          />
          <StatPill
            value={totalClasses}
            label="Classes"
            gradient="from-emerald-400 via-teal-400 to-cyan-400"
            variant="light"
          />
          <StatPill
            value={totalEnseignants}
            label="Enseignants"
            gradient="from-violet-400 via-fuchsia-400 to-pink-400"
            variant="light"
          />
          <StatPill
            value={totalEcoles}
            label="Écoles"
            gradient="from-amber-400 via-orange-400 to-rose-500"
            variant="light"
          />
        </div>

        {/* Moyennes évaluations */}
        {moyennesEval && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              📈 Moyennes Évaluations Nationales {moyennesEval.annee}
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-2 border-blue-200">
                <div className="text-sm font-semibold text-blue-600 mb-2">Français</div>
                <div className="text-3xl font-bold text-blue-800">{moyennesEval.francais}%</div>
                <div className="text-xs text-blue-600 mt-1">Au-dessus seuil 2</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-2 border-green-200">
                <div className="text-sm font-semibold text-green-600 mb-2">Mathématiques</div>
                <div className="text-3xl font-bold text-green-800">{moyennesEval.maths}%</div>
                <div className="text-xs text-green-600 mt-1">Au-dessus seuil 2</div>
              </div>
            </div>
          </div>
        )}

        {/* Graphiques */}
        <div className="grid md:grid-cols-2 gap-6 mb-8" id="section-graphiques">
          {/* Répartition par cycle */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">📊 Répartition par cycle</h3>
            <Pie 
              data={cycleChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
            />
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {Object.entries(cycleData).map(([cycle, effectif]) => (
                <div key={cycle} className="bg-gray-50 p-2 rounded">
                  <span className="font-semibold">{cycle}:</span> {effectif} élèves
                </div>
              ))}
            </div>
          </div>

          {/* Répartition par niveaux */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">🎯 Répartition par niveau</h3>
            <Pie 
              data={niveauxChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
            />
            <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
              {Object.entries(totauxNiveau).filter(([_, effectif]) => effectif > 0).map(([niveau, effectif]) => (
                <div key={niveau} className="bg-gray-50 p-2 rounded text-center">
                  <div className="font-bold text-primary-700">{niveau}</div>
                  <div className="text-gray-600">{effectif}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Graphique toutes les écoles classées par effectif */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8" id="section-classement-ecoles">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📊 Classement des écoles par effectif</h3>
          <Bar 
            data={{
              labels: [...statsEcoles]
                .sort((a, b) => {
                  const effA = a.effectifs['Admis définitifs'] || a.effectifs['Admis'] || 0;
                  const effB = b.effectifs['Admis définitifs'] || b.effectifs['Admis'] || 0;
                  return effB - effA;
                })
                .map(e => e.nom),
              datasets: [{
                label: 'Effectifs',
                data: [...statsEcoles]
                  .sort((a, b) => {
                    const effA = a.effectifs['Admis définitifs'] || a.effectifs['Admis'] || 0;
                    const effB = b.effectifs['Admis définitifs'] || b.effectifs['Admis'] || 0;
                    return effB - effA;
                  })
                  .map(e => e.effectifs['Admis définitifs'] || e.effectifs['Admis'] || 0),
                backgroundColor: [...statsEcoles]
                  .sort((a, b) => {
                    const effA = a.effectifs['Admis définitifs'] || a.effectifs['Admis'] || 0;
                    const effB = b.effectifs['Admis définitifs'] || b.effectifs['Admis'] || 0;
                    return effB - effA;
                  })
                  .map(e => {
                    // Couleur selon le type d'école
                    if (e.nom.startsWith('E.M.PU')) return '#8b5cf6'; // Violet - Maternelle
                    if (e.nom.startsWith('E.E.PU')) return '#3b82f6'; // Bleu - Élémentaire
                    if (e.nom.startsWith('E.P.PU')) return '#10b981'; // Vert - Primaire
                    return '#6b7280'; // Gris par défaut
                  }),
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              indexAxis: 'y',
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  callbacks: {
                    label: (context) => `${context.parsed.x} élèves`
                  }
                }
              },
              scales: {
                x: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Nombre d\'élèves'
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
          <div className="mt-4 flex gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span>Maternelle</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>Élémentaire</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Primaire</span>
            </div>
          </div>
        </div>

        {/* Totaux par niveau pour la circonscription */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8" id="section-totaux-niveau">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📊 Totaux par niveau - Circonscription</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Maternelle */}
            <div>
              <h4 className="font-bold text-purple-600 mb-3 text-lg">🎨 Maternelle</h4>
              <div className="space-y-2">
                {['PS', 'MS', 'GS'].map(niveau => (
                  totauxNiveau[niveau] && (
                    <div key={niveau} className="flex justify-between items-center bg-purple-50 p-2 rounded">
                      <span className="font-medium">{niveau}</span>
                      <span className="font-bold text-purple-700">{totauxNiveau[niveau]} élèves</span>
                    </div>
                  )
                ))}
                <div className="flex justify-between items-center bg-purple-100 p-2 rounded font-bold border-t-2 border-purple-300 mt-2">
                  <span>Total Maternelle</span>
                  <span className="text-purple-800">{cycleData['Maternelle']} élèves</span>
                </div>
              </div>
            </div>

            {/* Cycle 2 */}
            <div>
              <h4 className="font-bold text-blue-600 mb-3 text-lg">📚 Cycle 2</h4>
              <div className="space-y-2">
                {['CP', 'CE1', 'CE2'].map(niveau => (
                  totauxNiveau[niveau] && (
                    <div key={niveau} className="flex justify-between items-center bg-blue-50 p-2 rounded">
                      <span className="font-medium">{niveau}</span>
                      <span className="font-bold text-blue-700">{totauxNiveau[niveau]} élèves</span>
                    </div>
                  )
                ))}
                <div className="flex justify-between items-center bg-blue-100 p-2 rounded font-bold border-t-2 border-blue-300 mt-2">
                  <span>Total Cycle 2</span>
                  <span className="text-blue-800">{cycleData['Cycle 2']} élèves</span>
                </div>
              </div>
            </div>

            {/* Cycle 3 */}
            <div>
              <h4 className="font-bold text-green-600 mb-3 text-lg">🎓 Cycle 3</h4>
              <div className="space-y-2">
                {['CM1', 'CM2'].map(niveau => (
                  totauxNiveau[niveau] && (
                    <div key={niveau} className="flex justify-between items-center bg-green-50 p-2 rounded">
                      <span className="font-medium">{niveau}</span>
                      <span className="font-bold text-green-700">{totauxNiveau[niveau]} élèves</span>
                    </div>
                  )
                ))}
                <div className="flex justify-between items-center bg-green-100 p-2 rounded font-bold border-t-2 border-green-300 mt-2">
                  <span>Total Cycle 3</span>
                  <span className="text-green-800">{cycleData['Cycle 3']} élèves</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tableau détaillé par école */}
        <div className="bg-white rounded-xl shadow-lg p-6" id="section-detail-ecoles">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📋 Détails par école</h3>
          
          <div className="space-y-6">
            {statsEcoles.map((ecole, idx) => {
              const structure = structures.find(s => s.uai === ecole.uai);
              const nbClasses = structure?.classes?.length || 0;
              
              return (
                <div key={idx} className="border-2 border-gray-200 rounded-lg p-4">
                  {/* En-tête école */}
                  <div className="flex justify-between items-center mb-4 pb-3 border-b-2 border-gray-300">
                    <div>
                      <h4 className="text-lg font-bold text-gray-800">{ecole.nom}</h4>
                      <p className="text-sm text-gray-600">UAI: {ecole.uai} • {nbClasses} classes</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary-600">
                        {ecole.effectifs['Admis définitifs'] || ecole.effectifs['Admis'] || 0}
                      </div>
                      <div className="text-xs text-gray-600">élèves admis</div>
                    </div>
                  </div>

                  {/* Répartition par niveau */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-semibold text-gray-700 mb-2 text-sm">Effectifs par niveau</h5>
                      <div className="bg-gray-50 rounded p-3 space-y-1">
                        {Object.entries(ecole.repartitions).map(([niveau, effectif]) => (
                          <div key={niveau} className="flex justify-between text-sm">
                            <span className="font-medium">{niveau}</span>
                            <span className="font-bold text-primary-700">{effectif}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-semibold text-gray-700 mb-2 text-sm">État des admissions</h5>
                      <div className="bg-gray-50 rounded p-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Admis</span>
                          <span className="font-bold">{ecole.effectifs['Admis'] || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Répartis</span>
                          <span className="font-bold text-green-600">{ecole.effectifs['répartis'] || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Non répartis</span>
                          <span className="font-bold text-orange-600">{ecole.effectifs['non répartis'] || ecole.effectifs['non réparti'] || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Radiés</span>
                          <span className="font-bold text-red-600">{ecole.effectifs['Radiés'] || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
            `statistiques-${new Date().toISOString().split('T')[0]}`,
            options
          );
        }}
        availableElements={[
          { id: 'section-stats-generales', label: '📊 Statistiques Générales', selected: true },
          { id: 'section-graphiques', label: '📈 Graphiques d\'Analyse', selected: true },
          { id: 'section-classement-ecoles', label: '📊 Classement des Écoles par Effectif', selected: true },
          { id: 'section-totaux-niveau', label: '📊 Totaux par Niveau', selected: true },
          { id: 'section-detail-ecoles', label: '📋 Détails par École', selected: false }
        ]}
        defaultFilename="statistiques-circonscription"
      />
    </div>
  );
}
