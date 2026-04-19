'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Tel = { type: 'fixe' | 'mobile'; number: string };
type Person = { name: string; role?: string; email?: string; tels: Tel[] };
type CircoMember = { role: string; roleLong: string; name: string; email?: string; tels: Tel[]; accent: string; iconKey: 'star' | 'folder' | 'compass' | 'activity' | 'chip' };
type School = { name: string; type?: 'EEPU' | 'EMPU' | 'EEPR' | 'GS'; directors: Person[] };

// Fallback utilisé uniquement si l'API est injoignable.
const CIRCO_FALLBACK: CircoMember[] = [
  { role: 'IEN', roleLong: "Inspectrice de l'Éducation Nationale", name: 'Mme Lautric Chantal', email: 'chantal.lautric@ac-guyane.fr',
    tels: [{ type: 'fixe', number: '0594.27.19.24' }, { type: 'mobile', number: '0694.27.25.32' }],
    accent: 'from-amber-400 to-orange-500', iconKey: 'star' },
  { role: 'Secrétaire', roleLong: 'Secrétaire de circonscription', name: 'Mme Pigree Anna', email: 'anna.pigree@ac-guyane.fr',
    tels: [{ type: 'fixe', number: '0594.27.19.13' }],
    accent: 'from-sky-400 to-blue-500', iconKey: 'folder' },
  { role: 'CPAIEN', roleLong: "Conseillère pédagogique auprès de l'IEN", name: 'Mme Hernandez Mona', email: 'mona.hernandez@ac-guyane.fr',
    tels: [{ type: 'fixe', number: '0594.27.19.46' }],
    accent: 'from-violet-400 to-purple-500', iconKey: 'compass' },
  { role: 'CPC EPS', roleLong: 'Conseiller pédagogique — EPS', name: 'M. Pierre Gaelle Jean-Luc', email: 'j-luc.pierre@ac-guyane.fr',
    tels: [{ type: 'fixe', number: '0594.27.19.43' }],
    accent: 'from-emerald-400 to-teal-500', iconKey: 'activity' },
  { role: 'CPC NE', roleLong: 'Conseiller pédagogique — Numérique éducatif', name: 'M. Louis Olivier', email: 'olivier.louis@ac-guyane.fr',
    tels: [{ type: 'fixe', number: '0594.27.19.46' }, { type: 'mobile', number: '0694.25.82.75' }],
    accent: 'from-fuchsia-400 to-pink-500', iconKey: 'chip' },
];

