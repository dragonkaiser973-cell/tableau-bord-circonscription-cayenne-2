'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface ChoixPublic {
  id: string;
  ordre: number;
  libelle: string;
}
interface QuestionPublic {
  id: string;
  enonce: string;
  duree_secondes: number;
  points_base: number;
  choix: ChoixPublic[];
}
interface ParticipantPublic {
  id: string;
  pseudo: string;
  score: number;
}
interface StatePayload {
  session: {
    id: string;
    statut: 'lobby' | 'question_active' | 'resultats_question' | 'podium' | 'terminee';
    current_question_index: number;
    question_started_at: string | null;
    rythme: 'manuel' | 'auto';
  };
  participant: ParticipantPublic | null;
  a_deja_repondu: boolean;
  bonne_reponse_id: string | null;
  question: QuestionPublic | null;
  total_questions: number;
}

const COULEURS_CHOIX = [
  { bg: 'from-rose-500 to-red-600', forme: '▲' },
  { bg: 'from-sky-500 to-blue-600', forme: '◆' },
  { bg: 'from-amber-400 to-orange-500', forme: '●' },
  { bg: 'from-emerald-500 to-green-600', forme: '■' },
];

export default function QuizJoueurPage() {
  const router = useRouter();
  const params = useParams();
  const pin = params?.pin as string;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [state, setState] = useState<StatePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; points: number } | null>(null);
  const [tickMs, setTickMs] = useState(0);

  // Récupération de session_id et participant_id depuis localStorage
  useEffect(() => {
    if (!pin) return;
    (async () => {
      try {
        const res = await fetch(`/api/quiz/public/sessions/by-pin/${pin}`);
        if (!res.ok) {
          router.push(`/jouer/${pin}`);
          return;
        }
        const data = await res.json();
        const pid = localStorage.getItem(`quiz_pid_${data.session_id}`);
        if (!pid) {
          router.push(`/jouer/${pin}`);
          return;
        }
        setSessionId(data.session_id);
        setParticipantId(pid);
      } catch {
        router.push(`/jouer/${pin}`);
      }
    })();
  }, [pin, router]);

  const loadState = useCallback(async () => {
    if (!sessionId || !participantId) return;
    try {
      const res = await fetch(`/api/quiz/public/sessions/${sessionId}/state?participant_id=${participantId}`);
      if (res.ok) {
        const data: StatePayload = await res.json();
        setState(data);
        // Réinitialiser le feedback à chaque changement de question
        setFeedback(prevFb => {
          if (!prevFb) return prevFb;
          // On efface si on n'est plus sur résultats/podium
          if (data.session.statut === 'question_active' && !data.a_deja_repondu) return null;
          return prevFb;
        });
      }
    } catch {
      setError('Erreur de chargement');
    }
  }, [sessionId, participantId]);

  // Realtime — uniquement les changements de session
  useEffect(() => {
    if (!sessionId) return;
    loadState();
    const channel = supabase
      .channel(`quiz-joueur-${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quiz_sessions', filter: `id=eq.${sessionId}` }, () => {
        loadState();
        setFeedback(null); // nouvelle phase → nouveau feedback
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quiz_participants', filter: `id=eq.${participantId}` }, () => loadState())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, participantId, loadState]);

  // Timer côté client
  useEffect(() => {
    if (!state || state.session.statut !== 'question_active' || !state.session.question_started_at) {
      setTickMs(0);
      return;
    }
    const start = new Date(state.session.question_started_at).getTime();
    const update = () => setTickMs(Math.max(0, Date.now() - start));
    update();
    const it = setInterval(update, 200);
    return () => clearInterval(it);
  }, [state]);

  const repondre = async (choixId: string) => {
    if (!state?.question || !sessionId || !participantId || submitting || state.a_deja_repondu) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quiz/public/sessions/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participantId,
          question_id: state.question.id,
          choix_id: choixId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFeedback({ ok: data.est_correct, points: data.points_gagnes });
        loadState();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Erreur');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSubmitting(false);
    }
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white flex items-center justify-center">
        <p className="text-slate-400">Chargement…</p>
      </div>
    );
  }

  const { session, participant, question, a_deja_repondu, bonne_reponse_id, total_questions } = state;
  const dureeMs = question ? question.duree_secondes * 1000 : 0;
  const tempsRestantMs = Math.max(0, dureeMs - tickMs);
  const tempsRestantS = Math.ceil(tempsRestantMs / 1000);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white flex flex-col">
      {/* Bandeau supérieur */}
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between text-sm">
        <span className="font-semibold truncate max-w-[50%]">{participant?.pseudo || '—'}</span>
        <span className="font-mono text-emerald-300 font-bold text-lg">{participant?.score ?? 0}</span>
      </div>

      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {/* LOBBY */}
          {session.statut === 'lobby' && (
            <motion.div
              key="wait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center px-6"
            >
              <div className="text-5xl mb-4 animate-pulse">⏳</div>
              <h2 className="text-2xl font-bold mb-2">En attente du démarrage…</h2>
              <p className="text-slate-400">L&apos;animateur va lancer le quiz d&apos;un moment à l&apos;autre.</p>
            </motion.div>
          )}

          {/* QUESTION ACTIVE */}
          {session.statut === 'question_active' && question && (
            <motion.div
              key={`q-${question.id}`}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col p-5"
            >
              <div className="text-center mb-3">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
                  Question {session.current_question_index + 1} / {total_questions}
                </p>
              </div>

              {/* Timer barre */}
              <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-[width] duration-200 linear"
                  style={{ width: `${(tempsRestantMs / dureeMs) * 100}%` }}
                />
              </div>

              <p className="text-lg font-bold text-white text-center mb-1">{question.enonce}</p>
              <p className="text-center text-slate-400 text-sm mb-6">{tempsRestantS}s</p>

              {/* Feedback après réponse */}
              {a_deja_repondu && feedback && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-center py-6 rounded-2xl mb-4 ${feedback.ok ? 'bg-emerald-500/20 border border-emerald-400/40' : 'bg-rose-500/20 border border-rose-400/40'}`}
                >
                  <p className="text-3xl mb-1">{feedback.ok ? '✅' : '❌'}</p>
                  <p className="font-bold text-xl">{feedback.ok ? `+${feedback.points} points` : 'Pas cette fois'}</p>
                  <p className="text-sm text-slate-300 mt-1">En attente des autres participants…</p>
                </motion.div>
              )}

              {a_deja_repondu && !feedback && (
                <div className="text-center py-6 text-slate-400">Réponse envoyée. En attente…</div>
              )}

              {/* Boutons des choix */}
              {!a_deja_repondu && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
                  {question.choix.map((c, idx) => {
                    const couleur = COULEURS_CHOIX[idx % 4];
                    return (
                      <button
                        key={c.id}
                        onClick={() => repondre(c.id)}
                        disabled={submitting || tempsRestantMs <= 0}
                        className={`bg-gradient-to-br ${couleur.bg} text-white rounded-2xl px-5 py-7 font-bold text-lg text-left shadow-xl active:scale-95 transition-all disabled:opacity-40 flex items-center gap-4`}
                      >
                        <span className="text-3xl text-white/90 flex-shrink-0">{couleur.forme}</span>
                        <span className="flex-1">{c.libelle}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* RÉSULTATS QUESTION */}
          {session.statut === 'resultats_question' && question && (
            <motion.div
              key={`r-${question.id}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center"
            >
              {feedback ? (
                <>
                  <div className={`text-6xl mb-4 ${feedback.ok ? 'animate-bounce' : ''}`}>
                    {feedback.ok ? '🎉' : '😅'}
                  </div>
                  <h2 className={`text-3xl font-black mb-2 ${feedback.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {feedback.ok ? 'Bonne réponse !' : 'Raté'}
                  </h2>
                  {feedback.ok && <p className="text-2xl font-bold mb-2">+{feedback.points} points</p>}
                </>
              ) : (
                <>
                  <div className="text-5xl mb-4">⏱</div>
                  <h2 className="text-2xl font-bold mb-2">Vous n&apos;avez pas répondu</h2>
                </>
              )}
              <div className="bg-white/5 rounded-2xl border border-white/10 px-6 py-4 mt-4">
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">Score total</p>
                <p className="font-mono text-emerald-300 font-black text-3xl">{participant?.score ?? 0}</p>
              </div>
              {bonne_reponse_id && (
                <p className="mt-6 text-sm text-slate-400">
                  Bonne réponse : <span className="text-white font-semibold">
                    {question.choix.find(c => c.id === bonne_reponse_id)?.libelle}
                  </span>
                </p>
              )}
            </motion.div>
          )}

          {/* PODIUM */}
          {session.statut === 'podium' && (
            <motion.div
              key="podium" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center"
            >
              <div className="text-7xl mb-4">🏆</div>
              <h2 className="text-3xl font-black mb-2">Quiz terminé !</h2>
              <p className="text-slate-400 mb-6">Voici votre score final</p>
              <div className="bg-gradient-to-br from-emerald-400/20 to-cyan-500/20 border border-emerald-400/40 rounded-3xl px-10 py-6">
                <p className="text-sm uppercase tracking-widest text-emerald-300 mb-1">{participant?.pseudo}</p>
                <p className="font-mono text-white font-black text-5xl">{participant?.score ?? 0}</p>
              </div>
              <p className="mt-8 text-xs text-slate-500">Le classement est affiché à l&apos;écran principal</p>
            </motion.div>
          )}

          {/* TERMINÉE */}
          {session.statut === 'terminee' && (
            <motion.div
              key="end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center"
            >
              <div className="text-6xl mb-4">👋</div>
              <h2 className="text-2xl font-bold mb-2">Session clôturée</h2>
              <p className="text-slate-400 mb-6">Merci d&apos;avoir participé !</p>
              <button
                onClick={() => router.push('/jouer')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold"
              >
                Rejoindre une autre partie
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm shadow-2xl">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
