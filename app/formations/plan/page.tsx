'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

// ───────────────────────── Types ─────────────────────────
type Membre = { raccourci: string };
type GroupeFormateurs = { label?: string; membres: Membre[] };
type Session = {
  id: string;
  date: string | null;
  dateLibre: string | null;
  dureeH: number | null;
  lieu: string | null;
  modalite: 'presentiel' | 'distanciel' | 'observation';
  description: string | null;
  fait: boolean;
  ordre: number;
};
type Formation = {
  id: string;
  anneeScolaire: string;
  cycle: 1 | 2 | 3;
  niveaux: string[];
  titre: string;
  dureeH: number;
  type: string;
  piloteSofia?: string | null;
  formateurs: GroupeFormateurs[];
  statut: 'prevu' | 'en_cours' | 'termine' | 'annule';
  valideAdmin: boolean;
  notes?: string | null;
  ordre: number;
  sessions: Session[];
};
type Formateur = { raccourci: string; nomComplet: string; statut: string };

// ───────────────────────── Helpers ─────────────────────────
const TYPE_META: Record<string, { label: string; color: string; gradient: string; icon: string }> = {
  plan_maths:      { label: 'Plan Maths',      color: 'text-violet-700',  gradient: 'from-violet-400 to-purple-500',  icon: '∑' },
  plan_francais:   { label: 'Plan Français',   color: 'text-rose-700',    gradient: 'from-rose-400 to-pink-500',      icon: 'Aa' },
  plan_lecture:    { label: 'Plan Lecture',    color: 'text-amber-700',   gradient: 'from-amber-400 to-orange-500',   icon: '📖' },
  anim_ped:        { label: 'Animation péda.', color: 'text-teal-700',    gradient: 'from-teal-400 to-emerald-500',   icon: '🎨' },
  plan_laicite:    { label: 'Plan Laïcité',    color: 'text-sky-700',     gradient: 'from-sky-400 to-blue-500',       icon: '⚖️' },
  plan_phare:      { label: 'Plan Phare/CPS',  color: 'text-indigo-700',  gradient: 'from-indigo-400 to-blue-500',    icon: '🌟' },
  anglais:         { label: 'Anglais',         color: 'text-red-700',     gradient: 'from-red-400 to-rose-500',       icon: '🇬🇧' },
  savoir_rouler:   { label: 'Savoir rouler',   color: 'text-lime-700',    gradient: 'from-lime-400 to-green-500',     icon: '🚴' },
  autre:           { label: 'Autre',           color: 'text-slate-700',   gradient: 'from-slate-400 to-slate-500',    icon: '📌' },
};

const CYCLE_META: Record<number, { label: string; niveaux: string; color: string; gradient: string; emoji: string }> = {
  1: { label: 'Cycle 1', niveaux: 'PS · MS · GS',     color: 'bg-amber-50 border-amber-200',    gradient: 'from-amber-400 via-orange-400 to-amber-500',  emoji: '🧩' },
  2: { label: 'Cycle 2', niveaux: 'CP · CE1 · CE2',   color: 'bg-sky-50 border-sky-200',        gradient: 'from-sky-400 via-blue-400 to-sky-500',         emoji: '📚' },
  3: { label: 'Cycle 3', niveaux: 'CM1 · CM2',        color: 'bg-emerald-50 border-emerald-200', gradient: 'from-emerald-400 via-teal-400 to-emerald-500', emoji: '🎓' },
};

const MODALITE_META: Record<string, { label: string; color: string; icon: string }> = {
  presentiel:  { label: 'Présentiel',   color: 'bg-indigo-100 text-indigo-700',     icon: '🏫' },
  distanciel:  { label: 'Distanciel',   color: 'bg-fuchsia-100 text-fuchsia-700',   icon: '💻' },
  observation: { label: 'Observation',  color: 'bg-amber-100 text-amber-700',       icon: '👁️' },
};

