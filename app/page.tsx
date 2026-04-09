'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const spring = { type: 'spring' as const, stiffness: 70, damping: 20, mass: 1 };
const springFast = { type: 'spring' as const, stiffness: 200, damping: 22, mass: 0.8 };

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const underlineRef = useRef<HTMLDivElement>(null);

  // State-driven animation — triggered by button click
  const [heroShrunk, setHeroShrunk] = useState(false);
  const [showBoxLeft, setShowBoxLeft] = useState(false);
  const [showBoxRight, setShowBoxRight] = useState(false);
  const [showBoxLeftContent, setShowBoxLeftContent] = useState(false);

  const handleEnter = () => {
    if (heroShrunk) return;
    setHeroShrunk(true);
    // Box gauche après la fin du shrink (~800ms) + pause
    setTimeout(() => setShowBoxLeft(true), 1000);
    // Contenu de la box gauche après que la box soit apparue (~800ms spring)
    setTimeout(() => setShowBoxLeftContent(true), 1800);
    // Box droite après la fin de l'animation gauche
    setTimeout(() => setShowBoxRight(true), 1800);
  };

  // Auth
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

  // Tab underline
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

  // Tabs — each maps to a page/route
  const tabs = [
    {
      label: 'Écoles', sub: 'Consultation',
      title: 'Écoles',
      desc: 'Consultez les informations et les statistiques de chaque école de la circonscription Cayenne 2 Roura.',
      btn: 'Voir les écoles', href: '/ecoles',
    },
    {
      label: 'Évaluations', sub: 'Résultats',
      title: 'Évaluations',
      desc: 'Pilotez la réussite avec des données précises. Résultats des évaluations nationales CP, CE1 et analyses.',
      btn: 'Voir les résultats', href: '/evaluations',
    },
    {
      label: 'Enseignants', sub: 'Annuaire',
      title: 'Enseignants',
      desc: 'Recherche et parcours des enseignants de la circonscription. Annuaire complet et informations.',
      btn: 'Consulter', href: '/enseignants',
    },
    {
      label: 'Statistiques', sub: 'Analyses',
      title: 'Statistiques',
      desc: 'Tableaux de bord et analyses statistiques détaillées de la circonscription.',
      btn: 'Explorer', href: '/statistiques',
    },
  ];

  return (
    <div className="bg-white h-screen overflow-hidden relative p-3 sm:p-4">
      <div className="bg-[#e8e8e8] rounded-[24px] h-full overflow-hidden relative flex flex-col">

      {/* ═══ DOCK NAVIGATION — fixed, always on top ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="fixed top-0 left-0 right-0 z-[60] px-4 sm:px-8 py-4"
      >
        <div
          className={`rounded-[16px] max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-center transition-all duration-500 ${
            heroShrunk
              ? 'bg-transparent border-transparent shadow-none'
              : 'nav-dock'
          }`}
        >
          {/* Logo + label — disappear on shrink */}
          <motion.div
            animate={{ opacity: heroShrunk ? 0 : 1, width: heroShrunk ? 0 : 'auto', marginRight: heroShrunk ? 0 : 'auto' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex items-center gap-2.5 overflow-hidden"
          >
            <Image src="/logo-circonscription.png" alt="Logo" width={28} height={28} className="rounded-lg shrink-0" />
            <span className="font-medium text-zen-text text-sm hidden sm:inline tracking-tight whitespace-nowrap">Circonscription</span>
          </motion.div>
          <div className="flex items-center bg-zen-accent rounded-full px-1.5 py-1.5 gap-0.5">
            <DockIcon href="#" icon={<IconHome />} label="Accueil" active />
            <DockIcon href="/ecoles" icon={<IconSchool />} label="Écoles" />
            <DockIcon href="/evaluations" icon={<IconChart />} label="Évaluations" />
            <DockIcon href="/enseignants" icon={<IconUser />} label="Enseignants" />
            {isAuthenticated && <DockIcon href="/calendrier" icon={<IconCalendar />} label="Calendrier" />}
            <DockIcon href="#" icon={<IconLock />} label="Connexion" onClick={() => setShowLoginModal(true)} />
          </div>
          {/* Spacer to balance logo — same width as logo+label */}
          <motion.div
            animate={{ opacity: heroShrunk ? 0 : 1, width: heroShrunk ? 0 : 'auto', marginLeft: heroShrunk ? 0 : 'auto' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-[28px] h-[28px]" />
              <span className="text-sm hidden sm:inline invisible">Circonscription</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ═══ HERO — animates from 100vh to 30vh on button click ═══ */}
      <motion.section
        animate={{
          height: heroShrunk ? '30%' : '100%',
          borderRadius: heroShrunk ? '0 0 24px 24px' : 0,
        }}
        transition={{ type: 'spring', stiffness: 50, damping: 30, mass: 1 }}
        className="relative w-full overflow-hidden origin-top z-10 shrink-0"
      >
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="/IMG_4258.jpeg"
            alt="" className="w-full h-[100vh] object-cover" aria-hidden="true"
          />
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/5 to-black/30" />
        <div className="absolute inset-0 bg-white/10" />

        {/* Hero content — fades out when shrunk */}
        <motion.div
          animate={{
            opacity: heroShrunk ? 0 : 1,
            y: heroShrunk ? -40 : 0,
          }}
          transition={{ type: 'spring', stiffness: 60, damping: 30 }}
          className="relative z-10 flex flex-col items-center justify-center h-[100vh] px-6 sm:px-12 text-center pt-20"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.1 }}
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 text-sm text-white/90 mb-8"
          >
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Académie de Guyane · Cayenne 2 Roura
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.25 }}
            className="text-[clamp(3rem,7vw,6rem)] font-bold leading-[1.02] tracking-tightest text-white mb-6 max-w-4xl"
          >
            L&apos;École au cœur<br />de la Guyane.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.4 }}
            className="text-white/70 text-lg sm:text-xl font-light max-w-xl mb-10 leading-relaxed"
          >
            Tableau de bord de la circonscription.
            <br className="hidden sm:block" />
            Pilotage, données et suivi des écoles.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.55 }}
            className="flex items-center gap-4"
          >
            <button onClick={handleEnter} className="bg-white text-zen-text font-medium rounded-full px-8 py-3.5 text-[15px] backdrop-blur-md border border-white/30 transition-all duration-300 hover:shadow-lg hover:shadow-white/20 hover:-translate-y-0.5">
              Accéder au tableau de bord
            </button>
            <Link href="/ecoles" className="backdrop-blur-md bg-white/10 border border-white/20 text-white rounded-full px-6 py-3.5 text-[15px] font-medium transition-all duration-300 hover:bg-white/20 hover:-translate-y-0.5">
              Explorer
            </Link>
          </motion.div>
        </motion.div>

        {/* Title that appears in the shrunk hero bandeau */}
        <motion.div
          initial={false}
          animate={{
            opacity: heroShrunk ? 1 : 0,
          }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: heroShrunk ? 0.5 : 0 }}
          className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
        >
          <div className="flex items-center gap-5">
            <Image src="/logo-circonscription.png" alt="Logo" width={64} height={64} className="rounded-2xl shrink-0" />
            <h2 className="text-[clamp(1.2rem,3vw,2.2rem)] font-bold leading-[1.05] tracking-tightest text-white text-left">
              Circonscription Cayenne 2 — Roura<br />
              <span className="font-light text-white/70">Tableau de bord</span>
            </h2>
          </div>
        </motion.div>
      </motion.section>

      {/* ═══ DEUX BOXES — appear below hero after shrink, staggered ═══ */}
      <div className={`flex-1 pt-4 pb-0 min-h-0 overflow-hidden ${heroShrunk ? '' : 'invisible h-0 pt-0'}`}>
        <div className="grid lg:grid-cols-2 gap-4 h-full">

          {/* BOX GAUCHE — appears first */}
          <motion.div
            initial={false}
            animate={{
              opacity: showBoxLeft ? 1 : 0,
              y: showBoxLeft ? 0 : 60,
            }}
            transition={{ type: 'spring', stiffness: 50, damping: 30, mass: 1 }}
            className="glass-card p-6 sm:p-8 flex flex-col"
          >
            {/* Onglets */}
            <div className="relative flex gap-5 sm:gap-8 border-b border-white/15 mb-0 overflow-x-auto">
              {tabs.map((tab, i) => (
                <button
                  key={i}
                  ref={el => { tabsRef.current[i] = el; }}
                  onClick={() => setActiveTab(i)}
                  className={`pb-3 text-left flex-shrink-0 transition-colors duration-300 ${
                    activeTab === i ? 'text-zen-text' : 'text-zen-text-muted hover:text-zen-text-secondary'
                  }`}
                >
                  <div className="font-semibold text-[13px] tracking-tight">{tab.label}</div>
                  <div className="text-[10px] text-zen-text-muted mt-0.5">{tab.sub}</div>
                </button>
              ))}
              <div ref={underlineRef} className="tab-underline" />
            </div>

            {/* Contenu onglet — fade in after box is fully visible */}
            <motion.div
              initial={false}
              animate={{ opacity: showBoxLeftContent ? 1 : 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="flex-1 flex flex-col justify-end pt-8"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={spring}
                >
                  <h2 className="text-[clamp(2rem,4vw,3.2rem)] font-bold tracking-tightest text-zen-text mb-3 leading-tight">
                    {tabs[activeTab].title}
                  </h2>
                  <p className="text-zen-text-secondary text-[15px] leading-relaxed mb-6 max-w-md">
                    {tabs[activeTab].desc}
                  </p>
                  <Link href={tabs[activeTab].href} className="btn-primary-zen inline-block">
                    {tabs[activeTab].btn}
                  </Link>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {/* BOX DROITE — Preview, appears second (fade only, no movement) */}
          <motion.div
            initial={false}
            animate={{
              opacity: showBoxRight ? 1 : 0,
            }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="glass-card p-0 overflow-hidden"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={spring}
                className="h-full"
              >
                <TabPreview index={activeTab} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

      </div>

      {/* Footer minimal — visible after boxes appear */}
      {showBoxRight && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center py-3"
        >
          <p className="text-zen-text-muted text-xs">
            Designé par <span className="text-zen-text-secondary font-medium">LOUIS Olivier</span> · 2026
          </p>
        </motion.div>
      )}

      {/* ═══ MODAL CONNEXION ═══ */}
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
                  <input type="text" value={credentials.username} onChange={e => setCredentials({ ...credentials, username: e.target.value })}
                    className="w-full px-4 py-3 bg-white/30 backdrop-blur-sm border border-white/20 rounded-2xl focus:outline-none focus:border-zen-text/30 transition-all text-zen-text placeholder-zen-text-muted"
                    placeholder="Identifiant" required autoFocus />
                </div>
                <div className="mb-8">
                  <label className="block text-zen-text text-sm font-medium mb-2">Mot de passe</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={credentials.password} onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                      className="w-full px-4 py-3 pr-20 bg-white/30 backdrop-blur-sm border border-white/20 rounded-2xl focus:outline-none focus:border-zen-text/30 transition-all text-zen-text placeholder-zen-text-muted"
                      placeholder="Mot de passe" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zen-text-muted hover:text-zen-text transition-colors text-[11px] font-medium uppercase tracking-wider">
                      {showPassword ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="btn-primary-zen w-full disabled:opacity-50">
                  {isLoading ? 'Connexion...' : 'Se connecter'}
                </button>
                {/* Navigation rapide si connecté */}
                {isAuthenticated && (
                  <div className="mt-6 pt-5 border-t border-white/15">
                    <p className="text-[11px] uppercase tracking-wider text-zen-text-muted font-medium mb-3">Accès rapide</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { href: '/donnees', label: '💾 Données' },
                        { href: '/calendrier', label: '📅 Calendrier' },
                        { href: '/pilotage', label: '📈 Pilotage' },
                        { href: '/carte', label: '🗺️ Carte' },
                        { href: '/archives', label: '📚 Archives' },
                        { href: '/analyse-classe', label: '🔬 Analyse' },
                      ].map(l => (
                        <Link key={l.href} href={l.href} className="text-sm text-zen-text-secondary hover:text-zen-text bg-white/20 hover:bg-white/30 rounded-xl px-3 py-2 transition-all text-center">
                          {l.label}
                        </Link>
                      ))}
                      {userRole === 'admin' && (
                        <>
                          <Link href="/admin" className="text-sm text-zen-text-secondary hover:text-zen-text bg-white/20 hover:bg-white/30 rounded-xl px-3 py-2 transition-all text-center">👑 Admin</Link>
                          <Link href="/questionnaires/admin" className="text-sm text-zen-text-secondary hover:text-zen-text bg-white/20 hover:bg-white/30 rounded-xl px-3 py-2 transition-all text-center">⚙️ Questionnaires</Link>
                        </>
                      )}
                    </div>
                  </div>
                )}
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
   TAB PREVIEW — Glass mockup in the right box
   ═══════════════════════════════════════════════════════════════ */

function TabPreview({ index }: { index: number }) {
  const bgPhoto = (
    <>
      <img src="/IMG_6622.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" aria-hidden="true" />
      <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]" />
    </>
  );

  if (index === 0) {
    // Écoles — dashboard preview
    return (
      <div className="relative h-full p-6 sm:p-8 flex items-center justify-center overflow-hidden">
        {bgPhoto}
        <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-sm border border-white/30">
          <p className="text-[10px] font-semibold text-zen-text-muted uppercase tracking-widest mb-3">Écoles de la circonscription</p>
          <div className="space-y-2">
            {[
              { name: 'Cayenne Nord A', eleves: 287, cls: 12 },
              { name: 'Roura Centre', eleves: 194, cls: 8 },
              { name: 'Rémire B', eleves: 342, cls: 14 },
              { name: 'Matoury A', eleves: 256, cls: 10 },
            ].map((e, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/15 last:border-0">
                <div>
                  <p className="text-[13px] font-semibold text-zen-text tracking-tight">{e.name}</p>
                  <p className="text-[10px] text-zen-text-muted">{e.cls} classes</p>
                </div>
                <span className="text-[11px] font-medium text-zen-text-secondary bg-white/40 px-2 py-0.5 rounded-full">{e.eleves} élèves</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (index === 1) {
    // Évaluations — barres de progression
    return (
      <div className="relative h-full p-6 sm:p-8 flex items-center justify-center overflow-hidden">
        {bgPhoto}
        <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-sm border border-white/30">
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
                    transition={{ type: 'spring', stiffness: 60, damping: 15, delay: i * 0.1 }}
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
  if (index === 2) {
    // Enseignants — chat/profils
    return (
      <div className="relative h-full p-6 sm:p-8 flex items-center justify-center overflow-hidden">
        {bgPhoto}
        <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-sm border border-white/30">
          <p className="text-[10px] font-semibold text-zen-text-muted uppercase tracking-widest mb-3">Annuaire enseignants</p>
          <div className="space-y-2.5">
            {[
              { n: 'Mme Dupont', m: 'CE1 — Cayenne Nord A', avatar: '👩‍🏫' },
              { n: 'M. Jean-Louis', m: 'CM2 — Roura Centre', avatar: '👨‍🏫' },
              { n: 'Mme Belfort', m: 'CP — Rémire B', avatar: '👩‍🏫' },
              { n: 'M. Cléry', m: 'CE2 — Matoury A', avatar: '👨‍🏫' },
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-white/15 last:border-0">
                <span className="text-xl">{p.avatar}</span>
                <div>
                  <p className="text-[13px] font-semibold text-zen-text tracking-tight">{p.n}</p>
                  <p className="text-[10px] text-zen-text-muted">{p.m}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  // Statistiques — graph bars
  return (
    <div className="relative h-full p-6 sm:p-8 flex items-center justify-center overflow-hidden">
        {bgPhoto}
      <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-sm border border-white/30">
        <p className="text-[10px] font-semibold text-zen-text-muted uppercase tracking-widest mb-4">Effectifs par niveau</p>
        <div className="flex items-end gap-3 h-40 px-2">
          {[
            { label: 'CP', h: 65, c: 'bg-sky-400' },
            { label: 'CE1', h: 78, c: 'bg-emerald-400' },
            { label: 'CE2', h: 55, c: 'bg-amber-400' },
            { label: 'CM1', h: 82, c: 'bg-violet-400' },
            { label: 'CM2', h: 70, c: 'bg-rose-400' },
          ].map((bar, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${bar.h}%` }}
                transition={{ type: 'spring', stiffness: 60, damping: 15, delay: i * 0.08 }}
                className={`w-full ${bar.c} rounded-t-xl`}
              />
              <span className="text-[10px] text-zen-text-muted font-medium">{bar.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══ DOCK ICONS ═══ */

function DockIcon({ href, icon, label, active, onClick }: { href: string; icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  if (onClick) {
    return (
      <button onClick={onClick} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${active ? 'bg-white/15' : 'opacity-50 hover:opacity-90'}`} title={label} aria-label={label}>
        <span className="w-4 h-4 text-white">{icon}</span>
      </button>
    );
  }
  const Tag = href.startsWith('/') ? Link : 'a';
  return (
    <Tag href={href} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${active ? 'bg-white/15' : 'opacity-50 hover:opacity-90'}`} title={label} aria-label={label}>
      <span className="w-4 h-4 text-white">{icon}</span>
    </Tag>
  );
}

function IconHome() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function IconSchool() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16"/></svg>; }
function IconChart() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>; }
function IconUser() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function IconCalendar() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>; }

function IconLock() { return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>; }
