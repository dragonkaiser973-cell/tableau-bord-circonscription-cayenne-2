'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuroraHeader from '@/components/AuroraHeader';
import {
  CATEGORIES,
  CATEGORY_BY_KEY,
  CategoryKey,
  HOURS_PER_SLOT,
  MAX_SLOTS_PER_DAY,
  PERIODES,
  Periode,
  PeriodeEvent,
  Repartition108h,
  TOTAL_HOURS,
  computeStats,
  dayKey,
  makeEmptyRepartition,
} from './types';
import { exportAll, importRepartition } from './xlsx-io';

const PERIODE_CATEGORIES: { key: CategoryKey; defaultRows: number }[] = [
  { key: 'concertation', defaultRows: 7 },
  { key: 'conseil-ecole', defaultRows: 7 },
  { key: 'apc', defaultRows: 3 },
  { key: 'organisation', defaultRows: 7 },
];

const STORAGE_KEY = 'repartition-108h:v1';
const spring = { type: 'spring' as const, stiffness: 320, damping: 28 };

const MOIS_LABELS = [
  'Septembre', 'Octobre', 'Novembre', 'Décembre',
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet',
];
const MOIS_INDICES = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6];
const JOURS_COURTS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];

function getYearsFromAnnee(anneeN: string): [number, number] {
  const m = /^(\d{4})-(\d{4})$/.exec(anneeN.trim());
  if (!m) return [2025, 2026];
  return [Number(m[1]), Number(m[2])];
}

function daysInMonth(year: number, monthIdx0: number) {
  return new Date(year, monthIdx0 + 1, 0).getDate();
}

function loadFromStorage(): Repartition108h[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Repartition108h[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.map((p) => {
      const safe = makeEmptyRepartition(p.id || crypto.randomUUID(), p.anneeN);
      safe.ecole = p.ecole ?? '';
      safe.auteur = p.auteur ?? '';
      safe.type = p.type === 'maternelle' ? 'maternelle' : 'elementaire';
      safe.selections = p.selections && typeof p.selections === 'object' ? p.selections : {};
      for (const k of PERIODES) {
        safe.periodes[k] = Array.isArray(p.periodes?.[k]) ? p.periodes[k] : [];
        safe.notes[k] = typeof p.notes?.[k] === 'string' ? p.notes[k] : '';
        if (p.periodeBounds?.[k]?.start && p.periodeBounds?.[k]?.end) {
          safe.periodeBounds[k] = p.periodeBounds[k];
        }
      }
      safe.updatedAt = p.updatedAt ?? Date.now();
      return safe;
    });
  } catch {
    return null;
  }
}

