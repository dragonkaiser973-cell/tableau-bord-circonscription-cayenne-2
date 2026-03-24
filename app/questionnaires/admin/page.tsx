'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const COULEURS = ['#2c5f75', '#e97132', '#196b24', '#9c36b5', '#c0392b', '#1a7599', '#f39c12', '#27ae60'];

const TYPES_QUESTIONS = [
  { value: 'choix_unique', label: '⚪ Choix unique', icon: '⚪' },
  { value: 'choix_multiple', label: '☑️ Choix multiple', icon: '☑️' },
  { value: 'vrai_faux', label: '✅ Vrai / Faux', icon: '✅' },
  { value: 'texte_court', label: '✏️ Texte court', icon: '✏️' },
  { value: 'texte_long', label: '📝 Texte long', icon: '📝' },
  { value: 'menu_deroulant', label: '▾ Menu déroulant', icon: '▾' },
  { value: 'echelle', label: '⭐ Échelle de notation', icon: '⭐' },
  { value: 'satisfaction', label: '😊 Barre de satisfaction', icon: '😊' },
  { value: 'tableau', label: '📊 Tableau de choix', icon: '📊' },
  { value: 'classement', label: '🏆 Classement', icon: '🏆' },
  { value: 'note', label: '🔢 Note sur 10/20', icon: '🔢' },
  { value: 'date', label: '📅 Date', icon: '📅' },
];

const STATUT_CONFIG: Record<string, { label: string; color: string }> = {
  brouillon: { label: '📋 Brouillon', color: 'bg-gray-100 text-gray-700' },
  actif: { label: '✅ Actif', color: 'bg-green-100 text-green-700' },
  ferme: { label: '🔒 Fermé', color: 'bg-red-100 text-red-700' },
};

interface Question {
  id?: string;
  type: string;
  libelle: string;
  aide: string;
  obligatoire: boolean;
  options: string[];
  config: any;
}

interface Questionnaire {
  id: string;
  titre: string;
  description: string;
  statut: string;
  date_debut: string;
  date_fin: string;
  created_by: string;
  created_at: string;
  nb_reponses: number;
}

const questionVide = (): Question => ({
  type: 'choix_unique',
  libelle: '',
  aide: '',
  obligatoire: true,
  options: ['', ''],
  config: { min: 1, max: 5, note_max: 10, colonnes: ['Oui', 'Non', 'Sans avis'], lignes: ['Item 1', 'Item 2'] }
});

