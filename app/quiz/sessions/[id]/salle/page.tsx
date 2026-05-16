'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface Choix {
  id: string;
  ordre: number;
  libelle: string;
  est_correct: boolean;
}
type TypeQuestion = 'qcm' | 'vrai_faux' | 'classement';
interface Question {
  id: string;
  ordre: number;
  type: TypeQuestion;
  enonce: string;
  duree_secondes: number;
  points_base: number;
  choix: Choix[];
}
interface Participant {
  id: string;
  pseudo: string;
  score: number;
}
interface SessionDetail {
  id: string;
  pin: string;
  statut: 'lobby' | 'question_active' | 'resultats_question' | 'podium' | 'terminee';
  current_question_id: string | null;
  current_question_index: number;
  question_started_at: string | null;
  rythme: 'manuel' | 'auto';
  quiz: { titre: string; description: string | null };
  questions: Question[];
  participants: Participant[];
  counts_by_choix: Record<string, number>;
  nb_reponses_question_courante: number;
}

const COULEURS_CHOIX = [
  { bg: 'from-rose-500 to-red-600', border: 'border-rose-300', forme: '▲' },
  { bg: 'from-sky-500 to-blue-600', border: 'border-sky-300', forme: '◆' },
  { bg: 'from-amber-400 to-orange-500', border: 'border-amber-300', forme: '●' },
  { bg: 'from-emerald-500 to-green-600', border: 'border-emerald-300', forme: '■' },
];

