'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const SMILEYS = ['😞', '😕', '😐', '😊', '😄'];

function genSessionId() {
  const key = 'questionnaire_session';
  let id = sessionStorage.getItem(key);
  if (!id) { id = Math.random().toString(36).slice(2); sessionStorage.setItem(key, id); }
  return id;
}

export default function RepondreQuestionnairePage() {
  const params = useParams();
  const id = params?.id as string;

  const [questionnaire, setQuestionnaire] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState('');
  const [reponses, setReponses] = useState<Record<string, any>>({});
  const [repondantNom, setRepondantNom] = useState('');
  const [soumis, setSoumis] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/questionnaires?id=${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setErreur(data.error); setLoading(false); return; }
        if (data.statut !== 'actif') { setErreur('Ce questionnaire n\'est pas disponible.'); setLoading(false); return; }
        const now = new Date();
        if (data.date_fin && new Date(data.date_fin) < now) { setErreur('Ce questionnaire est clôturé.'); setLoading(false); return; }
        if (data.date_debut && new Date(data.date_debut) > now) { setErreur('Ce questionnaire n\'est pas encore ouvert.'); setLoading(false); return; }
        setQuestionnaire(data);
        // Initialiser les réponses
        const init: Record<string, any> = {};
        data.questions.forEach((q: any) => {
          if (q.type === 'choix_multiple') init[q.id] = [];
          else if (q.type === 'satisfaction') init[q.id] = null;
          else if (q.type === 'classement') init[q.id] = [...(q.options || [])];
          else if (q.type === 'tableau') {
            const r: Record<string, string> = {};
            (q.config?.lignes || []).forEach((l: string) => { r[l] = ''; });
            init[q.id] = r;
          }
          else init[q.id] = '';
        });
        setReponses(init);
        setLoading(false);
      })
      .catch(() => { setErreur('Erreur de chargement.'); setLoading(false); });
  }, [id]);

  const majReponse = (questionId: string, valeur: any) => {
    setReponses(prev => ({ ...prev, [questionId]: valeur }));
  };

  const toggleChoixMultiple = (questionId: string, option: string) => {
    const current = reponses[questionId] || [];
    const updated = current.includes(option) ? current.filter((v: string) => v !== option) : [...current, option];
    majReponse(questionId, updated);
  };

  const monterClassement = (questionId: string, idx: number) => {
    if (idx === 0) return;
    const items = [...reponses[questionId]];
    [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
    majReponse(questionId, items);
  };

  const descendreClassement = (questionId: string, idx: number, max: number) => {
    if (idx === max - 1) return;
    const items = [...reponses[questionId]];
    [items[idx], items[idx + 1]] = [items[idx + 1], items[idx]];
    majReponse(questionId, items);
  };

  const valider = async () => {
    // Vérifier les questions obligatoires
    for (const q of questionnaire.questions) {
      if (!q.obligatoire) continue;
      const r = reponses[q.id];
      const vide = r === '' || r === null || r === undefined || (Array.isArray(r) && r.length === 0);
      if (vide) {
        setErreurEnvoi(`La question "${q.libelle}" est obligatoire.`);
        document.getElementById(`question-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    setEnvoi(true);
    setErreurEnvoi('');
    const res = await fetch('/api/questionnaires/soumissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionnaire_id: id,
        repondant_nom: repondantNom || null,
        session_id: genSessionId(),
        reponses
      })
    });
    const data = await res.json();
    setEnvoi(false);
    if (res.ok) {
      setSoumis(true);
    } else {
      setErreurEnvoi(data.error || 'Erreur lors de l\'envoi');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0] flex items-center justify-center">
      <div className="text-center text-white"><div className="text-6xl mb-4">⏳</div><p className="text-xl">Chargement...</p></div>
    </div>
  );

  if (erreur) return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0] flex items-center justify-center px-6">
      <div className="card text-center max-w-md w-full">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">{erreur}</h2>
        <Link href="/questionnaires" className="text-primary-600 hover:underline">← Retour aux questionnaires</Link>
      </div>
    </div>
  );

  if (soumis) return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0] flex items-center justify-center px-6">
      <div className="card text-center max-w-md w-full">
        <div className="text-7xl mb-6">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Merci pour votre réponse !</h2>
        <p className="text-gray-500 mb-6">Votre réponse a bien été enregistrée.</p>
        <Link href="/questionnaires" className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors inline-block">
          ← Retour aux questionnaires
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      {/* Header */}
      <div className="text-white py-12 px-6">
        <div className="container mx-auto max-w-2xl">
          <Link href="/questionnaires" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors">
            ← Tous les questionnaires
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl">📋</div>
            <div>
              <h1 className="text-3xl font-bold">{questionnaire.titre}</h1>
              {questionnaire.description && <p className="opacity-90 mt-1">{questionnaire.description}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-2xl">
        {/* Nom du répondant */}
        <div className="card mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Votre nom <span className="font-normal text-gray-400">(optionnel — laissez vide pour rester anonyme)</span>
          </label>
          <input type="text" value={repondantNom} onChange={e => setRepondantNom(e.target.value)}
            className="input-field w-full" placeholder="Prénom Nom..." />
        </div>

        {/* Questions */}
        <div className="space-y-5 mb-6">
          {questionnaire.questions.map((q: any, idx: number) => (
            <div key={q.id} id={`question-${q.id}`} className="card">
              <div className="mb-3">
                <p className="font-semibold text-gray-800">
                  <span className="text-primary-600 mr-2">{idx + 1}.</span>
                  {q.libelle}
                  {q.obligatoire && <span className="text-red-500 ml-1">*</span>}
                </p>
                {q.aide && <p className="text-sm text-gray-400 mt-1">{q.aide}</p>}
              </div>

              {/* Choix unique */}
              {q.type === 'choix_unique' && (
                <div className="space-y-2">
                  {(q.options || []).map((opt: string) => (
                    <label key={opt} className="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-primary-300 hover:bg-primary-50"
                      style={{ borderColor: reponses[q.id] === opt ? '#2c5f75' : '#e5e7eb', background: reponses[q.id] === opt ? '#f0f9ff' : '' }}>
                      <input type="radio" name={q.id} value={opt} checked={reponses[q.id] === opt}
                        onChange={() => majReponse(q.id, opt)} className="accent-primary-600 w-4 h-4" />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Choix multiple */}
              {q.type === 'choix_multiple' && (
                <div className="space-y-2">
                  {(q.options || []).map((opt: string) => (
                    <label key={opt} className="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-primary-300"
                      style={{ borderColor: (reponses[q.id] || []).includes(opt) ? '#2c5f75' : '#e5e7eb', background: (reponses[q.id] || []).includes(opt) ? '#f0f9ff' : '' }}>
                      <input type="checkbox" checked={(reponses[q.id] || []).includes(opt)}
                        onChange={() => toggleChoixMultiple(q.id, opt)} className="accent-primary-600 w-4 h-4" />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Vrai / Faux */}
              {q.type === 'vrai_faux' && (
                <div className="flex gap-4">
                  {['Vrai', 'Faux'].map(v => (
                    <button key={v} onClick={() => majReponse(q.id, v)}
                      className={`flex-1 py-3 rounded-xl font-semibold border-2 transition-all ${reponses[q.id] === v ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300'}`}>
                      {v === 'Vrai' ? '✅ Vrai' : '❌ Faux'}
                    </button>
                  ))}
                </div>
              )}

              {/* Texte court */}
              {q.type === 'texte_court' && (
                <input type="text" value={reponses[q.id] || ''} onChange={e => majReponse(q.id, e.target.value)}
                  className="input-field w-full" placeholder="Votre réponse..." />
              )}

              {/* Texte long */}
              {q.type === 'texte_long' && (
                <textarea value={reponses[q.id] || ''} onChange={e => majReponse(q.id, e.target.value)}
                  className="input-field w-full" rows={4} placeholder="Votre réponse..." />
              )}

              {/* Menu déroulant */}
              {q.type === 'menu_deroulant' && (
                <select value={reponses[q.id] || ''} onChange={e => majReponse(q.id, e.target.value)} className="input-field w-full">
                  <option value="">Choisir une option...</option>
                  {(q.options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              )}

              {/* Échelle */}
              {q.type === 'echelle' && (
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: (q.config?.max || 5) - (q.config?.min || 1) + 1 }, (_, i) => i + (q.config?.min || 1)).map(n => (
                    <button key={n} onClick={() => majReponse(q.id, n)}
                      className={`w-12 h-12 rounded-xl font-bold border-2 transition-all ${reponses[q.id] === n ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-200 hover:border-primary-400'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              )}

              {/* Satisfaction */}
              {q.type === 'satisfaction' && (
                <div className="flex justify-between gap-2">
                  {SMILEYS.map((s, i) => (
                    <button key={i} onClick={() => majReponse(q.id, i + 1)}
                      className={`flex-1 py-3 rounded-xl text-2xl border-2 transition-all ${reponses[q.id] === i + 1 ? 'bg-primary-50 border-primary-500 scale-110' : 'bg-white border-gray-200 hover:border-primary-300'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Note */}
              {q.type === 'note' && (
                <div className="flex items-center gap-3">
                  <input type="number" value={reponses[q.id] || ''} onChange={e => majReponse(q.id, Number(e.target.value))}
                    min={0} max={q.config?.note_max || 10}
                    className="input-field w-24 text-center text-xl font-bold" placeholder="0" />
                  <span className="text-gray-500 font-semibold">/ {q.config?.note_max || 10}</span>
                </div>
              )}

              {/* Date — format français JJ/MM/AAAA */}
              {q.type === 'date' && (() => {
                const val = reponses[q.id] || '';
                const parts = val ? val.split('/') : ['', '', ''];
                const jour = parts[0] || '';
                const mois = parts[1] || '';
                const annee = parts[2] || '';
                const setDate = (j: string, m: string, a: string) => {
                  majReponse(q.id, `${j}/${m}/${a}`);
                };
                return (
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center">
                      <label className="text-xs text-gray-400 mb-1">Jour</label>
                      <input
                        type="number" min={1} max={31} value={jour}
                        onChange={e => setDate(e.target.value, mois, annee)}
                        className="input-field w-20 text-center"
                        placeholder="JJ"
                      />
                    </div>
                    <span className="text-gray-400 text-xl mt-4">/</span>
                    <div className="flex flex-col items-center">
                      <label className="text-xs text-gray-400 mb-1">Mois</label>
                      <input
                        type="number" min={1} max={12} value={mois}
                        onChange={e => setDate(jour, e.target.value, annee)}
                        className="input-field w-20 text-center"
                        placeholder="MM"
                      />
                    </div>
                    <span className="text-gray-400 text-xl mt-4">/</span>
                    <div className="flex flex-col items-center">
                      <label className="text-xs text-gray-400 mb-1">Année</label>
                      <input
                        type="number" min={2000} max={2100} value={annee}
                        onChange={e => setDate(jour, mois, e.target.value)}
                        className="input-field w-28 text-center"
                        placeholder="AAAA"
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Tableau */}
              {q.type === 'tableau' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left p-3 border border-gray-200 font-semibold text-gray-700"></th>
                        {(q.config?.colonnes || ['Oui', 'Non', 'Sans avis']).map((col: string) => (
                          <th key={col} className="text-center p-3 border border-gray-200 font-semibold text-gray-700">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(q.config?.lignes || []).map((ligne: string) => (
                        <tr key={ligne} className="hover:bg-gray-50">
                          <td className="p-3 border border-gray-200 font-medium text-gray-700">{ligne}</td>
                          {(q.config?.colonnes || ['Oui', 'Non', 'Sans avis']).map((col: string) => (
                            <td key={col} className="text-center p-3 border border-gray-200">
                              <input type="radio" name={`${q.id}-${ligne}`} value={col}
                                checked={(reponses[q.id] || {})[ligne] === col}
                                onChange={() => {
                                  const current = { ...(reponses[q.id] || {}) };
                                  current[ligne] = col;
                                  majReponse(q.id, current);
                                }}
                                className="accent-primary-600 w-4 h-4" />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Classement */}
              {q.type === 'classement' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 mb-3">Utilisez les flèches pour ordonner du plus important au moins important</p>
                  {(reponses[q.id] || q.options || []).map((item: string, itemIdx: number) => (
                    <div key={item} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <span className="w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold text-sm">{itemIdx + 1}</span>
                      <span className="flex-1 text-gray-700">{item}</span>
                      <div className="flex gap-1">
                        <button onClick={() => monterClassement(q.id, itemIdx)} disabled={itemIdx === 0}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 px-1">▲</button>
                        <button onClick={() => descendreClassement(q.id, itemIdx, (reponses[q.id] || q.options || []).length)}
                          disabled={itemIdx === (reponses[q.id] || q.options || []).length - 1}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 px-1">▼</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Erreur envoi */}
        {erreurEnvoi && (
          <div className="card mb-4 bg-red-50 border-2 border-red-200">
            <div className="flex items-center gap-3">
              <span className="text-2xl">❌</span>
              <p className="font-semibold text-red-800">{erreurEnvoi}</p>
            </div>
          </div>
        )}

        {/* Bouton envoi */}
        <button onClick={valider} disabled={envoi}
          className="w-full bg-primary-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-700 transition-colors disabled:opacity-50 shadow-lg mb-8">
          {envoi ? '⏳ Envoi en cours...' : '✅ Envoyer mes réponses'}
        </button>
      </div>

      <footer className="text-center py-8 text-white/80">
        <p className="text-sm">Développé par <strong>LOUIS Olivier</strong> © 2026</p>
      </footer>
    </div>
  );
}