export default function QuestionnairesAdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Vue
  const [vue, setVue] = useState<'liste' | 'creer' | 'modifier' | 'resultats'>('liste');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Formulaire création/édition
  const [form, setForm] = useState({
    titre: '',
    description: '',
    statut: 'brouillon',
    date_debut: '',
    date_fin: '',
  });
  const [questions, setQuestions] = useState<Question[]>([questionVide()]);
  const [saving, setSaving] = useState(false);

  // Résultats
  const [resultats, setResultats] = useState<any>(null);
  const [loadingResultats, setLoadingResultats] = useState(false);

  // Export PDF
  const [showExportModal, setShowExportModal] = useState(false);
  const [questionsSelectionnees, setQuestionsSelectionnees] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');
    if (!token || role !== 'admin') {
      router.push('/');
      return;
    }
    setIsAdmin(true);
    chargerQuestionnaires();
  }, [router]);

  const token = () => localStorage.getItem('authToken') || '';

  const chargerQuestionnaires = async () => {
    setLoading(true);
    const res = await fetch('/api/questionnaires?admin=true', {
      headers: { 'Authorization': `Bearer ${token()}` }
    });
    if (res.ok) setQuestionnaires(await res.json());
    setLoading(false);
  };

  const ouvrirCreation = () => {
    setForm({ titre: '', description: '', statut: 'brouillon', date_debut: '', date_fin: '' });
    setQuestions([questionVide()]);
    setVue('creer');
  };

  const ouvrirModification = async (id: string) => {
    const res = await fetch(`/api/questionnaires?id=${id}`, {
      headers: { 'Authorization': `Bearer ${token()}` }
    });
    if (!res.ok) return;
    const data = await res.json();
    setForm({
      titre: data.titre,
      description: data.description || '',
      statut: data.statut,
      date_debut: data.date_debut ? data.date_debut.slice(0, 16) : '',
      date_fin: data.date_fin ? data.date_fin.slice(0, 16) : '',
    });
    setQuestions(data.questions.map((q: any) => ({
      id: q.id,
      type: q.type,
      libelle: q.libelle,
      aide: q.aide || '',
      obligatoire: q.obligatoire,
      options: q.options || ['', ''],
      config: q.config || {}
    })));
    setSelectedId(id);
    setVue('modifier');
  };

  const ouvrirResultats = async (id: string) => {
    setSelectedId(id);
    setVue('resultats');
    setLoadingResultats(true);
    const [qRes, rRes] = await Promise.all([
      fetch(`/api/questionnaires?id=${id}`, { headers: { 'Authorization': `Bearer ${token()}` } }),
      fetch(`/api/questionnaires/soumissions?questionnaire_id=${id}`, { headers: { 'Authorization': `Bearer ${token()}` } })
    ]);
    const questionnaire = await qRes.json();
    const data = await rRes.json();
    setResultats({ questionnaire, ...data });
    setLoadingResultats(false);
  };

  const sauvegarder = async () => {
    if (!form.titre.trim()) {
      setMessage({ type: 'error', text: 'Le titre est obligatoire' });
      return;
    }
    if (questions.some(q => !q.libelle.trim())) {
      setMessage({ type: 'error', text: 'Toutes les questions doivent avoir un libellé' });
      return;
    }

    setSaving(true);
    const payload = { ...form, questions, ...(vue === 'modifier' ? { id: selectedId } : {}) };
    const res = await fetch('/api/questionnaires', {
      method: vue === 'modifier' ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    setSaving(false);

    if (res.ok) {
      setMessage({ type: 'success', text: vue === 'modifier' ? 'Questionnaire modifié' : 'Questionnaire créé' });
      chargerQuestionnaires();
      setVue('liste');
    } else {
      setMessage({ type: 'error', text: data.error || 'Erreur lors de la sauvegarde' });
    }
  };

  const changerStatut = async (id: string, statut: string) => {
    const q = questionnaires.find(q => q.id === id);
    if (!q) return;
    await fetch('/api/questionnaires', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` },
      body: JSON.stringify({ id, titre: q.titre, description: q.description, statut, date_debut: q.date_debut, date_fin: q.date_fin })
    });
    chargerQuestionnaires();
  };

  const supprimer = async (id: string) => {
    if (!confirm('Supprimer ce questionnaire et toutes ses réponses ? Cette action est irréversible.')) return;
    await fetch(`/api/questionnaires?id=${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token()}` }
    });
    setMessage({ type: 'success', text: 'Questionnaire supprimé' });
    chargerQuestionnaires();
  };

  const ajouterQuestion = () => setQuestions([...questions, questionVide()]);
  const supprimerQuestion = (idx: number) => setQuestions(questions.filter((_, i) => i !== idx));
  const monterQuestion = (idx: number) => {
    if (idx === 0) return;
    const q = [...questions];
    [q[idx - 1], q[idx]] = [q[idx], q[idx - 1]];
    setQuestions(q);
  };
  const descendreQuestion = (idx: number) => {
    if (idx === questions.length - 1) return;
    const q = [...questions];
    [q[idx], q[idx + 1]] = [q[idx + 1], q[idx]];
    setQuestions(q);
  };

  const majQuestion = (idx: number, champ: string, valeur: any) => {
    const q = [...questions];
    (q[idx] as any)[champ] = valeur;
    setQuestions(q);
  };

  const ajouterOption = (idx: number) => {
    const q = [...questions];
    q[idx].options = [...q[idx].options, ''];
    setQuestions(q);
  };

  const majOption = (qIdx: number, oIdx: number, valeur: string) => {
    const q = [...questions];
    q[qIdx].options[oIdx] = valeur;
    setQuestions(q);
  };

  const supprimerOption = (qIdx: number, oIdx: number) => {
    const q = [...questions];
    q[qIdx].options = q[qIdx].options.filter((_, i) => i !== oIdx);
    setQuestions(q);
  };

  const ouvrirExport = () => {
    // Présélectionner toutes les questions
    const ids = new Set((resultats?.questionnaire?.questions || []).map((q: any) => q.id));
    setQuestionsSelectionnees(ids as Set<string>);
    setShowExportModal(true);
  };

  const toggleQuestion = (id: string) => {
    setQuestionsSelectionnees(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const lancerExport = () => {
    setShowExportModal(false);
    setTimeout(() => window.print(), 300);
  };

  const copierLien = (id: string) => {
    // Utiliser l'URL de production pour éviter les liens de prévisualisation Vercel
    const origin = window.location.hostname.includes('vercel.app') && window.location.hostname.includes('-')
      ? 'https://circonscription-cayenne2.vercel.app'
      : window.location.origin;
    navigator.clipboard.writeText(`${origin}/questionnaires/${id}`);
    setMessage({ type: 'success', text: 'Lien copié dans le presse-papiers !' });
  };

  // ── Calcul des résultats ────────────────────────────────────────
  const calculerResultats = (question: any) => {
    if (!resultats) return null;
    const reponsesQuestion = resultats.reponses.filter((r: any) => r.question_id === question.id);
    const valeurs = reponsesQuestion.map((r: any) => {
      try { return JSON.parse(r.valeur); } catch { return r.valeur; }
    });

    if (['choix_unique', 'vrai_faux', 'menu_deroulant'].includes(question.type)) {
      const counts: Record<string, number> = {};
      valeurs.forEach((v: string) => { if (v) counts[v] = (counts[v] || 0) + 1; });
      return { type: 'camembert', data: counts, total: valeurs.length };
    }
    if (question.type === 'choix_multiple') {
      const counts: Record<string, number> = {};
      valeurs.forEach((v: string[]) => { (v || []).forEach(item => { counts[item] = (counts[item] || 0) + 1; }); });
      return { type: 'barres', data: counts, total: valeurs.length };
    }
    if (['echelle', 'note'].includes(question.type)) {
      const nums = valeurs.filter((v: any) => v !== null && v !== '').map(Number);
      const moyenne = nums.length > 0 ? (nums.reduce((a: number, b: number) => a + b, 0) / nums.length).toFixed(1) : '-';
      const counts: Record<string, number> = {};
      nums.forEach((v: number) => { counts[String(v)] = (counts[String(v)] || 0) + 1; });
      return { type: 'barres_note', moyenne, data: counts, total: nums.length };
    }
    if (question.type === 'satisfaction') {
      const SMILEYS_LABELS = ['😞 Très insatisfait', '😕 Insatisfait', '😐 Neutre', '😊 Satisfait', '😄 Très satisfait'];
      const nums = valeurs.filter((v: any) => v !== null && v !== '').map(Number);
      const counts: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
      nums.forEach((v: number) => { if (v >= 1 && v <= 5) counts[String(v)] = (counts[String(v)] || 0) + 1; });
      const max = Math.max(...Object.values(counts));
      return { type: 'satisfaction', data: counts, labels: SMILEYS_LABELS, total: nums.length, max };
    }
    if (['texte_court', 'texte_long', 'date'].includes(question.type)) {
      return { type: 'textes', textes: valeurs.filter(Boolean), total: valeurs.length };
    }
    if (question.type === 'tableau') {
      return { type: 'tableau', data: valeurs, total: valeurs.length };
    }
    if (question.type === 'classement') {
      const scores: Record<string, number> = {};
      valeurs.forEach((v: string[]) => {
        (v || []).forEach((item, idx) => {
          scores[item] = (scores[item] || 0) + (v.length - idx);
        });
      });
      // Trier par score décroissant
      const sorted = Object.fromEntries(
        Object.entries(scores).sort(([,a],[,b]) => b - a)
      );
      return { type: 'barres_h', data: sorted, total: valeurs.length };
    }
    return null;
  };

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      {/* Header */}
      <div className="text-white py-12 px-6">
        <div className="container mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/" className="text-white/90 hover:text-white transition-colors">← Retour à l&apos;accueil</Link>
            {vue !== 'liste' && (
              <>
                <span className="text-white/40">/</span>
                <button onClick={() => setVue('liste')} className="text-white/90 hover:text-white transition-colors">
                  Questionnaires
                </button>
              </>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">📋</div>
              <div>
                <h1 className="text-4xl font-bold">
                  {vue === 'liste' && 'Questionnaires'}
                  {vue === 'creer' && 'Nouveau questionnaire'}
                  {vue === 'modifier' && 'Modifier le questionnaire'}
                  {vue === 'resultats' && 'Résultats'}
                </h1>
                <p className="text-xl opacity-90 mt-1">Administration</p>
              </div>
            </div>
            {vue === 'liste' && (
              <button onClick={ouvrirCreation} className="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors shadow-lg">
                ➕ Nouveau questionnaire
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Message */}
        {message && (
          <div className={`card mb-6 ${message.type === 'success' ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{message.type === 'success' ? '✅' : '❌'}</span>
                <p className={`font-semibold ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{message.text}</p>
              </div>
              <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
          </div>
        )}

        {/* ── LISTE ── */}
        {vue === 'liste' && (
          <div className="card mb-8">
            {questionnaires.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold mb-2">Aucun questionnaire</h3>
                <p>Créez votre premier questionnaire en cliquant sur le bouton ci-dessus.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questionnaires.map(q => (
                  <div key={q.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-800">{q.titre}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUT_CONFIG[q.statut]?.color}`}>
                            {STATUT_CONFIG[q.statut]?.label}
                          </span>
                        </div>
                        {q.description && <p className="text-gray-500 text-sm mb-2">{q.description}</p>}
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>👥 {q.nb_reponses} réponse{q.nb_reponses !== 1 ? 's' : ''}</span>
                          <span>📅 {new Date(q.created_at).toLocaleDateString('fr-FR')}</span>
                          {q.date_fin && <span>⏰ Jusqu&apos;au {new Date(q.date_fin).toLocaleDateString('fr-FR')}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => copierLien(q.id)} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                          🔗 Lien
                        </button>
                        <button onClick={() => ouvrirResultats(q.id)} className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm hover:bg-blue-200 transition-colors">
                          📊 Résultats
                        </button>
                        {q.statut === 'brouillon' && (
                          <button onClick={() => changerStatut(q.id, 'actif')} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm hover:bg-green-200 transition-colors">
                            ▶ Activer
                          </button>
                        )}
                        {q.statut === 'actif' && (
                          <button onClick={() => changerStatut(q.id, 'ferme')} className="bg-orange-100 text-orange-700 px-3 py-1.5 rounded-lg text-sm hover:bg-orange-200 transition-colors">
                            🔒 Fermer
                          </button>
                        )}
                        {q.statut === 'ferme' && (
                          <button onClick={() => changerStatut(q.id, 'actif')} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm hover:bg-green-200 transition-colors">
                            🔓 Rouvrir
                          </button>
                        )}
                        <button onClick={() => ouvrirModification(q.id)} className="bg-primary-100 text-primary-700 px-3 py-1.5 rounded-lg text-sm hover:bg-primary-200 transition-colors">
                          ✏️ Modifier
                        </button>
                        <button onClick={() => supprimer(q.id)} className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm hover:bg-red-200 transition-colors">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CRÉER / MODIFIER ── */}
        {(vue === 'creer' || vue === 'modifier') && (
          <div className="space-y-6">
            {/* Infos générales */}
            <div className="card">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📝 Informations générales</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Titre *</label>
                  <input type="text" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })}
                    className="input-field w-full" placeholder="Titre du questionnaire" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    className="input-field w-full" rows={3} placeholder="Description ou instructions pour les répondants..." />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Statut</label>
                    <select value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })} className="input-field w-full">
                      <option value="brouillon">📋 Brouillon</option>
                      <option value="actif">✅ Actif</option>
                      <option value="ferme">🔒 Fermé</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Date d&apos;ouverture</label>
                    <input type="datetime-local" value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} className="input-field w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Date de clôture</label>
                    <input type="datetime-local" value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })} className="input-field w-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">❓ Questions ({questions.length})</h2>
                <button onClick={ajouterQuestion} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors">
                  ➕ Ajouter une question
                </button>
              </div>

              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div key={idx} className="border-2 border-gray-200 rounded-xl p-5 bg-gray-50">
                    {/* En-tête question */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="bg-primary-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">{idx + 1}</span>
                      <div className="flex gap-2">
                        <button onClick={() => monterQuestion(idx)} disabled={idx === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 px-2">▲</button>
                        <button onClick={() => descendreQuestion(idx)} disabled={idx === questions.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 px-2">▼</button>
                        <button onClick={() => supprimerQuestion(idx)} className="text-red-400 hover:text-red-600 px-2">🗑️</button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Type de question</label>
                        <select value={q.type} onChange={e => majQuestion(idx, 'type', e.target.value)} className="input-field w-full">
                          {TYPES_QUESTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-4 pt-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={q.obligatoire} onChange={e => majQuestion(idx, 'obligatoire', e.target.checked)} className="w-4 h-4 accent-primary-600" />
                          <span className="text-sm font-semibold text-gray-700">Obligatoire</span>
                        </label>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Libellé *</label>
                      <input type="text" value={q.libelle} onChange={e => majQuestion(idx, 'libelle', e.target.value)}
                        className="input-field w-full" placeholder="Votre question..." />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Texte d&apos;aide (optionnel)</label>
                      <input type="text" value={q.aide} onChange={e => majQuestion(idx, 'aide', e.target.value)}
                        className="input-field w-full" placeholder="Précision ou aide pour le répondant..." />
                    </div>

                    {/* Options selon le type */}
                    {['choix_unique', 'choix_multiple', 'menu_deroulant', 'classement'].includes(q.type) && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Options</label>
                        <div className="space-y-2">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="flex gap-2">
                              <input type="text" value={opt} onChange={e => majOption(idx, oIdx, e.target.value)}
                                className="input-field flex-1" placeholder={`Option ${oIdx + 1}`} />
                              <button onClick={() => supprimerOption(idx, oIdx)} disabled={q.options.length <= 2}
                                className="text-red-400 hover:text-red-600 disabled:opacity-30 px-2">✕</button>
                            </div>
                          ))}
                          <button onClick={() => ajouterOption(idx)} className="text-primary-600 hover:text-primary-700 text-sm font-semibold">
                            ➕ Ajouter une option
                          </button>
                        </div>
                      </div>
                    )}

                    {q.type === 'echelle' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Min</label>
                          <input type="number" value={q.config?.min ?? 1} onChange={e => majQuestion(idx, 'config', { ...q.config, min: Number(e.target.value) })}
                            className="input-field w-full" min={1} max={10} />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Max</label>
                          <input type="number" value={q.config?.max ?? 5} onChange={e => majQuestion(idx, 'config', { ...q.config, max: Number(e.target.value) })}
                            className="input-field w-full" min={2} max={10} />
                        </div>
                      </div>
                    )}

                    {q.type === 'note' && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Note sur</label>
                        <select value={q.config?.note_max ?? 10} onChange={e => majQuestion(idx, 'config', { ...q.config, note_max: Number(e.target.value) })}
                          className="input-field w-full">
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                        </select>
                      </div>
                    )}

                    {q.type === 'tableau' && (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Lignes (items)</label>
                          <div className="space-y-2">
                            {(q.config?.lignes || ['Item 1', 'Item 2']).map((ligne: string, lIdx: number) => (
                              <div key={lIdx} className="flex gap-2">
                                <input type="text" value={ligne}
                                  onChange={e => {
                                    const lignes = [...(q.config?.lignes || [])];
                                    lignes[lIdx] = e.target.value;
                                    majQuestion(idx, 'config', { ...q.config, lignes });
                                  }}
                                  className="input-field flex-1" placeholder={`Ligne ${lIdx + 1}`} />
                                <button onClick={() => {
                                  const lignes = (q.config?.lignes || []).filter((_: any, i: number) => i !== lIdx);
                                  majQuestion(idx, 'config', { ...q.config, lignes });
                                }} className="text-red-400 hover:text-red-600 px-2">✕</button>
                              </div>
                            ))}
                            <button onClick={() => majQuestion(idx, 'config', { ...q.config, lignes: [...(q.config?.lignes || []), ''] })}
                              className="text-primary-600 text-sm font-semibold">➕ Ligne</button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Colonnes (choix)</label>
                          <div className="space-y-2">
                            {(q.config?.colonnes || ['Oui', 'Non', 'Sans avis']).map((col: string, cIdx: number) => (
                              <div key={cIdx} className="flex gap-2">
                                <input type="text" value={col}
                                  onChange={e => {
                                    const colonnes = [...(q.config?.colonnes || [])];
                                    colonnes[cIdx] = e.target.value;
                                    majQuestion(idx, 'config', { ...q.config, colonnes });
                                  }}
                                  className="input-field flex-1" placeholder={`Colonne ${cIdx + 1}`} />
                                <button onClick={() => {
                                  const colonnes = (q.config?.colonnes || []).filter((_: any, i: number) => i !== cIdx);
                                  majQuestion(idx, 'config', { ...q.config, colonnes });
                                }} className="text-red-400 hover:text-red-600 px-2">✕</button>
                              </div>
                            ))}
                            <button onClick={() => majQuestion(idx, 'config', { ...q.config, colonnes: [...(q.config?.colonnes || []), ''] })}
                              className="text-primary-600 text-sm font-semibold">➕ Colonne</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pb-8">
              <button onClick={() => setVue('liste')} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
                Annuler
              </button>
              <button onClick={sauvegarder} disabled={saving} className="flex-1 bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50">
                {saving ? '⏳ Enregistrement...' : '💾 Enregistrer'}
              </button>
            </div>
          </div>
        )}

        {/* ── RÉSULTATS ── */}
        {vue === 'resultats' && (
          <div>
            {loadingResultats ? (
              <div className="card text-center py-16">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-gray-500">Chargement des résultats...</p>
              </div>
            ) : resultats ? (
              <div className="space-y-6">
                {/* Stats globales */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-800">{resultats.questionnaire.titre}</h2>
                    {resultats.soumissions.length > 0 && (
                      <button
                        onClick={ouvrirExport}
                        className="bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center gap-2"
                      >
                        📥 Exporter PDF
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-primary-50 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-primary-600">{resultats.soumissions.length}</div>
                      <div className="text-sm text-gray-500 mt-1">Répondants</div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-green-600">{resultats.questionnaire.questions?.length || 0}</div>
                      <div className="text-sm text-gray-500 mt-1">Questions</div>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {resultats.soumissions.length > 0
                          ? new Date(resultats.soumissions[resultats.soumissions.length - 1].created_at).toLocaleDateString('fr-FR')
                          : '-'}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">1ère réponse</div>
                    </div>
                  </div>
                </div>

                {/* Résultats par question */}
                {resultats.soumissions.length === 0 ? (
                  <div className="card text-center py-12 text-gray-400">
                    <div className="text-5xl mb-4">📭</div>
                    <p className="text-lg">Aucune réponse pour l&apos;instant.</p>
                  </div>
                ) : (
                  (resultats.questionnaire.questions || []).map((question: any, idx: number) => {
                    const res = calculerResultats(question);
                    if (!res) return null;
                    return (
                      <div
                        key={question.id}
                        className="card"
                        data-export-id={question.id}
                        style={{ display: showExportModal ? (questionsSelectionnees.has(question.id) ? '' : 'none') : '' }}
                      >
                        <h3 className="font-bold text-gray-800 mb-1">
                          <span className="text-primary-600 mr-2">{idx + 1}.</span>{question.libelle}
                        </h3>
                        <p className="text-sm text-gray-400 mb-4">{res.total} réponse{res.total !== 1 ? 's' : ''}</p>

                        {/* Camembert — choix unique, vrai/faux, menu déroulant */}
                        {res.type === 'camembert' && (
                          <div className="flex flex-col items-center gap-4">
                            <div style={{ maxWidth: 380, width: '100%' }}>
                              <Pie
                                data={{
                                  labels: Object.keys(res.data),
                                  datasets: [{ data: Object.values(res.data), backgroundColor: COULEURS, borderWidth: 2, borderColor: '#fff' }]
                                }}
                                options={{
                                  plugins: {
                                    legend: { position: 'bottom', labels: { padding: 16, font: { size: 13 } } },
                                    tooltip: { callbacks: { label: (ctx: any) => `${ctx.label} : ${ctx.parsed} (${res.total > 0 ? Math.round((ctx.parsed / res.total) * 100) : 0}%)` } }
                                  }
                                }}
                              />
                            </div>
                            <div className="w-full max-w-sm space-y-2">
                              {Object.entries(res.data).map(([label, count]: [string, any], i) => {
                                const pct = res.total > 0 ? Math.round((count / res.total) * 100) : 0;
                                return (
                                  <div key={label} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COULEURS[i % COULEURS.length] }} />
                                      <span className="text-gray-700">{label}</span>
                                    </div>
                                    <span className="font-semibold text-gray-600 ml-4">{count} ({pct}%)</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Barres verticales — choix multiple */}
                        {res.type === 'barres' && (
                          <div style={{ maxWidth: 480, margin: '0 auto' }}>
                            <Bar
                              data={{
                                labels: Object.keys(res.data),
                                datasets: [{ label: 'Réponses', data: Object.values(res.data), backgroundColor: COULEURS, borderRadius: 6 }]
                              }}
                              options={{ responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }}
                            />
                          </div>
                        )}

                        {/* Barres verticales + moyenne — échelle, note */}
                        {res.type === 'barres_note' && (() => {
                          const sortedKeys = Object.keys(res.data).sort((a, b) => Number(a) - Number(b));
                          const sortedVals = sortedKeys.map(k => (res.data as any)[k]);
                          const maxVal = Math.max(...sortedVals);
                          const total = sortedKeys.length;
                          // Dégradé froid → chaud selon la position relative de chaque valeur
                          const bgColors = sortedKeys.map((_, i) => {
                            const ratio = total > 1 ? i / (total - 1) : 0.5;
                            if (ratio < 0.25) return '#156082';
                            if (ratio < 0.5)  return '#1a7599';
                            if (ratio < 0.75) return '#e97132';
                            return '#196b24';
                          });
                          // Mettre en évidence la valeur dominante
                          const dominantIdx = sortedVals.indexOf(maxVal);
                          const finalColors = bgColors.map((c, i) => i === dominantIdx && maxVal > 0 ? c : c + '99');
                          return (
                            <div>
                              <div className="text-center mb-4">
                                <span className="text-5xl font-bold text-primary-600">{res.moyenne}</span>
                                <span className="text-2xl text-gray-400 ml-2">/ {question.config?.max || question.config?.note_max || 5}</span>
                                <p className="text-sm text-gray-400 mt-1">Moyenne sur {res.total} réponse{res.total !== 1 ? 's' : ''}</p>
                              </div>
                              <div style={{ maxWidth: 480, margin: '0 auto' }}>
                                <Bar
                                  data={{
                                    labels: sortedKeys.map((k, i) => i === dominantIdx && maxVal > 0 ? `${k} ⭐` : k),
                                    datasets: [{ label: 'Nombre de réponses', data: sortedVals, backgroundColor: finalColors, borderRadius: 6 }]
                                  }}
                                  options={{ responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: any) => `${ctx.parsed.y} réponse${ctx.parsed.y !== 1 ? 's' : ''} (${res.total > 0 ? Math.round((ctx.parsed.y / res.total) * 100) : 0}%)` } } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }}
                                />
                              </div>
                            </div>
                          );
                        })()}

                        {/* Barres horizontales — classement */}
                        {res.type === 'barres_h' && (
                          <div style={{ maxWidth: 480, margin: '0 auto' }}>
                            <Bar
                              data={{
                                labels: Object.keys(res.data),
                                datasets: [{ label: 'Score', data: Object.values(res.data), backgroundColor: COULEURS, borderRadius: 6 }]
                              }}
                              options={{ indexAxis: 'y' as const, responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }}
                            />
                          </div>
                        )}

                        {/* Satisfaction — smileys avec barres */}
                        {res.type === 'satisfaction' && (
                          <div className="space-y-3">
                            {(['1','2','3','4','5'] as const).map((val, i) => {
                              const count = (res.data as any)[val] || 0;
                              const pct = res.total > 0 ? Math.round((count / res.total) * 100) : 0;
                              const isMax = count === res.max && count > 0;
                              const smileys = ['😞','😕','😐','😊','😄'];
                              const labels = ['Très insatisfait','Insatisfait','Neutre','Satisfait','Très satisfait'];
                              const colors = ['#c0392b','#e97132','#f39c12','#196b24','#2c5f75'];
                              return (
                                <div key={val} className={`flex items-center gap-4 p-3 rounded-xl border-2 transition-all ${isMax ? 'border-primary-400 bg-primary-50' : 'border-gray-100 bg-white'}`}>
                                  <span className="text-3xl flex-shrink-0">{smileys[i]}</span>
                                  <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className={`text-sm font-semibold ${isMax ? 'text-primary-700' : 'text-gray-600'}`}>
                                        {labels[i]}
                                        {isMax && <span className="ml-2 text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">⭐ Dominant</span>}
                                      </span>
                                      <span className="text-sm font-bold text-gray-700">{count} <span className="font-normal text-gray-400">({pct}%)</span></span>
                                    </div>
                                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${pct}%`, background: colors[i] }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Textes libres */}
                        {res.type === 'textes' && (
                          <div className="space-y-2">
                            {res.textes.length === 0 ? (
                              <p className="text-gray-400 italic text-sm">Aucune réponse textuelle.</p>
                            ) : res.textes.map((t: string, i: number) => (
                              <div key={i} className="bg-gray-50 rounded-lg p-3 text-gray-700 text-sm border-l-4 border-primary-300">
                                {t}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Tableau de choix */}
                        {res.type === 'tableau' && res.data.length > 0 && (() => {
                          const lignes = question.config?.lignes || [];
                          const colonnes = question.config?.colonnes || [];
                          const counts: Record<string, Record<string, number>> = {};
                          lignes.forEach((l: string) => { counts[l] = {}; colonnes.forEach((c: string) => { counts[l][c] = 0; }); });
                          res.data.forEach((r: any) => { if (r) Object.entries(r).forEach(([l, c]: [string, any]) => { if (counts[l] && counts[l][c] !== undefined) counts[l][c]++; }); });
                          return (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm border-collapse">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="text-left p-3 border border-gray-200 font-semibold"></th>
                                    {colonnes.map((c: string) => <th key={c} className="text-center p-3 border border-gray-200 font-semibold text-primary-700">{c}</th>)}
                                  </tr>
                                </thead>
                                <tbody>
                                  {lignes.map((l: string) => (
                                    <tr key={l} className="hover:bg-gray-50">
                                      <td className="p-3 border border-gray-200 font-medium">{l}</td>
                                      {colonnes.map((c: string) => {
                                        const n = counts[l]?.[c] || 0;
                                        const pct = res.total > 0 ? Math.round((n / res.total) * 100) : 0;
                                        return (
                                          <td key={c} className="text-center p-3 border border-gray-200">
                                            <div className="font-bold text-primary-600">{n}</div>
                                            <div className="text-xs text-gray-400">{pct}%</div>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })
                )}

                {/* Liste des répondants */}
                {resultats.soumissions.length > 0 && (
                  <div className="card mb-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">👥 Liste des répondants</h3>
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Nom</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultats.soumissions.map((s: any, i: number) => (
                            <tr key={s.id}>
                              <td>{i + 1}</td>
                              <td>{s.repondant_nom || <span className="text-gray-400 italic">Anonyme</span>}</td>
                              <td className="text-sm text-gray-500">{new Date(s.created_at).toLocaleString('fr-FR')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <footer className="text-center py-8 text-white/80">
        <p className="text-sm">Développé par <strong>LOUIS Olivier</strong> © 2026</p>
      </footer>

      {/* Modal export PDF */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-800">📥 Exporter en PDF</h3>
              <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <p className="text-sm text-gray-500 mb-4">Sélectionnez les questions à inclure dans l&apos;export :</p>

            {/* Tout sélectionner / désélectionner */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setQuestionsSelectionnees(new Set((resultats?.questionnaire?.questions || []).map((q: any) => q.id)))}
                className="text-sm text-primary-600 hover:underline font-semibold"
              >
                ✅ Tout sélectionner
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => setQuestionsSelectionnees(new Set())}
                className="text-sm text-gray-400 hover:underline"
              >
                ☐ Tout désélectionner
              </button>
            </div>

            {/* Liste des questions */}
            <div className="space-y-2 max-h-72 overflow-y-auto mb-6 border border-gray-100 rounded-xl p-3">
              {(resultats?.questionnaire?.questions || []).map((q: any, idx: number) => (
                <label key={q.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={questionsSelectionnees.has(q.id)}
                    onChange={() => toggleQuestion(q.id)}
                    className="mt-0.5 w-4 h-4 accent-primary-600 flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold text-primary-600 mr-1">{idx + 1}.</span>
                    {q.libelle}
                    <span className="ml-2 text-xs text-gray-400">({TYPES_QUESTIONS.find(t => t.value === q.type)?.label || q.type})</span>
                  </span>
                </label>
              ))}
            </div>

            {/* Infos stats */}
            <div className="bg-gray-50 rounded-xl p-3 mb-5 text-sm text-gray-600">
              <p>📋 <strong>{questionsSelectionnees.size}</strong> question{questionsSelectionnees.size !== 1 ? 's' : ''} sélectionnée{questionsSelectionnees.size !== 1 ? 's' : ''}</p>
              <p>👥 <strong>{resultats?.soumissions?.length || 0}</strong> répondant{(resultats?.soumissions?.length || 0) !== 1 ? 's' : ''} inclus</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={lancerExport}
                disabled={questionsSelectionnees.size === 0}
                className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-40"
              >
                🖨️ Imprimer / Enregistrer PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styles impression */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-zone { display: block !important; }
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