// Parse 'YYYY-MM-DD' comme date locale (évite le décalage UTC)
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDate(iso: string | null, libre: string | null): string {
  if (libre) return libre;
  if (!iso) return '—';
  const d = parseLocalDate(iso);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: '2-digit' });
}

function isPassed(iso: string | null): boolean {
  if (!iso) return false;
  const d = parseLocalDate(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

// ───────────────────────── Composants ─────────────────────────
function FormateursBadges({ formateurs, annuaire }: { formateurs: GroupeFormateurs[]; annuaire: Map<string, Formateur> }) {
  if (!formateurs || formateurs.length === 0) return null;
  const isMultiGroupe = formateurs.length > 1;
  return (
    <div className={`space-y-1.5 ${isMultiGroupe ? '' : 'inline-flex flex-wrap gap-1.5'}`}>
      {formateurs.map((g, i) => {
        const membres = g.membres.map((m) => annuaire.get(m.raccourci)?.nomComplet || m.raccourci);
        return (
          <div key={i} className="inline-flex flex-wrap items-center gap-1.5">
            {g.label && (
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mr-1">{g.label} :</span>
            )}
            {membres.map((nom, j) => (
              <span key={j} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                {nom}
                {j < membres.length - 1 && <span className="text-slate-400">+</span>}
              </span>
            ))}
            {isMultiGroupe && i < formateurs.length - 1 && !g.label && <span className="text-slate-300 mx-1">/</span>}
          </div>
        );
      })}
    </div>
  );
}

function SessionRow({ s, index }: { s: Session; index: number }) {
  const meta = MODALITE_META[s.modalite];
  const passed = s.date ? isPassed(s.date) : false;
  const statusIcon = s.fait ? '✓' : passed ? '⏱' : '◯';
  const statusColor = s.fait
    ? 'bg-emerald-500 text-white ring-emerald-200'
    : passed
    ? 'bg-amber-400 text-white ring-amber-200'
    : 'bg-white text-slate-400 ring-slate-200';

  return (
    <li
      className="relative flex items-start gap-3 py-2.5 pl-9 pr-2 hover:bg-slate-50/60 rounded-lg transition-colors animate-pf-slidein"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      <span
        className={`absolute left-1.5 top-3 w-5 h-5 rounded-full ring-4 flex items-center justify-center text-[11px] font-bold ${statusColor}`}
        title={s.fait ? 'Fait' : passed ? 'Date passée (non validée)' : 'À venir'}
      >
        {statusIcon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className={`font-semibold ${s.fait ? 'text-emerald-700' : passed ? 'text-amber-700' : 'text-slate-700'}`}>
            {formatDate(s.date, s.dateLibre)}
          </span>
          {s.dureeH != null && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              {s.dureeH}h
            </span>
          )}
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded ${meta.color}`}>
            <span>{meta.icon}</span>{meta.label}
          </span>
          {s.lieu && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <span>📍</span>{s.lieu}
            </span>
          )}
          {s.description && (
            <span className="text-xs text-slate-400 italic">— {s.description}</span>
          )}
        </div>
      </div>
    </li>
  );
}

function FormationCard({
  f,
  index,
  annuaire,
}: {
  f: Formation;
  index: number;
  annuaire: Map<string, Formateur>;
}) {
  const [open, setOpen] = useState(true);
  const typeMeta = TYPE_META[f.type] || TYPE_META.autre;
  const totalSessions = f.sessions.length;
  const sessionsFaites = f.sessions.filter((s) => s.fait).length;
  const pct = totalSessions > 0 ? Math.round((sessionsFaites / totalSessions) * 100) : 0;

  return (
    <article
      className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 ease-out animate-pf-slidein hover:-translate-y-0.5"
      style={{ animationDelay: `${Math.min(index * 60, 500)}ms` }}
    >
      {/* Accent bar gradient */}
      <div className={`h-1 bg-gradient-to-r ${typeMeta.gradient} transition-all duration-300 group-hover:h-1.5`} />

      {/* Glow hover */}
      <div className={`pointer-events-none absolute -inset-10 bg-gradient-to-br ${typeMeta.gradient} opacity-0 group-hover:opacity-[0.08] blur-3xl transition-opacity duration-500`} />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${typeMeta.color} bg-white border border-current/10`}>
                <span className="text-sm">{typeMeta.icon}</span>{typeMeta.label}
              </span>
              {f.niveaux.map((n) => (
                <span key={n} className="px-1.5 py-0.5 rounded text-[10px] font-black tracking-wider bg-slate-800 text-white">
                  {n}
                </span>
              ))}
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {f.dureeH}h
              </span>
              {f.valideAdmin && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200" title="Validée par l'IEN">
                  ✓ Validée
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-800 leading-snug">{f.titre}</h3>
            {f.notes && <p className="text-xs text-slate-500 mt-0.5 italic">{f.notes}</p>}
          </div>

          {/* Progression pastille */}
          <div className="flex flex-col items-end shrink-0">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100" />
                <circle
                  cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(2 * Math.PI * 28 * pct) / 100} ${2 * Math.PI * 28}`}
                  className={pct === 100 ? 'text-emerald-500' : 'text-indigo-500'}
                  style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.2,0.8,0.2,1)' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-slate-700">{pct}%</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 font-medium">{sessionsFaites}/{totalSessions} sessions</span>
          </div>
        </div>

        {/* Formateurs */}
        <div className="mb-3 pb-3 border-b border-slate-100">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Formateurs</div>
          <FormateursBadges formateurs={f.formateurs} annuaire={annuaire} />
        </div>

        {/* Pilote */}
        {f.piloteSofia && (
          <div className="mb-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-500">Pilote-SOFIA :</span>{' '}
            <span className="font-medium text-slate-700">{f.piloteSofia}</span>
          </div>
        )}

        {/* Sessions */}
        {totalSessions > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors mb-1"
            >
              <span>Sessions ({totalSessions})</span>
              <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {open && (
              <ol className="relative">
                {/* Vertical line */}
                <span className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200" />
                {f.sessions.map((s, i) => (
                  <SessionRow key={s.id} s={s} index={i} />
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

// ───────────────────────── Page ─────────────────────────
export default function PlanFormationPage() {
  const [data, setData] = useState<{ annee: string; formations: Formation[]; formateurs: Formateur[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [cycleFilter, setCycleFilter] = useState<'all' | 1 | 2 | 3>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/formations/plan', { cache: 'no-store' });
        if (!res.ok) throw new Error('Erreur de chargement');
        setData(await res.json());
      } catch (e: any) {
        setErr(e.message || 'Erreur');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const annuaire = useMemo(() => {
    const m = new Map<string, Formateur>();
    (data?.formateurs || []).forEach((f) => m.set(f.raccourci, f));
    return m;
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.formations.filter((f) => {
      if (cycleFilter !== 'all' && f.cycle !== cycleFilter) return false;
      if (typeFilter !== 'all' && f.type !== typeFilter) return false;
      if (q) {
        const hay = [
          f.titre,
          f.notes || '',
          f.piloteSofia || '',
          f.niveaux.join(' '),
          f.sessions.map((s) => `${s.lieu || ''} ${s.description || ''}`).join(' '),
          f.formateurs.flatMap((g) => g.membres.map((m) => annuaire.get(m.raccourci)?.nomComplet || m.raccourci)).join(' '),
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, cycleFilter, typeFilter, query, annuaire]);

  const byCycle = useMemo(() => {
    const groups: Record<number, Formation[]> = { 1: [], 2: [], 3: [] };
    filtered.forEach((f) => groups[f.cycle]?.push(f));
    return groups;
  }, [filtered]);

  const stats = useMemo(() => {
    if (!data) return { total: 0, sessions: 0, sessionsFaites: 0, heures: 0, heuresFaites: 0 };
    let sessions = 0, sessionsFaites = 0, heures = 0, heuresFaites = 0;
    data.formations.forEach((f) => {
      sessions += f.sessions.length;
      f.sessions.forEach((s) => {
        if (s.fait) sessionsFaites++;
        if (s.dureeH) heures += s.dureeH;
        if (s.fait && s.dureeH) heuresFaites += s.dureeH;
      });
    });
    return { total: data.formations.length, sessions, sessionsFaites, heures, heuresFaites };
  }, [data]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50">
      {/* ─── Hero ─── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0] text-white">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 0, transparent 45%), radial-gradient(circle at 80% 70%, white 0, transparent 40%)' }} />
        <div className="relative container mx-auto px-6 py-12">
          <Link href="/formations" className="inline-flex items-center gap-2 text-white/85 hover:text-white mb-6 transition-colors">
            ← Retour aux formations
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-3xl shadow-inner">📋</div>
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Plan de formation</h1>
              <p className="text-lg md:text-xl opacity-95 mt-1">
                CircoCay2 – Roura · Année {data?.annee || '2025-2026'}
              </p>
            </div>
          </div>

          {/* Stats bar */}
          {data && (
            <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
              {[
                { label: 'Dispositifs',      value: stats.total },
                { label: 'Sessions totales', value: stats.sessions },
                { label: 'Sessions faites',  value: stats.sessionsFaites },
                { label: 'Heures prévues',   value: `${stats.heures}h` },
                { label: 'Heures réalisées', value: `${stats.heuresFaites}h` },
              ].map((s, i) => (
                <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-3 text-center border border-white/15 animate-pf-slidein" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="text-2xl md:text-3xl font-black">{s.value}</div>
                  <div className="text-xs md:text-sm opacity-80 uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Filtres ─── */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-6 py-3 flex flex-wrap items-center gap-3">
          {/* Cycle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100">
            <button
              onClick={() => setCycleFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                cycleFilter === 'all' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Tous cycles
            </button>
            {([1, 2, 3] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCycleFilter(c)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  cycleFilter === c ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {CYCLE_META[c].emoji} {CYCLE_META[c].label}
              </button>
            ))}
          </div>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="all">Tous types</option>
            {Object.entries(TYPE_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Recherche */}
          <div className="flex-1 min-w-[200px] relative">
            <input
              type="text"
              placeholder="Rechercher formation, formateur, lieu…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-sm px-3 py-1.5 pl-8 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          </div>

          <Link
            href="/formations/bilan"
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-md transition-all"
          >
            📊 Bilan
          </Link>
        </div>
      </div>

      {/* ─── Contenu ─── */}
      <div className="container mx-auto px-6 py-8">
        {loading && (
          <div className="text-center py-20 text-slate-500">
            <div className="inline-block w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3" />
            <p>Chargement du plan de formation…</p>
          </div>
        )}

        {err && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{err}</div>
        )}

        {!loading && data && filtered.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <div className="text-5xl mb-3">🔍</div>
            <p>Aucune formation ne correspond aux filtres.</p>
          </div>
        )}

        {!loading && data && (
          <div className="space-y-10">
            {([1, 2, 3] as const).map((c) => {
              const list = byCycle[c] || [];
              if (list.length === 0) return null;
              const meta = CYCLE_META[c];
              return (
                <section key={c} className="animate-pf-slidein">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r ${meta.gradient} text-white shadow-lg`}>
                      <span className="text-2xl">{meta.emoji}</span>
                      <div className="text-left">
                        <div className="text-base font-black leading-none">{meta.label}</div>
                        <div className="text-[11px] opacity-90 leading-none mt-0.5">{meta.niveaux}</div>
                      </div>
                    </div>
                    <span className="text-sm text-slate-500 font-medium">
                      {list.length} dispositif{list.length > 1 ? 's' : ''} ·{' '}
                      {list.reduce((sum, f) => sum + f.sessions.length, 0)} sessions ·{' '}
                      {list.reduce((sum, f) => sum + f.dureeH, 0)}h
                    </span>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {list.map((f, i) => (
                      <FormationCard key={f.id} f={f} index={i} annuaire={annuaire} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
