'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Membre = { raccourci: string };
type GroupeFormateurs = { label?: string; membres: Membre[] };
type Session = {
  id: string; date: string | null; dateLibre: string | null; dureeH: number | null;
  lieu: string | null; modalite: string; description: string | null; fait: boolean; ordre: number;
};
type Formation = {
  id: string; cycle: 1 | 2 | 3; niveaux: string[]; titre: string; dureeH: number;
  type: string; piloteSofia?: string | null; formateurs: GroupeFormateurs[];
  valideAdmin: boolean; sessions: Session[];
};
type Formateur = { raccourci: string; nomComplet: string; statut: string };

const TYPE_META: Record<string, { label: string; color: string }> = {
  plan_maths:      { label: 'Plan Maths',      color: '#8b5cf6' },
  plan_francais:   { label: 'Plan Français',   color: '#ec4899' },
  plan_lecture:    { label: 'Plan Lecture',    color: '#f59e0b' },
  anim_ped:        { label: 'Animation péda.', color: '#14b8a6' },
  plan_laicite:    { label: 'Plan Laïcité',    color: '#0ea5e9' },
  plan_phare:      { label: 'Plan Phare/CPS',  color: '#6366f1' },
  anglais:         { label: 'Anglais',         color: '#ef4444' },
  savoir_rouler:   { label: 'Savoir rouler',   color: '#84cc16' },
  autre:           { label: 'Autre',           color: '#64748b' },
};
const CYCLE_META: Record<number, { label: string; color: string; gradient: string }> = {
  1: { label: 'Cycle 1', color: '#f97316', gradient: 'from-amber-400 to-orange-500' },
  2: { label: 'Cycle 2', color: '#0ea5e9', gradient: 'from-sky-400 to-blue-500' },
  3: { label: 'Cycle 3', color: '#10b981', gradient: 'from-emerald-400 to-teal-500' },
};

