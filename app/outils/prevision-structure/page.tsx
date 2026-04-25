'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuroraHeader from '@/components/AuroraHeader';
import {
  MAX_CLASSES,
  NIVEAUX,
  NiveauKey,
  Prevision,
  REP_PLUS_MAX,
  REP_PLUS_NIVEAUX,
  computeStats,
  makeEmptyPrevision,
} from './types';
import { exportToXlsx, importFromTemplate } from './xlsx-io';

const STORAGE_KEY = 'prevision-structure:v1';
const spring = { type: 'spring' as const, stiffness: 320, damping: 28 };

function loadFromStorage(): Prevision[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Prevision[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.map((p) => {
      const safe = makeEmptyPrevision(p.id || crypto.randomUUID());
      safe.ecole = p.ecole ?? '';
      safe.auteur = p.auteur ?? '';
      safe.anneeN = p.anneeN ?? safe.anneeN;
      safe.anneeN1 = p.anneeN1 ?? safe.anneeN1;
      safe.nbClasses = Math.max(1, Math.min(MAX_CLASSES, Number(p.nbClasses) || 1));
      safe.repPlus = Boolean(p.repPlus);
      for (const n of NIVEAUX) {
        safe.effectifs[n.key] = Number(p.effectifs?.[n.key]) || 0;
        const row = p.repartition?.[n.key] || [];
        for (let c = 0; c < MAX_CLASSES; c++) safe.repartition[n.key][c] = Number(row[c]) || 0;
      }
      safe.commPositifs = p.commPositifs ?? '';
      safe.commNegatifs = p.commNegatifs ?? '';
      safe.updatedAt = p.updatedAt ?? Date.now();
      return safe;
    });
  } catch {
    return null;
  }
}

