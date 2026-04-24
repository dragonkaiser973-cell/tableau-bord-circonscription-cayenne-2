'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import AuroraHeader from '@/components/AuroraHeader';
import StatPill from '@/components/StatPill';

type Tel = { type: 'fixe' | 'mobile'; number: string };

type CircoRow = {
  id: string;
  role: string;
  role_long: string;
  name: string;
  email: string | null;
  tels: Tel[];
  accent: string;
  icon_key: 'star' | 'folder' | 'compass' | 'activity' | 'chip';
  ordre: number;
};

type EcoleRow = {
  id: string;
  name: string;
  type: 'EEPU' | 'EMPU' | 'EEPR' | 'GS' | null;
  ordre: number;
};

type DirectionRow = {
  id: string;
  ecole_id: string;
  name: string;
  role: string | null;
  email: string | null;
  tels: Tel[];
  ordre: number;
};

const ACCENT_OPTIONS = [
  { value: 'from-amber-400 via-orange-400 to-rose-500', label: 'Ambre' },
  { value: 'from-sky-400 via-cyan-400 to-teal-400',     label: 'Ciel' },
  { value: 'from-violet-400 via-fuchsia-400 to-pink-400', label: 'Violet' },
  { value: 'from-emerald-400 via-teal-400 to-cyan-400', label: 'Émeraude' },
  { value: 'from-rose-400 via-pink-400 to-fuchsia-400', label: 'Rose' },
  { value: 'from-indigo-400 via-blue-500 to-cyan-400',  label: 'Indigo' },
  { value: 'from-lime-400 via-green-400 to-emerald-500',label: 'Vert' },
  { value: 'from-slate-500 via-slate-600 to-slate-700', label: 'Graphite' },
];

const ICON_OPTIONS: { value: CircoRow['icon_key']; label: string }[] = [
  { value: 'star',     label: 'Étoile' },
  { value: 'folder',   label: 'Dossier' },
  { value: 'compass',  label: 'Boussole' },
  { value: 'activity', label: 'Activité' },
  { value: 'chip',     label: 'Puce' },
];

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '',     label: '— Aucun —' },
  { value: 'EEPU', label: 'EEPU · Élémentaire publique' },
  { value: 'EMPU', label: 'EMPU · Maternelle publique' },
  { value: 'EEPR', label: 'EEPR · Élémentaire privée' },
  { value: 'GS',   label: 'GS · Groupe scolaire' },
];

const TYPE_META: Record<string, { label: string; gradient: string; tint: string; text: string }> = {
  EEPU: { label: 'Élémentaire publique', gradient: 'from-sky-500 to-cyan-500',        tint: 'bg-sky-50',    text: 'text-sky-700' },
  EMPU: { label: 'Maternelle publique',  gradient: 'from-rose-400 to-pink-500',       tint: 'bg-rose-50',   text: 'text-rose-700' },
  EEPR: { label: 'Élémentaire privée',   gradient: 'from-violet-500 to-fuchsia-500',  tint: 'bg-violet-50', text: 'text-violet-700' },
  GS:   { label: 'Groupe scolaire',      gradient: 'from-amber-400 to-orange-500',    tint: 'bg-amber-50',  text: 'text-amber-700' },
};