const MONTHS = ['sept.', 'oct.', 'nov.', 'déc.', 'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.'];
const NIVEAU_ORDER = ['PS', 'MS', 'GS', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'];
const NIVEAU_CYCLE: Record<string, number> = { PS: 1, MS: 1, GS: 1, CP: 2, CE1: 2, CE2: 2, CM1: 3, CM2: 3 };
// Sept = 0, ..., Juil = 10
function monthIndex(date: string): number {
  const m = Number(date.slice(5, 7));
  // Map calendar month -> school month index (sept=0, ..., août=11)
  if (m >= 9) return m - 9;
  return m + 3;
}

// ───────── KPI Card ─────────
function KPI({ value, label, sub, gradient }: { value: string | number; label: string; sub?: string; gradient: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-br ${gradient} shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 animate-pf-slidein`}>
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
      <div className="relative">
        <div className="text-3xl md:text-4xl font-black tracking-tight">{value}</div>
        <div className="text-xs md:text-sm font-bold uppercase tracking-wider mt-1 opacity-95">{label}</div>
        {sub && <div className="text-[11px] opacity-85 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ───────── Donut chart (pure SVG) ─────────
function Donut({ data, size = 260 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="text-slate-400 text-sm">Aucune donnée</div>;
  const r = size / 2 - 12;
  const c = size / 2;
  let acc = 0;
  const arcs = data.map((d) => {
    const start = (acc / total) * Math.PI * 2;
    acc += d.value;
    const end = (acc / total) * Math.PI * 2;
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = c + Math.sin(start) * r;
    const y1 = c - Math.cos(start) * r;
    const x2 = c + Math.sin(end) * r;
    const y2 = c - Math.cos(end) * r;
    return { ...d, path: `M ${c} ${c} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z` };
  });
  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {arcs.map((a, i) => (
          <path
            key={i} d={a.path} fill={a.color}
            className="transition-all duration-300 hover:opacity-85 origin-center"
            style={{ transformOrigin: '50% 50%' }}
          />
        ))}
        <circle cx={c} cy={c} r={r * 0.58} fill="white" />
        <text x={c} y={c - 4} textAnchor="middle" className="text-3xl font-black fill-slate-800">{total}</text>
        <text x={c} y={c + 18} textAnchor="middle" className="text-[11px] uppercase fill-slate-500 font-bold tracking-wider">total</text>
      </svg>
      <ul className="space-y-2 text-sm">
        {arcs.map((a, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-sm shrink-0" style={{ backgroundColor: a.color }} />
            <span className="font-semibold text-slate-700">{a.label}</span>
            <span className="text-slate-500 text-xs">
              {a.value} ({total > 0 ? Math.round((a.value / total) * 100) : 0}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ───────── Horizontal bar chart ─────────
function HBarChart({ data, max }: { data: { label: string; value: number; color: string }[]; max?: number }) {
  const m = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-2">
      {data.map((d, i) => (
        <li key={i} className="text-xs">
          <div className="flex items-center justify-between mb-0.5">
            <span className="font-semibold text-slate-700">{d.label}</span>
            <span className="font-bold text-slate-500">{d.value}h</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full animate-pf-bar"
              style={{
                width: `${(d.value / m) * 100}%`,
                backgroundColor: d.color,
                animationDelay: `${i * 60}ms`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ───────── Dual bar chart (prévues + réalisées) ─────────
function DualHBarChart({ data }: { data: { label: string; prevues: number; realisees: number; color: string; sub?: string }[] }) {
  if (data.length === 0) return <p className="text-xs text-slate-400 italic">Aucune donnée.</p>;
  const max = Math.max(1, ...data.map((d) => d.prevues));
  return (
    <ul className="space-y-2">
      {data.map((d, i) => {
        const pctPrev = (d.prevues / max) * 100;
        const pctReal = d.prevues > 0 ? (d.realisees / d.prevues) * pctPrev : 0;
        return (
          <li key={i} className="text-xs">
            <div className="flex items-center justify-between mb-0.5 gap-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                {d.label}
                {d.sub && <span className="text-[10px] font-medium text-slate-400">· {d.sub}</span>}
              </span>
              <span className="font-bold text-slate-500 whitespace-nowrap">
                {d.prevues}h
                {d.realisees > 0 && <span className="text-emerald-600"> · {d.realisees}h faits</span>}
              </span>
            </div>
            <div className="relative h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full rounded-full animate-pf-bar opacity-80"
                style={{ width: `${pctPrev}%`, backgroundColor: d.color, animationDelay: `${Math.min(i * 40, 400)}ms` }}
              />
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 animate-pf-bar"
                style={{ width: `${pctReal}%`, animationDelay: `${Math.min(i * 40 + 150, 500)}ms` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ───────── Formateurs hours chart (prévues + réalisées) ─────────
const STATUT_COLOR: Record<string, string> = {
  'CPC':       '#6366f1', // indigo
  'CPD':       '#8b5cf6', // violet
  'PEMF':      '#ec4899', // pink
  'CONSEILLER': '#0ea5e9',
  'IEN':       '#f59e0b',
  'RMC':       '#10b981',
};
function FormateurHoursChart({ data }: { data: { raccourci: string; nomComplet: string; statut: string; prevues: number; realisees: number }[] }) {
  if (data.length === 0) return <p className="text-xs text-slate-400 italic">Aucun formateur mobilisé.</p>;
  const max = Math.max(1, ...data.map((d) => d.prevues));
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
      {data.map((d, i) => {
        const color = STATUT_COLOR[(d.statut || '').toUpperCase()] || '#64748b';
        const pctPrev = (d.prevues / max) * 100;
        const pctReal = d.prevues > 0 ? (d.realisees / d.prevues) * pctPrev : 0;
        return (
          <li key={d.raccourci} className="text-xs">
            <div className="flex items-center justify-between mb-0.5 gap-2">
              <span className="font-semibold text-slate-700 truncate flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                {d.nomComplet}
                {d.statut && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">· {d.statut}</span>
                )}
              </span>
              <span className="font-bold text-slate-500 whitespace-nowrap">
                {d.prevues}h
                {d.realisees > 0 && <span className="text-emerald-600"> · {d.realisees}h faits</span>}
              </span>
            </div>
            <div className="relative h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full rounded-full animate-pf-bar opacity-80"
                style={{ width: `${pctPrev}%`, backgroundColor: color, animationDelay: `${Math.min(i * 30, 400)}ms` }}
              />
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 animate-pf-bar"
                style={{ width: `${pctReal}%`, animationDelay: `${Math.min(i * 30 + 150, 500)}ms` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ───────── Timeline mensuelle ─────────
function MonthTimeline({ sessions }: { sessions: (Session & { cycle: number })[] }) {
  const monthly: Record<number, { total: number; faites: number }> = {};
  MONTHS.forEach((_, i) => (monthly[i] = { total: 0, faites: 0 }));
  sessions.forEach((s) => {
    if (!s.date) return;
    const idx = monthIndex(s.date);
    if (idx < 0 || idx >= MONTHS.length) return;
    monthly[idx].total++;
    if (s.fait) monthly[idx].faites++;
  });
  const maxVal = Math.max(1, ...Object.values(monthly).map((m) => m.total));

  return (
    <div>
      <div className="flex items-end justify-between gap-1.5 h-40">
        {MONTHS.map((name, i) => {
          const { total, faites } = monthly[i];
          const hTotal = (total / maxVal) * 100;
          const hFaites = total > 0 ? (faites / total) * hTotal : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
              <div className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                {total > 0 ? `${faites}/${total}` : ''}
              </div>
              <div className="relative w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t-md bg-slate-200 relative transition-all duration-300 group-hover:bg-slate-300"
                  style={{ height: `${hTotal}%`, minHeight: total > 0 ? '4px' : 0 }}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-t-md bg-gradient-to-t from-emerald-500 to-emerald-400 animate-pf-bar"
                    style={{ height: `${hFaites > 0 ? (hFaites / hTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">{name}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-600">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-200" /> Prévues
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500" /> Réalisées
        </span>
      </div>
    </div>
  );
}

// ───────── Page ─────────
export default function BilanPage() {
  const [data, setData] = useState<{ annee: string; formations: Formation[]; formateurs: Formateur[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/formations/plan', { cache: 'no-store' });
        if (!res.ok) throw new Error('Erreur de chargement');
        setData(await res.json());
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    if (!data) return null;
    const annuaire = new Map<string, Formateur>();
    data.formateurs.forEach((f) => annuaire.set(f.raccourci, f));

    let sessions = 0, sessionsFaites = 0, heures = 0, heuresFaites = 0;
    const byCycle: Record<number, { formations: number; sessions: number; heures: number; heuresFaites: number }> = { 1: { formations: 0, sessions: 0, heures: 0, heuresFaites: 0 }, 2: { formations: 0, sessions: 0, heures: 0, heuresFaites: 0 }, 3: { formations: 0, sessions: 0, heures: 0, heuresFaites: 0 } };
    const byType: Record<string, number> = {};
    const byNiveau: Record<string, { prevues: number; realisees: number }> = {};
    const allSessions: (Session & { cycle: number })[] = [];
    const formateursMobilises = new Set<string>();
    const lieux: Record<string, number> = {};
    const formateurStats = new Map<string, { nomComplet: string; statut: string; prevues: number; realisees: number }>();

    data.formations.forEach((f) => {
      byCycle[f.cycle].formations++;
      byType[f.type] = (byType[f.type] || 0) + f.dureeH;

      const raccourcisFormation = new Set<string>();
      f.formateurs.forEach((g) => g.membres.forEach((m) => {
        formateursMobilises.add(m.raccourci);
        raccourcisFormation.add(m.raccourci);
      }));

      f.sessions.forEach((s) => {
        sessions++;
        byCycle[f.cycle].sessions++;
        if (s.dureeH) { heures += s.dureeH; byCycle[f.cycle].heures += s.dureeH; }
        if (s.fait) {
          sessionsFaites++;
          if (s.dureeH) { heuresFaites += s.dureeH; byCycle[f.cycle].heuresFaites += s.dureeH; }
        }
        if (s.lieu) lieux[s.lieu] = (lieux[s.lieu] || 0) + 1;
        allSessions.push({ ...s, cycle: f.cycle });

        if (s.dureeH) {
          f.niveaux.forEach((n) => {
            const e = byNiveau[n] || { prevues: 0, realisees: 0 };
            e.prevues += s.dureeH!;
            if (s.fait) e.realisees += s.dureeH!;
            byNiveau[n] = e;
          });

          raccourcisFormation.forEach((r) => {
            const info = annuaire.get(r);
            const entry = formateurStats.get(r) || {
              nomComplet: info?.nomComplet || r,
              statut: info?.statut || '',
              prevues: 0,
              realisees: 0,
            };
            entry.prevues += s.dureeH!;
            if (s.fait) entry.realisees += s.dureeH!;
            formateurStats.set(r, entry);
          });
        }
      });
    });

    const byFormateur = Array.from(formateurStats.entries())
      .map(([raccourci, v]) => ({ raccourci, ...v }))
      .sort((a, b) => b.prevues - a.prevues || a.nomComplet.localeCompare(b.nomComplet));

    return {
      total: data.formations.length,
      sessions, sessionsFaites, heures, heuresFaites,
      byCycle, byType, allSessions, byFormateur, byNiveau,
      formateursMobilises: formateursMobilises.size,
      lieux: Object.entries(lieux).sort((a, b) => b[1] - a[1]).slice(0, 5),
      tauxRealisation: sessions > 0 ? Math.round((sessionsFaites / sessions) * 100) : 0,
    };
  }, [data]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0] text-white">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, white 0, transparent 50%), radial-gradient(circle at 70% 80%, white 0, transparent 45%)' }} />
        <div className="relative container mx-auto px-6 py-10">
          <Link href="/formations/plan" className="inline-flex items-center gap-2 text-white/85 hover:text-white mb-5 text-sm">
            ← Retour au plan
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl">📊</div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold">Bilan du plan de formation</h1>
              <p className="text-base md:text-lg opacity-90 mt-1">CircoCay2 – Roura · Année {data?.annee || '2025-2026'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {loading && <div className="text-center py-16 text-slate-500">Chargement…</div>}
        {err && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{err}</div>}

        {!loading && stats && (
          <>
            {/* KPIs */}
            <section className="mb-10">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Indicateurs clés</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <KPI value={stats.total}                label="Dispositifs"        sub="formations au plan"        gradient="from-indigo-500 to-purple-600" />
                <KPI value={stats.sessions}             label="Sessions"           sub={`${stats.sessionsFaites} réalisées`} gradient="from-sky-500 to-cyan-600" />
                <KPI value={`${stats.tauxRealisation}%`} label="Taux de réalisation" sub={`${stats.sessionsFaites}/${stats.sessions} sessions`} gradient="from-emerald-500 to-teal-600" />
                <KPI value={`${stats.heures}h`}         label="Heures prévues"     sub={`${stats.heuresFaites}h réalisées`} gradient="from-pink-500 to-rose-600" />
                <KPI value={stats.formateursMobilises}  label="Formateurs"         sub="mobilisés"                 gradient="from-amber-500 to-orange-600" />
              </div>
            </section>

            {/* Graphiques */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-10">
              {/* Donut par cycle */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 animate-pf-slidein">
                <h3 className="text-base font-bold text-slate-800 mb-1">Répartition par cycle</h3>
                <p className="text-xs text-slate-500 mb-4">Sessions totales sur l'année</p>
                <Donut
                  data={[1, 2, 3].map((c) => ({
                    label: CYCLE_META[c].label,
                    value: stats.byCycle[c].sessions,
                    color: CYCLE_META[c].color,
                  }))}
                />
              </div>

              {/* Barres par type */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 animate-pf-slidein">
                <h3 className="text-base font-bold text-slate-800 mb-1">Heures de formation par type</h3>
                <p className="text-xs text-slate-500 mb-4">Durée totale prévue (h)</p>
                <HBarChart
                  data={Object.entries(stats.byType)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => ({
                      label: TYPE_META[k]?.label || k,
                      value: v,
                      color: TYPE_META[k]?.color || '#64748b',
                    }))}
                />
              </div>
            </section>

            {/* Timeline mensuelle full width */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-10 animate-pf-slidein">
              <h3 className="text-base font-bold text-slate-800 mb-1">Activité par mois</h3>
              <p className="text-xs text-slate-500 mb-4">Sessions prévues et réalisées dans le calendrier scolaire</p>
              <MonthTimeline sessions={stats.allSessions} />
            </section>

            {/* Heures par cycle & par niveau */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-10">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 animate-pf-slidein">
                <h3 className="text-base font-bold text-slate-800 mb-1">Heures par cycle</h3>
                <p className="text-xs text-slate-500 mb-4">Volume horaire prévu et réalisé par cycle</p>
                <DualHBarChart
                  data={[1, 2, 3].map((c) => ({
                    label: CYCLE_META[c].label,
                    prevues: stats.byCycle[c].heures,
                    realisees: stats.byCycle[c].heuresFaites,
                    color: CYCLE_META[c].color,
                    sub: `${stats.byCycle[c].formations} formation${stats.byCycle[c].formations > 1 ? 's' : ''}`,
                  }))}
                />
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 animate-pf-slidein">
                <h3 className="text-base font-bold text-slate-800 mb-1">Heures par niveau</h3>
                <p className="text-xs text-slate-500 mb-4">Heures de formation touchant chaque niveau de classe</p>
                <DualHBarChart
                  data={NIVEAU_ORDER
                    .filter((n) => stats.byNiveau[n])
                    .map((n) => ({
                      label: n,
                      prevues: stats.byNiveau[n].prevues,
                      realisees: stats.byNiveau[n].realisees,
                      color: CYCLE_META[NIVEAU_CYCLE[n]].color,
                    }))}
                />
              </div>
            </section>

            {/* Heures par formateur full width */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-10 animate-pf-slidein">
              <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
                <h3 className="text-base font-bold text-slate-800">Heures de formation par formateur</h3>
                <span className="text-xs text-slate-500">{stats.byFormateur.length} formateur{stats.byFormateur.length > 1 ? 's' : ''} mobilisé{stats.byFormateur.length > 1 ? 's' : ''}</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">Total cumulé des heures où chaque formateur est impliqué (prévues + réalisées)</p>
              <FormateurHoursChart data={stats.byFormateur} />
            </section>

            {/* Résumé cycles + top lieux */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 animate-pf-slidein">
                <h3 className="text-base font-bold text-slate-800 mb-3">Détail par cycle</h3>
                <div className="space-y-2.5">
                  {[1, 2, 3].map((c) => {
                    const d = stats.byCycle[c];
                    const meta = CYCLE_META[c];
                    return (
                      <div key={c} className={`p-3 rounded-xl bg-gradient-to-r ${meta.gradient} text-white shadow-sm`}>
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm">{meta.label}</span>
                          <span className="text-xs opacity-90">{d.formations} formation{d.formations > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs opacity-95">
                          <span>{d.sessions} sessions</span>
                          <span>{d.heures}h prévues</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 animate-pf-slidein">
                <h3 className="text-base font-bold text-slate-800 mb-3">Top lieux de formation</h3>
                {stats.lieux.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Aucun lieu renseigné.</p>
                ) : (
                  <ul className="space-y-2">
                    {stats.lieux.map(([lieu, count], i) => (
                      <li key={i} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">{i + 1}</span>
                          <span className="font-semibold text-slate-700">{lieu}</span>
                        </span>
                        <span className="text-xs font-bold text-slate-500">{count} session{count > 1 ? 's' : ''}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
