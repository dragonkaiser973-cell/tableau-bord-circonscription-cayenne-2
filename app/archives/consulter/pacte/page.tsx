'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { exportStyledExcel, ExcelSheetDef } from '@/lib/excelExport';
import PageLoader from '@/components/PageLoader';
import {
  MISSIONS,
  MISSIONS_SUIVI,
  PacteAttribution,
  PacteRepartitionPubliee,
  PacteSuiviPublie,
  computeRepartitionStats,
  moisLabelFromKey,
  publicationToRepartition,
  totalHeuresLigne,
  totalParts,
} from '@/app/outils/pacte/types';

function fmtDateFr(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR');
}

function PacteArchivesContent() {
  const [attributions, setAttributions] = useState<PacteAttribution[]>([]);
  const [repartitions, setRepartitions] = useState<PacteRepartitionPubliee[]>([]);
  const [suivis, setSuivis] = useState<PacteSuiviPublie[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>('');
  const searchParams = useSearchParams();
  const annee = searchParams.get('annee');
  const router = useRouter();

  useEffect(() => {
    if (!annee) {
      router.push('/archives');
      return;
    }
    (async () => {
      try {
        const [resAttr, resRep, resSuivis] = await Promise.all([
          fetch(`/api/archives/data?annee=${annee}&type=pacte_attributions`),
          fetch(`/api/archives/data?annee=${annee}&type=pacte_repartitions`),
          fetch(`/api/archives/data?annee=${annee}&type=pacte_suivis`),
        ]);
        const attr = await resAttr.json();
        const rep = await resRep.json();
        const suiv = await resSuivis.json();
        setAttributions(Array.isArray(attr) ? attr : []);
        const reps: PacteRepartitionPubliee[] = Array.isArray(rep) ? rep : [];
        reps.sort((a, b) => (a.ecole_name || '').localeCompare(b.ecole_name || '', 'fr'));
        setRepartitions(reps);
        if (reps.length > 0) setSelected(reps[0].ecole_id);
        setSuivis(Array.isArray(suiv) ? suiv : []);
      } catch (error) {
        console.error('Erreur chargement:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [annee, router]);

  const attribByEcole = useMemo(() => {
    const map = new Map<string, PacteAttribution>();
    for (const a of attributions) map.set(a.ecole_id, a);
    return map;
  }, [attributions]);

  const suivisParMois = useMemo(() => {
    const map = new Map<string, PacteSuiviPublie[]>();
    for (const s of suivis) {
      const arr = map.get(s.mois) ?? [];
      arr.push(s);
      map.set(s.mois, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [suivis]);

  const handleExportExcel = async () => {
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const sheets: ExcelSheetDef[] = [];

    sheets.push({
      name: 'Répartitions',
      title: `Répartition pacte — archive ${annee}`,
      subtitle: `Circonscription Cayenne 2 · Exporté le ${dateStr} · ${repartitions.length} fiche${repartitions.length > 1 ? 's' : ''}`,
      columns: [
        { header: 'École', key: 'ecole', width: 28 },
        { header: 'Enseignant', key: 'enseignant', width: 30 },
        ...MISSIONS.map((m) => ({ header: m.shortLabel, key: `m_${m.key}`, width: 14, align: 'center' as const })),
        { header: 'Parts', key: 'total', width: 8, align: 'center' as const },
      ],
      rows: repartitions.flatMap((pub) =>
        (pub.lignes || []).map((l) => {
          const row: Record<string, unknown> = {
            ecole: pub.ecole_name,
            enseignant: `${l.nom} ${l.prenom}`.trim(),
            total: totalParts(l.parts),
          };
          for (const m of MISSIONS) row[`m_${m.key}`] = l.parts?.[m.key] || '';
          return row;
        }),
      ),
    });

    if (suivis.length > 0) {
      sheets.push({
        name: 'Suivis mensuels',
        title: `Tableau de suivi pacte — archive ${annee}`,
        subtitle: `${suivis.length} fiche${suivis.length > 1 ? 's' : ''} mensuelle${suivis.length > 1 ? 's' : ''}`,
        columns: [
          { header: 'Mois', key: 'mois', width: 16 },
          { header: 'École', key: 'ecole', width: 28 },
          { header: 'Enseignant', key: 'enseignant', width: 30 },
          ...MISSIONS_SUIVI.map((m) => ({ header: `${m.shortLabel} (h)`, key: `m_${m.key}`, width: 16, align: 'center' as const })),
          { header: 'Heures', key: 'total', width: 10, align: 'center' as const },
        ],
        rows: suivis.flatMap((s) =>
          (s.lignes || []).map((l) => {
            const row: Record<string, unknown> = {
              mois: moisLabelFromKey(s.mois),
              ecole: s.ecole_name,
              enseignant: `${l.nom} ${l.prenom}`.trim(),
              total: totalHeuresLigne({ nom: '', prenom: '', ecole: '', missions: l.missions ?? {} }),
            };
            for (const m of MISSIONS_SUIVI) row[`m_${m.key}`] = l.missions?.[m.key]?.heures || '';
            return row;
          }),
        ),
      });
    }

    await exportStyledExcel(`Pacte_Archive_${annee}_${new Date().toISOString().slice(0, 10)}`, sheets);
  };

  if (loading) {
    return <PageLoader />;
  }

  const ficheSel = repartitions.find((f) => f.ecole_id === selected);
  const repSel = ficheSel ? publicationToRepartition(ficheSel, ficheSel.ecole_id) : null;
  const statsSel = repSel ? computeRepartitionStats(repSel, attribByEcole.get(repSel.ecoleId) ?? null) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      {/* Header */}
      <div className="text-white py-16 px-6">
        <div className="container mx-auto">
          <Link
            href={`/archives/consulter?annee=${annee}`}
            className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6"
          >
            ← Retour à l&apos;archive {annee}
          </Link>

          <div className="bg-amber-500/20 border-2 border-amber-300 rounded-lg p-4 mb-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📖</span>
              <div>
                <h3 className="text-lg font-bold">Mode Consultation Archive</h3>
                <p className="opacity-90">Vous consultez le PACTE de l&apos;année scolaire {annee}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">🤝</div>
              <div>
                <h1 className="text-5xl font-bold">PACTE {annee}</h1>
                <p className="text-xl opacity-90 mt-2">
                  {repartitions.length} répartition{repartitions.length > 1 ? 's' : ''} · {suivis.length} suivi{suivis.length > 1 ? 's' : ''} mensuel{suivis.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {(repartitions.length > 0 || suivis.length > 0) && (
              <button
                onClick={handleExportExcel}
                className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                📊 Exporter en Excel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="container mx-auto px-6 pb-12 space-y-8">
        {/* Synthèse répartitions */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Répartitions par école</h2>
          {repartitions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Aucune répartition archivée pour cette année scolaire.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th className="text-left">École</th>
                    <th className="text-left">Directeur</th>
                    <th>Attribué</th>
                    <th>Réparti</th>
                    <th>Enseignants</th>
                    <th>Publié le</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {repartitions.map((pub) => {
                    const rep = publicationToRepartition(pub, pub.ecole_id);
                    const stats = computeRepartitionStats(rep, attribByEcole.get(pub.ecole_id) ?? null);
                    return (
                      <tr key={pub.ecole_id} className={selected === pub.ecole_id ? 'bg-emerald-50' : ''}>
                        <td className="font-medium">{pub.ecole_name}</td>
                        <td>{pub.directeur_name}</td>
                        <td className="text-center font-bold tabular-nums">{stats.totalAttribue}</td>
                        <td className="text-center font-bold tabular-nums">{stats.totalReparti}</td>
                        <td className="text-center tabular-nums">{stats.nbEnseignants}</td>
                        <td className="text-center">{fmtDateFr(pub.published_at)}</td>
                        <td className="text-center">
                          <button
                            onClick={() => setSelected(pub.ecole_id)}
                            className="text-emerald-700 hover:text-emerald-900 text-sm font-semibold"
                          >
                            Voir
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Détail d'une répartition */}
        {repSel && statsSel && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">{repSel.ecole}</h2>
            <p className="text-sm text-gray-500 mb-4">
              {repSel.auteur} · {statsSel.totalReparti}/{statsSel.totalAttribue} parts réparties
            </p>
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th className="text-left">Nom</th>
                    <th className="text-left">Prénom</th>
                    {MISSIONS.map((m) => (
                      <th key={m.key} title={m.label}>{m.shortLabel}</th>
                    ))}
                    <th>Parts</th>
                  </tr>
                </thead>
                <tbody>
                  {repSel.lignes.map((l, i) => (
                    <tr key={i}>
                      <td className="font-medium">{l.nom}</td>
                      <td>{l.prenom}</td>
                      {MISSIONS.map((m) => (
                        <td key={m.key} className="text-center tabular-nums">{l.parts[m.key] || ''}</td>
                      ))}
                      <td className="text-center font-bold tabular-nums">{totalParts(l.parts)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-gray-50">
                    <td colSpan={2}>Total</td>
                    {MISSIONS.map((m) => (
                      <td key={m.key} className="text-center tabular-nums">{statsSel.repartiParMission[m.key] || ''}</td>
                    ))}
                    <td className="text-center tabular-nums">{statsSel.totalReparti}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Suivis mensuels */}
        {suivisParMois.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Suivis mensuels</h2>
            <div className="space-y-6">
              {suivisParMois.map(([mois, fiches]) => (
                <div key={mois}>
                  <h3 className="text-lg font-bold text-gray-700 mb-2">{moisLabelFromKey(mois)}</h3>
                  <div className="overflow-x-auto">
                    <table className="data-table w-full">
                      <thead>
                        <tr>
                          <th className="text-left">École</th>
                          <th className="text-left">Enseignant</th>
                          {MISSIONS_SUIVI.map((m) => (
                            <th key={m.key} title={m.label}>{m.shortLabel} (h)</th>
                          ))}
                          <th>Heures</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fiches.flatMap((s) =>
                          (s.lignes || []).map((l, i) => (
                            <tr key={`${s.ecole_id}-${i}`}>
                              <td className="font-medium">{l.ecole || s.ecole_name}</td>
                              <td>{`${l.nom} ${l.prenom}`.trim()}</td>
                              {MISSIONS_SUIVI.map((m) => (
                                <td key={m.key} className="text-center tabular-nums">{l.missions?.[m.key]?.heures || ''}</td>
                              ))}
                              <td className="text-center font-bold tabular-nums">
                                {totalHeuresLigne({ nom: '', prenom: '', ecole: '', missions: l.missions ?? {} })}
                              </td>
                            </tr>
                          )),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PacteArchivesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PacteArchivesContent />
    </Suspense>
  );
}
