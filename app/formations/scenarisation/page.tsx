'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import PDFExportModal from '@/components/PDFExportModal';
import { exportMultipleElementsToPDF, PDFElement, PDFExportOptions } from '@/lib/pdfExport';
import { exportStyledExcel, ExcelSheetDef } from '@/lib/excelExport';

// ─── Types ABC Learning Design ───────────────────────────────────────────────

type LearningType =
  | 'acquisition'
  | 'investigation'
  | 'practice'
  | 'discussion'
  | 'collaboration'
  | 'production';

interface TypeMeta {
  label: string;
  short: string;
  icon: string;
  color: string;           // tailwind bg shade
  gradient: string;        // gradient class
  ring: string;
  text: string;
  hex: string;
  description: string;
  examples: string[];
}

const TYPES: Record<LearningType, TypeMeta> = {
  acquisition: {
    label: 'Acquisition',
    short: 'Lire · Écouter · Regarder',
    icon: '📘',
    color: 'bg-blue-500',
    gradient: 'from-blue-500 to-blue-600',
    ring: 'ring-blue-200',
    text: 'text-blue-700',
    hex: '#3b82f6',
    description: "L'apprenant reçoit de l'information (exposé, vidéo, lecture).",
    examples: ['Exposé du formateur', 'Vidéo pédagogique', 'Lecture de textes officiels', 'Démonstration'],
  },
  investigation: {
    label: 'Investigation',
    short: 'Explorer · Comparer',
    icon: '🔍',
    color: 'bg-amber-500',
    gradient: 'from-amber-500 to-orange-500',
    ring: 'ring-amber-200',
    text: 'text-amber-700',
    hex: '#f59e0b',
    description: "L'apprenant explore des ressources, compare, questionne.",
    examples: ['Étude de cas', 'Recherche documentaire', 'Analyse de pratiques', 'Observation croisée'],
  },
  practice: {
    label: 'Pratique',
    short: 'Faire · S\'exercer',
    icon: '💪',
    color: 'bg-emerald-500',
    gradient: 'from-emerald-500 to-green-600',
    ring: 'ring-emerald-200',
    text: 'text-emerald-700',
    hex: '#10b981',
    description: "L'apprenant agit, s'exerce, reçoit un feedback pour progresser.",
    examples: ['Mise en situation', 'Exercice guidé', 'Simulation de séance', 'Manipulation de matériel'],
  },
  discussion: {
    label: 'Discussion',
    short: 'Échanger · Débattre',
    icon: '💬',
    color: 'bg-violet-500',
    gradient: 'from-violet-500 to-purple-600',
    ring: 'ring-violet-200',
    text: 'text-violet-700',
    hex: '#8b5cf6',
    description: "Les apprenants articulent leurs idées, confrontent leurs points de vue.",
    examples: ['Débat argumenté', 'Table ronde', 'Forum', 'Partage d\'expériences'],
  },
  collaboration: {
    label: 'Collaboration',
    short: 'Co-construire',
    icon: '🤝',
    color: 'bg-pink-500',
    gradient: 'from-pink-500 to-rose-500',
    ring: 'ring-pink-200',
    text: 'text-pink-700',
    hex: '#ec4899',
    description: "Les apprenants construisent ensemble un savoir ou une production.",
    examples: ['Atelier coopératif', 'Projet d\'équipe', 'Groupe de travail', 'Résolution collective'],
  },
  production: {
    label: 'Production',
    short: 'Créer · Livrer',
    icon: '🎨',
    color: 'bg-teal-500',
    gradient: 'from-teal-500 to-cyan-600',
    ring: 'ring-teal-200',
    text: 'text-teal-700',
    hex: '#14b8a6',
    description: "L'apprenant consolide en créant un livrable concret.",
    examples: ['Séance construite', 'Support de classe', 'Affiche didactique', 'Progression annuelle'],
  },
};

const TYPE_ORDER: LearningType[] = ['acquisition', 'investigation', 'practice', 'discussion', 'collaboration', 'production'];

// ─── Phases ──────────────────────────────────────────────────────────────────

type PhaseId = 'avant' | 'pendant' | 'apres';

interface PhaseMeta {
  id: PhaseId;
  label: string;
  tagline: string;
  icon: string;
  accent: string;
}

