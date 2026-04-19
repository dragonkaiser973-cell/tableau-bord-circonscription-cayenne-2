'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import BoussoleCompass, { Deposit } from '@/components/boussole/BoussoleCompass';

interface SessionDetail {
  id: string;
  titre: string;
  date_formation: string;
  deposits: Deposit[];
}

export default function SalleBoussolePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [phase, setPhase] = useState<'avant' | 'apres'>('avant');
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async (token?: string) => {
    const authToken = token || localStorage.getItem('authToken');
    try {
      const res = await fetch(`/api/formations/boussole/sessions/${id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (res.ok) setSession(await res.json());
      else if (res.status === 401) router.push('/');
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
    loadSession(token);
  }, [id, router, loadSession]);

  const handleAdd = async (p: 'avant' | 'apres', emoji: string, label: string, x: number, y: number) => {
    const token = localStorage.getItem('authToken');
    try {
      await fetch(`/api/formations/boussole/sessions/${id}/deposits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ phase: p, emoji, label, x, y }),
      });
      loadSession();
    } catch {
      setError('Erreur ajout');
    }
  };

  const handleMove = async (depositId: string, x: number, y: number) => {
    const token = localStorage.getItem('authToken');
    try {
      await fetch(`/api/formations/boussole/sessions/${id}/deposits?deposit_id=${depositId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ x, y }),
      });
      loadSession();
    } catch {
      setError('Erreur déplacement');
    }
  };

  const handleRemove = async (depositId: string) => {
    const token = localStorage.getItem('authToken');
    try {
      await fetch(`/api/formations/boussole/sessions/${id}/deposits?deposit_id=${depositId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      loadSession();
    } catch {
      setError('Erreur suppression');
    }
  };

  if (!ready) return null;

  const nbPhase = session?.deposits.filter(d => d.phase === phase).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-slate-100 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10 flex-shrink-0">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">
            Boussole d&apos;état d&apos;esprit <span className="text-indigo-400">· tactile</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {session ? `${session.titre} · anonyme · ${new Date(session.date_formation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` : '…'}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="inline-flex gap-1 bg-white/5 p-1 rounded-xl">
            {(['avant', 'apres'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPhase(p)}
                className={`px-6 py-3 rounded-lg text-base font-medium transition-all ${
                  phase === p ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p === 'avant' ? 'Avant' : 'Après'}
              </button>
            ))}
          </div>
          <Link
            href={`/formations/boussole/${id}`}
            className="px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all"
            title="Quitter le mode salle"
          >
            ✕ Quitter
          </Link>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-6">
          {session && (
            <BoussoleCompass
              deposits={session.deposits}
              mode={phase}
              onAdd={handleAdd}
              onMove={handleMove}
              onRemove={handleRemove}
              size="full"
            />
          )}

          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-slate-400">
            <span>
              <strong className="text-slate-200 text-lg">{nbPhase}</strong> dépôt{nbPhase !== 1 ? 's' : ''} en phase « {phase === 'avant' ? 'avant' : 'après'} »
            </span>
            <span className="text-slate-500">·</span>
            <span className="italic">Glissez un émoji depuis la palette vers la boussole</span>
          </div>

          {error && (
            <div className="mt-4 mx-auto max-w-md bg-red-500/20 border border-red-500/40 text-red-200 px-4 py-2 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
