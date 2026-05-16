'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LobbyJoueurPage() {
  const router = useRouter();
  const params = useParams();
  const pin = params?.pin as string;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [titre, setTitre] = useState<string>('');
  const [statut, setStatut] = useState<string>('lobby');
  const [pseudo, setPseudo] = useState('');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);

  // 1) Vérifier le PIN et récupérer la session
  useEffect(() => {
    if (!pin) return;
    (async () => {
      try {
        const res = await fetch(`/api/quiz/public/sessions/by-pin/${pin}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || 'Aucune session trouvée');
          setVerifying(false);
          return;
        }
        const data = await res.json();
        setSessionId(data.session_id);
        setTitre(data.titre);
        setStatut(data.statut);

        // Si on a déjà un participant_id en localStorage pour cette session, on l'utilise
        const stored = localStorage.getItem(`quiz_pid_${data.session_id}`);
        if (stored) {
          setParticipantId(stored);
        }
        setVerifying(false);
      } catch {
        setError('Erreur de connexion');
        setVerifying(false);
      }
    })();
  }, [pin]);

  // 2) Suivre le statut de la session en temps réel
  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`quiz-state-${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'quiz_sessions', filter: `id=eq.${sessionId}` }, (payload) => {
        const newStatut = (payload.new as { statut: string }).statut;
        setStatut(newStatut);
        // Si on a un participant et que ça démarre → vers l'écran de jeu
        if (newStatut !== 'lobby' && participantId) {
          router.push(`/jouer/${pin}/quiz`);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, participantId, pin, router]);

  // 3) Si on a déjà un participant_id et que le quiz est lancé → rediriger
  useEffect(() => {
    if (participantId && statut !== 'lobby' && statut !== 'terminee') {
      router.push(`/jouer/${pin}/quiz`);
    }
  }, [participantId, statut, pin, router]);

  const rejoindre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;
    const trimmed = pseudo.trim();
    if (trimmed.length < 1 || trimmed.length > 20) {
      setError('Pseudo entre 1 et 20 caractères');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quiz/public/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo: trimmed }),
      });
      if (res.ok) {
        const p = await res.json();
        localStorage.setItem(`quiz_pid_${sessionId}`, p.id);
        localStorage.setItem(`quiz_pseudo_${sessionId}`, p.pseudo);
        setParticipantId(p.id);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Erreur lors de l\'inscription');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white flex items-center justify-center">
        <p className="text-slate-400">Vérification du PIN…</p>
      </div>
    );
  }

  if (error && !sessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2">PIN introuvable</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <button onClick={() => router.push('/jouer')} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Saisie du pseudo
  if (!participantId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-400 mb-2">PIN {pin}</p>
            <h1 className="text-3xl font-bold mb-1">{titre}</h1>
            <p className="text-slate-400">Choisissez votre pseudo pour rejoindre la partie</p>
          </div>
          <form onSubmit={rejoindre} className="space-y-5">
            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              maxLength={20}
              autoFocus
              placeholder="Votre pseudo"
              className="w-full bg-white/10 border-2 border-white/20 rounded-2xl px-6 py-5 text-center text-2xl font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 focus:bg-white/15 transition-all"
            />
            {error && (
              <div className="bg-red-500/20 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl text-sm text-center">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || pseudo.trim().length === 0}
              className="w-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-white py-5 rounded-2xl text-xl font-bold shadow-2xl hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? 'Inscription…' : 'Rejoindre →'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // En attente du démarrage
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white flex items-center justify-center px-6 py-10">
      <div className="text-center max-w-md">
        <div className="inline-flex w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 items-center justify-center text-3xl shadow-2xl animate-pulse">
          ⏳
        </div>
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-400 mb-2">Vous êtes inscrit</p>
        <h1 className="text-3xl font-bold mb-1">
          {localStorage.getItem(`quiz_pseudo_${sessionId}`) || 'Participant'}
        </h1>
        <p className="text-slate-400 mb-8">
          En attente du démarrage par l&apos;animateur…<br/>
          Le quiz « {titre} » va bientôt commencer.
        </p>
        <p className="text-xs text-slate-600">PIN {pin}</p>
      </div>
    </div>
  );
}
