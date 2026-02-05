'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MultiFileUploader from '@/components/MultiFileUploader';

// Composant pour un bouton de reset individuel
function ResetButton({ 
  label, 
  endpoint, 
  confirmText,
  onSuccess 
}: { 
  label: string; 
  endpoint: string; 
  confirmText: string;
  onSuccess?: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      const response = await fetch(endpoint, { method: 'POST' });
      const result = await response.json();

      if (response.ok) {
        alert(`✅ ${result.message}`);
        setShowConfirm(false);
        if (onSuccess) onSuccess();
      } else {
        alert(`❌ Erreur: ${result.error || 'Échec de la réinitialisation'}`);
      }
    } catch (error: any) {
      alert(`❌ Erreur: ${error.message}`);
    } finally {
      setResetting(false);
    }
  };

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="text-sm px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
      >
        🗑️ Reset
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-red-700 font-semibold">{confirmText}</span>
      <button
        onClick={handleReset}
        disabled={resetting}
        className="text-sm px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50"
      >
        {resetting ? '⏳' : '✅ Oui'}
      </button>
      <button
        onClick={() => setShowConfirm(false)}
        disabled={resetting}
        className="text-sm px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded disabled:opacity-50"
      >
        ❌ Non
      </button>
    </div>
  );
}