export default function PrevisionStructurePage() {
  const [previsions, setPrevisions] = useState<Prevision[]>(() => [makeEmptyPrevision('p1')]);
  const [activeId, setActiveId] = useState<string>('p1');
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = loadFromStorage();
    if (stored && stored.length > 0) {
      setPrevisions(stored);
      setActiveId(stored[0].id);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(previsions));
    } catch {
      /* quota */
    }
  }, [previsions, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const active = useMemo(
    () => previsions.find((p) => p.id === activeId) ?? previsions[0],
    [previsions, activeId],
  );

  const updateActive = useCallback(
    (mut: (p: Prevision) => void) => {
      setPrevisions((prev) =>
        prev.map((p) => {
          if (p.id !== active.id) return p;
          const clone: Prevision = JSON.parse(JSON.stringify(p));
          mut(clone);
          clone.updatedAt = Date.now();
          return clone;
        }),
      );
    },
    [active?.id],
  );

  const stats = useMemo(() => (active ? computeStats(active) : null), [active]);

  const addEcole = () => {
    const id = crypto.randomUUID();
    const fresh = makeEmptyPrevision(id);
    setPrevisions((p) => [...p, fresh]);
    setActiveId(id);
  };

  const removeEcole = (id: string) => {
    setPrevisions((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (next.length === 0) {
        const empty = makeEmptyPrevision(crypto.randomUUID());
        setActiveId(empty.id);
        return [empty];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  };

  const resetActive = () => {
    if (!confirm("Effacer toutes les données de cette école ? Cette action n'est pas annulable.")) return;
    setPrevisions((prev) =>
      prev.map((p) => (p.id === active.id ? { ...makeEmptyPrevision(p.id) } : p)),
    );
    setToast('Fiche réinitialisée.');
  };

  const onPickFile = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const imported = await importFromTemplate(f);
      setPrevisions((prev) => [...prev.filter((p) => p.ecole.trim() || hasAnyData(p)), ...imported]);
      setActiveId(imported[0].id);
      setToast(`${imported.length} école${imported.length > 1 ? 's' : ''} importée${imported.length > 1 ? 's' : ''}.`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Import impossible.');
    }
  };

  const onExport = async () => {
    try {
      const target = active ? [active] : previsions;
      await exportToXlsx(target);
      setToast('Export généré.');
    } catch {
      setToast("L'export a échoué.");
    }
  };

  const onPrint = () => window.print();

  if (!active || !stats) return null;

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <div className="print:hidden">
        <AuroraHeader
          kicker={`Outil directeurs · ${active.anneeN1}`}
          title="Prévision de"
          titleAccent="structure."
          subtitle="Répartir les effectifs par niveau et par classe, suivre les restes, anticiper la rentrée. Jusqu'à 35 classes, impression A3 paysage."
          backLabel="Retour à l'accueil"
          padding="py-10 md:py-12"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <TopBtn onClick={onPickFile} icon={<UploadIcon />} label="Importer .xlsx" />
              <TopBtn onClick={onExport} icon={<DownloadIcon />} label="Exporter .xlsx" />
              <TopBtn onClick={onPrint} icon={<PrinterIcon />} label="Imprimer A3" primary />
              <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={onFile} />
            </div>
          }
        >
          <SchoolTabs
            list={previsions}
            activeId={activeId}
            onPick={setActiveId}
            onAdd={addEcole}
            onRemove={removeEcole}
          />
        </AuroraHeader>
      </div>

      <main className="mx-auto w-full max-w-[1720px] px-4 md:px-6 pb-16 relative z-10 print:max-w-none print:px-0 print:pb-0">
        <div className="print:p-6">
          <IdentityBlock
            p={active}
            onChange={(patch) =>
              updateActive((p) => {
                Object.assign(p, patch);
                if (patch.nbClasses !== undefined) {
                  const v = Math.max(1, Math.min(MAX_CLASSES, patch.nbClasses));
                  p.nbClasses = v;
                }
              })
            }
          />

          <RepPlusBanner p={active} stats={stats} />

          <Grid
            p={active}
            onEffectifChange={(key, val) => updateActive((p) => void (p.effectifs[key] = val))}
            onCellChange={(key, c, val) =>
              updateActive((p) => {
                p.repartition[key][c] = val;
              })
            }
            stats={stats}
          />

          <Synthese p={active} stats={stats} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6 print:grid-cols-2 print:gap-3 print:mt-4">
            <CommentCard
              tone="positive"
              title="Points positifs"
              value={active.commPositifs}
              onChange={(v) => updateActive((p) => void (p.commPositifs = v))}
            />
            <CommentCard
              tone="negative"
              title="Points de vigilance"
              value={active.commNegatifs}
              onChange={(v) => updateActive((p) => void (p.commNegatifs = v))}
            />
          </div>

          <div className="mt-6 flex justify-end gap-2 print:hidden">
            <button
              onClick={resetActive}
              className="inline-flex items-center gap-2 text-rose-600 hover:text-rose-700 text-sm font-medium px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors"
            >
              <TrashIcon />
              Réinitialiser cette fiche
            </button>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={spring}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 text-sm font-medium shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)] border border-white/10 print:hidden"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @media print {
          @page {
            size: A3 landscape;
            margin: 10mm;
          }
          html,
          body {
            background: #fff !important;
          }
          .ps-no-print {
            display: none !important;
          }
          .ps-print-shrink {
            font-size: 9pt;
          }
          .ps-print-cell {
            padding: 2px 3px !important;
          }
        }
      `}</style>
    </div>
  );
}

function hasAnyData(p: Prevision) {
  if (p.ecole.trim() || p.auteur.trim() || p.commPositifs.trim() || p.commNegatifs.trim()) return true;
  for (const n of NIVEAUX) {
    if ((p.effectifs[n.key] || 0) > 0) return true;
    if (p.repartition[n.key].some((v) => v > 0)) return true;
  }
  return false;
}

/* ------------------------------------------------------------- *
 * TopBtn, SchoolTabs, IdentityBlock, Grid, Synthese, CommentCard *
 * ------------------------------------------------------------- */

function TopBtn({
  onClick,
  icon,
  label,
  primary,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all active:translate-y-px ${
        primary
          ? 'bg-white text-primary-700 hover:bg-white/90 shadow-[0_6px_18px_-6px_rgba(0,0,0,0.25)]'
          : 'bg-white/10 backdrop-blur-md border border-white/25 text-white hover:bg-white/20'
      }`}
    >
      <span className="w-4 h-4 inline-flex items-center justify-center">{icon}</span>
      {label}
    </button>
  );
}

const SCHOOL_GRADIENTS = [
  'from-sky-500 to-cyan-500',
  'from-rose-400 to-pink-500',
  'from-violet-500 to-fuchsia-500',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-indigo-500 to-blue-500',
];

