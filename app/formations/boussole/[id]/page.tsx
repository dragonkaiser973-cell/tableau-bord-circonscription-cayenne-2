'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import BoussoleCompass, { Deposit, BoussoleMode } from '@/components/boussole/BoussoleCompass';
import { EMOJI_LABELS } from '@/components/boussole/emojis';

interface SessionDetail {
  id: string;
  titre: string;
  description: string | null;
  date_formation: string;
  statut: 'en_cours' | 'terminee';
  created_at: string;
  updated_at: string;
  deposits: Deposit[];
}

export default function SessionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [mode, setMode] = useState<BoussoleMode>('evolution');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async (token?: string) => {
    setLoading(true);
    const authToken = token || localStorage.getItem('authToken');
    try {
      const res = await fetch(`/api/formations/boussole/sessions/${id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (res.ok) {
        setSession(await res.json());
      } else if (res.status === 404) {
        setError('Session introuvable');
      } else if (res.status === 401) {
        router.push('/');
      } else {
        setError('Erreur de chargement');
      }
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
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

  const toggleStatut = async () => {
    if (!session) return;
    const newStatut = session.statut === 'terminee' ? 'en_cours' : 'terminee';
    try {
      const res = await fetch(`/api/formations/boussole/sessions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ statut: newStatut }),
      });
      if (res.ok) loadSession();
    } catch {
      setError('Erreur mise à jour statut');
    }
  };

  const handleDelete = async () => {
    if (!session) return;
    if (!confirm(`Supprimer la session « ${session.titre} » et tous ses dépôts ? Cette action est irréversible.`)) return;
    try {
      const res = await fetch(`/api/formations/boussole/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
      });
      if (res.ok) router.push('/formations/boussole');
    } catch {
      setError('Erreur suppression');
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
      setError('Erreur suppression dépôt');
    }
  };

  const handleMove = async (depositId: string, x: number, y: number) => {
    const token = localStorage.getItem('authToken');
    try {
      await fetch(`/api/formations/boussole/sessions/${id}/deposits?deposit_id=${depositId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ x, y }),
      });
      loadSession();
    } catch {
      setError('Erreur déplacement');
    }
  };

  const handleAdd = async (phase: 'avant' | 'apres', emoji: string, label: string, x: number, y: number) => {
    const token = localStorage.getItem('authToken');
    try {
      await fetch(`/api/formations/boussole/sessions/${id}/deposits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ phase, emoji, label, x, y }),
      });
      loadSession();
    } catch {
      setError('Erreur ajout dépôt');
    }
  };

  const handleExport = () => {
    if (!session) return;
    const enriched = session.deposits.map(d => ({
      phase: d.phase,
      emoji: d.emoji,
      label: d.label || EMOJI_LABELS[d.emoji] || '',
      x: Number(d.x),
      y: Number(d.y),
      created_at: d.created_at,
    }));
    const json = JSON.stringify({ session: { id: session.id, titre: session.titre, date: session.date_formation }, deposits: enriched }, null, 2);
    const csv = 'phase,emoji,label,x,y,created_at\n' + enriched.map(p => `${p.phase},${p.emoji},${p.label},${p.x.toFixed(2)},${p.y.toFixed(2)},${p.created_at}`).join('\n');
    download(`boussole-${session.id}.json`, json, 'application/json');
    download(`boussole-${session.id}.csv`, csv, 'text/csv');
  };

  if (!ready) return null;

  const nbAvant = session?.deposits.filter(d => d.phase === 'avant').length ?? 0;
  const nbApres = session?.deposits.filter(d => d.phase === 'apres').length ?? 0;

  const emojiEvolution: Array<{ emoji: string; delta: number }> = (() => {
    if (!session) return [];
    const avantCount: Record<string, number> = {};
    const apresCount: Record<string, number> = {};
    session.deposits.forEach(d => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      <div className="text-white py-10 px-6">
        <div className="container mx-auto">
          <Link href="/formations/boussole" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors">
            ← Retour à la liste
          </Link>
          {session && (
            <>
              <div className="flex items-start gap-4 mb-2">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">🧭</div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl md:text-4xl font-bold truncate">{session.titre}</h1>
                  <div className="flex items-center flex-wrap gap-3 mt-2 text-sm opacity-90">
                    <span>📅 {new Date(session.date_formation).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      session.statut === 'terminee' ? 'bg-white/20' : 'bg-green-400/30'
                    }`}>
                      {session.statut === 'terminee' ? 'Terminée' : 'En cours'}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/formations/boussole/${id}/salle`}
                  className="bg-white text-primary-700 px-5 py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all whitespace-nowrap flex-shrink-0"
                  title="Mode tactile plein écran pour les participants"
                >
                  🖐️ Mode salle
                </Link>
              </div>
              {session.description && <p className="text-white/80 mt-2 max-w-2xl">{session.description}</p>}
            </>
          )}
        </div>
      </div>

      <div className="container mx-auto px-6 pb-10">
        {loading ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-500">Chargement…</p>
          </div>
        ) : error ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-gray-700 font-semibold mb-2">{error}</p>
            <Link href="/formations/boussole" className="text-primary-600 hover:underline text-sm">
              Retour à la liste
            </Link>
          </div>
        ) : session && (
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
                <p className="text-xs text-slate-400 italic">
                  {mode === 'evolution'
                    ? 'Vue analyse — les participants ne voient jamais ce mode'
                    : 'Vue consultation — cliquer « Mode salle » pour collecter'}
                </p>
              </div>

              <BoussoleCompass
                deposits={session.deposits}
                mode={mode}
                onAdd={handleAdd}
                onMove={handleMove}
                onRemove={handleRemove}
                size="compact"
              />
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

              {mode !== 'evolution' ? (
                <div className="rounded-2xl border border-dashed border-white/40 bg-white/10 p-4 text-center text-white/90 text-sm leading-relaxed">
                  Mode participant actif.<br />
                  L&apos;analyse détaillée apparaît en mode <strong>Évolution</strong>.
                </div>
              ) : (
                <>
                  {emojiEvolution.length > 0 && (
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
                  <button
                    onClick={handleExport}
                    className="rounded-xl py-3 font-semibold text-white bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all"
                  >
                    ⬇ Exporter (CSV + JSON)
                  </button>
                </>
              )}

              <div className="rounded-2xl bg-white/[0.95] border border-white/30 p-4">
                <h3 className="text-[11px] uppercase tracking-widest text-gray-500 mb-3">Actions</h3>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={toggleStatut}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-700 transition-all"
                  >
                    {session.statut === 'terminee' ? 'Rouvrir la session' : 'Marquer comme terminée'}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition-all"
                  >
                    Supprimer la session
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
