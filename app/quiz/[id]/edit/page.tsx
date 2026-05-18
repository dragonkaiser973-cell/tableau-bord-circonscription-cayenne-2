'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import AuroraHeader from '@/components/AuroraHeader';

type TypeQuestion = 'qcm' | 'vrai_faux' | 'classement';

interface Choix {
  id: string;
  ordre: number;
  libelle: string;
  est_correct: boolean;
}
interface Question {
  id: string;
  ordre: number;
  type: TypeQuestion;
  enonce: string;
  duree_secondes: number;
  points_base: number;
  choix: Choix[];
}
interface Quiz {
  id: string;
  titre: string;
  description: string | null;
  rythme: 'manuel' | 'auto';
  questions: Question[];
}

const TYPES_LABELS: Record<TypeQuestion, { label: string; emoji: string; description: string }> = {
  qcm: { label: 'QCM', emoji: '🅰️', description: '4 choix, une seule bonne réponse' },
  vrai_faux: { label: 'Vrai / Faux', emoji: '✅', description: 'Une affirmation, vrai ou faux' },
  classement: { label: 'Bon ordre', emoji: '🔢', description: 'Réordonner des items' },
};

const COULEURS_CHOIX = [
  { bg: 'bg-rose-500', border: 'border-rose-300', forme: '▲' },
  { bg: 'bg-sky-500', border: 'border-sky-300', forme: '◆' },
  { bg: 'bg-amber-500', border: 'border-amber-300', forme: '●' },
  { bg: 'bg-emerald-500', border: 'border-emerald-300', forme: '■' },
];