function SchoolTabs({
  list,
  activeId,
  onPick,
  onAdd,
  onRemove,
}: {
  list: Prevision[];
  activeId: string;
  onPick: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/50 mr-1">
        École
      </span>
      {list.map((p, i) => {
        const isActive = p.id === activeId;
        const gradient = SCHOOL_GRADIENTS[i % SCHOOL_GRADIENTS.length];
        const label = p.ecole.trim() || 'Nouvelle école';
        const sublabel = `${p.nbClasses} classe${p.nbClasses > 1 ? 's' : ''}`;
        return (
          <motion.div
            key={p.id}
            layout
            className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-semibold tracking-wide transition-all duration-200 cursor-pointer active:scale-95 ${
              isActive
                ? `bg-gradient-to-r ${gradient} text-white border-transparent shadow-lg shadow-black/20`
                : 'bg-white/5 border-white/15 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/30'
            }`}
            onClick={() => onPick(p.id)}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isActive ? 'bg-white' : `bg-gradient-to-r ${gradient}`
              }`}
            />
            <span className="truncate max-w-[240px]">{label}</span>
            <span className={`font-normal ${isActive ? 'text-white/90' : 'text-white/50'}`}>
              · {sublabel}
            </span>
            {list.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(p.id);
                }}
                aria-label="Supprimer cette école"
                className={`-mr-1 ml-0.5 w-5 h-5 inline-flex items-center justify-center rounded-full transition-colors ${
                  isActive
                    ? 'text-white/80 hover:text-white hover:bg-white/20'
                    : 'text-white/50 hover:text-white hover:bg-white/15'
                }`}
              >
                <XIcon />
              </button>
            )}
          </motion.div>
        );
      })}
      <button
        onClick={onAdd}
        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-dashed border-white/25 text-[11px] font-semibold tracking-wide text-white/70 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all duration-200 cursor-pointer active:scale-95"
      >
        <PlusIcon /> Ajouter une école
      </button>
    </div>
  );
}

function IdentityBlock({
  p,
  onChange,
}: {
  p: Prevision;
  onChange: (patch: Partial<Prevision>) => void;
}) {
  return (
    <section className="bg-white rounded-3xl border border-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.02),0_24px_48px_-24px_rgba(30,90,120,0.22)] p-6 mt-6 print:shadow-none print:border-slate-300 print:rounded-none print:p-4 print:mt-0">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <FieldText
          label="École"
          value={p.ecole}
          onChange={(v) => onChange({ ecole: v })}
          placeholder="Nom de l'école"
          className="md:col-span-5"
        />
        <FieldText
          label="Directeur / directrice"
          value={p.auteur}
          onChange={(v) => onChange({ auteur: v })}
          placeholder="Nom de l'auteur"
          className="md:col-span-3"
        />
        <FieldText
          label="Année en cours"
          value={p.anneeN}
          onChange={(v) => onChange({ anneeN: v })}
          placeholder="2025-2026"
          className="md:col-span-2"
        />
        <FieldText
          label="Année n+1"
          value={p.anneeN1}
          onChange={(v) => onChange({ anneeN1: v })}
          placeholder="2026-2027"
          className="md:col-span-2"
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-3 bg-slate-50 rounded-2xl border border-slate-200 px-4 py-2.5">
          <span className="text-xs font-bold tracking-[0.15em] uppercase text-slate-500">
            Nombre de classes
          </span>
          <input
            type="number"
            min={1}
            max={MAX_CLASSES}
            value={p.nbClasses}
            onChange={(e) => onChange({ nbClasses: Number(e.target.value) || 1 })}
            className="w-16 bg-white rounded-lg border border-slate-300 px-2 py-1 text-center font-bold tabular-nums text-slate-900 outline-none focus:ring-2 focus:ring-primary-400"
          />
          <span className="text-xs text-slate-400">max {MAX_CLASSES}</span>
        </div>

        <button
          type="button"
          onClick={() => onChange({ repPlus: !p.repPlus })}
          aria-pressed={p.repPlus}
          className={`inline-flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all active:translate-y-px ${
            p.repPlus
              ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span
            className={`relative inline-flex w-8 h-4 rounded-full transition-colors ${
              p.repPlus ? 'bg-rose-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
                p.repPlus ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </span>
          École REP+
          <span className="text-[11px] font-medium text-slate-400">
            (CP · CE1 max {REP_PLUS_MAX})
          </span>
        </button>
      </div>
    </section>
  );
}

function FieldText({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-slate-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-slate-50 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition-all focus:ring-2 focus:ring-primary-400 focus:bg-white"
      />
    </label>
  );
}

/* ------ REP+ banner ------ */

function RepPlusBanner({
  p,
  stats,
}: {
  p: Prevision;
  stats: ReturnType<typeof computeStats>;
}) {
  if (!p.repPlus) return null;
  const v = stats.repPlusViolations;
  if (v.length === 0) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 print:mt-3 print:rounded-lg"
      >
        <span className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-emerald-500 text-white">
          <CheckIcon />
        </span>
        <span>
          <strong className="font-bold">REP+ respecté</strong> — aucun groupe CP ou CE1 ne
          dépasse {REP_PLUS_MAX} élèves.
        </span>
      </motion.div>
    );
  }
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 print:mt-3 print:rounded-lg"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex w-7 h-7 items-center justify-center rounded-full bg-rose-500 text-white shrink-0">
          <AlertIcon />
        </span>
        <div className="text-sm text-rose-900">
          <strong className="font-bold">Seuil REP+ dépassé</strong> sur {v.length} groupe
          {v.length > 1 ? 's' : ''} —{' '}
          <span className="text-rose-700">
            {v
              .map((x) => `${x.niveau} C${x.classe + 1} : ${x.value}`)
              .join(' · ')}
          </span>
          . Les classes dédoublées CP et CE1 doivent compter {REP_PLUS_MAX} élèves maximum.
        </div>
      </div>
    </motion.div>
  );
}

