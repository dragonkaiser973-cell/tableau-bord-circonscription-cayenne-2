'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { exportStyledExcel, ExcelSheetDef } from '@/lib/excelExport';
import StatPill from '@/components/StatPill';
import PageLoader from '@/components/PageLoader';
import {
  NIVEAUX,
  PrevisionPubliee,
  publicationToPrevision,
  computeStats,
} from '@/app/outils/prevision-structure/types';

function PrevisionStructureArchivesContent() {
  const [fiches, setFiches] = useState<PrevisionPubliee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>(''); // ecole_id sélectionné pour le détail
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
      const res = await fetch(`/api/archives/data?annee=${annee}&type=previsions_structure`);
      const data = await res.json();
      const list: PrevisionPubliee[] = Array.isArray(data) ? data : [];
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
      { header: 'Année N+1', key: 'anneeN1', width: 12, align: 'center' as const },
      { header: 'Classes', key: 'classes', width: 9, align: 'center' as const, numFmt: '0' },
      ...NIVEAUX.map((n) => ({
        header: n.label,
        key: `niv_${n.key}`,
        width: 7,
        align: 'center' as const,
        numFmt: '0',
      })),
      { header: 'Total', key: 'total', width: 9, align: 'center' as const, numFmt: '0' },
      { header: 'REP+', key: 'repPlus', width: 8, align: 'center' as const },
      { header: 'Publié le', key: 'publie', width: 14, align: 'center' as const },
    ];

    const rows = fiches.map((f) => {
      const p = publicationToPrevision(f, f.ecole_id);
      const stats = computeStats(p);
      const row: Record<string, unknown> = {
        ecole: f.ecole_name || '',
        directeur: f.directeur_name || '',
        anneeN1: f.annee_n1 || '',
        classes: p.nbClasses,
        total: stats.totalEffectif,
        repPlus: f.rep_plus ? 'Oui' : 'Non',
        publie: f.published_at ? new Date(f.published_at).toLocaleDateString('fr-FR') : '',
      };
      for (const n of NIVEAUX) row[`niv_${n.key}`] = p.effectifs[n.key] || '';
      return row;
    });

    const sheet: ExcelSheetDef = {
      name: 'Prévisions structure',
      title: `Prévisions de structure — archive ${annee}`,
      subtitle: `Circonscription Cayenne 2 · Exporté le ${dateStr} · ${fiches.length} fiche${fiches.length > 1 ? 's' : ''}`,
      columns,
      rows,
    };

    await exportStyledExcel(
      `Previsions_Structure_Archive_${annee}_${new Date().toISOString().slice(0, 10)}`,
      [sheet],
    );
  };

  if (loading) {
    return <PageLoader />;
  }

  const totalEffectifs = fiches.reduce((acc, f) => {
    const p = publicationToPrevision(f, f.ecole_id);
    return acc + computeStats(p).totalEffectif;
  }, 0);
  const totalClasses = fiches.reduce((acc, f) => acc + Math.max(1, Math.min(35, f.nb_classes || 0)), 0);

  const ficheSel = fiches.find((f) => f.ecole_id === selected);
  const previsionSel = ficheSel ? publicationToPrevision(ficheSel, ficheSel.ecole_id) : null;
  const statsSel = previsionSel ? computeStats(previsionSel) : null;
  // Niveaux effectivement renseignés (effectif ou répartition non nulle) pour la matrice.
  const niveauxActifs = previsionSel
    ? NIVEAUX.filter((n) => {
        const eff = previsionSel.effectifs[n.key] || 0;
        const row = previsionSel.repartition[n.key] || [];
        return eff > 0 || row.slice(0, previsionSel.nbClasses).some((v) => (v || 0) > 0);
      })
    : [];

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
                  Vous consultez les prévisions de structure de l&apos;année scolaire {annee}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
                🏗️
              </div>
              <div>
                <h1 className="text-5xl font-bold">Prévisions de structure {annee}</h1>
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
              Aucune prévision de structure n&apos;a été publiée pour {annee}
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
                value={totalClasses}
                label="Classes prévues"
                gradient="from-violet-400 via-fuchsia-400 to-pink-400"
                variant="light"
              />
              <StatPill
                value={totalEffectifs}
                label="Effectifs prévus"
                gradient="from-emerald-400 via-teal-400 to-cyan-400"
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
                      <th className="text-center">Année N+1</th>
                      <th className="text-center">Classes</th>
                      <th className="text-center">Effectif total</th>
                      <th className="text-center">REP+</th>
                      <th className="text-center">Publié le</th>
                      <th className="text-center">Détail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fiches.map((f) => {
                      const p = publicationToPrevision(f, f.ecole_id);
                      const stats = computeStats(p);
                      return (
                        <tr key={f.ecole_id} className={selected === f.ecole_id ? 'bg-primary-50' : ''}>
                          <td className="font-semibold">{f.ecole_name}</td>
                          <td>{f.directeur_name}</td>
                          <td className="text-center">{f.annee_n1 || '-'}</td>
                          <td className="text-center">{p.nbClasses}</td>
                          <td className="text-center font-semibold text-primary-700">
                            {stats.totalEffectif}
                          </td>
                          <td className="text-center">
                            {f.rep_plus ? (
                              <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                                REP+
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
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
            {previsionSel && statsSel && (
              <div className="card">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">🏫 {previsionSel.ecole}</h3>
                    <p className="text-gray-600 mt-1">
                      {previsionSel.auteur} · Année {previsionSel.anneeN} → {previsionSel.anneeN1} ·{' '}
                      {previsionSel.nbClasses} classe{previsionSel.nbClasses > 1 ? 's' : ''}
                      {previsionSel.repPlus ? ' · REP+' : ''}
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200 text-center">
                    <div className="text-xs text-blue-600 font-semibold mb-1">EFFECTIF TOTAL</div>
                    <div className="text-2xl font-bold text-blue-900">{statsSel.totalEffectif}</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200 text-center">
                    <div className="text-xs text-purple-600 font-semibold mb-1">MOY. / CLASSE</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {statsSel.moyenneTheorique.toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200 text-center">
                    <div className="text-xs text-green-600 font-semibold mb-1">CYCLE 1 (MAT.)</div>
                    <div className="text-2xl font-bold text-green-900">{statsSel.cycle1}</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200 text-center">
                    <div className="text-xs text-orange-600 font-semibold mb-1">ÉLÉMENTAIRE</div>
                    <div className="text-2xl font-bold text-orange-900">{statsSel.elem}</div>
                  </div>
                </div>

                {/* Effectifs par niveau */}
                <h4 className="text-lg font-bold text-gray-800 mb-3">Effectifs par niveau</h4>
                <div className="overflow-x-auto mb-8">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Niveau</th>
                        <th className="text-center">Effectif</th>
                        <th className="text-center">Réparti</th>
                        <th className="text-center">Reste</th>
                      </tr>
                    </thead>
                    <tbody>
                      {niveauxActifs.map((n) => {
                        const eff = previsionSel.effectifs[n.key] || 0;
                        const reste = statsSel.resteParNiveau[n.key] ?? eff;
                        return (
                          <tr key={n.key}>
                            <td className="font-semibold">{n.label}</td>
                            <td className="text-center">{eff}</td>
                            <td className="text-center">{eff - (reste ?? 0)}</td>
                            <td
                              className={`text-center font-semibold ${
                                (reste ?? 0) !== 0 ? 'text-amber-600' : 'text-gray-400'
                              }`}
                            >
                              {reste ?? 0}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-50 font-bold">
                        <td>Total</td>
                        <td className="text-center">{statsSel.totalEffectif}</td>
                        <td className="text-center">{statsSel.totalReparti}</td>
                        <td
                          className={`text-center ${
                            statsSel.resteGlobal !== 0 ? 'text-amber-600' : 'text-gray-400'
                          }`}
                        >
                          {statsSel.resteGlobal}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Matrice de répartition */}
                {niveauxActifs.length > 0 && (
                  <>
                    <h4 className="text-lg font-bold text-gray-800 mb-3">
                      Répartition dans les classes
                    </h4>
                    <div className="overflow-x-auto mb-8">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Niveau</th>
                            {Array.from({ length: previsionSel.nbClasses }, (_, c) => (
                              <th key={c} className="text-center">
                                Cl. {c + 1}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {niveauxActifs.map((n) => {
                            const row = previsionSel.repartition[n.key] || [];
                            return (
                              <tr key={n.key}>
                                <td className="font-semibold">{n.label}</td>
                                {Array.from({ length: previsionSel.nbClasses }, (_, c) => (
                                  <td key={c} className="text-center">
                                    {row[c] ? row[c] : <span className="text-gray-300">·</span>}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                          <tr className="bg-gray-50 font-bold">
                            <td>Total / classe</td>
                            {statsSel.perClasse.map((v, c) => (
                              <td key={c} className="text-center text-primary-700">
                                {v}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Commentaires */}
                {(previsionSel.commPositifs || previsionSel.commNegatifs) && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {previsionSel.commPositifs && (
                      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                        <h5 className="font-bold text-green-800 mb-2">✅ Points positifs</h5>
                        <p className="text-gray-700 whitespace-pre-wrap text-sm">
                          {previsionSel.commPositifs}
                        </p>
                      </div>
                    )}
                    {previsionSel.commNegatifs && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                        <h5 className="font-bold text-red-800 mb-2">⚠️ Points de vigilance</h5>
                        <p className="text-gray-700 whitespace-pre-wrap text-sm">
                          {previsionSel.commNegatifs}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function PrevisionStructureArchivesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PrevisionStructureArchivesContent />
    </Suspense>
  );
}