function initials(name: string) {
  const clean = name.replace(/\b(M\.|Mme\.?|Mr\.?|Mrs\.?)\b/gi, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function AdminAnnuairePage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [circo, setCirco] = useState<CircoRow[]>([]);
  const [ecoles, setEcoles] = useState<EcoleRow[]>([]);
  const [directions, setDirections] = useState<DirectionRow[]>([]);

  const [tab, setTab] = useState<'circo' | 'ecoles'>('circo');
  const [query, setQuery] = useState('');
  const [expandedEcole, setExpandedEcole] = useState<string | null>(null);

  const [circoModal, setCircoModal] = useState<CircoRow | null>(null);
  const [ecoleModal, setEcoleModal] = useState<EcoleRow | null>(null);
  const [dirModal, setDirModal] = useState<{ row: DirectionRow | null; ecoleId: string }>({ row: null, ecoleId: '' });

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole');
    if (!token || userRole !== 'admin') {
      router.push('/');
      return;
    }
    setIsAdmin(true);
    loadAll();
  }, [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && !circoModal && !ecoleModal && !dirModal.row) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (circoModal) setCircoModal(null);
        else if (ecoleModal) setEcoleModal(null);
        else if (dirModal.row) setDirModal({ row: null, ecoleId: '' });
        else setQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [circoModal, ecoleModal, dirModal]);

  const notify = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 2600);
  };

  const authHeaders = (extra: Record<string, string> = {}) => {
    const token = localStorage.getItem('authToken') || '';
    return { 'Authorization': `Bearer ${token}`, ...extra };
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [c, e, d] = await Promise.all([
        fetch('/api/admin/annuaire/circo', { headers: authHeaders() }).then(r => r.json()),
        fetch('/api/admin/annuaire/ecoles', { headers: authHeaders() }).then(r => r.json()),
        fetch('/api/admin/annuaire/directions', { headers: authHeaders() }).then(r => r.json()),
      ]);
      setCirco(Array.isArray(c) ? c : []);
      setEcoles(Array.isArray(e) ? e : []);
      setDirections(Array.isArray(d) ? d : []);
    } catch (err: any) {
      notify('error', 'Chargement impossible : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── CIRCO ─────────────────────────────────────────
  const openCircoModal = (row?: CircoRow) => {
    setCircoModal(row ? { ...row, tels: [...row.tels] } : {
      id: '', role: '', role_long: '', name: '', email: '',
      tels: [{ type: 'fixe', number: '' }],
      accent: ACCENT_OPTIONS[0].value, icon_key: 'folder',
      ordre: (circo.length ? Math.max(...circo.map(c => c.ordre)) + 1 : 1),
    });
  };

  const saveCirco = async () => {
    if (!circoModal) return;
    const body: any = {
      role: circoModal.role.trim(),
      role_long: circoModal.role_long.trim(),
      name: circoModal.name.trim(),
      email: circoModal.email?.trim() || null,
      tels: circoModal.tels.filter(t => t.number.trim()),
      accent: circoModal.accent,
      icon_key: circoModal.icon_key,
      ordre: Number(circoModal.ordre) || 0,
    };
    if (!body.role || !body.role_long || !body.name) {
      notify('error', 'Rôle, rôle complet et nom sont requis.');
      return;
    }
    try {
      const isEdit = !!circoModal.id;
      if (isEdit) body.id = circoModal.id;
      const res = await fetch('/api/admin/annuaire/circo', {
        method: isEdit ? 'PUT' : 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
      notify('success', isEdit ? 'Membre mis à jour' : 'Membre ajouté');
      setCircoModal(null);
      loadAll();
    } catch (e: any) { notify('error', e.message); }
  };

  const deleteCirco = async (id: string) => {
    if (!confirm('Supprimer ce membre de la circonscription ?')) return;
    try {
      const res = await fetch(`/api/admin/annuaire/circo?id=${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
      notify('success', 'Membre supprimé');
      loadAll();
    } catch (e: any) { notify('error', e.message); }
  };

  // ─── ECOLES ────────────────────────────────────────
  const openEcoleModal = (row?: EcoleRow) => {
    setEcoleModal(row ? { ...row } : {
      id: '', name: '', type: null,
      ordre: (ecoles.length ? Math.max(...ecoles.map(e => e.ordre)) + 1 : 1),
    });
  };

  const saveEcole = async () => {
    if (!ecoleModal) return;
    const body: any = {
      name: ecoleModal.name.trim(),
      type: ecoleModal.type || null,
      ordre: Number(ecoleModal.ordre) || 0,
    };
    if (!body.name) { notify('error', 'Le nom est obligatoire'); return; }
    try {
      const isEdit = !!ecoleModal.id;
      if (isEdit) body.id = ecoleModal.id;
      const res = await fetch('/api/admin/annuaire/ecoles', {
        method: isEdit ? 'PUT' : 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
      notify('success', isEdit ? 'École mise à jour' : 'École ajoutée');
      setEcoleModal(null);
      loadAll();
    } catch (e: any) { notify('error', e.message); }
  };

  const deleteEcole = async (id: string) => {
    const ecole = ecoles.find(e => e.id === id);
    const nbDir = directions.filter(d => d.ecole_id === id).length;
    if (!confirm(`Supprimer "${ecole?.name}" et ses ${nbDir} direction(s) ?`)) return;
    try {
      const res = await fetch(`/api/admin/annuaire/ecoles?id=${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
      notify('success', 'École supprimée');
      loadAll();
    } catch (e: any) { notify('error', e.message); }
  };

  // ─── DIRECTIONS ────────────────────────────────────
  const openDirModal = (ecoleId: string, row?: DirectionRow) => {
    const existing = directions.filter(d => d.ecole_id === ecoleId);
    setDirModal({
      ecoleId,
      row: row ? { ...row, tels: [...row.tels] } : {
        id: '', ecole_id: ecoleId, name: '', role: '', email: '',
        tels: [{ type: 'fixe', number: '' }],
        ordre: existing.length ? Math.max(...existing.map(d => d.ordre)) + 1 : 1,
      },
    });
  };

  const saveDir = async () => {
    if (!dirModal.row) return;
    const r = dirModal.row;
    const body: any = {
      ecole_id: r.ecole_id,
      name: r.name.trim(),
      role: r.role?.trim() || null,
      email: r.email?.trim() || null,
      tels: r.tels.filter(t => t.number.trim()),
      ordre: Number(r.ordre) || 0,
    };
    if (!body.name) { notify('error', 'Le nom est obligatoire'); return; }
    try {
      const isEdit = !!r.id;
      if (isEdit) body.id = r.id;
      const res = await fetch('/api/admin/annuaire/directions', {
        method: isEdit ? 'PUT' : 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
      notify('success', isEdit ? 'Direction mise à jour' : 'Direction ajoutée');
      setDirModal({ row: null, ecoleId: '' });
      loadAll();
    } catch (e: any) { notify('error', e.message); }
  };

  const deleteDir = async (id: string) => {
    if (!confirm('Supprimer cette direction ?')) return;
    try {
      const res = await fetch(`/api/admin/annuaire/directions?id=${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
      notify('success', 'Direction supprimée');
      loadAll();
    } catch (e: any) { notify('error', e.message); }
  };

  const filteredCirco = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...circo].sort((a, b) => a.ordre - b.ordre);
    return circo.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      c.role_long.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false)
    ).sort((a, b) => a.ordre - b.ordre);
  }, [query, circo]);

  const filteredEcoles = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...ecoles].sort((a, b) => a.ordre - b.ordre);
    if (!q) return sorted;
    return sorted.filter(e => {
      const dirs = directions.filter(d => d.ecole_id === e.id);
      return (
        e.name.toLowerCase().includes(q) ||
        (e.type?.toLowerCase().includes(q) ?? false) ||
        dirs.some(d => d.name.toLowerCase().includes(q) || (d.email?.toLowerCase().includes(q) ?? false))
      );
    });
  }, [query, ecoles, directions]);

  if (!isAdmin) return null;

  return (
    <div className="min-h-[100dvh] bg-slate-50 font-[Outfit,system-ui,sans-serif] text-slate-900 antialiased overflow-x-hidden">
      <AuroraHeader
        kicker="Administration"
        title="Gérer"
        titleAccent="l'annuaire."
        subtitle="Équipe de circonscription, écoles et directions. Données diffusées sur l'annuaire public."
        backHref="/outils/annuaire"
        backLabel="Voir l'annuaire public"
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <StatPill value={circo.length}      label="Équipe circo"  gradient="from-amber-400 via-orange-400 to-rose-500" />
          <StatPill value={ecoles.length}     label="Écoles"        gradient="from-sky-400 via-cyan-400 to-teal-400" />
          <StatPill value={directions.length} label="Directions"    gradient="from-violet-400 via-fuchsia-400 to-pink-400" />
        </div>

        {/* Search */}
        <div className="mt-8 max-w-2xl">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-[#45b8a0] via-cyan-400 to-sky-400 rounded-2xl opacity-30 blur-lg group-focus-within:opacity-70 transition-opacity duration-500" />
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 group-focus-within:text-[#45b8a0] transition-colors"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un membre, une école, une direction…"
                className="w-full h-12 pl-11 pr-24 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white placeholder-white/50 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all duration-300"
                aria-label="Rechercher dans l'annuaire"
              />
              {query ? (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center px-3 h-8 text-xs font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-all active:scale-95 cursor-pointer"
                >
                  Effacer
                </button>
              ) : (
                <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center px-2 py-1 text-[10px] font-mono font-semibold text-white/70 bg-white/10 border border-white/20 rounded-md">
                  /
                </kbd>
              )}
            </div>
          </div>
        </div>
      </AuroraHeader>

      <main className="max-w-[1400px] mx-auto px-6 md:px-10 py-12 md:py-16 relative -mt-10">

        {/* Segmented tab control */}
        <div className="flex items-center justify-between gap-4 flex-wrap mb-10">
          <div className="relative inline-flex p-1 bg-white border border-slate-200 rounded-2xl shadow-[0_1px_0_rgba(15,23,42,0.02),0_12px_32px_-20px_rgba(15,23,42,0.15)]">
            {(['circo', 'ecoles'] as const).map((t) => {
              const isActive = tab === t;
              const label = t === 'circo' ? 'Équipe circonscription' : 'Écoles & directions';
              const count = t === 'circo' ? circo.length : ecoles.length;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`relative inline-flex items-center gap-2.5 px-5 h-11 text-sm font-semibold rounded-xl transition-colors cursor-pointer ${
                    isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="tab-bg"
                      className="absolute inset-0 bg-gradient-to-br from-[#1e5a78] via-[#2d8ba8] to-[#45b8a0] rounded-xl shadow-[0_8px_20px_-8px_rgba(45,139,168,0.5)]"
                      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    />
                  )}
                  <span className="relative">{label}</span>
                  <span
                    className={`relative tabular-nums font-mono text-[11px] px-1.5 py-0.5 rounded-md ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => tab === 'circo' ? openCircoModal() : openEcoleModal()}
            className="group inline-flex items-center gap-2 pl-4 pr-5 h-11 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-[0_8px_20px_-8px_rgba(15,23,42,0.35)] transition-all active:translate-y-[1px] cursor-pointer"
          >
            <svg className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {tab === 'circo' ? 'Ajouter un membre' : 'Ajouter une école'}
          </button>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : tab === 'circo' ? (
          <CircoGrid
            rows={filteredCirco}
            onEdit={openCircoModal}
            onDelete={deleteCirco}
            hasQuery={!!query.trim()}
            onAdd={() => openCircoModal()}
          />
        ) : (
          <EcolesList
            ecoles={filteredEcoles}
            allDirections={directions}
            expanded={expandedEcole}
            setExpanded={setExpandedEcole}
            onEditEcole={openEcoleModal}
            onDeleteEcole={deleteEcole}
            onAddDir={(ecoleId) => openDirModal(ecoleId)}
            onEditDir={(ecoleId, dir) => openDirModal(ecoleId, dir)}
            onDeleteDir={deleteDir}
            hasQuery={!!query.trim()}
            onAdd={() => openEcoleModal()}
          />
        )}
      </main>

      {/* ═══ MODALS ═══ */}
      <AnimatePresence>
        {circoModal && (
          <Modal
            key="circo-modal"
            title={circoModal.id ? 'Modifier un membre' : 'Ajouter un membre'}
            subtitle="Équipe de circonscription"
            onClose={() => setCircoModal(null)}
            onSave={saveCirco}
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Rôle court">
                <input className="input-field" placeholder="IEN, CPC EPS…" value={circoModal.role} onChange={e => setCircoModal({ ...circoModal, role: e.target.value })} />
              </Field>
              <Field label="Ordre d'affichage">
                <input className="input-field" type="number" value={circoModal.ordre} onChange={e => setCircoModal({ ...circoModal, ordre: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Rôle complet">
              <input className="input-field" placeholder="Inspectrice de l'Éducation Nationale" value={circoModal.role_long} onChange={e => setCircoModal({ ...circoModal, role_long: e.target.value })} />
            </Field>
            <Field label="Nom">
              <input className="input-field" placeholder="Mme Dupont Marie" value={circoModal.name} onChange={e => setCircoModal({ ...circoModal, name: e.target.value })} />
            </Field>
            <Field label="Email">
              <input className="input-field" type="email" placeholder="prenom.nom@ac-guyane.fr" value={circoModal.email || ''} onChange={e => setCircoModal({ ...circoModal, email: e.target.value })} />
            </Field>
            <Field label="Téléphones">
              <TelsEditor tels={circoModal.tels} onChange={tels => setCircoModal({ ...circoModal, tels })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Icône">
                <select className="input-field" value={circoModal.icon_key} onChange={e => setCircoModal({ ...circoModal, icon_key: e.target.value as any })}>
                  {ICON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Couleur d'accent">
                <AccentPicker value={circoModal.accent} onChange={v => setCircoModal({ ...circoModal, accent: v })} />
              </Field>
            </div>
          </Modal>
        )}

        {ecoleModal && (
          <Modal
            key="ecole-modal"
            title={ecoleModal.id ? 'Modifier une école' : 'Ajouter une école'}
            subtitle="Établissement scolaire"
            onClose={() => setEcoleModal(null)}
            onSave={saveEcole}
          >
            <Field label="Nom de l'école">
              <input className="input-field" placeholder="Ex: Eliette Danglades Élémentaire" value={ecoleModal.name} onChange={e => setEcoleModal({ ...ecoleModal, name: e.target.value })} />
            </Field>
            <Field label="Type d'école" hint="Laisser « Aucun » pour les écoles à direction double.">
              <select className="input-field" value={ecoleModal.type || ''} onChange={e => setEcoleModal({ ...ecoleModal, type: (e.target.value || null) as any })}>
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Ordre d'affichage">
              <input className="input-field" type="number" value={ecoleModal.ordre} onChange={e => setEcoleModal({ ...ecoleModal, ordre: Number(e.target.value) })} />
            </Field>
          </Modal>
        )}

        {dirModal.row && (
          <Modal
            key="dir-modal"
            title={dirModal.row.id ? 'Modifier une direction' : 'Ajouter une direction'}
            subtitle={ecoles.find(e => e.id === dirModal.ecoleId)?.name || 'École'}
            onClose={() => setDirModal({ row: null, ecoleId: '' })}
            onSave={saveDir}
          >
            <Field label="Nom">
              <input className="input-field" placeholder="M. Durand Pierre" value={dirModal.row.name} onChange={e => setDirModal({ ...dirModal, row: { ...dirModal.row!, name: e.target.value } })} />
            </Field>
            <Field label="Rôle" hint="Élémentaire, Maternelle, ou vide.">
              <input className="input-field" value={dirModal.row.role || ''} onChange={e => setDirModal({ ...dirModal, row: { ...dirModal.row!, role: e.target.value } })} />
            </Field>
            <Field label="Email">
              <input className="input-field" type="email" value={dirModal.row.email || ''} onChange={e => setDirModal({ ...dirModal, row: { ...dirModal.row!, email: e.target.value } })} />
            </Field>
            <Field label="Téléphones">
              <TelsEditor tels={dirModal.row.tels} onChange={tels => setDirModal({ ...dirModal, row: { ...dirModal.row!, tels } })} />
            </Field>
            <Field label="Ordre d'affichage (dans l'école)">
              <input className="input-field" type="number" value={dirModal.row.ordre} onChange={e => setDirModal({ ...dirModal, row: { ...dirModal.row!, ordre: Number(e.target.value) } })} />
            </Field>
          </Modal>
        )}
      </AnimatePresence>

      {/* ═══ TOAST ═══ */}
      <AnimatePresence>
        {toast && (
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
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shadow-lg ${
                  toast.type === 'success'
                    ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/40'
                    : 'bg-gradient-to-br from-rose-400 to-red-500 shadow-rose-500/40'
                }`}
              >
                {toast.type === 'success' ? (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                ) : (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                )}
              </div>
              <span className="text-[13px] font-semibold">{toast.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────── SUB-COMPONENTS ────────── */

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-3xl bg-white border border-slate-200 p-6 overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
              <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
              <div className="h-3 w-40 rounded bg-slate-200 animate-pulse" />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <div className="h-7 w-20 rounded-xl bg-slate-100 animate-pulse" />
            <div className="h-7 w-28 rounded-xl bg-slate-100 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── CIRCO ─── */
function CircoGrid({
  rows, onEdit, onDelete, hasQuery, onAdd,
}: {
  rows: CircoRow[];
  onEdit: (row: CircoRow) => void;
  onDelete: (id: string) => void;
  hasQuery: boolean;
  onAdd: () => void;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        message={hasQuery ? 'Aucun membre ne correspond à votre recherche.' : 'Aucun membre dans l\'équipe pour l\'instant.'}
        cta={hasQuery ? undefined : { label: 'Ajouter le premier membre', onClick: onAdd }}
      />
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
    >
      <AnimatePresence mode="popLayout">
        {rows.map((m, i) => (
          <motion.article
            key={m.id}
            layout
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 110, damping: 18 } },
            }}
            whileHover={{ y: -3 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="group relative h-full rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-[0_1px_0_rgba(15,23,42,0.02),0_16px_36px_-20px_rgba(15,23,42,0.1)] hover:shadow-[0_1px_0_rgba(15,23,42,0.04),0_32px_60px_-24px_rgba(30,90,120,0.28)] hover:border-[#45b8a0]/40 transition-[box-shadow,border-color] duration-300"
          >
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${m.accent}`} />
            <div className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]" />

            <div className="relative p-6">
              <div className="flex items-start gap-4">
                <div className={`relative flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${m.accent} flex items-center justify-center font-bold text-white text-lg shadow-[0_8px_20px_-6px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.3)]`}>
                  {initials(m.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500">
                    <RoleIcon kind={m.icon_key} />
                    {m.role}
                    <span className="ml-auto font-mono text-[10px] font-normal text-slate-300 tracking-normal normal-case">#{m.ordre}</span>
                  </div>
                  <div className="font-semibold text-[15px] text-slate-950 tracking-tight mt-1 leading-tight break-words">
                    {m.name}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1.5 leading-snug line-clamp-2">
                    {m.role_long}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {m.email && (
                  <span className="inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-xl text-[11px] font-medium text-slate-700 bg-slate-50 border border-slate-200">
                    <svg className="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" /></svg>
                    <span className="truncate max-w-[180px]">{m.email}</span>
                  </span>
                )}
                {m.tels.map(t => (
                  <span key={t.number} className="inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-xl text-[11px] font-mono font-semibold text-slate-700 bg-slate-50 border border-slate-200">
                    {t.type === 'mobile' ? (
                      <svg className="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2" /><line x1="11" y1="18" x2="13" y2="18" /></svg>
                    ) : (
                      <svg className="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" /></svg>
                    )}
                    {t.number}
                  </span>
                ))}
                {!m.email && m.tels.length === 0 && (
                  <span className="text-[11px] text-slate-400 italic px-1">Aucun contact renseigné</span>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end gap-1">
                <ActionBtn onClick={() => onEdit(m)} kind="edit" />
                <ActionBtn onClick={() => onDelete(m.id)} kind="delete" />
              </div>
            </div>
          </motion.article>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── ECOLES ─── */
function EcolesList({
  ecoles, allDirections, expanded, setExpanded,
  onEditEcole, onDeleteEcole, onAddDir, onEditDir, onDeleteDir,
  hasQuery, onAdd,
}: {
  ecoles: EcoleRow[];
  allDirections: DirectionRow[];
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  onEditEcole: (row: EcoleRow) => void;
  onDeleteEcole: (id: string) => void;
  onAddDir: (ecoleId: string) => void;
  onEditDir: (ecoleId: string, dir: DirectionRow) => void;
  onDeleteDir: (id: string) => void;
  hasQuery: boolean;
  onAdd: () => void;
}) {
  if (ecoles.length === 0) {
    return (
      <EmptyState
        message={hasQuery ? 'Aucune école ne correspond à votre recherche.' : 'Aucune école enregistrée.'}
        cta={hasQuery ? undefined : { label: 'Ajouter la première école', onClick: onAdd }}
      />
    );
  }

  return (
    <motion.div
      className="flex flex-col gap-3"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
    >
      <AnimatePresence mode="popLayout">
        {ecoles.map((ec) => {
          const dirs = allDirections.filter(d => d.ecole_id === ec.id).sort((a, b) => a.ordre - b.ordre);
          const isExpanded = expanded === ec.id;
          const typeMeta = ec.type ? TYPE_META[ec.type] : null;

          return (
            <motion.article
              key={ec.id}
              layout
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 110, damping: 18 } },
              }}
              className="relative rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-[0_1px_0_rgba(15,23,42,0.02),0_12px_28px_-20px_rgba(15,23,42,0.1)] hover:border-slate-300 transition-colors"
            >
              {/* Row */}
              <button
                onClick={() => setExpanded(isExpanded ? null : ec.id)}
                className="w-full flex items-center gap-4 p-4 md:p-5 text-left cursor-pointer hover:bg-slate-50/60 transition-colors"
              >
                <div className={`flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br ${typeMeta?.gradient || 'from-slate-700 to-slate-900'} flex items-center justify-center font-bold text-white text-[13px] tracking-tight shadow-[0_6px_16px_-4px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.3)]`}>
                  {initials(ec.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-[15px] text-slate-950 tracking-tight truncate">{ec.name}</h3>
                    {typeMeta && (
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.12em] uppercase ${typeMeta.text} ${typeMeta.tint} px-2 py-0.5 rounded-full`}>
                        <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${typeMeta.gradient}`} />
                        {ec.type}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="font-mono">#{ec.ordre}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-slate-300" />
                    <span>{dirs.length} direction{dirs.length > 1 ? 's' : ''}</span>
                    {typeMeta && <>
                      <span className="w-0.5 h-0.5 rounded-full bg-slate-300" />
                      <span>{typeMeta.label}</span>
                    </>}
                  </div>
                </div>

                <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100" />

                <div
                  onClick={(e) => { e.stopPropagation(); onEditEcole(ec); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onEditEcole(ec); } }}
                  className="hidden md:inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                  aria-label="Modifier l'école"
                  title="Modifier"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </div>
                <div
                  onClick={(e) => { e.stopPropagation(); onDeleteEcole(ec.id); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onDeleteEcole(ec.id); } }}
                  className="hidden md:inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  aria-label="Supprimer l'école"
                  title="Supprimer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                </div>

                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </motion.div>
              </button>

              {/* Mobile actions */}
              <div className="md:hidden flex gap-2 px-4 pb-3">
                <button onClick={() => onEditEcole(ec)} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-semibold text-sky-700 bg-sky-50 border border-sky-100 hover:bg-sky-100 transition-colors cursor-pointer">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  Modifier
                </button>
                <button onClick={() => onDeleteEcole(ec.id)} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-semibold text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-colors cursor-pointer">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6" /></svg>
                  Supprimer
                </button>
              </div>

              {/* Expanded panel */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key="panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                    className="overflow-hidden border-t border-slate-100 bg-slate-50/40"
                  >
                    <div className="p-4 md:p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500">Directions</span>
                        <button
                          onClick={() => onAddDir(ec.id)}
                          className="group inline-flex items-center gap-1.5 pl-2 pr-3 h-8 rounded-lg text-[12px] font-semibold text-[#45b8a0] bg-white border border-[#45b8a0]/30 hover:border-[#45b8a0] hover:bg-[#45b8a0]/5 transition-colors cursor-pointer"
                        >
                          <svg className="w-3 h-3 transition-transform group-hover:rotate-90 duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                          Ajouter une direction
                        </button>
                      </div>

                      {dirs.length === 0 ? (
                        <div className="py-6 text-center text-[13px] text-slate-500 bg-white rounded-xl border border-dashed border-slate-200">
                          Aucune direction enregistrée pour cette école.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {dirs.map((d) => (
                            <div
                              key={d.id}
                              className="group/dir relative rounded-xl bg-white border border-slate-200 p-3.5 hover:border-[#45b8a0]/40 hover:shadow-[0_8px_20px_-12px_rgba(30,90,120,0.25)] transition-all"
                            >
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center font-semibold text-white text-[11px]">
                                  {initials(d.name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-[13px] text-slate-950 truncate">{d.name}</span>
                                    {d.role && (
                                      <span className="text-[9px] font-bold tracking-[0.14em] uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                        {d.role}
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {d.email && (
                                      <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5">
                                        <svg className="w-2.5 h-2.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 6l-10 7L2 6" /></svg>
                                        <span className="truncate max-w-[140px]">{d.email}</span>
                                      </span>
                                    )}
                                    {d.tels.map(t => (
                                      <span key={t.number} className="inline-flex items-center gap-1 text-[10.5px] font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5">
                                        {t.type === 'mobile' ? (
                                          <svg className="w-2.5 h-2.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2" /><line x1="11" y1="18" x2="13" y2="18" /></svg>
                                        ) : (
                                          <svg className="w-2.5 h-2.5 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" /></svg>
                                        )}
                                        {t.number}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex flex-col gap-0.5">
                                  <ActionBtn onClick={() => onEditDir(ec.id, d)} kind="edit" compact />
                                  <ActionBtn onClick={() => onDeleteDir(d.id)} kind="delete" compact />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── ACTION BUTTON ─── */
function ActionBtn({
  onClick, kind, compact,
}: { onClick: () => void; kind: 'edit' | 'delete'; compact?: boolean }) {
  const isEdit = kind === 'edit';
  const size = compact ? 'w-6 h-6' : 'w-8 h-8';
  const iconSize = compact ? 'w-3 h-3' : 'w-3.5 h-3.5';
  return (
    <button
      onClick={onClick}
      className={`group/act inline-flex items-center justify-center ${size} rounded-lg transition-colors cursor-pointer ${
        isEdit
          ? 'text-slate-500 hover:text-sky-600 hover:bg-sky-50'
          : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
      }`}
      aria-label={isEdit ? 'Modifier' : 'Supprimer'}
      title={isEdit ? 'Modifier' : 'Supprimer'}
    >
      {isEdit ? (
        <svg className={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
      ) : (
        <svg className={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
      )}
    </button>
  );
}

/* ─── EMPTY STATE ─── */
function EmptyState({ message, cta }: { message: string; cta?: { label: string; onClick: () => void } }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-200 py-16 px-6 text-center">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-transparent pointer-events-none" />
      <div className="relative">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
          <svg className="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
        </div>
        <p className="text-[15px] font-medium text-slate-700">{message}</p>
        {cta && (
          <button
            onClick={cta.onClick}
            className="mt-5 inline-flex items-center gap-2 pl-4 pr-5 h-10 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-all active:translate-y-[1px] cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            {cta.label}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── MODAL ─── */
function Modal({
  title, subtitle, children, onClose, onSave,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="relative bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 shadow-[0_40px_80px_-20px_rgba(15,23,42,0.35),inset_0_1px_0_rgba(255,255,255,0.8)]"
        onClick={e => e.stopPropagation()}
      >
        {/* Top gradient bar */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1e5a78] via-[#2d8ba8] to-[#45b8a0]" />

        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            {subtitle && <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500 mb-1">{subtitle}</div>}
            <h3 className="font-[Outfit,sans-serif] text-xl font-bold text-slate-950 tracking-tight leading-tight">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1">
          <div className="space-y-1">{children}</div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 h-10 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition-all cursor-pointer"
          >
            Annuler
          </button>
          <button
            onClick={onSave}
            className="group inline-flex items-center gap-2 pl-4 pr-5 h-10 bg-gradient-to-br from-[#1e5a78] via-[#2d8ba8] to-[#45b8a0] hover:shadow-[0_8px_20px_-6px_rgba(45,139,168,0.5)] text-white text-sm font-semibold rounded-xl transition-all active:translate-y-[1px] cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            Enregistrer
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── FIELD ─── */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] font-bold tracking-[0.14em] uppercase text-slate-500 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

/* ─── ACCENT PICKER ─── */
function AccentPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ACCENT_OPTIONS.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-label={opt.label}
            title={opt.label}
            className={`relative w-8 h-8 rounded-xl bg-gradient-to-br ${opt.value} transition-all cursor-pointer ${
              selected
                ? 'ring-2 ring-offset-2 ring-slate-900 scale-110'
                : 'hover:scale-105 opacity-80 hover:opacity-100'
            }`}
          >
            {selected && (
              <svg className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── TELS EDITOR ─── */
function TelsEditor({ tels, onChange }: { tels: Tel[]; onChange: (tels: Tel[]) => void }) {
  const update = (i: number, patch: Partial<Tel>) => {
    const next = [...tels];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const add = () => onChange([...tels, { type: 'mobile', number: '' }]);
  const remove = (i: number) => onChange(tels.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {tels.map((t, i) => (
          <motion.div
            key={i}
            layout
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="flex gap-2"
          >
            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg">
              {(['fixe', 'mobile'] as const).map((ty) => {
                const active = t.type === ty;
                return (
                  <button
                    key={ty}
                    type="button"
                    onClick={() => update(i, { type: ty })}
                    className={`inline-flex items-center gap-1 px-2.5 h-9 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                      active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    aria-pressed={active}
                  >
                    {ty === 'mobile' ? (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2" /><line x1="11" y1="18" x2="13" y2="18" /></svg>
                    ) : (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" /></svg>
                    )}
                    {ty === 'mobile' ? 'Mobile' : 'Fixe'}
                  </button>
                );
              })}
            </div>
            <input
              className="input-field flex-1 font-mono text-sm"
              placeholder="0594.00.00.00"
              value={t.number}
              onChange={e => update(i, { number: e.target.value })}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              aria-label="Supprimer ce numéro"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <button
        type="button"
        onClick={add}
        className="group inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#45b8a0] hover:text-[#2d8ba8] transition-colors cursor-pointer"
      >
        <svg className="w-3 h-3 transition-transform group-hover:rotate-90 duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        Ajouter un numéro
      </button>
    </div>
  );
}

/* ─── ROLE ICON ─── */
function RoleIcon({ kind }: { kind: CircoRow['icon_key'] }) {
  const cls = 'w-2.5 h-2.5';
  switch (kind) {
    case 'star':     return <svg className={cls} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.39 7.36H22l-6.19 4.5L18.2 21 12 16.5 5.8 21l2.39-7.14L2 9.36h7.61L12 2z" /></svg>;
    case 'folder':   return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>;
    case 'compass':  return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>;
    case 'activity': return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
    case 'chip':     return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" /></svg>;
  }
}
