'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { detecterAnneeScolaire, anneeScolaireSuivante } from '@/lib/annee-scolaire';
import AuroraHeader from '@/components/AuroraHeader';
import PageLoader from '@/components/PageLoader';

export default function ChangerAnneeScolairePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [effectifActuel, setEffectifActuel] = useState(0);
  const [anneeDetectee, setAnneeDetectee] = useState('');
  const [processing, setProcessing] = useState(false);
  const [verifications, setVerifications] = useState({
    donneesCompletes: false,
    archiveExiste: false
  });
  const [creerArchive, setCreerArchive] = useState(true);
  const [confirme, setConfirme] = useState(false);
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
      setLoading(true);
      
      // Charger la config
      const configRes = await fetch('/api/config');
      const configData = await configRes.json();
      setConfig(configData);
      
      // Détecter la nouvelle année
      const detected = detecterAnneeScolaire();
      setAnneeDetectee(detected);
      
      // Charger les structures pour calculer l'effectif actuel
      const structuresRes = await fetch('/api/ecoles-structure');
      const structures = await structuresRes.json();
      
      let total = 0;
      structures.forEach((ecole: any) => {
        if (ecole.classes && Array.isArray(ecole.classes)) {
          ecole.classes.forEach((classe: any) => {
            total += classe.effectif || 0;
          });
        }
      });
      setEffectifActuel(total);
      
      // Vérifier si une archive existe déjà
      const archivesRes = await fetch('/api/archives');
      const archives = await archivesRes.json();
      const archiveExiste = archives.some((a: any) => a.annee_scolaire === configData.annee_scolaire_actuelle);
      
      // Vérifier que les données sont complètes
      const enseignantsRes = await fetch('/api/enseignants');
      const enseignants = await enseignantsRes.json();
      
      const evaluationsRes = await fetch('/api/evaluations');
      const evaluations = await evaluationsRes.json();
      
      setVerifications({
        donneesCompletes: enseignants.length > 0 && evaluations.length > 0 && structures.length > 0,
        archiveExiste
      });
      
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangerAnnee = async () => {
    if (!confirme) {
      alert('Veuillez confirmer le changement d\'année en cochant la case');
      return;
    }

    try {
      setProcessing(true);
      
      const res = await fetch('/api/changer-annee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nouvelleAnnee: anneeDetectee,
          effectifActuel,
          creerArchive: creerArchive && !verifications.archiveExiste
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert(`✅ Année scolaire changée avec succès !\n\nAncienne année : ${config.annee_scolaire_actuelle}\nNouvelle année : ${anneeDetectee}\n\n${data.archive_creee ? 'Archive créée automatiquement.' : ''}`);
        router.push('/pilotage');
      } else {
        alert(`❌ Erreur : ${data.message}`);
      }
      
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(`❌ Erreur : ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  if (!isAuthenticated || loading) {
    return <PageLoader />;
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
        <div className="text-center text-white">
          <p className="text-xl mb-4">Erreur de chargement</p>
          <Link href="/pilotage" className="btn-primary inline-block">
            Retour
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AuroraHeader
        kicker="Administration"
        title="Changement"
        titleAccent="d'année scolaire."
        subtitle="Gestion du passage à la nouvelle année scolaire."
        backHref="/pilotage"
        backLabel="Retour au pilotage"
      />

      {/* Contenu */}
      <div className="container mx-auto max-w-7xl px-6 py-8 -mt-20 relative z-10">
        
        {/* Alerte */}
        <div className="bg-red-100 border-2 border-red-500 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <span className="text-5xl">⚠️</span>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-red-800 mb-2">Changement d'année détecté</h2>
              <p className="text-red-700 text-lg">
                Nous sommes actuellement en <strong>{anneeDetectee}</strong>, mais l'application est configurée pour <strong>{config.annee_scolaire_actuelle}</strong>.
              </p>
              <p className="text-red-600 mt-2">
                Il est recommandé de procéder au changement d'année scolaire pour assurer le bon fonctionnement de l'application.
              </p>
            </div>
          </div>
        </div>

        {/* État actuel */}
        <div className="card mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📊 État actuel</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200">
              <div className="text-sm text-blue-600 font-semibold mb-1">Année scolaire actuelle</div>
              <div className="text-3xl font-bold text-blue-800">{config.annee_scolaire_actuelle}</div>
              <div className="text-sm text-blue-600 mt-2">Effectif total : {effectifActuel} élèves</div>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
              <div className="text-sm text-green-600 font-semibold mb-1">Année scolaire détectée</div>
              <div className="text-3xl font-bold text-green-800">{anneeDetectee}</div>
              <div className="text-sm text-green-600 mt-2">Basée sur la date système</div>
            </div>
          </div>
        </div>

        {/* Vérifications */}
        <div className="card mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">✅ Vérifications pré-changement</h2>
          <div className="space-y-3">
            <div className={`flex items-center gap-3 p-4 rounded-lg border-2 ${verifications.donneesCompletes ? 'bg-green-50 border-green-300' : 'bg-orange-50 border-orange-300'}`}>
              <span className="text-3xl">{verifications.donneesCompletes ? '✅' : '⚠️'}</span>
              <div className="flex-1">
                <div className="font-semibold">{verifications.donneesCompletes ? 'Données complètes' : 'Données incomplètes'}</div>
                <div className="text-sm opacity-80">
                  {verifications.donneesCompletes 
                    ? 'Écoles, enseignants et évaluations présents' 
                    : 'Certaines données sont manquantes'}
                </div>
              </div>
            </div>
            
            <div className={`flex items-center gap-3 p-4 rounded-lg border-2 ${verifications.archiveExiste ? 'bg-green-50 border-green-300' : 'bg-blue-50 border-blue-300'}`}>
              <span className="text-3xl">{verifications.archiveExiste ? '✅' : 'ℹ️'}</span>
              <div className="flex-1">
                <div className="font-semibold">
                  {verifications.archiveExiste ? 'Archive existante' : 'Aucune archive'}
                </div>
                <div className="text-sm opacity-80">
                  {verifications.archiveExiste 
                    ? `Archive de ${config.annee_scolaire_actuelle} déjà créée`
                    : `Aucune archive pour ${config.annee_scolaire_actuelle}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="card mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">🎯 Actions à effectuer</h2>
          
          <div className="space-y-4">
            {!verifications.archiveExiste && (
              <label className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border-2 border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors">
                <input
                  type="checkbox"
                  checked={creerArchive}
                  onChange={(e) => setCreerArchive(e.target.checked)}
                  className="mt-1 w-5 h-5"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">Créer une archive de l'année {config.annee_scolaire_actuelle}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Recommandé : Sauvegarde toutes les données de l'année actuelle avant le changement
                  </div>
                </div>
              </label>
            )}
            
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📝</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">Ajouter {config.annee_scolaire_actuelle} à l'historique</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Effectif : {effectifActuel} élèves • Automatique
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔄</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">Passer à l'année {anneeDetectee}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Mise à jour de la configuration système
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation */}
        <div className="card mb-6 bg-yellow-50 border-2 border-yellow-300">
          <div className="flex items-start gap-4">
            <span className="text-4xl">⚠️</span>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-800 mb-3">Confirmation requise</h3>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirme}
                  onChange={(e) => setConfirme(e.target.checked)}
                  className="mt-1 w-5 h-5"
                />
                <div className="text-gray-700">
                  Je confirme vouloir changer l'année scolaire de <strong>{config.annee_scolaire_actuelle}</strong> à <strong>{anneeDetectee}</strong>. 
                  Je comprends que cette action va mettre à jour la configuration de l'application.
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Bouton de validation */}
        <div className="flex justify-end gap-4">
          <Link
            href="/pilotage"
            className="px-8 py-4 bg-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-400 transition-colors"
          >
            Annuler
          </Link>
          <button
            onClick={handleChangerAnnee}
            disabled={!confirme || processing}
            className={`px-8 py-4 rounded-lg font-bold transition-colors ${
              confirme && !processing
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {processing ? '⏳ Changement en cours...' : `✅ Valider le changement d'année`}
          </button>
        </div>
      </div>
    </div>
  );
}
