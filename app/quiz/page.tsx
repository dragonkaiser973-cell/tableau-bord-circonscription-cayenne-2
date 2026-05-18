'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuroraHeader from '@/components/AuroraHeader';

interface Quiz {
  id: string;
  titre: string;
  description: string | null;
  rythme: 'manuel' | 'auto';
  nb_questions: number;
  updated_at: string;
}

interface SessionLite {
  id: string;
  pin: string;
  statut: string;
  created_at: string;
  quiz_quizzes: { titre: string } | null;
}

export default function QuizListePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [sessions, setSessions] = useState<SessionLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formTitre, setFormTitre] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formRythme, setFormRythme] = useState<'manuel' | 'auto'>('manuel');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/');
      return;
    }
    setReady(true);
    loadAll(token);
  }, [router]);

  const loadAll = async (token?: string) => {
    setLoading(true);
    const authToken = token || localStorage.getItem('authToken');
    try {
      const [resQ, resS] = await Promise.all([
        fetch('/api/quiz/quizzes', { headers: { 'Authorization': `Bearer ${authToken}` } }),
        fetch('/api/quiz/sessions', { headers: { 'Authorization': `Bearer ${authToken}` } }),
      ]);
      if (resQ.ok) setQuizzes(await resQ.json());
      else if (resQ.status === 401) router.push('/');
      if (resS.ok) setSessions(await resS.json());
    } catch {
      setError('Erreur de chargement');
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
      const res = await fetch('/api/quiz/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          titre: formTitre,
          description: formDescription || undefined,
          rythme: formRythme,
        }),
      });
      if (res.ok) {
        const quiz = await res.json();
        setShowCreateModal(false);
        setFormTitre('');
        setFormDescription('');
        // Redirige vers l'éditeur pour ajouter les questions
        router.push(`/quiz/${quiz.id}/edit`);
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors de la création');
        setSaving(false);
      }
    } catch {
      setError('Erreur de connexion au serveur');
      setSaving(false);
    } finally {
      setSaving(false);
    }
  };

  const lancerSession = async (quiz: Quiz) => {
    if (quiz.nb_questions === 0) {
      setError('Ce quiz ne contient aucune question — ajoutez-en avant de lancer une session.');
      return;
    }
    setError(null);
    try {
      const res = await fetch('/api/quiz/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ quiz_id: quiz.id }),
      });
      if (res.ok) {
        const session = await res.json();
        router.push(`/quiz/sessions/${session.id}/salle`);
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors du lancement');
      }
    } catch {
      setError('Erreur de connexion');
    }
  };

  const dupliquer = async (quiz: Quiz) => {
    setError(null);
    try {
      const res = await fetch(`/api/quiz/quizzes/${quiz.id}/duplicate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
      });
      if (res.ok) {
        const copie = await res.json();
        // Recharge la liste puis va sur l'éditeur de la copie
        await loadAll();
        router.push(`/quiz/${copie.id}/edit`);
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur duplication');
      }
    } catch {
      setError('Erreur de connexion');
    }
  };

  const renommer = async (quiz: Quiz, nouveauTitre: string) => {
    if (!nouveauTitre.trim() || nouveauTitre === quiz.titre) {
      setRenamingId(null);
      return;
    }
    try {
      const res = await fetch(`/api/quiz/quizzes/${quiz.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ titre: nouveauTitre.trim() }),
      });
      if (res.ok) {
        setQuizzes(prev => prev.map(q => q.id === quiz.id ? { ...q, titre: nouveauTitre.trim() } : q));
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur lors du renommage');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setRenamingId(null);
    }
  };

  const supprimerSession = async (s: SessionLite) => {
    if (!confirm(`Supprimer la session ${s.pin} (${s.quiz_quizzes?.titre || 'Quiz'}) ? Les participants connectés seront déconnectés.`)) return;
    try {
      const res = await fetch(`/api/quiz/sessions/${s.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
      });
      if (res.ok) {
        setSessions(prev => prev.filter(x => x.id !== s.id));
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur de suppression');
      }
    } catch {
      setError('Erreur de connexion');
    }
  };

  const supprimer = async (quiz: Quiz) => {
    if (!confirm(`Supprimer le quiz « ${quiz.titre} » ?`)) return;
    try {
      const res = await fetch(`/api/quiz/quizzes/${quiz.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
      });
      if (res.ok) loadAll();
      else {
        const data = await res.json();
        setError(data.error || 'Erreur de suppression');
      }
    } catch {
      setError('Erreur de connexion');
    }
  };

  if (!ready) return null;

  const sessionsActives = sessions.filter(s => s.statut !== 'terminee');

  return (
    <div className="min-h-screen bg-slate-50">
      <AuroraHeader
        kicker="Outil — Animation de formation"
        title="Quiz"
        titleAccent="live."
        subtitle="Lancez un quiz interactif type Kahoot. Les participants rejoignent depuis leur téléphone via un PIN à 6 chiffres."
        backHref="/"
        backLabel="Retour à l'accueil"
        action={
          <>
            <Link
              href="/quiz/historique"
              className="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/30 text-white px-4 py-2.5 rounded-full font-semibold text-sm hover:bg-white/25 transition-all"
            >
              📚 Historique
            </Link>
            <button
              onClick={() => {
                setFormTitre('');
                setFormDescription('');
                setFormRythme('manuel');
                setError(null);
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-br from-amber-300 to-orange-400 text-slate-900 px-5 py-2.5 rounded-full font-semibold text-sm shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nouveau quiz
            </button>
          </>
        }
      />

      <div className="container mx-auto max-w-7xl px-6 py-8 -mt-20 relative z-10">
        {sessionsActives.length > 0 && (
          <div className="mb-8 bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-200 rounded-2xl p-5">
            <h2 className="text-sm uppercase tracking-widest text-emerald-700 font-bold mb-3">Sessions en cours</h2>
            <div className="flex flex-wrap gap-3">
              {sessionsActives.map(s => (
                <div key={s.id} className="inline-flex items-center gap-1 bg-white border border-emerald-300 rounded-xl hover:shadow-md transition-all">
                  <Link
                    href={`/quiz/sessions/${s.id}/salle`}
                    className="inline-flex items-center gap-3 px-4 py-2.5"
                  >
                    <span className="font-mono text-lg font-black text-emerald-600">{s.pin}</span>
                    <span className="text-sm text-slate-700">{s.quiz_quizzes?.titre || 'Quiz'}</span>
                    <span className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {s.statut === 'lobby' ? 'Lobby' : s.statut === 'podium' ? 'Podium' : 'En cours'}
                    </span>
                  </Link>
                  <button
                    onClick={() => supprimerSession(s)}
                    className="pr-3 text-slate-300 hover:text-red-500 transition-colors text-lg leading-none"
                    title="Supprimer cette session"
                  >🗑</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-6">
          <p className="text-slate-500 text-sm">
            {quizzes.length} quiz enregistré{quizzes.length !== 1 ? 's' : ''}
          </p>
        </div>

        {loading ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-500">Chargement…</p>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Aucun quiz pour le moment</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Créez votre premier quiz pour animer une formation interactive.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-all"
            >
              + Créer un quiz
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {quizzes.map(q => (
              <div key={q.id} className="card hover:shadow-2xl transition-all border-2 border-transparent hover:border-primary-200">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🎯</div>
                  <div className="flex-1 min-w-0">
                    {renamingId === q.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={() => renommer(q, renameValue)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') renommer(q, renameValue);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        className="text-xl font-bold text-gray-800 w-full border-b-2 border-primary-400 focus:outline-none bg-transparent mb-1"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 group/title mb-1">
                        <h2 className="text-xl font-bold text-gray-800 truncate">{q.titre}</h2>
                        <button
                          onClick={() => { setRenamingId(q.id); setRenameValue(q.titre); }}
                          className="opacity-0 group-hover/title:opacity-100 transition-opacity text-slate-400 hover:text-primary-600 flex-shrink-0"
                          title="Renommer"
                        >✎</button>
                      </div>
                    )}
                    {q.description && <p className="text-gray-500 text-sm line-clamp-2">{q.description}</p>}
                  </div>
                </div>
                <div className="flex items-center flex-wrap gap-3 text-sm text-gray-500 mb-4">
                  <span>📋 {q.nb_questions} question{q.nb_questions !== 1 ? 's' : ''}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    q.rythme === 'auto' ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {q.rythme === 'auto' ? '⏱ Auto' : '✋ Manuel'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/quiz/${q.id}/edit`}
                    className="px-3 py-2.5 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all"
                    title="Éditer"
                  >
                    ✎
                  </Link>
                  <button
                    onClick={() => dupliquer(q)}
                    className="px-3 py-2.5 rounded-lg text-sm font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all"
                    title="Dupliquer"
                  >
                    ⎘
                  </button>
                  <button
                    onClick={() => supprimer(q)}
                    className="px-3 py-2.5 rounded-lg text-sm font-semibold border border-slate-300 text-slate-400 hover:text-red-600 hover:border-red-300 hover:bg-red-50 transition-all"
                    title="Supprimer ce quiz"
                  >
                    🗑
                  </button>
                  <button
                    onClick={() => lancerSession(q)}
                    disabled={q.nb_questions === 0}
                    className="flex-1 bg-gradient-to-br from-emerald-500 to-cyan-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:from-emerald-600 hover:to-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    ▶ Lancer une session
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !saving && setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 mb-4">Nouveau quiz</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                <input
                  type="text"
                  value={formTitre}
                  onChange={(e) => setFormTitre(e.target.value)}
                  required
                  autoFocus
                  placeholder="Ex. Vérification des acquis — différenciation"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnelle)</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rythme par défaut</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormRythme('manuel')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      formRythme === 'manuel' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    ✋ Manuel
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormRythme('auto')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      formRythme === 'auto' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    ⏱ Auto
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Modifiable à chaque session.</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2 rounded">
                Vous serez redirigé vers l&apos;éditeur pour ajouter vos questions.
              </div>
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
