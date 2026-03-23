'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Questionnaire {
  id: string;
  titre: string;
  description: string;
  date_fin: string;
  nb_reponses: number;
}

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
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      {/* Header */}
      <div className="text-white py-16 px-6">
        <div className="container mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors">
            ← Retour à l&apos;accueil
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">📋</div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold">Questionnaires</h1>
              <p className="text-xl opacity-90 mt-2">Circonscription Cayenne 2 Roura</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {loading ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-500">Chargement...</p>
          </div>
        ) : questionnaires.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Aucun questionnaire disponible</h2>
            <p className="text-gray-500">Revenez plus tard, aucun questionnaire n&apos;est ouvert pour le moment.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {questionnaires.map(q => (
              <Link key={q.id} href={`/questionnaires/${q.id}`}>
                <div className="card hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-primary-200">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                      📋
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-800 mb-1">{q.titre}</h2>
                      {q.description && <p className="text-gray-500 text-sm">{q.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>👥 {q.nb_reponses} réponse{q.nb_reponses !== 1 ? 's' : ''}</span>
                    {q.date_fin && (
                      <span>⏰ Jusqu&apos;au {new Date(q.date_fin).toLocaleDateString('fr-FR')}</span>
                    )}
                  </div>
                  <div className="mt-4">
                    <span className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold inline-block">
                      Répondre →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <footer className="text-center py-8 text-white/80">
        <p className="text-sm">Développé par <strong>LOUIS Olivier</strong> © 2026</p>
      </footer>
    </div>
  );
}
