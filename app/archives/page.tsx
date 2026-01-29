'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ArchivesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [archives, setArchives] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAnneeScolaire, setNewAnneeScolaire] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/');
    } else {
      setIsAuthenticated(true);
      loadArchives();
    }
  }, [router]);

  const loadArchives = async () => {
    try {
      const res = await fetch('/api/archives');
      const data = await res.json();
      setArchives(data.archives || []);
    } catch (error) {
      console.error('Erreur chargement archives:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArchive = async () => {
    if (!newAnneeScolaire) {
      setMessage({ type: 'error', text: 'Veuillez saisir une année scolaire' });
      return;
    }

    try {
      const res = await fetch('/api/archives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anneeScolaire: newAnneeScolaire })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ 
          type: 'success', 
          text: `Archive créée avec succès pour l'année ${newAnneeScolaire}` 
        });
        setShowCreateModal(false);
        setNewAnneeScolaire('');
        loadArchives();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la création' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la création de l\'archive' });
    }
  };

  const handleDeleteArchive = async (annee: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'archive ${annee} ?\n\nCette action est irréversible !`)) {
      return;
    }

    try {
      const res = await fetch(`/api/archives?annee=${annee}`, { method: 'DELETE' });
      
      if (res.ok) {
        setMessage({ type: 'success', text: `Archive ${annee} supprimée` });
        loadArchives();
      } else {
        setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
    }
  };

  const generateAnneeScolaire = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Si on est entre janvier et août, l'année scolaire a commencé l'année précédente
    if (month >= 0 && month <= 7) {
      return `${year - 1}-${year}`;
    } else {
      return `${year}-${year + 1}`;
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      {/* Header */}
      <div className="text-white py-16 px-6">
        <div className="container mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6">
            ← Retour à l'accueil
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
                📚
              </div>
              <div>
                <h1 className="text-5xl font-bold">Archives</h1>
                <p className="text-xl opacity-90 mt-2">Consultation des années scolaires passées</p>
              </div>
            </div>
            <button
              onClick={() => {
                setNewAnneeScolaire(generateAnneeScolaire());
                setShowCreateModal(true);
              }}
              className="bg-white text-primary-700 px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors flex items-center gap-2"
            >
              ➕ Nouvelle archive
            </button>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="container mx-auto px-6 py-8">
        {/* Message */}
        {message && (
          <div className={`card mb-6 ${message.type === 'success' ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{message.type === 'success' ? '✅' : '❌'}</span>
              <p className={`font-semibold ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                {message.text}
              </p>
            </div>
          </div>
        )}

        {/* Info box */}
        <div className="card mb-6 bg-blue-50 border-2 border-blue-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <h3 className="font-bold text-blue-900 mb-2">Comment utiliser les archives ?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Créer une archive</strong> : Sauvegardez toutes les données actuelles avant chaque nouvelle année scolaire</li>
                <li>• <strong>Consulter une archive</strong> : Cliquez sur "Consulter" pour voir les données de cette année dans l'interface</li>
                <li>• <strong>Recommandation</strong> : Créez une archive chaque 1er septembre avant d'importer les nouvelles données</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Liste des archives */}
        {archives.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Aucune archive</h3>
            <p className="text-gray-600 mb-6">Créez votre première archive pour sauvegarder les données de l'année en cours</p>
            <button
              onClick={() => {
                setNewAnneeScolaire(generateAnneeScolaire());
                setShowCreateModal(true);
              }}
              className="btn-primary inline-block"
            >
              ➕ Créer la première archive
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {archives.map(annee => (
              <div key={annee} className="card hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-2xl">
                    📅
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Année {annee}</h3>
                    <p className="text-sm text-gray-600">Archive complète</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link 
                    href={`/archives/consulter?annee=${annee}`}
                    className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-primary-700 transition-colors text-center"
                  >
                    👁️ Consulter
                  </Link>
                  <button
                    onClick={() => handleDeleteArchive(annee)}
                    className="bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal création archive */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Créer une nouvelle archive</h3>
            
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex gap-2">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="font-semibold text-yellow-900 mb-1">Attention</p>
                  <p className="text-sm text-yellow-800">
                    Cette opération va sauvegarder <strong>toutes les données actuelles</strong> (écoles, enseignants, évaluations, etc.) dans une archive.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Année scolaire
              </label>
              <input
                type="text"
                value={newAnneeScolaire}
                onChange={(e) => setNewAnneeScolaire(e.target.value)}
                placeholder="Ex: 2024-2025"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-600 mt-1">
                Format recommandé : YYYY-YYYY (ex: 2024-2025)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCreateArchive}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
              >
                ✅ Créer l'archive
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewAnneeScolaire('');
                }}
                className="px-4 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
