'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuroraHeader from '@/components/AuroraHeader';

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
  'from-amber-400 to-orange-500',
  'from-sky-400 to-blue-500',
  'from-violet-400 to-purple-500',
  'from-emerald-400 to-teal-500',
  'from-fuchsia-400 to-pink-500',
  'from-rose-400 to-pink-500',
  'from-cyan-400 to-blue-500',
  'from-lime-400 to-green-500',
];

const ICON_OPTIONS: { value: CircoRow['icon_key']; label: string }[] = [
  { value: 'star', label: '⭐ Étoile' },
  { value: 'folder', label: '📁 Dossier' },
  { value: 'compass', label: '🧭 Boussole' },
  { value: 'activity', label: '💓 Activité' },
  { value: 'chip', label: '🔌 Puce' },
];

const TYPE_OPTIONS = [
  { value: '', label: '— Aucun —' },
  { value: 'EEPU', label: 'EEPU · Élémentaire publique' },
  { value: 'EMPU', label: 'EMPU · Maternelle publique' },
  { value: 'EEPR', label: 'EEPR · Élémentaire privée' },
  { value: 'GS', label: 'GS · Groupe scolaire' },
];

export default function AdminAnnuairePage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [circo, setCirco] = useState<CircoRow[]>([]);
  const [ecoles, setEcoles] = useState<EcoleRow[]>([]);
  const [directions, setDirections] = useState<DirectionRow[]>([]);

  const [circoModal, setCircoModal] = useState<CircoRow | null>(null);
  const [ecoleModal, setEcoleModal] = useState<EcoleRow | null>(null);
  const [dirModal, setDirModal] = useState<{ row: DirectionRow | null; ecoleId: string }>({ row: null, ecoleId: '' });

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

  const notify = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
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
      accent: ACCENT_OPTIONS[0], icon_key: 'folder',
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
      notify('error', 'Les champs rôle, rôle complet et nom sont obligatoires');
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
      notify('success', 'Supprimé');
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
      notify('success', 'Supprimée');
      loadAll();
    } catch (e: any) { notify('error', e.message); }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <AuroraHeader
        kicker="Administration"
        title="Gérer"
        titleAccent="l'annuaire."
        subtitle="Équipe de circonscription · Écoles · Directions."
        backHref="/outils/annuaire"
        backLabel="Voir l'annuaire public"
      />

      <div className="container mx-auto max-w-6xl px-6 py-8 -mt-20 relative z-10">
        {message && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="card text-center text-gray-500">Chargement…</div>
        ) : (
          <>
            {/* CIRCO */}
            <section className="card mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">👥 Équipe de circonscription</h2>
                  <p className="text-sm text-gray-500">{circo.length} membre{circo.length > 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => openCircoModal()} className="btn-primary-zen">+ Ajouter</button>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ordre</th>
                      <th>Rôle</th>
                      <th>Nom</th>
                      <th>Email</th>
                      <th>Téléphones</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {circo.map(c => (
                      <tr key={c.id}>
                        <td className="font-mono text-xs">{c.ordre}</td>
                        <td><span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">{c.role}</span></td>
                        <td className="font-medium">{c.name}</td>
                        <td className="text-xs text-gray-500">{c.email || '—'}</td>
                        <td className="text-xs font-mono">{c.tels.map(t => t.number).join(' · ') || '—'}</td>
                        <td className="text-right whitespace-nowrap">
                          <button onClick={() => openCircoModal(c)} className="text-sm text-blue-600 hover:underline mr-3">Modifier</button>
                          <button onClick={() => deleteCirco(c.id)} className="text-sm text-red-600 hover:underline">Supprimer</button>
                        </td>
                      </tr>
                    ))}
                    {circo.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-6">Aucun membre</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ECOLES */}
            <section className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">🏫 Écoles et directions</h2>
                  <p className="text-sm text-gray-500">{ecoles.length} école{ecoles.length > 1 ? 's' : ''} · {directions.length} direction{directions.length > 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => openEcoleModal()} className="btn-primary-zen">+ Ajouter école</button>
              </div>

              <div className="space-y-3">
                {ecoles.map(ec => {
                  const dirs = directions.filter(d => d.ecole_id === ec.id).sort((a, b) => a.ordre - b.ordre);
                  return (
                    <div key={ec.id} className="border border-gray-200 rounded-xl bg-white">
                      <div className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-t-xl border-b border-gray-200 flex-wrap">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-xs text-gray-400">#{ec.ordre}</span>
                          <span className="font-bold text-gray-900">{ec.name}</span>
                          {ec.type && <span className="text-[10px] font-semibold tracking-wide uppercase bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{ec.type}</span>}
                          <span className="text-xs text-gray-500">{dirs.length} direction{dirs.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <button onClick={() => openDirModal(ec.id)} className="text-primary-600 hover:underline">+ Direction</button>
                          <button onClick={() => openEcoleModal(ec)} className="text-blue-600 hover:underline">Modifier</button>
                          <button onClick={() => deleteEcole(ec.id)} className="text-red-600 hover:underline">Supprimer</button>
                        </div>
                      </div>
                      {dirs.length > 0 && (
                        <ul className="divide-y divide-gray-100">
                          {dirs.map(d => (
                            <li key={d.id} className="flex items-center justify-between gap-3 p-3 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-gray-900">{d.name}</span>
                                  {d.role && <span className="text-[10px] font-semibold tracking-wide uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{d.role}</span>}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-3">
                                  {d.email && <span>📧 {d.email}</span>}
                                  {d.tels.map(t => <span key={t.number} className="font-mono">{t.type === 'mobile' ? '📱' : '☎️'} {t.number}</span>)}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-sm">
                                <button onClick={() => openDirModal(ec.id, d)} className="text-blue-600 hover:underline">Modifier</button>
                                <button onClick={() => deleteDir(d.id)} className="text-red-600 hover:underline">Supprimer</button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
                {ecoles.length === 0 && <div className="text-center text-gray-400 py-6">Aucune école</div>}
              </div>
            </section>
          </>
        )}
      </div>

      {/* Modal CIRCO */}
      {circoModal && (
        <Modal onClose={() => setCircoModal(null)} title={circoModal.id ? 'Modifier un membre' : 'Ajouter un membre'} onSave={saveCirco}>
          <Field label="Rôle court (ex: IEN, CPC EPS)">
            <input className="input-field" value={circoModal.role} onChange={e => setCircoModal({ ...circoModal, role: e.target.value })} />
          </Field>
          <Field label="Rôle complet">
            <input className="input-field" value={circoModal.role_long} onChange={e => setCircoModal({ ...circoModal, role_long: e.target.value })} />
          </Field>
          <Field label="Nom (ex: Mme Dupont Marie)">
            <input className="input-field" value={circoModal.name} onChange={e => setCircoModal({ ...circoModal, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <input className="input-field" type="email" value={circoModal.email || ''} onChange={e => setCircoModal({ ...circoModal, email: e.target.value })} />
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
              <select className="input-field" value={circoModal.accent} onChange={e => setCircoModal({ ...circoModal, accent: e.target.value })}>
                {ACCENT_OPTIONS.map(a => <option key={a} value={a}>{a.replace(/from-|to-/g, '').replace(/-/g, ' ')}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Ordre d'affichage">
            <input className="input-field" type="number" value={circoModal.ordre} onChange={e => setCircoModal({ ...circoModal, ordre: Number(e.target.value) })} />
          </Field>
        </Modal>
      )}

      {/* Modal ECOLE */}
      {ecoleModal && (
        <Modal onClose={() => setEcoleModal(null)} title={ecoleModal.id ? 'Modifier une école' : 'Ajouter une école'} onSave={saveEcole}>
          <Field label="Nom de l'école">
            <input className="input-field" value={ecoleModal.name} onChange={e => setEcoleModal({ ...ecoleModal, name: e.target.value })} />
          </Field>
          <Field label="Type d'école">
            <select className="input-field" value={ecoleModal.type || ''} onChange={e => setEcoleModal({ ...ecoleModal, type: (e.target.value || null) as any })}>
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <p className="text-xs text-gray-500 mt-1">Laisser « Aucun » pour les écoles à direction double (Élémentaire + Maternelle).</p>
          </Field>
          <Field label="Ordre d'affichage">
            <input className="input-field" type="number" value={ecoleModal.ordre} onChange={e => setEcoleModal({ ...ecoleModal, ordre: Number(e.target.value) })} />
          </Field>
        </Modal>
      )}

      {/* Modal DIRECTION */}
      {dirModal.row && (
        <Modal onClose={() => setDirModal({ row: null, ecoleId: '' })} title={dirModal.row.id ? 'Modifier une direction' : 'Ajouter une direction'} onSave={saveDir}>
          <Field label="Nom du directeur / de la directrice">
            <input className="input-field" value={dirModal.row.name} onChange={e => setDirModal({ ...dirModal, row: { ...dirModal.row!, name: e.target.value } })} />
          </Field>
          <Field label="Rôle (Élémentaire, Maternelle, ou vide)">
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
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, children, onClose, onSave }: { title: string; children: React.ReactNode; onClose: () => void; onSave: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none" aria-label="Fermer">×</button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">Annuler</button>
          <button onClick={onSave} className="btn-primary-zen">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

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
      {tels.map((t, i) => (
        <div key={i} className="flex gap-2">
          <select className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500" value={t.type} onChange={e => update(i, { type: e.target.value as Tel['type'] })}>
            <option value="fixe">☎️ Fixe</option>
            <option value="mobile">📱 Mobile</option>
          </select>
          <input className="input-field flex-1" placeholder="0594.00.00.00" value={t.number} onChange={e => update(i, { number: e.target.value })} />
          <button type="button" onClick={() => remove(i)} className="px-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors" aria-label="Supprimer">×</button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-sm text-primary-600 hover:underline">+ Ajouter un numéro</button>
    </div>
  );
}
