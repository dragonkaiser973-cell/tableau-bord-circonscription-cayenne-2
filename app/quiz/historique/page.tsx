'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuroraHeader from '@/components/AuroraHeader';

interface SessionLite {
  id: string;
  pin: string;
  statut: string;
  rythme: 'manuel' | 'auto';
  current_question_index: number;
  created_at: string;
  ended_at: string | null;
  quiz_quizzes: { titre: string } | null;
}

interface ParticipantBilan {
  id: string;
  pseudo: string;
  score: number;
}
interface SessionDetail {
  id: string;
  participants: ParticipantBilan[];
  questions: { id: string }[];
}

export default function HistoriquePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [sessions, setSessions] = useState<SessionLite[]>([]);
  const [details, setDetails] = useState<Record<string, SessionDetail>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/');
      return;
    }
    setReady(true);
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/quiz/sessions', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const data: SessionLite[] = await res.json();
          // Garde uniquement les sessions terminées
          const terminees = data.filter(s => s.statut === 'terminee');
          setSessions(terminees);

          // Charge le détail (participants + nb questions) en parallèle
          const detailsObtenus: Record<string, SessionDetail> = {};
          await Promise.all(terminees.map(async (s) => {
            try {
              const r = await fetch(`/api/quiz/sessions/${s.id}`, {
                headers: { 'Authorization': `Bearer ${token}` },
              });
              if (r.ok) {
                const d = await r.json();
                detailsObtenus[s.id] = {
                  id: s.id,
                  participants: d.participants || [],
                  questions: d.questions || [],
                };
              }
            } catch { /* ignore */ }
          }));
          setDetails(detailsObtenus);
        } else if (res.status === 401) {
          router.push('/');
        }
      } catch {
        setError('Erreur de chargement');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const exporter = async (s: SessionLite) => {
    const token = localStorage.getItem('authToken');
    try {
      const res = await fetch(`/api/quiz/sessions/${s.id}/export`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        setError('Erreur export');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers.get('Content-Disposition') || '';
      const m = cd.match(/filename="([^"]+)"/);
      a.download = m?.[1] || `quiz_${s.pin}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Erreur export');
    }
  };

  const supprimer = async (s: SessionLite) => {
    if (!confirm(`Supprimer cette session terminée du ${new Date(s.created_at).toLocaleDateString('fr-FR')} ? Les résultats seront perdus.`)) return;
    try {
      const res = await fetch(`/api/quiz/sessions/${s.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
      });
      if (res.ok) {
        setSessions(prev => prev.filter(x => x.id !== s.id));
      } else {
        setError('Erreur suppression');
      }
    } catch {
      setError('Erreur de connexion');
    }
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <AuroraHeader
        kicker="Quiz live — sessions passées"
        title="Historique"
        titleAccent=""
        subtitle="Retrouvez toutes vos sessions de quiz terminées, avec leurs résultats et l'export CSV."
        backHref="/quiz"
        backLabel="Retour à la liste"
      />

      <div className="container mx-auto max-w-7xl px-6 py-8 -mt-20 relative z-10">
        {loading ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-500">Chargement…</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-6xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Aucune session terminée</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Vos sessions apparaîtront ici une fois clôturées depuis l&apos;écran salle.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => {
              const d = details[s.id];
              const top3 = d?.participants.slice(0, 3) || [];
              const totalParticipants = d?.participants.length || 0;
              const totalQuestions = d?.questions.length || 0;
              return (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-wrap items-start gap-4 justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-slate-800 truncate">
                          {s.quiz_quizzes?.titre || '(quiz supprimé)'}
                        </h3>
                        <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          PIN {s.pin}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {new Date(s.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {' · '}
                        {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
                        {' · '}
                        {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}
                        {' · '}
                        <span className={s.rythme === 'auto' ? 'text-cyan-600' : 'text-slate-600'}>
                          {s.rythme === 'auto' ? '⏱ Auto' : '✋ Manuel'}
                        </span>
                      </p>
                      {top3.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                          {top3.map((p, i) => (
                            <span key={p.id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${
                              i === 0 ? 'bg-amber-100 text-amber-800' :
                              i === 1 ? 'bg-slate-200 text-slate-700' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              <span>{['🥇','🥈','🥉'][i]}</span>
                              <span>{p.pseudo}</span>
                              <span className="font-mono opacity-70">{p.score}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => exporter(s)}
                        className="px-3 py-2 rounded-lg text-sm font-semibold border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-all"
                        title="Télécharger les résultats Excel"
                      >
                        📥 Excel
                      </button>
                      <button
                        onClick={() => supprimer(s)}
                        className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Supprimer définitivement"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
