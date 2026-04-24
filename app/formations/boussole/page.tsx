'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuroraHeader from '@/components/AuroraHeader';

interface Session {
  id: string;
  titre: string;
  description: string | null;
  date_formation: string;
  statut: 'en_cours' | 'terminee';
  created_at: string;
  updated_at: string;
  nb_avant: number;
  nb_apres: number;
}

export default function BoussolePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formTitre, setFormTitre] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/');
      return;
    }
    setReady(true);
    loadSessions(token);
  }, [router]);

  const loadSessions = async (token?: string) => {
    setLoading(true);
    const authToken = token || localStorage.getItem('authToken');
    try {
      const res = await fetch('/api/formations/boussole/sessions', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (res.ok) {
        setSessions(await res.json());
      } else if (res.status === 401) {
        router.push('/');
      }
    } catch {
      setError('Erreur de chargement des sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitre.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/formations/boussole/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          titre: formTitre,
          description: formDescription || undefined,
          date_formation: formDate,
        }),
      });
      if (res.ok) {
        const session = await res.json();
        router.push(`/formations/boussole/${session.id}`);
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors de la création');
        setSaving(false);
      }
    } catch {
      setError('Erreur de connexion au serveur');
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, titre: string) => {
    if (!confirm(`Supprimer la session « ${titre} » ? Cette action est irréversible.`)) return;
    try {
      const res = await fetch(`/api/formations/boussole/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
      });
      if (res.ok) loadSessions();
    } catch {
      setError('Erreur de suppression');
    }
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <AuroraHeader
        kicker="Formation — Avant / après"
        title="Boussole"
        titleAccent="d'état d'esprit."
        subtitle="Sonder les enseignants avant et après chaque formation pour mesurer l'évolution."
        backHref="/formations"
        backLabel="Retour aux formations"
        action={
          <button
            onClick={() => {
              setFormTitre('');
              setFormDescription('');
              setFormDate(new Date().toISOString().slice(0, 10));
              setError(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 bg-gradient-to-br from-amber-300 to-orange-400 text-slate-900 px-5 py-2.5 rounded-full font-semibold text-sm shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nouvelle session
          </button>
        }
      />

      <div className="container mx-auto max-w-7xl px-6 py-8 -mt-20 relative z-10">
        <div className="mb-6">
          <p className="text-slate-500 text-sm">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} enregistrée{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>

        {loading ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-500">Chargement…</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-6xl mb-4">🧭</div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Aucune session pour le moment</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Créez votre première session pour commencer à sonder l&apos;état d&apos;esprit de vos participants.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-all"
            >
              + Créer une session
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {sessions.map(s => (
              <div key={s.id} className="card hover:shadow-2xl transition-all border-2 border-transparent hover:border-primary-200 relative">
                <button
                  onClick={() => handleDelete(s.id, s.titre)}
                  className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors text-xl"
                  aria-label="Supprimer"
                  title="Supprimer"
                >
                  ×
                </button>
                <Link href={`/formations/boussole/${s.id}`} className="block">
                  <div className="flex items-start gap-4 mb-4 pr-8">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🧭</div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold text-gray-800 mb-1 truncate">{s.titre}</h2>
                      {s.description && <p className="text-gray-500 text-sm line-clamp-2">{s.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center flex-wrap gap-3 text-sm text-gray-500">
                    <span>📅 {new Date(s.date_formation).toLocaleDateString('fr-FR')}</span>
                    <span>👥 {s.nb_avant} / {s.nb_apres}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      s.statut === 'terminee'
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {s.statut === 'terminee' ? 'Terminée' : 'En cours'}
                    </span>
                  </div>
                  <div className="mt-4">
                    <span className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold inline-block">
                      Ouvrir →
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !saving && setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Nouvelle session</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                <input
                  type="text"
                  value={formTitre}
                  onChange={(e) => setFormTitre(e.target.value)}
                  required
                  autoFocus
                  placeholder="Ex. Différenciation pédagogique"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnelle)</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  placeholder="Ex. Formation à destination des CP/CE1 de l'école Massel"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={saving}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving || !formTitre.trim()}
                  className="bg-primary-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
