'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { detecterAnneeScolaire, verifierChangementAnnee } from '@/lib/annee-scolaire';

export default function AlerteAnneeScolaire() {
  const [showAlert, setShowAlert] = useState(false);
  const [anneeActuelle, setAnneeActuelle] = useState('');
  const [anneeDetectee, setAnneeDetectee] = useState('');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkAnneeScolaire();
  }, []);

  const checkAnneeScolaire = async () => {
    try {
      // Vérifier si l'alerte a été ignorée pour cette session
      const dismissedKey = `alerte-annee-dismissed-${new Date().toISOString().split('T')[0]}`;
      if (sessionStorage.getItem(dismissedKey)) {
        return;
      }

      const res = await fetch('/api/config');
      const config = await res.json();
      
      const detected = detecterAnneeScolaire();
      const needsChange = verifierChangementAnnee(config.annee_scolaire_actuelle);
      
      if (needsChange) {
        setAnneeActuelle(config.annee_scolaire_actuelle);
        setAnneeDetectee(detected);
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Erreur vérification année:', error);
    }
  };

  const handleDismiss = () => {
    const dismissedKey = `alerte-annee-dismissed-${new Date().toISOString().split('T')[0]}`;
    sessionStorage.setItem(dismissedKey, 'true');
    setDismissed(true);
    setShowAlert(false);
  };

  if (!showAlert || dismissed) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-4 z-[9999] shadow-2xl">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-4xl">⚠️</span>
          <div>
            <h3 className="font-bold text-lg">Changement d'année scolaire détecté !</h3>
            <p className="text-sm opacity-90">
              Nous sommes en <strong>{anneeDetectee}</strong>, mais l'application est configurée pour <strong>{anneeActuelle}</strong>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDismiss}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors"
          >
            Ignorer
          </button>
          <Link 
            href="/admin/annee-scolaire" 
            className="px-6 py-3 bg-white text-red-600 rounded-lg font-bold hover:bg-gray-100 transition-colors shadow-lg"
          >
            Changer d'année →
          </Link>
        </div>
      </div>
    </div>
  );
}
