'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ConsulterArchivePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [archive, setArchive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const annee = searchParams.get('annee');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/');
    } else {
      setIsAuthenticated(true);
      if (annee) {
        loadArchive();
      }
    }
  }, [router, annee]);

  const loadArchive = async () => {
    try {
      // MODIFIÉ : Utiliser la nouvelle API sans route dynamique
      const res = await fetch(`/api/archives?annee=${annee}`);
      const data = await res.json();
      setArchive(data);
    } catch (error) {
      console.error('Erreur chargement archive:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl">Chargement de l'archive...</p>
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

  // Récupérer les données (v3 ou v2)
  const donnees = archive.donnees_calculees || {};
  const brutes = archive.donnees_brutes || archive.data || {};
  const metadata = archive.metadata || {};
  
  // Données Pilotage
  const pilotage = donnees.pilotage || {};
  const indicateurs = pilotage.indicateurs || {
    nombreClasses: brutes.ecoles_structure?.reduce((acc: number, e: any) => acc + (e.classes?.length || 0), 0) || 0,
    totalEffectifs: brutes.statistiques_ecoles?.reduce((acc: number, s: any) => acc + (s.effectifs?.['Admis définitifs'] || s.effectifs?.['Admis'] || 0), 0) || 0
  };
  const evolutionEffectifs = pilotage.evolution_effectifs || [];
  const rh = pilotage.ressources_humaines || {};
  const top5 = pilotage.top5_ecoles || [];
  const bottom5 = pilotage.bottom5_ecoles || [];
  
  // Données Circonscription
  const circonscription = donnees.circonscription || {};
  const statsGenerales = circonscription.statistiques_generales || metadata.stats || {};
  
  // Données Statistiques
  const statistiques = donnees.statistiques || {};
  const totauxNiveau = statistiques.totaux_par_niveau || {};
  
  // Données Enseignants
  const enseignants = donnees.enseignants || {};
  const totalEnseignants = enseignants.total || brutes.enseignants?.length || 0;
  const parStatut = enseignants.par_statut || {};
  
  // Données Calendrier
  const calendrier = donnees.calendrier || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      {/* Header */}
      <div className="text-white py-16 px-6">
        <div className="container mx-auto">
          <Link href="/archives" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6">
            ← Retour aux archives
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
              📅
            </div>
            <div>
              <h1 className="text-5xl font-bold">Archive {annee}</h1>
              <p className="text-xl opacity-90 mt-2">
                Archivé le {new Date(archive.dateArchivage).toLocaleDateString('fr-FR')}
              </p>
              {archive.version && (
                <p className="text-sm opacity-75 mt-1">Version {archive.version}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="container mx-auto px-6 py-8">
        {/* Banner info */}
        <div className="card mb-8 bg-blue-50 border-2 border-blue-300">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📖</span>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-blue-900">Mode consultation - Archive complète</h3>
              <p className="text-blue-800">Toutes les données de l'année scolaire {annee}</p>
            </div>
            {metadata.completude && (
              <div className="text-sm text-blue-700">
                <div className="font-semibold mb-1">Complétude :</div>
                <div className="space-y-1">
                  {Object.entries(metadata.completude).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span>{value ? '✅' : '⚠️'}</span>
                      <span className="capitalize">{key}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION PILOTAGE */}
        <div className="card mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
            <span className="text-4xl">📊</span>
            Vue Pilotage
          </h2>

          {/* Indicateurs Clés */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-200">
              <div className="text-sm text-blue-600 font-semibold mb-1">ANNÉE SCOLAIRE</div>
              <div className="text-3xl font-bold text-blue-900">{annee}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border-2 border-purple-200">
              <div className="text-sm text-purple-600 font-semibold mb-1">CLASSES</div>
              <div className="text-3xl font-bold text-purple-900">{indicateurs.nombreClasses || statsGenerales.nombreClasses || 0}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border-2 border-green-200">
              <div className="text-sm text-green-600 font-semibold mb-1">EFFECTIFS</div>
              <div className="text-3xl font-bold text-green-900">{indicateurs.totalEffectifs || statsGenerales.totalEffectifs || 0}</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border-2 border-orange-200">
              <div className="text-sm text-orange-600 font-semibold mb-1">MOYENNE/CLASSE</div>
              <div className="text-3xl font-bold text-orange-900">{indicateurs.moyenneElevesParClasse || statsGenerales.moyenneElevesParClasse || 0}</div>
            </div>
          </div>

          {/* Ressources Humaines */}
          {(rh.titulaires || parStatut.titulaires) && (
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">👥 Ressources Humaines</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Titulaires</span>
                    <span className="text-3xl font-bold text-blue-700">{rh.titulaires || parStatut.titulaires || 0}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {parStatut.titulaires && totalEnseignants > 0 ? Math.round((parStatut.titulaires / totalEnseignants) * 100) : 0}% du total
                  </div>
                </div>
                <div className="p-6 bg-green-50 rounded-lg border-2 border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Stagiaires</span>
                    <span className="text-3xl font-bold text-green-700">{rh.stagiaires || parStatut.stagiaires || 0}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {parStatut.stagiaires && totalEnseignants > 0 ? Math.round((parStatut.stagiaires / totalEnseignants) * 100) : 0}% du total
                  </div>
                </div>
                <div className="p-6 bg-red-50 rounded-lg border-2 border-red-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Contractuels</span>
                    <span className="text-3xl font-bold text-red-700">{rh.contractuels || parStatut.contractuels || 0}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {parStatut.contractuels && totalEnseignants > 0 ? Math.round((parStatut.contractuels / totalEnseignants) * 100) : 0}% du total
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top 5 et Bottom 5 */}
          {(top5.length > 0 || bottom5.length > 0) && (
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Top 5 */}
              {top5.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">🏆 Top 5 - Effectifs</h3>
                  <div className="space-y-2">
                    {top5.map((ecole: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-green-700">#{idx + 1}</span>
                          <span className="font-medium text-gray-800">{ecole.nom}</span>
                        </div>
                        <span className="text-xl font-bold text-green-700">{ecole.effectif}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom 5 */}
              {bottom5.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4">📉 Plus Petites Écoles</h3>
                  <div className="space-y-2">
                    {bottom5.map((ecole: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="font-medium text-gray-800">{ecole.nom}</span>
                        <span className="text-xl font-bold text-blue-700">{ecole.effectif}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION STATISTIQUES */}
        {Object.keys(totauxNiveau).length > 0 && (
          <div className="card mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <span className="text-4xl">📊</span>
              Statistiques par Niveau
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Maternelle */}
              <div>
                <h4 className="font-bold text-purple-600 mb-3 text-lg">🎨 Maternelle</h4>
                <div className="space-y-2">
                  {['PS', 'MS', 'GS'].map(niveau => (
                    totauxNiveau[niveau] !== undefined && (
                      <div key={niveau} className="flex justify-between items-center bg-purple-50 p-3 rounded border border-purple-200">
                        <span className="font-medium">{niveau}</span>
                        <span className="font-bold text-purple-700">{totauxNiveau[niveau]} élèves</span>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Élémentaire */}
              <div>
                <h4 className="font-bold text-blue-600 mb-3 text-lg">📘 Élémentaire</h4>
                <div className="space-y-2">
                  {['CP', 'CE1', 'CE2', 'CM1', 'CM2'].map(niveau => (
                    totauxNiveau[niveau] !== undefined && (
                      <div key={niveau} className="flex justify-between items-center bg-blue-50 p-3 rounded border border-blue-200">
                        <span className="font-medium">{niveau}</span>
                        <span className="font-bold text-blue-700">{totauxNiveau[niveau]} élèves</span>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Total */}
              <div>
                <h4 className="font-bold text-green-600 mb-3 text-lg">📊 Total</h4>
                <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200 text-center">
                  <div className="text-5xl font-bold text-green-700">
                    {Object.values(totauxNiveau).reduce((a: any, b: any) => a + b, 0)}
                  </div>
                  <div className="text-sm text-green-600 mt-2">élèves au total</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation vers les sous-pages */}
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📂 Consulter les données détaillées</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href={`/archives/consulter/circonscription?annee=${annee}`}>
              <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-4xl mb-3">🌍</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Circonscription</h3>
                <p className="text-sm text-gray-600">Vue d'ensemble et liste des écoles</p>
              </div>
            </Link>

            <Link href={`/archives/consulter/ecoles?annee=${annee}`}>
              <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border-2 border-purple-200 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-4xl mb-3">🏫</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Écoles</h3>
                <p className="text-sm text-gray-600">Détails par école et structures</p>
              </div>
            </Link>

            <Link href={`/archives/consulter/enseignants?annee=${annee}`}>
              <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-2 border-green-200 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-4xl mb-3">👨‍🏫</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Enseignants</h3>
                <p className="text-sm text-gray-600">Liste et statistiques RH</p>
              </div>
            </Link>

            <Link href={`/archives/consulter/evaluations?annee=${annee}`}>
              <div className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border-2 border-orange-200 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-4xl mb-3">📊</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Évaluations</h3>
                <p className="text-sm text-gray-600">Résultats et analyses</p>
              </div>
            </Link>

            <Link href={`/archives/consulter/statistiques?annee=${annee}`}>
              <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border-2 border-red-200 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="text-4xl mb-3">📈</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Statistiques</h3>
                <p className="text-sm text-gray-600">Classements et répartitions</p>
              </div>
            </Link>

            {calendrier && calendrier.total_evenements > 0 && (
              <Link href={`/archives/consulter/calendrier?annee=${annee}`}>
                <div className="p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border-2 border-yellow-200 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="text-4xl mb-3">📅</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Calendrier</h3>
                  <p className="text-sm text-gray-600">{calendrier.total_evenements} événements archivés</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
