'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ───────────── Types ─────────────
type Formateur = { id: string; raccourci: string; nom_complet: string; statut: string; ordre: number };
type GroupeFormateurs = { label?: string; membres: { raccourci: string }[] };
type Session = {
  id: string;
  formation_id: string;
  date_session: string | null;
  date_libre: string | null;
  duree_h: number | null;
  lieu: string | null;
  modalite: 'presentiel' | 'distanciel' | 'observation';
  description: string | null;
  fait: boolean;
  ordre: number;
};
type Formation = {
  id: string;
  annee_scolaire: string;
  cycle: 1 | 2 | 3;
  niveaux: string[];
  titre: string;
  duree_h: number;
  type: string;
  pilote_sofia: string | null;
  formateurs: GroupeFormateurs[];
  statut: 'prevu' | 'en_cours' | 'termine' | 'annule';
  valide_admin: boolean;
  notes: string | null;
  ordre: number;
};

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'plan_maths', label: 'Plan Maths' },
  { value: 'plan_francais', label: 'Plan Français' },
  { value: 'plan_lecture', label: 'Plan Lecture' },
  { value: 'anim_ped', label: 'Animation pédagogique' },
  { value: 'plan_laicite', label: 'Plan Laïcité' },
  { value: 'plan_phare', label: 'Plan Phare / CPS' },
  { value: 'anglais', label: 'Anglais' },
  { value: 'savoir_rouler', label: 'Savoir rouler' },
  { value: 'autre', label: 'Autre' },
];

const NIVEAUX_BY_CYCLE: Record<number, string[]> = {
  1: ['PS', 'MS', 'GS'],
  2: ['CP', 'CE1', 'CE2'],
  3: ['CM1', 'CM2'],
};