const SCHOOLS_FALLBACK: School[] = [
  { name: 'Eliette Danglades Élémentaire', type: 'EEPU', directors: [
    { name: 'M. Lecante Laurent', email: 'ce.9730128b@ac-guyane.fr', tels: [{ type: 'fixe', number: '0594.38.21.92' }, { type: 'mobile', number: '0694.23.15.44' }] },
  ]},
  { name: 'Eliette Danglades Maternelle', type: 'EMPU', directors: [
    { name: 'Mme Milzink-Seewgobind Line', email: 'ce.9730129c@ac-guyane.fr', tels: [{ type: 'fixe', number: '0594.31.59.90' }, { type: 'mobile', number: '0694.21.83.66' }] },
  ]},
  { name: 'Heder Élémentaire', type: 'EEPU', directors: [
    { name: 'Mme Said Katia', email: 'ce.9730114l@ac-guyane.fr', tels: [{ type: 'fixe', number: '0594.31.09.54' }, { type: 'mobile', number: '0694.13.27.20' }] },
  ]},
  { name: 'Heder Maternelle', type: 'EMPU', directors: [
    { name: 'Mme Lecante Travise', email: 'ce.9730117p@ac-guyane.fr', tels: [{ type: 'fixe', number: '0594.30.23.17' }, { type: 'mobile', number: '0694.20.73.80' }] },
  ]},
  { name: 'Gaetan Hermine Élémentaire', type: 'EEPU', directors: [
    { name: 'Mme William Marie-Agnès', email: 'ce.9730042h@ac-guyane.fr', tels: [{ type: 'fixe', number: '0594.31.28.51' }, { type: 'mobile', number: '0694.38.95.25' }] },
  ]},
  { name: 'Gaetan Hermine Maternelle', type: 'EMPU', directors: [
    { name: 'M. Agot Patrick', email: 'ce.9730189t@ac-guyane.fr', tels: [{ type: 'fixe', number: '0594.31.03.73' }, { type: 'mobile', number: '0694.27.61.17' }] },
  ]},
  { name: 'Mont-Lucas Élémentaire', type: 'EEPU', directors: [
    { name: 'Mme Mathurin Sonia', email: 'ce.9730211s@ac-guyane.fr', tels: [{ type: 'fixe', number: '0594.30.35.03' }, { type: 'mobile', number: '0694.28.68.21' }] },
  ]},
  { name: 'Mont-Lucas Maternelle', type: 'EMPU', directors: [
    { name: 'Mme Charles Maryse', email: 'ce.9730209p@ac-guyane.fr', tels: [{ type: 'fixe', number: '0594.30.35.05' }, { type: 'mobile', number: '0694.24.31.42' }] },
  ]},
  { name: 'Vendome Élémentaire', type: 'EEPU', directors: [
    { name: 'M. Madeleine Didier', email: 'ce.9730399w@ac-guyane.fr', tels: [{ type: 'fixe', number: '0594.25.22.51' }, { type: 'mobile', number: '0694.26.31.89' }] },
  ]},
  { name: 'Vendome Maternelle', type: 'EMPU', directors: [
    { name: 'Mme Waya Kety', email: 'ce.9730417r@ac-guyane.fr', tels: [{ type: 'fixe', number: '0594.25.22.52' }, { type: 'mobile', number: '0694.24.36.37' }] },
  ]},
  { name: 'Saba', type: 'EEPU', directors: [
    { name: 'Mme Portut Sarah', email: 'ce.9730104a@ac-guyane.fr', tels: [{ type: 'fixe', number: '0594.30.23.06' }, { type: 'mobile', number: '0694.03.53.00' }] },
  ]},
  { name: 'La Roseraie', type: 'EMPU', directors: [
    { name: 'Mme Deltoy Sylvie', email: 'ce.9730203h@ac-guyane.fr', tels: [{ type: 'fixe', number: '0594.31.44.46' }, { type: 'mobile', number: '0694.28.28.68' }] },
  ]},
  { name: 'Léodate Volmar', type: 'EMPU', directors: [
    { name: 'Mme Parfait Hadely', email: 'ce.9730326s@ac-guyane.fr', tels: [{ type: 'fixe', number: '0594.30.03.97' }, { type: 'mobile', number: '0694.40.66.01' }] },
  ]},
  { name: 'Jean-Marie Mortin', type: 'GS', directors: [
    { name: 'Mme Jean-Louis Béatrice', email: 'ce.9730200e@ac-guyane.fr', tels: [{ type: 'fixe', number: '0594.30.13.85' }, { type: 'mobile', number: '0694.22.47.77' }] },
  ]},
  { name: 'Augustine Duchange', type: 'GS', directors: [
    { name: 'M. Othily Ariès', email: 'ce.9730043j@ac-guyane.fr', tels: [{ type: 'fixe', number: '0594.37.05.21' }, { type: 'mobile', number: '0694.40.28.19' }] },
  ]},
  { name: 'De Cacao', type: 'EEPR', directors: [
    { name: 'Mme Rabinaud Véronique', email: 'ce.9730227j@ac-guyane.fr', tels: [{ type: 'fixe', number: '0594.27.09.93' }, { type: 'mobile', number: '0694.23.23.40' }] },
  ]},
  { name: 'Saint-Paul', type: 'EEPR', directors: [
    { name: 'M. Lau Ndzeu Tchi George', email: 'secretariat.ecolesaintpaul.kko@orange.fr', tels: [{ type: 'fixe', number: '0594.27.02.13' }, { type: 'fixe', number: '0594.27.01.50' }] },
  ]},
  { name: 'La Persévérance', type: 'EEPR', directors: [
    { name: 'M. Vouimba Hugues', email: 'directionperseverancecay@gmail.com', tels: [{ type: 'fixe', number: '0594.30.06.78' }, { type: 'mobile', number: '0767.04.02.75' }] },
  ]},
];

