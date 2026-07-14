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
  Repartition108hPubliee,
  TOTAL_HOURS,
  computeStats,
  dayKey,
  ecoleTypeToKind,
  makeEmptyRepartition,
  publicationToRepartition,
  repartitionToApiPayload,
} from './types';
import { exportAll, importRepartition } from './xlsx-io';

// Annuaire — directeur aplati avec son école associée.
type Directeur = {
  id: string;
  name: string;
  ecoleId: string;
  ecoleName: string;
  ecoleType?: string | null;
};

// Discrimine ce qui est affiché : un brouillon local éditable, ou une fiche
// publiée affichée en lecture seule.
type Selection =
  | { kind: 'draft'; id: string }
  | { kind: 'published'; ecoleId: string };

const PERIODE_CATEGORIES: { key: CategoryKey; defaultRows: number }[] = [
  { key: 'concertation', defaultRows: 7 },
  { key: 'conseil-ecole', defaultRows: 7 },
  { key: 'apc', defaultRows: 3 },
  { key: 'organisation', defaultRows: 7 },
];

const SCHOOL_GRADIENTS = [
  'from-sky-500 to-cyan-500',
  'from-rose-400 to-pink-500',
  'from-violet-500 to-fuchsia-500',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-indigo-500 to-blue-500',
];