export default function Repartition108hPage() {
  const [items, setItems] = useState<Repartition108h[]>(() => [makeEmptyRepartition('r1')]);
  const [activeId, setActiveId] = useState('r1');
  const [hydrated, setHydrated] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('concertation');
  const [view, setView] = useState<'calendar' | 'periode' | 'recap'>('calendar');
  const [activePeriode, setActivePeriode] = useState<Periode>(1);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = loadFromStorage();
    if (stored && stored.length > 0) {
      setItems(stored);
      setActiveId(stored[0].id);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* quota */
    }
  }, [items, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const active = useMemo(
    () => items.find((p) => p.id === activeId) ?? items[0],
    [items, activeId],
  );

  const update = useCallback((mut: (p: Repartition108h) => void) => {
    setItems((prev) =>
      prev.map((p) => {
        if (p.id !== activeId) return p;
        const next = JSON.parse(JSON.stringify(p)) as Repartition108h;
        mut(next);
        next.updatedAt = Date.now();
        return next;
      }),
    );
  }, [activeId]);

  const onAddSchool = () => {
    const id = `r${Date.now()}`;
    setItems((prev) => [...prev, makeEmptyRepartition(id)]);
    setActiveId(id);
    setToast('Nouvelle école ajoutée.');
  };

  const onExport = async () => {
    try {
      await exportAll(items);
      setToast(items.length > 1 ? `${items.length} fichiers générés.` : 'Export généré.');
    } catch {
      setToast("L'export a échoué.");
    }
  };

  const onImport = async (file: File) => {
    try {
      const imported = await importRepartition(file);
      if (imported.length === 0) {
        setToast('Aucune donnée trouvée.');
        return;
      }
      setItems((prev) => [...prev, ...imported]);
      setActiveId(imported[0].id);
      setToast(`Import : ${imported.length} fiche${imported.length > 1 ? 's' : ''} ajoutée${imported.length > 1 ? 's' : ''}.`);
    } catch (e) {
      console.error(e);
      setToast("L'import a échoué.");
    }
  };

  const onRemoveSchool = () => {
    if (items.length <= 1) {
      const empty = makeEmptyRepartition(active.id, active.anneeN);
      setItems([empty]);
      setActiveId(empty.id);
      setToast('Fiche réinitialisée.');
      return;
    }
    setItems((prev) => prev.filter((p) => p.id !== activeId));
    const remain = items.filter((p) => p.id !== activeId);
    if (remain.length) setActiveId(remain[0].id);
    setToast('École supprimée.');
  };

  const stats = useMemo(() => (active ? computeStats(active) : null), [active]);

  if (!active || !stats) return null;

  const onCellClick = (key: string) => {
    update((p) => {
      const cur = p.selections[key];
      if (!cur) {
        p.selections[key] = { category: activeCategory, slots: 1 };
        return;
      }
      if (cur.category !== activeCategory) {
        p.selections[key] = { category: activeCategory, slots: 1 };
        return;
      }
      const next = cur.slots + 1;
      if (next > MAX_SLOTS_PER_DAY) {
        delete p.selections[key];
      } else {
        p.selections[key] = { category: activeCategory, slots: next };
      }
    });
  };

  const onCellRightClick = (key: string) => {
    update((p) => {
      delete p.selections[key];
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <AuroraHeader
        kicker={`OUTIL DIRECTEURS · ${active.anneeN}`}
        title="Répartition des"
        titleAccent="108 heures."
        subtitle="Coloriez votre calendrier de l'année par catégorie d'activité, puis détaillez chaque période. Multi-école, sauvegarde locale, export Excel."
        backLabel="Retour à l'accueil"
        padding="py-10 md:py-12"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xlsm"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImport(f);
                if (fileRef.current) fileRef.current.value = '';
              }}
            />
            <TopBtn onClick={() => fileRef.current?.click()} icon={<UploadIcon />} label="Importer .xlsx" />
            <TopBtn onClick={onExport} icon={<DownloadIcon />} label="Exporter .xlsx" primary />
          </div>
        }
      >
        <SchoolTabs
          items={items}
          activeId={activeId}
          onSelect={setActiveId}
          onAdd={onAddSchool}
          onRemove={(id) => {
            if (items.length <= 1) {
              onRemoveSchool();
              return;
            }
            setItems((prev) => prev.filter((p) => p.id !== id));
            const remain = items.filter((p) => p.id !== id);
            if (remain.length && id === activeId) setActiveId(remain[0].id);
            setToast('École supprimée.');
          }}
        />
      </AuroraHeader>

      <main className="mx-auto w-full max-w-[1720px] px-4 md:px-6 pb-16 -mt-4 relative z-10">
        <IdentityBlock
          item={active}
          onChange={(patch) =>
            update((p) => {
              Object.assign(p, patch);
            })
          }
        />

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <ViewBtn label="Calendrier annuel" active={view === 'calendar'} onClick={() => setView('calendar')} />
          <ViewBtn label="Périodes" active={view === 'periode'} onClick={() => setView('periode')} />
          <ViewBtn label="Récap 108h" active={view === 'recap'} onClick={() => setView('recap')} />
        </div>

        {view === 'calendar' && (
          <CalendarView
            item={active}
            stats={stats}
            activeCategory={activeCategory}
            onSetCategory={setActiveCategory}
            onCellClick={onCellClick}
            onCellRightClick={onCellRightClick}
          />
        )}

        {view === 'periode' && (
          <PeriodesView
            item={active}
            periode={activePeriode}
            onSelectPeriode={setActivePeriode}
            onUpdate={update}
          />
        )}

        {view === 'recap' && <RecapView item={active} stats={stats} />}
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 text-white text-sm px-4 py-2 shadow-lg z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SchoolTabs({
  items,
  activeId,
  onSelect,
  onAdd,
  onRemove,
}: {
  items: Repartition108h[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((p) => {
        const isActive = p.id === activeId;
        const label = p.ecole.trim() || 'Nouvelle école';
        return (
          <motion.div
            key={p.id}
            layout
            className={`relative inline-flex items-center gap-1 rounded-full pl-3.5 pr-1 py-1 text-[13px] font-semibold transition-all border ${
              isActive
                ? 'bg-white text-primary-700 border-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.3)]'
                : 'bg-white/10 backdrop-blur-md text-white/90 border-white/20 hover:bg-white/20'
            }`}
          >
            <button onClick={() => onSelect(p.id)} className="py-1 inline-flex items-center gap-1.5">
              <span className="truncate max-w-[220px]">{label}</span>
              <span
                className={`text-[10px] uppercase tracking-wide font-medium ${
                  isActive ? 'text-primary-700/60' : 'text-white/60'
                }`}
              >
                {p.type === 'maternelle' ? 'Mat.' : 'Élé.'}
              </span>
            </button>
            {items.length > 1 && (
              <button
                onClick={() => onRemove(p.id)}
                aria-label="Supprimer cette école"
                className={`w-6 h-6 inline-flex items-center justify-center rounded-full transition-colors ${
                  isActive
                    ? 'hover:bg-rose-100 text-slate-400 hover:text-rose-600'
                    : 'hover:bg-white/20 text-white/70 hover:text-white'
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
        className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/25 border-dashed px-3 py-1.5 text-[13px] font-semibold transition-all"
      >
        <PlusIcon />
        Ajouter une école
      </button>
    </div>
  );
}

function IdentityBlock({
  item,
  onChange,
}: {
  item: Repartition108h;
  onChange: (patch: Partial<Repartition108h>) => void;
}) {
  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.02),0_24px_50px_-32px_rgba(15,90,120,0.18)] p-5 md:p-6">
      <div className="grid gap-4 md:grid-cols-4">
        <FieldText
          label="École"
          value={item.ecole}
          onChange={(v) => onChange({ ecole: v })}
          placeholder="EEPU Cayenne 2"
        />
        <FieldText
          label="Auteur"
          value={item.auteur}
          onChange={(v) => onChange({ auteur: v })}
          placeholder="Nom du directeur"
        />
        <FieldText
          label="Année"
          value={item.anneeN}
          onChange={(v) => onChange({ anneeN: v })}
          placeholder="2025-2026"
        />
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Type d'école
          </label>
          <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              onClick={() => onChange({ type: 'elementaire' })}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
                item.type === 'elementaire' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              Élémentaire <span className="text-[10px] opacity-70">1h/case</span>
            </button>
            <button
              onClick={() => onChange({ type: 'maternelle' })}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
                item.type === 'maternelle' ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              Maternelle <span className="text-[10px] opacity-70">30min/case</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldText({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
      />
    </label>
  );
}

function ViewBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${
        active
          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
      }`}
    >
      {label}
    </button>
  );
}

function CalendarView({
  item,
  stats,
  activeCategory,
  onSetCategory,
  onCellClick,
  onCellRightClick,
}: {
  item: Repartition108h;
  stats: ReturnType<typeof computeStats>;
  activeCategory: CategoryKey;
  onSetCategory: (k: CategoryKey) => void;
  onCellClick: (key: string) => void;
  onCellRightClick: (key: string) => void;
}) {
  const [yStart] = getYearsFromAnnee(item.anneeN);

  const months = useMemo(() => {
    return MOIS_INDICES.map((monthIdx0, i) => {
      const year = monthIdx0 >= 8 ? yStart : yStart + 1;
      const days: { day: number; weekday: number; key: string }[] = [];
      const total = daysInMonth(year, monthIdx0);
      for (let d = 1; d <= total; d++) {
        const dt = new Date(year, monthIdx0, d);
        days.push({ day: d, weekday: dt.getDay(), key: dayKey(year, monthIdx0, d) });
      }
      return { label: MOIS_LABELS[i], year, monthIdx0, days };
    });
  }, [yStart]);

  return (
    <div className="mt-5 space-y-5">
      <CategoryPalette active={activeCategory} onSelect={onSetCategory} item={item} stats={stats} />
      <div className="rounded-3xl bg-white border border-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.02),0_24px_50px_-32px_rgba(15,90,120,0.18)] p-4 md:p-6">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <CalIcon />
          <span>
            Click pour appliquer la catégorie active · re-click sur la même cellule incrémente l'heure (max{' '}
            {MAX_SLOTS_PER_DAY}) · click droit pour effacer
          </span>
        </div>
        <div className="grid gap-x-3 gap-y-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {months.map((m) => (
            <MonthGrid
              key={`${m.year}-${m.monthIdx0}`}
              label={m.label}
              days={m.days}
              selections={item.selections}
              onCellClick={onCellClick}
              onCellRightClick={onCellRightClick}
              hoursPerSlot={stats.hoursPerSlot}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoryPalette({
  active,
  onSelect,
  item,
  stats,
}: {
  active: CategoryKey;
  onSelect: (k: CategoryKey) => void;
  item: Repartition108h;
  stats: ReturnType<typeof computeStats>;
}) {
  const fmt = (h: number) => h.toFixed(item.type === 'maternelle' ? 1 : 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
      className="relative rounded-3xl border border-slate-200 bg-white p-5 md:p-6 shadow-[0_1px_0_rgba(15,23,42,0.02),0_24px_50px_-32px_rgba(15,90,120,0.18)] overflow-hidden"
    >
      {/* Subtle aurora glow */}
      <div className="absolute inset-0 opacity-70 pointer-events-none" aria-hidden>
        <div
          className="absolute -top-32 -left-20 w-[420px] h-[420px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(157,195,230,0.18) 0%, transparent 60%)',
          }}
        />
        <div
          className="absolute -bottom-32 -right-20 w-[420px] h-[420px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(197,224,180,0.20) 0%, transparent 60%)',
          }}
        />
      </div>
      {/* Inner highlight */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)' }}
      />

      <div className="relative flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 mr-1">
          <span className="relative flex h-2 w-2" aria-hidden>
            <span className="absolute inset-0 rounded-full bg-[#45b8a0] animate-ping opacity-60" />
            <span className="relative h-2 w-2 rounded-full bg-[#45b8a0]" />
          </span>
          <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-slate-500">
            Catégorie active
          </span>
        </div>

        {CATEGORIES.map((c) => (
          <CategoryChip
            key={c.key}
            category={c}
            active={c.key === active}
            hours={fmt(stats.hoursByCategory[c.key])}
            onClick={() => onSelect(c.key)}
          />
        ))}

        <div className="ml-auto flex items-center gap-2">
          <HourPill
            label="Total"
            value={`${fmt(stats.totalHours)}/${TOTAL_HOURS}`}
            gradient="from-[#1e5a78] to-[#45b8a0]"
          />
          <HourPill
            label={stats.remaining < 0 ? 'Excédent' : stats.remaining === 0 ? 'Atteint' : 'Reste'}
            value={fmt(Math.abs(stats.remaining))}
            gradient={
              stats.remaining < 0
                ? 'from-rose-500 to-pink-500'
                : stats.remaining === 0
                ? 'from-emerald-400 to-teal-500'
                : 'from-amber-400 to-orange-500'
            }
          />
        </div>
      </div>
    </motion.div>
  );
}

function CategoryChip({
  category,
  active,
  hours,
  onClick,
}: {
  category: (typeof CATEGORIES)[number];
  active: boolean;
  hours: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      className={`group relative inline-flex items-center gap-2 rounded-2xl pl-1.5 pr-3 py-1.5 text-sm font-semibold border transition-[border-color,background-color,box-shadow] duration-200 ${
        active
          ? 'border-white/40'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow-sm'
      }`}
      style={
        active
          ? {
              backgroundColor: category.color,
              color: category.textColor,
              boxShadow: `0 10px 28px -8px ${category.color}, inset 0 1px 0 rgba(255,255,255,0.45)`,
            }
          : undefined
      }
    >
      <span
        className="relative flex items-center justify-center w-7 h-7 rounded-xl text-[10px] font-bold tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
        style={
          active
            ? { backgroundColor: 'rgba(255,255,255,0.28)', color: category.textColor }
            : { backgroundColor: category.color, color: category.textColor }
        }
      >
        {hours}
        {active && (
          <motion.span
            layoutId="cat-active-ring"
            className="absolute inset-0 rounded-xl ring-2 ring-white/70"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
      </span>
      <span className="tracking-tight">{category.label}</span>
    </motion.button>
  );
}

function HourPill({
  label,
  value,
  gradient,
}: {
  label: string;
  value: string;
  gradient: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 320, damping: 20 }}
      className="relative inline-flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] overflow-hidden"
    >
      <div
        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-[11px] tabular-nums shadow-[0_8px_18px_-6px_rgba(15,90,120,0.45),inset_0_1px_0_rgba(255,255,255,0.3)]`}
      >
        {value}
      </div>
      <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500 pr-1">
        {label}
      </span>
    </motion.div>
  );
}

function MonthGrid({
  label,
  days,
  selections,
  onCellClick,
  onCellRightClick,
  hoursPerSlot,
}: {
  label: string;
  days: { day: number; weekday: number; key: string }[];
  selections: Record<string, { category: CategoryKey; slots: number }>;
  onCellClick: (key: string) => void;
  onCellRightClick: (key: string) => void;
  hoursPerSlot: number;
}) {
  return (
    <div>
      <div className="text-[12px] font-semibold uppercase tracking-wider text-slate-700 mb-1.5">{label}</div>
      <div className="grid grid-cols-[auto_auto_1fr] gap-x-2 gap-y-0.5 text-[12px]">
        {days.map(({ day, weekday, key }) => {
          const sel = selections[key];
          const cat = sel ? CATEGORY_BY_KEY[sel.category] : null;
          const isWE = weekday === 0 || weekday === 6;
          return (
            <div key={key} className="contents">
              <span className={`tabular-nums text-right pr-1 ${isWE ? 'text-slate-400' : 'text-slate-500'}`}>
                {JOURS_COURTS[weekday]}
              </span>
              <span className={`tabular-nums w-5 text-right ${isWE ? 'text-slate-400' : 'text-slate-700'}`}>
                {day}
              </span>
              <button
                onClick={() => onCellClick(key)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onCellRightClick(key);
                }}
                title={
                  sel
                    ? `${cat?.label} — ${(sel.slots * hoursPerSlot).toFixed(hoursPerSlot < 1 ? 1 : 0)}h`
                    : 'Click pour colorier'
                }
                className={`h-5 rounded text-[10px] font-medium transition border ${
                  sel ? 'border-transparent shadow-inner' : isWE ? 'bg-slate-100 border-slate-200/60' : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
                style={
                  sel
                    ? { backgroundColor: cat!.color, color: cat!.textColor }
                    : undefined
                }
              >
                {sel ? `${(sel.slots * hoursPerSlot).toFixed(hoursPerSlot < 1 ? 1 : 0)}h` : ''}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PeriodesView({
  item,
  periode,
  onSelectPeriode,
  onUpdate,
}: {
  item: Repartition108h;
  periode: Periode;
  onSelectPeriode: (p: Periode) => void;
  onUpdate: (mut: (p: Repartition108h) => void) => void;
}) {
  const events = item.periodes[periode] || [];
  const note = item.notes[periode] || '';
  const bounds = item.periodeBounds[periode];
  const hoursPerSlot = HOURS_PER_SLOT[item.type];

  const periodHours = useMemo(() => {
    const acc: Record<CategoryKey, number> = CATEGORIES.reduce(
      (a, c) => ({ ...a, [c.key]: 0 }),
      {} as Record<CategoryKey, number>,
    );
    for (const [d, sel] of Object.entries(item.selections)) {
      if (d >= bounds.start && d <= bounds.end) {
        acc[sel.category] = (acc[sel.category] || 0) + sel.slots * hoursPerSlot;
      }
    }
    return acc;
  }, [item.selections, bounds.start, bounds.end, hoursPerSlot]);

  const eventsByCategory = useMemo(() => {
    const acc: Record<CategoryKey, PeriodeEvent[]> = CATEGORIES.reduce(
      (a, c) => ({ ...a, [c.key]: [] as PeriodeEvent[] }),
      {} as Record<CategoryKey, PeriodeEvent[]>,
    );
    for (const ev of events) acc[ev.category].push(ev);
    return acc;
  }, [events]);

  const ensureRows = (cat: CategoryKey, rows: number) => {
    onUpdate((p) => {
      const arr = p.periodes[periode];
      const have = arr.filter((e) => e.category === cat).length;
      const need = rows - have;
      for (let i = 0; i < need; i++) {
        arr.push({ id: crypto.randomUUID(), category: cat, date: '', objet: '', theme: '' });
      }
    });
  };

  const updateEvent = (id: string, patch: Partial<PeriodeEvent>) => {
    onUpdate((p) => {
      const arr = p.periodes[periode];
      const idx = arr.findIndex((e) => e.id === id);
      if (idx >= 0) arr[idx] = { ...arr[idx], ...patch };
    });
  };

  const removeEvent = (id: string) => {
    onUpdate((p) => {
      p.periodes[periode] = p.periodes[periode].filter((e) => e.id !== id);
    });
  };

  const setNote = (text: string) => {
    onUpdate((p) => {
      p.notes[periode] = text;
    });
  };

  const setBounds = (which: 'start' | 'end', value: string) => {
    onUpdate((p) => {
      p.periodeBounds[periode] = { ...p.periodeBounds[periode], [which]: value };
    });
  };

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {PERIODES.map((p) => (
          <button
            key={p}
            onClick={() => onSelectPeriode(p)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition border ${
              p === periode
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            Période {p}
          </button>
        ))}
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5 md:p-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-[auto_auto_1fr] md:items-end">
          <label className="block">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Début période
            </span>
            <input
              type="date"
              value={bounds.start}
              onChange={(e) => setBounds('start', e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Fin période
            </span>
            <input
              type="date"
              value={bounds.end}
              onChange={(e) => setBounds('end', e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-2 justify-end">
            {CATEGORIES.map((c) => (
              <span
                key={c.key}
                className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-xs font-medium border border-slate-200"
                style={{ backgroundColor: c.color + '60', color: c.textColor }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.textColor }} />
                {c.shortLabel}
                <span className="tabular-nums opacity-80">
                  {periodHours[c.key].toFixed(item.type === 'maternelle' ? 1 : 0)}h
                </span>
              </span>
            ))}
          </div>
        </div>

        {PERIODE_CATEGORIES.map(({ key: catKey, defaultRows }) => {
          const cat = CATEGORY_BY_KEY[catKey];
          const list = eventsByCategory[catKey];
          return (
            <div key={catKey} className="space-y-2">
              <div className="flex items-center gap-3">
                <div
                  className="rounded-lg px-3 py-1 text-sm font-semibold"
                  style={{ backgroundColor: cat.color, color: cat.textColor }}
                >
                  {cat.label}
                </div>
                <span className="text-xs text-slate-500">
                  {list.length} ligne{list.length > 1 ? 's' : ''}
                </span>
                <button
                  onClick={() =>
                    onUpdate((p) => {
                      p.periodes[periode].push({
                        id: crypto.randomUUID(),
                        category: catKey,
                        date: '',
                        objet: '',
                        theme: '',
                      });
                    })
                  }
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-slate-300"
                >
                  <PlusIcon /> Ajouter une ligne
                </button>
                {list.length === 0 && (
                  <button
                    onClick={() => ensureRows(catKey, defaultRows)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-slate-300"
                  >
                    Pré-remplir ({defaultRows} lignes)
                  </button>
                )}
              </div>

              {list.length > 0 && (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="text-left font-semibold px-3 py-2 w-32">Date</th>
                        <th className="text-left font-semibold px-3 py-2 w-1/3">Objet</th>
                        <th className="text-left font-semibold px-3 py-2">Thème</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((ev) => (
                        <tr key={ev.id} className="border-t border-slate-200/60">
                          <td className="px-3 py-1.5">
                            <input
                              type="date"
                              value={ev.date}
                              min={bounds.start}
                              max={bounds.end}
                              onChange={(e) => updateEvent(ev.id, { date: e.target.value })}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none w-full"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              value={ev.objet}
                              onChange={(e) => updateEvent(ev.id, { objet: e.target.value })}
                              placeholder="conseil de cycle, équipe pédagogique…"
                              className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none w-full"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              value={ev.theme}
                              onChange={(e) => updateEvent(ev.id, { theme: e.target.value })}
                              placeholder="précision, thématique…"
                              className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none w-full"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            <button
                              onClick={() => removeEvent(ev.id)}
                              title="Supprimer la ligne"
                              className="text-slate-400 hover:text-rose-600 p-1"
                            >
                              <TrashIcon />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Précisions sur la période
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="Notes libres, contexte, événements particuliers…"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
        </div>
      </div>
    </div>
  );
}

function RecapView({ item, stats }: { item: Repartition108h; stats: ReturnType<typeof computeStats> }) {
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Récap CALCUL 108H</h2>
        <div className="grid gap-3 md:grid-cols-5">
          {CATEGORIES.map((c) => (
            <div
              key={c.key}
              className="rounded-2xl p-4 border border-slate-200 flex flex-col gap-1"
              style={{ backgroundColor: c.color + '40' }}
            >
              <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: c.textColor }}>
                {c.label}
              </div>
              <div className="text-2xl font-semibold tabular-nums" style={{ color: c.textColor }}>
                {stats.hoursByCategory[c.key].toFixed(item.type === 'maternelle' ? 1 : 0)}
                <span className="text-sm font-normal opacity-70 ml-1">h</span>
              </div>
              <div className="text-xs text-slate-600">
                {stats.slotsByCategory[c.key]} case{stats.slotsByCategory[c.key] > 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <StatCard label="Total réparti" value={`${stats.totalHours.toFixed(item.type === 'maternelle' ? 1 : 0)}h`} sub={`${stats.totalSlots} cases · ${stats.daysWithSelection} jours`} />
          <StatCard label="Objectif" value={`${TOTAL_HOURS}h`} sub="Année scolaire" />
          <StatCard
            label={stats.remaining < 0 ? 'Excédent' : 'Reste'}
            value={`${Math.abs(stats.remaining).toFixed(item.type === 'maternelle' ? 1 : 0)}h`}
            sub={stats.remaining < 0 ? 'Au-delà des 108h' : 'À répartir encore'}
            tone={stats.remaining < 0 ? 'rose' : stats.remaining === 0 ? 'emerald' : 'amber'}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone = 'slate',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'slate' | 'emerald' | 'amber' | 'rose';
}) {
  const toneClasses: Record<string, string> = {
    slate: 'bg-slate-50 border-slate-200 text-slate-800',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    rose: 'bg-rose-50 border-rose-200 text-rose-800',
  };
  return (
    <div className={`rounded-2xl p-4 border ${toneClasses[tone]}`}>
      <div className="text-[11px] uppercase tracking-wider font-semibold opacity-80">{label}</div>
      <div className="text-2xl font-semibold tabular-nums mt-0.5">{value}</div>
      {sub && <div className="text-xs opacity-70 mt-0.5">{sub}</div>}
    </div>
  );
}

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

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function CalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