/* ------ Grid ------- */

function Grid({
  p,
  onEffectifChange,
  onCellChange,
  stats,
}: {
  p: Prevision;
  onEffectifChange: (key: NiveauKey, val: number) => void;
  onCellChange: (key: NiveauKey, c: number, val: number) => void;
  stats: ReturnType<typeof computeStats>;
}) {
  const classes = Array.from({ length: p.nbClasses }, (_, i) => i);

  const onGridKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, ni: number, ci: number) => {
    const key = e.key;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(key)) return;
    e.preventDefault();
    let nextNi = ni;
    let nextCi = ci;
    if (key === 'ArrowUp') nextNi = Math.max(0, ni - 1);
    if (key === 'ArrowDown' || key === 'Enter') nextNi = Math.min(NIVEAUX.length - 1, ni + 1);
    if (key === 'ArrowLeft') nextCi = Math.max(0, ci - 1);
    if (key === 'ArrowRight') nextCi = Math.min(p.nbClasses - 1, ci + 1);
    const target = document.querySelector<HTMLInputElement>(
      `input[data-cell="${nextNi}:${nextCi}"]`,
    );
    target?.focus();
    target?.select();
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.02),0_24px_48px_-24px_rgba(30,90,120,0.22)] mt-6 overflow-hidden print:shadow-none print:border-slate-300 print:rounded-none print:mt-4">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 print:py-2 print:px-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-[#45b8a0] inline-flex items-center justify-center text-white">
            <GridIcon />
          </div>
          <div>
            <h2 className="font-[Outfit,sans-serif] font-bold text-slate-900 tracking-tight">
              Répartition par niveau et par classe
            </h2>
            <p className="text-xs text-slate-500">
              Les nombres affichés en rouge signalent qu'il reste des élèves à placer.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto ps-print-shrink">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/60">
              <th className="sticky left-0 bg-slate-50/95 backdrop-blur-sm z-20 text-left text-[11px] font-bold tracking-[0.12em] uppercase text-slate-600 px-3 py-2 border-b border-slate-200 min-w-[90px]">
                Niveau
              </th>
              <th className="text-[11px] font-bold uppercase text-slate-600 px-2 py-2 border-b border-slate-200 min-w-[72px]">
                Effectif
              </th>
              <th className="text-[11px] font-bold uppercase text-slate-600 px-2 py-2 border-b border-slate-200 min-w-[64px]">
                Reste
              </th>
              {classes.map((c) => (
                <th
                  key={c}
                  className="text-[11px] font-bold uppercase text-slate-600 px-1 py-2 border-b border-slate-200 min-w-[54px]"
                >
                  C{c + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {NIVEAUX.map((n, ni) => {
              const reste = stats.resteParNiveau[n.key] ?? 0;
              return (
                <tr
                  key={n.key}
                  className={`border-b border-slate-100 ${cycleBg(n.cycle)}`}
                >
                  <td className="sticky left-0 z-10 bg-white/95 backdrop-blur-sm px-3 py-1.5 border-r border-slate-100 print:bg-white">
                    <div className="flex items-center gap-2">
                      <CycleDot cycle={n.cycle} />
                      <span className="text-sm font-bold text-slate-800">{n.label}</span>
                    </div>
                  </td>
                  <td className="px-1 py-1 ps-print-cell">
                    <NumberCell
                      value={p.effectifs[n.key]}
                      onChange={(v) => onEffectifChange(n.key, v)}
                      strong
                    />
                  </td>
                  <td className="px-1 py-1 text-center text-sm font-bold tabular-nums ps-print-cell">
                    <RestePill value={reste} />
                  </td>
                  {classes.map((c) => {
                    const v = p.repartition[n.key][c];
                    const overRepPlus =
                      p.repPlus &&
                      REP_PLUS_NIVEAUX.includes(n.key) &&
                      v > REP_PLUS_MAX;
                    return (
                      <td key={c} className="px-0.5 py-1 ps-print-cell">
                        <NumberCell
                          value={v}
                          onChange={(v2) => onCellChange(n.key, c, v2)}
                          dataCell={`${ni}:${c}`}
                          onKeyDown={(e) => onGridKeyDown(e, ni, c)}
                          danger={overRepPlus}
                          dangerTitle={
                            overRepPlus
                              ? `REP+ : un groupe ${n.label} dépasse ${REP_PLUS_MAX} élèves`
                              : undefined
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50/80">
              <td className="sticky left-0 bg-slate-50/95 z-10 px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-slate-600 border-t border-slate-200 print:bg-slate-100">
                Total classe
              </td>
              <td className="px-2 py-2 text-center text-sm font-bold tabular-nums text-slate-700 border-t border-slate-200">
                {stats.totalEffectif}
              </td>
              <td className="px-2 py-2 border-t border-slate-200" />
              {classes.map((c) => {
                const v = stats.perClasse[c];
                return (
                  <td
                    key={c}
                    className="px-1 py-2 text-center text-sm font-bold tabular-nums text-slate-900 border-t border-slate-200 ps-print-cell"
                  >
                    {v || ''}
                  </td>
                );
              })}
            </tr>
            <tr className="bg-slate-50/80">
              <td className="sticky left-0 bg-slate-50/95 z-10 px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-slate-600 print:bg-slate-100">
                Profil
              </td>
              <td className="px-2 py-2" />
              <td className="px-2 py-2" />
              {classes.map((c) => {
                const nn = stats.niveauxParClasse[c];
                return (
                  <td key={c} className="px-1 py-2 text-center ps-print-cell">
                    <ProfilPill n={nn} />
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function cycleBg(cycle: number) {
  if (cycle === 1) return 'bg-amber-50/30';
  if (cycle === 2) return 'bg-sky-50/30';
  if (cycle === 3) return 'bg-emerald-50/30';
  return 'bg-slate-50/30';
}

function CycleDot({ cycle }: { cycle: number }) {
  const color =
    cycle === 1
      ? 'bg-amber-400'
      : cycle === 2
      ? 'bg-sky-500'
      : cycle === 3
      ? 'bg-emerald-500'
      : 'bg-slate-400';
  return <span className={`inline-block w-1.5 h-4 rounded-full ${color}`} />;
}

function NumberCell({
  value,
  onChange,
  strong,
  dataCell,
  onKeyDown,
  danger,
  dangerTitle,
}: {
  value: number;
  onChange: (v: number) => void;
  strong?: boolean;
  dataCell?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  danger?: boolean;
  dangerTitle?: string;
}) {
  const display = value === 0 ? '' : String(value);
  return (
    <input
      inputMode="numeric"
      pattern="[0-9]*"
      value={display}
      data-cell={dataCell}
      title={dangerTitle}
      onKeyDown={onKeyDown}
      onChange={(e) => {
        const v = e.target.value.replace(/[^0-9]/g, '');
        onChange(v === '' ? 0 : Number(v));
      }}
      onFocus={(e) => e.target.select()}
      className={`w-full text-center tabular-nums border rounded-md py-1 outline-none transition-colors focus:ring-2 ${
        danger
          ? 'bg-rose-50 border-rose-300 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 focus:bg-white focus:ring-rose-400'
          : 'bg-transparent border-transparent text-slate-900 hover:bg-slate-100/70 focus:bg-white focus:ring-primary-400'
      } ${
        strong ? 'font-bold text-[15px]' : 'font-semibold text-[13px]'
      } print:hover:bg-transparent print:focus:bg-transparent`}
      placeholder="·"
    />
  );
}

function RestePill({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[11px] font-bold">
        <CheckIcon /> 0
      </span>
    );
  }
  if (value > 0)
    return (
      <span className="inline-flex items-center rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-[11px] font-bold">
        +{value}
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[11px] font-bold">
      {value}
    </span>
  );
}

function ProfilPill({ n }: { n: number }) {
  if (n === 0) return <span className="text-slate-300 text-xs">—</span>;
  const styles: Record<number, string> = {
    1: 'bg-emerald-100 text-emerald-700',
    2: 'bg-sky-100 text-sky-700',
    3: 'bg-violet-100 text-violet-700',
  };
  const cls = styles[n] || 'bg-rose-100 text-rose-700';
  const labels: Record<number, string> = { 1: 'simple', 2: 'double', 3: 'triple' };
  const label = labels[n] || `${n} niv.`;
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

/* ------ Synthèse ------ */

function Synthese({
  p,
  stats,
}: {
  p: Prevision;
  stats: ReturnType<typeof computeStats>;
}) {
  return (
    <section className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 print:mt-4 print:gap-3">
      <StatCard
        label="Effectif total"
        value={stats.totalEffectif}
        gradient="from-primary-600 to-[#45b8a0]"
        hint={`${stats.totalReparti} répartis · ${stats.resteGlobal} restant${Math.abs(stats.resteGlobal) > 1 ? 's' : ''}`}
        tone={stats.resteGlobal === 0 ? 'ok' : stats.resteGlobal > 0 ? 'warn' : 'error'}
      />
      <StatCard
        label="Moyenne par classe"
        value={stats.classesNonVides > 0 ? stats.moyenneActuelle.toFixed(2) : '—'}
        gradient="from-sky-500 to-cyan-400"
        hint={`théorique ${stats.moyenneTheorique.toFixed(2)} · écart-type ${stats.ecartType.toFixed(2)}`}
      />
      <StatCard
        label="Répartition cycles"
        value={`${stats.cycle1} / ${stats.elem}`}
        gradient="from-amber-400 to-rose-500"
        hint={`Cycle 1 maternelle · Élémentaire (c2 ${stats.cycle2} · c3 ${stats.cycle3})`}
      />
      <StatCard
        label="Profil des classes"
        value={`${stats.simples}·${stats.doubles}·${stats.triples}`}
        gradient="from-violet-500 to-fuchsia-500"
        hint={`simples · doubles · triples${stats.autres ? ` · ${stats.autres} autre(s)` : ''}`}
      />
    </section>
  );
}

function StatCard({
  label,
  value,
  gradient,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  gradient: string;
  hint: string;
  tone?: 'ok' | 'warn' | 'error';
}) {
  const toneRing =
    tone === 'ok'
      ? 'ring-2 ring-emerald-200'
      : tone === 'warn'
      ? 'ring-2 ring-rose-200'
      : tone === 'error'
      ? 'ring-2 ring-amber-200'
      : '';
  return (
    <div
      className={`relative bg-white rounded-2xl border border-slate-200 p-4 shadow-[0_1px_0_rgba(15,23,42,0.02),0_16px_32px_-16px_rgba(30,90,120,0.2)] print:shadow-none print:rounded-lg ${toneRing}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-lg tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_12px_-2px_rgba(0,0,0,0.2)]`}
        >
          <span className="text-[13px] leading-none px-1">{value}</span>
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 leading-tight">
            {label}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 leading-snug">{hint}</div>
        </div>
      </div>
    </div>
  );
}

/* ------ Commentaires ------ */

function CommentCard({
  tone,
  title,
  value,
  onChange,
}: {
  tone: 'positive' | 'negative';
  title: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const accent =
    tone === 'positive'
      ? { bar: 'bg-emerald-500', head: 'text-emerald-700', ring: 'focus-within:ring-emerald-300' }
      : { bar: 'bg-rose-500', head: 'text-rose-700', ring: 'focus-within:ring-rose-300' };
  return (
    <div
      className={`relative bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-[0_1px_0_rgba(15,23,42,0.02),0_16px_32px_-16px_rgba(30,90,120,0.15)] transition-all focus-within:ring-2 ${accent.ring} print:shadow-none print:rounded-lg`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent.bar}`} />
      <div className="p-4 pl-5">
        <h3 className={`text-xs font-bold uppercase tracking-[0.12em] ${accent.head}`}>{title}</h3>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Notes libres…"
          rows={5}
          className="mt-2 w-full resize-y bg-transparent border-0 text-sm text-slate-800 leading-relaxed outline-none placeholder:text-slate-300 print:resize-none"
        />
      </div>
    </div>
  );
}

/* ------ Icons ------ */

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
  );
}
function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  );
}
function PrinterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
  );
}
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function XIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function CheckIcon() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
}
function GridIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
}
function TrashIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
}
function AlertIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}