const SCHOOL_PALETTES = [
  { from: 'from-rose-400', to: 'to-pink-500', ring: 'ring-rose-200', tint: 'bg-rose-50' },
  { from: 'from-sky-400', to: 'to-indigo-500', ring: 'ring-sky-200', tint: 'bg-sky-50' },
  { from: 'from-emerald-400', to: 'to-teal-500', ring: 'ring-emerald-200', tint: 'bg-emerald-50' },
  { from: 'from-amber-400', to: 'to-orange-500', ring: 'ring-amber-200', tint: 'bg-amber-50' },
  { from: 'from-violet-400', to: 'to-purple-500', ring: 'ring-violet-200', tint: 'bg-violet-50' },
  { from: 'from-cyan-400', to: 'to-blue-500', ring: 'ring-cyan-200', tint: 'bg-cyan-50' },
  { from: 'from-fuchsia-400', to: 'to-rose-500', ring: 'ring-fuchsia-200', tint: 'bg-fuchsia-50' },
  { from: 'from-lime-400', to: 'to-green-500', ring: 'ring-lime-200', tint: 'bg-lime-50' },
];

function hashIdx(name: string, mod: number) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % mod;
}

function paletteFor(name: string) { return SCHOOL_PALETTES[hashIdx(name, SCHOOL_PALETTES.length)]; }

