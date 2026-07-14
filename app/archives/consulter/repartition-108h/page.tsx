'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { exportStyledExcel, ExcelSheetDef } from '@/lib/excelExport';
import StatPill from '@/components/StatPill';
import PageLoader from '@/components/PageLoader';
import {
  CATEGORIES,
  CATEGORY_BY_KEY,
  PERIODES,
  TOTAL_HOURS,
  Repartition108hPubliee,
  publicationToRepartition,
  computeStats,
} from '@/app/outils/repartition-108h/types';

function fmtHours(h: number): string {
  if (!h) return '0';
  const whole = Math.floor(h + 1e-9);
  const half = h - whole >= 0.5 - 1e-9;
  if (whole === 0) return '30min';
  return half ? `${whole}h30` : `${whole}h`;
}

function fmtDateFr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function Repartition108hArchivesContent() {
  const [fiches, setFiches] = useState<Repartition108hPubliee[]>([]);
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
    loadData();
  }, [annee, router]);

  const loadData = async () => {
    try {
      const res = await fetch(`/api/archives/data?annee=${annee}&type=repartitions_108h`);
      const data = await res.json();
      const list: Repartition108hPubliee[] = Array.isArray(data) ? data : [];
      list.sort((a, b) => (a.ecole_name || '').localeCompare(b.ecole_name || ''));
      setFiches(list);
      if (list.length > 0) setSelected(list[0].ecole_id);
    } catch (error) {
      console.error('Erreur chargement:', error);
      setFiches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const columns = [
      { header: 'École', key: 'ecole', width: 28 },
      { header: 'Directeur', key: 'directeur', width: 22 },
      { header: 'Type', key: 'type', width: 12 },
      ...CATEGORIES.map((c) => ({ header: c.shortLabel, key: `cat_${c.key}`, width: 12, align: 'center' as const })),
      { header: 'Total heures', key: 'total', width: 12, align: 'center' as const },
      { header: 'Restant', key: 'restant', width: 10, align: 'center' as const },
      { header: 'Publié le', key: 'publie', width: 14, align: 'center' as const },
    ];

    const rows = fiches.map((f) => {
      const p = publicationToRepartition(f, f.ecole_id);
      const stats = computeStats(p);
      const row: Record<string, unknown> = {
        ecole: f.ecole_name || '',
        directeur: f.directeur_name || '',
        type: p.type === 'maternelle' ? 'Maternelle' : 'Élémentaire',
        total: `${fmtHours(stats.totalHours)} / ${TOTAL_HOURS}h`,
        restant: fmtHours(stats.remaining),
        publie: f.published_at ? new Date(f.published_at).toLocaleDateString('fr-FR') : '',
      };
      for (const c of CATEGORIES) row[`cat_${c.key}`] = fmtHours(stats.hoursByCategory[c.key] || 0);
      return row;
    });

    const sheet: ExcelSheetDef = {
      name: 'Répartitions 108h',
      title: `Répartitions des 108h — archive ${annee}`,
      subtitle: `Circonscription Cayenne 2 · Exporté le ${dateStr} · ${fiches.length} fiche${fiches.length > 1 ? 's' : ''}`,
      columns,
      rows,
    };

    await exportStyledExcel(
      `Repartitions_108h_Archive_${annee}_${new Date().toISOString().slice(0, 10)}`,
      [sheet],
    );
  };

  if (loading) {
    return <PageLoader />;
  }

  const ficheSel = fiches.find((f) => f.ecole_id === selected);
  const repSel = ficheSel ? publicationToRepartition(ficheSel, ficheSel.ecole_id) : null;
  const statsSel = repSel ? computeStats(repSel) : null;

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
                  Vous consultez les répartitions des 108h de l&apos;année scolaire {annee}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
                ⏱️
              </div>
              <div>
                <h1 className="text-5xl font-bold">Répartitions 108h {annee}</h1>
                <p className="text-xl opacity-90 mt-2">Fiches directeurs publiées et archivées</p>
              </div>
            </div>
            {fiches.length > 0 && (
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
      <div className="container mx-auto px-6 py-8">
        {fiches.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-xl text-gray-700 font-semibold">
              Aucune répartition des 108h n&apos;a été publiée pour {annee}
            </p>
            <p className="text-gray-500 mt-2">
              Les fiches publiées par les directeurs au moment de l&apos;archivage apparaîtraient ici.
            </p>
          </div>
        ) : (
          <>
            {/* Statistiques */}
            <div className="flex flex-wrap gap-3 mb-8">
              <StatPill
                value={fiches.length}
                label={`Fiche${fiches.length > 1 ? 's' : ''} publiée${fiches.length > 1 ? 's' : ''}`}
                gradient="from-sky-400 via-cyan-400 to-teal-400"
                variant="light"
              />
              <StatPill
                value={fiches.filter((f) => f.type === 'maternelle').length}
                label="Maternelle"
                gradient="from-violet-400 via-fuchsia-400 to-pink-400"
                variant="light"
              />
              <StatPill
                value={fiches.filter((f) => f.type !== 'maternelle').length}
                label="Élémentaire"
                gradient="from-amber-400 via-orange-400 to-rose-500"
                variant="light"
              />
            </div>

            {/* Tableau de synthèse */}
            <div className="card mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                📋 Synthèse des fiches ({fiches.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>École</th>
                      <th>Directeur</th>
                      <th className="text-center">Type</th>
                      <th className="text-center">Total heures</th>
                      <th className="text-center">Restant</th>
                      <th className="text-center">Publié le</th>
                      <th className="text-center">Détail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fiches.map((f) => {
                      const p = publicationToRepartition(f, f.ecole_id);
                      const stats = computeStats(p);
                      const complete = stats.totalHours >= TOTAL_HOURS;
                      return (
                        <tr key={f.ecole_id} className={selected === f.ecole_id ? 'bg-primary-50' : ''}>
                          <td className="font-semibold">{f.ecole_name}</td>
                          <td>{f.directeur_name}</td>
                          <td className="text-center">
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                p.type === 'maternelle'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {p.type === 'maternelle' ? 'Maternelle' : 'Élémentaire'}
                            </span>
                          </td>
                          <td
                            className={`text-center font-semibold ${
                              complete ? 'text-green-600' : 'text-primary-700'
                            }`}
                          >
                            {fmtHours(stats.totalHours)} / {TOTAL_HOURS}h
                          </td>
                          <td
                            className={`text-center font-semibold ${
                              stats.remaining > 0 ? 'text-amber-600' : 'text-gray-400'
                            }`}
                          >
                            {stats.remaining > 0 ? fmtHours(stats.remaining) : '—'}
                          </td>
                          <td className="text-center text-sm">
                            {f.published_at
                              ? new Date(f.published_at).toLocaleDateString('fr-FR')
                              : '-'}
                          </td>
                          <td className="text-center">
                            <button
                              onClick={() => setSelected(f.ecole_id)}
                              className="text-primary-600 hover:text-primary-800 font-semibold text-sm underline"
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
            </div>

            {/* Détail d'une fiche */}
            {repSel && statsSel && (
              <div className="card">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">🏫 {repSel.ecole}</h3>
                    <p className="text-gray-600 mt-1">
                      {repSel.auteur} · Année {repSel.anneeN} ·{' '}
                      {repSel.type === 'maternelle' ? 'Maternelle (0,5 h/créneau)' : 'Élémentaire (1 h/créneau)'}
                    </p>
                  </div>
                  {fiches.length > 1 && (
                    <select
                      value={selected}
                      onChange={(e) => setSelected(e.target.value)}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      {fiches.map((f) => (
                        <option key={f.ecole_id} value={f.ecole_id}>
                          {f.ecole_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Indicateurs clés */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 text-center">
                    <div className="text-xs text-blue-600 font-semibold mb-1">TOTAL PLANIFIÉ</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {fmtHours(statsSel.totalHours)} / {TOTAL_HOURS}h
                    </div>
                  </div>
                  <div
                    className={`p-4 rounded-lg border-2 text-center ${
                      statsSel.remaining > 0
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-green-50 border-green-200'
                    }`}
                  >
                    <div
                      className={`text-xs font-semibold mb-1 ${
                        statsSel.remaining > 0 ? 'text-amber-600' : 'text-green-600'
                      }`}
                    >
                      RESTANT
                    </div>
                    <div
                      className={`text-2xl font-bold ${
                        statsSel.remaining > 0 ? 'text-amber-900' : 'text-green-900'
                      }`}
                    >
                      {statsSel.remaining > 0 ? fmtHours(statsSel.remaining) : '✓ Complet'}
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200 text-center">
                    <div className="text-xs text-purple-600 font-semibold mb-1">JOURS PLANIFIÉS</div>
                    <div className="text-2xl font-bold text-purple-900">{statsSel.daysWithSelection}</div>
                  </div>
                </div>

                {/* Heures par catégorie */}
                <h4 className="text-lg font-bold text-gray-800 mb-3">Heures par catégorie</h4>
                <div className="space-y-2 mb-8">
                  {CATEGORIES.map((c) => {
                    const h = statsSel.hoursByCategory[c.key] || 0;
                    const pct = TOTAL_HOURS > 0 ? Math.min(100, (h / TOTAL_HOURS) * 100) : 0;
                    return (
                      <div key={c.key} className="flex items-center gap-3">
                        <div className="w-32 text-sm font-semibold text-gray-700 shrink-0">{c.label}</div>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                          <div
                            className="h-full rounded-full flex items-center justify-end pr-2 text-xs font-bold"
                            style={{
                              width: `${Math.max(pct, h > 0 ? 8 : 0)}%`,
                              backgroundColor: c.color,
                              color: c.textColor,
                            }}
                          >
                            {h > 0 ? fmtHours(h) : ''}
                          </div>
                        </div>
                        <div className="w-14 text-right text-sm font-semibold text-gray-600 shrink-0">
                          {fmtHours(h)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Périodes */}
                <h4 className="text-lg font-bold text-gray-800 mb-3">Détail par période</h4>
                <div className="space-y-6">
                  {PERIODES.map((per) => {
                    const events = repSel.periodes[per] || [];
                    const note = repSel.notes[per] || '';
                    const bounds = repSel.periodeBounds[per];
                    if (events.length === 0 && !note) return null;
                    return (
                      <div key={per} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                          <span className="font-bold text-gray-800">Période {per}</span>
                          {bounds?.start && bounds?.end && (
                            <span className="text-sm text-gray-500">
                              {fmtDateFr(bounds.start)} → {fmtDateFr(bounds.end)}
                            </span>
                          )}
                        </div>
                        {events.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="data-table">
                              <thead>
                                <tr>
                                  <th className="text-center">Date</th>
                                  <th>Catégorie</th>
                                  <th>Objet</th>
                                  <th>Thème</th>
                                </tr>
                              </thead>
                              <tbody>
                                {events
                                  .slice()
                                  .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                                  .map((ev) => {
                                    const cat = CATEGORY_BY_KEY[ev.category];
                                    return (
                                      <tr key={ev.id}>
                                        <td className="text-center whitespace-nowrap">
                                          {fmtDateFr(ev.date)}
                                        </td>
                                        <td>
                                          {cat && (
                                            <span
                                              className="inline-block px-2 py-1 rounded text-xs font-semibold"
                                              style={{ backgroundColor: cat.color, color: cat.textColor }}
                                            >
                                              {cat.shortLabel}
                                            </span>
                                          )}
                                        </td>
                                        <td>{ev.objet || <span className="text-gray-300">—</span>}</td>
                                        <td>{ev.theme || <span className="text-gray-300">—</span>}</td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {note && (
                          <div className="px-4 py-3 bg-yellow-50 border-t border-yellow-100 text-sm text-gray-700 whitespace-pre-wrap">
                            <span className="font-semibold text-yellow-800">Note : </span>
                            {note}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {PERIODES.every(
                    (per) => (repSel.periodes[per] || []).length === 0 && !(repSel.notes[per] || ''),
                  ) && (
                    <p className="text-gray-500 text-sm">
                      Aucun événement de période renseigné (seul le calendrier des créneaux est
                      rempli).
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Repartition108hArchivesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Repartition108hArchivesContent />
    </Suspense>
  );
}
