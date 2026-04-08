'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';

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
  const heroRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);

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

  // ─── Scroll: dock + parallax + reveal ───
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setDockScrolled(scrollY > 60);

      // Parallax hero
      if (heroRef.current && heroContentRef.current && mockupRef.current) {
        const heroBottom = heroRef.current.offsetTop + heroRef.current.offsetHeight;
        if (scrollY < heroBottom) {
          heroContentRef.current.style.transform = `translateY(${scrollY * 0.08}px)`;
          mockupRef.current.style.transform = `translateY(${scrollY * -0.12}px)`;
        }
      }
    };

    // Scroll reveal
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      revealObserver.disconnect();
    };
  }, []);

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
      label: 'Accompagnement',
      sub: 'Suivi terrain',
      title: 'Accompagnement',
      desc: 'Suivez et soutenez chaque enseignant dans sa pratique quotidienne grâce à des outils clairs et adaptés au terrain guyanais.',
      btn: 'Voir nos actions',
      href: '/ecoles',
    },
    {
      label: 'Ressources',
      sub: 'Pédagogie',
      title: 'Ressources',
      desc: 'Accédez à toutes les ressources pédagogiques de la circonscription en un clic. Fiches, séquences, outils pour la classe.',
      btn: 'Explorer',
      href: '/statistiques',
    },
    {
      label: 'Évaluations',
      sub: 'Résultats',
      title: 'Évaluations',
      desc: 'Suivez les résultats des élèves et pilotez la réussite avec des données précises. Évaluations nationales CP, CE1 et plus.',
      btn: 'Voir les résultats',
      href: '/evaluations',
    },
    {
      label: 'Communication',
      sub: 'Équipes',
      title: 'Communication',
      desc: 'Connectez votre circonscription à tous les acteurs de l\'éducation. Agenda, réunions, informations en temps réel.',
      btn: 'En savoir plus',
      href: '/circonscription',
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
            <button onClick={handleLogout} className="hover:text-zen-text transition-colors">
              Déconnexion
            </button>
          ) : (
            <button onClick={() => setShowLoginModal(true)} className="hover:text-zen-text transition-colors">
              Connexion
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          CARTE HERO (floating card)
          ═══════════════════════════════════════════ */}
      <div className="px-3 sm:px-6 pb-6">
        <div
          ref={heroRef}
          className="relative overflow-hidden rounded-card"
          style={{ background: 'linear-gradient(180deg, #C8DDE8 0%, #D4E8D0 60%, #B8D4A8 100%)' }}
        >

          {/* ─── Dock glassmorphism ─── */}
          <div className={`anim-dock sticky top-0 z-50 px-4 sm:px-8 py-4`}>
            <div className={`nav-dock ${dockScrolled ? 'scrolled' : ''} rounded-dock max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between`}>
              {/* Logo */}
              <div className="flex items-center gap-2.5">
                <Image
                  src="/logo-circonscription.png"
                  alt="Logo"
                  width={28}
                  height={28}
                  className="rounded-lg"
                />
                <span className="font-medium text-zen-text text-sm hidden sm:inline">Circonscription</span>
              </div>

              {/* Dock central — pill noir avec icônes */}
              <div className="flex items-center bg-zen-accent rounded-full px-1.5 py-1.5 gap-0.5">
                <DockIcon href="#hero" icon={<IconHome />} label="Accueil" active />
                <DockIcon href="#features" icon={<IconBook />} label="Ressources" />
                <DockIcon href="#services" icon={<IconCalendar />} label="Agenda" />
                <DockIcon href="#footer" icon={<IconMail />} label="Contact" />
                {isAuthenticated && <DockIcon href="#auth-section" icon={<IconUser />} label="Espace" />}
              </div>

              {/* CTA droit */}
              <Link href="/questionnaires" className="btn-secondary-zen text-sm hidden sm:inline-block">
                Questionnaires
              </Link>
              <Link href="/questionnaires" className="sm:hidden text-zen-text-secondary text-sm">
                <IconClip />
              </Link>
            </div>
          </div>

          {/* ─── Hero content ─── */}
          <div id="hero" className="relative px-6 sm:px-12 pt-8 sm:pt-16 pb-48 sm:pb-64 text-center">
            <div ref={heroContentRef}>
              {/* Badge */}
              <div className="anim-badge inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-white/50 rounded-full px-4 py-2 text-sm text-zen-text-secondary mb-8">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Académie de Guyane · Circonscription Cayenne 2
              </div>

              {/* Titre */}
              <h1 className="anim-title font-serif text-[clamp(2.8rem,6vw,5rem)] font-bold leading-[1.1] text-zen-text mb-8 max-w-3xl mx-auto">
                L&apos;École au cœur<br />de la Guyane.<br />
                <span className="text-zen-text-secondary">Réussir ensemble.</span>
              </h1>

              {/* CTA */}
              <div className="anim-cta flex flex-col sm:flex-row items-center justify-center gap-4">
                <button onClick={() => setShowLoginModal(true)} className="btn-primary-zen">
                  Nous contacter
                </button>
                <Link href="/ecoles" className="btn-secondary-zen">
                  Explorer la circonscription
                </Link>
              </div>
            </div>

            {/* ─── Mockup flottant ─── */}
            <div
              ref={mockupRef}
              className="anim-mockup absolute left-1/2 -translate-x-1/2 bottom-[-80px] sm:bottom-[-60px] w-[90%] max-w-3xl"
            >
              <div className="bg-white rounded-2xl shadow-mockup p-4 sm:p-6 animate-levitate">
                {/* Faux dashboard */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <span className="text-xs text-zen-text-muted font-medium">Suivi de circonscription</span>
                  <div className="flex items-center gap-1.5 text-xs text-zen-text-muted">
                    <span className="bg-zen-bg px-2 py-0.5 rounded-full">23 écoles</span>
                    <span className="bg-zen-bg px-2 py-0.5 rounded-full">450 enseignants</span>
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
                      <tr className="border-b border-zen-border/50">
                        <td className="py-2.5 font-medium">Cayenne Nord A</td>
                        <td className="py-2.5">12</td>
                        <td className="py-2.5">287</td>
                        <td className="py-2.5"><span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">À jour</span></td>
                      </tr>
                      <tr className="border-b border-zen-border/50">
                        <td className="py-2.5 font-medium">Roura Centre</td>
                        <td className="py-2.5">8</td>
                        <td className="py-2.5">194</td>
                        <td className="py-2.5"><span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">En cours</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-medium">Rémire-Montjoly B</td>
                        <td className="py-2.5">15</td>
                        <td className="py-2.5">342</td>
                        <td className="py-2.5"><span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">À jour</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          SECTION FEATURES — Onglets interactifs
          ═══════════════════════════════════════════ */}
      <section id="features" className="px-3 sm:px-6 py-20 sm:py-32">
        <div className="max-w-6xl mx-auto">
          {/* Titre section */}
          <div className="reveal text-center mb-6 max-w-2xl mx-auto px-6 py-10 bg-white rounded-card border border-zen-border">
            <h2 className="font-serif text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.15] text-zen-text">
              Accompagner chaque enseignant,<br />agir avec clarté
            </h2>
          </div>

          {/* Onglets */}
          <div className="reveal mt-16">
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
            <div className="grid lg:grid-cols-2 gap-8 items-start min-h-[350px]">
              {/* Texte gauche */}
              <div className="flex flex-col justify-end pt-8 lg:pt-32" key={activeTab}>
                <h3
                  className="font-serif text-[clamp(2rem,4vw,3.2rem)] font-medium text-zen-text mb-4"
                  style={{ animation: 'fadeSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both' }}
                >
                  {featureTabs[activeTab].title}
                </h3>
                <p
                  className="text-zen-text-secondary leading-relaxed mb-6 max-w-md"
                  style={{ animation: 'fadeSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.08s both' }}
                >
                  {featureTabs[activeTab].desc}
                </p>
                <div style={{ animation: 'fadeSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.16s both' }}>
                  <Link href={featureTabs[activeTab].href} className="btn-primary-zen inline-block">
                    {featureTabs[activeTab].btn}
                  </Link>
                </div>
              </div>

              {/* Mockup droite */}
              <div
                key={`mockup-${activeTab}`}
                className="relative rounded-card overflow-hidden border border-zen-border bg-gradient-to-b from-zen-hero-top/30 to-zen-hero-mid/20 min-h-[350px]"
                style={{ animation: 'fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both' }}
              >
                <FeatureMockup index={activeTab} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          BENTO GRID — Services de la Circonscription
          ═══════════════════════════════════════════ */}
      <section id="services" className="px-3 sm:px-6 pb-20 sm:pb-32">
        <div className="max-w-6xl mx-auto">
          <div className="reveal text-center mb-12">
            <h2 className="font-serif text-[clamp(1.8rem,3vw,2.8rem)] font-medium text-zen-text">
              Tous vos services, en un lieu
            </h2>
          </div>

          <div className="stagger-group grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr"
               style={{ gridTemplateRows: 'repeat(2, minmax(200px, 1fr))' }}>
            {/* Card 1 — grande */}
            <Link href={isAuthenticated ? '/calendrier' : '#'} onClick={!isAuthenticated ? (e) => { e.preventDefault(); setShowLoginModal(true); } : undefined} className="reveal sm:row-span-2">
              <div className="bento-card h-full flex flex-col justify-between bg-gradient-to-b from-zen-hero-top/20 to-white">
                <div>
                  <span className="card-icon text-3xl inline-block mb-4">📅</span>
                  <h3 className="font-serif text-xl font-medium text-zen-text mb-2">Agenda &amp; Permanences</h3>
                  <p className="text-zen-text-secondary text-sm leading-relaxed">Retrouvez les dates des permanences IEN et les rendez-vous importants de la circonscription.</p>
                </div>
                <div className="mt-6 text-zen-text-muted text-xs font-medium">
                  {isAuthenticated ? 'Accès réservé →' : 'Connexion requise →'}
                </div>
              </div>
            </Link>

            {/* Card 2 */}
            <Link href="/circonscription" className="reveal">
              <div className="bento-card h-full">
                <span className="card-icon text-3xl inline-block mb-4">📰</span>
                <h3 className="font-serif text-lg font-medium text-zen-text mb-2">Actualités</h3>
                <p className="text-zen-text-secondary text-sm leading-relaxed">Les dernières informations de la circonscription et de l&apos;académie.</p>
              </div>
            </Link>

            {/* Card 3 */}
            <Link href="/statistiques" className="reveal">
              <div className="bento-card h-full">
                <span className="card-icon text-3xl inline-block mb-4">📚</span>
                <h3 className="font-serif text-lg font-medium text-zen-text mb-2">Ressources pédagogiques</h3>
                <p className="text-zen-text-secondary text-sm leading-relaxed">Fiches, séquences et outils pour votre classe.</p>
              </div>
            </Link>

            {/* Card 4 */}
            <Link href="/questionnaires" className="reveal">
              <div className="bento-card h-full">
                <span className="card-icon text-3xl inline-block mb-4">✉️</span>
                <h3 className="font-serif text-lg font-medium text-zen-text mb-2">Contacter l&apos;IEN</h3>
                <p className="text-zen-text-secondary text-sm leading-relaxed">Une question ? Écrivez-nous directement via les questionnaires.</p>
              </div>
            </Link>

            {/* Card 5 */}
            <Link href="/evaluations" className="reveal">
              <div className="bento-card h-full bg-gradient-to-b from-zen-hero-mid/15 to-white">
                <span className="card-icon text-3xl inline-block mb-4">📊</span>
                <h3 className="font-serif text-lg font-medium text-zen-text mb-2">Résultats &amp; Évaluations</h3>
                <p className="text-zen-text-secondary text-sm leading-relaxed">Tableaux de bord des évaluations nationales. Analyses détaillées par école.</p>
              </div>
            </Link>
          </div>

          {/* Section authentifiée */}
          {isAuthenticated && (
            <div id="auth-section" className="mt-16">
              <div className="reveal flex items-center gap-4 mb-8">
                <div className="h-px flex-1 bg-zen-border" />
                <span className="text-xs tracking-[0.15em] uppercase font-medium text-zen-text-muted">Espace réservé</span>
                <div className="h-px flex-1 bg-zen-border" />
              </div>
              <div className="stagger-group grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link href="/donnees" className="reveal">
                  <div className="bento-card h-full">
                    <span className="card-icon text-3xl inline-block mb-4">💾</span>
                    <h3 className="font-serif text-lg font-medium text-zen-text mb-2">Données</h3>
                    <p className="text-zen-text-secondary text-sm">Importation et gestion des données scolaires.</p>
                  </div>
                </Link>
                <Link href="/pilotage" className="reveal">
                  <div className="bento-card h-full">
                    <span className="card-icon text-3xl inline-block mb-4">📈</span>
                    <h3 className="font-serif text-lg font-medium text-zen-text mb-2">Pilotage</h3>
                    <p className="text-zen-text-secondary text-sm">Indicateurs clés et tableaux de bord dynamiques.</p>
                  </div>
                </Link>
                <Link href="/carte" className="reveal">
                  <div className="bento-card h-full">
                    <span className="card-icon text-3xl inline-block mb-4">🗺️</span>
                    <h3 className="font-serif text-lg font-medium text-zen-text mb-2">Carte</h3>
                    <p className="text-zen-text-secondary text-sm">Localisation géographique des écoles.</p>
                  </div>
                </Link>
                <Link href="/archives" className="reveal">
                  <div className="bento-card h-full">
                    <span className="card-icon text-3xl inline-block mb-4">📚</span>
                    <h3 className="font-serif text-lg font-medium text-zen-text mb-2">Archives</h3>
                    <p className="text-zen-text-secondary text-sm">Consultation des années scolaires passées.</p>
                  </div>
                </Link>
                <Link href="/analyse-classe" className="reveal">
                  <div className="bento-card h-full">
                    <span className="card-icon text-3xl inline-block mb-4">🔬</span>
                    <h3 className="font-serif text-lg font-medium text-zen-text mb-2">Analyse classe</h3>
                    <p className="text-zen-text-secondary text-sm">Analyser les évaluations nationales d&apos;une classe.</p>
                  </div>
                </Link>
                {userRole === 'admin' && (
                  <>
                    <Link href="/admin" className="reveal">
                      <div className="bento-card h-full border-purple-200 bg-gradient-to-b from-purple-50/50 to-white">
                        <span className="card-icon text-3xl inline-block mb-4">👑</span>
                        <h3 className="font-serif text-lg font-medium text-zen-text mb-2">Administration</h3>
                        <p className="text-zen-text-secondary text-sm">Gestion des utilisateurs et des archives.</p>
                      </div>
                    </Link>
                    <Link href="/questionnaires/admin" className="reveal">
                      <div className="bento-card h-full border-purple-200 bg-gradient-to-b from-purple-50/50 to-white">
                        <span className="card-icon text-3xl inline-block mb-4">⚙️</span>
                        <h3 className="font-serif text-lg font-medium text-zen-text mb-2">Gérer questionnaires</h3>
                        <p className="text-zen-text-secondary text-sm">Créer, modifier et consulter les résultats.</p>
                      </div>
                    </Link>
                  </>
                )}
              </div>
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
              <Link href="/aide-analyse-classe" className="hover:text-zen-text transition-colors">Guide d&apos;utilisation</Link>
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
          MODAL DE CONNEXION
          ═══════════════════════════════════════════ */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setShowLoginModal(false)}>
          <div
            className="bg-white rounded-card p-8 max-w-md w-full shadow-2xl"
            style={{ animation: 'fadeSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' }}
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
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6 text-sm">
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
                  className="w-full px-4 py-3 bg-zen-bg border border-zen-border rounded-2xl focus:outline-none focus:border-zen-text transition-colors text-zen-text placeholder-zen-text-muted"
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
                    className="w-full px-4 py-3 pr-12 bg-zen-bg border border-zen-border rounded-2xl focus:outline-none focus:border-zen-text transition-colors text-zen-text placeholder-zen-text-muted"
                    placeholder="Entrez votre mot de passe"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zen-text-muted hover:text-zen-text transition-colors p-1 text-sm"
                  >
                    {showPassword ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary-zen w-full flex items-center justify-center gap-2 disabled:opacity-50">
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          </div>
        </div>
      )}
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
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-opacity duration-200 ${
        active ? 'bg-white/20 animate-icon-pulse' : 'opacity-60 hover:opacity-100'
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
    // Accompagnement — mockup messagerie IEN/enseignant
    return (
      <div className="p-6 sm:p-8">
        <div className="bg-white rounded-2xl shadow-lg p-5 max-w-sm mx-auto mt-8">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zen-border">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-700">IEN</div>
            <div>
              <p className="text-sm font-medium text-zen-text">Inspection</p>
              <p className="text-xs text-zen-text-muted">En ligne</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="bg-zen-bg rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-zen-text max-w-[80%]">
              Bonjour, comment s&apos;est passée votre visite de classe ?
            </div>
            <div className="bg-primary-500 text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm ml-auto max-w-[80%]">
              Très bien, les élèves étaient engagés dans l&apos;activité.
            </div>
            <div className="bg-zen-bg rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-zen-text max-w-[80%]">
              Parfait ! Je vous envoie le compte-rendu. ✅
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (index === 1) {
    // Ressources — grille de cartes
    return (
      <div className="p-6 sm:p-8">
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mt-8">
          {['Français CP', 'Maths CE1', 'Sciences CM1', 'EMC Cycle 3', 'Arts visuels', 'EPS'].map((r, i) => (
            <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-zen-border/60 text-center">
              <div className="text-2xl mb-1">{['📖','🔢','🔬','🤝','🎨','⚽'][i]}</div>
              <p className="text-xs font-medium text-zen-text">{r}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (index === 2) {
    // Évaluations — tableau de résultats
    return (
      <div className="p-6 sm:p-8">
        <div className="bg-white rounded-2xl shadow-lg p-4 max-w-sm mx-auto mt-8">
          <p className="text-xs font-medium text-zen-text-muted uppercase tracking-wider mb-3">Évaluations nationales CP — Français</p>
          <div className="space-y-2.5">
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
                <div className="h-1.5 bg-zen-bg rounded-full overflow-hidden">
                  <div className={`h-full ${r.color} rounded-full`} style={{ width: `${r.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  // Communication — intégrations
  return (
    <div className="p-6 sm:p-8">
      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mt-8">
        {[
          { name: 'Messagerie', sub: 'Académique', icon: '✉️' },
          { name: 'ENT', sub: 'Guyane', icon: '🖥️' },
          { name: 'ONDE', sub: 'Base élèves', icon: '📋' },
          { name: 'LSU', sub: 'Livret scolaire', icon: '📝' },
          { name: 'Eduscol', sub: 'Ressources', icon: '🏛️' },
          { name: 'BRNE', sub: 'Numérique', icon: '💻' },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl p-3.5 shadow-sm border border-zen-border/60 flex items-center gap-3">
            <span className="text-xl">{item.icon}</span>
            <div>
              <p className="text-sm font-medium text-zen-text">{item.name}</p>
              <p className="text-xs text-zen-text-muted">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════
   ICÔNES SVG (dock navigation)
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
