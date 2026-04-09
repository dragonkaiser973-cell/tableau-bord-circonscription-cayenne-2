'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform, useMotionValueEvent, AnimatePresence } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════
   SPRING PHYSICS — Luxurious, weighted feel
   ═══════════════════════════════════════════════════════════════ */

const spring = { type: 'spring' as const, stiffness: 80, damping: 15, mass: 1 };
const springFast = { type: 'spring' as const, stiffness: 200, damping: 22, mass: 0.8 };

const containerStagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemReveal = {
  hidden: { opacity: 0, y: 40, scale: 0.96, filter: 'blur(10px)' },
  visible: {
    opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
    transition: spring,
  },
};

/* ═══════════════════════════════════════════════════════════════
   PAGE D'ACCUEIL
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

  /* ─── Scroll-driven transforms ─── */
  const { scrollY } = useScroll();

  // Hero shrinks vertically: height reduces, content fades
  const heroHeight = useTransform(scrollY, [0, 500], ['90vh', '28vh']);
  const heroContentOpacity = useTransform(scrollY, [0, 250], [1, 0]);
  const heroContentScale = useTransform(scrollY, [0, 300], [1, 0.95]);
  const heroTitleY = useTransform(scrollY, [0, 300], [0, -30]);

  // Parallax: background moves slower
  const bgY = useTransform(scrollY, [0, 800], [0, 200]);

  // Mockup rises as hero shrinks
  const mockupOpacity = useTransform(scrollY, [0, 200], [1, 0]);
  const mockupY = useTransform(scrollY, [0, 300], [0, 60]);

  useMotionValueEvent(scrollY, 'change', (v) => setDockScrolled(v > 60));

  /* ─── Auth ─── */
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
        const payload = JSON.parse(atob(padded));
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (res.ok) {
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

  /* ─── Tab underline ─── */
  const updateUnderline = useCallback((index: number) => {
    const tab = tabsRef.current[index];
    const ul = underlineRef.current;
    if (tab && ul) {
      ul.style.width = `${tab.offsetWidth}px`;
      ul.style.transform = `translateX(${tab.offsetLeft}px)`;
    }
  }, []);

  useEffect(() => {
    updateUnderline(activeTab);
    const h = () => updateUnderline(activeTab);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [activeTab, updateUnderline]);

  const tabs = [
    {
      label: 'Accompagnement', sub: 'Suivi terrain',
      title: 'Accompagnement',
      desc: 'Suivez et soutenez chaque enseignant dans sa pratique quotidienne grâce à des outils clairs et adaptés au terrain guyanais.',
      btn: 'Voir nos actions', href: '/ecoles',
    },
    {
      label: 'Ressources', sub: 'Pédagogie',
      title: 'Ressources',
      desc: 'Accédez à toutes les ressources pédagogiques de la circonscription. Fiches, séquences et outils pour la classe.',
      btn: 'Explorer', href: '/statistiques',
    },
    {
      label: 'Évaluations', sub: 'Résultats',
      title: 'Évaluations',
      desc: 'Pilotez la réussite avec des données précises. Évaluations nationales CP, CE1 et analyses détaillées.',
      btn: 'Voir les résultats', href: '/evaluations',
    },
    {
      label: 'Communication', sub: 'Équipes',
      title: 'Communication',
      desc: 'Connectez tous les acteurs de l\'éducation. Agenda, réunions et informations en temps réel.',
      btn: 'En savoir plus', href: '/circonscription',
    },
  ];

  return (
    <div className="min-h-screen bg-zen-bg relative">

      {/* ═══════════════════════════════════════════
          FOND PAYSAGE FIXE + PARALLAXE
          ═══════════════════════════════════════════ */}
      <motion.div
        className="fixed inset-0 z-0"
        style={{ y: bgY }}
      >
        {/* Photo Unsplash Guyane — forêt tropicale */}
        <img
          src="https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1920&q=80&auto=format"
          alt=""
          className="w-full h-[120vh] object-cover"
          aria-hidden="true"
        />
        {/* Overlay pour lisibilité */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-100/70 via-emerald-50/50 to-zen-bg" />
      </motion.div>

      {/* ═══════════════════════════════════════════
          CONTENU (au-dessus du fond fixe)
          ═══════════════════════════════════════════ */}
      <div className="relative z-10">

        {/* ─── Barre de contexte ─── */}
        <div className="px-4 sm:px-8 py-3 flex justify-between items-center text-[11px] tracking-[0.12em] uppercase text-zen-text-muted font-medium">
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
            HERO — Shrinks vertically on scroll
            ═══════════════════════════════════════════ */}
        <div className="px-3 sm:px-5">
          <motion.section
            style={{ height: heroHeight }}
            className="relative overflow-hidden rounded-[32px]"
          >
            {/* Fond hero interne — dégradé pastel semi-transparent pour glassmorphism */}
            <div className="absolute inset-0 bg-gradient-to-b from-sky-200/60 via-emerald-100/40 to-green-200/50 backdrop-blur-sm" />

            {/* ─── Dock ─── */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring}
              className="sticky top-0 z-50 px-4 sm:px-8 py-4"
            >
              <div className={`nav-dock ${dockScrolled ? 'scrolled' : ''} rounded-[16px] max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between`}>
                <div className="flex items-center gap-2.5">
                  <Image src="/logo-circonscription.png" alt="Logo" width={28} height={28} className="rounded-lg" />
                  <span className="font-medium text-zen-text text-sm hidden sm:inline tracking-tight">Circonscription</span>
                </div>
                <div className="flex items-center bg-zen-accent rounded-full px-1.5 py-1.5 gap-0.5">
                  <DockIcon href="#" icon={<IconHome />} label="Accueil" active />
                  <DockIcon href="#features" icon={<IconBook />} label="Ressources" />
                  <DockIcon href="#services" icon={<IconCalendar />} label="Services" />
                  <DockIcon href="#footer" icon={<IconMail />} label="Contact" />
                  {isAuthenticated && <DockIcon href="#auth-section" icon={<IconUser />} label="Espace" />}
                </div>
                <Link href="/questionnaires" className="btn-secondary-zen text-sm hidden sm:inline-block !border-white/20">
                  Questionnaires
                </Link>
                <Link href="/questionnaires" className="sm:hidden"><IconClip /></Link>
              </div>
            </motion.div>

            {/* ─── Hero content (fades on scroll) ─── */}
            <motion.div
              style={{ opacity: heroContentOpacity, scale: heroContentScale, y: heroTitleY }}
              className="relative px-6 sm:px-12 pt-4 sm:pt-12 pb-40 sm:pb-56 text-center"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.1 }}
                className="inline-flex items-center gap-2 bg-white/50 backdrop-blur-xl border border-white/30 rounded-full px-4 py-2 text-sm text-zen-text-secondary mb-8"
              >
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Académie de Guyane · Circonscription Cayenne 2
              </motion.div>

              {/* Titre — Inter, tracking tight, bold */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.25 }}
                className="text-[clamp(2.6rem,6vw,5rem)] font-bold leading-[1.05] tracking-tightest text-zen-text mb-8 max-w-3xl mx-auto"
              >
                L&apos;École au cœur<br />de la Guyane.
              </motion.h1>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.5 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <button onClick={() => setShowLoginModal(true)} className="btn-primary-zen">
                  Nous contacter
                </button>
              </motion.div>

              {/* ─── Mockup flottant ─── */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.65 }}
                style={{ opacity: mockupOpacity, y: mockupY }}
                className="absolute left-1/2 -translate-x-1/2 bottom-[-90px] w-[88%] max-w-3xl"
              >
                <div className="bg-white/50 backdrop-blur-2xl rounded-[28px] shadow-mockup p-5 sm:p-6 border border-white/25">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
                    </div>
                    <span className="text-[10px] text-zen-text-muted font-medium tracking-wide">Suivi de circonscription</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-zen-text-muted">
                      <span className="bg-white/40 backdrop-blur-sm px-2 py-0.5 rounded-full">23 écoles</span>
                      <span className="bg-white/40 backdrop-blur-sm px-2 py-0.5 rounded-full">450 enseignants</span>
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/20 text-left text-zen-text-muted text-[10px]">
                        <th className="pb-2 font-medium">École</th>
                        <th className="pb-2 font-medium">Enseignants</th>
                        <th className="pb-2 font-medium">Élèves</th>
                        <th className="pb-2 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="text-zen-text text-xs">
                      {[
                        { e: 'Cayenne Nord A', n: 12, el: 287, s: 'À jour', c: 'green' },
                        { e: 'Roura Centre', n: 8, el: 194, s: 'En cours', c: 'blue' },
                        { e: 'Rémire-Montjoly B', n: 15, el: 342, s: 'À jour', c: 'green' },
                      ].map((r, i) => (
                        <tr key={i} className={i < 2 ? 'border-b border-white/10' : ''}>
                          <td className="py-2 font-medium">{r.e}</td>
                          <td className="py-2">{r.n}</td>
                          <td className="py-2">{r.el}</td>
                          <td className="py-2">
                            <span className={`bg-${r.c}-100/80 text-${r.c}-700 text-[10px] px-2 py-0.5 rounded-full`}>{r.s}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </motion.div>
          </motion.section>
        </div>

        {/* ═══════════════════════════════════════════
            SECTION FEATURES — UNE SEULE : Tabs gauche + Preview droite
            Le hero se réduit et cette section apparaît en dessous
            ═══════════════════════════════════════════ */}
        <section id="features" className="px-3 sm:px-5 pt-32 sm:pt-40 pb-20">
          <div className="max-w-7xl mx-auto">
            {/* Titre section dans carte glass */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={itemReveal}
              className="text-center mb-6 max-w-2xl mx-auto px-8 py-10 glass-card"
            >
              <h2 className="text-[clamp(1.8rem,3.5vw,2.8rem)] font-bold tracking-tightest text-zen-text leading-tight">
                Accompagner chaque enseignant, agir avec clarté
              </h2>
            </motion.div>

            {/* Layout deux colonnes : Tabs (gauche) + Preview (droite) */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={itemReveal}
              className="mt-14"
            >
              {/* Onglets en haut */}
              <div className="relative flex gap-6 sm:gap-10 border-b border-white/20 mb-0 overflow-x-auto px-1">
                {tabs.map((tab, i) => (
                  <button
                    key={i}
                    ref={el => { tabsRef.current[i] = el; }}
                    onClick={() => setActiveTab(i)}
                    className={`pb-4 text-left flex-shrink-0 transition-colors duration-300 ${
                      activeTab === i ? 'text-zen-text' : 'text-zen-text-muted hover:text-zen-text-secondary'
                    }`}
                  >
                    <div className="font-semibold text-sm tracking-tight">{tab.label}</div>
                    <div className="text-[11px] text-zen-text-muted mt-0.5">{tab.sub}</div>
                  </button>
                ))}
                <div ref={underlineRef} className="tab-underline" />
              </div>

              {/* Contenu : texte gauche + preview droite */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
                  transition={spring}
                  className="grid lg:grid-cols-2 gap-6 mt-0"
                >
                  {/* Gauche — texte */}
                  <div className="flex flex-col justify-end pt-10 lg:pt-40 lg:pb-10">
                    <motion.h3
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: 0.05 }}
                      className="text-[clamp(2rem,4vw,3.5rem)] font-bold tracking-tightest text-zen-text mb-4 leading-tight"
                    >
                      {tabs[activeTab].title}
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: 0.12 }}
                      className="text-zen-text-secondary leading-relaxed mb-8 max-w-md text-[15px]"
                    >
                      {tabs[activeTab].desc}
                    </motion.p>
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: 0.2 }}
                    >
                      <Link href={tabs[activeTab].href} className="btn-primary-zen inline-block">
                        {tabs[activeTab].btn}
                      </Link>
                    </motion.div>
                  </div>

                  {/* Droite — preview glass card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ ...spring, delay: 0.1 }}
                    className="glass-card overflow-hidden min-h-[400px] p-0 hover:transform-none cursor-default"
                  >
                    <TabPreview index={activeTab} />
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            BENTO GRID — grid-cols-12, asymétrique
            ═══════════════════════════════════════════ */}
        <section id="services" className="px-3 sm:px-5 pb-24">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={itemReveal}
              className="text-center mb-12"
            >
              <h2 className="text-[clamp(1.6rem,3vw,2.6rem)] font-bold tracking-tightest text-zen-text">
                Tous vos services
              </h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={containerStagger}
              className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-12 gap-4 auto-rows-[minmax(160px,auto)]"
            >
              {/* Agenda — grande carte: 8 cols, 2 rows */}
              <motion.div variants={itemReveal} className="col-span-4 sm:col-span-8 lg:col-span-8 lg:row-span-2">
                <BentoCard
                  href={isAuthenticated ? '/calendrier' : '#'}
                  onClick={!isAuthenticated ? () => setShowLoginModal(true) : undefined}
                  icon="📅" title="Agenda & Permanences"
                  desc="Retrouvez les dates des permanences IEN et les rendez-vous importants de la circonscription."
                  large
                  gradient="from-sky-100/30 via-transparent to-emerald-50/20"
                  tag={isAuthenticated ? 'Accéder →' : 'Connexion requise →'}
                />
              </motion.div>

              {/* Actualités — 4 cols */}
              <motion.div variants={itemReveal} className="col-span-4">
                <BentoCard href="/circonscription" icon="📰" title="Actualités" desc="Les dernières informations de la circonscription et de l'académie." />
              </motion.div>

              {/* Ressources — 4 cols */}
              <motion.div variants={itemReveal} className="col-span-4">
                <BentoCard href="/statistiques" icon="📚" title="Ressources" desc="Fiches, séquences et outils pour votre classe." />
              </motion.div>

              {/* Contact — 4 cols */}
              <motion.div variants={itemReveal} className="col-span-4 sm:col-span-4">
                <BentoCard href="/questionnaires" icon="✉️" title="Contacter l'IEN" desc="Une question ? Écrivez-nous directement." />
              </motion.div>

              {/* Évaluations — 8 cols */}
              <motion.div variants={itemReveal} className="col-span-4 sm:col-span-8">
                <BentoCard href="/evaluations" icon="📊" title="Résultats & Évaluations" desc="Tableaux de bord des évaluations nationales. Analyses détaillées par école, par niveau." gradient="from-emerald-50/20 via-transparent to-sky-50/20" />
              </motion.div>

              {/* Enseignants — 4 cols */}
              <motion.div variants={itemReveal} className="col-span-4">
                <BentoCard href="/enseignants" icon="👨‍🏫" title="Enseignants" desc="Annuaire et parcours des enseignants." />
              </motion.div>
            </motion.div>

            {/* ─── Espace réservé ─── */}
            {isAuthenticated && (
              <div id="auth-section" className="mt-20">
                <motion.div
                  initial="hidden" whileInView="visible" viewport={{ once: true }}
                  variants={itemReveal}
                  className="flex items-center gap-4 mb-10"
                >
                  <div className="h-px flex-1 bg-white/20" />
                  <span className="text-[10px] tracking-[0.15em] uppercase font-medium text-zen-text-muted">Espace réservé</span>
                  <div className="h-px flex-1 bg-white/20" />
                </motion.div>
                <motion.div
                  initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }}
                  variants={containerStagger}
                  className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-12 gap-4"
                >
                  {[
                    { href: '/donnees', icon: '💾', title: 'Données', desc: 'Importation et gestion.', span: 4 },
                    { href: '/pilotage', icon: '📈', title: 'Pilotage', desc: 'Indicateurs clés.', span: 4 },
                    { href: '/carte', icon: '🗺️', title: 'Carte', desc: 'Localisation des écoles.', span: 4 },
                    { href: '/archives', icon: '📚', title: 'Archives', desc: 'Années passées.', span: 4 },
                    { href: '/analyse-classe', icon: '🔬', title: 'Analyse classe', desc: 'Évaluations nationales.', span: 4 },
                    { href: '/aide-analyse-classe', icon: '📖', title: 'Guide', desc: "Mode d'emploi.", span: 4 },
                  ].map(item => (
                    <motion.div key={item.href} variants={itemReveal} className={`col-span-4`}>
                      <BentoCard href={item.href} icon={item.icon} title={item.title} desc={item.desc} />
                    </motion.div>
                  ))}
                  {userRole === 'admin' && (
                    <>
                      <motion.div variants={itemReveal} className="col-span-4 sm:col-span-4 lg:col-span-6">
                        <BentoCard href="/admin" icon="👑" title="Administration" desc="Gestion des utilisateurs." gradient="from-purple-50/30 to-transparent" />
                      </motion.div>
                      <motion.div variants={itemReveal} className="col-span-4 sm:col-span-4 lg:col-span-6">
                        <BentoCard href="/questionnaires/admin" icon="⚙️" title="Gérer questionnaires" desc="Créer et consulter." gradient="from-purple-50/30 to-transparent" />
                      </motion.div>
                    </>
                  )}
                </motion.div>
              </div>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            FOOTER — minimal
            ═══════════════════════════════════════════ */}
        <footer id="footer" className="py-10 text-center">
          <p className="text-zen-text-muted text-sm">
            Designé par <span className="text-zen-text font-medium">LOUIS Olivier</span> · 2026
          </p>
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
              className="fixed inset-0 bg-black/30 backdrop-blur-xl flex items-center justify-center z-[100] p-4"
              onClick={() => setShowLoginModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 12 }}
                transition={springFast}
                className="glass-card p-8 max-w-md w-full !cursor-default hover:!transform-none"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tightest text-zen-text">Connexion</h2>
                    <p className="text-zen-text-muted text-sm mt-1">Accédez à l&apos;espace réservé</p>
                  </div>
                  <button onClick={() => setShowLoginModal(false)} className="w-8 h-8 rounded-full hover:bg-white/30 flex items-center justify-center text-zen-text-muted hover:text-zen-text transition-colors text-lg">×</button>
                </div>
                {error && <div className="bg-red-50/60 backdrop-blur-sm border border-red-200/40 text-red-700 px-4 py-3 rounded-2xl mb-6 text-sm">{error}</div>}
                <form onSubmit={handleLogin}>
                  <div className="mb-5">
                    <label className="block text-zen-text text-sm font-medium mb-2">Nom d&apos;utilisateur</label>
                    <input
                      type="text" value={credentials.username}
                      onChange={e => setCredentials({ ...credentials, username: e.target.value })}
                      className="w-full px-4 py-3 bg-white/30 backdrop-blur-sm border border-white/20 rounded-2xl focus:outline-none focus:border-zen-text/30 focus:ring-1 focus:ring-zen-text/10 transition-all text-zen-text placeholder-zen-text-muted"
                      placeholder="Identifiant" required autoFocus
                    />
                  </div>
                  <div className="mb-8">
                    <label className="block text-zen-text text-sm font-medium mb-2">Mot de passe</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'} value={credentials.password}
                        onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                        className="w-full px-4 py-3 pr-20 bg-white/30 backdrop-blur-sm border border-white/20 rounded-2xl focus:outline-none focus:border-zen-text/30 focus:ring-1 focus:ring-zen-text/10 transition-all text-zen-text placeholder-zen-text-muted"
                        placeholder="Mot de passe" required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zen-text-muted hover:text-zen-text transition-colors text-[11px] font-medium uppercase tracking-wider">
                        {showPassword ? 'Masquer' : 'Afficher'}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={isLoading} className="btn-primary-zen w-full disabled:opacity-50">
                    {isLoading ? 'Connexion...' : 'Se connecter'}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BENTO CARD — Glass, 32px radius
   ═══════════════════════════════════════════════════════════════ */