function initials(name: string) {
  const clean = name.replace(/\b(M\.|Mme\.?|Mr\.?|Mrs\.?)\b/gi, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const TYPE_LABELS: Record<string, string> = { EEPU: 'Élémentaire publique', EMPU: 'Maternelle publique', EEPR: 'Élémentaire privée', GS: 'Groupe scolaire' };

export default function AnnuairePage() {
  const [q, setQ] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [circo, setCirco] = useState<CircoMember[]>(CIRCO_FALLBACK);
  const [schools, setSchools] = useState<School[]>(SCHOOLS_FALLBACK);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/annuaire')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        if (cancelled) return;
        if (Array.isArray(data?.circo) && data.circo.length > 0) {
          setCirco(data.circo.map((c: any) => ({
            role: c.role, roleLong: c.roleLong, name: c.name, email: c.email || undefined,
            tels: Array.isArray(c.tels) ? c.tels : [],
            accent: c.accent, iconKey: c.iconKey,
          })));
        }
        if (Array.isArray(data?.ecoles) && data.ecoles.length > 0) {
          setSchools(data.ecoles.map((e: any) => ({
            name: e.name,
            type: e.type || undefined,
            directors: (e.directors || []).map((d: any) => ({
              name: d.name, role: d.role || undefined, email: d.email || undefined,
              tels: Array.isArray(d.tels) ? d.tels : [],
            })),
          })));
        }
      })
      .catch(() => { /* fallback déjà en place */ });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return schools;
    const digits = query.replace(/\D/g, '');
    return schools
      .map(s => {
        const schoolMatch = s.name.toLowerCase().includes(query);
        const directors = schoolMatch
          ? s.directors
          : s.directors.filter(d =>
              d.name.toLowerCase().includes(query) ||
              (d.email?.toLowerCase().includes(query)) ||
              (digits.length >= 2 && d.tels.some(t => t.number.replace(/\D/g, '').includes(digits)))
            );
        return { ...s, directors };
      })
      .filter(s => s.directors.length > 0);
  }, [q, schools]);

  const circoFiltered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return circo;
    return circo.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.role.toLowerCase().includes(query) ||
      c.roleLong.toLowerCase().includes(query) ||
      (c.email?.toLowerCase().includes(query) ?? false)
    );
  }, [q, circo]);

  const totalDirectors = schools.reduce((n, s) => n + s.directors.length, 0);

  const copy = async (v: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(v);
      } else {
        const ta = document.createElement('textarea');
        ta.value = v;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch {}
    setCopied(v);
    setTimeout(() => setCopied(c => (c === v ? null : c)), 1600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-[480px] h-[480px] bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -right-16 w-[520px] h-[520px] bg-[#45b8a0]/40 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/2 w-[320px] h-[320px] bg-fuchsia-400/10 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-6 py-10 relative">
          <Link href="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors">
            ← Retour à l&apos;accueil
          </Link>
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white/90 mb-3 border border-white/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                Année scolaire 2025–2026
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Annuaire</h1>
              <p className="text-white/85 mt-2 max-w-xl text-lg">Circonscription Cayenne 2 · Roura — équipe pédagogique et directions d&apos;école.</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <StatChip value={circo.length} label="Équipe circo" />
              <StatChip value={schools.length} label="Écoles" />
              <StatChip value={totalDirectors} label="Directions" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-14 relative">
        {/* CIRCO bento */}
        <section className="mb-10">
          <div className="flex items-baseline justify-between px-1 mb-3">
            <h2 className="text-xs uppercase tracking-[0.2em] text-white/80 font-semibold">Équipe de circonscription</h2>
            <span className="text-xs text-white/60">{circoFiltered.length} membre{circoFiltered.length > 1 ? 's' : ''}</span>
          </div>
          {circoFiltered.length === 0 ? (
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center text-white/70 border border-white/10">Aucun résultat</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {circoFiltered.map((m, i) => (
                <CircoCard key={m.role} member={m} featured={m.role === 'IEN'} copy={copy} copied={copied} delay={i * 40} />
              ))}
            </div>
          )}
        </section>

        {/* Search + controls */}
        <div className="bg-white/95 backdrop-blur rounded-2xl p-4 shadow-xl mb-6 border border-white/40 flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input
              type="search"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Rechercher une école, un directeur, un numéro…"
              className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-xl text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none transition-all"
            />
          </div>
          {q && (
            <button onClick={() => setQ('')} className="text-sm text-gray-500 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors self-start md:self-auto">
              Effacer
            </button>
          )}
        </div>

        {/* Schools */}
        <div className="flex items-baseline justify-between px-1 mb-3">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/80 font-semibold">Écoles</h2>
          <span className="text-xs text-white/60">{filtered.length} école{filtered.length > 1 ? 's' : ''}</span>
        </div>
        {filtered.length === 0 ? (
          <div className="bg-white/95 rounded-2xl p-10 text-center border border-white/30">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-700 font-medium">Aucune école ne correspond à votre recherche</p>
            <p className="text-gray-500 text-sm mt-1">Essayez un autre mot ou un numéro partiel.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((s, i) => (
              <SchoolCard key={s.name} school={s} copy={copy} copied={copied} delay={i * 35} />
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 transition-all duration-300 pointer-events-none ${copied ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-2xl text-sm flex items-center gap-2 border border-white/10">
          <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          Copié · {copied}
        </div>
      </div>
    </div>
  );
}

function StatChip({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white/15 backdrop-blur-sm border border-white/25 rounded-2xl px-5 py-3 min-w-[110px] text-white">
      <div className="text-3xl font-bold leading-none">{value}</div>
      <div className="text-[11px] uppercase tracking-widest mt-1 opacity-85">{label}</div>
    </div>
  );
}

function CircoCard({ member, featured, copy, copied, delay }: { member: CircoMember; featured: boolean; copy: (v: string) => void; copied: string | null; delay: number }) {
  return (
    <div
      className={`group relative rounded-2xl bg-white/95 backdrop-blur border border-white/30 p-4 shadow-lg transition-all duration-300 ease-out
        hover:-translate-y-1.5 hover:scale-[1.035] hover:shadow-[0_24px_60px_-18px_rgba(0,0,0,0.35)] hover:bg-white hover:border-white
        overflow-hidden animate-fadein cursor-default
        ${featured ? 'col-span-2 md:col-span-2 md:row-span-1' : 'col-span-1'}
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Glow coloré qui apparaît au survol */}
      <div className={`pointer-events-none absolute -inset-10 bg-gradient-to-br ${member.accent} opacity-0 group-hover:opacity-[0.12] blur-3xl transition-opacity duration-500`} />
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${member.accent} transition-all duration-300 group-hover:h-1.5`} />
      <div className="relative flex items-start gap-3">
        <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${member.accent} flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-3deg]`}>
          {initials(member.name)}
          {featured && (
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-400 text-white rounded-full flex items-center justify-center shadow-md ring-2 ring-white">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.39 7.36H22l-6.19 4.5L18.2 21 12 16.5 5.8 21l2.39-7.14L2 9.36h7.61L12 2z" /></svg>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-gray-500">
            <RoleIcon kind={member.iconKey} />
            {member.role}
          </div>
          <div className="font-semibold text-gray-900 truncate mt-0.5">{member.name}</div>
          <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{member.roleLong}</div>
        </div>
      </div>
      <div className="relative mt-3 flex flex-wrap gap-1.5">
        {member.tels.map(t => <TelChip key={t.number} tel={t} copy={copy} copied={copied} />)}
        {member.email && <EmailChip email={member.email} copy={copy} copied={copied} />}
      </div>
    </div>
  );
}

function SchoolCard({ school, copy, copied, delay }: { school: School; copy: (v: string) => void; copied: string | null; delay: number }) {
  const pal = paletteFor(school.name);
  return (
    <div
      className="group relative rounded-2xl bg-white/97 backdrop-blur border border-white/30 overflow-hidden shadow-lg transition-all duration-300 ease-out
        hover:-translate-y-1.5 hover:scale-[1.025] hover:shadow-[0_28px_70px_-18px_rgba(0,0,0,0.4)] hover:bg-white hover:border-white
        animate-fadein cursor-default"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Glow coloré diffus au survol */}
      <div className={`pointer-events-none absolute -inset-12 bg-gradient-to-br ${pal.from} ${pal.to} opacity-0 group-hover:opacity-[0.14] blur-3xl transition-opacity duration-500`} />
      <div className={`relative h-1.5 bg-gradient-to-r ${pal.from} ${pal.to} transition-all duration-300 group-hover:h-2.5`} />
      <div className="relative p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${pal.from} ${pal.to} flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}>
            {initials(school.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate leading-tight">{school.name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {school.type && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase ${pal.tint} text-gray-700 px-2 py-0.5 rounded-full`}>
                  {school.type} · {TYPE_LABELS[school.type]}
                </span>
              )}
              {!school.type && school.directors.length > 1 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {school.directors.length} directions
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {school.directors.map(d => (
            <div key={d.name} className="rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors p-3 border border-gray-100">
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <div className="font-medium text-gray-900 text-sm truncate">{d.name}</div>
                {d.role && <span className="text-[10px] font-semibold tracking-wide uppercase text-gray-500">{d.role}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {d.tels.map(t => <TelChip key={t.number} tel={t} copy={copy} copied={copied} />)}
                {d.email && <EmailChip email={d.email} copy={copy} copied={copied} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TelChip({ tel, copy, copied }: { tel: Tel; copy: (v: string) => void; copied: string | null }) {
  const isMobile = tel.type === 'mobile';
  const isCopied = copied === tel.number;
  return (
    <button
      onClick={(e) => { e.preventDefault(); copy(tel.number); }}
      onDoubleClick={() => { window.location.href = `tel:${tel.number.replace(/\D/g, '')}`; }}
      className={`group/tel inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all
        ${isCopied
          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
          : isMobile
            ? 'bg-white border-gray-200 text-gray-800 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'
            : 'bg-white border-gray-200 text-gray-800 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
        }`}
      title="Cliquer : copier · Double-cliquer : appeler"
    >
      {isCopied ? (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      ) : isMobile ? (
        <svg className="w-3.5 h-3.5 opacity-70 group-hover/tel:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2" ry="2" /><path d="M11 18h2" /></svg>
      ) : (
        <svg className="w-3.5 h-3.5 opacity-70 group-hover/tel:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" /></svg>
      )}
      {tel.number}
    </button>
  );
}

function EmailChip({ email, copy, copied }: { email: string; copy: (v: string) => void; copied: string | null }) {
  const isCopied = copied === email;
  return (
    <button
      onClick={(e) => { e.preventDefault(); copy(email); }}
      onDoubleClick={() => { window.location.href = `mailto:${email}`; }}
      className={`group/mail inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all max-w-full
        ${isCopied
          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
          : 'bg-white border-gray-200 text-gray-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700'
        }`}
      title="Cliquer : copier · Double-cliquer : écrire"
    >
      {isCopied ? (
        <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      ) : (
        <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-70 group-hover/mail:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
      )}
      <span className="truncate">{email}</span>
    </button>
  );
}

function RoleIcon({ kind }: { kind: CircoMember['iconKey'] }) {
  const cls = 'w-3 h-3';
  switch (kind) {
    case 'star': return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.39 7.36H22l-6.19 4.5L18.2 21 12 16.5 5.8 21l2.39-7.14L2 9.36h7.61L12 2z" /></svg>;
    case 'folder': return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>;
    case 'compass': return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>;
    case 'activity': return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
    case 'chip': return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" /></svg>;
  }
}
