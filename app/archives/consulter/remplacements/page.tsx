'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { exportStyledExcel, ExcelSheetDef } from '@/lib/excelExport';
import PageLoader from '@/components/PageLoader';
import {
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
} from '@/app/remplacements/dates';

function fmtDateFr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function RemplacementsArchivesContent() {
  const [trs, setTrs] = useState<TitulaireRemplacant[]>([]);
  const [remplacements, setRemplacements] = useState<Remplacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [moisIdx, setMoisIdx] = useState(0);
  const [detail, setDetail] = useState<Remplacement | null>(null);
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
        const [resRempl, resTrs] = await Promise.all([
          fetch(`/api/archives/data?annee=${annee}&type=remplacements`),
          fetch(`/api/archives/data?annee=${annee}&type=remplacements_tr`),
        ]);
        const dataRempl = await resRempl.json();
        const dataTrs = await resTrs.json();

        const rows: Remplacement[] = (Array.isArray(dataRempl) ? dataRempl : []).map((r: any) => ({
          ...r,
          enseignants: Array.isArray(r.enseignants) ? r.enseignants : [],
        }));
        setRemplacements(rows);

        let listTrs: TitulaireRemplacant[] = Array.isArray(dataTrs) ? dataTrs : [];
        // Filet de sécurité pour les archives sans photo des TR : on reconstruit
        // les lignes depuis les remplacements eux-mêmes.
        if (listTrs.length === 0 && rows.length > 0) {
          const ids = [...new Set(rows.map((r) => r.tr_id))];
          listTrs = ids.map((id, i) => ({ id, nom: `TR ${i + 1}`, ordre: i }));
        }
        listTrs.sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, 'fr'));
        // N'afficher que les TR ayant eu au moins un remplacement dans l'année,
        // plus lisible en consultation figée.
        const actifs = new Set(rows.map((r) => r.tr_id));
        const filtres = listTrs.filter((t) => actifs.has(t.id));
        setTrs(filtres.length > 0 ? filtres : listTrs);
      } catch (error) {
        console.error('Erreur chargement:', error);
        setRemplacements([]);
        setTrs([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [annee, router]);

  const [anneeDebut] = getYearsFromAnnee(annee || '');
  const anneeCal = anneeDuMois(moisIdx, anneeDebut);
  const moisCal = MOIS_INDICES[moisIdx];
  const nbJours = daysInMonth(anneeCal, moisCal);

  const jours = useMemo(
    () =>
      Array.from({ length: nbJours }, (_, i) => {
        const day = i + 1;
        return {
          day,
          iso: toISO(anneeCal, moisCal, day),
          dow: new Date(anneeCal, moisCal, day).getDay(),
          nonTravaille: getJourNonTravaille(anneeCal, moisCal, day, anneeDebut),
        };
      }),
    [anneeCal, moisCal, nbJours, anneeDebut]
  );

  const ecoleColors = useMemo(() => buildEcoleColors(remplacements), [remplacements]);

  const moisDebutISO = toISO(anneeCal, moisCal, 1);
  const moisFinISO = toISO(anneeCal, moisCal, nbJours);
  const remplacementsDuMois = useMemo(
    () => remplacements.filter((r) => r.date_debut <= moisFinISO && r.date_fin >= moisDebutISO),
    [remplacements, moisDebutISO, moisFinISO]
  );

  const legendeEcoles = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of remplacementsDuMois) {
      if (!seen.has(r.ecole_uai)) seen.set(r.ecole_uai, r.ecole_nom);
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
  }, [remplacementsDuMois]);

  const trById = useMemo(() => new Map(trs.map((t) => [t.id, t.nom])), [trs]);

  const handleExportExcel = async () => {
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const sheet: ExcelSheetDef = {
      name: 'Remplacements',
      title: `Remplacements TR — archive ${annee}`,
      subtitle: `Circonscription Cayenne 2 · Exporté le ${dateStr} · ${remplacements.length} remplacement${remplacements.length > 1 ? 's' : ''}`,
      columns: [
        { header: 'Titulaire remplaçant', key: 'tr', width: 26 },
        { header: 'École', key: 'ecole', width: 30 },
        { header: 'Enseignant(s) remplacé(s)', key: 'enseignants', width: 34 },
        { header: 'Du', key: 'debut', width: 12, align: 'center' as const },
        { header: 'Au', key: 'fin', width: 12, align: 'center' as const },
        { header: 'Créneau', key: 'plage', width: 16, align: 'center' as const },
      ],
      rows: [...remplacements]
        .sort((a, b) => a.date_debut.localeCompare(b.date_debut))
        .map((r) => ({
          tr: trById.get(r.tr_id) || '—',
          ecole: r.ecole_nom,
          enseignants: r.enseignants.join(', '),
          debut: fmtDateFr(r.date_debut),
          fin: fmtDateFr(r.date_fin),
          plage: PLAGE_LABELS[r.plage],
        })),
    };

    await exportStyledExcel(
      `Remplacements_Archive_${annee}_${new Date().toISOString().slice(0, 10)}`,
      [sheet]
    );
  };

  if (loading) {
    return <PageLoader />;
  }

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
                <p className="opacity-90">
                  Vous consultez les remplacements TR de l&apos;année scolaire {annee}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
                🔄
              </div>
              <div>
                <h1 className="text-5xl font-bold">Remplacements {annee}</h1>
                <p className="text-xl opacity-90 mt-2">
                  {remplacements.length} remplacement{remplacements.length > 1 ? 's' : ''} · {trs.length} titulaire{trs.length > 1 ? 's' : ''} remplaçant{trs.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {remplacements.length > 0 && (
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
      <div className="container mx-auto px-6 pb-12">
        <div className="bg-white rounded-2xl shadow-xl p-6">
          {remplacements.length === 0 ? (
            <p className="text-center text-gray-500 py-12">
              Aucun remplacement archivé pour cette année scolaire.
            </p>
          ) : (
            <>
              {/* Navigation mois */}
              <div className="flex items-center justify-center gap-3 mb-5">
                <button
                  onClick={() => setMoisIdx((i) => Math.max(0, i - 1))}
                  disabled={moisIdx === 0}
                  aria-label="Mois précédent"
                  className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <p className="min-w-[200px] text-center text-lg font-bold text-slate-800">
                  {MOIS_LABELS[moisIdx]} {anneeCal}
                </p>
                <button
                  onClick={() => setMoisIdx((i) => Math.min(MOIS_LABELS.length - 1, i + 1))}
                  disabled={moisIdx === MOIS_LABELS.length - 1}
                  aria-label="Mois suivant"
                  className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>

              {/* Grille (lecture seule) */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
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
                          className={`border-b border-slate-200 px-0 py-1.5 text-center min-w-[38px] ${j.nonTravaille ? 'bg-slate-100' : 'bg-slate-50'}`}
                        >
                          <div className="text-[10px] font-medium text-slate-400">{JOURS_COURTS[j.dow]}</div>
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
                              <td key={j.day} title={j.nonTravaille} className="border-b border-l border-slate-100 bg-slate-100 h-10" />
                            );
                          }
                          const cell = getCellRemplacements(remplacementsDuMois, tr.id, j.iso);
                          if (cell.journee) {
                            const r = cell.journee;
                            return (
                              <td key={j.day} className="border-b border-l border-slate-100 p-0 h-10">
                                <button
                                  onClick={() => setDetail(r)}
                                  title={`${r.ecole_nom} — ${r.enseignants.join(', ')}`}
                                  aria-label={`Remplacement ${tr.nom} le ${fmtDateFr(j.iso)} : ${r.ecole_nom}`}
                                  className="w-full h-10 block hover:opacity-80 transition-opacity"
                                  style={{ backgroundColor: ecoleColors[r.ecole_uai] }}
                                />
                              </td>
                            );
                          }
                          if (!cell.matin && !cell.apresMidi) {
                            return <td key={j.day} className="border-b border-l border-slate-100 h-10" />;
                          }
                          return (
                            <td key={j.day} className="border-b border-l border-slate-100 p-0 h-10">
                              <div className="flex flex-col h-10">
                                {[cell.matin, cell.apresMidi].map((r, half) =>
                                  r ? (
                                    <button
                                      key={half}
                                      onClick={() => setDetail(r)}
                                      title={`${PLAGE_LABELS[r.plage]} · ${r.ecole_nom} — ${r.enseignants.join(', ')}`}
                                      aria-label={`Remplacement ${tr.nom} le ${fmtDateFr(j.iso)} (${PLAGE_LABELS[r.plage]}) : ${r.ecole_nom}`}
                                      className="flex-1 hover:opacity-80 transition-opacity"
                                      style={{ backgroundColor: ecoleColors[r.ecole_uai] }}
                                    />
                                  ) : (
                                    <div key={half} className="flex-1" />
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

              {/* Légende */}
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
              </div>
            </>
          )}
        </div>
      </div>

      {/* Popup détail (lecture seule) */}
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
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Titulaire remplaçant</dt>
                <dd className="font-medium text-slate-800 text-right">{trById.get(detail.tr_id) || '—'}</dd>
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
          </div>
        </div>
      )}
    </div>
  );
}

export default function RemplacementsArchivesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RemplacementsArchivesContent />
    </Suspense>
  );
}
