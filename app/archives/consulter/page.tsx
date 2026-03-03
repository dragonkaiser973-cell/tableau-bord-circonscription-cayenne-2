'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function ConsulterArchivePage() {
  const [archive, setArchive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const annee = searchParams.get('annee');

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/');
      return;
    }

    if (!annee) {
      setError('Année scolaire manquante');
      setLoading(false);
      return;
    }

    loadArchive();
  }, [annee, router]);

  const loadArchive = async () => {
    try {
      console.log(`Chargement archive: ${annee}`);
      const res = await fetch(`/api/archives/${annee}`);
      
      if (!res.ok) {
        throw new Error('Archive non trouvée');
      }
      
      const data = await res.json();
      console.log('Archive chargée:', data);
      setArchive(data);
      setError(null);
    } catch (err: any) {
      console.error('Erreur chargement archive:', err);
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    if (!archive) return;
    
    const dataStr = JSON.stringify(archive, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `archive-${annee}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl">Chargement de l'archive {annee}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
        <div className="card max-w-lg text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/archives" className="btn-primary inline-block">
            ← Retour aux archives
          </Link>
        </div>
      </div>
    );
  }

  const stats = archive?.metadata?.stats || {};
  const donneesCalculees = archive?.donnees_calculees || {};
  const donneesBrutes = archive?.donnees_brutes || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      {/* Header */}
      <div className="text-white py-16 px-6">
        <div className="container mx-auto">
          <Link href="/archives" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6">
            ← Retour aux archives
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
                📚
              </div>
              <div>
                <h1 className="text-5xl font-bold">Archive {annee}</h1>
                <p className="text-xl opacity-90 mt-2">
                  Archivée le {new Date(archive?.dateArchivage).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
            <button
              onClick={downloadJSON}
              className="bg-white text-primary-700 px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors flex items-center gap-2"
            >
              💾 Télécharger JSON
            </button>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="container mx-auto px-6 py-8">
        {/* Statistiques générales */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                🏫
              </div>
              <div>
                <p className="text-sm text-gray-600">Écoles</p>
                <p className="text-2xl font-bold text-gray-800">{stats.nombreEcoles || 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
                👨‍🏫
              </div>
              <div>
                <p className="text-sm text-gray-600">Enseignants</p>
                <p className="text-2xl font-bold text-gray-800">{stats.nombreEnseignants || 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
                📚
              </div>
              <div>
                <p className="text-sm text-gray-600">Classes</p>
                <p className="text-2xl font-bold text-gray-800">{stats.nombreClasses || 0}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-2xl">
                👥
              </div>
              <div>
                <p className="text-sm text-gray-600">Effectifs</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalEffectifs || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Détails par catégorie */}
        <div className="space-y-6">
          {/* Écoles */}
          <div className="card">
            <h3 className="text-xl font-bold text-gray-800 mb-4">🏫 Écoles ({donneesBrutes.ecoles_identite?.length || 0})</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">UAI</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Nom</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Commune</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {donneesBrutes.ecoles_identite?.slice(0, 10).map((ecole: any, idx: number) => (
                    <tr key={idx} className="border-t">
                      <td className="px-4 py-2 text-sm">{ecole.uai}</td>
                      <td className="px-4 py-2 text-sm font-medium">{ecole.nom}</td>
                      <td className="px-4 py-2 text-sm">{ecole.commune}</td>
                      <td className="px-4 py-2 text-sm">{ecole.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {donneesBrutes.ecoles_identite?.length > 10 && (
                <p className="text-sm text-gray-600 mt-2 text-center">
                  ... et {donneesBrutes.ecoles_identite.length - 10} autres écoles
                </p>
              )}
            </div>
          </div>

          {/* Enseignants */}
          <div className="card">
            <h3 className="text-xl font-bold text-gray-800 mb-4">👨‍🏫 Enseignants ({donneesBrutes.enseignants?.length || 0})</h3>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Titulaires</p>
                <p className="text-2xl font-bold text-blue-700">
                  {donneesCalculees.enseignants?.par_statut?.titulaires || 0}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Stagiaires</p>
                <p className="text-2xl font-bold text-green-700">
                  {donneesCalculees.enseignants?.par_statut?.stagiaires || 0}
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Contractuels</p>
                <p className="text-2xl font-bold text-orange-700">
                  {donneesCalculees.enseignants?.par_statut?.contractuels || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Évaluations */}
          <div className="card">
            <h3 className="text-xl font-bold text-gray-800 mb-4">📊 Évaluations ({donneesBrutes.evaluations?.length || 0})</h3>
            <p className="text-gray-600">
              {stats.nombreEvaluations || 0} évaluations archivées
            </p>
          </div>

          {/* Stagiaires M2 */}
          {donneesBrutes.stagiaires_m2?.length > 0 && (
            <div className="card">
              <h3 className="text-xl font-bold text-gray-800 mb-4">🎓 Stagiaires M2 ({donneesBrutes.stagiaires_m2.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Nom</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Prénom</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donneesBrutes.stagiaires_m2.slice(0, 10).map((stagiaire: any, idx: number) => (
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-2 text-sm font-medium">{stagiaire.nom}</td>
                        <td className="px-4 py-2 text-sm">{stagiaire.prenom}</td>
                        <td className="px-4 py-2 text-sm">{stagiaire.statut}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
