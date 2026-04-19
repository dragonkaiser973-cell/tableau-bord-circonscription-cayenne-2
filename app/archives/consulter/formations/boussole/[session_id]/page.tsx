'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import BoussoleCompass, { Deposit, BoussoleMode } from '@/components/boussole/BoussoleCompass';
import { EMOJI_LABELS } from '@/components/boussole/emojis';

interface ArchivedSession {
  id: string;
  titre: string;
  description: string | null;
  date_formation: string;
  statut: string;
}

function ArchivedBoussoleSession() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params?.session_id as string;
  const annee = searchParams.get('annee');

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<ArchivedSession | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [mode, setMode] = useState<BoussoleMode>('evolution');

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/');
      return;
    }
    if (!annee || !sessionId) return;
    (async () => {
      try {
        const res = await fetch(`/api/archives?annee=${annee}`);
        if (res.ok) {
          const data = await res.json();
          const brutes = data.donnees_brutes || {};
          const s = (brutes.boussole_sessions || []).find((x: ArchivedSession) => x.id === sessionId);
          setSession(s || null);
          const deps = (brutes.boussole_deposits || [])
            .filter((d: Deposit & { session_id: string }) => d.session_id === sessionId)
            .map((d: Deposit) => ({ ...d, x: Number(d.x), y: Number(d.y) }));
          setDeposits(deps);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [annee, sessionId, router]);

  const nbAvant = deposits.filter(d => d.phase === 'avant').length;
  const nbApres = deposits.filter(d => d.phase === 'apres').length;

  const emojiEvolution: Array<{ emoji: string; delta: number }> = (() => {
    const avantCount: Record<string, number> = {};
    const apresCount: Record<string, number> = {};
    deposits.forEach(d => {
      if (d.phase === 'avant') avantCount[d.emoji] = (avantCount[d.emoji] || 0) + 1;
      else apresCount[d.emoji] = (apresCount[d.emoji] || 0) + 1;
    });
    const all = new Set([...Object.keys(avantCount), ...Object.keys(apresCount)]);
    return Array.from(all)
      .map(emoji => ({ emoji, delta: (apresCount[emoji] || 0) - (avantCount[emoji] || 0) }))
      .filter(e => e.delta !== 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 6);
  })();

  const maxAbs = Math.max(1, ...emojiEvolution.map(e => Math.abs(e.delta)));

  const handleExport = () => {
    if (!session) return;
    const enriched = deposits.map(d => ({
      phase: d.phase,
      emoji: d.emoji,
      label: d.label || EMOJI_LABELS[d.emoji] || '',
      x: Number(d.x),
      y: Number(d.y),
    }));
    const json = JSON.stringify({ archive: annee, session: { id: session.id, titre: session.titre, date: session.date_formation }, deposits: enriched }, null, 2);
    const csv = 'phase,emoji,label,x,y\n' + enriched.map(p => `${p.phase},${p.emoji},${p.label},${p.x.toFixed(2)},${p.y.toFixed(2)}`).join('\n');
    download(`boussole-${session.id}.json`, json, 'application/json');
    download(`boussole-${session.id}.csv`, csv, 'text/csv');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0] text-white text-xl">
        Chargement…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0] text-white">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <p>Session introuvable dans l&apos;archive</p>
          <Link href={`/archives/consulter/formations/boussole?annee=${annee}`} className="underline mt-4 inline-block">Retour à la liste</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      <div className="text-white py-10 px-6">
        <div className="container mx-auto">
          <Link href={`/archives/consulter/formations/boussole?annee=${annee}`} className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors">
            ← Retour aux sessions archivées
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">🧭</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-4xl font-bold truncate">{session.titre}</h1>
              <div className="flex items-center flex-wrap gap-3 mt-2 text-sm opacity-90">
                <span>📅 {new Date(session.date_formation).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/20">Archive {annee}</span>
              </div>
            </div>
          </div>
          {session.description && <p className="text-white/80 mt-2 max-w-2xl">{session.description}</p>}
        </div>
      </div>

      <div className="container mx-auto px-6 pb-10">
        <div className="grid lg:grid-cols-[1fr_300px] gap-5">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 text-slate-200">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div className="inline-flex gap-1 bg-white/5 p-1 rounded-xl">
                {(['avant', 'apres', 'evolution'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      mode === m ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m === 'avant' ? 'Avant' : m === 'apres' ? 'Après' : 'Évolution'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 italic">Consultation archive — lecture seule</p>
            </div>

            <BoussoleCompass deposits={deposits} mode={mode} readOnly size="compact" />
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-white/[0.95] border border-white/30 p-4">
              <h3 className="text-[11px] uppercase tracking-widest text-gray-500 mb-3">Participation</h3>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-2xl font-semibold text-gray-800">{nbAvant}</span>
                <span className="text-xs text-gray-500">dépôts avant</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-semibold text-gray-800">{nbApres}</span>
                <span className="text-xs text-gray-500">dépôts après</span>
              </div>
            </div>

            {mode === 'evolution' && emojiEvolution.length > 0 && (
              <div className="rounded-2xl bg-white/[0.95] border border-white/30 p-4">
                <h3 className="text-[11px] uppercase tracking-widest text-gray-500 mb-3">Évolution des émojis</h3>
                <div className="space-y-1.5">
                  {emojiEvolution.map(e => (
                    <div key={e.emoji} className="flex items-center gap-2 py-1">
                      <span className="text-xl w-7 text-center">{e.emoji}</span>
                      <div className="flex-1 h-1.5 bg-gray-200 rounded overflow-hidden">
                        <div
                          className={`h-full rounded ${e.delta > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                          style={{ width: `${(Math.abs(e.delta) / maxAbs) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">
                        {e.delta > 0 ? '+' : ''}{e.delta}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mode === 'evolution' && (
              <button
                onClick={handleExport}
                className="rounded-xl py-3 font-semibold text-white bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all"
              >
                ⬇ Exporter (CSV + JSON)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0] text-white">
        Chargement…
      </div>
    }>
      <ArchivedBoussoleSession />
    </Suspense>
  );
}
