'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AuroraHeader from '@/components/AuroraHeader';
import StatPill from '@/components/StatPill';

// ───────────────────────── Types ─────────────────────────
type Membre = { raccourci: string };
type GroupeFormateurs = { label?: string; membres: Membre[] };
type Session = {
  id: string;
  formation_id: string;
  date_session: string | null;
  date_libre: string | null;
  duree_h: number | null;
  lieu: string | null;
  modalite: 'presentiel' | 'distanciel' | 'observation';
  description: string | null;
  fait: boolean;
  ordre: number;
};
type Formation = {
  id: string;
  annee_scolaire: string;
  cycle: 1 | 2 | 3;
  niveaux: string[];
  titre: string;
  duree_h: number;
  type: string;
  pilote_sofia?: string | null;
  formateurs: GroupeFormateurs[];
  statut: string;
  valide_admin: boolean;
  notes?: string | null;
  ordre: number;
};
type Formateur = { raccourci: string; nom_complet: string; statut: string };

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

const CYCLE_META: Record<number, { label: string; niveaux: string; gradient: string; emoji: string }> = {
  1: { label: 'Cycle 1', niveaux: 'PS · MS · GS',     gradient: 'from-amber-400 via-orange-400 to-amber-500',    emoji: '🧩' },
  2: { label: 'Cycle 2', niveaux: 'CP · CE1 · CE2',   gradient: 'from-sky-400 via-blue-400 to-sky-500',           emoji: '📚' },
  3: { label: 'Cycle 3', niveaux: 'CM1 · CM2',        gradient: 'from-emerald-400 via-teal-400 to-emerald-500',   emoji: '🎓' },
};

const MODALITE_META: Record<string, { label: string; color: string; icon: string }> = {
  presentiel:  { label: 'Présentiel',   color: 'text-indigo-700',    icon: '🏫' },
  distanciel:  { label: 'Distanciel',   color: 'text-fuchsia-700',   icon: '💻' },
  observation: { label: 'Observation',  color: 'text-amber-700',     icon: '👁️' },
};

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

// ───────────────────────── Composants ─────────────────────────
function FormateursBadges({ formateurs, annuaire }: { formateurs: GroupeFormateurs[]; annuaire: Map<string, Formateur> }) {
  if (!formateurs || formateurs.length === 0) return <span className="text-xs text-slate-400 italic">— non défini —</span>;
  const isMultiGroupe = formateurs.length > 1;
  return (
    <div className={`${isMultiGroupe ? 'space-y-1.5' : 'inline-flex flex-wrap gap-1.5'}`}>
      {formateurs.map((g, i) => {
        const membres = g.membres.map((m) => annuaire.get(m.raccourci)?.nom_complet || m.raccourci);
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
          </div>
        );
      })}
    </div>
  );
}