const STORAGE_KEY = 'repartition-108h:v1';
const LAST_DIRECTEUR_KEY = 'repartition-108h:last-directeur';
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
      safe.ecoleId = p.ecoleId ?? '';
      safe.directeurId = p.directeurId ?? '';
      safe.ecole = p.ecole ?? '';
      safe.auteur = p.auteur ?? '';
      safe.type = p.type === 'maternelle' ? 'maternelle' : 'elementaire';
      const rawSel = p.selections && typeof p.selections === 'object' ? p.selections : {};
      safe.selections = {};
      for (const [dKey, sel] of Object.entries(rawSel)) {
        if (!sel || typeof sel !== 'object') continue;
        const slots = Math.max(1, Math.min(MAX_SLOTS_PER_DAY, Number(sel.slots) || 1));
        safe.selections[dKey] = { category: sel.category, slots };
      }
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
  const [selection, setSelection] = useState<Selection>({ kind: 'draft', id: 'r1' });
  const [hydrated, setHydrated] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('concertation');
  const [view, setView] = useState<'calendar' | 'periode' | 'recap'>('calendar');
  const [activePeriode, setActivePeriode] = useState<Periode>(1);
  const [toast, setToast] = useState<string | null>(null);
  const [directeurs, setDirecteurs] = useState<Directeur[]>([]);
  const [publications, setPublications] = useState<Repartition108hPubliee[]>([]);
  const [publishing, setPublishing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = loadFromStorage();
    if (stored && stored.length > 0) {
      setItems(stored);
      setSelection({ kind: 'draft', id: stored[0].id });
    }
    setHydrated(true);
  }, []);

  // Chargement des répartitions déjà publiées (visibles par tous, sans auth).
  const refreshPublications = useCallback(async () => {
    try {
      const res = await fetch('/api/repartitions-108h', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as Repartition108hPubliee[];
      if (Array.isArray(data)) setPublications(data);
    } catch {
      /* publications indispo — la page reste utilisable en brouillon local */
    }
  }, []);

  useEffect(() => {
    refreshPublications();
  }, [refreshPublications]);

  // Chargement de l'annuaire — aplati en une liste de directeurs avec leur école.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/annuaire');
        if (!res.ok) return;
        const data = (await res.json()) as {
          ecoles?: { id: string; name: string; type?: string | null; directors?: { id: string; name: string }[] }[];
        };
        const flat: Directeur[] = [];
        for (const ec of data.ecoles ?? []) {
          for (const d of ec.directors ?? []) {
            flat.push({ id: d.id, name: d.name, ecoleId: ec.id, ecoleName: ec.name, ecoleType: ec.type });
          }
        }
        flat.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        if (!cancelled) setDirecteurs(flat);
      } catch {
        /* annuaire indispo — la page reste utilisable en brouillon local */
      }
    })();
    return () => {
      cancelled = true;
    };
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

  const active = useMemo<Repartition108h | null>(() => {
    if (selection.kind === 'draft') {
      return items.find((p) => p.id === selection.id) ?? items[0] ?? null;
    }
    const pub = publications.find((p) => p.ecole_id === selection.ecoleId);
    if (!pub) return items[0] ?? null;
    return publicationToRepartition(pub, `pub:${pub.ecole_id}`);
  }, [selection, items, publications]);

  const readOnly = selection.kind === 'published';

  const update = useCallback((mut: (p: Repartition108h) => void) => {
    if (selection.kind !== 'draft') return;
    const draftId = selection.id;
    setItems((prev) =>
      prev.map((p) => {
        if (p.id !== draftId) return p;
        const next = JSON.parse(JSON.stringify(p)) as Repartition108h;
        mut(next);
        next.updatedAt = Date.now();
        return next;
      }),
    );
  }, [selection]);

  // Premier visiteur : si tous les brouillons sont vides et qu'au moins une fiche
  // est publiée, on bascule sur la plus récente pour afficher du contenu.
  useEffect(() => {
    if (!hydrated || publications.length === 0) return;
    if (selection.kind !== 'draft') return;
    const allEmpty = items.every((p) => !p.directeurId && !hasAnyData(p));
    if (!allEmpty) return;
    setSelection({ kind: 'published', ecoleId: publications[0].ecole_id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, publications]);

  const onAddSchool = () => {
    const id = `r${Date.now()}`;
    const fresh = makeEmptyRepartition(id);
    // Pré-remplit le dernier directeur choisi pour éviter de le re-sélectionner.
    try {
      const lastId = localStorage.getItem(LAST_DIRECTEUR_KEY);
      if (lastId) {
        const d = directeurs.find((x) => x.id === lastId);
        if (d) {
          fresh.directeurId = d.id;
          fresh.ecoleId = d.ecoleId;
          fresh.auteur = d.name;
          fresh.ecole = d.ecoleName;
          fresh.type = ecoleTypeToKind(d.ecoleType);
        }
      }
    } catch {
      /* localStorage indispo */
    }
    setItems((prev) => [...prev, fresh]);
    setSelection({ kind: 'draft', id });
    setToast('Nouvelle école ajoutée.');
  };

  const canPublish = !readOnly && Boolean(active?.directeurId && active?.ecoleId);
  const canExport = Boolean(active?.directeurId && active?.ecoleId);

  const onExport = async () => {
    if (!active) return;
    if (!canExport) {
      setToast('Sélectionnez votre nom dans la liste avant d’exporter.');
      return;
    }
    try {
      await exportAll([active]);
      setToast('Export généré.');
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
      setSelection({ kind: 'draft', id: imported[0].id });
      setToast(`Import : ${imported.length} fiche${imported.length > 1 ? 's' : ''} ajoutée${imported.length > 1 ? 's' : ''}.`);
    } catch (e) {
      console.error(e);
      setToast("L'import a échoué.");
    }
  };

  // Suppression d'un brouillon (les publications ne se suppriment pas ici).
  const removeDraft = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (next.length === 0) {
        const empty = makeEmptyRepartition(crypto.randomUUID());
        setSelection({ kind: 'draft', id: empty.id });
        return [empty];
      }
      if (selection.kind === 'draft' && id === selection.id) {
        setSelection({ kind: 'draft', id: next[0].id });
      }
      return next;
    });
    setToast('École supprimée.');
  };

  // Ouvre une publication en édition : bascule sur le brouillon existant pour
  // cette école, ou duplique la fiche publiée en nouveau brouillon local.
  const onEditPublication = () => {
    if (selection.kind !== 'published') return;
    const pub = publications.find((p) => p.ecole_id === selection.ecoleId);
    if (!pub) return;
    const existing = items.find((p) => p.ecoleId === pub.ecole_id);
    if (existing) {
      setSelection({ kind: 'draft', id: existing.id });
      setToast('Brouillon existant chargé — vos modifications en cours sont préservées.');
      return;
    }
    const draft = publicationToRepartition(pub, `r${Date.now()}`);
    setItems((prev) => [...prev, draft]);
    setSelection({ kind: 'draft', id: draft.id });
    setToast('Fiche chargée — republiez pour mettre à jour la version visible.');
  };

  const onPublish = async () => {
    if (!active || !canPublish || publishing || readOnly) return;
    if (selection.kind !== 'draft') return;
    const draftId = selection.id;
    const ecoleId = active.ecoleId;
    const ecoleLabel = active.ecole;
    setPublishing(true);
    try {
      const res = await fetch('/api/repartitions-108h', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repartitionToApiPayload(active)),
      });
      if (!res.ok) {
        const txt = await res.json().catch(() => ({}));
        setToast(txt?.message || 'Publication impossible.');
        return;
      }
      await refreshPublications();
      setItems((prev) => prev.filter((d) => d.id !== draftId));
      setSelection({ kind: 'published', ecoleId });
      setToast(`« ${ecoleLabel} » est publiée — visible par tous.`);
    } catch {
      setToast('Publication impossible — vérifiez la connexion.');
    } finally {
      setPublishing(false);
    }
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
            {!readOnly && (
              <TopBtn onClick={() => fileRef.current?.click()} icon={<UploadIcon />} label="Importer .xlsx" />
            )}
            <TopBtn
              onClick={onExport}
              icon={<DownloadIcon />}
              label="Exporter .xlsx"
              disabled={!canExport}
              disabledTitle="Sélectionnez votre nom dans la liste pour exporter."
            />
            {readOnly ? (
              <TopBtn onClick={onEditPublication} icon={<EditIcon />} label="Modifier cette fiche" primary />
            ) : (
              <TopBtn
                onClick={onPublish}
                icon={publishing ? <SpinnerIcon /> : <SendIcon />}
                label={publishing ? 'Publication…' : 'Publier'}
                primary
                disabled={!canPublish || publishing}
                disabledTitle="Sélectionnez votre nom dans la liste pour publier."
              />
            )}
          </div>
        }
      >
        <SchoolTabs
          drafts={items}
          publications={publications}
          selection={selection}
          onSelect={setSelection}
          onAdd={onAddSchool}
          onRemoveDraft={removeDraft}
        />
      </AuroraHeader>

      <main className="mx-auto w-full max-w-[1720px] px-4 md:px-6 pb-16 -mt-4 relative z-10">
        <IdentityBlock
          item={active}
          directeurs={directeurs}
          readOnly={readOnly}
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
            readOnly={readOnly}
          />
        )}

        {view === 'periode' && (
          <PeriodesView
            item={active}
            periode={activePeriode}
            onSelectPeriode={setActivePeriode}
            onUpdate={update}
            readOnly={readOnly}
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

function hasAnyData(p: Repartition108h) {
  if (p.ecole.trim() || p.auteur.trim()) return true;
  if (Object.keys(p.selections).length > 0) return true;
  for (const k of PERIODES) {
    if ((p.periodes[k] || []).length > 0) return true;
    if ((p.notes[k] || '').trim()) return true;
  }
  return false;
}

function SchoolTabs({
  drafts,
  publications,
  selection,
  onSelect,
  onAdd,
  onRemoveDraft,
}: {
  drafts: Repartition108h[];
  publications: Repartition108hPubliee[];
  selection: Selection;
  onSelect: (s: Selection) => void;
  onAdd: () => void;
  onRemoveDraft: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const totalCount = drafts.length + publications.length;
  const showSearch = totalCount > 8;
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const q = norm(query.trim());

  const sortedPubs = useMemo(
    () =>
      [...publications].sort(
        (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
      ),
    [publications],
  );
  const visiblePubs = q
    ? sortedPubs.filter((p) => norm(p.ecole_name).includes(q) || norm(p.directeur_name).includes(q))
    : sortedPubs;
  const visibleDrafts = q
    ? drafts.filter((p) => norm(p.ecole).includes(q) || norm(p.auteur).includes(q))
    : drafts;

  const typeLabel = (t: string) => (t === 'maternelle' ? 'Maternelle' : 'Élémentaire');

  return (
    <div className="flex flex-col gap-2">
      {showSearch && (
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50">
              <SearchIcon />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une école ou un directeur…"
              className="bg-white/10 border border-white/15 rounded-full pl-8 pr-3 py-1.5 text-[12px] text-white placeholder:text-white/40 w-72 outline-none focus:border-white/40 focus:bg-white/15"
            />
          </div>
          <span className="text-[10px] text-white/40">
            {visiblePubs.length + visibleDrafts.length} / {totalCount}
          </span>
        </div>
      )}

      {visiblePubs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/50 mr-1">
            Publiées ({publications.length})
          </span>
          {visiblePubs.map((pub, i) => {
            const isActive = selection.kind === 'published' && selection.ecoleId === pub.ecole_id;
            const gradient = SCHOOL_GRADIENTS[i % SCHOOL_GRADIENTS.length];
            return (
              <motion.div
                key={pub.ecole_id}
                layout
                onClick={() => onSelect({ kind: 'published', ecoleId: pub.ecole_id })}
                className={`group relative inline-flex items-center gap-2 px-3 py-2 md:py-1.5 rounded-full border text-[11px] font-semibold tracking-wide transition-all duration-200 cursor-pointer active:scale-95 ${
                  isActive
                    ? `bg-gradient-to-r ${gradient} text-white border-transparent shadow-lg shadow-black/20`
                    : 'bg-white/10 border-white/15 text-white/85 hover:bg-white/15 hover:text-white hover:border-white/30'
                }`}
                title={`Publiée le ${new Date(pub.published_at).toLocaleDateString('fr-FR')} par ${pub.directeur_name}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : `bg-gradient-to-r ${gradient}`}`} />
                <span className="truncate max-w-[220px]">{pub.ecole_name}</span>
                <span className={`font-normal ${isActive ? 'text-white/90' : 'text-white/55'}`}>
                  · {typeLabel(pub.type)}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {drafts.length > 0 && (
          <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/50 mr-1">
            Mes brouillons ({drafts.length})
          </span>
        )}
        {visibleDrafts.map((p, i) => {
          const isActive = selection.kind === 'draft' && p.id === selection.id;
          const gradient = SCHOOL_GRADIENTS[i % SCHOOL_GRADIENTS.length];
          const label = p.ecole.trim() || 'Nouvelle école';
          return (
            <motion.div
              key={p.id}
              layout
              onClick={() => onSelect({ kind: 'draft', id: p.id })}
              className={`group relative inline-flex items-center gap-2 px-3 py-2 md:py-1.5 rounded-full border-2 border-dashed text-[11px] font-semibold tracking-wide transition-all duration-200 cursor-pointer active:scale-95 ${
                isActive
                  ? `bg-gradient-to-r ${gradient} text-white border-white/50 shadow-lg shadow-black/20`
                  : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/40'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : `bg-gradient-to-r ${gradient}`}`} />
              <span className="truncate max-w-[220px]">{label}</span>
              <span className={`font-normal ${isActive ? 'text-white/90' : 'text-white/50'}`}>
                · {typeLabel(p.type)}
              </span>
              {drafts.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDraft(p.id);
                  }}
                  aria-label="Supprimer ce brouillon"
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
          <PlusIcon />
          Ajouter une école
        </button>
      </div>
    </div>
  );
}

function IdentityBlock({
  item,
  directeurs,
  readOnly,
  onChange,
}: {
  item: Repartition108h;
  directeurs: Directeur[];
  readOnly?: boolean;
  onChange: (patch: Partial<Repartition108h>) => void;
}) {
  const directeurSelected = Boolean(item.directeurId);

  const onPickDirecteur = (id: string) => {
    if (!id) {
      onChange({ directeurId: '', ecoleId: '', auteur: '', ecole: '' });
      return;
    }
    const d = directeurs.find((x) => x.id === id);
    if (!d) return;
    onChange({
      directeurId: d.id,
      ecoleId: d.ecoleId,
      auteur: d.name,
      ecole: d.ecoleName,
      type: ecoleTypeToKind(d.ecoleType),
    });
    try {
      localStorage.setItem(LAST_DIRECTEUR_KEY, d.id);
    } catch {
      /* localStorage indispo */
    }
  };

  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.02),0_24px_50px_-32px_rgba(15,90,120,0.18)] p-5 md:p-6">
      <div className="grid gap-4 md:grid-cols-12">
        {readOnly ? (
          <FieldReadOnly
            label="Directeur / directrice"
            value={item.auteur}
            icon={<LockIcon />}
            className="md:col-span-4"
          />
        ) : (
          <FieldDirecteur
            value={item.directeurId}
            directeurs={directeurs}
            onChange={onPickDirecteur}
            className="md:col-span-4"
          />
        )}
        <FieldEcoleLocked
          value={item.ecole}
          selected={directeurSelected || Boolean(readOnly)}
          className="md:col-span-3"
        />
        <FieldText
          label="Année"
          value={item.anneeN}
          onChange={(v) => onChange({ anneeN: v })}
          placeholder="2025-2026"
          readOnly={readOnly}
          className="md:col-span-2"
        />
        <div className="md:col-span-3">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Type d'école
          </label>
          <div className={`inline-flex rounded-xl border border-slate-200 bg-white p-1 ${readOnly ? 'opacity-70' : ''}`}>
            <button
              onClick={() => !readOnly && onChange({ type: 'elementaire' })}
              disabled={readOnly}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
                item.type === 'elementaire' ? 'bg-slate-900 text-white' : 'text-slate-600'
              } ${readOnly ? 'cursor-not-allowed' : ''}`}
            >
              Élémentaire <span className="text-[10px] opacity-70">1h/case</span>
            </button>
            <button
              onClick={() => !readOnly && onChange({ type: 'maternelle' })}
              disabled={readOnly}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition ${
                item.type === 'maternelle' ? 'bg-slate-900 text-white' : 'text-slate-600'
              } ${readOnly ? 'cursor-not-allowed' : ''}`}
            >
              Maternelle <span className="text-[10px] opacity-70">30min/case</span>
            </button>
          </div>
        </div>
      </div>
      {!readOnly && !directeurSelected && (
        <p className="mt-3 text-[12px] text-slate-500 flex items-center gap-1.5">
          <span className="inline-flex w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
          Sélectionnez votre nom pour débloquer l’export et la publication.
          <span className="text-slate-400">· Mon nom n’est pas dans la liste ? Contactez le CPC numérique.</span>
        </p>
      )}
    </div>
  );
}

function FieldReadOnly({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </span>
      <div className="flex items-center gap-2 rounded-xl border bg-slate-100 border-slate-200 px-3 py-2 text-sm text-slate-900">
        {icon}
        <span className="truncate">{value || '—'}</span>
      </div>
    </label>
  );
}

function FieldDirecteur({
  value,
  directeurs,
  onChange,
  className,
}: {
  value: string;
  directeurs: Directeur[];
  onChange: (id: string) => void;
  className?: string;
}) {
  const selected = directeurs.find((d) => d.id === value);
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
        Directeur / directrice
      </span>
      <div
        className={`relative rounded-xl border transition-all ${
          selected ? 'bg-emerald-50/40 border-emerald-200' : 'bg-amber-50/40 border-amber-200 ring-1 ring-amber-100'
        }`}
      >
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-transparent px-3 py-2 pr-9 text-sm font-medium text-slate-900 outline-none cursor-pointer"
        >
          <option value="">— Choisissez votre nom —</option>
          {directeurs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} · {d.ecoleName}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          <ChevronDownIcon />
        </span>
      </div>
    </label>
  );
}

function FieldEcoleLocked({
  value,
  selected,
  className,
}: {
  value: string;
  selected: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
        École
      </span>
      <div
        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
          selected
            ? 'bg-slate-50 border-slate-200 text-slate-900'
            : 'bg-slate-50/60 border-dashed border-slate-200 text-slate-400 italic'
        }`}
      >
        {selected ? (
          <>
            <LockIcon />
            <span className="truncate">{value}</span>
          </>
        ) : (
          <span>Sera renseignée automatiquement</span>
        )}
      </div>
    </label>
  );
}

function FieldText({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </span>
      <input
        type="text"
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none ${
          readOnly
            ? 'bg-slate-100 border-slate-200 cursor-not-allowed'
            : 'border-slate-200 focus:border-slate-400 focus:ring-1 focus:ring-slate-300'
        }`}
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
  readOnly,
}: {
  item: Repartition108h;
  stats: ReturnType<typeof computeStats>;
  activeCategory: CategoryKey;
  onSetCategory: (k: CategoryKey) => void;
  onCellClick: (key: string) => void;
  onCellRightClick: (key: string) => void;
  readOnly?: boolean;
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
          {readOnly ? (
            <span>Fiche publiée — lecture seule. Cliquez « Modifier cette fiche » pour l'éditer.</span>
          ) : (
            <span>
              Click pour appliquer la catégorie active · re-click sur la même cellule incrémente l'heure (max{' '}
              {MAX_SLOTS_PER_DAY}) · click droit pour effacer
            </span>
          )}
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
              readOnly={readOnly}
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
  readOnly,
}: {
  label: string;
  days: { day: number; weekday: number; key: string }[];
  selections: Record<string, { category: CategoryKey; slots: number }>;
  onCellClick: (key: string) => void;
  onCellRightClick: (key: string) => void;
  hoursPerSlot: number;
  readOnly?: boolean;
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
                onClick={() => !readOnly && onCellClick(key)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!readOnly) onCellRightClick(key);
                }}
                disabled={readOnly}
                title={
                  sel
                    ? `${cat?.label} — ${(sel.slots * hoursPerSlot).toFixed(hoursPerSlot < 1 ? 1 : 0)}h`
                    : readOnly
                    ? undefined
                    : 'Click pour colorier'
                }
                className={`h-7 md:h-5 rounded text-[10px] font-medium transition border ${readOnly ? 'cursor-default' : 'active:scale-95'} ${
                  sel ? 'border-transparent shadow-inner' : isWE ? 'bg-slate-100 border-slate-200/60' : `bg-white border-slate-200 ${readOnly ? '' : 'hover:border-slate-300'}`
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
  readOnly,
}: {
  item: Repartition108h;
  periode: Periode;
  onSelectPeriode: (p: Periode) => void;
  onUpdate: (mut: (p: Repartition108h) => void) => void;
  readOnly?: boolean;
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
              readOnly={readOnly}
              onChange={(e) => setBounds('start', e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none read-only:bg-slate-100 read-only:cursor-not-allowed"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Fin période
            </span>
            <input
              type="date"
              value={bounds.end}
              readOnly={readOnly}
              onChange={(e) => setBounds('end', e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none read-only:bg-slate-100 read-only:cursor-not-allowed"
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
                {!readOnly && (
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
                )}
                {!readOnly && list.length === 0 && (
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
                              readOnly={readOnly}
                              onChange={(e) => updateEvent(ev.id, { date: e.target.value })}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none w-full read-only:bg-slate-100 read-only:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              value={ev.objet}
                              readOnly={readOnly}
                              onChange={(e) => updateEvent(ev.id, { objet: e.target.value })}
                              placeholder="conseil de cycle, équipe pédagogique…"
                              className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none w-full read-only:bg-slate-100 read-only:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="text"
                              value={ev.theme}
                              readOnly={readOnly}
                              onChange={(e) => updateEvent(ev.id, { theme: e.target.value })}
                              placeholder="précision, thématique…"
                              className="rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none w-full read-only:bg-slate-100 read-only:cursor-not-allowed"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {!readOnly && (
                              <button
                                onClick={() => removeEvent(ev.id)}
                                title="Supprimer la ligne"
                                className="text-slate-400 hover:text-rose-600 p-1"
                              >
                                <TrashIcon />
                              </button>
                            )}
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
            readOnly={readOnly}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="Notes libres, contexte, événements particuliers…"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 read-only:bg-slate-100 read-only:cursor-not-allowed"
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
  disabled,
  disabledTitle,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  disabledTitle?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledTitle : undefined}
      aria-disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all active:translate-y-px ${
        disabled
          ? 'bg-white/5 border border-white/10 text-white/40 cursor-not-allowed'
          : primary
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

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

