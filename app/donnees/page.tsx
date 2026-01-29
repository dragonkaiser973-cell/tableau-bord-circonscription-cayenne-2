'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Composant de réinitialisation
function ResetSection() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleReset = async () => {
    setResetting(true);
    setResetMessage(null);

    try {
      const response = await fetch('/api/reset', {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        setResetMessage({
          type: 'success',
          text: `${result.message} - ${result.details}`
        });
        setShowConfirm(false);
        
        // Recharger le statut d'import après 1 seconde
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setResetMessage({
          type: 'error',
          text: result.message || 'Erreur lors de la réinitialisation'
        });
      }
    } catch (error: any) {
      setResetMessage({
        type: 'error',
        text: 'Erreur lors de la réinitialisation : ' + error.message
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="card mt-6 border-2 border-red-200 bg-red-50">
      <h3 className="text-xl font-bold text-red-800 mb-4">⚠️ Zone Dangereuse - Réinitialisation</h3>
      
      {resetMessage && (
        <div className={`mb-4 p-4 rounded-lg ${
          resetMessage.type === 'success' 
            ? 'bg-green-100 border border-green-300 text-green-800' 
            : 'bg-red-100 border border-red-300 text-red-800'
        }`}>
          {resetMessage.text}
        </div>
      )}

      <p className="text-gray-700 mb-4">
        Cette action supprimera <strong>toutes les données</strong> importées dans l'application :
      </p>
      <ul className="text-sm text-gray-700 space-y-1 mb-4 ml-4">
        <li>• Toutes les écoles (data/ et public/)</li>
        <li>• Tous les enseignants</li>
        <li>• Toutes les évaluations (data/ et public/)</li>
        <li>• Tous les effectifs</li>
        <li>• Tous les stagiaires M2 SOPA</li>
        <li>• Toutes les identités et structures d'écoles</li>
        <li>• Toutes les statistiques ONDE</li>
        <li>• Tous les événements</li>
        <li>• Tous les logs de synchronisation</li>
      </ul>
      <p className="text-sm text-red-700 font-semibold mb-6">
        ⚠️ Cette action est <strong>irréversible</strong>. Les comptes utilisateurs et les archives seront conservés.
      </p>

      {!showConfirm ? (
        <button 
          onClick={() => setShowConfirm(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          🗑️ Réinitialiser toutes les données
        </button>
      ) : (
        <div className="bg-white p-4 rounded-lg border-2 border-red-300">
          <p className="font-bold text-red-800 mb-4">
            ⚠️ Êtes-vous absolument sûr ? Cette action est irréversible !
          </p>
          <div className="flex gap-4">
            <button
              onClick={handleReset}
              disabled={resetting}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {resetting ? '⏳ Réinitialisation...' : '✅ Oui, supprimer toutes les données'}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setResetMessage(null);
              }}
              disabled={resetting}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              ❌ Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant de nettoyage des doublons
function CleanDuplicatesSection() {
  const [cleaning, setCleaning] = useState(false);
  const [cleanMessage, setCleanMessage] = useState<{ type: 'success' | 'error', text: string, details?: any } | null>(null);

  const handleClean = async () => {
    setCleaning(true);
    setCleanMessage(null);

    try {
      const response = await fetch('/api/dedoublonner-enseignants', {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        setCleanMessage({
          type: 'success',
          text: result.message,
          details: result.details
        });
      } else {
        setCleanMessage({
          type: 'error',
          text: result.message || 'Erreur lors du nettoyage'
        });
      }
    } catch (error: any) {
      setCleanMessage({
        type: 'error',
        text: 'Erreur lors du nettoyage : ' + error.message
      });
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="card mt-6 border-2 border-yellow-200 bg-yellow-50">
      <h3 className="text-xl font-bold text-yellow-800 mb-4">🧹 Nettoyage des Doublons</h3>
      
      {cleanMessage && (
        <div className={`mb-4 p-4 rounded-lg ${
          cleanMessage.type === 'success' 
            ? 'bg-green-100 border border-green-300 text-green-800' 
            : 'bg-red-100 border border-red-300 text-red-800'
        }`}>
          <p className="font-semibold">{cleanMessage.text}</p>
          {cleanMessage.details && (
            <div className="mt-2 text-sm">
              <p>• Enseignants avant: {cleanMessage.details.avant}</p>
              <p>• Enseignants après: {cleanMessage.details.apres}</p>
              <p>• Doublons supprimés: {cleanMessage.details.supprimes}</p>
            </div>
          )}
        </div>
      )}

      <p className="text-gray-700 mb-4">
        Cette action supprimera les <strong>enseignants en doublon</strong> dans la base de données.
      </p>
      <p className="text-sm text-gray-600 mb-4">
        Un doublon est défini comme : même <strong>nom</strong>, même <strong>prénom</strong>, même <strong>année scolaire</strong>, et même <strong>école</strong>.
      </p>
      <p className="text-sm text-yellow-700 mb-6">
        💡 Cette action est recommandée si vous avez importé plusieurs fois le même fichier TRM.
      </p>

      <button
        onClick={handleClean}
        disabled={cleaning}
        className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
      >
        {cleaning ? '⏳ Nettoyage en cours...' : '🧹 Nettoyer les doublons'}
      </button>
    </div>
  );
}

export default function DonneesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const router = useRouter();
  
  // États pour suivre les imports effectués
  const [importStatus, setImportStatus] = useState({
    trm: false,
    evaluations: false,
    stagiaires: false,
    ecolesIdentite: false,
    ecolesStructure: false,
    statistiques: false
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
  
  // Vérifier quels fichiers ont déjà été importés
  const checkImportStatus = async () => {
    try {
      // Vérifier TRM (enseignants)
      const ensRes = await fetch('/api/enseignants');
      const ensData = await ensRes.json();
      
      // Vérifier évaluations
      const evalRes = await fetch('/api/evaluations');
      const evalData = await evalRes.json();
      
      // Vérifier écoles
      const ecolesRes = await fetch('/api/ecoles');
      const ecolesData = await ecolesRes.json();
      
      // Vérifier identité des écoles - vérifier le contenu via API
      let hasIdentite = false;
      try {
        const identiteRes = await fetch('/api/ecoles-identite');
        if (identiteRes.ok) {
          const identiteData = await identiteRes.json();
          hasIdentite = Array.isArray(identiteData) && identiteData.length > 0;
        }
      } catch (e) {
        hasIdentite = false;
      }
      
      // Vérifier structure des écoles - vérifier le contenu via API
      let hasStructure = false;
      try {
        const structureRes = await fetch('/api/ecoles-structure');
        if (structureRes.ok) {
          const structureData = await structureRes.json();
          hasStructure = Array.isArray(structureData) && structureData.length > 0;
        }
      } catch (e) {
        hasStructure = false;
      }
      
      // Vérifier statistiques ONDE - vérifier le contenu via API
      let hasStats = false;
      try {
        const statsRes = await fetch('/api/statistiques-ecoles');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          hasStats = Array.isArray(statsData) && statsData.length > 0;
        }
      } catch (e) {
        hasStats = false;
      }
      
      // Vérifier stagiaires SOPA via API
      let hasStagiaires = false;
      try {
        const stagiairesRes = await fetch('/api/import-stagiaires');
        if (stagiairesRes.ok) {
          const stagiairesData = await stagiairesRes.json();
          hasStagiaires = Array.isArray(stagiairesData) && stagiairesData.length > 0;
        }
      } catch (e) {
        hasStagiaires = false;
      }
      
      setImportStatus({
        trm: ensData.length > 0,
        evaluations: evalData.length > 0,
        stagiaires: hasStagiaires,
        ecolesIdentite: hasIdentite,
        ecolesStructure: hasStructure,
        statistiques: hasStats
      });
    } catch (error) {
      console.error('Erreur lors de la vérification des imports:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'trm' | 'evaluations' | 'stagiaires' | 'ecoles-identite' | 'ecoles-structure' | 'statistiques') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);
    setProgress(0);
    setProgressText('Lecture du fichier...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Pour les écoles et statistiques, on utilise des APIs spécifiques
      if (type === 'ecoles-identite' || type === 'ecoles-structure') {
        formData.append('type', type === 'ecoles-identite' ? 'identite' : 'structure');
        
        setProgressText('Extraction des données ZIP...');
        setProgress(30);

        const response = await fetch('/api/import-ecoles-pdf', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        setProgress(100);

        if (response.ok) {
          const msg = type === 'ecoles-identite' 
            ? `✅ ${result.count} écoles importées avec informations complètes`
            : `✅ ${result.count} écoles importées avec ${result.totalClasses} classes au total`;
          setMessage({
            type: 'success',
            text: msg
          });
          // Mettre à jour le statut d'import
          setImportStatus(prev => ({
            ...prev,
            [type === 'ecoles-identite' ? 'ecolesIdentite' : 'ecolesStructure']: true
          }));
        } else {
          setMessage({
            type: 'error',
            text: result.error || 'Erreur lors de l\'importation'
          });
        }
      } else if (type === 'stagiaires') {
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
          // Mettre à jour le statut d'import
          setImportStatus(prev => ({
            ...prev,
            stagiaires: true
          }));
        } else {
          setMessage({
            type: 'error',
            text: result.error || 'Erreur lors de l\'importation'
          });
        }
      } else if (type === 'statistiques') {
        setProgressText('Extraction des tableaux de bord...');
        setProgress(30);

        const response = await fetch('/api/import-statistiques', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        setProgress(100);

        if (response.ok) {
          setMessage({
            type: 'success',
            text: `✅ ${result.count} tableaux de bord importés`
          });
          // Mettre à jour le statut d'import
          setImportStatus(prev => ({
            ...prev,
            statistiques: true
          }));
        } else {
          setMessage({
            type: 'error',
            text: result.error || 'Erreur lors de l\'importation'
          });
        }
      } else {
        // Import TRM ou Évaluations (existant)
        formData.append('type', type);

        // Timeout de 15 minutes pour les gros fichiers
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 900000); // 15 min

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
          const statsText = data.ecoles_created 
            ? ` (${data.imported} entrées, ${data.ecoles_created} écoles, ${data.errors} erreurs)`
            : ` (${data.imported} entrées, ${data.errors} erreurs)`;
            
          setMessage({
            type: 'success',
            text: data.message + statsText
          });
          // Mettre à jour le statut d'import
          setImportStatus(prev => ({
            ...prev,
            [type]: true
          }));
        } else {
          setMessage({
            type: 'error',
            text: data.message || 'Erreur lors de l\'importation'
          });
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessage({
          type: 'error',
          text: 'Import timeout (plus de 15 minutes). Contactez le support.'
        });
      } else {
        setMessage({
          type: 'error',
          text: 'Erreur lors de l\'importation : ' + error.message
        });
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
          <p className="text-xl">Vérification de l'authentification...</p>
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
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
              💾
            </div>
            <div>
              <h1 className="text-5xl font-bold">Gestion des données</h1>
              <p className="text-xl opacity-90 mt-2">Importation et administration des fichiers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
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

        {/* Message de retour */}
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

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Import TRM */}
          <div className="card">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-2xl">
                👨‍🏫
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800">Fichier TRM</h2>
                <p className="text-sm text-gray-600">Tableau des ressources et moyens</p>
              </div>
              {importStatus.trm && (
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-semibold">
                  <span>✓</span>
                  <span>Importé</span>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-700 mb-2">Format attendu :</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Fichier Excel (.xlsx, .xls)</li>
                <li>• Structure : TRM Ecoles IEN CAYENNE 2</li>
                <li>• Colonnes : individu, nom, prénom, statut, etc.</li>
              </ul>
            </div>

            <label className={`btn-primary w-full cursor-pointer text-center ${uploading ? 'opacity-50' : ''}`}>
              {uploading ? '⏳ Import en cours...' : '📤 Importer un fichier TRM'}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileUpload(e, 'trm')}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {/* Import Évaluations */}
          <div className="card">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-2xl">
                📊
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800">Évaluations</h2>
                <p className="text-sm text-gray-600">Résultats des évaluations nationales</p>
              </div>
              {importStatus.evaluations && (
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-semibold">
                  <span>✓</span>
                  <span>Importé</span>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-700 mb-2">Format attendu :</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Fichier Excel (.xlsx, .xls)</li>
                <li>• Structure : données consolidées EVA1D</li>
                <li>• Colonnes : rentree, uai, classe, matiere, libelle, tx_groupe_*, etc.</li>
              </ul>
            </div>

            <label className={`btn-primary w-full cursor-pointer text-center ${uploading ? 'opacity-50' : ''}`}>
              {uploading ? '⏳ Import en cours...' : '📤 Importer un fichier d\'évaluations'}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileUpload(e, 'evaluations')}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Section Stagiaires SOPA */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">🎓 Stagiaires</h2>
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Import Stagiaires SOPA */}
          <div className="card">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
                🎓
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800">Stagiaires SOPA M2</h2>
                <p className="text-sm text-gray-600">Liste des stagiaires et leurs stages</p>
              </div>
              {importStatus.stagiaires && (
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-semibold">
                  <span>✓</span>
                  <span>Importé</span>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-700 mb-2">Format attendu :</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Fichier Excel (.xlsx, .xls)</li>
                <li>• Structure : LISTE_STAGE_M2_ETUDIANTS</li>
                <li>• Données : Nom, Prénom, Statut M2 SOPA</li>
                <li>• Périodes : 3 stages avec écoles, tuteurs et niveaux</li>
                <li>• Exemple : CAYENNE_2_LISTE_STAGE_M2_ETUDIANTS_2025-2026.xlsx</li>
              </ul>
            </div>

            <label className={`btn-primary w-full cursor-pointer text-center ${uploading ? 'opacity-50' : ''}`}>
              {uploading ? '⏳ Import en cours...' : '📤 Importer liste stagiaires SOPA'}
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileUpload(e, 'stagiaires')}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Section Écoles - 2 imports en grid */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">🏫 Données des Écoles</h2>
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Import Identité Écoles */}
          <div className="card">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                  🆔
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800">Identité des Écoles</h2>
                  <p className="text-sm text-gray-600">Informations administratives</p>
                </div>
              </div>
              {importStatus.ecolesIdentite && (
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-semibold w-fit">
                  <span>✓</span>
                  <span>Importé</span>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-700 mb-2">Format attendu :</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Fichier ZIP (.zip)</li>
                <li>• Contient : fichiers HTML d'identité depuis ONDE</li>
                <li>• Données : UAI, nom, directeur, adresse, téléphone, email, collège</li>
              </ul>
            </div>

            <label className={`btn-primary w-full cursor-pointer text-center ${uploading ? 'opacity-50' : ''}`}>
              {uploading ? '⏳ Import en cours...' : '📤 Importer identité_des_écoles.zip'}
              <input
                type="file"
                accept=".zip"
                onChange={(e) => handleFileUpload(e, 'ecoles-identite')}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {/* Import Structure Écoles */}
          <div className="card">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
                  📚
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800">Structure des Écoles</h2>
                  <p className="text-sm text-gray-600">Classes et dispositifs</p>
                </div>
              </div>
              {importStatus.ecolesStructure && (
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-semibold w-fit">
                  <span>✓</span>
                  <span>Importé</span>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-700 mb-2">Format attendu :</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Fichier ZIP (.zip)</li>
                <li>• Contient : fichiers HTML de structure depuis ONDE</li>
                <li>• Données : classes, enseignants, niveaux, effectifs, dispositifs (ULIS, UPE2A, RASED)</li>
              </ul>
            </div>

            <label className={`btn-primary w-full cursor-pointer text-center ${uploading ? 'opacity-50' : ''}`}>
              {uploading ? '⏳ Import en cours...' : '📤 Importer Structure_des_écoles.zip'}
              <input
                type="file"
                accept=".zip"
                onChange={(e) => handleFileUpload(e, 'ecoles-structure')}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Section Statistiques */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">📊 Statistiques</h2>
        <div className="grid md:grid-cols-1 gap-6 mb-8">
          {/* Import Statistiques */}
          <div className="card">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-2xl">
                📊
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800">Tableaux de Bord ONDE</h2>
                <p className="text-sm text-gray-600">Statistiques d'effectifs par école</p>
              </div>
              {importStatus.statistiques && (
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-semibold">
                  <span>✓</span>
                  <span>Importé</span>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-700 mb-2">Format attendu :</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Fichier ZIP (.zip)</li>
                <li>• Contient : fichiers HTML "Mon tableau de bord" depuis ONDE</li>
                <li>• Données : effectifs (admis, répartis, radiés), répartitions par niveau/cycle</li>
              </ul>
            </div>

            <label className={`btn-primary w-full cursor-pointer text-center ${uploading ? 'opacity-50' : ''}`}>
              {uploading ? '⏳ Import en cours...' : '📤 Importer Tableau_de_bord.zip'}
              <input
                type="file"
                accept=".zip"
                onChange={(e) => handleFileUpload(e, 'statistiques')}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Instructions supplémentaires */}
        <div className="card">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📋 Instructions</h3>
          <div className="space-y-3 text-gray-700">
            <p>
              <strong>1. Fichier TRM :</strong> Importez le tableau de ressources et moyens qui contient les informations sur les enseignants de la circonscription.
            </p>
            <p>
              <strong>2. Fichier Évaluations :</strong> Importez les données consolidées des évaluations nationales. Les écoles seront automatiquement créées si elles n'existent pas.
            </p>
            <p>
              <strong>3. Identité des Écoles :</strong> Importez le ZIP contenant les fichiers HTML d'identité exportés depuis ONDE (informations administratives : UAI, directeur, adresse, etc.).
            </p>
            <p>
              <strong>4. Structure des Écoles :</strong> Importez le ZIP contenant les fichiers HTML de structure exportés depuis ONDE (classes, enseignants, effectifs, dispositifs).
            </p>
            <p>
              <strong>5. Tableaux de Bord :</strong> Importez le ZIP contenant les tableaux de bord HTML exportés depuis ONDE pour afficher les statistiques d'effectifs de chaque école.
            </p>
            <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
              💡 <strong>Note :</strong> Les données importées sont conservées en cache. Vous n'avez pas besoin de réimporter à chaque lancement de l'application. Utilisez l'application normalement après le premier import.
            </p>
            <p>
              <strong>6. Synchronisation NAS :</strong> Les données sont stockées localement dans l'application. La synchronisation avec le NAS sera configurée ultérieurement avec l'adresse du serveur.
            </p>
            <p>
              <strong>7. Mise à jour annuelle :</strong> Pensez à mettre à jour les données au début de chaque année scolaire (1er septembre).
            </p>
          </div>
        </div>

        {/* Section Synchronisation NAS */}
        <div className="card mt-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🔄 Synchronisation NAS</h3>
          <p className="text-gray-600 mb-4">
            La synchronisation avec le NAS permettra de sauvegarder et restaurer automatiquement les données. 
            Cette fonctionnalité sera activée une fois l'adresse du NAS configurée.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <button className="btn-primary opacity-50 cursor-not-allowed" disabled>
              💾 Sauvegarder vers NAS
            </button>
            <button className="btn-primary opacity-50 cursor-not-allowed" disabled>
              📥 Restaurer depuis NAS
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            ⚠️ Configuration NAS en attente
          </p>
        </div>

        {/* Section Nettoyage Doublons */}
        <CleanDuplicatesSection />

        {/* Section Réinitialisation */}
        <ResetSection />
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-white/80">
        <p className="text-sm">
          Développé par <strong>LOUIS Olivier</strong> © 2026
        </p>
      </footer>
    </div>
  );
}
