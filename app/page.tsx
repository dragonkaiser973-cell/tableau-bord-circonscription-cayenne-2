'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';

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
  const [hoverTab, setHoverTab] = useState<number | null>(null);


  // State-driven animation — triggered by button click
  const [heroShrunk, setHeroShrunk] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
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


  // Tabs — public pages (visible par tous)
  const publicTabs = [
    { label: 'Écoles', title: 'Écoles', desc: 'Consultez les informations et les statistiques de chaque école de la circonscription Cayenne 2 Roura.', btn: 'Voir les écoles', href: '/ecoles', image: '/tab-ecoles.jpg' },
    { label: 'Circonscription', title: 'Circonscription', desc: 'Présentation de la circonscription Cayenne 2 Roura, son organisation et ses missions.', btn: 'Découvrir', href: '/circonscription', image: '/tab-circonscription.jpg' },
    { label: 'Évaluations', title: 'Évaluations', desc: 'Pilotez la réussite avec des données précises. Résultats des évaluations nationales CP, CE1 et analyses.', btn: 'Voir les résultats', href: '/evaluations', image: '/tab-evaluations.jpg' },
    { label: 'Enseignants', title: 'Enseignants', desc: 'Recherche et parcours des enseignants de la circonscription. Annuaire complet et informations.', btn: 'Consulter', href: '/enseignants', image: '/tab-enseignants.jpg' },
    { label: 'Statistiques', title: 'Statistiques', desc: 'Tableaux de bord et analyses statistiques détaillées de la circonscription.', btn: 'Explorer', href: '/statistiques', image: '/tab-statistiques.jpg' },
    { label: 'Questionnaires', title: 'Questionnaires', desc: 'Répondez aux questionnaires de la circonscription et consultez les résultats.', btn: 'Accéder', href: '/questionnaires', image: '/tab-questionnaires.jpg' },
    { label: 'Analyse classe', title: 'Analyse classe', desc: 'Outil d\'analyse des résultats par classe pour un suivi pédagogique détaillé.', btn: 'Analyser', href: '/analyse-classe', image: '/tab-analyse-classe.jpg' },
    { label: 'Guide', title: 'Guide d\'utilisation', desc: 'Guide complet pour prendre en main le tableau de bord et ses fonctionnalités.', btn: 'Lire le guide', href: '/aide-analyse-classe', image: '/tab-guide.jpg' },
  ];

  // Tabs supplémentaires — visibles uniquement pour les utilisateurs connectés
  const authTabs = [
    { label: 'Formations', title: 'Formations', desc: 'Outils interactifs pour vos temps de formation (boussole d\'état d\'esprit, etc.).', btn: 'Accéder', href: '/formations', image: '/tab-formations.jpg' },
    { label: 'Données', title: 'Données', desc: 'Gestion et import des données de la circonscription.', btn: 'Gérer', href: '/donnees', image: '/tab-donnees.jpg' },
    { label: 'Calendrier', title: 'Calendrier', desc: 'Calendrier des événements et réunions de la circonscription.', btn: 'Consulter', href: '/calendrier', image: '/tab-calendrier.jpg' },
    { label: 'Archives', title: 'Archives', desc: 'Accédez aux archives des années précédentes.', btn: 'Consulter', href: '/archives', image: '/tab-archives.jpg' },
    { label: 'Pilotage', title: 'Pilotage', desc: 'Tableaux de bord de pilotage pour le suivi de la circonscription.', btn: 'Piloter', href: '/pilotage', image: '/tab-pilotage.jpg' },
    { label: 'Carte', title: 'Carte', desc: 'Carte interactive des écoles de la circonscription.', btn: 'Voir la carte', href: '/carte', image: '/tab-carte.jpg' },
    ...(userRole === 'admin' ? [
      { label: 'Administration', title: 'Administration', desc: 'Gestion des utilisateurs et paramètres du tableau de bord.', btn: 'Administrer', href: '/admin', image: '/tab-administration.jpg' },
      { label: 'Gérer questionnaires', title: 'Gérer les questionnaires', desc: 'Création, modification et suivi des questionnaires de la circonscription.', btn: 'Gérer', href: '/questionnaires/admin', image: '/tab-gerer-questionnaires.jpg' },
    ] : []),
  ];

  const tabs = isAuthenticated ? [...publicTabs, ...authTabs] : publicTabs;

  return (
    <div className="bg-white h-screen overflow-hidden relative p-3 sm:p-4">
      <div className="bg-white rounded-[24px] h-full overflow-hidden relative flex flex-col">

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
          <div className="flex items-center bg-zen-accent rounded-full px-1.5 py-1.5 gap-0.5">
            <DockIcon href="#" icon={<IconHome />} label="Accueil" active />
            <DockIcon href="/ecoles" icon={<IconSchool />} label="Écoles" />
            <DockIcon href="/evaluations" icon={<IconChart />} label="Évaluations" />
            <DockIcon href="/enseignants" icon={<IconUser />} label="Enseignants" />
            {isAuthenticated && <DockIcon href="/calendrier" icon={<IconCalendar />} label="Calendrier" />}
            <DockIcon href="#" icon={<IconLock />} label="Connexion" onClick={() => setShowLoginModal(true)} />
          </div>
        </div>
      </motion.div>

      {/* ═══ HERO — animates from 100vh to 30vh on button click ═══ */}
      <motion.section
        animate={{
          height: heroShrunk ? '30%' : '100%',
          borderRadius: heroShrunk ? '0 0 24px 24px' : 0,
        }}
        transition={{ type: 'tween', duration: 1.5, ease: [0.25, 1, 0.5, 1] }}
        className="relative w-full overflow-hidden origin-top z-10 shrink-0"
      >
        {/* Hero video – plays once, frozen on last frame via poster overlay */}
        <video
          autoPlay
          muted
          playsInline
          preload="auto"
          poster="/hero-poster.jpeg"
          onEnded={() => setVideoEnded(true)}
          className="absolute inset-0 w-full h-[100vh] object-cover"
          aria-hidden="true"
        >
          <source src="/hero-720p.mp4" type="video/mp4" />
        </video>

        {/* Final still – fades in when video ends, also acts as fallback */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: videoEnded ? 1 : 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute inset-0 pointer-events-none"
        >
          <img
            src="/hero-poster.jpeg"
            alt="" className="w-full h-[100vh] object-cover" aria-hidden="true"
          />
        </motion.div>

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
            className="flex items-center gap-6 mb-8"
          >
            <Image src="/logo-circonscription.png" alt="Logo" width={140} height={140} className="rounded-3xl shrink-0" />
            <h1 className="text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[1.02] tracking-tightest text-white text-left">
              Circonscription<br />Cayenne 2 – Roura
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.3 }}
            className="text-white text-lg sm:text-xl font-medium max-w-xl mb-10 leading-relaxed drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]"
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
          <div className="flex items-center gap-6">
            <Image src="/logo-circonscription.png" alt="Logo" width={120} height={120} className="rounded-3xl shrink-0" />
            <h2 className="text-[clamp(1.6rem,4vw,3rem)] font-bold leading-[1.05] tracking-tightest text-white text-left">
              Circonscription Cayenne 2 – Roura<br />
              <span className="font-light text-white/70">Tableau de bord</span>
            </h2>
          </div>
        </motion.div>
      </motion.section>

      {/* ═══ DEUX BOXES — appear below hero after shrink, staggered ═══ */}
      <div className={`flex-1 pt-4 pb-px min-h-0 overflow-hidden px-px ${heroShrunk ? '' : 'invisible h-0 pt-0'}`}>
        <div className="grid lg:grid-cols-2 gap-4 h-full">

          {/* BOX GAUCHE — appears first */}
          <motion.div
            initial={false}
            animate={{
              opacity: showBoxLeft ? 1 : 0,
              y: showBoxLeft ? 0 : 60,
            }}
            transition={{ type: 'tween', duration: 1.5, ease: [0.25, 1, 0.5, 1] }}
            className="glass-card border-0 p-6 sm:p-8 flex flex-col"
          >
            {/* Onglets */}
            <LayoutGroup>
              <div className="flex flex-wrap">
                {tabs.map((tab, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTab(i)}
                    onMouseEnter={() => setHoverTab(i)}
                    onMouseLeave={() => setHoverTab(null)}
                    className={`py-2 relative transition-colors duration-300 ${
                      activeTab === i ? 'text-zen-text' : 'text-zen-text-muted hover:text-zen-text'
                    }`}
                  >
                    <div className="px-4 py-2 relative">
                      <span className="relative z-10 font-semibold text-[17px] tracking-tight">{tab.label}</span>
                      {hoverTab === i && (
                        <motion.div
                          layoutId="tab-hover-bg"
                          className="absolute inset-0 bg-zen-text/[0.06] rounded-md"
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        />
                      )}
                    </div>
                    {activeTab === i && (
                      <motion.div
                        layoutId="tab-active-line"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-zen-text"
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      />
                    )}
                    {hoverTab === i && hoverTab !== activeTab && (
                      <motion.div
                        layoutId="tab-hover-line"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-zen-text/30"
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </LayoutGroup>

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
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
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
            className="rounded-[32px] overflow-hidden"
          >
            <Link href={tabs[activeTab].href} className="block h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ type: 'tween', duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="h-full"
              >
                <TabPreview index={activeTab} tabs={tabs} />
              </motion.div>
            </AnimatePresence>
            </Link>
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

function TabPreview({
  index,
  tabs,
}: {
  index: number;
  tabs: { title: string; desc: string; image?: string }[];
}) {
  const activeImage = tabs[index]?.image || '/guyane-fleuve-foret-hero.jpg';

  const bgPhoto = (
    <>
      <AnimatePresence initial={false}>
        <motion.img
          key={activeImage}
          src={activeImage}
          alt=""
          aria-hidden="true"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.01 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent pointer-events-none" />
    </>
  );

  const wrapper = (children: React.ReactNode) => (
    <div className="relative h-full p-6 sm:p-8 flex items-center justify-center overflow-hidden rounded-[32px]">
      {bgPhoto}
      <div className="relative z-10 w-full h-full flex items-center justify-center">{children}</div>
    </div>
  );

  if (index === 1) {
    return wrapper(
      <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-md border border-white/30">
        <p className="text-[10px] font-semibold text-zen-text-muted uppercase tracking-widest mb-3">Équipe de circonscription</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { r: 'IEN', n: 'Mme Lautric' },
            { r: 'Secrétaire', n: 'Mme Pigree' },
            { r: 'CPAIEN', n: 'Mme Hernandez' },
            { r: 'CPC EPS', n: 'M. Pierre' },
          ].map((p, i) => (
            <div key={i} className="bg-white/40 rounded-xl p-2.5 border border-white/30">
              <p className="text-[9px] text-zen-text-muted font-bold tracking-widest uppercase">{p.r}</p>
              <p className="text-[12px] font-semibold text-zen-text mt-0.5">{p.n}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-[10px] text-zen-text-muted">
          <span>18 écoles</span>
          <span>5 122 élèves</span>
          <span>360 enseignants</span>
        </div>
      </div>,
    );
  }

  if (index === 0) {
    return wrapper(
      <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-md border border-white/30">
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
    );
  }

  if (index === 2) {
    return wrapper(
      <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-md border border-white/30">
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
    );
  }

  if (index === 3) {
    return wrapper(
      <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-md border border-white/30">
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
    );
  }

  if (index === 4) {
    return wrapper(
      <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-md border border-white/30">
        <p className="text-[10px] font-semibold text-zen-text-muted uppercase tracking-widest mb-4">Effectifs par niveau</p>
        <div className="flex gap-3 h-40 px-2">
          {[
            { label: 'CP', h: 104, c: 'bg-sky-400' },
            { label: 'CE1', h: 125, c: 'bg-emerald-400' },
            { label: 'CE2', h: 88, c: 'bg-amber-400' },
            { label: 'CM1', h: 131, c: 'bg-violet-400' },
            { label: 'CM2', h: 112, c: 'bg-rose-400' },
          ].map((bar) => (
            <div key={bar.label} className="flex-1 flex flex-col items-center justify-end">
              <div
                style={{ height: `${bar.h}px` }}
                className={`w-full ${bar.c} rounded-t-xl`}
              />
              <span className="text-[10px] text-zen-text-muted font-medium mt-1">{bar.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (index === 5) {
    return wrapper(
      <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-md border border-white/30">
        <p className="text-[10px] font-semibold text-zen-text-muted uppercase tracking-widest mb-3">Questionnaires en cours</p>
        <div className="space-y-2.5">
          {[
            { t: "Boussole d'état d'esprit", r: 74, c: 'from-emerald-400 to-teal-500' },
            { t: 'Plan formation 2026', r: 52, c: 'from-sky-400 to-blue-500' },
            { t: "Bilan d'année", r: 91, c: 'from-amber-400 to-orange-500' },
          ].map((q, i) => (
            <div key={i} className="bg-white/40 rounded-xl p-2.5 border border-white/30">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[12px] font-semibold text-zen-text">{q.t}</p>
                <span className="text-[10px] font-bold text-zen-text-secondary tabular-nums">{q.r}%</span>
              </div>
              <div className="h-1.5 bg-white/40 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${q.r}%` }}
                  transition={{ type: 'spring', stiffness: 60, damping: 15, delay: i * 0.1 }}
                  className={`h-full bg-gradient-to-r ${q.c} rounded-full`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>,
    );
  }

  if (index === 6) {
    return wrapper(
      <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-md border border-white/30">
        <p className="text-[10px] font-semibold text-zen-text-muted uppercase tracking-widest mb-3">CE1 A — Cayenne Nord</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { l: 'Maîtrisé', v: 14, c: 'text-emerald-700 bg-emerald-100' },
            { l: 'Fragile', v: 6, c: 'text-amber-700 bg-amber-100' },
            { l: 'Soutien', v: 3, c: 'text-rose-700 bg-rose-100' },
          ].map((s, i) => (
            <div key={i} className={`rounded-lg p-2 text-center ${s.c}`}>
              <p className="text-[20px] font-bold tabular-nums leading-none">{s.v}</p>
              <p className="text-[9px] font-semibold uppercase tracking-wide mt-1">{s.l}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] font-semibold text-zen-text-muted uppercase tracking-widest mb-1.5">Domaines</p>
        {[
          { l: 'Compréhension orale', v: 82 },
          { l: 'Lire à haute voix', v: 68 },
          { l: 'Calcul mental', v: 71 },
        ].map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px] mb-1">
            <span className="text-zen-text flex-1">{d.l}</span>
            <span className="font-bold tabular-nums text-zen-text-secondary">{d.v}%</span>
          </div>
        ))}
      </div>,
    );
  }

  if (index === 7) {
    return wrapper(
      <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-md border border-white/30">
        <p className="text-[10px] font-semibold text-zen-text-muted uppercase tracking-widest mb-3">Guide d&apos;utilisation</p>
        <ol className="space-y-2">
          {[
            'Importer les évaluations CSV',
            'Filtrer par école et niveau',
            'Analyser les domaines fragiles',
            'Exporter le rapport PDF',
          ].map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary-600 to-[#45b8a0] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-sm tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[12px] text-zen-text leading-snug pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
      </div>,
    );
  }

  if (index === 8) {
    return wrapper(
      <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-md border border-white/30">
        <p className="text-[10px] font-semibold text-zen-text-muted uppercase tracking-widest mb-3">Prochaines formations</p>
        <div className="space-y-2.5">
          {[
            { d: '12', m: 'sep', t: "Boussole d'état d'esprit", p: 42, c: 'bg-emerald-100 text-emerald-700' },
            { d: '08', m: 'oct', t: 'Lecture-écriture cycle 2', p: 28, c: 'bg-sky-100 text-sky-700' },
            { d: '15', m: 'nov', t: 'Mathématiques différenciation', p: 34, c: 'bg-amber-100 text-amber-700' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/40 rounded-xl p-2.5 border border-white/30">
              <div className={`w-12 text-center rounded-lg py-1 ${f.c}`}>
                <p className="text-[14px] font-bold leading-none tabular-nums">{f.d}</p>
                <p className="text-[9px] font-bold uppercase tracking-wide mt-0.5">{f.m}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-zen-text truncate">{f.t}</p>
                <p className="text-[10px] text-zen-text-muted">{f.p} inscrits</p>
              </div>
            </div>
          ))}
        </div>
      </div>,
    );
  }

  if (index === 9) {
    return wrapper(
      <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-md border border-white/30">
        <p className="text-[10px] font-semibold text-zen-text-muted uppercase tracking-widest mb-3">État des imports</p>
        <div className="space-y-2.5">
          {[
            { t: 'Évaluations CP — Français', s: '12 542 lignes', ok: true },
            { t: 'Évaluations CP — Maths', s: '12 318 lignes', ok: true },
            { t: 'Effectifs 2026-2027', s: 'En attente', ok: false },
          ].map((d, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/40 rounded-xl p-2.5 border border-white/30">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  d.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {d.ok ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v5M12 16h0" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-zen-text truncate">{d.t}</p>
                <p className="text-[10px] text-zen-text-muted">{d.s}</p>
              </div>
            </div>
          ))}
        </div>
      </div>,
    );
  }

  if (index === 10) {
    const events = new Set([3, 12, 17, 24]);
    return wrapper(
      <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-md border border-white/30">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold text-zen-text-muted uppercase tracking-widest">Septembre 2026</p>
          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wide">4 évts</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <span key={i} className="text-[9px] font-bold text-zen-text-muted">
              {d}
            </span>
          ))}
          {Array.from({ length: 30 }, (_, i) => {
            const day = i + 1;
            const today = day === 17;
            const evt = events.has(day);
            return (
              <div
                key={day}
                className={`aspect-square flex items-center justify-center text-[10px] font-medium rounded-md ${
                  today
                    ? 'bg-zen-text text-white shadow-md'
                    : evt
                    ? 'bg-emerald-100 text-emerald-700 font-bold'
                    : 'text-zen-text/80'
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>,
    );
  }

  if (index === 11) {
    return wrapper(
      <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-md border border-white/30">
        <p className="text-[10px] font-semibold text-zen-text-muted uppercase tracking-widest mb-3">Archives par année scolaire</p>
        <div className="space-y-1.5">
          {[
            { y: '2025-2026', n: 'En cours', a: false },
            { y: '2024-2025', n: '5 122 élèves', a: true },
            { y: '2023-2024', n: '5 087 élèves', a: true },
            { y: '2022-2023', n: '4 973 élèves', a: true },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/40 rounded-xl px-3 py-2 border border-white/30">
              <div className="w-1 h-9 rounded-full bg-gradient-to-b from-primary-500 to-[#45b8a0]" />
              <div className="flex-1">
                <p className="text-[12px] font-bold text-zen-text tabular-nums">{r.y}</p>
                <p className="text-[10px] text-zen-text-muted">{r.n}</p>
              </div>
              {r.a && (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wide">archivé</span>
              )}
            </div>
          ))}
        </div>
      </div>,
    );
  }

  if (index === 12) {
    return wrapper(
      <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-md border border-white/30">
        <p className="text-[10px] font-semibold text-zen-text-muted uppercase tracking-widest mb-3">Indicateurs clés 2026</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { k: 'Réussite CP', v: '74%', d: '+3.2' },
            { k: 'Inclusion', v: '68%', d: '+1.8' },
            { k: 'Vie scolaire', v: '82%', d: '−0.5' },
            { k: 'Climat', v: '88%', d: '+5.1' },
          ].map((k, i) => {
            const trend = k.d.startsWith('+') ? 'text-emerald-600' : 'text-rose-600';
            return (
              <div key={i} className="bg-white/40 rounded-xl p-2.5 border border-white/30">
                <p className="text-[9px] font-semibold text-zen-text-muted uppercase tracking-widest">{k.k}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-[20px] font-bold text-zen-text tabular-nums leading-none">{k.v}</p>
                  <span className={`text-[10px] font-bold ${trend} tabular-nums`}>{k.d}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>,
    );
  }

  if (index === 13) {
    const mapPins = [
      { x: 20, y: 32, t: 'EEPU', c: '#0ea5e9', n: 'Cayenne' },
      { x: 28, y: 28, t: 'EEPU', c: '#0ea5e9' },
      { x: 24, y: 38, t: 'EMPU', c: '#f43f5e' },
      { x: 32, y: 36, t: 'EEPR', c: '#a855f7' },
      { x: 42, y: 30, t: 'EEPU', c: '#0ea5e9', n: 'Rémire' },
      { x: 48, y: 40, t: 'EMPU', c: '#f43f5e' },
      { x: 52, y: 32, t: 'EEPU', c: '#0ea5e9' },
      { x: 58, y: 50, t: 'EEPU', c: '#0ea5e9', n: 'Matoury' },
      { x: 62, y: 58, t: 'EMPU', c: '#f43f5e' },
      { x: 66, y: 46, t: 'EEPR', c: '#a855f7' },
      { x: 72, y: 64, t: 'GS',   c: '#f59e0b' },
      { x: 76, y: 54, t: 'EEPU', c: '#0ea5e9' },
      { x: 84, y: 70, t: 'GS',   c: '#f59e0b', n: 'Roura' },
      { x: 80, y: 82, t: 'EEPU', c: '#0ea5e9' },
      { x: 88, y: 78, t: 'GS',   c: '#f59e0b' },
      { x: 60, y: 78, t: 'EEPR', c: '#a855f7' },
      { x: 70, y: 84, t: 'EMPU', c: '#f43f5e' },
      { x: 50, y: 70, t: 'EEPU', c: '#0ea5e9' },
    ];
    return wrapper(
      <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-md border border-white/30">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold text-zen-text-muted uppercase tracking-widest">Carte interactive · 18 écoles</p>
          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#1e5a78] bg-white/60 px-1.5 py-0.5 rounded-full border border-white/40">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-[#45b8a0] animate-ping opacity-75" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-[#45b8a0]" />
            </span>
            LIVE
          </span>
        </div>

        <div className="relative aspect-[4/3] rounded-xl border border-white/50 overflow-hidden bg-gradient-to-br from-sky-100 via-sky-50 to-emerald-50 shadow-inner">
          {/* Ocean texture */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 75" preserveAspectRatio="xMidYMid slice" fill="none">
            <defs>
              <pattern id="oceanDots" width="3" height="3" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="0.3" fill="#7dd3fc" opacity="0.4" />
              </pattern>
              <linearGradient id="landGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#bbf7d0" />
                <stop offset="100%" stopColor="#86efac" />
              </linearGradient>
            </defs>
            <rect width="100" height="75" fill="url(#oceanDots)" opacity="0.35" />
            {/* Coastline / land mass shape (Cayenne 2 zone abstraction) */}
            <path
              d="M 0 35 Q 8 30 14 28 Q 24 26 30 28 Q 38 30 44 28 L 56 32 Q 68 36 76 44 Q 88 56 96 70 L 100 75 L 0 75 Z"
              fill="url(#landGrad)"
              stroke="#86efac"
              strokeWidth="0.5"
              opacity="0.92"
            />
            {/* Rivers — Mahury / Cayenne / Approuague style */}
            <path d="M 28 28 Q 38 42 50 56 Q 60 66 72 74" stroke="#38bdf8" strokeWidth="0.9" fill="none" opacity="0.75" strokeLinecap="round" />
            <path d="M 60 32 Q 72 50 88 70" stroke="#38bdf8" strokeWidth="0.7" fill="none" opacity="0.6" strokeLinecap="round" />
            {/* Forest texture dots */}
            {Array.from({ length: 32 }).map((_, i) => {
              const seedX = (i * 17) % 90 + 6;
              const seedY = ((i * 31) % 35) + 38;
              return <circle key={i} cx={seedX} cy={seedY} r="0.5" fill="#22c55e" opacity="0.25" />;
            })}
            {/* Grid overlay */}
            <g stroke="rgba(15,90,120,0.08)" strokeWidth="0.2">
              {[20, 40, 60, 80].map((v) => <line key={`h${v}`} x1="0" y1={v * 0.75} x2="100" y2={v * 0.75} />)}
              {[20, 40, 60, 80].map((v) => <line key={`v${v}`} x1={v} y1="0" x2={v} y2="75" />)}
            </g>
          </svg>

          {/* Zone labels */}
          {mapPins.filter((p) => p.n).map((p, i) => (
            <span
              key={`lbl-${i}`}
              className="absolute text-[8px] font-bold text-zen-text/75 tracking-wide pointer-events-none"
              style={{ left: `${p.x + 3}%`, top: `${p.y - 4}%` }}
            >
              {p.n}
            </span>
          ))}

          {/* Pins */}
          {mapPins.map((p, i) => (
            <span
              key={i}
              className="absolute -translate-x-1/2 -translate-y-full"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              title={p.t}
            >
              <svg width="14" height="18" viewBox="0 0 14 18" fill="none" className="drop-shadow-md">
                <path d="M7 0C3.13 0 0 3.13 0 7c0 5.25 7 11 7 11s7-5.75 7-11c0-3.87-3.13-7-7-7z" fill={p.c} stroke="#ffffff" strokeWidth="1.2" />
                <circle cx="7" cy="7" r="2.6" fill="#ffffff" />
              </svg>
            </span>
          ))}

          {/* Compass rose */}
          <svg className="absolute top-1.5 right-1.5 w-7 h-7 drop-shadow-sm" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.85)" stroke="rgba(15,90,120,0.4)" strokeWidth="0.8" />
            <path d="M12 3 L13.5 11 L12 12 L10.5 11 Z" fill="#1e5a78" />
            <path d="M12 21 L13.5 13 L12 12 L10.5 13 Z" fill="#94a3b8" />
            <text x="12" y="6.5" textAnchor="middle" fontSize="3" fill="#1e5a78" fontWeight="bold">N</text>
          </svg>

          {/* Scale bar */}
          <div className="absolute bottom-1.5 left-1.5 flex items-end gap-0.5">
            <div className="text-[8px] font-bold text-zen-text/70 mr-1 tabular-nums">0</div>
            <div className="flex">
              <div className="w-4 h-1 bg-zen-text/70 border border-white" />
              <div className="w-4 h-1 bg-white border border-zen-text/70" />
              <div className="w-4 h-1 bg-zen-text/70 border border-white" />
            </div>
            <div className="text-[8px] font-bold text-zen-text/70 ml-1 tabular-nums">5 km</div>
          </div>

          {/* Mini info chip */}
          <div className="absolute bottom-1.5 right-1.5 bg-white/85 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-[8px] font-bold text-zen-text border border-white/60 shadow-sm">
            CAYENNE 2 · ROURA
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 text-[10px]">
          {[
            { l: 'EEPU · 12', c: '#0ea5e9' },
            { l: 'EMPU · 4', c: '#f43f5e' },
            { l: 'EEPR · 3', c: '#a855f7' },
            { l: 'GS · 3', c: '#f59e0b' },
          ].map((it, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-zen-text-secondary font-medium">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: it.c }} />
              {it.l}
            </span>
          ))}
        </div>
      </div>,
    );
  }

  if (index === 14) {
    return wrapper(
      <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-md border border-white/30">
        <p className="text-[10px] font-semibold text-zen-text-muted uppercase tracking-widest mb-3">Console administration</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { l: 'Utilisateurs', v: '48' },
            { l: 'Sessions', v: '12' },
            { l: 'Imports', v: '5' },
            { l: 'Logs 24 h', v: '1.2 k' },
          ].map((s, i) => (
            <div key={i} className="bg-white/40 rounded-xl p-2.5 border border-white/30">
              <p className="text-[9px] font-bold text-zen-text-muted uppercase tracking-widest">{s.l}</p>
              <p className="text-[18px] font-bold text-zen-text tabular-nums mt-0.5 leading-none">{s.v}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] font-semibold text-zen-text-muted uppercase tracking-widest mb-1.5">Actions rapides</p>
        <div className="flex flex-wrap gap-1.5">
          {['Année scolaire', 'Annuaire', 'Plan formation', 'Sauvegarde'].map((a, i) => (
            <span key={i} className="text-[10px] bg-white/50 px-2.5 py-1 rounded-full border border-white/40 text-zen-text-secondary font-medium">
              {a}
            </span>
          ))}
        </div>
      </div>,
    );
  }

  if (index === 15) {
    return wrapper(
      <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-5 w-full max-w-md border border-white/30">
        <p className="text-[10px] font-semibold text-zen-text-muted uppercase tracking-widest mb-3">Bibliothèque de questionnaires</p>
        <div className="space-y-2">
          {[
            { t: 'Boussole — début formation', q: 24, s: 'En cours', c: 'bg-emerald-100 text-emerald-700' },
            { t: 'Boussole — fin formation', q: 24, s: 'Brouillon', c: 'bg-slate-100 text-slate-600' },
            { t: 'Bilan annuel directeurs', q: 18, s: 'Publié', c: 'bg-sky-100 text-sky-700' },
            { t: 'Plan formation 2027', q: 12, s: 'Brouillon', c: 'bg-slate-100 text-slate-600' },
          ].map((q, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/40 rounded-xl p-2.5 border border-white/30">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-[#45b8a0] flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-zen-text truncate">{q.t}</p>
                <p className="text-[10px] text-zen-text-muted tabular-nums">{q.q} questions</p>
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${q.c}`}>{q.s}</span>
            </div>
          ))}
        </div>
      </div>,
    );
  }

  // Generic preview for all other tabs
  const tab = tabs[index];
  return wrapper(
    <div className="relative z-10 bg-white/60 backdrop-blur-xl rounded-[24px] shadow-glass p-6 w-full max-w-md border border-white/30 text-center">
      <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/50 flex items-center justify-center">
        <svg className="w-7 h-7 text-zen-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      </div>
      <p className="text-[10px] font-semibold text-zen-text-muted uppercase tracking-widest mb-2">{tab?.title}</p>
      <p className="text-[12px] text-zen-text-secondary leading-relaxed">{tab?.desc}</p>
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