export default function SalleQuizPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [tickMs, setTickMs] = useState(0);

  const loadSession = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      const res = await fetch(`/api/quiz/sessions/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) setSession(await res.json());
      else if (res.status === 401) router.push('/');
      else if (res.status === 404) setError('Session introuvable');
    } catch {
      setError('Erreur de chargement');
    }
  }, [id, router]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/');
      return;
    }
    setReady(true);
    loadSession();
  }, [id, router, loadSession]);

  // Realtime — 3 canaux
  useEffect(() => {
    if (!ready || !id) return;
    const channel = supabase
      .channel(`quiz-salle-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quiz_sessions', filter: `id=eq.${id}` }, () => loadSession())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_participants', filter: `session_id=eq.${id}` }, () => loadSession())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quiz_reponses', filter: `session_id=eq.${id}` }, () => loadSession())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [ready, id, loadSession]);

  // Timer côté animateur (basé sur question_started_at serveur)
  useEffect(() => {
    if (!session || session.statut !== 'question_active' || !session.question_started_at) {
      setTickMs(0);
      return;
    }
    const start = new Date(session.question_started_at).getTime();
    const update = () => setTickMs(Math.max(0, Date.now() - start));
    update();
    const it = setInterval(update, 200);
    return () => clearInterval(it);
  }, [session]);

  const transition = async (action: 'start' | 'stop' | 'next' | 'close') => {
    if (transitioning) return;
    setTransitioning(true);
    const token = localStorage.getItem('authToken');
    try {
      const res = await fetch(`/api/quiz/sessions/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Erreur de transition');
      } else {
        setError(null);
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setTransitioning(false);
    }
  };

  if (!ready || !session) return null;

  const questionCourante = session.questions.find(q => q.id === session.current_question_id) || null;
  const dureeMs = questionCourante ? questionCourante.duree_secondes * 1000 : 0;
  const tempsRestantMs = Math.max(0, dureeMs - tickMs);
  const tempsRestantS = Math.ceil(tempsRestantMs / 1000);
  const ratio = dureeMs > 0 ? Math.min(1, tickMs / dureeMs) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-slate-100 flex flex-col overflow-hidden">
      {/* Barre supérieure */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10 flex-shrink-0">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">
            Quiz live <span className="text-emerald-400">· salle</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {session.quiz.titre} · {session.participants.length} participant{session.participants.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-slate-400 px-3 py-1.5 rounded-lg bg-white/5">
            Mode {session.rythme === 'auto' ? '⏱ auto' : '✋ manuel'}
          </span>
          <Link
            href="/quiz"
            className="px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all"
            title="Quitter la salle"
          >
            ✕ Quitter
          </Link>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <AnimatePresence mode="wait">
          {/* ─── LOBBY ─── */}
          {session.statut === 'lobby' && (
            <Lobby
              key="lobby"
              pin={session.pin}
              participants={session.participants}
              onStart={() => transition('start')}
              transitioning={transitioning}
            />
          )}

          {/* ─── QUESTION ACTIVE ─── */}
          {session.statut === 'question_active' && questionCourante && (
            <QuestionVue
              key={`q-${questionCourante.id}`}
              question={questionCourante}
              index={session.current_question_index}
              total={session.questions.length}
              tempsRestantS={tempsRestantS}
              ratio={ratio}
              counts={session.counts_by_choix}
              nbReponses={session.nb_reponses_question_courante}
              nbParticipants={session.participants.length}
              onStop={() => transition('stop')}
              transitioning={transitioning}
            />
          )}

          {/* ─── RÉSULTATS QUESTION ─── */}
          {session.statut === 'resultats_question' && questionCourante && (
            <ResultatsQuestion
              key={`r-${questionCourante.id}`}
              question={questionCourante}
              counts={session.counts_by_choix}
              participants={session.participants}
              estDerniere={session.current_question_index >= session.questions.length - 1}
              onNext={() => transition('next')}
              transitioning={transitioning}
            />
          )}

          {/* ─── PODIUM ─── */}
          {session.statut === 'podium' && (
            <Podium
              key="podium"
              participants={session.participants}
              onClose={() => transition('close')}
              transitioning={transitioning}
            />
          )}

          {/* ─── TERMINÉE ─── */}
          {session.statut === 'terminee' && (
            <div key="end" className="h-full flex items-center justify-center text-center px-8 py-16">
              <div>
                <div className="text-6xl mb-4">🏁</div>
                <h2 className="text-3xl font-bold mb-2">Session terminée</h2>
                <p className="text-slate-400 mb-6">Merci à tous les participants !</p>
                <Link href="/quiz" className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-all">
                  Retour à la liste
                </Link>
              </div>
            </div>
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

// ─────────── LOBBY ───────────

function Lobby({
  pin, participants, onStart, transitioning,
}: { pin: string; participants: Participant[]; onStart: () => void; transitioning: boolean }) {
  const urlJouer = typeof window !== 'undefined' ? `${window.location.origin}/jouer` : '/jouer';
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="h-full grid lg:grid-cols-[1fr,1.2fr] gap-6 px-8 py-8"
    >
      {/* Bloc PIN */}
      <div className="flex flex-col items-center justify-center">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-400 mb-3">Rejoignez la partie</p>
        <p className="text-slate-300 text-lg mb-2">Rendez-vous sur</p>
        <p className="font-mono text-2xl text-white mb-6 bg-white/5 px-4 py-2 rounded-lg">{urlJouer}</p>
        <p className="text-slate-300 text-lg mb-2">avec le code</p>
        <div className="bg-gradient-to-br from-emerald-400 via-cyan-400 to-sky-400 p-1 rounded-3xl shadow-2xl">
          <div className="bg-slate-900 rounded-3xl px-12 py-8">
            <p className="font-mono font-black text-[clamp(4rem,12vw,9rem)] tracking-[0.2em] text-white leading-none">
              {pin}
            </p>
          </div>
        </div>
        <button
          onClick={onStart}
          disabled={transitioning || participants.length === 0}
          className="mt-10 inline-flex items-center gap-3 bg-gradient-to-br from-emerald-400 to-cyan-500 text-white px-10 py-5 rounded-2xl text-xl font-bold shadow-2xl hover:-translate-y-0.5 hover:shadow-[0_25px_60px_-15px_rgba(16,185,129,0.6)] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          ▶ Démarrer le quiz
        </button>
        {participants.length === 0 && (
          <p className="mt-3 text-xs text-slate-500">En attente d&apos;au moins un participant</p>
        )}
      </div>

      {/* Liste participants */}
      <div className="bg-white/5 rounded-3xl border border-white/10 p-6 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Participants</h3>
          <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-sm font-semibold">
            {participants.length}
          </span>
        </div>
        <div className="flex-1 overflow-auto">
          {participants.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-slate-500 italic px-6">
              Personne n&apos;a encore rejoint…<br/>
              <span className="text-xs">Les nouveaux participants apparaîtront ici en temps réel.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              <AnimatePresence>
                {participants.map(p => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.7, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.7 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                    className="bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-center"
                  >
                    <div className="text-2xl mb-1">{['🦊','🐼','🦁','🐧','🦄','🐢','🐝','🐙','🐯','🦉'][p.pseudo.charCodeAt(0) % 10]}</div>
                    <p className="text-sm font-medium text-slate-100 truncate">{p.pseudo}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────── QUESTION ACTIVE ───────────

function QuestionVue({
  question, index, total, tempsRestantS, ratio, counts, nbReponses, nbParticipants, onStop, transitioning,
}: {
  question: Question; index: number; total: number;
  tempsRestantS: number; ratio: number;
  counts: Record<string, number>; nbReponses: number; nbParticipants: number;
  onStop: () => void; transitioning: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="px-8 py-6 max-w-7xl mx-auto"
    >
      {/* Bandeau supérieur */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm uppercase tracking-[0.2em] text-emerald-400">
          Question {index + 1} / {total}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">{nbReponses} / {nbParticipants} réponse{nbReponses !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Énoncé */}
      <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/15 px-8 py-8 mb-6 text-center">
        <p className="text-3xl md:text-4xl font-bold text-white leading-tight">
          {question.enonce}
        </p>
      </div>

      {/* Timer circulaire */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="44" fill="none"
              stroke="url(#timerGrad)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * ratio}`}
              style={{ transition: 'stroke-dashoffset 0.2s linear' }}
            />
            <defs>
              <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-4xl font-black text-white">
            {tempsRestantS}
          </div>
        </div>
        <p className="text-slate-400 text-sm mt-2">seconde{tempsRestantS > 1 ? 's' : ''} restantes</p>
      </div>

      {/* Choix avec barres de réponses live (qcm/vrai_faux) */}
      {question.type !== 'classement' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {question.choix.map((c, idx) => {
            const couleur = COULEURS_CHOIX[idx % 4];
            const nb = counts[c.id] || 0;
            const pct = nbParticipants > 0 ? Math.round((nb / nbParticipants) * 100) : 0;
            return (
              <div
                key={c.id}
                className={`relative bg-gradient-to-br ${couleur.bg} rounded-2xl px-6 py-5 shadow-xl overflow-hidden`}
              >
                <div
                  className="absolute inset-y-0 left-0 bg-black/20 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center gap-4">
                  <span className="text-3xl text-white/90 flex-shrink-0">{couleur.forme}</span>
                  <p className="text-xl font-bold text-white flex-1">{c.libelle}</p>
                  <span className="text-2xl font-black text-white/90 flex-shrink-0 w-12 text-right">{nb}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mode classement : on ne révèle pas l'ordre, juste les items à réordonner */}
      {question.type === 'classement' && (
        <div className="mb-6">
          <p className="text-center text-sm uppercase tracking-widest text-emerald-400 mb-3">
            🔢 Réordonnez les éléments
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {question.choix.map((c, idx) => {
              const couleur = COULEURS_CHOIX[idx % 4];
              return (
                <div
                  key={c.id}
                  className={`bg-gradient-to-br ${couleur.bg} rounded-xl px-4 py-4 shadow-xl text-center`}
                >
                  <span className="text-2xl text-white/90 block mb-1">{couleur.forme}</span>
                  <p className="text-base font-bold text-white">{c.libelle}</p>
                </div>
              );
            })}
          </div>
          <p className="text-center text-slate-400 text-sm mt-4">
            {nbReponses} / {nbParticipants} ont validé
          </p>
        </div>
      )}

      {/* Bouton stopper la question (manuel) */}
      <div className="flex justify-center">
        <button
          onClick={onStop}
          disabled={transitioning}
          className="bg-white/10 hover:bg-white/15 border border-white/20 text-white px-8 py-3 rounded-xl font-semibold transition-all disabled:opacity-40"
        >
          ⏹ Arrêter et voir les résultats
        </button>
      </div>
    </motion.div>
  );
}

// ─────────── RÉSULTATS QUESTION ───────────

function ResultatsQuestion({
  question, counts, participants, estDerniere, onNext, transitioning,
}: {
  question: Question; counts: Record<string, number>; participants: Participant[];
  estDerniere: boolean; onNext: () => void; transitioning: boolean;
}) {
  const totalReponses = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const top5 = [...participants].sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="px-8 py-6 max-w-7xl mx-auto"
    >
      <div className="text-sm uppercase tracking-[0.2em] text-emerald-400 mb-4 text-center">Résultats</div>
      <div className="bg-white/10 rounded-3xl border border-white/15 px-8 py-6 mb-6 text-center">
        <p className="text-2xl font-bold text-white">{question.enonce}</p>
      </div>

      <div className="grid lg:grid-cols-[1.5fr,1fr] gap-6">
        {/* Histogramme des réponses (qcm/vrai_faux) */}
        {question.type !== 'classement' && (
          <div className="space-y-3">
            {question.choix.map((c, idx) => {
              const couleur = COULEURS_CHOIX[idx % 4];
              const nb = counts[c.id] || 0;
              const pct = Math.round((nb / totalReponses) * 100);
              return (
                <div key={c.id} className={`relative rounded-2xl overflow-hidden border-2 ${c.est_correct ? 'border-emerald-400 ring-4 ring-emerald-400/30' : 'border-transparent opacity-60'}`}>
                  <div className={`bg-gradient-to-br ${couleur.bg} px-6 py-5`}>
                    <div className="flex items-center gap-4 mb-2">
                      <span className="text-3xl text-white/90">{couleur.forme}</span>
                      <p className="text-xl font-bold text-white flex-1">{c.libelle}</p>
                      {c.est_correct && <span className="text-2xl">✓</span>}
                      <span className="text-2xl font-black text-white">{nb}</span>
                    </div>
                    <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-white/70"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Ordre correct (classement) */}
        {question.type === 'classement' && (
          <div>
            <p className="text-sm uppercase tracking-widest text-emerald-400 mb-3">L'ordre correct</p>
            <ol className="space-y-2">
              {[...question.choix].sort((a, b) => a.ordre - b.ordre).map((c, idx) => {
                const couleur = COULEURS_CHOIX[idx % 4];
                return (
                  <motion.li
                    key={c.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.15 }}
                    className={`bg-gradient-to-br ${couleur.bg} rounded-2xl px-5 py-4 shadow-xl flex items-center gap-4`}
                  >
                    <span className="font-mono text-3xl text-white/80 w-10 text-center font-black">{idx + 1}</span>
                    <span className="text-2xl text-white/90">{couleur.forme}</span>
                    <p className="text-xl font-bold text-white flex-1">{c.libelle}</p>
                  </motion.li>
                );
              })}
            </ol>
          </div>
        )}

        {/* Top 5 */}
        <div className="bg-white/5 rounded-3xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold mb-4">Top 5</h3>
          {top5.length === 0 ? (
            <p className="text-sm text-slate-500 italic">Aucun participant</p>
          ) : (
            <ol className="space-y-2">
              {top5.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-black ${
                    i === 0 ? 'bg-amber-400 text-slate-900' :
                    i === 1 ? 'bg-slate-300 text-slate-900' :
                    i === 2 ? 'bg-orange-400 text-slate-900' :
                    'bg-white/10 text-slate-300'
                  }`}>{i + 1}</span>
                  <span className="flex-1 truncate font-medium">{p.pseudo}</span>
                  <span className="font-mono text-emerald-300 font-bold">{p.score}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="flex justify-center mt-8">
        <button
          onClick={onNext}
          disabled={transitioning}
          className="bg-gradient-to-br from-emerald-400 to-cyan-500 text-white px-8 py-4 rounded-2xl text-lg font-bold shadow-2xl hover:-translate-y-0.5 transition-all disabled:opacity-40"
        >
          {estDerniere ? '🏆 Voir le podium' : '▶ Question suivante'}
        </button>
      </div>
    </motion.div>
  );
}

// ─────────── PODIUM ───────────

function Podium({ participants, onClose, transitioning }: { participants: Participant[]; onClose: () => void; transitioning: boolean }) {
  const tri = [...participants].sort((a, b) => b.score - a.score);
  const top3 = tri.slice(0, 3);
  const reste = tri.slice(3, 10);
  const ordrePodium = [top3[1], top3[0], top3[2]].filter(Boolean) as Participant[]; // 2,1,3 visuel
  const hauteurs = ['h-44', 'h-60', 'h-32'];
  const couleursMedaille = ['from-slate-300 to-slate-100', 'from-amber-400 to-yellow-200', 'from-orange-500 to-orange-300'];
  const rangs = [2, 1, 3];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="px-8 py-8 max-w-5xl mx-auto"
    >
      <div className="text-center mb-10">
        <div className="text-sm uppercase tracking-[0.2em] text-emerald-400 mb-2">Quiz terminé</div>
        <h2 className="text-5xl font-black text-white">🏆 Podium</h2>
      </div>

      {/* Podium top 3 */}
      <div className="flex items-end justify-center gap-4 mb-10">
        {ordrePodium.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.2, type: 'spring', stiffness: 200, damping: 18 }}
            className="flex flex-col items-center w-40"
          >
            <div className="text-4xl mb-2">{['🥈','🥇','🥉'][i]}</div>
            <p className="text-lg font-bold text-white truncate max-w-full">{p.pseudo}</p>
            <p className="font-mono text-emerald-300 font-black text-xl mb-2">{p.score}</p>
            <div className={`w-full ${hauteurs[i]} rounded-t-2xl bg-gradient-to-t ${couleursMedaille[i]} flex items-start justify-center pt-3`}>
              <span className="text-3xl font-black text-slate-900">{rangs[i]}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Reste du classement */}
      {reste.length > 0 && (
        <div className="bg-white/5 rounded-2xl border border-white/10 p-4 mb-8">
          <ol className="space-y-1">
            {reste.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5">
                <span className="w-7 text-sm text-slate-400 text-right">{i + 4}.</span>
                <span className="flex-1 truncate text-slate-200">{p.pseudo}</span>
                <span className="font-mono text-emerald-300 font-bold">{p.score}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex justify-center">
        <button
          onClick={onClose}
          disabled={transitioning}
          className="bg-white/10 hover:bg-white/15 border border-white/20 text-white px-8 py-3 rounded-xl font-semibold transition-all disabled:opacity-40"
        >
          Clôturer la session
        </button>
      </div>
    </motion.div>
  );
}
