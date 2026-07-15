'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AuroraHeader from '@/components/AuroraHeader';
import StatPill from '@/components/StatPill';
import PageLoader from '@/components/PageLoader';
import {
  Plage,
  TitulaireRemplacant,
  Remplacement,
  PLAGE_LABELS,
  MOIS_LABELS,
  MOIS_INDICES,
  JOURS_COURTS,
  getYearsFromAnnee,
  anneeDuMois,
  daysInMonth,
  toISO,
  getJourNonTravaille,
  buildEcoleColors,
  getCellRemplacements,
} from './dates';

// ─── Types locaux ─────────────────────────────────────────────────────────────

interface EcoleIdentite {
  uai: string;
  sigle?: string;
  nom: string;
}

interface EnseignantRow {
  id: string;
  nom: string;
  prenom: string;
  ecole_uai: string;
}

interface ModalState {
  mode: 'create' | 'edit';
  id?: string;
  tr_id: string;
  date_debut: string;
  date_fin: string;
  plage: Plage;
  ecole_uai: string;
  enseignants: string[];
}

const fmtDateFr = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const ecoleLabel = (e: EcoleIdentite) => `${e.sigle ? e.sigle + ' ' : ''}${e.nom}`;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RemplacementsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const [trs, setTrs] = useState<TitulaireRemplacant[]>([]);
  const [remplacements, setRemplacements] = useState<Remplacement[]>([]);
  const [ecoles, setEcoles] = useState<EcoleIdentite[]>([]);
  const [enseignants, setEnseignants] = useState<EnseignantRow[]>([]);
  const [anneeScolaire, setAnneeScolaire] = useState('2025-2026');
  const [moisIdx, setMoisIdx] = useState(0);

  const [modal, setModal] = useState<ModalState | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saisieLibre, setSaisieLibre] = useState('');
  const [detail, setDetail] = useState<Remplacement | null>(null);
  const [showTrPanel, setShowTrPanel] = useState(false);
  const [nouveauTr, setNouveauTr] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const authHeaders = (): Record<string, string> => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('authToken')}`,
  });

  // ── Garde client (espace réservé) ──
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  // ── Chargement initial ──
  const loadTrs = useCallback(async () => {
    const res = await fetch('/api/remplacements-tr');
    const data = await res.json();
    setTrs(Array.isArray(data) ? data : []);
  }, []);

  const loadRemplacements = useCallback(async () => {
    const res = await fetch('/api/remplacements');
    const data = await res.json();
    const rows = (Array.isArray(data) ? data : []).map((r: any) => ({
      ...r,
      enseignants: Array.isArray(r.enseignants) ? r.enseignants : [],
    }));
    setRemplacements(rows);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const [config] = await Promise.all([
          fetch('/api/config').then((r) => r.json()).catch(() => null),
          loadTrs(),
          loadRemplacements(),
          fetch('/api/ecoles-identite')
            .then((r) => r.json())
            .then((d) => setEcoles(Array.isArray(d) ? d : []))
            .catch(() => setEcoles([])),
          fetch('/api/enseignants')
            .then((r) => r.json())
            .then((d) => setEnseignants(Array.isArray(d) ? d : []))
            .catch(() => setEnseignants([])),
        ]);

        const annee = config?.annee_scolaire_actuelle || '2025-2026';
        setAnneeScolaire(annee);

        // Mois courant si on est dans l'année scolaire, sinon septembre.
        const idx = MOIS_INDICES.indexOf(new Date().getMonth());
        setMoisIdx(idx >= 0 ? idx : 0);
      } catch (e) {
        console.error('Erreur chargement remplacements:', e);
        showToast('Erreur de chargement des données.');
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated, loadTrs, loadRemplacements, showToast]);

  // ── Dérivés du mois affiché ──
  const [anneeDebut] = getYearsFromAnnee(anneeScolaire);
  const anneeCal = anneeDuMois(moisIdx, anneeDebut);
  const moisCal = MOIS_INDICES[moisIdx];
  const nbJours = daysInMonth(anneeCal, moisCal);
  const jours = useMemo(() => {
    return Array.from({ length: nbJours }, (_, i) => {
      const day = i + 1;
      const iso = toISO(anneeCal, moisCal, day);
      const dow = new Date(anneeCal, moisCal, day).getDay();
      return { day, iso, dow, nonTravaille: getJourNonTravaille(anneeCal, moisCal, day, anneeDebut) };
    });
  }, [anneeCal, moisCal, nbJours, anneeDebut]);

  const ecoleColors = useMemo(() => buildEcoleColors(remplacements), [remplacements]);

  const moisDebutISO = toISO(anneeCal, moisCal, 1);
  const moisFinISO = toISO(anneeCal, moisCal, nbJours);
  const remplacementsDuMois = useMemo(
    () => remplacements.filter((r) => r.date_debut <= moisFinISO && r.date_fin >= moisDebutISO),
    [remplacements, moisDebutISO, moisFinISO]
  );

  const joursCouverts = useMemo(() => {
    let total = 0;
    for (const tr of trs) {
      for (const j of jours) {
        if (j.nonTravaille) continue;
        const cell = getCellRemplacements(remplacementsDuMois, tr.id, j.iso);
        if (cell.journee) total += 1;
        else total += (cell.matin ? 0.5 : 0) + (cell.apresMidi ? 0.5 : 0);
      }
    }
    return total;
  }, [trs, jours, remplacementsDuMois]);

  const legendeEcoles = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of remplacementsDuMois) {
      if (!seen.has(r.ecole_uai)) seen.set(r.ecole_uai, r.ecole_nom);
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  }, [remplacementsDuMois]);

  // ── Actions modal ──
  const openCreate = (trId: string, iso: string, plage: Plage) => {
    setModalError(null);
    setSaisieLibre('');
    setModal({
      mode: 'create',
      tr_id: trId,
      date_debut: iso,
      date_fin: iso,
      plage,
      ecole_uai: '',
      enseignants: [],
    });
  };

  const openEdit = (r: Remplacement) => {
    setDetail(null);
    setModalError(null);
    setSaisieLibre('');
    setModal({
      mode: 'edit',
      id: r.id,
      tr_id: r.tr_id,
      date_debut: r.date_debut,
      date_fin: r.date_fin,
      plage: r.plage,
      ecole_uai: r.ecole_uai,
      enseignants: [...r.enseignants],
    });
  };

  const handleSave = async () => {
    if (!modal) return;
    const ecole = ecoles.find((e) => e.uai === modal.ecole_uai);
    if (!ecole) {
      setModalError('Choisissez une école.');
      return;
    }
    if (modal.enseignants.length === 0) {
      setModalError('Indiquez au moins un enseignant remplacé.');
      return;
    }
    if (modal.date_fin < modal.date_debut) {
      setModalError('La date de fin doit être postérieure ou égale à la date de début.');
      return;
    }

    setSaving(true);
    setModalError(null);
    try {
      const payload = {
        id: modal.id,
        tr_id: modal.tr_id,
        date_debut: modal.date_debut,
        date_fin: modal.date_fin,
        plage: modal.plage,
        ecole_uai: ecole.uai,
        ecole_nom: ecoleLabel(ecole),
        enseignants: modal.enseignants,
      };
      const res = await fetch('/api/remplacements', {
        method: modal.mode === 'edit' ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setModalError(err?.message || err?.error || `Erreur ${res.status}`);
        return;
      }
      await loadRemplacements();
      setModal(null);
      showToast(modal.mode === 'edit' ? 'Remplacement modifié.' : 'Remplacement enregistré.');
    } catch (e) {
      console.error('Erreur sauvegarde remplacement:', e);
      setModalError('Erreur réseau.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: Remplacement) => {
    if (!confirm(`Supprimer le remplacement de ${trs.find((t) => t.id === r.tr_id)?.nom || 'ce TR'} à ${r.ecole_nom} ?`)) return;
    try {
      const res = await fetch(`/api/remplacements?id=${r.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        showToast('Suppression impossible.');
        return;
      }
      setDetail(null);
      await loadRemplacements();
      showToast('Remplacement supprimé.');
    } catch (e) {
      console.error('Erreur suppression:', e);
      showToast('Erreur réseau.');
    }
  };

  // ── Actions TR ──
  const handleAddTr = async () => {
    const nom = nouveauTr.trim();
    if (!nom) return;
    const ordre = trs.length > 0 ? Math.max(...trs.map((t) => t.ordre)) + 1 : 0;
    const res = await fetch('/api/remplacements-tr', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ nom, ordre }),
    });
    if (res.ok) {
      setNouveauTr('');
      await loadTrs();
    } else {
      showToast("Ajout du TR impossible.");
    }
  };

  const handleRenameTr = async (id: string, nom: string) => {
    const clean = nom.trim();
    if (!clean) return;
    const res = await fetch('/api/remplacements-tr', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ id, nom: clean }),
    });
    if (res.ok) await loadTrs();
    else showToast('Renommage impossible.');
  };

  const handleMoveTr = async (index: number, dir: -1 | 1) => {
    const other = index + dir;
    if (other < 0 || other >= trs.length) return;
    const a = trs[index];
    const b = trs[other];
    // Échange des positions : on réécrit les deux ordres.
    await Promise.all([
      fetch('/api/remplacements-tr', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ id: a.id, ordre: other }),
      }),
      fetch('/api/remplacements-tr', {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ id: b.id, ordre: index }),
      }),
    ]);
    await loadTrs();
  };

  const handleDeleteTr = async (tr: TitulaireRemplacant) => {
    const nb = remplacements.filter((r) => r.tr_id === tr.id).length;
    const msg = nb > 0
      ? `Supprimer ${tr.nom} ET ses ${nb} remplacement${nb > 1 ? 's' : ''} enregistré${nb > 1 ? 's' : ''} ?`
      : `Supprimer ${tr.nom} ?`;
    if (!confirm(msg)) return;
    const res = await fetch(`/api/remplacements-tr?id=${tr.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      await Promise.all([loadTrs(), loadRemplacements()]);
      showToast('TR supprimé.');
    } else {
      showToast('Suppression impossible.');
    }
  };

  // ── Enseignants de l'école choisie dans le modal ──
  const enseignantsEcole = useMemo(() => {
    if (!modal?.ecole_uai) return [];
    return enseignants
      .filter((e) => e.ecole_uai === modal.ecole_uai)
      .map((e) => `${e.nom} ${e.prenom || ''}`.trim())
      .filter((n, i, arr) => n && arr.indexOf(n) === i)
      .sort((a, b) => a.localeCompare(b, 'fr'));
  }, [enseignants, modal?.ecole_uai]);

  const toggleEnseignant = (nom: string) => {
    if (!modal) return;
    const list = modal.enseignants.includes(nom)
      ? modal.enseignants.filter((n) => n !== nom)
      : [...modal.enseignants, nom];
    setModal({ ...modal, enseignants: list });
  };

  const addSaisieLibre = () => {
    const nom = saisieLibre.trim();
    if (!nom || !modal) return;
    if (!modal.enseignants.includes(nom)) {
      setModal({ ...modal, enseignants: [...modal.enseignants, nom] });
    }
    setSaisieLibre('');
  };

  if (!isAuthenticated || loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AuroraHeader
        kicker={`Espace réservé · Année scolaire ${anneeScolaire}`}
        title="Gestion des"
        titleAccent="remplacements."
        subtitle="Suivi des remplacements effectués par les Titulaires Remplaçants de la circonscription : saisie, édition et vue mensuelle."
        backLabel="Retour à l'accueil"
        action={
          <button
            onClick={() => setShowTrPanel(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white text-sm font-medium backdrop-blur-md transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>
            Gérer les TR
          </button>
        }
      >
        <div className="flex flex-wrap gap-3">
          <StatPill
            value={String(trs.length)}
            label="Titulaires remplaçants"
            gradient="from-teal-400 via-cyan-400 to-sky-500"
            variant="dark"
          />
          <StatPill
            value={String(remplacementsDuMois.length)}
            label="Remplacements ce mois"
            gradient="from-amber-400 via-orange-400 to-rose-500"
            variant="dark"
          />
          <StatPill
            value={joursCouverts.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
            label="Jours couverts ce mois"
            gradient="from-violet-400 via-purple-400 to-fuchsia-500"
            variant="dark"
          />
        </div>
      </AuroraHeader>

      <div className="mx-auto w-full max-w-[1720px] px-4 md:px-6 pb-10 relative z-10">
        {/* ── Navigation mois ── */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <button
            onClick={() => setMoisIdx((i) => Math.max(0, i - 1))}
            disabled={moisIdx === 0}
            aria-label="Mois précédent"
            className="w-11 h-11 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900 hover:shadow disabled:opacity-35 disabled:cursor-not-allowed transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div className="min-w-[220px] text-center">
            <p className="text-xl font-bold text-slate-800">
              {MOIS_LABELS[moisIdx]} {anneeCal}
            </p>
            <p className="text-xs text-slate-400">Année scolaire {anneeScolaire}</p>
          </div>
          <button
            onClick={() => setMoisIdx((i) => Math.min(MOIS_LABELS.length - 1, i + 1))}
            disabled={moisIdx === MOIS_LABELS.length - 1}
            aria-label="Mois suivant"
            className="w-11 h-11 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:text-slate-900 hover:shadow disabled:opacity-35 disabled:cursor-not-allowed transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>

        {/* ── Grille ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {trs.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500 mb-4">Aucun titulaire remplaçant pour le moment.</p>
              <button
                onClick={() => setShowTrPanel(true)}
                className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
              >
                Ajouter les TR
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="border-collapse w-full">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-20 bg-slate-50 border-b border-r border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[170px]">
                      Titulaires remplaçants
                    </th>
                    {jours.map((j) => (
                      <th
                        key={j.day}
                        title={j.nonTravaille || undefined}
                        className={`border-b border-slate-200 px-0 py-1.5 text-center min-w-[42px] ${j.nonTravaille ? 'bg-slate-100' : 'bg-slate-50'}`}
                      >
                        <div className={`text-[10px] font-medium ${j.nonTravaille ? 'text-slate-400' : 'text-slate-400'}`}>
                          {JOURS_COURTS[j.dow]}
                        </div>
                        <div className={`text-xs font-bold ${j.nonTravaille ? 'text-slate-400' : 'text-slate-700'}`}>
                          {j.day}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trs.map((tr) => (
                    <tr key={tr.id}>
                      <td className="sticky left-0 z-10 bg-white border-b border-r border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 whitespace-nowrap">
                        {tr.nom}
                      </td>
                      {jours.map((j) => {
                        if (j.nonTravaille) {
                          return (
                            <td
                              key={j.day}
                              title={j.nonTravaille}
                              className="border-b border-l border-slate-100 bg-slate-100 h-12"
                            />
                          );
                        }
                        const cell = getCellRemplacements(remplacementsDuMois, tr.id, j.iso);
                        if (cell.journee) {
                          const r = cell.journee;
                          return (
                            <td key={j.day} className="border-b border-l border-slate-100 p-0 h-12">
                              <button
                                onClick={() => setDetail(r)}
                                title={`${r.ecole_nom} — ${r.enseignants.join(', ')}`}
                                aria-label={`Remplacement ${tr.nom} le ${fmtDateFr(j.iso)} : ${r.ecole_nom}`}
                                className="w-full h-12 block hover:opacity-80 transition-opacity"
                                style={{ backgroundColor: ecoleColors[r.ecole_uai] }}
                              />
                            </td>
                          );
                        }
                        return (
                          <td key={j.day} className="border-b border-l border-slate-100 p-0 h-12">
                            <div className="flex flex-col h-12">
                              {([['matin', cell.matin], ['apres-midi', cell.apresMidi]] as [Plage, Remplacement | undefined][]).map(
                                ([plage, r]) =>
                                  r ? (
                                    <button
                                      key={plage}
                                      onClick={() => setDetail(r)}
                                      title={`${PLAGE_LABELS[plage]} · ${r.ecole_nom} — ${r.enseignants.join(', ')}`}
                                      aria-label={`Remplacement ${tr.nom} le ${fmtDateFr(j.iso)} (${PLAGE_LABELS[plage]}) : ${r.ecole_nom}`}
                                      className="flex-1 hover:opacity-80 transition-opacity"
                                      style={{ backgroundColor: ecoleColors[r.ecole_uai] }}
                                    />
                                  ) : (
                                    <button
                                      key={plage}
                                      onClick={() =>
                                        openCreate(tr.id, j.iso, cell.matin || cell.apresMidi ? plage : 'journee')
                                      }
                                      title={`Ajouter un remplacement — ${tr.nom}, ${fmtDateFr(j.iso)}`}
                                      aria-label={`Ajouter un remplacement pour ${tr.nom} le ${fmtDateFr(j.iso)}`}
                                      className="flex-1 hover:bg-primary-50 transition-colors"
                                    />
                                  )
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Légende ── */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
          {legendeEcoles.map(([uai, nom]) => (
            <span key={uai} className="inline-flex items-center gap-2">
              <span className="w-4 h-4 rounded" style={{ backgroundColor: ecoleColors[uai] }} />
              {nom}
            </span>
          ))}
          <span className="inline-flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-slate-200" />
            Week-end · férié · vacances
          </span>
          <span className="inline-flex items-center gap-2 text-slate-400">
            Demi-case : matin en haut, après-midi en bas
          </span>
        </div>
      </div>

      {/* ── Popup détail ── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-md shrink-0" style={{ backgroundColor: ecoleColors[detail.ecole_uai] }} />
                <h3 className="text-lg font-bold text-slate-800">{detail.ecole_nom}</h3>
              </div>
              <button onClick={() => setDetail(null)} aria-label="Fermer" className="text-slate-400 hover:text-slate-600 p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <dl className="space-y-2 text-sm mb-6">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Titulaire remplaçant</dt>
                <dd className="font-medium text-slate-800 text-right">{trs.find((t) => t.id === detail.tr_id)?.nom || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Enseignant(s) remplacé(s)</dt>
                <dd className="font-medium text-slate-800 text-right">{detail.enseignants.join(', ') || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Période</dt>
                <dd className="font-medium text-slate-800 text-right">
                  {detail.date_debut === detail.date_fin
                    ? `Le ${fmtDateFr(detail.date_debut)}`
                    : `Du ${fmtDateFr(detail.date_debut)} au ${fmtDateFr(detail.date_fin)}`}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Créneau</dt>
                <dd className="font-medium text-slate-800 text-right">{PLAGE_LABELS[detail.plage]}</dd>
              </div>
            </dl>
            <div className="flex gap-3">
              <button
                onClick={() => openEdit(detail)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
              >
                Éditer
              </button>
              <button
                onClick={() => handleDelete(detail)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal création / édition ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(null)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-800 mb-5">
              {modal.mode === 'edit' ? 'Modifier le remplacement' : 'Nouveau remplacement'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Titulaire remplaçant
                </label>
                <select
                  value={modal.tr_id}
                  onChange={(e) => setModal({ ...modal, tr_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {trs.map((t) => (
                    <option key={t.id} value={t.id}>{t.nom}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={modal.date_debut}
                    onChange={(e) => {
                      const debut = e.target.value;
                      setModal({ ...modal, date_debut: debut, date_fin: modal.date_fin < debut ? debut : modal.date_fin });
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Date de fin
                  </label>
                  <input
                    type="date"
                    value={modal.date_fin}
                    min={modal.date_debut}
                    onChange={(e) => setModal({ ...modal, date_fin: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Créneau
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(PLAGE_LABELS) as Plage[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setModal({ ...modal, plage: p })}
                      className={`px-2 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                        modal.plage === p
                          ? 'bg-primary-600 border-primary-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {PLAGE_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  École du remplacement
                </label>
                <select
                  value={modal.ecole_uai}
                  onChange={(e) => setModal({ ...modal, ecole_uai: e.target.value, enseignants: [] })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">— Choisir une école —</option>
                  {ecoles.map((e) => (
                    <option key={e.uai} value={e.uai}>{ecoleLabel(e)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Enseignant(s) remplacé(s)
                </label>
                {modal.enseignants.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {modal.enseignants.map((n) => (
                      <span
                        key={n}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium"
                      >
                        {n}
                        <button
                          type="button"
                          onClick={() => toggleEnseignant(n)}
                          aria-label={`Retirer ${n}`}
                          className="hover:text-primary-900"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {modal.ecole_uai ? (
                  enseignantsEcole.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl max-h-44 overflow-y-auto divide-y divide-slate-100">
                      {enseignantsEcole.map((n) => (
                        <label key={n} className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={modal.enseignants.includes(n)}
                            onChange={() => toggleEnseignant(n)}
                            className="w-4 h-4 rounded accent-primary-600"
                          />
                          {n}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mb-1">Aucun enseignant connu pour cette école — saisie libre ci-dessous.</p>
                  )
                ) : (
                  <p className="text-xs text-slate-400 mb-1">Choisissez d&apos;abord une école pour afficher ses enseignants.</p>
                )}
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={saisieLibre}
                    onChange={(e) => setSaisieLibre(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSaisieLibre();
                      }
                    }}
                    placeholder="Ou saisir un nom…"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={addSaisieLibre}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
                  >
                    Ajouter
                  </button>
                </div>
              </div>

              {modalError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5">{modalError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Panneau gestion des TR ── */}
      {showTrPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowTrPanel(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Gérer les titulaires remplaçants</h3>
              <button onClick={() => setShowTrPanel(false)} aria-label="Fermer" className="text-slate-400 hover:text-slate-600 p-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={nouveauTr}
                onChange={(e) => setNouveauTr(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTr();
                  }
                }}
                placeholder="Nom du TR à ajouter…"
                className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleAddTr}
                className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
              >
                Ajouter
              </button>
            </div>

            <div className="flex-1 overflow-y-auto -mx-2 px-2">
              {trs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Aucun TR enregistré.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {trs.map((tr, i) => (
                    <li key={tr.id} className="flex items-center gap-2 py-2">
                      <input
                        type="text"
                        defaultValue={tr.nom}
                        onBlur={(e) => {
                          if (e.target.value.trim() && e.target.value.trim() !== tr.nom) {
                            handleRenameTr(tr.id, e.target.value);
                          }
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        onClick={() => handleMoveTr(i, -1)}
                        disabled={i === 0}
                        aria-label={`Monter ${tr.nom}`}
                        className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-25"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
                      </button>
                      <button
                        onClick={() => handleMoveTr(i, 1)}
                        disabled={i === trs.length - 1}
                        aria-label={`Descendre ${tr.nom}`}
                        className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-25"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                      </button>
                      <button
                        onClick={() => handleDeleteTr(tr)}
                        aria-label={`Supprimer ${tr.nom}`}
                        className="p-1.5 text-slate-400 hover:text-red-600"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" /></svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-3">
              Supprimer un TR supprime aussi tous ses remplacements enregistrés.
            </p>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl bg-slate-900 text-white text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