export default function EditQuizPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [ready, setReady] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [selectedQid, setSelectedQid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'pending' | 'saved'>('idle');

  const loadQuiz = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      const res = await fetch(`/api/quiz/quizzes/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data: Quiz = await res.json();
        setQuiz(data);
        if (data.questions.length > 0 && !selectedQid) {
          setSelectedQid(data.questions[0].id);
        }
      } else if (res.status === 401) {
        router.push('/');
      } else if (res.status === 404) {
        setError('Quiz introuvable');
      }
    } catch {
      setError('Erreur de chargement');
    }
  }, [id, router, selectedQid]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/');
      return;
    }
    setReady(true);
    loadQuiz();
  }, [id, router, loadQuiz]);

  const ajouterQuestion = async (type: TypeQuestion) => {
    if (!quiz) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/quiz/quizzes/${id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
        body: JSON.stringify({ type, enonce: 'Nouvelle question' }),
      });
      if (res.ok) {
        const newQ: Question = await res.json();
        setQuiz({ ...quiz, questions: [...quiz.questions, newQ] });
        setSelectedQid(newQ.id);
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur création');
      }
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  const sauverQuestion = async (q: Question) => {
    setSaveStatus('pending');
    try {
      const res = await fetch(`/api/quiz/questions/${q.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
        body: JSON.stringify({
          enonce: q.enonce,
          type: q.type,
          duree_secondes: q.duree_secondes,
          points_base: q.points_base,
          choix: q.choix.map((c, idx) => ({
            libelle: c.libelle,
            est_correct: c.est_correct,
            ordre: idx,
          })),
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setQuiz(prev => prev ? {
          ...prev,
          questions: prev.questions.map(qq => qq.id === q.id ? updated : qq),
        } : prev);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1500);
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur sauvegarde');
        setSaveStatus('idle');
      }
    } catch {
      setError('Erreur de connexion');
      setSaveStatus('idle');
    }
  };

  const supprimerQuestion = async (qid: string) => {
    if (!confirm('Supprimer cette question ?')) return;
    try {
      const res = await fetch(`/api/quiz/questions/${qid}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
      });
      if (res.ok) {
        setQuiz(prev => {
          if (!prev) return prev;
          const remaining = prev.questions.filter(q => q.id !== qid);
          if (selectedQid === qid) {
            setSelectedQid(remaining[0]?.id || null);
          }
          return { ...prev, questions: remaining };
        });
      } else {
        const data = await res.json();
        setError(data.error || 'Erreur suppression');
      }
    } catch {
      setError('Erreur de connexion');
    }
  };

  const reordonner = async (fromIdx: number, toIdx: number) => {
    if (!quiz || fromIdx === toIdx) return;
    const ordered = [...quiz.questions];
    const [moved] = ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, moved);
    setQuiz({ ...quiz, questions: ordered });
    try {
      await fetch(`/api/quiz/quizzes/${id}/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
        body: JSON.stringify({ ordre: ordered.map(q => q.id) }),
      });
    } catch {
      setError('Erreur réordonnancement');
    }
  };

  const updateQuestion = (qid: string, patch: Partial<Question>) => {
    setQuiz(prev => prev ? {
      ...prev,
      questions: prev.questions.map(q => q.id === qid ? { ...q, ...patch } : q),
    } : prev);
  };

  const updateChoix = (qid: string, cidx: number, patch: Partial<Choix>) => {
    setQuiz(prev => prev ? {
      ...prev,
      questions: prev.questions.map(q => q.id === qid ? {
        ...q,
        choix: q.choix.map((c, i) => i === cidx ? { ...c, ...patch } : c),
      } : q),
    } : prev);
  };

  // Bascule la "bonne réponse" pour QCM/vrai_faux : exclusivité
  const setBonneReponse = (qid: string, cidx: number) => {
    setQuiz(prev => prev ? {
      ...prev,
      questions: prev.questions.map(q => q.id === qid ? {
        ...q,
        choix: q.choix.map((c, i) => ({ ...c, est_correct: i === cidx })),
      } : q),
    } : prev);
  };

  const addChoix = (qid: string) => {
    setQuiz(prev => prev ? {
      ...prev,
      questions: prev.questions.map(q => q.id !== qid ? q : {
        ...q,
        choix: [...q.choix, {
          id: `tmp-${Date.now()}`,
          ordre: q.choix.length,
          libelle: q.type === 'classement' ? `Élément ${q.choix.length + 1}` : `Choix ${q.choix.length + 1}`,
          est_correct: false,
        }],
      }),
    } : prev);
  };

  const removeChoix = (qid: string, cidx: number) => {
    setQuiz(prev => prev ? {
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id !== qid) return q;
        const next = q.choix
          .filter((_, i) => i !== cidx)
          .map((c, i) => ({ ...c, ordre: i }));
        // Si la bonne réponse était supprimée, marquer le premier choix
        const hasBonne = next.some(c => c.est_correct);
        if (!hasBonne && next.length > 0 && q.type !== 'classement') {
          next[0] = { ...next[0], est_correct: true };
        }
        return { ...q, choix: next };
      }),
    } : prev);
  };

  const moveChoix = (qid: string, cidx: number, dir: -1 | 1) => {
    setQuiz(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: prev.questions.map(q => {
          if (q.id !== qid) return q;
          const next = [...q.choix];
          const target = cidx + dir;
          if (target < 0 || target >= next.length) return q;
          [next[cidx], next[target]] = [next[target], next[cidx]];
          return { ...q, choix: next.map((c, i) => ({ ...c, ordre: i })) };
        }),
      };
    });
  };

  if (!ready) return null;
  if (!quiz) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">{error || 'Chargement…'}</p>
      </div>
    );
  }

  const selectedQuestion = quiz.questions.find(q => q.id === selectedQid) || null;

  return (
    <div className="min-h-screen bg-slate-50">
      <AuroraHeader
        kicker="Édition d'un quiz"
        title={quiz.titre}
        titleAccent=""
        subtitle={quiz.description || 'Ajoutez, modifiez et ordonnez vos questions.'}
        backHref="/quiz"
        backLabel="Retour à la liste"
        action={
          <Link
            href={`/quiz`}
            className="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/30 text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-white/25 transition-all"
          >
            ← Liste des quiz
          </Link>
        }
      />

      <div className="container mx-auto max-w-7xl px-6 py-8 -mt-20 relative z-10">
        <div className="grid lg:grid-cols-[280px,1fr] gap-6">
          {/* ── SIDEBAR : LISTE QUESTIONS ── */}
          <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">Questions</h3>
              <p className="text-xs text-slate-500 mt-0.5">{quiz.questions.length} au total</p>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-1">
              {quiz.questions.map((q, idx) => (
                <div
                  key={q.id}
                  className={`group rounded-xl px-3 py-2.5 cursor-pointer transition-all border ${
                    selectedQid === q.id
                      ? 'bg-primary-50 border-primary-200'
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedQid(q.id)}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-slate-400 mt-0.5">{idx + 1}.</span>
                    <span className="text-base flex-shrink-0">{TYPES_LABELS[q.type].emoji}</span>
                    <p className="text-sm text-slate-700 line-clamp-2 flex-1">{q.enonce}</p>
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); reordonner(idx, idx - 1); }}
                      disabled={idx === 0}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-20 px-1"
                      title="Monter"
                    >↑</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); reordonner(idx, idx + 1); }}
                      disabled={idx === quiz.questions.length - 1}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-20 px-1"
                      title="Descendre"
                    >↓</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); supprimerQuestion(q.id); }}
                      className="text-slate-400 hover:text-rose-600 px-1"
                      title="Supprimer"
                    >×</button>
                  </div>
                </div>
              ))}
              {quiz.questions.length === 0 && (
                <p className="text-sm text-slate-400 italic text-center py-6 px-3">
                  Aucune question pour le moment.
                </p>
              )}
            </div>
            <div className="p-3 border-t border-slate-200 space-y-1.5">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium px-1">Ajouter</p>
              {(Object.keys(TYPES_LABELS) as TypeQuestion[]).map(t => (
                <button
                  key={t}
                  onClick={() => ajouterQuestion(t)}
                  disabled={saving}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-primary-50 hover:text-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2 border border-transparent hover:border-primary-200"
                >
                  <span>{TYPES_LABELS[t].emoji}</span>
                  <span className="flex-1">{TYPES_LABELS[t].label}</span>
                  <span className="text-slate-400 text-base">+</span>
                </button>
              ))}
            </div>
          </aside>

          {/* ── PANNEAU CENTRAL : ÉDITION ── */}
          <main className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            {!selectedQuestion ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">📝</div>
                <h2 className="text-xl font-bold text-slate-700 mb-2">Sélectionnez une question</h2>
                <p className="text-slate-500">Ou ajoutez-en une nouvelle depuis le menu de gauche.</p>
              </div>
            ) : (
              <EditeurQuestion
                key={selectedQuestion.id}
                question={selectedQuestion}
                onChangeEnonce={(v) => updateQuestion(selectedQuestion.id, { enonce: v })}
                onChangeType={(t) => {
                  // Changer le type réinitialise les choix par défaut côté client
                  // (le PATCH côté API enregistrera tel quel)
                  let defaults: Choix[] = [];
                  if (t === 'qcm') {
                    defaults = ['Choix 1','Choix 2','Choix 3','Choix 4'].map((l, i) => ({ id: `tmp-${i}`, ordre: i, libelle: l, est_correct: i === 0 }));
                  } else if (t === 'vrai_faux') {
                    defaults = [
                      { id: 'tmp-0', ordre: 0, libelle: 'Vrai', est_correct: true },
                      { id: 'tmp-1', ordre: 1, libelle: 'Faux', est_correct: false },
                    ];
                  } else {
                    defaults = ['Élément 1','Élément 2','Élément 3','Élément 4'].map((l, i) => ({ id: `tmp-${i}`, ordre: i, libelle: l, est_correct: false }));
                  }
                  updateQuestion(selectedQuestion.id, { type: t, choix: defaults });
                }}
                onChangeDuree={(v) => updateQuestion(selectedQuestion.id, { duree_secondes: v })}
                onChangePoints={(v) => updateQuestion(selectedQuestion.id, { points_base: v })}
                onChangeChoix={(idx, patch) => updateChoix(selectedQuestion.id, idx, patch)}
                onSetBonneReponse={(idx) => setBonneReponse(selectedQuestion.id, idx)}
                onMoveChoix={(idx, dir) => moveChoix(selectedQuestion.id, idx, dir)}
                onAddChoix={() => addChoix(selectedQuestion.id)}
                onRemoveChoix={(idx) => removeChoix(selectedQuestion.id, idx)}
                onSave={() => sauverQuestion(selectedQuestion)}
                saveStatus={saveStatus}
              />
            )}
          </main>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">×</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────── ÉDITEUR D'UNE QUESTION ───────────

function EditeurQuestion({
  question, onChangeEnonce, onChangeType, onChangeDuree, onChangePoints,
  onChangeChoix, onSetBonneReponse, onMoveChoix, onAddChoix, onRemoveChoix, onSave, saveStatus,
}: {
  question: Question;
  onChangeEnonce: (v: string) => void;
  onChangeType: (t: TypeQuestion) => void;
  onChangeDuree: (v: number) => void;
  onChangePoints: (v: number) => void;
  onChangeChoix: (idx: number, patch: Partial<Choix>) => void;
  onSetBonneReponse: (idx: number) => void;
  onMoveChoix: (idx: number, dir: -1 | 1) => void;
  onAddChoix: () => void;
  onRemoveChoix: (idx: number) => void;
  onSave: () => void;
  saveStatus: 'idle' | 'pending' | 'saved';
}) {
  return (
    <div className="space-y-6">
      {/* Type + paramètres */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-600">Type :</span>
        <div className="inline-flex bg-slate-100 rounded-lg p-1">
          {(Object.keys(TYPES_LABELS) as TypeQuestion[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => onChangeType(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                question.type === t ? 'bg-white shadow-sm text-primary-700' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{TYPES_LABELS[t].emoji}</span>
              <span>{TYPES_LABELS[t].label}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2">
            <span className="text-slate-600">Durée</span>
            <input
              type="number"
              min={5}
              max={120}
              step={5}
              value={question.duree_secondes}
              onChange={(e) => onChangeDuree(Number(e.target.value))}
              className="w-16 border border-slate-300 rounded px-2 py-1 text-center"
            />
            <span className="text-slate-500">s</span>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-slate-600">Points</span>
            <input
              type="number"
              min={100}
              max={2000}
              step={100}
              value={question.points_base}
              onChange={(e) => onChangePoints(Number(e.target.value))}
              className="w-20 border border-slate-300 rounded px-2 py-1 text-center"
            />
          </label>
        </div>
      </div>

      <p className="text-xs text-slate-500 -mt-3">{TYPES_LABELS[question.type].description}</p>

      {/* Énoncé */}
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1.5">Énoncé</label>
        <textarea
          value={question.enonce}
          onChange={(e) => onChangeEnonce(e.target.value)}
          rows={2}
          placeholder="Tapez votre question…"
          className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* Choix */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-600">
            {question.type === 'classement' ? 'Items dans le bon ordre' : 'Réponses'}
          </label>
          {question.type === 'classement' && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
              ⚠️ L'ordre saisi ici est l'ordre correct. Les items seront mélangés pour les participants.
            </span>
          )}
          {question.type !== 'classement' && question.type !== 'vrai_faux' && (
            <span className="text-xs text-slate-500">Cochez la bonne réponse</span>
          )}
        </div>
        <div className="space-y-2">
          {question.choix.map((c, idx) => {
            const couleur = COULEURS_CHOIX[idx % 4];
            return (
              <div
                key={idx}
                className={`flex items-center gap-3 rounded-xl border-2 ${
                  question.type !== 'classement' && c.est_correct
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-200 bg-white'
                } px-3 py-2`}
              >
                {question.type === 'classement' ? (
                  <span className="font-mono text-slate-400 w-6 text-center font-bold">{idx + 1}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSetBonneReponse(idx)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      c.est_correct
                        ? 'bg-emerald-500 text-white'
                        : 'border-2 border-slate-300 text-transparent hover:border-emerald-400'
                    }`}
                    title="Marquer comme bonne réponse"
                  >
                    ✓
                  </button>
                )}
                <span className={`w-7 h-7 ${couleur.bg} text-white rounded flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                  {couleur.forme}
                </span>
                <input
                  type="text"
                  value={c.libelle}
                  onChange={(e) => onChangeChoix(idx, { libelle: e.target.value })}
                  disabled={question.type === 'vrai_faux'}
                  placeholder={question.type === 'classement' ? `Élément ${idx + 1}` : `Choix ${idx + 1}`}
                  className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-800 disabled:text-slate-500"
                />
                {question.type === 'classement' && (
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => onMoveChoix(idx, -1)}
                      disabled={idx === 0}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-sm leading-none px-1"
                      title="Monter"
                    >▲</button>
                    <button
                      type="button"
                      onClick={() => onMoveChoix(idx, 1)}
                      disabled={idx === question.choix.length - 1}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-20 text-sm leading-none px-1"
                      title="Descendre"
                    >▼</button>
                  </div>
                )}
                {question.type !== 'vrai_faux' && (
                  <button
                    type="button"
                    onClick={() => onRemoveChoix(idx)}
                    disabled={question.choix.length <= 2}
                    className="text-slate-300 hover:text-red-500 disabled:opacity-20 disabled:cursor-not-allowed text-lg leading-none px-1 transition-colors"
                    title="Supprimer cette réponse"
                  >×</button>
                )}
              </div>
            );
          })}
        </div>
        {question.type !== 'vrai_faux' && question.choix.length < 6 && (
          <button
            type="button"
            onClick={onAddChoix}
            className="mt-2 w-full py-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-primary-400 hover:text-primary-600 text-sm font-medium transition-colors"
          >
            + Ajouter une réponse
          </button>
        )}
      </div>

      {/* Sauvegarder */}
      <div className="flex items-center justify-end pt-4 border-t border-slate-200">
        <button
          onClick={onSave}
          disabled={saveStatus === 'pending'}
          className={`px-6 py-2.5 rounded-lg font-semibold transition-all min-w-[200px] text-white ${
            saveStatus === 'saved'
              ? 'bg-emerald-500 scale-105'
              : 'bg-primary-600 hover:bg-primary-700 disabled:opacity-50'
          }`}
        >
          {saveStatus === 'pending' && '⏳ Enregistrement…'}
          {saveStatus === 'saved' && '✓ Enregistré !'}
          {saveStatus === 'idle' && '💾 Enregistrer'}
        </button>
      </div>
    </div>
  );
}