const PHASES: PhaseMeta[] = [
  { id: 'avant',   label: 'Avant la formation', tagline: 'Préparer · Susciter', icon: '🌱', accent: 'from-sky-100 to-white' },
  { id: 'pendant', label: 'Pendant la formation', tagline: 'Vivre · Pratiquer', icon: '🔥', accent: 'from-amber-100 to-white' },
  { id: 'apres',   label: 'Après la formation', tagline: 'Transférer · Prolonger', icon: '🌳', accent: 'from-emerald-100 to-white' },
];

// ─── Modèle ──────────────────────────────────────────────────────────────────

interface ScenarioCard {
  id: string;
  type: LearningType;
  phase: PhaseId;
  titre: string;
  description: string;    // dos de carte
  duree: number;          // minutes
  modalite: string;       // présentiel / distanciel / hybride
  outils: string;         // supports, matériel
}

interface ScenarioMeta {
  titre: string;
  formateur: string;
  date: string;
  lieu: string;
  public_cible: string;
  duree_totale: string;
  objectifs: string;
  prerequis: string;
  materiel: string;
  evaluation: string;
}

interface ScenarioState {
  meta: ScenarioMeta;
  cards: ScenarioCard[];
}

const EMPTY_META: ScenarioMeta = {
  titre: '',
  formateur: '',
  date: '',
  lieu: '',
  public_cible: '',
  duree_totale: '',
  objectifs: '',
  prerequis: '',
  materiel: '',
  evaluation: '',
};

const STORAGE_KEY = 'scenario-abc-v1';