// Zone Dangereuse avec reset global et par catégorie
function DangerZone({ onReset }: { onReset: () => void }) {
  const [showGlobalConfirm, setShowGlobalConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleGlobalReset = async () => {
    setResetting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/reset', { method: 'POST' });
      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: result.message });
        setShowGlobalConfirm(false);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage({ type: 'error', text: result.message || 'Erreur' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setResetting(false);
    }
  };

  const handleCategoryReset = async (endpoint: string, name: string) => {
    if (!confirm(`Voulez-vous vraiment réinitialiser ${name} ?`)) return;

    try {
      const response = await fetch(endpoint, { method: 'POST' });
      const result = await response.json();

      if (response.ok) {
        alert(`✅ ${result.message}`);
        onReset();
      } else {
        alert(`❌ ${result.error || 'Erreur'}`);
      }
    } catch (error: any) {
      alert(`❌ ${error.message}`);
    }
  };

  return (
    <div className="card mt-8 border-2 border-red-200 bg-red-50">
      <h3 className="text-2xl font-bold text-red-800 mb-4">⚠️ Zone Dangereuse</h3>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 border border-green-300 text-green-800' 
            : 'bg-red-100 border border-red-300 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Reset global */}
      <div className="bg-white rounded-lg p-6 mb-4 border-2 border-red-300">
        <h4 className="font-bold text-red-800 mb-2">🗑️ Réinitialisation Globale</h4>
        <p className="text-sm text-gray-700 mb-4">
          Supprime <strong>toutes les données</strong> : enseignants, évaluations, écoles, stagiaires, etc.
        </p>

        {!showGlobalConfirm ? (
          <button
            onClick={() => setShowGlobalConfirm(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg"
          >
            🗑️ Réinitialiser TOUT
          </button>
        ) : (
          <div className="bg-red-50 p-4 rounded-lg border-2 border-red-400">
            <p className="font-bold text-red-800 mb-4">
              ⚠️ Êtes-vous sûr ? Cette action est irréversible !
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleGlobalReset}
                disabled={resetting}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50"
              >
                {resetting ? '⏳ Suppression...' : '✅ Oui, tout supprimer'}
              </button>
              <button
                onClick={() => setShowGlobalConfirm(false)}
                disabled={resetting}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded disabled:opacity-50"
              >
                ❌ Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reset par catégorie */}
      <div className="bg-white rounded-lg p-6 border-2 border-red-300">
        <h4 className="font-bold text-red-800 mb-4">📂 Réinitialisation Sélective</h4>
        <div className="space-y-2">
          <button
            onClick={() => handleCategoryReset('/api/reset-enseignants', 'les Enseignants (TRM)')}
            className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
          >
            <span className="font-semibold">👨‍🏫 Enseignants uniquement</span>
          </button>
          <button
            onClick={() => handleCategoryReset('/api/reset-evaluations', 'les Évaluations')}
            className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
          >
            <span className="font-semibold">📊 Évaluations uniquement</span>
          </button>
          <button
            onClick={() => handleCategoryReset('/api/reset-ecoles-all', 'toutes les données Écoles')}
            className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
          >
            <span className="font-semibold">🏫 Toutes données Écoles (identité + structure + stats)</span>
          </button>
          <button
            onClick={() => handleCategoryReset('/api/reset-stagiaires', 'les Stagiaires M2')}
            className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
          >
            <span className="font-semibold">🎓 Stagiaires M2 uniquement</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DonneesPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [importStatus, setImportStatus] = useState({
    trm: false,
    evaluations: false,
    ecolesIdentite: false,
    ecolesStructure: false,
    statistiques: false,
    stagiaires: false
  });

  const [importCounts, setImportCounts] = useState({
    enseignants: 0,
    evaluations: 0,
    ecolesIdentite: 0,
    ecolesStructure: 0,
    statistiques: 0,
    stagiaires: 0
  });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/');
    } else {
      setIsAuthenticated(true);
      checkImportStatus();
    }
  }, [router]);

  const checkImportStatus = async () => {
    try {
      const [ensRes, evalRes, identiteRes, structureRes, statsRes, stagRes] = await Promise.all([
        fetch('/api/enseignants'),
        fetch('/api/evaluations'),
        fetch('/api/ecoles-identite'),
        fetch('/api/ecoles-structure'),
        fetch('/api/statistiques-ecoles'),
        fetch('/api/stagiaires-m2')
      ]);

      const [enseignants, evaluations, identite, structure, stats, stagiaires] = await Promise.all([
        ensRes.json(),
        evalRes.json(),
        identiteRes.json(),
        structureRes.json(),
        statsRes.json(),
        stagRes.json()
      ]);

      setImportCounts({
        enseignants: enseignants.length || 0,
        evaluations: evaluations.length || 0,
        ecolesIdentite: identite.length || 0,
        ecolesStructure: structure.length || 0,
        statistiques: stats.length || 0,
        stagiaires: stagiaires.length || 0
      });

      setImportStatus({
        trm: enseignants.length > 0,
        evaluations: evaluations.length > 0,
        ecolesIdentite: identite.length > 0,
        ecolesStructure: structure.length > 0,
        statistiques: stats.length > 0,
        stagiaires: stagiaires.length > 0
      });
    } catch (error) {
      console.error('Erreur vérification imports:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'trm' | 'evaluations' | 'stagiaires') => {
  const file = e.target.files?.[0];
  if (!file) return;

  setUploading(true);
  setMessage(null);
  setProgress(0);
  setProgressText('Lecture du fichier...');

  try {
    const formData = new FormData();
    formData.append('file', file);

    // Import Stagiaires (API séparée)
    if (type === 'stagiaires') {
      setProgressText('Extraction des stagiaires SOPA...');
      setProgress(30);

      const response = await fetch('/api/import-stagiaires', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      setProgress(100);

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `✅ ${result.count} stagiaires SOPA importés`
        });
        setImportStatus(prev => ({ ...prev, stagiaires: true }));
        checkImportStatus();
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Erreur lors de l\'importation'
        });
      }
    } 
    // Import TRM ou Évaluations
    else {
      formData.append('type', type);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 900000);

      setProgressText('Envoi du fichier...');
      setProgress(10);

      const startTime = Date.now();

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      setProgressText(`Traitement terminé en ${elapsed}s`);
      setProgress(100);

      const data = await response.json();

      if (response.ok) {
        const statsText = ` (${data.imported} entrées, ${data.errors} erreurs)`;
        setMessage({ type: 'success', text: data.message + statsText });
        setImportStatus(prev => ({ ...prev, [type]: true }));
        checkImportStatus();
      } else {
        setMessage({ type: 'error', text: data.message || 'Erreur' });
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      setMessage({ type: 'error', text: 'Timeout (plus de 15 min)' });
    } else {
      setMessage({ type: 'error', text: error.message });
    }
  } finally {
    setUploading(false);
    setProgress(0);
    setProgressText('');
    if (e.target) e.target.value = '';
  }
};

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-xl">Vérification...</p>
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
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">💾</div>
            <div>
              <h1 className="text-5xl font-bold">Gestion des données</h1>
              <p className="text-xl opacity-90 mt-2">Importation et administration</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="container mx-auto px-6 py-8">
        {/* Barre de progression */}
        {uploading && (
          <div className="card mb-6 bg-blue-50 border-2 border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="animate-spin text-2xl">⏳</div>
              <div className="flex-1">
                <p className="font-semibold text-blue-800">{progressText}</p>
                <div className="mt-2 bg-white rounded-full h-4 overflow-hidden border border-blue-200">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-blue-600 mt-1">{progress}%</p>
              </div>
            </div>
          </div>
        )}

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

        {/* SECTION 1 : Imports Simples */}
        <h2 className="text-3xl font-bold text-white mb-6">📁 Imports Simples (Fichier unique)</h2>
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* TRM */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-2xl">👨‍🏫</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Fichier TRM</h2>
                  <p className="text-sm text-gray-600">Tableau ressources et moyens</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {importStatus.trm && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                    ✓ {importCounts.enseignants} importés
                  </span>
                )}
                {importCounts.enseignants > 0 && (
                  <ResetButton 
                    label="Reset"
                    endpoint="/api/reset-enseignants"
                    confirmText="Supprimer TRM ?"
                    onSuccess={checkImportStatus}
                  />
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm text-gray-600">
              <p>• Format: Excel (.xlsx, .xls)</p>
              <p>• Structure: TRM Ecoles IEN</p>
            </div>

            <label className={`btn-primary w-full cursor-pointer text-center ${uploading ? 'opacity-50' : ''}`}>
              {uploading ? '⏳ Import...' : '📤 Importer TRM'}
              <input type="file" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, 'trm')} disabled={uploading} className="hidden" />
            </label>
          </div>

          {/* Évaluations */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-2xl">📊</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Évaluations</h2>
                  <p className="text-sm text-gray-600">Résultats évaluations nationales</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {importStatus.evaluations && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                    ✓ {importCounts.evaluations} importées
                  </span>
                )}
                {importCounts.evaluations > 0 && (
                  <ResetButton 
                    label="Reset"
                    endpoint="/api/reset-evaluations"
                    confirmText="Supprimer évaluations ?"
                    onSuccess={checkImportStatus}
                  />
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm text-gray-600">
              <p>• Format: Excel (.xlsx, .xls)</p>
              <p>• Structure: EVA1D données consolidées</p>
            </div>

            <label className={`btn-primary w-full cursor-pointer text-center ${uploading ? 'opacity-50' : ''}`}>
              {uploading ? '⏳ Import...' : '📤 Importer Évaluations'}
              <input type="file" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, 'evaluations')} disabled={uploading} className="hidden" />
            </label>
          </div>
        </div>

        {/* SECTION 2 : Imports Écoles (Multi-fichiers) */}
        <h2 className="text-3xl font-bold text-white mb-6">🏫 Données des Écoles (Multi-fichiers HTML)</h2>
        <div className="grid md:grid-cols-1 gap-6 mb-12">
          {/* Identité */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">🆔</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Identité des Écoles</h2>
                  <p className="text-sm text-gray-600">UAI, nom, directeur, adresse, contact</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {importCounts.ecolesIdentite > 0 && (
                  <>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                      ✓ {importCounts.ecolesIdentite} écoles
                    </span>
                    <ResetButton 
                      label="Reset"
                      endpoint="/api/reset-ecoles-identite"
                      confirmText="Supprimer identités ?"
                      onSuccess={checkImportStatus}
                    />
                  </>
                )}
              </div>
            </div>

            <MultiFileUploader
              apiEndpoint="/api/import-ecole-identite-single"
              acceptedTypes=".htm,.html"
              title="Glissez-déposez les fichiers HTML ici"
              description="Exportez depuis ONDE : Identité de l'école (un fichier par école)"
              onComplete={(results) => {
                alert(`✅ Import terminé: ${results.success} réussis, ${results.errors} erreurs`);
                checkImportStatus();
              }}
            />
          </div>

          {/* Structure */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">📚</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Structure des Écoles</h2>
                  <p className="text-sm text-gray-600">Classes, enseignants, effectifs, dispositifs</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {importCounts.ecolesStructure > 0 && (
                  <>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                      ✓ {importCounts.ecolesStructure} structures
                    </span>
                    <ResetButton 
                      label="Reset"
                      endpoint="/api/reset-ecoles-structure"
                      confirmText="Supprimer structures ?"
                      onSuccess={checkImportStatus}
                    />
                  </>
                )}
              </div>
            </div>

            <MultiFileUploader
              apiEndpoint="/api/import-ecole-structure-single"
              acceptedTypes=".htm,.html"
              title="Glissez-déposez les fichiers HTML ici"
              description="Exportez depuis ONDE : Structure de l'école (un fichier par école)"
              onComplete={(results) => {
                alert(`✅ Import terminé: ${results.success} réussis, ${results.errors} erreurs`);
                checkImportStatus();
              }}
            />
          </div>

          {/* Statistiques */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">📈</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Statistiques ONDE</h2>
                  <p className="text-sm text-gray-600">Effectifs, répartitions, totaux par cycle</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {importCounts.statistiques > 0 && (
                  <>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                      ✓ {importCounts.statistiques} stats
                    </span>
                    <ResetButton 
                      label="Reset"
                      endpoint="/api/reset-statistiques"
                      confirmText="Supprimer statistiques ?"
                      onSuccess={checkImportStatus}
                    />
                  </>
                )}
              </div>
            </div>

            <MultiFileUploader
              apiEndpoint="/api/import-statistique-single"
              acceptedTypes=".htm,.html"
              title="Glissez-déposez les fichiers HTML ici"
              description="Exportez depuis ONDE : Tableau de bord (un fichier par école)"
              onComplete={(results) => {
                alert(`✅ Import terminé: ${results.success} réussis, ${results.errors} erreurs`);
                checkImportStatus();
              }}
            />
          </div>
        </div>

        {/* SECTION 3 : Autres imports */}
        <h2 className="text-3xl font-bold text-white mb-6">🎓 Autres Imports</h2>
        <div className="grid md:grid-cols-1 gap-6 mb-12">
          {/* Stagiaires */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">🎓</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Stagiaires SOPA M2</h2>
                  <p className="text-sm text-gray-600">Liste des stagiaires et stages</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {importStatus.stagiaires && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                    ✓ {importCounts.stagiaires} stagiaires
                  </span>
                )}
                {importCounts.stagiaires > 0 && (
                  <ResetButton 
                    label="Reset"
                    endpoint="/api/reset-stagiaires"
                    confirmText="Supprimer stagiaires ?"
                    onSuccess={checkImportStatus}
                  />
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm text-gray-600">
              <p>• Format: Excel (.xlsx, .xls)</p>
              <p>• Structure: LISTE_STAGE_M2_ETUDIANTS</p>
            </div>

            <label className={`btn-primary w-full cursor-pointer text-center ${uploading ? 'opacity-50' : ''}`}>
              {uploading ? '⏳ Import...' : '📤 Importer Stagiaires'}
              <input type="file" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, 'stagiaires')} disabled={uploading} className="hidden" />
            </label>
          </div>
        </div>

        {/* Zone Dangereuse */}
        <DangerZone onReset={checkImportStatus} />
      </div>
    </div>
  );
}
