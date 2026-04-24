'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AuroraHeader from '@/components/AuroraHeader';
import SpotlightCard from '@/components/SpotlightCard';

interface Questionnaire {
  id: string;
  titre: string;
  description: string;
  date_fin: string;
  nb_reponses: number;
}

const ACCENTS = [
  'from-sky-400 via-cyan-400 to-teal-400',
  'from-violet-400 via-fuchsia-400 to-pink-400',
  'from-emerald-400 via-teal-400 to-cyan-400',
  'from-amber-400 via-orange-400 to-rose-500',
  'from-indigo-400 via-blue-500 to-cyan-400',
];

export default function QuestionnairesPage() {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/questionnaires')
      .then(r => r.json())
      .then(data => { setQuestionnaires(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <AuroraHeader
        kicker="Participation"
        title="Questionnaires"
        titleAccent="ouverts."
        subtitle="Questionnaires publiés par la circonscription. Vos réponses alimentent nos analyses."
        backLabel="Retour à l'accueil"
      />

      <div className="container mx-auto max-w-6xl px-6 py-8 -mt-20 relative z-10">
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_1px_0_rgba(15,23,42,0.02),0_16px_36px_-20px_rgba(15,23,42,0.1)] text-center py-16">
            <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-[#45b8a0] animate-spin mx-auto mb-4" />
            <p className="text-slate-500 text-sm">Chargement…</p>
          </div>
        ) : questionnaires.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_1px_0_rgba(15,23,42,0.02),0_16px_36px_-20px_rgba(15,23,42,0.1)] text-center py-16 px-6">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="15" y2="17" />
              </svg>
            </div>
            <h2 className="font-[Outfit,sans-serif] text-xl font-bold text-slate-900 tracking-tight mb-2">Aucun questionnaire disponible</h2>
            <p className="text-slate-500">Revenez plus tard — aucun questionnaire n&apos;est ouvert pour le moment.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5 mb-8">
            {questionnaires.map((q, i) => {
              const accent = ACCENTS[i % ACCENTS.length];
              return (
                <Link key={q.id} href={`/questionnaires/${q.id}`} className="block">
                  <SpotlightCard accent={accent} onClick={() => {}}>
                    <div className="flex items-start gap-4 mb-5">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.3)]`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="9" y1="13" x2="15" y2="13" />
                          <line x1="9" y1="17" x2="15" y2="17" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-[Outfit,sans-serif] text-lg font-semibold text-slate-950 tracking-tight leading-tight mb-1">{q.titre}</h2>
                        {q.description && <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">{q.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-4 text-[11px] uppercase tracking-[0.15em] font-semibold text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <span className="font-[Outfit,sans-serif] text-base font-bold text-slate-950 tabular-nums normal-case tracking-tight">{q.nb_reponses}</span>
                          réponse{q.nb_reponses !== 1 ? 's' : ''}
                        </span>
                        {q.date_fin && (
                          <span className="normal-case tracking-normal text-slate-400 font-medium">
                            Jusqu&apos;au {new Date(q.date_fin).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1e5a78] group-hover:text-[#45b8a0] group-hover:translate-x-0.5 transition-all">
                        Répondre
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14" />
                          <path d="M12 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </SpotlightCard>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <footer className="text-center py-8 text-slate-500">
        <p className="text-sm">Développé par <strong>LOUIS Olivier</strong> © 2026</p>
      </footer>
    </div>
  );
}