function BentoCard({ href, icon, title, desc, large, gradient, tag, onClick }: {
  href: string; icon: string; title: string; desc: string;
  large?: boolean; gradient?: string; tag?: string;
  onClick?: () => void;
}) {
  const content = (
    <div className={`glass-card h-full p-7 flex flex-col justify-between ${gradient ? `bg-gradient-to-br ${gradient}` : ''} ${large ? 'min-h-[320px]' : ''}`}>
      <div>
        <span className={`card-icon inline-block mb-4 ${large ? 'text-4xl' : 'text-3xl'}`}>{icon}</span>
        <h3 className={`font-bold tracking-tightest text-zen-text mb-2 leading-tight ${large ? 'text-2xl' : 'text-lg'}`}>{title}</h3>
        <p className={`text-zen-text-secondary leading-relaxed ${large ? 'text-sm max-w-md' : 'text-sm'}`}>{desc}</p>
      </div>
      {tag && <div className="mt-6 text-zen-text-muted text-[11px] font-medium tracking-wide uppercase">{tag}</div>}
    </div>
  );

  if (onClick) {
    return <div onClick={onClick}>{content}</div>;
  }
  return <Link href={href}>{content}</Link>;
}

/* ═══════════════════════════════════════════════════════════════
   TAB PREVIEW — Mockup glass dans la carte droite
   ═══════════════════════════════════════════════════════════════ */