function SessionRow({ s, index }: { s: Session; index: number }) {
  const meta = MODALITE_META[s.modalite] || MODALITE_META.presentiel;
  const statusIcon = s.fait ? '✓' : '◯';
  const statusColor = s.fait
    ? 'bg-emerald-500 text-white ring-emerald-200'
    : 'bg-white text-slate-400 ring-slate-200';

  return (
    <li
      className="relative flex items-start gap-3 py-2 pl-9 pr-2 animate-pf-slidein"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      <span
        className={`absolute left-1.5 top-2.5 w-5 h-5 rounded-full ring-4 flex items-center justify-center text-[11px] font-bold ${statusColor}`}
        title={s.fait ? 'Session réalisée' : 'Non validée'}
      >
        {statusIcon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className={`font-semibold ${s.fait ? 'text-emerald-700' : 'text-slate-700'}`}>
            {formatDate(s.date_session, s.date_libre)}
          </span>
          {s.duree_h != null && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              {s.duree_h}h
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

function FormationCard({ f, sessions, index, annuaire }: {
  f: Formation;
  sessions: Session[];
  index: number;
  annuaire: Map<string, Formateur>;
}) {
  const typeMeta = TYPE_META[f.type] || TYPE_META.autre;
  const totalSessions = sessions.length;
  const sessionsFaites = sessions.filter((s) => s.fait).length;
  const pct = totalSessions > 0 ? Math.round((sessionsFaites / totalSessions) * 100) : 0;

  return (
    <article
      className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 ease-out animate-pf-slidein hover:-translate-y-0.5"
      style={{ animationDelay: `${Math.min(index * 60, 500)}ms` }}
    >
      <div className={`h-1 bg-gradient-to-r ${typeMeta.gradient}`} />

      <div className="relative p-5">
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
                {f.duree_h}h
              </span>
              {f.valide_admin && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ Validée
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-800 leading-snug">{f.titre}</h3>
            {f.notes && <p className="text-xs text-slate-500 mt-0.5 italic">{f.notes}</p>}
          </div>

          <div className="flex flex-col items-end shrink-0">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100" />
                <circle
                  cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${(2 * Math.PI * 28 * pct) / 100} ${2 * Math.PI * 28}`}
                  className={pct === 100 ? 'text-emerald-500' : 'text-indigo-500'}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-slate-700">{pct}%</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 font-medium">{sessionsFaites}/{totalSessions} sessions</span>
          </div>
        </div>

        <div className="mb-3 pb-3 border-b border-slate-100">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Formateurs</div>
          <FormateursBadges formateurs={f.formateurs} annuaire={annuaire} />
        </div>

        {f.pilote_sofia && (
          <div className="mb-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-500">Pilote-SOFIA :</span>{' '}
            <span className="font-medium text-slate-700">{f.pilote_sofia}</span>
          </div>
        )}

        {totalSessions > 0 && (
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Sessions ({totalSessions})
            </div>
            <ol className="relative">
              <span className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200" />
              {sessions.map((s, i) => (
                <SessionRow key={s.id} s={s} index={i} />
              ))}
            </ol>
          </div>
        )}
      </div>
    </article>
  );
}

// ───────────────────────── Page ─────────────────────────
function ArchivePlanFormationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const annee = searchParams.get('annee');
  const [loading, setLoading] = useState(true);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/');
      return;
    }
    if (!annee) return;
    (async () => {
      try {
        const res = await fetch(`/api/archives?annee=${annee}`);
        if (res.ok) {
          const data = await res.json();
          const brutes = data.donnees_brutes || {};
          setFormations(brutes.plan_formation || []);
          setSessions(brutes.plan_formation_sessions || []);
          setFormateurs(brutes.plan_formation_formateurs || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [annee, router]);

  const annuaire = useMemo(() => {
    const m = new Map<string, Formateur>();
    formateurs.forEach((f) => m.set(f.raccourci, f));
    return m;
  }, [formateurs]);

  const sessionsByFormation = useMemo(() => {
    const m = new Map<string, Session[]>();
    sessions.forEach((s) => {
      const arr = m.get(s.formation_id) || [];
      arr.push(s);
      m.set(s.formation_id, arr);
    });
    m.forEach((arr) => arr.sort((a, b) => (a.ordre || 0) - (b.ordre || 0)));
    return m;
  }, [sessions]);

  const byCycle = useMemo(() => {
    const groups: Record<number, Formation[]> = { 1: [], 2: [], 3: [] };
    [...formations]
      .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
      .forEach((f) => groups[f.cycle]?.push(f));
    return groups;
  }, [formations]);

  const stats = useMemo(() => {
    let totalSessions = 0, sessionsFaites = 0, heures = 0, heuresFaites = 0;
    sessions.forEach((s) => {
      totalSessions++;
      if (s.fait) sessionsFaites++;
      if (s.duree_h) heures += Number(s.duree_h);
      if (s.fait && s.duree_h) heuresFaites += Number(s.duree_h);
    });
    return { total: formations.length, sessions: totalSessions, sessionsFaites, heures, heuresFaites };
  }, [formations, sessions]);

  if (!annee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0] text-white">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p>Paramètre année manquant</p>
          <Link href="/archives" className="text-white underline mt-4 inline-block">Retour aux archives</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AuroraHeader
        kicker={`Archive · année ${annee}`}
        title="Plan de"
        titleAccent="formation."
        subtitle="Dispositifs, sessions et volumes horaires planifiés et réalisés sur l'année."
        backHref={`/archives/consulter?annee=${annee}`}
        backLabel={`Retour à l'archive ${annee}`}
      >
        {!loading && formations.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <StatPill value={stats.total} label="Dispositifs" gradient="from-sky-400 via-cyan-400 to-teal-400" />
            <StatPill value={stats.sessions} label="Sessions" gradient="from-violet-400 via-fuchsia-400 to-pink-400" />
            <StatPill value={stats.sessionsFaites} label="Réalisées" gradient="from-emerald-400 via-teal-400 to-cyan-400" />
            <StatPill value={`${stats.heures}h`} label="Heures prévues" gradient="from-amber-400 via-orange-400 to-rose-500" />
            <StatPill value={`${stats.heuresFaites}h`} label="Heures faites" gradient="from-indigo-400 via-blue-500 to-cyan-400" />
          </div>
        )}
      </AuroraHeader>

      <div className="container mx-auto max-w-7xl px-6 py-8 -mt-20 relative z-10">
        {loading ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-500">Chargement…</p>
          </div>
        ) : formations.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">🗄️</div>
            <p className="text-gray-700">Aucune formation archivée pour cette année.</p>
          </div>
        ) : (
          [1, 2, 3].map((cycle) => {
            const list = byCycle[cycle] || [];
            if (list.length === 0) return null;
            const meta = CYCLE_META[cycle];
            return (
              <section key={cycle} className="mb-10">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-4 text-white font-bold shadow bg-gradient-to-r ${meta.gradient}`}>
                  <span className="text-xl">{meta.emoji}</span>
                  <span>{meta.label}</span>
                  <span className="text-xs font-semibold opacity-90">· {meta.niveaux}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 ml-2">
                    {list.length} dispositif{list.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {list.map((f, i) => (
                    <FormationCard
                      key={f.id}
                      f={f}
                      sessions={sessionsByFormation.get(f.id) || []}
                      index={i}
                      annuaire={annuaire}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-700 via-purple-600 to-pink-500">
        <div className="text-white text-xl">Chargement…</div>
      </div>
    }>
      <ArchivePlanFormationContent />
    </Suspense>
  );
}
