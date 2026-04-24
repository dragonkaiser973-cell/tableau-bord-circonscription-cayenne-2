'use client';

import Link from 'next/link';

export default function AnalyseClassePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Barre de navigation signature */}
      <div className="relative overflow-hidden">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]" />

        {/* Aurora blob */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div
            className="aurora-blob"
            style={{
              top: '-60%',
              right: '-10%',
              width: '60vw',
              height: '60vw',
              background: 'radial-gradient(circle, #45b8a0 0%, transparent 60%)',
            }}
          />
        </div>

        {/* Content row */}
        <div className="relative px-6 py-3 flex items-center gap-4 text-white">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white text-sm font-medium transition-colors group"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:-translate-x-0.5"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Retour à l&apos;accueil
          </Link>
          <span className="text-white/30">|</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1 text-[11px] font-semibold tracking-[0.15em] uppercase text-white/90">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-[#45b8a0] animate-ping opacity-75" />
              <span className="relative rounded-full h-1.5 w-1.5 bg-[#45b8a0]" />
            </span>
            Analyse des évaluations nationales · Classe
          </span>
        </div>
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