function TabPreview({ index }: { index: number }) {
  const previewBg = "bg-gradient-to-b from-sky-100/40 via-emerald-50/30 to-green-100/20";

  if (index === 0) {
    return (
      <div className={`h-full ${previewBg} p-6 sm:p-8 flex items-center justify-center`}>
        <div className="bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-sm border border-white/30">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/20">
            <div className="w-8 h-8 rounded-full bg-zen-accent/10 flex items-center justify-center text-[10px] font-bold text-zen-text">IEN</div>
            <div><p className="text-sm font-semibold text-zen-text tracking-tight">Inspection</p><p className="text-[10px] text-zen-text-muted">En ligne</p></div>
          </div>
          <div className="space-y-2.5">
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[13px] text-zen-text max-w-[78%]">Comment s&apos;est passée votre visite ?</div>
            <div className="bg-zen-accent text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-[13px] ml-auto max-w-[78%]">Les élèves étaient très engagés !</div>
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-[13px] text-zen-text max-w-[78%]">Compte-rendu envoyé. ✅</div>
          </div>
        </div>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className={`h-full ${previewBg} p-6 sm:p-8 flex items-center justify-center`}>
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {['Français CP', 'Maths CE1', 'Sciences CM1', 'EMC Cycle 3', 'Arts visuels', 'EPS'].map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: i * 0.06 }}
              className="bg-white/50 backdrop-blur-xl rounded-[20px] p-3.5 border border-white/25 text-center"
            >
              <div className="text-xl mb-1">{['📖','🔢','🔬','🤝','🎨','⚽'][i]}</div>
              <p className="text-[11px] font-semibold text-zen-text tracking-tight">{r}</p>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className={`h-full ${previewBg} p-6 sm:p-8 flex items-center justify-center`}>
        <div className="bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-sm border border-white/30">
          <p className="text-[10px] font-semibold text-zen-text-muted uppercase tracking-widest mb-4">Éval. nationales CP — Français</p>
          <div className="space-y-3">
            {[
              { e: 'Cayenne Nord A', p: 78, c: 'bg-emerald-400' },
              { e: 'Roura Centre', p: 65, c: 'bg-blue-400' },
              { e: 'Rémire B', p: 82, c: 'bg-emerald-500' },
              { e: 'Matoury A', p: 71, c: 'bg-amber-400' },
            ].map((r, i) => (
              <div key={i}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zen-text font-medium">{r.e}</span>
                  <span className="text-zen-text-muted">{r.p}%</span>
                </div>
                <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${r.p}%` }}
                    transition={{ ...spring, delay: i * 0.1 }}
                    className={`h-full ${r.c} rounded-full`}
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
    <div className={`h-full ${previewBg} p-6 sm:p-8 flex items-center justify-center`}>
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {[
          { n: 'Messagerie', s: 'Académique', i: '✉️' },
          { n: 'ENT', s: 'Guyane', i: '🖥️' },
          { n: 'ONDE', s: 'Base élèves', i: '📋' },
          { n: 'LSU', s: 'Livret', i: '📝' },
          { n: 'Eduscol', s: 'Ressources', i: '🏛️' },
          { n: 'BRNE', s: 'Numérique', i: '💻' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: i * 0.06 }}
            className="bg-white/50 backdrop-blur-xl rounded-[20px] p-3.5 border border-white/25 flex items-center gap-2.5"
          >
            <span className="text-lg">{item.i}</span>
            <div>
              <p className="text-[12px] font-semibold text-zen-text tracking-tight">{item.n}</p>
              <p className="text-[10px] text-zen-text-muted">{item.s}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DOCK + ICONS
   ═══════════════════════════════════════════════════════════════ */

function DockIcon({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <a href={href} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${active ? 'bg-white/15' : 'opacity-50 hover:opacity-90'}`} title={label} aria-label={label}>
      <span className="w-4 h-4 text-white">{icon}</span>
    </a>
  );
}

function IconHome() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function IconBook() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>; }
function IconCalendar() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>; }
function IconMail() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>; }
function IconUser() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function IconClip() { return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>; }
