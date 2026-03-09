'use client';

import Link from 'next/link';

export default function AnalyseClassePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #2c5f75 0%, #4a9b9b 100%)' }}>
      {/* Barre de navigation minimale */}
      <div className="px-6 py-3 flex items-center gap-4" style={{ background: 'rgba(0,0,0,0.15)' }}>
        <Link
          href="/"
          className="text-white/90 hover:text-white text-sm flex items-center gap-2 transition-colors"
        >
          ← Retour à l&apos;accueil
        </Link>
        <span className="text-white/40">|</span>
        <span className="text-white font-semibold text-sm">
          🔬 Outil d&apos;analyse des évaluations nationales — Classe
        </span>
      </div>

      {/* Iframe plein écran */}
      <iframe
        src="/outils/analyse-classe.html"
        className="flex-1 w-full border-0"
        style={{ minHeight: 'calc(100vh - 44px)' }}
        title="Outil d'analyse des évaluations nationales"
        allow="print"
      />
    </div>
  );
}
