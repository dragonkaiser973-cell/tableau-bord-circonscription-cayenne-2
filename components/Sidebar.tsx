'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  category: 'main' | 'auth' | 'admin' | 'tools';
}

const navItems: NavItem[] = [
  { href: '/ecoles', label: 'Écoles', icon: <SchoolIcon />, category: 'main' },
  { href: '/circonscription', label: 'Circonscription', icon: <GlobeIcon />, category: 'main' },
  { href: '/evaluations', label: 'Évaluations', icon: <ChartBarIcon />, category: 'main' },
  { href: '/enseignants', label: 'Enseignants', icon: <UsersIcon />, category: 'main' },
  { href: '/statistiques', label: 'Statistiques', icon: <PieChartIcon />, category: 'main' },
  { href: '/questionnaires', label: 'Questionnaires', icon: <ClipboardIcon />, category: 'main' },
  { href: '/donnees', label: 'Données', icon: <DatabaseIcon />, category: 'auth', requiresAuth: true },
  { href: '/calendrier', label: 'Calendrier', icon: <CalendarIcon />, category: 'auth', requiresAuth: true },
  { href: '/pilotage', label: 'Pilotage', icon: <DashboardIcon />, category: 'auth', requiresAuth: true },
  { href: '/carte', label: 'Carte', icon: <MapIcon />, category: 'auth', requiresAuth: true },
  { href: '/archives', label: 'Archives', icon: <ArchiveIcon />, category: 'auth', requiresAuth: true },
  { href: '/admin', label: 'Administration', icon: <ShieldIcon />, category: 'admin', requiresAdmin: true },
  { href: '/questionnaires/admin', label: 'Gérer questionnaires', icon: <SettingsIcon />, category: 'admin', requiresAdmin: true },
  { href: '/analyse-classe', label: 'Analyse classe', icon: <MicroscopeIcon />, category: 'tools' },
  { href: '/aide-analyse-classe', label: 'Guide', icon: <BookIcon />, category: 'tools' },
];

const categoryLabels: Record<string, string> = {
  main: 'Navigation',
  auth: 'Espace réservé',
  admin: 'Administration',
  tools: 'Outils',
};

export default function Sidebar() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole') || '';
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
          const payload = JSON.parse(atob(padded));
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp > now) {
            setIsAuthenticated(true);
            setUserRole(role);
          }
        }
      } catch {
        // Invalid token
      }
    }
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const filteredItems = navItems.filter(item => {
    if (item.requiresAdmin && (!isAuthenticated || userRole !== 'admin')) return false;
    if (item.requiresAuth && !isAuthenticated) return false;
    return true;
  });

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  // Ne pas afficher la sidebar sur la page d'accueil
  if (pathname === '/') return null;

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white rounded-dock shadow-dock flex items-center justify-center text-zen-text-secondary hover:text-zen-text transition-colors"
        aria-label="Menu"
      >
        {isMobileOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 bg-white border-r border-zen-border transition-all duration-300 flex flex-col
          ${isCollapsed ? 'w-[72px]' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo area */}
        <div className="p-4 border-b border-zen-border">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/logo-circonscription.png"
              alt="Logo"
              width={36}
              height={36}
              className="rounded-lg flex-shrink-0 group-hover:shadow-md transition-shadow duration-300"
            />
            {!isCollapsed && (
              <div className="overflow-hidden">
                <p className="font-serif font-medium text-zen-text text-sm leading-tight truncate">Cayenne 2</p>
                <p className="text-zen-text-muted text-xs truncate">Tableau de bord</p>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {['main', 'auth', 'admin', 'tools'].map(category => {
            const items = groupedItems[category];
            if (!items || items.length === 0) return null;
            return (
              <div key={category} className="mb-6">
                {!isCollapsed && (
                  <p className="text-[10px] uppercase tracking-[0.12em] font-medium text-zen-text-muted px-3 mb-2">
                    {categoryLabels[category]}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {items.map(item => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                            ${isActive
                              ? 'bg-zen-accent text-white font-medium'
                              : 'text-zen-text-secondary hover:bg-zen-bg hover:text-zen-text font-normal'
                            }
                            ${isCollapsed ? 'justify-center' : ''}
                          `}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <span className={`flex-shrink-0 w-5 h-5 transition-all duration-200
                            ${isActive ? 'text-white' : 'text-zen-text-muted group-hover:text-zen-text-secondary group-hover:scale-110'}
                          `}>
                            {item.icon}
                          </span>

                          {!isCollapsed && (
                            <span className={`truncate transition-all duration-200 ${isActive ? '' : 'group-hover:translate-x-0.5'}`}>
                              {item.label}
                            </span>
                          )}

                          {/* Tooltip collapsed */}
                          {isCollapsed && (
                            <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-zen-accent text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
                              {item.label}
                            </div>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="hidden lg:block p-3 border-t border-zen-border">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-zen-text-muted hover:bg-zen-bg hover:text-zen-text-secondary transition-all duration-200 text-sm"
            title={isCollapsed ? 'Déplier' : 'Replier'}
          >
            <span className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
              <ChevronLeftIcon />
            </span>
            {!isCollapsed && <span>Replier</span>}
          </button>
        </div>
      </aside>

      {/* Spacer */}
      <div className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'w-[72px]' : 'w-64'}`} />
    </>
  );
}

// ─── SVG Icons ───

function SchoolIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16" /></svg>;
}
function GlobeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>;
}
function ChartBarIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6" /></svg>;
}
function UsersIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>;
}
function PieChartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 118 2.83M22 12A10 10 0 0012 2v10z" /></svg>;
}
function ClipboardIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>;
}
function DatabaseIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>;
}
function CalendarIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
}
function DashboardIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10M18 20V4M6 20v-4" /></svg>;
}
function MapIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16" /></svg>;
}
function ArchiveIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" /></svg>;
}
function ShieldIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}
function SettingsIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>;
}
function MicroscopeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18h8M3 22h18M14 22a7 7 0 100-14h-1M9 14h2M9 12a2 2 0 01-2-2V6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2z" /></svg>;
}
function BookIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>;
}
function MenuIcon() {
  return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18" /></svg>;
}
function CloseIcon() {
  return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>;
}
function ChevronLeftIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>;
}