// ─── uuid ───
const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ScenarisationPage() {
  const [meta, setMeta] = useState<ScenarioMeta>(EMPTY_META);
  const [cards, setCards] = useState<ScenarioCard[]>([]);
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragOverPhase, setDragOverPhase] = useState<PhaseId | null>(null);
  const [showMeta, setShowMeta] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Chargement initial
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: ScenarioState = JSON.parse(raw);
        if (parsed?.meta) setMeta({ ...EMPTY_META, ...parsed.meta });
        if (Array.isArray(parsed?.cards)) setCards(parsed.cards);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  // Auto-save
  useEffect(() => {
    if (!hydrated) return;
    const payload: ScenarioState = { meta, cards };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch { /* quota */ }
  }, [meta, cards, hydrated]);

  // Stats par phase et par type
  const stats = useMemo(() => {
    const byPhase = PHASES.reduce((acc, p) => {
      acc[p.id] = { count: 0, duree: 0 };
      return acc;
    }, {} as Record<PhaseId, { count: number; duree: number }>);
    const byType = TYPE_ORDER.reduce((acc, t) => { acc[t] = 0; return acc; }, {} as Record<LearningType, number>);
    let total = 0;
    cards.forEach(c => {
      byPhase[c.phase].count += 1;
      byPhase[c.phase].duree += (c.duree || 0);
      byType[c.type] += 1;
      total += (c.duree || 0);
    });
    return { byPhase, byType, total };
  }, [cards]);

  // ─── DnD handlers ───
  const handlePaletteDragStart = (e: React.DragEvent, type: LearningType) => {
    e.dataTransfer.setData('application/x-abc-type', type);
    e.dataTransfer.setData('application/x-abc-source', 'palette');
    e.dataTransfer.effectAllowed = 'copy';
  };
  const handleCardDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('application/x-abc-card', cardId);
    e.dataTransfer.setData('application/x-abc-source', 'card');
    e.dataTransfer.effectAllowed = 'move';
  };
  const handlePhaseDragOver = (e: React.DragEvent, phase: PhaseId) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverPhase !== phase) setDragOverPhase(phase);
  };
  const handlePhaseDragLeave = () => setDragOverPhase(null);
  const handlePhaseDrop = (e: React.DragEvent, phase: PhaseId) => {
    e.preventDefault();
    setDragOverPhase(null);
    const source = e.dataTransfer.getData('application/x-abc-source');
    if (source === 'palette') {
      const type = e.dataTransfer.getData('application/x-abc-type') as LearningType;
      if (!type) return;
      const newCard: ScenarioCard = {
        id: uid(),
        type,
        phase,
        titre: TYPES[type].label,
        description: '',
        duree: 15,
        modalite: 'Présentiel',
        outils: '',
      };
      setCards(prev => [...prev, newCard]);
    } else if (source === 'card') {
      const cardId = e.dataTransfer.getData('application/x-abc-card');
      setCards(prev => prev.map(c => (c.id === cardId ? { ...c, phase } : c)));
    }
  };

  const updateCard = (id: string, patch: Partial<ScenarioCard>) => {
    setCards(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
  };
  const removeCard = (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
    if (flippedId === id) setFlippedId(null);
    if (editingId === id) setEditingId(null);
  };
  const duplicateCard = (id: string) => {
    const original = cards.find(c => c.id === id);
    if (!original) return;
    setCards(prev => [...prev, { ...original, id: uid() }]);
  };

  const resetAll = () => {
    if (!confirm('Réinitialiser le scénario ? Toutes les cartes et les métadonnées seront effacées.')) return;
    setMeta(EMPTY_META);
    setCards([]);
    setFlippedId(null);
    setEditingId(null);
  };

  // ─── Export PDF ───
  const availableElements: PDFElement[] = [
    { id: 'scenario-meta-block',   label: 'Données de la formation', selected: true },
    { id: 'scenario-storyboard',   label: 'Storyboard (cartes par phase)', selected: true },
    { id: 'scenario-details-list', label: 'Détails des activités (dos des cartes)', selected: true },
    { id: 'scenario-summary',      label: 'Synthèse et répartition',  selected: true },
  ];
  const handleExport = async (elements: PDFElement[], options: PDFExportOptions) => {
    const filename = `scenario-abc-${(meta.titre || 'formation').replace(/\s+/g, '-').toLowerCase()}`;
    // Pour le storyboard, forcer le paysage est souvent mieux — on respecte néanmoins le choix utilisateur.
    await exportMultipleElementsToPDF(elements, filename, options);
    setIsExportOpen(false);
  };

  const handleExportExcel = async () => {
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const phaseOrder: PhaseId[] = ['avant', 'pendant', 'apres'];
    const phaseLabel = (id: PhaseId) => PHASES.find(p => p.id === id)?.label || id;

    const sortedCards = [...cards].sort(
      (a, b) => phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase)
    );

    const sheetMeta: ExcelSheetDef = {
      name: 'Formation',
      title: meta.titre || 'Scénario de formation',
      subtitle: `Scénarisation ABC · Circonscription Cayenne 2 · Exporté le ${dateStr}`,
      columns: [
        { header: 'Rubrique', key: 'k', width: 24 },
        { header: 'Contenu', key: 'v', width: 60 },
      ],
      rows: [
        { k: 'Titre', v: meta.titre || '' },
        { k: 'Formateur', v: meta.formateur || '' },
        { k: 'Date', v: meta.date || '' },
        { k: 'Lieu', v: meta.lieu || '' },
        { k: 'Public cible', v: meta.public_cible || '' },
        { k: 'Durée totale', v: meta.duree_totale || '' },
        { k: 'Objectifs', v: meta.objectifs || '' },
        { k: 'Prérequis', v: meta.prerequis || '' },
        { k: 'Matériel', v: meta.materiel || '' },
        { k: 'Évaluation', v: meta.evaluation || '' },
      ],
    };

    const sheetActs: ExcelSheetDef = {
      name: 'Activités',
      title: 'Déroulé des activités',
      subtitle: `Scénarisation ABC · ${sortedCards.length} activité${sortedCards.length > 1 ? 's' : ''}`,
      columns: [
        { header: 'Phase', key: 'phase', width: 20 },
        { header: 'Type', key: 'type', width: 16 },
        { header: 'Titre', key: 'titre', width: 30 },
        { header: 'Description', key: 'description', width: 50 },
        { header: 'Durée (min)', key: 'duree', width: 12, align: 'center', numFmt: '0' },
        { header: 'Modalité', key: 'modalite', width: 16 },
        { header: 'Outils / supports', key: 'outils', width: 30 },
      ],
      rows: sortedCards.map(c => ({
        phase: phaseLabel(c.phase),
        type: TYPES[c.type]?.label || c.type,
        titre: c.titre || '',
        description: c.description || '',
        duree: c.duree || '',
        modalite: c.modalite || '',
        outils: c.outils || '',
      })),
      totalsRow: {
        phase: 'TOTAL',
        duree: sortedCards.reduce((s, c) => s + (c.duree || 0), 0),
      },
    };

    const filename = `scenario-abc-${(meta.titre || 'formation').replace(/\s+/g, '-').toLowerCase()}`;
    await exportStyledExcel(filename, [sheetMeta, sheetActs]);
  };

  // ─── Render ───
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0] text-white">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 0, transparent 45%), radial-gradient(circle at 80% 70%, white 0, transparent 40%)' }} />
        <div className="relative container mx-auto px-6 py-10">
          <Link href="/formations" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors text-sm">
            ← Retour aux formations
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-3xl shadow-inner">🎬</div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Scénarisation ABC</h1>
                <p className="text-base md:text-lg opacity-95 mt-1">Concevoir une formation avec la méthode <em>Active · Blended · Connected</em></p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetAll}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur text-white text-sm font-medium transition-colors border border-white/20"
              >
                ↻ Réinitialiser
              </button>
              <button
                onClick={() => setIsExportOpen(true)}
                className="px-4 py-2 rounded-xl bg-white text-primary-700 text-sm font-semibold hover:bg-white/90 transition-colors shadow-lg inline-flex items-center gap-2"
              >
                📄 Exporter en PDF
              </button>
              <button
                onClick={handleExportExcel}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-lg inline-flex items-center gap-2"
              >
                📊 Exporter en Excel
              </button>
            </div>
          </div>

          {/* Mini-synthèse dans le hero */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 border border-white/15">
              <div className="text-2xl font-extrabold">{cards.length}</div>
              <div className="text-xs opacity-90 uppercase tracking-wide">Activités</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 border border-white/15">
              <div className="text-2xl font-extrabold">{formatDuree(stats.total)}</div>
              <div className="text-xs opacity-90 uppercase tracking-wide">Durée cumulée</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 border border-white/15">
              <div className="text-2xl font-extrabold">{TYPE_ORDER.filter(t => stats.byType[t] > 0).length}/6</div>
              <div className="text-xs opacity-90 uppercase tracking-wide">Types ABC utilisés</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl px-4 py-3 border border-white/15">
              <div className="text-2xl font-extrabold">{PHASES.filter(p => stats.byPhase[p.id].count > 0).length}/3</div>
              <div className="text-xs opacity-90 uppercase tracking-wide">Phases activées</div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteneur principal */}
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* ─── Métadonnées ─── */}
        <section id="scenario-meta-block" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button
            onClick={() => setShowMeta(v => !v)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div className="text-left">
                <h2 className="font-bold text-slate-800">Données de la formation</h2>
                <p className="text-xs text-slate-500">Logistique · Public · Objectifs · Évaluation</p>
              </div>
            </div>
            <span className={`text-slate-400 transition-transform duration-200 ${showMeta ? 'rotate-180' : ''}`}>▾</span>
          </button>
          <AnimatePresence initial={false}>
            {showMeta && (
              <motion.div
                key="meta-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="overflow-hidden border-t border-slate-100"
              >
                <div className="px-6 py-5 grid md:grid-cols-2 gap-4">
                  <MetaField label="Titre de la formation" value={meta.titre} onChange={v => setMeta(m => ({ ...m, titre: v }))} placeholder="Ex. : Enseigner l'oral au cycle 2" />
                  <MetaField label="Formateur·rice" value={meta.formateur} onChange={v => setMeta(m => ({ ...m, formateur: v }))} placeholder="Prénom NOM" />
                  <MetaField label="Date" value={meta.date} onChange={v => setMeta(m => ({ ...m, date: v }))} placeholder="Ex. : mar. 12 mai 2026" />
                  <MetaField label="Lieu" value={meta.lieu} onChange={v => setMeta(m => ({ ...m, lieu: v }))} placeholder="Ex. : EE Saba, salle polyvalente" />
                  <MetaField label="Public cible" value={meta.public_cible} onChange={v => setMeta(m => ({ ...m, public_cible: v }))} placeholder="Ex. : Enseignants de CP-CE1" />
                  <MetaField label="Durée totale" value={meta.duree_totale} onChange={v => setMeta(m => ({ ...m, duree_totale: v }))} placeholder="Ex. : 6h sur 2 après-midi" />
                  <MetaTextarea label="Objectifs" value={meta.objectifs} onChange={v => setMeta(m => ({ ...m, objectifs: v }))} placeholder="Ce que les participants sauront faire à l'issue…" />
                  <MetaTextarea label="Prérequis" value={meta.prerequis} onChange={v => setMeta(m => ({ ...m, prerequis: v }))} placeholder="Connaissances / expériences nécessaires" />
                  <MetaTextarea label="Matériel & ressources" value={meta.materiel} onChange={v => setMeta(m => ({ ...m, materiel: v }))} placeholder="Vidéoprojecteur, documents, liens numériques…" />
                  <MetaTextarea label="Évaluation" value={meta.evaluation} onChange={v => setMeta(m => ({ ...m, evaluation: v }))} placeholder="Comment mesurer les acquis / la satisfaction ?" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ─── Palette ABC ─── */}
        <section>
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="text-xl">🎴</span>
                Palette ABC · Les 6 types d&apos;apprentissage
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Glissez une carte vers une phase pour l&apos;ajouter au scénario — cliquez ensuite dessus pour la retourner.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {TYPE_ORDER.map(type => {
              const meta = TYPES[type];
              const count = stats.byType[type];
              return (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => handlePaletteDragStart(e, type)}
                  className={`group relative cursor-grab active:cursor-grabbing rounded-2xl p-4 text-white bg-gradient-to-br ${meta.gradient} shadow-md hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all duration-200 select-none`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl pointer-events-none">{meta.icon}</span>
                    {count > 0 && (
                      <span className="text-[10px] font-bold bg-white/25 backdrop-blur rounded-full px-2 py-0.5 pointer-events-none">×{count}</span>
                    )}
                  </div>
                  <div className="font-bold text-sm pointer-events-none">{meta.label}</div>
                  <div className="text-[11px] opacity-90 mt-0.5 pointer-events-none">{meta.short}</div>
                  <div className="absolute inset-0 rounded-2xl ring-2 ring-white/0 group-hover:ring-white/50 transition-all pointer-events-none" />
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── Storyboard ─── */}
        <section id="scenario-storyboard" className="space-y-4">
          <div className="flex items-end justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="text-xl">🗺️</span>
              Storyboard
            </h2>
            <p className="text-xs text-slate-500">Glissez-déposez sur les 3 lignes · cliquez une carte pour la retourner</p>
          </div>

          <LayoutGroup>
            {PHASES.map(phase => {
              const phaseCards = cards.filter(c => c.phase === phase.id);
              const isTarget = dragOverPhase === phase.id;
              return (
                <div
                  key={phase.id}
                  onDragOver={(e) => handlePhaseDragOver(e, phase.id)}
                  onDragLeave={handlePhaseDragLeave}
                  onDrop={(e) => handlePhaseDrop(e, phase.id)}
                  className={`relative rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                    isTarget
                      ? 'border-primary-500 bg-primary-50/60 shadow-lg scale-[1.005]'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {/* Bandeau phase */}
                  <div className={`flex items-center justify-between px-5 py-3 bg-gradient-to-r ${phase.accent} border-b border-slate-100`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{phase.icon}</span>
                      <div>
                        <div className="font-bold text-slate-800">{phase.label}</div>
                        <div className="text-[11px] text-slate-500 uppercase tracking-wider">{phase.tagline}</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                      <span>{phaseCards.length} activité{phaseCards.length > 1 ? 's' : ''}</span>
                      <span className="w-px h-4 bg-slate-300" />
                      <span>{formatDuree(stats.byPhase[phase.id].duree)}</span>
                    </div>
                  </div>

                  {/* Zone de dépôt */}
                  <div className="min-h-[140px] p-4">
                    {phaseCards.length === 0 ? (
                      <div className={`h-[108px] rounded-xl border-2 border-dashed flex items-center justify-center text-sm transition-colors ${
                        isTarget ? 'border-primary-400 text-primary-700 bg-primary-50' : 'border-slate-200 text-slate-400'
                      }`}>
                        {isTarget ? '↓ Déposer ici' : 'Glissez une carte depuis la palette'}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        <AnimatePresence>
                          {phaseCards.map(card => (
                            <FlipCard
                              key={card.id}
                              card={card}
                              isFlipped={flippedId === card.id}
                              isEditing={editingId === card.id}
                              onFlip={() => setFlippedId(flippedId === card.id ? null : card.id)}
                              onEditToggle={() => setEditingId(editingId === card.id ? null : card.id)}
                              onDragStart={(e) => handleCardDragStart(e, card.id)}
                              onChange={(patch) => updateCard(card.id, patch)}
                              onRemove={() => removeCard(card.id)}
                              onDuplicate={() => duplicateCard(card.id)}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </LayoutGroup>
        </section>

        {/* ─── Synthèse ─── */}
        <section id="scenario-summary" className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">📊 Répartition par type</h3>
            <div className="space-y-2">
              {TYPE_ORDER.map(t => {
                const n = stats.byType[t];
                const total = cards.length || 1;
                const pct = Math.round((n / total) * 100);
                const meta = TYPES[t];
                return (
                  <div key={t}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <span>{meta.icon}</span>
                        <span className="font-semibold">{meta.label}</span>
                      </span>
                      <span className="text-slate-500">{n} {n > 1 ? 'activités' : 'activité'} · {pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${n > 0 ? Math.max(pct, 4) : 0}%` }}
                        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: meta.hex }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">⏱️ Répartition par phase</h3>
            <div className="space-y-3">
              {PHASES.map(p => {
                const { count, duree } = stats.byPhase[p.id];
                const pct = stats.total > 0 ? Math.round((duree / stats.total) * 100) : 0;
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <span>{p.icon}</span>
                        <span className="font-semibold">{p.label}</span>
                      </span>
                      <span className="text-slate-500">{count} · {formatDuree(duree)} · {pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${duree > 0 ? Math.max(pct, 4) : 0}%` }}
                        transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-[#45b8a0]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── Détails des activités (utile pour export) ─── */}
        <section id="scenario-details-list" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">📝 Détails des activités</h3>
          {cards.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Aucune activité pour le moment.</p>
          ) : (
            <div className="space-y-4">
              {PHASES.map(p => {
                const phaseCards = cards.filter(c => c.phase === p.id);
                if (phaseCards.length === 0) return null;
                return (
                  <div key={p.id}>
                    <div className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                      <span>{p.icon}</span>
                      {p.label}
                    </div>
                    <div className="space-y-2 pl-6">
                      {phaseCards.map((c, i) => {
                        const m = TYPES[c.type];
                        return (
                          <div key={c.id} className="border-l-4 pl-3 py-1" style={{ borderColor: m.hex }}>
                            <div className="flex items-center gap-2 text-sm">
                              <span className={`px-2 py-0.5 rounded text-white text-[10px] font-bold bg-gradient-to-r ${m.gradient}`}>{m.icon} {m.label}</span>
                              <span className="font-semibold text-slate-800">{c.titre || m.label}</span>
                              <span className="text-xs text-slate-500">· {formatDuree(c.duree)}</span>
                              {c.modalite && <span className="text-xs text-slate-500">· {c.modalite}</span>}
                            </div>
                            {c.description && <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{c.description}</p>}
                            {c.outils && <p className="text-[11px] text-slate-500 mt-0.5"><span className="font-semibold">Outils :</span> {c.outils}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Modal export */}
      <PDFExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onExport={handleExport}
        availableElements={availableElements}
        defaultFilename={`scenario-abc-${(meta.titre || 'formation').replace(/\s+/g, '-').toLowerCase()}`}
      />
    </div>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function MetaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none transition-all"
      />
    </div>
  );
}

function MetaTextarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; }) {
  return (
    <div className="md:col-span-1">
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">{label}</label>
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-300 focus:border-primary-400 outline-none transition-all resize-y"
      />
    </div>
  );
}

function FlipCard({
  card,
  isFlipped,
  isEditing,
  onFlip,
  onEditToggle,
  onDragStart,
  onChange,
  onRemove,
  onDuplicate,
}: {
  card: ScenarioCard;
  isFlipped: boolean;
  isEditing: boolean;
  onFlip: () => void;
  onEditToggle: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onChange: (patch: Partial<ScenarioCard>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const meta = TYPES[card.type];
  // Quand on édite, on fige le flip côté "dos" pour laisser l'utilisateur saisir
  const showBack = isFlipped || isEditing;

  return (
    <div
      draggable={!isEditing}
      onDragStart={onDragStart}
      style={{ perspective: 1200 }}
      className="relative w-[230px] h-[160px] select-none"
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotateY: showBack ? 180 : 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -8 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* FACE AVANT */}
        <div
          className={`absolute inset-0 rounded-xl bg-gradient-to-br ${meta.gradient} text-white p-3 shadow-md flex flex-col cursor-grab active:cursor-grabbing`}
          style={{ backfaceVisibility: 'hidden' }}
          onClick={(e) => {
            // Clic simple = flip (sauf sur bouton)
            if ((e.target as HTMLElement).closest('button')) return;
            onFlip();
          }}
        >
          <div className="flex items-start justify-between">
            <span className="text-2xl">{meta.icon}</span>
            <div className="flex gap-1">
              <CardIconBtn title="Dupliquer" onClick={onDuplicate}>⎘</CardIconBtn>
              <CardIconBtn title="Supprimer" onClick={onRemove}>✕</CardIconBtn>
            </div>
          </div>
          <div className="flex-1 mt-1">
            <div className="text-[10px] uppercase tracking-wider opacity-80 font-bold">{meta.label}</div>
            <div className="font-bold text-sm leading-tight mt-1 line-clamp-2">{card.titre || meta.label}</div>
          </div>
          <div className="flex items-center justify-between text-[11px] opacity-95">
            <span className="bg-white/20 rounded px-2 py-0.5 font-semibold">⏱ {formatDuree(card.duree)}</span>
            <span className="opacity-80">Cliquer ↻</span>
          </div>
        </div>

        {/* FACE ARRIÈRE */}
        <div
          className={`absolute inset-0 rounded-xl bg-white border-2 p-3 shadow-md flex flex-col overflow-hidden`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderColor: meta.hex }}
        >
          <div className="flex items-start justify-between mb-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white bg-gradient-to-r ${meta.gradient}`}>{meta.icon} {meta.label}</span>
            <div className="flex gap-1">
              <CardIconBtn
                title={isEditing ? 'Terminer' : 'Éditer'}
                onClick={onEditToggle}
                className="!bg-slate-100 !text-slate-700 hover:!bg-slate-200"
              >
                {isEditing ? '✓' : '✎'}
              </CardIconBtn>
              <CardIconBtn
                title="Retourner"
                onClick={onFlip}
                className="!bg-slate-100 !text-slate-700 hover:!bg-slate-200"
              >↺</CardIconBtn>
            </div>
          </div>
          {isEditing ? (
            <div className="flex-1 flex flex-col gap-1.5 text-xs min-h-0">
              <input
                type="text"
                value={card.titre}
                onChange={(e) => onChange({ titre: e.target.value })}
                placeholder="Titre"
                className="px-2 py-1 border border-slate-200 rounded text-[12px] font-semibold"
              />
              <textarea
                value={card.description}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="Activité (dos de carte)…"
                rows={2}
                className="px-2 py-1 border border-slate-200 rounded text-[11px] resize-none flex-1 min-h-0"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500">⏱</span>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={card.duree}
                    onChange={(e) => onChange({ duree: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full px-1.5 py-0.5 border border-slate-200 rounded text-[11px]"
                  />
                  <span className="text-[10px] text-slate-500">min</span>
                </div>
                <select
                  value={card.modalite}
                  onChange={(e) => onChange({ modalite: e.target.value })}
                  className="px-1 py-0.5 border border-slate-200 rounded text-[10px]"
                >
                  <option>Présentiel</option>
                  <option>Distanciel</option>
                  <option>Hybride</option>
                  <option>Autonomie</option>
                </select>
              </div>
              <input
                type="text"
                value={card.outils}
                onChange={(e) => onChange({ outils: e.target.value })}
                placeholder="Outils / supports"
                className="px-2 py-1 border border-slate-200 rounded text-[11px]"
              />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto text-[11px] text-slate-700 space-y-1">
              <div className="font-bold text-slate-800 text-[12px]">{card.titre || meta.label}</div>
              {card.description ? (
                <p className="whitespace-pre-wrap">{card.description}</p>
              ) : (
                <p className="italic text-slate-400">Cliquez ✎ pour décrire l&apos;activité.</p>
              )}
              <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-500 space-y-0.5">
                <div>⏱ {formatDuree(card.duree)} · {card.modalite}</div>
                {card.outils && <div>🧰 {card.outils}</div>}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function CardIconBtn({ children, onClick, title, className = '' }: { children: React.ReactNode; onClick: () => void; title: string; className?: string; }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      className={`w-6 h-6 rounded-md bg-white/20 hover:bg-white/35 text-white text-xs flex items-center justify-center transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

// ─── Helpers ───
function formatDuree(min: number): string {
  if (!min || min <= 0) return '0 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}
