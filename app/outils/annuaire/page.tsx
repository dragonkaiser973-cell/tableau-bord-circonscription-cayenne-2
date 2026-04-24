'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';

type Tel = { type: 'fixe' | 'mobile'; number: string };
type Person = { name: string; role?: string; email?: string; tels: Tel[] };
type CircoMember = { role: string; roleLong: string; name: string; email?: string; tels: Tel[]; accent: string; iconKey: 'star' | 'folder' | 'compass' | 'activity' | 'chip' };
type School = { name: string; type?: 'EEPU' | 'EMPU' | 'EEPR' | 'GS'; directors: Person[] };

const CIRCO_FALLBACK: CircoMember[] = [
  { role: 'IEN', roleLong: "Inspectrice de l'Éducation Nationale", name: 'Mme Lautric Chantal', email: 'chantal.lautric@ac-guyane.fr',
    tels: [{ type: 'fixe', number: '0594.27.19.24' }, { type: 'mobile', number: '0694.27.25.32' }],
    accent: 'from-amber-400 via-orange-400 to-rose-500', iconKey: 'star' },
  { role: 'Secrétaire', roleLong: 'Secrétaire de circonscription', name: 'Mme Pigree Anna', email: 'anna.pigree@ac-guyane.fr',
    tels: [{ type: 'fixe', number: '0594.27.19.13' }],
    accent: 'from-sky-400 via-cyan-400 to-teal-400', iconKey: 'folder' },
  { role: 'CPAIEN', roleLong: "Conseillère pédagogique auprès de l'IEN", name: 'Mme Hernandez Mona', email: 'mona.hernandez@ac-guyane.fr',
    tels: [{ type: 'fixe', number: '0594.27.19.46' }],
    accent: 'from-violet-400 via-fuchsia-400 to-pink-400', iconKey: 'compass' },
  { role: 'CPC EPS', roleLong: 'Conseiller pédagogique — EPS', name: 'M. Pierre Gaelle Jean-Luc', email: 'j-luc.pierre@ac-guyane.fr',
    tels: [{ type: 'fixe', number: '0594.27.19.43' }],
    accent: 'from-emerald-400 via-teal-400 to-cyan-400', iconKey: 'activity' },
  { role: 'CPC NE', roleLong: 'Conseiller pédagogique — Numérique éducatif', name: 'M. Louis Olivier', email: 'olivier.louis@ac-guyane.fr',
    tels: [{ type: 'fixe', number: '0594.27.19.46' }, { type: 'mobile', number: '0694.25.82.75' }],
    accent: 'from-indigo-400 via-blue-500 to-cyan-400', iconKey: 'chip' },
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

function initials(name: string) {
  const clean = name.replace(/\b(M\.|Mme\.?|Mr\.?|Mrs\.?)\b/gi, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const TYPE_META: Record<string, { label: string; gradient: string; tint: string; text: string }> = {
  EEPU: { label: 'Élémentaire publique', gradient: 'from-sky-500 to-cyan-500',       tint: 'bg-sky-50',     text: 'text-sky-700' },
  EMPU: { label: 'Maternelle publique',   gradient: 'from-rose-400 to-pink-500',     tint: 'bg-rose-50',    text: 'text-rose-700' },
  EEPR: { label: 'Élémentaire privée',    gradient: 'from-violet-500 to-fuchsia-500',tint: 'bg-violet-50',  text: 'text-violet-700' },
  GS:   { label: 'Groupe scolaire',       gradient: 'from-amber-400 to-orange-500',  tint: 'bg-amber-50',   text: 'text-amber-700' },
};

// Asymmetric 12-col bento for schools
const SCHOOL_SPAN_CYCLE = [
  'lg:col-span-5', 'lg:col-span-7',
  'lg:col-span-4', 'lg:col-span-4', 'lg:col-span-4',
  'lg:col-span-7', 'lg:col-span-5',
  'lg:col-span-6', 'lg:col-span-6',
  'lg:col-span-4', 'lg:col-span-8',
  'lg:col-span-4', 'lg:col-span-4', 'lg:col-span-4',
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { type: 'spring' as const, stiffness: 110, damping: 18, delay: i * 0.05 },
  }),
};

export default function AnnuairePage() {
  const [q, setQ] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [circo, setCirco] = useState<CircoMember[]>(CIRCO_FALLBACK);
  const [schools, setSchools] = useState<School[]>(SCHOOLS_FALLBACK);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/annuaire')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        if (cancelled) return;
        if (Array.isArray(data?.circo) && data.circo.length > 0) {
          setCirco(data.circo.map((c: any, i: number) => ({
            role: c.role, roleLong: c.roleLong, name: c.name, email: c.email || undefined,
            tels: Array.isArray(c.tels) ? c.tels : [],
            accent: CIRCO_FALLBACK[i]?.accent || 'from-emerald-400 to-teal-500',
            iconKey: c.iconKey || CIRCO_FALLBACK[i]?.iconKey || 'compass',
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
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setQ('');
        setTypeFilter(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const digits = query.replace(/\D/g, '');
    return schools
      .filter(s => !typeFilter || s.type === typeFilter)
      .map(s => {
        if (!query) return s;
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
  }, [q, schools, typeFilter]);

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

  const ien = circo.find(c => c.role === 'IEN');
  const others = circoFiltered.filter(c => c.role !== 'IEN' || q);

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-[Outfit,system-ui,sans-serif] text-slate-900 antialiased selection:bg-[#45b8a0] selection:text-white overflow-x-hidden">

      {/* ═══════════════════════════════════════════════════════════════
          HERO — Aurora background + glass search
      ═══════════════════════════════════════════════════════════════ */}
      <header className="relative overflow-hidden">
        {/* Aurora gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]" />
        {/* Aurora animated blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="aurora-blob" style={{ top: '-10%', left: '-5%', width: '55vw', height: '55vw', background: 'radial-gradient(circle, #45b8a0 0%, transparent 60%)' }} />
          <div className="aurora-blob" style={{ top: '10%', right: '-15%', width: '60vw', height: '60vw', background: 'radial-gradient(circle, #2d8ba8 0%, transparent 60%)', animationDelay: '-6s' }} />
          <div className="aurora-blob" style={{ bottom: '-20%', left: '20%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, #0891b2 0%, transparent 60%)', animationDelay: '-12s' }} />
        </div>
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.08] pointer-events-none" aria-hidden>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.3)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.3)_1px,transparent_1px)] bg-[size:72px_72px]" />
        </div>
        {/* Bottom gradient fade to slate-50 */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-slate-50 pointer-events-none" />

        <div className="relative max-w-[1400px] mx-auto px-6 md:px-10 pt-8 pb-24 md:pt-10 md:pb-32">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors mb-12"
          >
            <svg className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5m0 0l6 6m-6-6l6-6" /></svg>
            Retour
          </Link>

          <motion.div
            initial="hidden" animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
          >
            <motion.div variants={fadeUp} custom={0} className="inline-flex items-center gap-2 backdrop-blur-xl bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 rounded-full bg-[#45b8a0] animate-ping opacity-75" />
                <span className="relative rounded-full h-2 w-2 bg-[#45b8a0]" />
              </span>
              <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/95">Année scolaire 2025 — 2026</span>
            </motion.div>

            <motion.h1
              variants={fadeUp} custom={1}
              className="font-[Outfit,sans-serif] text-[52px] md:text-[92px] font-bold tracking-[-0.035em] leading-[0.92]"
            >
              <span className="block text-white">Annuaire de la</span>
              <span className="block bg-gradient-to-r from-[#45b8a0] via-cyan-300 to-sky-200 bg-clip-text text-transparent animate-gradient-text">circonscription.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp} custom={2}
              className="mt-7 text-white/80 text-base md:text-xl max-w-[58ch] leading-relaxed font-[Outfit,sans-serif] font-light"
            >
              Cayenne 2 — Roura. L&apos;équipe pédagogique et les dix-huit directions d&apos;école à portée de clic.
            </motion.p>

            {/* Stats — glass pills */}
            <motion.div variants={fadeUp} custom={3} className="mt-10 flex flex-wrap gap-3">
              <StatPill value={circo.length} label="Équipe circo" gradient="from-amber-400 to-orange-500" />
              <StatPill value={schools.length} label="Écoles" gradient="from-[#45b8a0] to-cyan-400" />
              <StatPill value={totalDirectors} label="Directions" gradient="from-violet-400 to-pink-400" />
            </motion.div>

            {/* ═══ SEARCH — glass morph ═══ */}
            <motion.div variants={fadeUp} custom={4} className="mt-10 md:mt-14 max-w-[860px]">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#45b8a0] via-cyan-400 to-sky-400 rounded-[28px] opacity-40 blur-xl group-focus-within:opacity-80 transition-opacity duration-500" />
                <div className="relative">
                  <svg
                    className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60 group-focus-within:text-[#45b8a0] transition-colors duration-300"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
                  </svg>
                  <input
                    ref={searchRef}
                    type="search"
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder="Rechercher une école, un directeur, un numéro…"
                    className="w-full h-16 pl-16 pr-32 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl text-white placeholder-white/50 text-base md:text-lg shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_24px_48px_-16px_rgba(0,0,0,0.4)] focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all duration-300 font-[Outfit,sans-serif]"
                    aria-label="Rechercher dans l'annuaire"
                  />
                  {q ? (
                    <button
                      onClick={() => setQ('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 px-4 h-10 text-sm font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all duration-200 cursor-pointer active:scale-95"
                    >
                      Effacer
                    </button>
                  ) : (
                    <kbd className="absolute right-5 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-mono font-semibold text-white/70 bg-white/10 border border-white/20 rounded-lg">
                      / pour chercher
                    </kbd>
                  )}
                </div>
              </div>

              {/* Type filters */}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/50 mr-1">Filtrer</span>
                {(['EEPU','EMPU','EEPR','GS'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                    className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-semibold tracking-wide transition-all duration-200 cursor-pointer active:scale-95
                      ${typeFilter === t
                        ? `bg-gradient-to-r ${TYPE_META[t].gradient} text-white border-transparent shadow-lg shadow-black/20`
                        : 'bg-white/5 border-white/15 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/30'
                      }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${typeFilter === t ? 'bg-white' : `bg-gradient-to-r ${TYPE_META[t].gradient}`}`} />
                    {t}
                    <span className={`font-normal ${typeFilter === t ? 'text-white/90' : 'text-white/50'}`}>· {TYPE_META[t].label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-20 relative -mt-16">

        {/* ═══════════════════════════════════════════════════════════════
            FEATURED — IEN
        ═══════════════════════════════════════════════════════════════ */}
        {ien && !q && !typeFilter && (
          <motion.section
            className="mb-20 md:mb-28"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ type: 'spring', stiffness: 90, damping: 18 }}
          >
            <SectionHeader index="01" kicker="À la une" title="Direction de l'inspection" />
            <FeaturedIEN member={ien} copy={copy} copied={copied} />
          </motion.section>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            CIRCO — Bento grid with tilt cards
        ═══════════════════════════════════════════════════════════════ */}
        <motion.section
          className="mb-20 md:mb-28"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <SectionHeader
            index={ien && !q && !typeFilter ? '02' : '01'}
            kicker="Équipe"
            title="Circonscription"
            counter={`${others.length}`}
          />

          {others.length === 0 ? (
            <EmptyState message="Aucun membre ne correspond." />
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-5"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
            >
              {others.map((m, i) => (
                <motion.div key={m.role} variants={fadeUp} custom={i}>
                  <CircoCard member={m} copy={copy} copied={copied} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.section>

        {/* ═══════════════════════════════════════════════════════════════
            SCHOOLS — asymmetric bento with spotlight cards
        ═══════════════════════════════════════════════════════════════ */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
        >
          <SectionHeader
            index={ien && !q && !typeFilter ? '03' : '02'}
            kicker="Terrain"
            title="Écoles & directions"
            counter={`${filtered.length}`}
          />

          {filtered.length === 0 ? (
            <EmptyState message="Aucune école ne correspond. Essayez un mot-clé ou des chiffres." />
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((s, i) => (
                  <motion.div
                    key={s.name}
                    layout
                    variants={fadeUp}
                    custom={i}
                    className={SCHOOL_SPAN_CYCLE[i % SCHOOL_SPAN_CYCLE.length]}
                  >
                    <SchoolCard school={s} copy={copy} copied={copied} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.section>
      </main>

      {/* ═══ Toast ═══ */}
      <AnimatePresence>
        {copied && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            role="status"
            aria-live="polite"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="inline-flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-950/95 backdrop-blur-xl text-white shadow-[0_20px_50px_-10px_rgba(15,23,42,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/10">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/40">
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <span className="text-[13px] font-semibold">Copié</span>
              <span className="text-[13px] font-mono text-slate-300">{copied}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────── Sub-components ────────── */

function StatPill({ value, label, gradient }: { value: number; label: string; gradient: string }) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group relative flex items-center gap-3 px-5 py-3 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
    >
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center font-bold text-white text-lg shadow-lg tabular-nums`}>
        {String(value).padStart(2, '0')}
      </div>
      <span className="text-[11px] font-semibold tracking-[0.16em] uppercase text-white/80">{label}</span>
    </motion.div>
  );
}

function SectionHeader({
  index, kicker, title, counter,
}: { index: string; kicker: string; title: string; counter?: string }) {
  return (
    <div className="flex items-end justify-between gap-6 mb-10">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#1e5a78] to-[#45b8a0] text-white font-mono text-[11px] font-bold tracking-wider shadow-lg shadow-[#45b8a0]/20">
            {index}
          </span>
          <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-slate-500">{kicker}</span>
        </div>
        <h2 className="font-[Outfit,sans-serif] text-3xl md:text-5xl font-bold tracking-[-0.025em] text-slate-950 leading-none">
          {title}
        </h2>
      </div>
      {counter && (
        <div className="pb-2 hidden md:block">
          <div className="text-4xl font-bold font-[Outfit,sans-serif] text-transparent bg-clip-text bg-gradient-to-br from-[#1e5a78] to-[#45b8a0] tabular-nums leading-none">
            {String(counter).padStart(2, '0')}
          </div>
          <div className="text-[10px] font-semibold tracking-[0.18em] uppercase text-slate-400 text-right mt-1">
            résultat{Number(counter) > 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 py-20 px-6 text-center">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent pointer-events-none" />
      <div className="relative">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
          <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
        </div>
        <p className="text-[15px] font-medium text-slate-700">{message}</p>
      </div>
    </div>
  );
}

/* ════════════ FEATURED IEN — dark glass + aurora ════════════ */
function FeaturedIEN({
  member, copy, copied,
}: { member: CircoMember; copy: (v: string) => void; copied: string | null }) {
  const mx = useMotionValue(50);
  const my = useMotionValue(50);
  const rotateY = useTransform(mx, [0, 100], [-6, 6]);
  const rotateX = useTransform(my, [0, 100], [3, -3]);

  const handleMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - rect.left) / rect.width) * 100);
    my.set(((e.clientY - rect.top) / rect.height) * 100);
  };
  const handleLeave = () => { mx.set(50); my.set(50); };

  return (
    <motion.article
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ perspective: 1200 }}
      className="relative"
    >
      <motion.div
        style={{ rotateY, rotateX, transformStyle: 'preserve-3d' }}
        transition={{ type: 'spring', stiffness: 150, damping: 20 }}
        className="relative rounded-[32px] overflow-hidden bg-gradient-to-br from-[#0f3847] via-[#1e5a78] to-[#0a2f3d] border border-white/10 shadow-[0_40px_80px_-20px_rgba(15,56,71,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]"
      >
        {/* Aurora blobs inside */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="aurora-blob" style={{ top: '-30%', right: '-10%', width: '70%', height: '140%', background: 'radial-gradient(circle, #45b8a0 0%, transparent 60%)', opacity: 0.45 }} />
          <div className="aurora-blob" style={{ bottom: '-30%', left: '-10%', width: '60%', height: '130%', background: 'radial-gradient(circle, #f59e0b 0%, transparent 60%)', opacity: 0.25, animationDelay: '-9s' }} />
        </div>
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" aria-hidden>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:48px_48px]" />
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Left: copy — 7/12 */}
          <div className="lg:col-span-7 p-8 md:p-14 flex flex-col justify-between gap-10 min-h-[360px]">
            <div>
              <div className="inline-flex items-center gap-2 backdrop-blur-xl bg-white/10 border border-white/20 rounded-full px-3 py-1.5 mb-7">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-75" />
                  <span className="relative rounded-full h-1.5 w-1.5 bg-amber-400" />
                </span>
                <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/90">Inspection · Featured</span>
              </div>

              <div className="font-[Outfit,sans-serif] text-[11px] font-semibold tracking-[0.22em] uppercase text-[#45b8a0] mb-3">
                {member.role}
              </div>
              <h3 className="font-[Outfit,sans-serif] text-4xl md:text-6xl font-bold tracking-[-0.035em] leading-[1.02] text-white">
                {member.name}
              </h3>
              <p className="mt-5 text-white/70 text-[15px] md:text-[17px] leading-relaxed max-w-[44ch] font-light">
                {member.roleLong}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {member.tels.map(t => <TelChip key={t.number} tel={t} copy={copy} copied={copied} variant="dark" />)}
              {member.email && <EmailChip email={member.email} copy={copy} copied={copied} variant="dark" />}
            </div>
          </div>

          {/* Right: monogram — 5/12 */}
          <div className="lg:col-span-5 relative border-t lg:border-t-0 lg:border-l border-white/10 flex items-center justify-center p-10 min-h-[280px]">
            <div className={`absolute inset-0 bg-gradient-to-br ${member.accent} opacity-20 pointer-events-none`} />
            <div className="relative w-40 h-40 md:w-52 md:h-52">
              {/* Rotating ring */}
              <motion.div
                className="absolute inset-0 rounded-full border border-white/20"
                animate={{ rotate: 360 }}
                transition={{ duration: 40, ease: 'linear', repeat: Infinity }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
              </motion.div>
              {/* Inner monogram */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-amber-300 via-orange-400 to-rose-500 shadow-[0_20px_60px_-10px_rgba(245,158,11,0.6),inset_0_2px_0_rgba(255,255,255,0.3)] flex items-center justify-center animate-aurora-pulse">
                <span className="font-[Outfit,sans-serif] text-5xl md:text-6xl font-bold text-white tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
                  {initials(member.name)}
                </span>
              </div>
            </div>
            <div className="absolute bottom-5 right-6 text-[9px] font-mono font-semibold tracking-[0.2em] uppercase text-white/35">
              IEN · 01
            </div>
          </div>
        </div>
      </motion.div>
    </motion.article>
  );
}

/* ════════════ CIRCO CARD — glass + gradient accent ════════════ */
function CircoCard({
  member, copy, copied,
}: { member: CircoMember; copy: (v: string) => void; copied: string | null }) {
  const cardRef = useRef<HTMLElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
  };

  return (
    <motion.article
      ref={cardRef as any}
      onMouseMove={handleMove}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="spotlight-card group relative h-full rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-[0_1px_0_rgba(15,23,42,0.02),0_16px_36px_-20px_rgba(15,23,42,0.1)] hover:shadow-[0_1px_0_rgba(15,23,42,0.04),0_32px_60px_-24px_rgba(30,90,120,0.28)] hover:border-[#45b8a0]/40 transition-[box-shadow,border-color] duration-300"
    >
      {/* Top gradient bar */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${member.accent}`} />
      {/* Inner refraction */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" />

      <div className="relative p-6">
        <div className="flex items-start gap-4">
          <motion.div
            whileHover={{ rotate: -6, scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className={`relative flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${member.accent} flex items-center justify-center font-[Outfit,sans-serif] font-bold text-white text-lg shadow-[0_8px_20px_-6px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.3)]`}
          >
            {initials(member.name)}
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500">
              <RoleIcon kind={member.iconKey} />
              {member.role}
            </div>
            <div className="font-[Outfit,sans-serif] font-semibold text-[15px] text-slate-950 tracking-tight mt-1 leading-tight break-words">
              {member.name}
            </div>
            <div className="text-[11px] text-slate-500 mt-1.5 leading-snug line-clamp-2">
              {member.roleLong}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-1.5">
          {member.tels.map(t => <TelChip key={t.number} tel={t} copy={copy} copied={copied} />)}
          {member.email && <EmailChip email={member.email} copy={copy} copied={copied} />}
        </div>
      </div>
    </motion.article>
  );
}

/* ════════════ SCHOOL CARD — spotlight + gradient type ════════════ */
function SchoolCard({
  school, copy, copied,
}: { school: School; copy: (v: string) => void; copied: string | null }) {
  const cardRef = useRef<HTMLElement>(null);
  const typeMeta = school.type ? TYPE_META[school.type] : null;

  const handleMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - rect.top) / rect.height) * 100}%`);
  };

  return (
    <motion.article
      ref={cardRef as any}
      onMouseMove={handleMove}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="spotlight-card group relative h-full rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-[0_1px_0_rgba(15,23,42,0.02),0_16px_36px_-20px_rgba(15,23,42,0.1)] hover:shadow-[0_1px_0_rgba(15,23,42,0.04),0_32px_60px_-24px_rgba(30,90,120,0.28)] hover:border-[#45b8a0]/40 transition-[box-shadow,border-color] duration-300"
    >
      {/* Gradient bar by type */}
      {typeMeta && (
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${typeMeta.gradient}`} />
      )}
      <div className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" />

      <div className="relative p-6 md:p-7">
        <header className="flex items-start gap-4 pb-5 mb-5 border-b border-slate-100">
          <motion.div
            whileHover={{ rotate: -6, scale: 1.06 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className={`flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${typeMeta?.gradient || 'from-slate-800 to-slate-950'} flex items-center justify-center font-[Outfit,sans-serif] font-bold text-white text-sm tracking-tight shadow-[0_8px_20px_-6px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.3)]`}
          >
            {initials(school.name)}
          </motion.div>
          <div className="flex-1 min-w-0">
            <h3 className="font-[Outfit,sans-serif] font-bold text-[18px] md:text-[20px] text-slate-950 tracking-[-0.02em] leading-[1.15]">
              {school.name}
            </h3>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {typeMeta && (
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.12em] uppercase ${typeMeta.text} ${typeMeta.tint} px-2.5 py-1 rounded-full`}>
                  <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${typeMeta.gradient}`} />
                  {school.type}
                  <span className="font-normal tracking-normal normal-case text-slate-500">· {typeMeta.label}</span>
                </span>
              )}
              {!school.type && school.directors.length > 1 && (
                <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {school.directors.length} directions
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="space-y-3.5">
          {school.directors.map((d, i) => (
            <div key={d.name} className={`${i > 0 ? 'pt-3.5 border-t border-slate-100' : ''}`}>
              <div className="flex items-baseline justify-between gap-3 mb-2.5">
                <div className="font-[Outfit,sans-serif] font-semibold text-slate-900 text-[14px] truncate">{d.name}</div>
                {d.role && <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-slate-400 flex-shrink-0">{d.role}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {d.tels.map(t => <TelChip key={t.number} tel={t} copy={copy} copied={copied} />)}
                {d.email && <EmailChip email={d.email} copy={copy} copied={copied} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

/* ════════════ Chips ════════════ */
function TelChip({
  tel, copy, copied, variant = 'light',
}: { tel: Tel; copy: (v: string) => void; copied: string | null; variant?: 'light' | 'dark' }) {
  const isMobile = tel.type === 'mobile';
  const isCopied = copied === tel.number;
  const base = 'group/tel inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-xl text-[12px] font-mono font-semibold border transition-all duration-200 cursor-pointer active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#45b8a0]';
  const light = isCopied
    ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300 text-emerald-700'
    : isMobile
      ? 'bg-white border-slate-200 text-slate-800 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 hover:-translate-y-[1px]'
      : 'bg-white border-slate-200 text-slate-800 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 hover:-translate-y-[1px]';
  const dark = isCopied
    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
    : 'bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-[#45b8a0]/60 hover:text-[#45b8a0]';

  return (
    <button
      onClick={(e) => { e.preventDefault(); copy(tel.number); }}
      onDoubleClick={() => { window.location.href = `tel:${tel.number.replace(/\D/g, '')}`; }}
      className={`${base} ${variant === 'dark' ? dark : light}`}
      title="Clic : copier · Double-clic : appeler"
      aria-label={`${isMobile ? 'Mobile' : 'Fixe'} ${tel.number} — cliquer pour copier`}
    >
      {isCopied ? (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      ) : isMobile ? (
        <svg className="w-3 h-3 opacity-70 group-hover/tel:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2" /><line x1="11" y1="18" x2="13" y2="18" /></svg>
      ) : (
        <svg className="w-3 h-3 opacity-70 group-hover/tel:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" /></svg>
      )}
      {tel.number}
    </button>
  );
}

function EmailChip({
  email, copy, copied, variant = 'light',
}: { email: string; copy: (v: string) => void; copied: string | null; variant?: 'light' | 'dark' }) {
  const isCopied = copied === email;
  const base = 'group/mail inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-xl text-[12px] font-medium border transition-all duration-200 cursor-pointer max-w-full active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[#45b8a0]';
  const light = isCopied
    ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300 text-emerald-700'
    : 'bg-white border-slate-200 text-slate-700 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700 hover:-translate-y-[1px]';
  const dark = isCopied
    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
    : 'bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-[#45b8a0]/60 hover:text-[#45b8a0]';

  return (
    <button
      onClick={(e) => { e.preventDefault(); copy(email); }}
      onDoubleClick={() => { window.location.href = `mailto:${email}`; }}
      className={`${base} ${variant === 'dark' ? dark : light}`}
      title="Clic : copier · Double-clic : écrire"
      aria-label={`${email} — cliquer pour copier`}
    >
      {isCopied ? (
        <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
      ) : (
        <svg className="w-3 h-3 flex-shrink-0 opacity-70 group-hover/mail:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" /></svg>
      )}
      <span className="truncate">{email}</span>
    </button>
  );
}

function RoleIcon({ kind }: { kind: CircoMember['iconKey'] }) {
  const cls = 'w-2.5 h-2.5';
  switch (kind) {
    case 'star': return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.39 7.36H22l-6.19 4.5L18.2 21 12 16.5 5.8 21l2.39-7.14L2 9.36h7.61L12 2z" /></svg>;
    case 'folder': return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>;
    case 'compass': return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>;
    case 'activity': return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
    case 'chip': return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" /></svg>;
  }
}
