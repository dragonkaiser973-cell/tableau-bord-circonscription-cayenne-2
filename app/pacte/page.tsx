'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuroraHeader from '@/components/AuroraHeader';
import StatPill from '@/components/StatPill';
import PageLoader from '@/components/PageLoader';
import {
  MISSIONS,
  MOIS_LABELS,
  MissionKey,
  PacteAttribution,
  PacteRepartitionPubliee,
  PacteSuiviPublie,
  moisKey,
  publicationToRepartition,
  publicationToSuivi,
  totalHeuresLigne,
  totalParts,
} from '@/app/outils/pacte/types';
import { exportRecapCircoXlsx, exportSuivisMoisXlsx } from '@/app/outils/pacte/xlsx-io';

// ─── Pilotage PACTE (espace réservé) ─────────────────────────────────────────
// Saisie des parts attribuées par l'IEN (écriture authentifiée) + tableau de
// bord attribué / réparti / suivi par école + exports récapitulatifs circo.

type EcoleAnnuaire = { id: string; name: string; ordre?: number };

export default function PacteCircoPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const [ecoles, setEcoles] = useState<EcoleAnnuaire[]>([]);
  const [attributions, setAttributions] = useState<PacteAttribution[]>([]);
  const [repartitions, setRepartitions] = useState<PacteRepartitionPubliee[]>([]);
  const [suivis, setSuivis] = useState<PacteSuiviPublie[]>([]);
  const [anneeScolaire, setAnneeScolaire] = useState('2025-2026');
  const [moisIdx, setMoisIdx] = useState(0);

  // Saisie locale des attributions : { ecoleId: { missionKey: n } }, enregistrée à la demande.
  const [edits, setEdits] = useState<Record<string, Partial<Record<MissionKey, number>>>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const [annuaire, attribs, reps, suiv, cfg] = await Promise.all([
          fetch('/api/annuaire').then((r) => r.json()).catch(() => null),
          fetch('/api/pacte/attributions').then((r) => r.json()).catch(() => []),
          fetch('/api/pacte/repartitions').then((r) => r.json()).catch(() => []),
          fetch('/api/pacte/suivis').then((r) => r.json()).catch(() => []),
          fetch('/api/config').then((r) => r.json()).catch(() => null),
        ]);
        const listEcoles: EcoleAnnuaire[] = (annuaire?.ecoles ?? [])
          .map((e: any) => ({ id: e.id, name: e.name, ordre: e.ordre }))
          .sort((a: EcoleAnnuaire, b: EcoleAnnuaire) => a.name.localeCompare(b.name, 'fr'));
        setEcoles(listEcoles);
        setAttributions(Array.isArray(attribs) ? attribs : []);
        setRepartitions(Array.isArray(reps) ? reps : []);
        setSuivis(Array.isArray(suiv) ? suiv : []);
        if (cfg?.annee_scolaire_actuelle) setAnneeScolaire(cfg.annee_scolaire_actuelle);
        const idx = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6].indexOf(new Date().getMonth());
        setMoisIdx(idx >= 0 ? idx : 0);
      } catch (e) {
        console.error('Erreur chargement pacte circo:', e);
        showToast('Erreur de chargement des données.');
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated, showToast]);

  const attribByEcole = useMemo(() => {
    const map = new Map<string, PacteAttribution>();
    for (const a of attributions) map.set(a.ecole_id, a);
    return map;
  }, [attributions]);

  const repByEcole = useMemo(() => {
    const map = new Map<string, PacteRepartitionPubliee>();
    for (const r of repartitions) map.set(r.ecole_id, r);
    return map;
  }, [repartitions]);

  const partsOf = (ecoleId: string): Partial<Record<MissionKey, number>> =>
    edits[ecoleId] ?? attribByEcole.get(ecoleId)?.parts ?? {};

  const repartiOf = useCallback(
    (ecoleId: string): number => {
      const pub = repByEcole.get(ecoleId);
      if (!pub) return 0;
      return (pub.lignes || []).reduce((s, l) => s + totalParts(l?.parts ?? {}), 0);
    },
    [repByEcole],
  );

  const heuresOf = useCallback(
    (ecoleId: string): number => {
      let total = 0;
      for (const s of suivis) {
        if (s.ecole_id !== ecoleId) continue;
        for (const l of s.lignes || []) total += totalHeuresLigne({ nom: '', prenom: '', ecole: '', missions: l?.missions ?? {} });
      }
      return total;
    },
    [suivis],
  );

  const totaux = useMemo(() => {
    let attribue = 0;
    let reparti = 0;
    let heures = 0;
    for (const e of ecoles) {
      attribue += totalParts(partsOf(e.id));
      reparti += repartiOf(e.id);
      heures += heuresOf(e.id);
    }
    return { attribue, reparti, heures };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ecoles, edits, attributions, repartitions, suivis]);

  const setPart = (ecoleId: string, mission: MissionKey, v: number) => {
    setEdits((prev) => {
      const cur = { ...(prev[ecoleId] ?? attribByEcole.get(ecoleId)?.parts ?? {}) };
      if (v > 0) cur[mission] = v;
      else delete cur[mission];
      return { ...prev, [ecoleId]: cur };
    });
    setDirty((prev) => new Set(prev).add(ecoleId));
  };

  const saveAll = async () => {
    if (dirty.size === 0) return;
    setSaving(true);
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('authToken')}`,
    };
    let ok = 0;
    let ko = 0;
    for (const ecoleId of dirty) {
      const ecole = ecoles.find((e) => e.id === ecoleId);
      if (!ecole) continue;
      try {
        const res = await fetch('/api/pacte/attributions', {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            ecole_id: ecoleId,
            ecole_name: ecole.name,
            annee_n: anneeScolaire,
            parts: edits[ecoleId] ?? {},
          }),
        });
        if (res.ok) ok++;
        else ko++;
      } catch {
        ko++;
      }
    }
    try {
      const res = await fetch('/api/pacte/attributions');
      const data = await res.json();
      if (Array.isArray(data)) setAttributions(data);
    } catch { /* refresh best-effort */ }
    setEdits({});
    setDirty(new Set());
    setSaving(false);
    showToast(ko === 0 ? `Attributions enregistrées (${ok} école${ok > 1 ? 's' : ''}).` : `${ok} enregistrée(s), ${ko} en échec.`);
  };

  const onExportRecap = async () => {
    const blocs = repartitions
      .slice()
      .sort((a, b) => (a.ecole_name || '').localeCompare(b.ecole_name || '', 'fr'))
      .map((pub) => ({
        repartition: publicationToRepartition(pub, pub.ecole_id),
        attribution: attribByEcole.get(pub.ecole_id) ?? null,
      }));
    if (blocs.length === 0) {
      showToast('Aucune répartition publiée à exporter.');
      return;
    }
    await exportRecapCircoXlsx(anneeScolaire, blocs);
    showToast('Récapitulatif généré.');
  };

  const onExportSuivisMois = async () => {
    const mois = moisKey(moisIdx, anneeScolaire);
    const duMois = suivis
      .filter((s) => s.mois === mois)
      .sort((a, b) => (a.ecole_name || '').localeCompare(b.ecole_name || '', 'fr'))
      .map(publicationToSuivi);
    if (duMois.length === 0) {
      showToast(`Aucun suivi publié pour ${MOIS_LABELS[moisIdx]}.`);
      return;
    }
    await exportSuivisMoisXlsx(mois, duMois);
    showToast('Export des suivis généré.');
  };

  if (!isAuthenticated || loading) return <PageLoader />;

  const curMois = moisKey(moisIdx, anneeScolaire);
  const suivisDuMois = suivis.filter((s) => s.mois === curMois);

  return (
    <div className="min-h-screen bg-slate-50">
      <AuroraHeader
        kicker={`Espace réservé · PACTE ${anneeScolaire}`}
        title="Pilotage du"
        titleAccent="PACTE."
        subtitle="Attribuer les parts fonctionnelles par école et par mission, suivre les répartitions publiées par les directeurs et les heures déclarées chaque mois."
        backLabel="Retour à l'accueil"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onExportRecap}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white text-sm font-medium backdrop-blur-md transition-colors"
            >
              📊 Récap répartitions .xlsx
            </button>
            <button
              onClick={onExportSuivisMois}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white text-sm font-medium backdrop-blur-md transition-colors"
            >
              ⏱️ Suivis du mois .xlsx
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap gap-3">
          <StatPill value={String(totaux.attribue)} label="Parts attribuées" gradient="from-teal-400 via-cyan-400 to-sky-500" variant="dark" />
          <StatPill
            value={String(totaux.reparti)}
            label="Parts réparties"
            sub={`${repartitions.length} école${repartitions.length > 1 ? 's' : ''} publiée${repartitions.length > 1 ? 's' : ''}`}
            gradient="from-amber-400 via-orange-400 to-rose-500"
            variant="dark"
          />
          <StatPill
            value={totaux.heures.toLocaleString('fr-FR')}
            label="Heures déclarées"
            sub="cumul année"
            gradient="from-violet-400 via-purple-400 to-fuchsia-500"
            variant="dark"
          />
        </div>
      </AuroraHeader>

      <div className="mx-auto w-full max-w-[1500px] px-4 md:px-6 pb-16 relative z-10">
        {/* ── Attributions ── */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm mt-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="font-[Outfit,sans-serif] font-bold text-slate-900 tracking-tight">Parts attribuées par école</h2>
              <p className="text-xs text-slate-500">
                Fixées par l&apos;IEN — visibles (verrouillées) par les directeurs dans l&apos;outil PACTE.
              </p>
            </div>
            <button
              onClick={saveAll}
              disabled={dirty.size === 0 || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white px-4 py-2.5 text-sm font-medium transition-colors"
            >
              {saving ? 'Enregistrement…' : dirty.size > 0 ? `Enregistrer (${dirty.size})` : 'Enregistrer'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/60">
                  <th className="sticky left-0 z-10 bg-slate-50 text-left text-[11px] font-bold uppercase text-slate-600 px-4 py-2 border-b border-slate-200 min-w-[220px]">École</th>
                  {MISSIONS.map((m) => (
                    <th key={m.key} title={m.label} className="text-[11px] font-bold uppercase text-slate-600 px-2 py-2 border-b border-slate-200 min-w-[105px]">
                      {m.shortLabel}
                    </th>
                  ))}
                  <th className="text-[11px] font-bold uppercase text-slate-600 px-2 py-2 border-b border-slate-200 min-w-[70px]">Total</th>
                </tr>
              </thead>
              <tbody>
                {ecoles.map((e) => {
                  const parts = partsOf(e.id);
                  const isDirty = dirty.has(e.id);
                  return (
                    <tr key={e.id} className={`border-b border-slate-100 ${isDirty ? 'bg-amber-50/40' : 'hover:bg-slate-50/50'}`}>
                      <td className="sticky left-0 z-10 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 whitespace-nowrap border-r border-slate-100">
                        {e.name}
                        {isDirty && <span className="ml-2 text-[10px] text-amber-600 font-semibold">modifié</span>}
                      </td>
                      {MISSIONS.map((m) => (
                        <td key={m.key} className="px-1 py-1">
                          <input
                            inputMode="numeric"
                            value={parts[m.key] ? String(parts[m.key]) : ''}
                            onChange={(ev) => {
                              const v = ev.target.value.replace(/[^0-9]/g, '');
                              setPart(e.id, m.key, v === '' ? 0 : Number(v));
                            }}
                            onFocus={(ev) => ev.target.select()}
                            placeholder="·"
                            className="w-full text-center tabular-nums border border-transparent rounded-md py-1.5 text-[13px] font-semibold text-slate-900 outline-none hover:bg-slate-100/70 focus:bg-white focus:ring-2 focus:ring-primary-400 transition-colors"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-center text-sm font-bold tabular-nums text-slate-800">{totalParts(parts) || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50/80">
                  <td className="sticky left-0 z-10 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-slate-600 border-t border-slate-200">Total circo</td>
                  {MISSIONS.map((m) => {
                    const t = ecoles.reduce((s, e) => s + (Number(partsOf(e.id)[m.key]) || 0), 0);
                    return (
                      <td key={m.key} className="px-2 py-2 text-center text-sm font-bold tabular-nums text-slate-900 border-t border-slate-200">
                        {t || ''}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center text-sm font-bold tabular-nums text-slate-900 border-t border-slate-200">{totaux.attribue}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* ── Tableau de bord ── */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm mt-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="font-[Outfit,sans-serif] font-bold text-slate-900 tracking-tight">Suivi par école</h2>
              <p className="text-xs text-slate-500">Répartitions publiées par les directeurs et heures déclarées.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMoisIdx((i) => Math.max(0, i - 1))}
                disabled={moisIdx === 0}
                aria-label="Mois précédent"
                className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-35 transition-all"
              >
                ‹
              </button>
              <span className="min-w-[120px] text-center text-sm font-bold text-slate-800">{MOIS_LABELS[moisIdx]}</span>
              <button
                onClick={() => setMoisIdx((i) => Math.min(MOIS_LABELS.length - 1, i + 1))}
                disabled={moisIdx === MOIS_LABELS.length - 1}
                aria-label="Mois suivant"
                className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-35 transition-all"
              >
                ›
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/60">
                  <th className="text-left text-[11px] font-bold uppercase text-slate-600 px-4 py-2 border-b border-slate-200 min-w-[220px]">École</th>
                  <th className="text-[11px] font-bold uppercase text-slate-600 px-2 py-2 border-b border-slate-200">Attribué</th>
                  <th className="text-[11px] font-bold uppercase text-slate-600 px-2 py-2 border-b border-slate-200">Réparti</th>
                  <th className="text-[11px] font-bold uppercase text-slate-600 px-2 py-2 border-b border-slate-200 min-w-[150px]">Répartition publiée</th>
                  <th className="text-[11px] font-bold uppercase text-slate-600 px-2 py-2 border-b border-slate-200 min-w-[130px]">Suivi {MOIS_LABELS[moisIdx]}</th>
                  <th className="text-[11px] font-bold uppercase text-slate-600 px-2 py-2 border-b border-slate-200">Heures (année)</th>
                </tr>
              </thead>
              <tbody>
                {ecoles.map((e) => {
                  const attribue = totalParts(partsOf(e.id));
                  const reparti = repartiOf(e.id);
                  const pub = repByEcole.get(e.id);
                  const suiviMois = suivisDuMois.find((s) => s.ecole_id === e.id);
                  const heuresMois = suiviMois
                    ? (suiviMois.lignes || []).reduce((s, l) => s + totalHeuresLigne({ nom: '', prenom: '', ecole: '', missions: l?.missions ?? {} }), 0)
                    : 0;
                  if (!attribue && !pub && !suiviMois) return null;
                  return (
                    <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-sm font-medium text-slate-700 whitespace-nowrap">{e.name}</td>
                      <td className="px-2 py-2 text-center text-sm font-bold tabular-nums text-slate-800">{attribue || '—'}</td>
                      <td className={`px-2 py-2 text-center text-sm font-bold tabular-nums ${reparti > attribue ? 'text-rose-600' : reparti === attribue && attribue > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {pub ? reparti : '—'}
                      </td>
                      <td className="px-2 py-2 text-center text-xs text-slate-600">
                        {pub ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 font-semibold">
                            ✓ {new Date(pub.published_at).toLocaleDateString('fr-FR')}
                          </span>
                        ) : (
                          <span className="text-slate-400">non publiée</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center text-xs">
                        {suiviMois ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 text-teal-700 px-2.5 py-1 font-semibold">
                            {heuresMois.toLocaleString('fr-FR')} h
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-bold tabular-nums text-slate-800">
                        {heuresOf(e.id) ? `${heuresOf(e.id).toLocaleString('fr-FR')} h` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl bg-slate-900 text-white text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
