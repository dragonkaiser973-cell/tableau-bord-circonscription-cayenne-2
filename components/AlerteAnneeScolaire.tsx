'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { detecterAnneeScolaire, verifierChangementAnnee } from '@/lib/annee-scolaire';

export default function AlerteAnneeScolaire() {
  const [showAlert, setShowAlert] = useState(false);
  const [anneeActuelle, setAnneeActuelle] = useState('');
  const [anneeDetectee, setAnneeDetectee] = useState('');

  useEffect(() => {
    checkAnneeScolaire();
  }, []);

  const dismissKey = () => `alerte-annee-dismissed-${new Date().toISOString().split('T')[0]}`;

  const checkAnneeScolaire = async () => {
    try {
      // Ne rien afficher pour un visiteur non connecté (écran de connexion, etc.)
      if (!localStorage.getItem('authToken')) {
        return;
      }

      // L'alerte a-t-elle déjà été mise de côté aujourd'hui ?
      if (sessionStorage.getItem(dismissKey())) {
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
    sessionStorage.setItem(dismissKey(), 'true');
    setShowAlert(false);
  };

  if (!showAlert) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] animate-fadein">
      <div className="rounded-2xl border border-amber-200 bg-white shadow-xl shadow-amber-500/10 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-amber-300 to-orange-400" />
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-lg">
              📅
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-800 text-sm">Nouvelle année scolaire</h3>
              <p className="text-sm text-slate-600 mt-0.5">
                Nous sommes en <strong className="text-slate-800">{anneeDetectee}</strong>, mais
                l'application est encore configurée pour <strong className="text-slate-800">{anneeActuelle}</strong>.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              aria-label="Fermer"
              className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors -mt-1 -mr-1 p-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              Plus tard
            </button>
            <Link
              href="/admin/annee-scolaire"
              onClick={handleDismiss}
              className="px-4 py-1.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-sm font-semibold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              Changer d'année →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
