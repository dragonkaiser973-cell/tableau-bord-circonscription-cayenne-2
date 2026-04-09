'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform, useMotionValueEvent, AnimatePresence } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════
   ANIMATION VARIANTS — Spring Physics + Stagger
   ═══════════════════════════════════════════════════════════════ */

const spring = { type: 'spring' as const, stiffness: 100, damping: 20 };
const springFast = { type: 'spring' as const, stiffness: 200, damping: 25 };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: spring,
  },
};

const heroItemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { ...spring, delay },
  }),
};

/* ═══════════════════════════════════════════════════════════════
   PAGE D'ACCUEIL — Style TwelveMei "Digital Zen"
   ═══════════════════════════════════════════════════════════════ */

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dockScrolled, setDockScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const underlineRef = useRef<HTMLDivElement>(null);

  // ─── Scroll-driven hero shrink ───
  const heroContainerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();

  // Hero shrink: scale et borderRadius en fonction du scroll
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.92]);
  const heroRadius = useTransform(scrollY, [0, 400], [0, 32]);
  const heroOpacity = useTransform(scrollY, [200, 500], [1, 0.6]);
  const mockupY = useTransform(scrollY, [0, 300], [0, -40]);

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setDockScrolled(latest > 60);
  });

  // ─── Auth ───
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
        const payload = JSON.parse(atob(padded));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
          localStorage.removeItem('username');
          return;
        }
        setIsAuthenticated(true);
        setUserRole(localStorage.getItem('userRole') || '');
      }
    } catch {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('username');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('username', data.user.username);
        setIsAuthenticated(true);
        setUserRole(data.user.role);
        setShowLoginModal(false);
      } else {
        setError(data.message || 'Identifiants incorrects');
      }
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    setUserRole('');
  };

  // ─── Tab underline ───
  const updateUnderline = useCallback((index: number) => {
    const tab = tabsRef.current[index];
    const underline = underlineRef.current;
    if (tab && underline) {
      underline.style.width = `${tab.offsetWidth}px`;
      underline.style.transform = `translateX(${tab.offsetLeft}px)`;
    }
  }, []);

  useEffect(() => {
    updateUnderline(activeTab);
    const handleResize = () => updateUnderline(activeTab);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab, updateUnderline]);

  const featureTabs = [
    {
      label: 'Accompagnement', sub: 'Suivi terrain',
      title: 'Accompagnement',
      desc: 'Suivez et soutenez chaque enseignant dans sa pratique quotidienne grâce à des outils clairs et adaptés au terrain guyanais.',
      btn: 'Voir nos actions', href: '/ecoles',
    },
    {
      label: 'Ressources', sub: 'Pédagogie',
      title: 'Ressources',
      desc: 'Accédez à toutes les ressources pédagogiques de la circonscription en un clic. Fiches, séquences, outils pour la classe.',
      btn: 'Explorer', href: '/statistiques',
    },
    {
      label: 'Évaluations', sub: 'Résultats',
      title: 'Évaluations',
      desc: 'Suivez les résultats des élèves et pilotez la réussite avec des données précises. Évaluations nationales CP, CE1 et plus.',
      btn: 'Voir les résultats', href: '/evaluations',
    },
    {
      label: 'Communication', sub: 'Équipes',
      title: 'Communication',
      desc: 'Connectez votre circonscription à tous les acteurs de l\'éducation. Agenda, réunions, informations en temps réel.',
      btn: 'En savoir plus', href: '/circonscription',
    },
  ];

  return (
    <div className="min-h-screen bg-zen-bg">

      {/* ═══════════════════════════════════════════
          BARRE DE CONTEXTE (outer frame)
          ═══════════════════════════════════════════ */}
      <div className="bg-zen-bg px-4 sm:px-8 py-3 flex justify-between items-center text-xs tracking-[0.1em] uppercase text-zen-text-muted font-medium">
        <span>Rectorat de Guyane — Circonscription</span>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline">IEN</span>
          {isAuthenticated ? (
            <button onClick={handleLogout} className="hover:text-zen-text transition-colors">Déconnexion</button>
          ) : (
            <button onClick={() => setShowLoginModal(true)} className="hover:text-zen-text transition-colors">Connexion</button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          HERO — Floating Card avec shrink au scroll
          ═══════════════════════════════════════════ */}
      <div className="px-3 sm:px-6 pb-6" ref={heroContainerRef}>
        <motion.div
          style={{
            scale: heroScale,
            borderRadius: heroRadius,
            opacity: heroOpacity,
          }}
          className="relative overflow-hidden origin-top"
        >
          <div
            className="relative min-h-[90vh] sm:min-h-screen"
            style={{ background: 'linear-gradient(180deg, #C8DDE8 0%, #D4E8D0 60%, #B8D4A8 100%)' }}
          >
            {/* ─── Dock glassmorphism ─── */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
              className="sticky top-0 z-50 px-4 sm:px-8 py-4"
            >
              <div className={`nav-dock ${dockScrolled ? 'scrolled' : ''} rounded-[16px] max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2.5">
                  <Image src="/logo-circonscription.png" alt="Logo" width={28} height={28} className="rounded-lg" />
                  <span className="font-medium text-zen-text text-sm hidden sm:inline">Circonscription</span>
                </div>

                <div className="flex items-center bg-zen-accent rounded-full px-1.5 py-1.5 gap-0.5">
                  <DockIcon href="#hero" icon={<IconHome />} label="Accueil" active />
                  <DockIcon href="#features" icon={<IconBook />} label="Ressources" />
                  <DockIcon href="#services" icon={<IconCalendar />} label="Agenda" />
                  <DockIcon href="#footer" icon={<IconMail />} label="Contact" />
                  {isAuthenticated && <DockIcon href="#auth-section" icon={<IconUser />} label="Espace" />}
                </div>

                <Link href="/questionnaires" className="btn-secondary-zen text-sm hidden sm:inline-block">
                  Questionnaires
                </Link>
                <Link href="/questionnaires" className="sm:hidden text-zen-text-secondary text-sm">
                  <IconClip />
                </Link>
              </div>
            </motion.div>

            {/* ─── Hero content ─── */}
            <div id="hero" className="relative px-6 sm:px-12 pt-8 sm:pt-16 pb-56 sm:pb-72 text-center">
              {/* Badge */}
              <motion.div
                custom={0.1}
                initial="hidden"
                animate="visible"
                variants={heroItemVariants}
                className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-md border border-white/50 rounded-full px-4 py-2 text-sm text-zen-text-secondary mb-8"
              >
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Académie de Guyane · Circonscription Cayenne 2
              </motion.div>

              {/* Titre */}
              <motion.h1
                custom={0.25}
                initial="hidden"
                animate="visible"
                variants={heroItemVariants}
                className="font-serif text-[clamp(2.8rem,6vw,5rem)] font-bold leading-[1.1] text-zen-text mb-8 max-w-3xl mx-auto"
              >
                L&apos;École au cœur<br />de la Guyane.<br />
                <span className="text-zen-text-secondary">Réussir ensemble.</span>
              </motion.h1>

              {/* CTA */}
              <motion.div
                custom={0.5}
                initial="hidden"
                animate="visible"
                variants={heroItemVariants}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <button onClick={() => setShowLoginModal(true)} className="btn-primary-zen">
                  Nous contacter
                </button>
                <Link href="/ecoles" className="btn-secondary-zen">
                  Explorer la circonscription
                </Link>
              </motion.div>

              {/* ─── Mockup flottant ─── */}
              <motion.div
                custom={0.65}
                initial="hidden"
                animate="visible"
                variants={heroItemVariants}
                style={{ y: mockupY }}
                className="absolute left-1/2 -translate-x-1/2 bottom-[-100px] sm:bottom-[-80px] w-[92%] max-w-3xl"
              >
                <div className="bg-white/80 backdrop-blur-xl rounded-[32px] shadow-mockup p-5 sm:p-7 border border-white/60">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <span className="text-xs text-zen-text-muted font-medium">Suivi de circonscription</span>
                    <div className="flex items-center gap-1.5 text-xs text-zen-text-muted">
                      <span className="bg-zen-bg/80 backdrop-blur-sm px-2.5 py-1 rounded-full">23 écoles</span>
                      <span className="bg-zen-bg/80 backdrop-blur-sm px-2.5 py-1 rounded-full">450 enseignants</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zen-border text-left text-zen-text-muted text-xs">
                          <th className="pb-2 font-medium">École</th>
                          <th className="pb-2 font-medium">Enseignants</th>
                          <th className="pb-2 font-medium">Élèves</th>
                          <th className="pb-2 font-medium">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="text-zen-text">
                        {[
                          { ecole: 'Cayenne Nord A', ens: 12, eleves: 287, statut: 'À jour', color: 'green' },
                          { ecole: 'Roura Centre', ens: 8, eleves: 194, statut: 'En cours', color: 'blue' },
                          { ecole: 'Rémire-Montjoly B', ens: 15, eleves: 342, statut: 'À jour', color: 'green' },
                        ].map((row, i) => (
                          <tr key={i} className={i < 2 ? 'border-b border-zen-border/50' : ''}>
                            <td className="py-2.5 font-medium">{row.ecole}</td>
                            <td className="py-2.5">{row.ens}</td>
                            <td className="py-2.5">{row.eleves}</td>
                            <td className="py-2.5">
                              <span className={`bg-${row.color}-100 text-${row.color}-700 text-xs px-2 py-0.5 rounded-full`}>{row.statut}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════
          SECTION FEATURES — Onglets interactifs
          ═══════════════════════════════════════════ */}
      <section id="features" className="px-3 sm:px-6 py-24 sm:py-36">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={itemVariants}
            className="text-center mb-6 max-w-2xl mx-auto px-6 py-10 bg-white/70 backdrop-blur-xl rounded-[32px] border border-white/50 shadow-lg"
          >
            <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.15] text-zen-text">
              Accompagner chaque enseignant,<br />agir avec clarté
            </h2>
          </motion.div>

          {/* Onglets */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={itemVariants}
            className="mt-16"
          >
            <div className="relative flex gap-8 sm:gap-12 border-b border-zen-border mb-12 overflow-x-auto">
              {featureTabs.map((tab, i) => (
                <button
                  key={i}
                  ref={el => { tabsRef.current[i] = el; }}
                  onClick={() => setActiveTab(i)}
                  className={`pb-4 text-left flex-shrink-0 transition-colors duration-250 ${
                    activeTab === i ? 'text-zen-text' : 'text-zen-text-muted hover:text-zen-text-secondary'
                  }`}
                >
                  <div className="font-medium text-sm sm:text-base">{tab.label}</div>
                  <div className="text-xs text-zen-text-muted mt-0.5">{tab.sub}</div>
                </button>
              ))}
              <div ref={underlineRef} className="tab-underline" />
            </div>

            {/* Contenu onglet */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                transition={spring}
                className="grid lg:grid-cols-2 gap-8 items-start min-h-[380px]"
              >
                {/* Texte gauche */}
                <div className="flex flex-col justify-end pt-8 lg:pt-32">
                  <motion.h3
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: 0.05 }}
                    className="font-serif text-[clamp(2rem,4vw,3.2rem)] font-medium text-zen-text mb-4"
                  >
                    {featureTabs[activeTab].title}
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: 0.12 }}
                    className="text-zen-text-secondary leading-relaxed mb-6 max-w-md"
                  >
                    {featureTabs[activeTab].desc}
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: 0.2 }}
                  >
                    <Link href={featureTabs[activeTab].href} className="btn-primary-zen inline-block">
                      {featureTabs[activeTab].btn}
                    </Link>
                  </motion.div>
                </div>

                {/* Mockup droite */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ ...spring, delay: 0.1 }}
                  className="relative rounded-[32px] overflow-hidden border border-white/50 bg-gradient-to-b from-zen-hero-top/30 to-zen-hero-mid/20 backdrop-blur-sm min-h-[380px]"
                >
                  <FeatureMockup index={activeTab} />
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          BENTO GRID — Spans variés, arrondis 32px
          ═══════════════════════════════════════════ */}
      <section id="services" className="px-3 sm:px-6 pb-24 sm:pb-36">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={itemVariants}
            className="text-center mb-14"
          >
            <h2 className="font-serif text-[clamp(1.8rem,3vw,2.8rem)] font-medium text-zen-text">
              Tous vos services, en un lieu
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={containerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            style={{ gridAutoRows: 'minmax(180px, auto)' }}
          >
            {/* Card 1 — Agenda (grande, 2 rows) */}
            <motion.div variants={itemVariants} className="sm:row-span-2">
              <Link href={isAuthenticated ? '/calendrier' : '#'} onClick={!isAuthenticated ? (e) => { e.preventDefault(); setShowLoginModal(true); } : undefined}>
                <div className="bento-card h-full flex flex-col justify-between bg-gradient-to-b from-zen-hero-top/25 to-white/80 backdrop-blur-sm rounded-[32px]" style={{ borderRadius: '32px' }}>
                  <div>
                    <span className="card-icon text-4xl inline-block mb-5">📅</span>
                    <h3 className="font-serif text-2xl font-medium text-zen-text mb-3">Agenda &amp; Permanences</h3>
                    <p className="text-zen-text-secondary text-sm leading-relaxed">Retrouvez les dates des permanences IEN et les rendez-vous importants de la circonscription.</p>
                  </div>
                  <div className="mt-8 text-zen-text-muted text-xs font-medium tracking-wide uppercase">
                    {isAuthenticated ? 'Accéder →' : 'Connexion requise →'}
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Card 2 — Actualités (large, 2 cols) */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Link href="/circonscription">
                <div className="bento-card h-full rounded-[32px]" style={{ borderRadius: '32px' }}>
                  <div className="flex items-start gap-5">
                    <span className="card-icon text-4xl inline-block flex-shrink-0">📰</span>
                    <div>
                      <h3 className="font-serif text-xl font-medium text-zen-text mb-2">Actualités de la circonscription</h3>
                      <p className="text-zen-text-secondary text-sm leading-relaxed">Les dernières informations de la circonscription et de l&apos;académie. Annonces, événements et nouveautés.</p>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Card 3 — Ressources */}
            <motion.div variants={itemVariants}>
              <Link href="/statistiques">
                <div className="bento-card h-full rounded-[32px]" style={{ borderRadius: '32px' }}>
                  <span className="card-icon text-3xl inline-block mb-4">📚</span>
                  <h3 className="font-serif text-lg font-medium text-zen-text mb-2">Ressources pédagogiques</h3>
                  <p className="text-zen-text-secondary text-sm leading-relaxed">Fiches, séquences et outils pour votre classe.</p>
                </div>
              </Link>
            </motion.div>

            {/* Card 4 — Contact */}
            <motion.div variants={itemVariants}>
              <Link href="/questionnaires">
                <div className="bento-card h-full rounded-[32px] bg-gradient-to-br from-zen-hero-mid/15 to-white" style={{ borderRadius: '32px' }}>
                  <span className="card-icon text-3xl inline-block mb-4">✉️</span>
                  <h3 className="font-serif text-lg font-medium text-zen-text mb-2">Contacter l&apos;IEN</h3>
                  <p className="text-zen-text-secondary text-sm leading-relaxed">Une question ? Écrivez-nous via les questionnaires.</p>
                </div>
              </Link>
            </motion.div>

            {/* Card 5 — Évaluations (large, 2 cols) */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Link href="/evaluations">
                <div className="bento-card h-full rounded-[32px] bg-gradient-to-r from-white to-zen-hero-top/15" style={{ borderRadius: '32px' }}>
                  <div className="flex items-start gap-5">
                    <span className="card-icon text-4xl inline-block flex-shrink-0">📊</span>
                    <div>
                      <h3 className="font-serif text-xl font-medium text-zen-text mb-2">Résultats &amp; Évaluations</h3>
                      <p className="text-zen-text-secondary text-sm leading-relaxed">Tableaux de bord des évaluations nationales. Analyses détaillées par école, par niveau, par domaine.</p>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Card 6 — ENT */}
            <motion.div variants={itemVariants}>
              <Link href="/enseignants">
                <div className="bento-card h-full rounded-[32px]" style={{ borderRadius: '32px' }}>
                  <span className="card-icon text-3xl inline-block mb-4">💻</span>
                  <h3 className="font-serif text-lg font-medium text-zen-text mb-2">Enseignants</h3>
                  <p className="text-zen-text-secondary text-sm leading-relaxed">Annuaire et parcours des enseignants de la circonscription.</p>
                </div>
              </Link>
            </motion.div>
          </motion.div>

          {/* ─── Section authentifiée ─── */}
          {isAuthenticated && (
            <div id="auth-section" className="mt-20">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={itemVariants}
                className="flex items-center gap-4 mb-10"
              >
                <div className="h-px flex-1 bg-zen-border" />
                <span className="text-xs tracking-[0.15em] uppercase font-medium text-zen-text-muted">Espace réservé</span>
                <div className="h-px flex-1 bg-zen-border" />
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                variants={containerVariants}
                className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {[
                  { href: '/donnees', icon: '💾', title: 'Données', desc: 'Importation et gestion des données scolaires.' },
                  { href: '/pilotage', icon: '📈', title: 'Pilotage', desc: 'Indicateurs clés et tableaux de bord dynamiques.' },
                  { href: '/carte', icon: '🗺️', title: 'Carte', desc: 'Localisation géographique des écoles.' },
                  { href: '/archives', icon: '📚', title: 'Archives', desc: 'Consultation des années scolaires passées.' },
                  { href: '/analyse-classe', icon: '🔬', title: 'Analyse classe', desc: "Analyser les évaluations nationales d'une classe." },
                  { href: '/aide-analyse-classe', icon: '📖', title: "Guide d'utilisation", desc: "Comment utiliser l'outil d'analyse." },
                ].map((item) => (
                  <motion.div key={item.href} variants={itemVariants}>
                    <Link href={item.href}>
                      <div className="bento-card h-full rounded-[32px]" style={{ borderRadius: '32px' }}>
                        <span className="card-icon text-3xl inline-block mb-4">{item.icon}</span>
                        <h3 className="font-serif text-lg font-medium text-zen-text mb-2">{item.title}</h3>
                        <p className="text-zen-text-secondary text-sm">{item.desc}</p>
                      </div>
                    </Link>
                  </motion.div>
                ))}

                {userRole === 'admin' && (
                  <>
                    <motion.div variants={itemVariants}>
                      <Link href="/admin">
                        <div className="bento-card h-full rounded-[32px] border-purple-200/60 bg-gradient-to-b from-purple-50/40 to-white backdrop-blur-sm" style={{ borderRadius: '32px' }}>
                          <span className="card-icon text-3xl inline-block mb-4">👑</span>
                          <h3 className="font-serif text-lg font-medium text-zen-text mb-2">Administration</h3>
                          <p className="text-zen-text-secondary text-sm">Gestion des utilisateurs et des archives.</p>
                        </div>
                      </Link>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <Link href="/questionnaires/admin">
                        <div className="bento-card h-full rounded-[32px] border-purple-200/60 bg-gradient-to-b from-purple-50/40 to-white backdrop-blur-sm" style={{ borderRadius: '32px' }}>
                          <span className="card-icon text-3xl inline-block mb-4">⚙️</span>
                          <h3 className="font-serif text-lg font-medium text-zen-text mb-2">Gérer questionnaires</h3>
                          <p className="text-zen-text-secondary text-sm">Créer, modifier et consulter les résultats.</p>
                        </div>
                      </Link>
                    </motion.div>
                  </>
                )}
              </motion.div>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════ */}
      <footer id="footer" className="border-t border-zen-border px-6 sm:px-12 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <Image src="/logo-circonscription.png" alt="Logo" width={32} height={32} className="rounded-lg" />
              <div>
                <p className="font-medium text-zen-text text-sm">Circonscription Cayenne 2 Roura</p>
                <p className="text-zen-text-muted text-xs">Inspection de l&apos;Éducation Nationale — Rectorat de Guyane</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-xs text-zen-text-muted">
              <Link href="/aide-analyse-classe" className="hover:text-zen-text transition-colors">Guide</Link>
              <Link href="/enseignants" className="hover:text-zen-text transition-colors">Enseignants</Link>
              <Link href="/ecoles" className="hover:text-zen-text transition-colors">Écoles</Link>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-zen-border/60 text-center text-xs text-zen-text-muted">
            Développé par <span className="text-zen-text-secondary font-medium">LOUIS Olivier</span> · © 2026 Rectorat de Guyane
          </div>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════
          MODAL CONNEXION
          ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[100] p-4"
            onClick={() => setShowLoginModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={springFast}
              className="bg-white/90 backdrop-blur-xl rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-white/60"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="font-serif text-2xl font-medium text-zen-text">Connexion</h2>
                  <p className="text-zen-text-muted text-sm mt-1">Accédez à l&apos;espace réservé</p>
                </div>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="w-8 h-8 rounded-full hover:bg-zen-bg flex items-center justify-center text-zen-text-muted hover:text-zen-text transition-colors"
                >
                  ×
                </button>
              </div>

              {error && (
                <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin}>
                <div className="mb-5">
                  <label className="block text-zen-text text-sm font-medium mb-2">Nom d&apos;utilisateur</label>
                  <input
                    type="text"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    className="w-full px-4 py-3 bg-zen-bg/60 backdrop-blur-sm border border-zen-border rounded-2xl focus:outline-none focus:border-zen-text transition-colors text-zen-text placeholder-zen-text-muted"
                    placeholder="Entrez votre identifiant"
                    required
                    autoFocus
                  />
                </div>
                <div className="mb-8">
                  <label className="block text-zen-text text-sm font-medium mb-2">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      className="w-full px-4 py-3 pr-20 bg-zen-bg/60 backdrop-blur-sm border border-zen-border rounded-2xl focus:outline-none focus:border-zen-text transition-colors text-zen-text placeholder-zen-text-muted"
                      placeholder="Entrez votre mot de passe"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zen-text-muted hover:text-zen-text transition-colors p-1 text-xs font-medium"
                    >
                      {showPassword ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="btn-primary-zen w-full flex items-center justify-center gap-2 disabled:opacity-50">
                  {isLoading ? 'Connexion...' : 'Se connecter'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   COMPOSANTS INTERNES
   ═══════════════════════════════════════════════════════════════ */

function DockIcon({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <a
      href={href}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
        active ? 'bg-white/20' : 'opacity-60 hover:opacity-100'
      }`}
      title={label}
      aria-label={label}
    >
      <span className="w-4 h-4 text-white">{icon}</span>
    </a>
  );
}

function FeatureMockup({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="p-6 sm:p-8">
        <div className="bg-white/80 backdrop-blur-xl rounded-[24px] shadow-lg p-5 max-w-sm mx-auto mt-8 border border-white/60">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zen-border">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-700">IEN</div>
            <div>
              <p className="text-sm font-medium text-zen-text">Inspection</p>
              <p className="text-xs text-zen-text-muted">En ligne</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="bg-zen-bg/80 backdrop-blur-sm rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-zen-text max-w-[80%]">
              Bonjour, comment s&apos;est passée votre visite de classe ?
            </div>
            <div className="bg-zen-accent text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm ml-auto max-w-[80%]">
              Très bien, les élèves étaient engagés !
            </div>
            <div className="bg-zen-bg/80 backdrop-blur-sm rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-zen-text max-w-[80%]">
              Parfait ! Compte-rendu envoyé. ✅
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="p-6 sm:p-8">
        <motion.div
          initial="hidden" animate="visible" variants={containerVariants}
          className="grid grid-cols-2 gap-3 max-w-sm mx-auto mt-8"
        >
          {['Français CP', 'Maths CE1', 'Sciences CM1', 'EMC Cycle 3', 'Arts visuels', 'EPS'].map((r, i) => (
            <motion.div key={i} variants={itemVariants} className="bg-white/80 backdrop-blur-xl rounded-[20px] p-3.5 shadow-sm border border-white/60 text-center">
              <div className="text-2xl mb-1">{['📖','🔢','🔬','🤝','🎨','⚽'][i]}</div>
              <p className="text-xs font-medium text-zen-text">{r}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className="p-6 sm:p-8">
        <div className="bg-white/80 backdrop-blur-xl rounded-[24px] shadow-lg p-5 max-w-sm mx-auto mt-8 border border-white/60">
          <p className="text-xs font-medium text-zen-text-muted uppercase tracking-wider mb-4">Évaluations nationales CP — Français</p>
          <div className="space-y-3">
            {[
              { ecole: 'Cayenne Nord A', pct: 78, color: 'bg-green-400' },
              { ecole: 'Roura Centre', pct: 65, color: 'bg-blue-400' },
              { ecole: 'Rémire B', pct: 82, color: 'bg-green-500' },
              { ecole: 'Matoury A', pct: 71, color: 'bg-yellow-400' },
            ].map((r, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zen-text font-medium">{r.ecole}</span>
                  <span className="text-zen-text-muted">{r.pct}%</span>
                </div>
                <div className="h-2 bg-zen-bg rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${r.pct}%` }}
                    transition={{ ...spring, delay: i * 0.1 }}
                    className={`h-full ${r.color} rounded-full`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="p-6 sm:p-8">
      <motion.div
        initial="hidden" animate="visible" variants={containerVariants}
        className="grid grid-cols-2 gap-3 max-w-sm mx-auto mt-8"
      >
        {[
          { name: 'Messagerie', sub: 'Académique', icon: '✉️' },
          { name: 'ENT', sub: 'Guyane', icon: '🖥️' },
          { name: 'ONDE', sub: 'Base élèves', icon: '📋' },
          { name: 'LSU', sub: 'Livret scolaire', icon: '📝' },
          { name: 'Eduscol', sub: 'Ressources', icon: '🏛️' },
          { name: 'BRNE', sub: 'Numérique', icon: '💻' },
        ].map((item, i) => (
          <motion.div key={i} variants={itemVariants} className="bg-white/80 backdrop-blur-xl rounded-[20px] p-3.5 shadow-sm border border-white/60 flex items-center gap-3">
            <span className="text-xl">{item.icon}</span>
            <div>
              <p className="text-sm font-medium text-zen-text">{item.name}</p>
              <p className="text-xs text-zen-text-muted">{item.sub}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   ICÔNES SVG
   ═══════════════════════════════════════════════════════════════ */

function IconHome() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
}
function IconBook() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>;
}
function IconCalendar() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
}
function IconMail() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>;
}
function IconUser() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function IconClip() {
  return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>;
}
