'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

function CirconscriptionArchivePageContent() {
  const [archive, setArchive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const annee = searchParams.get('annee');
  const router = useRouter();

  useEffect(() => {
    if (!annee) {
      router.push('/archives');
      return;
    }
    loadArchive();
  }, [annee, router]);

  const loadArchive = async () => {
    try {
      const res = await fetch(`/api/archives/data?annee=${annee}`);
      const data = await res.json();
      setArchive(data);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!archive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-xl mb-4">Archive non trouvée</p>
          <Link href="/archives" className="btn-primary inline-block">
            ← Retour aux archives
          </Link>
        </div>
      </div>
    );
  }

  // Récupérer les données
  const donnees = archive.donnees_calculees || {};
  const circonscription = donnees.circonscription || {};
  const brutes = archive.donnees_brutes || archive.data || {};
  
  // Données circonscription
  const personnelIEN = circonscription.personnel_ien || [];
  const statsParStatut = circonscription.stats_par_statut || {};
  const statsParEcole = circonscription.stats_par_ecole || {};
  const graphiqueIPS = circonscription.graphique_ips || [];
  const listeEcoles = circonscription.liste_ecoles_complete || [];

  // Statistiques générales
  const statsGenerales = circonscription.statistiques_generales || {};

  // Préparer données graphiques
  const prepareDataCamembert = (data: any, label: string) => {
    const entries = Object.entries(data).sort((a: any, b: any) => b[1] - a[1]);
    return {
      labels: entries.map(([key]) => key),
      datasets: [{
        label,
        data: entries.map(([_, value]) => value),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',   // vert
          'rgba(249, 115, 22, 0.8)',  // orange
          'rgba(239, 68, 68, 0.8)',   // rouge
          'rgba(59, 130, 246, 0.8)',  // bleu
          'rgba(168, 85, 247, 0.8)',  // violet
          'rgba(236, 72, 153, 0.8)',  // rose
          'rgba(14, 165, 233, 0.8)',  // cyan
          'rgba(251, 191, 36, 0.8)',  // jaune
        ],
        borderColor: 'white',
        borderWidth: 2,
      }]
    };
  };

  // Préparer données IPS
  const dataIPS = graphiqueIPS.length > 0 ? {
    labels: graphiqueIPS.map((e: any) => {
      const nom = e.nom || 'Inconnu';
      return nom.replace('E.E.PU ', '').replace('E.M.PU ', '').replace('E.P.PU ', '');
    }),
    datasets: [{
      label: 'IPS',
      data: graphiqueIPS.map((e: any) => e.ips),
      backgroundColor: graphiqueIPS.map((e: any) => 
        e.ips >= 110 ? 'rgba(34, 197, 94, 0.8)' :
        e.ips >= 100 ? 'rgba(59, 130, 246, 0.8)' :
        e.ips >= 90 ? 'rgba(249, 115, 22, 0.8)' :
        'rgba(239, 68, 68, 0.8)'
      ),
      borderColor: 'white',
      borderWidth: 1,
    }]
  } : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      <div className="text-white py-16 px-6">
        <div className="container mx-auto">
          <Link href={`/archives/consulter?annee=${annee}`} className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6">
            ← Retour à l'archive {annee}
          </Link>
          
          {/* Banner mode archive */}
          <div className="bg-amber-500/20 border-2 border-amber-300 rounded-lg p-4 mb-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📖</span>
              <div>
                <h3 className="text-lg font-bold">Mode Consultation Archive</h3>
                <p className="opacity-90">Circonscription - Année scolaire {annee}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
              🌍
            </div>
            <div>
              <h1 className="text-5xl font-bold">Circonscription</h1>
              <p className="text-xl opacity-90 mt-2">Vue d'ensemble</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Statistiques générales */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <div className="text-5xl mb-2">🏫</div>
            <div className="text-4xl font-bold text-primary-700">{statsGenerales.nombreEcoles || 0}</div>
            <div className="text-gray-600 mt-2">Écoles</div>
          </div>
          <div className="card text-center">
            <div className="text-5xl mb-2">👨‍🏫</div>
            <div className="text-4xl font-bold text-primary-700">{statsGenerales.nombreEnseignants || 0}</div>
            <div className="text-gray-600 mt-2">Enseignants</div>
          </div>
          <div className="card text-center">
            <div className="text-5xl mb-2">🎓</div>
            <div className="text-4xl font-bold text-primary-700">{statsGenerales.nombreClasses || 0}</div>
            <div className="text-gray-600 mt-2">Classes</div>
            {statsGenerales.classesDedoublees > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {statsGenerales.classesDedoublees} dédoublées / {statsGenerales.classesStandard} standard
              </div>
            )}
          </div>
          <div className="card text-center">
            <div className="text-5xl mb-2">📊</div>
            <div className="text-4xl font-bold text-primary-700">{statsGenerales.moyenneElevesParClasse || 0}</div>
            <div className="text-gray-600 mt-2">Moyenne Élèves/Classe</div>
            {statsGenerales.moyenneClassesDedoublees > 0 && (
              <div className="text-xs text-gray-500 mt-1 space-y-1">
                <div className="flex justify-between px-4">
                  <span>Dédoublées:</span>
                  <span className="font-bold">{statsGenerales.moyenneClassesDedoublees}</span>
                </div>
                <div className="flex justify-between px-4">
                  <span>Standard:</span>
                  <span className="font-bold">{statsGenerales.moyenneClassesStandard}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Personnel de Circonscription (IEN) */}
        {personnelIEN && personnelIEN.length > 0 && (
          <div className="card mb-8">
            <h3 className="text-2xl font-bold text-purple-900 mb-6 flex items-center gap-3">
              <span className="text-3xl">📋</span>
              Personnel de Circonscription (IEN)
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-purple-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase">Nom</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase">Prénom</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase">Fonction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-purple-700 uppercase">Statut</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {personnelIEN.map((personne: any, idx: number) => (
                    <tr key={idx} className="hover:bg-purple-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{personne.nom}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{personne.prenom}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{personne.discipline || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{personne.statut || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Graphiques */}
        {(Object.keys(statsParStatut).length > 0 || Object.keys(statsParEcole).length > 0) && (
          <div className="card mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <span className="text-3xl">📊</span>
              Répartition des Enseignants
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Par Statut - Camembert */}
              {Object.keys(statsParStatut).length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-gray-700 mb-4 text-center">Par Statut</h4>
                  <div className="flex justify-center items-center min-h-[400px]">
                    <div style={{ maxWidth: '400px', maxHeight: '400px' }}>
                      <Pie 
                        data={prepareDataCamembert(statsParStatut, 'Enseignants')}
                        options={{
                          responsive: true,
                          maintainAspectRatio: true,
                          plugins: {
                            legend: { position: 'bottom' },
                            title: { display: false }
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <div className="text-sm text-gray-600 space-y-1">
                      {Object.entries(statsParStatut).map(([statut, nb]: any) => (
                        <div key={statut}>
                          <span className="font-semibold">{statut}</span>: {nb} enseignant{nb > 1 ? 's' : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Par École - Barres Horizontales */}
              {Object.keys(statsParEcole).length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-gray-700 mb-4 text-center">Par École</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <Bar 
                      data={{
                        labels: Object.entries(statsParEcole)
                          .sort((a: any, b: any) => b[1] - a[1])
                          .map(([ecole]) => ecole.replace('E.E.PU ', '').replace('E.M.PU ', '').replace('E.P.PU ', '')),
                        datasets: [{
                          label: 'Nombre d\'enseignants',
                          data: Object.entries(statsParEcole)
                            .sort((a: any, b: any) => b[1] - a[1])
                            .map(([_, nb]) => nb),
                          backgroundColor: 'rgba(59, 130, 246, 0.8)',
                          borderColor: 'white',
                          borderWidth: 1,
                        }]
                      }}
                      options={{
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          title: { display: false }
                        },
                        scales: {
                          x: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0, 0, 0, 0.05)' }
                          },
                          y: {
                            grid: { display: false }
                          }
                        }
                      }}
                      height={Object.keys(statsParEcole).length * 30}
                    />
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                      {Object.keys(statsParEcole).length} écoles
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Graphique IPS */}
        {dataIPS && (
          <div className="card mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <span className="text-3xl">📊</span>
              Indice de Position Sociale (IPS) par École
            </h3>
            <div className="bg-gray-50 p-6 rounded-lg">
              <Bar 
                data={dataIPS}
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    title: { display: false }
                  },
                  scales: {
                    x: {
                      beginAtZero: true,
                      max: 130,
                      grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    },
                    y: {
                      grid: { display: false }
                    }
                  }
                }}
                height={graphiqueIPS.length * 40}
              />
            </div>
            <div className="mt-4 flex gap-6 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>IPS ≥ 110 (Très favorable)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span>100 ≤ IPS &lt; 110 (Favorable)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded"></div>
                <span>90 ≤ IPS &lt; 100 (Moyen)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>IPS &lt; 90 (Défavorable)</span>
              </div>
            </div>
          </div>
        )}

        {/* Liste des écoles */}
        {listeEcoles && listeEcoles.length > 0 && (
          <div className="card">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <span className="text-3xl">🏫</span>
              Liste des Écoles
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">École</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Commune</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Enseignants</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Classes</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">IPS</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {listeEcoles.map((ecole: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {ecole.nom || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {ecole.commune || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          ecole.type === 'E.E.PU' ? 'bg-blue-100 text-blue-800' :
                          ecole.type === 'E.M.PU' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {ecole.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center">
                        <span className="font-bold text-gray-800">{ecole.nb_enseignants || 0}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 text-center">
                        <span className="font-bold text-gray-800">{ecole.nb_classes || 0}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        {ecole.ips ? (
                          <span className={`px-2 py-1 rounded font-semibold ${
                            ecole.ips >= 110 ? 'bg-green-100 text-green-800' :
                            ecole.ips >= 100 ? 'bg-blue-100 text-blue-800' :
                            ecole.ips >= 90 ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {ecole.ips}
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CirconscriptionArchivePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]"><div className="text-white">Chargement...</div></div>}>
      <CirconscriptionArchivePageContent />
    </Suspense>
  );
}