// ───────────── Helpers ─────────────
function authHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('authToken') : ''}`,
  };
}

async function api<T = any>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...opts, headers: { ...authHeaders(), ...(opts.headers || {}) } });
  const text = await res.text();
  let body: any;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { error: text }; }
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
  return body as T;
}

// ───────────── Composants génériques ─────────────
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400 mt-0.5">{hint}</span>}
    </label>
  );
}

// ───────────── Éditeur de groupes de formateurs ─────────────
function FormateursEditor({
  value,
  onChange,
  formateurs,
}: {
  value: GroupeFormateurs[];
  onChange: (v: GroupeFormateurs[]) => void;
  formateurs: Formateur[];
}) {
  const groupes = value.length > 0 ? value : [{ membres: [] }];

  const updateGroupe = (i: number, patch: Partial<GroupeFormateurs>) => {
    const next = groupes.map((g, k) => (k === i ? { ...g, ...patch } : g));
    onChange(next);
  };
  const addGroupe = () => onChange([...groupes, { membres: [] }]);
  const removeGroupe = (i: number) => onChange(groupes.filter((_, k) => k !== i));
  const addMembre = (i: number) => updateGroupe(i, { membres: [...groupes[i].membres, { raccourci: '' }] });
  const removeMembre = (i: number, j: number) => updateGroupe(i, { membres: groupes[i].membres.filter((_, k) => k !== j) });
  const updateMembre = (i: number, j: number, raccourci: string) =>
    updateGroupe(i, { membres: groupes[i].membres.map((m, k) => (k === j ? { raccourci } : m)) });

  return (
    <div className="space-y-3">
      {groupes.map((g, i) => (
        <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={g.label || ''}
              onChange={(e) => updateGroupe(i, { label: e.target.value })}
              placeholder={`Label optionnel (ex: « Narramus », « Constellation ${i + 1} »)`}
              className="flex-1 text-sm px-2 py-1 rounded border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            {groupes.length > 1 && (
              <button
                type="button"
                onClick={() => removeGroupe(i)}
                className="text-xs text-red-600 hover:text-red-800 font-semibold px-2"
                title="Supprimer ce groupe"
              >
                ✕ Groupe
              </button>
            )}
          </div>
          <div className="space-y-1">
            {g.membres.map((m, j) => (
              <div key={j} className="flex items-center gap-2">
                <select
                  value={m.raccourci}
                  onChange={(e) => updateMembre(i, j, e.target.value)}
                  className="flex-1 text-sm px-2 py-1 rounded border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">— Choisir un formateur —</option>
                  {formateurs.map((f) => (
                    <option key={f.id} value={f.raccourci}>
                      {f.nom_complet} ({f.statut})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeMembre(i, j)}
                  className="text-red-500 hover:text-red-700 text-sm px-1"
                  title="Retirer"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addMembre(i)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold mt-1"
            >
              + Ajouter un formateur à ce groupe
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addGroupe}
        className="text-sm text-indigo-700 hover:text-indigo-900 font-bold bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200"
      >
        + Ajouter un groupe (binôme, constellation, choix d'anim…)
      </button>
    </div>
  );
}

// ───────────── Modal Formation ─────────────
function FormationModal({
  open, onClose, onSave, formateurs, existing,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (f: Partial<Formation>) => Promise<void>;
  formateurs: Formateur[];
  existing?: Formation | null;
}) {
  const [form, setForm] = useState<Partial<Formation>>(() => existing || {
    annee_scolaire: '2025-2026', cycle: 1, niveaux: [], titre: '', duree_h: 0, type: 'autre',
    pilote_sofia: '', formateurs: [{ membres: [] }], statut: 'prevu', valide_admin: false, notes: '', ordre: 0,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(existing ? { ...existing } : {
        annee_scolaire: '2025-2026', cycle: 1, niveaux: [], titre: '', duree_h: 0, type: 'autre',
        pilote_sofia: '', formateurs: [{ membres: [] }], statut: 'prevu', valide_admin: false, notes: '', ordre: 0,
      });
      setErr(null);
    }
  }, [open, existing]);

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      await onSave(form);
      onClose();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const niveauxDispo = NIVEAUX_BY_CYCLE[Number(form.cycle) || 1] || [];

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Modifier la formation' : 'Nouvelle formation'}>
      <Field label="Titre">
        <input
          type="text"
          value={form.titre || ''}
          onChange={(e) => setForm({ ...form, titre: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Cycle">
          <select
            value={form.cycle || 1}
            onChange={(e) => setForm({ ...form, cycle: Number(e.target.value) as 1 | 2 | 3, niveaux: [] })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200"
          >
            <option value={1}>Cycle 1</option>
            <option value={2}>Cycle 2</option>
            <option value={3}>Cycle 3</option>
          </select>
        </Field>
        <Field label="Durée (h)">
          <input
            type="number"
            step="0.5"
            value={form.duree_h ?? 0}
            onChange={(e) => setForm({ ...form, duree_h: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200"
          />
        </Field>
        <Field label="Type">
          <select
            value={form.type || 'autre'}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200"
          >
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Niveaux">
        <div className="flex flex-wrap gap-2">
          {niveauxDispo.map((n) => {
            const active = form.niveaux?.includes(n);
            return (
              <button
                key={n}
                type="button"
                onClick={() => {
                  const set = new Set(form.niveaux || []);
                  if (active) set.delete(n); else set.add(n);
                  setForm({ ...form, niveaux: Array.from(set) });
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                  active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Pilote-SOFIA">
        <input
          type="text"
          value={form.pilote_sofia || ''}
          onChange={(e) => setForm({ ...form, pilote_sofia: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200"
        />
      </Field>
      <Field label="Formateurs (groupes binôme / constellation / choix)" hint="Chaque groupe = un binôme, trinôme, constellation ou choix d'animation.">
        <FormateursEditor
          value={form.formateurs || [{ membres: [] }]}
          onChange={(v) => setForm({ ...form, formateurs: v })}
          formateurs={formateurs}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Statut">
          <select
            value={form.statut || 'prevu'}
            onChange={(e) => setForm({ ...form, statut: e.target.value as any })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200"
          >
            <option value="prevu">Prévu</option>
            <option value="en_cours">En cours</option>
            <option value="termine">Terminé</option>
            <option value="annule">Annulé</option>
          </select>
        </Field>
        <Field label="Ordre d'affichage">
          <input
            type="number"
            value={form.ordre ?? 0}
            onChange={(e) => setForm({ ...form, ordre: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200"
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 mb-3 cursor-pointer">
        <input
          type="checkbox"
          checked={!!form.valide_admin}
          onChange={(e) => setForm({ ...form, valide_admin: e.target.checked })}
          className="w-4 h-4 accent-emerald-600"
        />
        <span className="text-sm font-semibold text-slate-700">Validée par l'IEN / admin</span>
      </label>
      <Field label="Notes">
        <textarea
          value={form.notes || ''}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-slate-200"
        />
      </Field>

      {err && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{err}</div>}

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-semibold">Annuler</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-bold disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  );
}

// ───────────── Modal Session ─────────────
function SessionModal({
  open, onClose, onSave, formationId, existing,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (s: Partial<Session>) => Promise<void>;
  formationId: string;
  existing?: Session | null;
}) {
  const [form, setForm] = useState<Partial<Session>>(() => existing || {
    formation_id: formationId, date_session: null, date_libre: null, duree_h: null,
    lieu: '', modalite: 'presentiel', description: '', fait: false, ordre: 0,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(existing ? { ...existing } : {
        formation_id: formationId, date_session: null, date_libre: null, duree_h: null,
        lieu: '', modalite: 'presentiel', description: '', fait: false, ordre: 0,
      });
      setErr(null);
    }
  }, [open, existing, formationId]);

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try { await onSave(form); onClose(); }
    catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Modifier la session' : 'Nouvelle session'}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input
            type="date"
            value={form.date_session || ''}
            onChange={(e) => setForm({ ...form, date_session: e.target.value || null })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200"
          />
        </Field>
        <Field label="Durée (h)">
          <input
            type="number"
            step="0.5"
            value={form.duree_h ?? ''}
            onChange={(e) => setForm({ ...form, duree_h: e.target.value === '' ? null : Number(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200"
          />
        </Field>
      </div>
      <Field label="Date libre (si approximative)" hint="ex: « Entre le 11/05 et le 22/05 »">
        <input
          type="text"
          value={form.date_libre || ''}
          onChange={(e) => setForm({ ...form, date_libre: e.target.value || null })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Lieu">
          <input
            type="text"
            value={form.lieu || ''}
            onChange={(e) => setForm({ ...form, lieu: e.target.value })}
            placeholder="ex: EE Saba"
            className="w-full px-3 py-2 rounded-lg border border-slate-200"
          />
        </Field>
        <Field label="Modalité">
          <select
            value={form.modalite || 'presentiel'}
            onChange={(e) => setForm({ ...form, modalite: e.target.value as any })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200"
          >
            <option value="presentiel">Présentiel</option>
            <option value="distanciel">Distanciel</option>
            <option value="observation">Observation</option>
          </select>
        </Field>
      </div>
      <Field label="Description / Note">
        <input
          type="text"
          value={form.description || ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="ex: OBS 1, Distanciel 1, Groupe 2…"
          className="w-full px-3 py-2 rounded-lg border border-slate-200"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ordre">
          <input
            type="number"
            value={form.ordre ?? 0}
            onChange={(e) => setForm({ ...form, ordre: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200"
          />
        </Field>
        <label className="flex items-end gap-2 mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.fait}
            onChange={(e) => setForm({ ...form, fait: e.target.checked })}
            className="w-5 h-5 accent-emerald-600"
          />
          <span className="text-sm font-semibold text-emerald-700 mb-0.5">Session réalisée ✓</span>
        </label>
      </div>

      {err && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{err}</div>}

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-semibold">Annuler</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-bold disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  );
}

// ───────────── Modal Formateur ─────────────
function FormateurModal({
  open, onClose, onSave, existing,
}: {
  open: boolean; onClose: () => void;
  onSave: (f: Partial<Formateur>) => Promise<void>;
  existing?: Formateur | null;
}) {
  const [form, setForm] = useState<Partial<Formateur>>(() => existing || { raccourci: '', nom_complet: '', statut: '', ordre: 0 });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(existing ? { ...existing } : { raccourci: '', nom_complet: '', statut: '', ordre: 0 });
      setErr(null);
    }
  }, [open, existing]);

  const handleSave = async () => {
    setSaving(true); setErr(null);
    try { await onSave(form); onClose(); }
    catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Modifier le formateur' : 'Nouveau formateur'}>
      <Field label="Raccourci" hint="Clé courte référencée dans les formations (ex: Louis, Hernandez)">
        <input
          type="text" value={form.raccourci || ''}
          onChange={(e) => setForm({ ...form, raccourci: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200"
        />
      </Field>
      <Field label="Nom complet">
        <input
          type="text" value={form.nom_complet || ''}
          onChange={(e) => setForm({ ...form, nom_complet: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200"
        />
      </Field>
      <Field label="Statut">
        <input
          type="text" value={form.statut || ''}
          onChange={(e) => setForm({ ...form, statut: e.target.value })}
          placeholder="ex: PEMF, CPAIEN, Candidat CAFIPEMF, IEN…"
          className="w-full px-3 py-2 rounded-lg border border-slate-200"
        />
      </Field>
      <Field label="Ordre">
        <input
          type="number" value={form.ordre ?? 0}
          onChange={(e) => setForm({ ...form, ordre: Number(e.target.value) })}
          className="w-full px-3 py-2 rounded-lg border border-slate-200"
        />
      </Field>

      {err && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{err}</div>}

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-semibold">Annuler</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-bold disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </Modal>
  );
}

// ───────────── Page ─────────────
export default function AdminPlanFormationPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<'formations' | 'formateurs'>('formations');
  const [formations, setFormations] = useState<Formation[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Modals
  const [formationModal, setFormationModal] = useState<{ open: boolean; existing?: Formation | null }>({ open: false });
  const [sessionModal, setSessionModal] = useState<{ open: boolean; formationId: string; existing?: Session | null }>({ open: false, formationId: '' });
  const [formateurModal, setFormateurModal] = useState<{ open: boolean; existing?: Formateur | null }>({ open: false });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const role = localStorage.getItem('userRole');
    if (!token || role !== 'admin') {
      router.push('/');
      return;
    }
    setReady(true);
    loadAll();
  }, [router]);

  const loadAll = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [f, s, fm] = await Promise.all([
        api<Formation[]>('/api/admin/plan-formation/formations'),
        api<Session[]>('/api/admin/plan-formation/sessions'),
        api<Formateur[]>('/api/admin/plan-formation/formateurs'),
      ]);
      setFormations(f); setSessions(s); setFormateurs(fm);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const saveFormation = async (data: Partial<Formation>) => {
    const payload: any = {
      anneeScolaire: data.annee_scolaire, cycle: data.cycle, niveaux: data.niveaux,
      titre: data.titre, dureeH: data.duree_h, type: data.type, piloteSofia: data.pilote_sofia,
      formateurs: data.formateurs, statut: data.statut, valideAdmin: data.valide_admin,
      notes: data.notes, ordre: data.ordre,
    };
    if (data.id) {
      payload.id = data.id;
      await api('/api/admin/plan-formation/formations', { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api('/api/admin/plan-formation/formations', { method: 'POST', body: JSON.stringify(payload) });
    }
    await loadAll();
  };

  const deleteFormation = async (id: string) => {
    if (!confirm('Supprimer cette formation et toutes ses sessions ?')) return;
    try {
      await api(`/api/admin/plan-formation/formations?id=${id}`, { method: 'DELETE' });
      await loadAll();
    } catch (e: any) { alert(e.message); }
  };

  const saveSession = async (data: Partial<Session>) => {
    const payload: any = {
      formationId: data.formation_id, date: data.date_session, dateLibre: data.date_libre,
      dureeH: data.duree_h, lieu: data.lieu, modalite: data.modalite, description: data.description,
      fait: data.fait, ordre: data.ordre,
    };
    if (data.id) {
      payload.id = data.id;
      await api('/api/admin/plan-formation/sessions', { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api('/api/admin/plan-formation/sessions', { method: 'POST', body: JSON.stringify(payload) });
    }
    await loadAll();
  };

  const toggleFait = async (s: Session) => {
    try {
      await api('/api/admin/plan-formation/sessions', {
        method: 'PUT',
        body: JSON.stringify({ id: s.id, fait: !s.fait }),
      });
      await loadAll();
    } catch (e: any) { alert(e.message); }
  };

  const deleteSession = async (id: string) => {
    if (!confirm('Supprimer cette session ?')) return;
    try {
      await api(`/api/admin/plan-formation/sessions?id=${id}`, { method: 'DELETE' });
      await loadAll();
    } catch (e: any) { alert(e.message); }
  };

  const toggleValideAdmin = async (f: Formation) => {
    try {
      await api('/api/admin/plan-formation/formations', {
        method: 'PUT',
        body: JSON.stringify({ id: f.id, valideAdmin: !f.valide_admin }),
      });
      await loadAll();
    } catch (e: any) { alert(e.message); }
  };

  const saveFormateur = async (data: Partial<Formateur>) => {
    const payload: any = { raccourci: data.raccourci, nomComplet: data.nom_complet, statut: data.statut, ordre: data.ordre };
    if (data.id) {
      payload.id = data.id;
      await api('/api/admin/plan-formation/formateurs', { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api('/api/admin/plan-formation/formateurs', { method: 'POST', body: JSON.stringify(payload) });
    }
    await loadAll();
  };

  const deleteFormateur = async (id: string) => {
    if (!confirm('Supprimer ce formateur ? (il restera référencé dans les formations existantes)')) return;
    try {
      await api(`/api/admin/plan-formation/formateurs?id=${id}`, { method: 'DELETE' });
      await loadAll();
    } catch (e: any) { alert(e.message); }
  };

  const sessionsByFormation = useMemo(() => {
    const m: Record<string, Session[]> = {};
    sessions.forEach((s) => { (m[s.formation_id] ||= []).push(s); });
    Object.values(m).forEach((arr) => arr.sort((a, b) => a.ordre - b.ordre));
    return m;
  }, [sessions]);

  const byCycle = useMemo(() => {
    const m: Record<number, Formation[]> = { 1: [], 2: [], 3: [] };
    formations.forEach((f) => m[f.cycle]?.push(f));
    return m;
  }, [formations]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0] text-white py-10 px-6">
        <div className="container mx-auto">
          <Link href="/formations/plan" className="inline-flex items-center gap-2 text-white/85 hover:text-white mb-4 text-sm">
            ← Voir la page publique
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-2xl">⚙️</div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold">Gestion du plan de formation</h1>
              <p className="text-lg opacity-90 mt-1">Année 2025-2026</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['formations', 'formateurs'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                tab === t ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {t === 'formations' ? `📋 Formations & sessions (${formations.length})` : `👥 Formateurs (${formateurs.length})`}
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-12 text-slate-500">Chargement…</div>}
        {err && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{err}</div>}

        {/* ── Tab Formations ── */}
        {tab === 'formations' && !loading && (
          <div>
            <button
              onClick={() => setFormationModal({ open: true, existing: null })}
              className="mb-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold shadow-sm"
            >
              + Nouvelle formation
            </button>

            {([1, 2, 3] as const).map((c) => {
              const list = byCycle[c] || [];
              if (list.length === 0) return null;
              return (
                <section key={c} className="mb-8">
                  <h2 className="text-lg font-black text-slate-700 mb-3">Cycle {c}</h2>
                  <div className="space-y-4">
                    {list.map((f) => {
                      const sList = sessionsByFormation[f.id] || [];
                      const faites = sList.filter((s) => s.fait).length;
                      return (
                        <article key={f.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                          <div className="p-4 border-b border-slate-100">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  {f.niveaux.map((n) => (
                                    <span key={n} className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-800 text-white">{n}</span>
                                  ))}
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">{f.duree_h}h</span>
                                  <span className="text-[10px] font-bold uppercase text-slate-500">{TYPE_OPTIONS.find((o) => o.value === f.type)?.label}</span>
                                  {f.valide_admin && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">✓ Validée</span>
                                  )}
                                </div>
                                <h3 className="text-base font-bold text-slate-800">{f.titre}</h3>
                                {f.pilote_sofia && <p className="text-xs text-slate-500 mt-0.5">Pilote : {f.pilote_sofia}</p>}
                                {f.notes && <p className="text-xs text-slate-400 italic mt-0.5">{f.notes}</p>}
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => toggleValideAdmin(f)}
                                  className={`text-xs font-bold px-2.5 py-1 rounded ${
                                    f.valide_admin ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                  title="Valider la formation (IEN / admin)"
                                >
                                  {f.valide_admin ? '✓ Validée' : 'Valider'}
                                </button>
                                <button onClick={() => setFormationModal({ open: true, existing: f })} className="text-xs font-bold px-2.5 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200">✎ Modifier</button>
                                <button onClick={() => deleteFormation(f.id)} className="text-xs font-bold px-2.5 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">Supprimer</button>
                              </div>
                            </div>
                          </div>

                          {/* Sessions */}
                          <div className="p-4 bg-slate-50/60">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Sessions ({faites}/{sList.length} faites)
                              </span>
                              <button
                                onClick={() => setSessionModal({ open: true, formationId: f.id, existing: null })}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                              >
                                + Session
                              </button>
                            </div>
                            {sList.length === 0 ? (
                              <div className="text-xs text-slate-400 italic">Aucune session pour le moment.</div>
                            ) : (
                              <ul className="space-y-1">
                                {sList.map((s) => (
                                  <li key={s.id} className="flex flex-wrap items-center gap-2 p-2 bg-white rounded border border-slate-100">
                                    <button
                                      onClick={() => toggleFait(s)}
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                                        s.fait ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-300 text-slate-400 hover:border-emerald-400'
                                      }`}
                                      title={s.fait ? 'Marquer comme non fait' : 'Marquer comme fait'}
                                    >
                                      {s.fait ? '✓' : ''}
                                    </button>
                                    <span className="text-xs font-semibold text-slate-700 min-w-[8rem]">
                                      {s.date_libre || s.date_session || '—'}
                                    </span>
                                    {s.duree_h != null && <span className="text-xs text-slate-500">{s.duree_h}h</span>}
                                    <span className="text-[10px] font-semibold uppercase text-slate-400">{s.modalite}</span>
                                    {s.lieu && <span className="text-xs text-slate-600">📍 {s.lieu}</span>}
                                    {s.description && <span className="text-xs text-slate-400 italic">{s.description}</span>}
                                    <div className="ml-auto flex gap-1">
                                      <button onClick={() => setSessionModal({ open: true, formationId: f.id, existing: s })} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 px-1.5">✎</button>
                                      <button onClick={() => deleteSession(s.id)} className="text-[11px] font-bold text-red-600 hover:text-red-800 px-1.5">✕</button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* ── Tab Formateurs ── */}
        {tab === 'formateurs' && !loading && (
          <div>
            <button
              onClick={() => setFormateurModal({ open: true, existing: null })}
              className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold shadow-sm"
            >
              + Nouveau formateur
            </button>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="text-left p-3 font-bold">Raccourci</th>
                    <th className="text-left p-3 font-bold">Nom complet</th>
                    <th className="text-left p-3 font-bold">Statut</th>
                    <th className="text-left p-3 font-bold">Ordre</th>
                    <th className="text-right p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {formateurs.map((f) => (
                    <tr key={f.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="p-3 font-mono text-xs font-bold text-indigo-700">{f.raccourci}</td>
                      <td className="p-3 font-semibold text-slate-700">{f.nom_complet}</td>
                      <td className="p-3 text-slate-600">{f.statut}</td>
                      <td className="p-3 text-slate-500">{f.ordre}</td>
                      <td className="p-3 text-right">
                        <button onClick={() => setFormateurModal({ open: true, existing: f })} className="text-xs font-bold px-2.5 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 mr-1">✎</button>
                        <button onClick={() => deleteFormateur(f.id)} className="text-xs font-bold px-2.5 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <FormationModal
        open={formationModal.open}
        onClose={() => setFormationModal({ open: false })}
        onSave={saveFormation}
        formateurs={formateurs}
        existing={formationModal.existing}
      />
      <SessionModal
        open={sessionModal.open}
        onClose={() => setSessionModal({ open: false, formationId: '' })}
        onSave={saveSession}
        formationId={sessionModal.formationId}
        existing={sessionModal.existing}
      />
      <FormateurModal
        open={formateurModal.open}
        onClose={() => setFormateurModal({ open: false })}
        onSave={saveFormateur}
        existing={formateurModal.existing}
      />
    </div>
  );
}
