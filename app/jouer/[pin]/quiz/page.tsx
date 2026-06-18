'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/lib/supabase';
import EcranVictoire from '@/components/quiz/EcranVictoire';

interface ChoixPublic {
  id: string;
  ordre: number;
  libelle: string;
}
interface QuestionPublic {
  id: string;
  type: 'qcm' | 'vrai_faux' | 'classement';
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
  ma_reponse: { est_correct: boolean; points_gagnes: number; choix_id: string | null } | null;
  mon_rang: number | null;
  nb_participants: number;
  bonne_reponse_id: string | null;
  ordre_correct: string[] | null;
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
  // Pour le mode classement : ordre courant (initialisé sur les choix de la question)
  const [ordreCourant, setOrdreCourant] = useState<string[]>([]);
  // État de la connexion temps réel — sert à afficher un indicateur et à
  // déclencher un polling plus agressif si Realtime est tombé.
  const [rtStatus, setRtStatus] = useState<'connecting' | 'live' | 'fallback'>('connecting');

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
        setError(null); // une synchro réussie efface un éventuel message d'erreur transitoire
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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRtStatus('live');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setRtStatus('fallback');
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, participantId, loadState]);

  // Polling de secours — indispensable car Realtime peut dropper silencieusement
  // un UPDATE (rate-limit, reconnexion WebSocket, mise en veille mobile…).
  // Sans ce filet, un participant peut rester figé sur la question précédente
  // et voir ses boutons disabled (tempsRestantMs <= 0).
  // Cadence : 3 s en live (Realtime fiable), 1.5 s en fallback (Realtime KO).
  useEffect(() => {
    if (!sessionId || !participantId) return;
    if (state?.session.statut === 'terminee') return;
    const intervalMs = rtStatus === 'fallback' ? 1500 : 3000;
    const it = setInterval(loadState, intervalMs);
    return () => clearInterval(it);
  }, [sessionId, participantId, loadState, rtStatus, state?.session.statut]);

  // Quand l'onglet redevient visible (mobile qui sort de veille), on resync
  // immédiatement : Realtime a très souvent perdu l'événement pendant la veille.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadState();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadState]);

  // Auto-disparition du toast d'erreur : sans ça, un raté réseau transitoire
  // (ex. « Erreur de chargement » pendant le polling) reste affiché en rouge
  // indéfiniment. On l'efface après 4 s.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

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

  // Initialise l'ordre courant à chaque nouvelle question de classement.
  // ATTENTION : le polling de secours recrée un nouveau tableau `choix` à chaque
  // rechargement (toutes les 3 s). On ne doit donc PAS réinitialiser bêtement à
  // chaque re-render, sinon l'ordre que le participant vient de glisser-déposer
  // est écrasé et la proposition « retourne à sa place ». On ne réinitialise que
  // si l'ensemble des items a réellement changé (= nouvelle question).
  useEffect(() => {
    if (state?.question?.type === 'classement' && !state.a_deja_repondu) {
      const ids = state.question.choix.map(c => c.id);
      setOrdreCourant(prev => {
        const memesItems =
          prev.length === ids.length && prev.every(id => ids.includes(id));
        return memesItems ? prev : ids;
      });
    }
  }, [state?.question?.id, state?.question?.type, state?.a_deja_repondu, state?.question?.choix]);


  const repondre = async (payload: { choix_id?: string; ordre_choisi?: string[] }) => {
    if (!state?.question || !sessionId || !participantId || submitting || state.a_deja_repondu) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quiz/public/sessions/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participantId,
          question_id: state.question.id,
          ...payload,
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

  const { session, participant, question, a_deja_repondu, ma_reponse, mon_rang, nb_participants, bonne_reponse_id, total_questions } = state;
  // Feedback effectif : prend en priorité l'état local (vient de répondre), sinon
  // reconstruit depuis ma_reponse (si on rafraîchit ou si on arrive après le statut).
  const feedbackEffectif = feedback ?? (ma_reponse ? { ok: ma_reponse.est_correct, points: ma_reponse.points_gagnes } : null);
  const dureeMs = question ? question.duree_secondes * 1000 : 0;
  const tempsRestantMs = Math.max(0, dureeMs - tickMs);
  const tempsRestantS = Math.ceil(tempsRestantMs / 1000);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white flex flex-col">
      {/* Bandeau supérieur */}
      <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between text-sm gap-3">
        <span className="font-semibold truncate flex-1 min-w-0">{participant?.pseudo || '—'}</span>
        <span
          className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wider flex-shrink-0 ${
            rtStatus === 'live' ? 'text-emerald-400'
              : rtStatus === 'fallback' ? 'text-amber-400'
              : 'text-slate-500'
          }`}
          title={
            rtStatus === 'live' ? 'Temps réel actif'
              : rtStatus === 'fallback' ? 'Connexion temps réel dégradée — synchro automatique toutes les 1,5 s'
              : 'Connexion en cours…'
          }
        >
          <span className={`w-2 h-2 rounded-full ${
            rtStatus === 'live' ? 'bg-emerald-400 animate-pulse'
              : rtStatus === 'fallback' ? 'bg-amber-400 animate-pulse'
              : 'bg-slate-500'
          }`} />
          {rtStatus === 'live' ? 'Live' : rtStatus === 'fallback' ? 'Synchro' : '…'}
        </span>
        <span className="font-mono text-emerald-300 font-bold text-lg flex-shrink-0">{participant?.score ?? 0}</span>
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
              {a_deja_repondu && feedbackEffectif && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-center py-6 rounded-2xl mb-4 ${feedbackEffectif.ok ? 'bg-emerald-500/20 border border-emerald-400/40' : 'bg-rose-500/20 border border-rose-400/40'}`}
                >
                  <p className="text-3xl mb-1">{feedbackEffectif.ok ? '✅' : '❌'}</p>
                  <p className="font-bold text-xl">{feedbackEffectif.ok ? `+${feedbackEffectif.points} points` : 'Pas cette fois'}</p>
                  <p className="text-sm text-slate-300 mt-1">En attente des autres participants…</p>
                </motion.div>
              )}

              {a_deja_repondu && !feedbackEffectif && (
                <div className="text-center py-6 text-slate-400">Réponse envoyée. En attente…</div>
              )}

              {/* Boutons des choix — QCM / vrai_faux */}
              {!a_deja_repondu && question.type !== 'classement' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
                  {question.choix.map((c, idx) => {
                    const couleur = COULEURS_CHOIX[idx % 4];
                    return (
                      <button
                        key={c.id}
                        onClick={() => repondre({ choix_id: c.id })}
                        disabled={submitting}
                        className={`bg-gradient-to-br ${couleur.bg} text-white rounded-2xl px-5 py-7 font-bold text-lg text-left shadow-xl active:scale-95 transition-all disabled:opacity-40 flex items-center gap-4`}
                      >
                        <span className="text-3xl text-white/90 flex-shrink-0">{couleur.forme}</span>
                        <span className="flex-1">{c.libelle}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* UI spécifique au classement (drag & drop) */}
              {!a_deja_repondu && question.type === 'classement' && (
                <>
                  {/* Items réordonnables — padding-bottom pour ne pas être masqués par le bouton fixé */}
                  <div className="space-y-3 pb-32">
                    <p className="text-center text-sm text-slate-400 mb-2">
                      Glissez-déposez pour réordonner
                    </p>
                    <ClassementDnd
                      ordre={ordreCourant}
                      items={question.choix}
                      onReorder={setOrdreCourant}
                    />
                  </div>
                  {/* Bouton « Valider » toujours visible en bas du viewport */}
                  <div className="fixed bottom-0 left-0 right-0 px-5 pt-8 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent z-20">
                    <button
                      onClick={() => repondre({ ordre_choisi: ordreCourant })}
                      disabled={submitting}
                      className="w-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-white py-4 rounded-2xl text-lg font-bold shadow-2xl active:scale-95 disabled:opacity-40 transition-all"
                    >
                      {submitting ? 'Envoi…' : '✓ Valider mon ordre'}
                    </button>
                  </div>
                </>
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
              {feedbackEffectif ? (
                <>
                  <div className={`text-6xl mb-4 ${feedbackEffectif.ok ? 'animate-bounce' : ''}`}>
                    {feedbackEffectif.ok ? '🎉' : '😅'}
                  </div>
                  <h2 className={`text-3xl font-black mb-2 ${feedbackEffectif.ok ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {feedbackEffectif.ok ? 'Bonne réponse !' : 'Raté'}
                  </h2>
                  {feedbackEffectif.ok && <p className="text-2xl font-bold mb-2">+{feedbackEffectif.points} points</p>}
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
              {state.ordre_correct && question.type === 'classement' && (
                <div className="mt-6 w-full max-w-sm mx-auto">
                  <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Ordre correct</p>
                  <ol className="space-y-1">
                    {state.ordre_correct.map((cid, idx) => {
                      const c = question.choix.find(x => x.id === cid);
                      return (
                        <li key={cid} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex items-center gap-3">
                          <span className="font-mono text-emerald-300 font-bold w-5">{idx + 1}</span>
                          <span className="text-white text-sm">{c?.libelle}</span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </motion.div>
          )}

          {/* PODIUM — écran victoire spécial pour le top 3, classement standard pour les autres */}
          {session.statut === 'podium' && mon_rang && mon_rang <= 3 && participant && (
            <motion.div
              key="podium-vic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <EcranVictoire
                rang={mon_rang as 1 | 2 | 3}
                pseudo={participant.pseudo}
                score={participant.score}
              />
            </motion.div>
          )}

          {session.statut === 'podium' && (!mon_rang || mon_rang > 3) && (
            <motion.div
              key="podium"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center"
            >
              <div className="text-7xl mb-4">🎯</div>
              <h2 className="text-3xl font-black mb-2">Quiz terminé !</h2>
              <p className="text-slate-400 mb-6">Voici votre score final</p>
              <div className="bg-gradient-to-br from-emerald-400/20 to-cyan-500/20 border border-emerald-400/40 rounded-3xl px-10 py-6">
                <p className="text-sm uppercase tracking-widest text-emerald-300 mb-1">{participant?.pseudo}</p>
                <p className="font-mono text-white font-black text-5xl">{participant?.score ?? 0}</p>
                {mon_rang && (
                  <p className="text-slate-400 text-sm mt-3">
                    {mon_rang}ᵉ sur {nb_participants}
                  </p>
                )}
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

// ─────────── Composants drag & drop pour le mode CLASSEMENT ───────────

function ClassementDnd({
  ordre, items, onReorder,
}: {
  ordre: string[];
  items: ChoixPublic[];
  onReorder: (next: string[]) => void;
}) {
  const sensors = useSensors(
    // PointerSensor : 1 px de mouvement avant de démarrer le drag (ne bloque pas le scroll)
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    // TouchSensor : démarre après 200 ms d'appui pour ne pas confondre avec un scroll
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ordre.indexOf(String(active.id));
    const newIndex = ordre.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(ordre, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ordre} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {ordre.map((cid, idx) => {
            const c = items.find(x => x.id === cid);
            if (!c) return null;
            return (
              <SortableItem key={cid} id={cid} index={idx} libelle={c.libelle} />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({
  id, index, libelle,
}: {
  id: string; index: number; libelle: string;
}) {
  const couleur = COULEURS_CHOIX[index % 4];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : 'auto',
    touchAction: 'none', // évite que le navigateur intercepte le drag tactile
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-gradient-to-br ${couleur.bg} text-white rounded-2xl px-4 py-4 font-bold text-base shadow-xl flex items-center gap-3 cursor-grab active:cursor-grabbing select-none ${
        isDragging ? 'ring-4 ring-white/40 scale-[1.02]' : ''
      }`}
    >
      <span className="font-mono text-2xl text-white/80 w-8 text-center">{index + 1}</span>
      <span className="flex-1">{libelle}</span>
      <span className="text-white/70 text-2xl leading-none" aria-hidden>⋮⋮</span>
    </div>
  );
}
