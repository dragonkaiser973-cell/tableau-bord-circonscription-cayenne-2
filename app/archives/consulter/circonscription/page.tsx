'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

function CirconscriptionArchiveContent() {
  const [enseignants, setEnseignants] = useState<any[]>([]);
  const [ecoles, setEcoles] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      const [ensRes, ecolesRes, evalRes] = await Promise.all([
        fetch(`/api/archives/data?annee=${annee}&type=enseignants`),
        fetch(`/api/archives/data?annee=${annee}&type=ecoles_identite`),
        fetch(`/api/archives/data?annee=${annee}&type=evaluations`)
      ]);

      const ensData = await ensRes.json();
      const ecolesData = await ecolesRes.json();
      const evalData = await evalRes.json();

      console.log('=== DEBUG CIRCONSCRIPTION ARCHIVE ===');
      console.log('Total enseignants:', ensData.length);
      console.log('Total écoles:', ecolesData.length);
      console.log('Total évaluations:', evalData.length);

      setEnseignants(Array.isArray(ensData) ? ensData : []);
      setEcoles(Array.isArray(ecolesData) ? ecolesData : []);
      setEvaluations(Array.isArray(evalData) ? evalData : []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur chargement:', error);
      setLoading(false);
    }
  };

  // Récupérer l'IPS d'une école depuis les évaluations (par UAI)
  const getIpsEcole = (ecoleUai: string) => {
    const evalEcole = evaluations.find(e => e.uai === ecoleUai && e.ips);
    return evalEcole?.ips || null;
  };

  // Récupérer l'UAI d'une école par son nom
  const getEcoleUai = (ecoleNom: string) => {
    const ecole = ecoles.find(e => e.nom === ecoleNom);
    return ecole?.uai || null;
  };

  // Statistiques enseignants (hors circonscription SAUF personnel de direction)
  const getStatsEnseignants = () => {
    const ensHorsCirco = enseignants.filter(e => {
      if (e.statut && e.statut.toLowerCase().includes('direction')) {
        return true;
      }
      return !e.ecole_nom?.includes('IEN CAYENNE') && 
             !e.ecole_nom?.includes('CIRCONSCRIPTION');
    });
    
    const total = ensHorsCirco.length;
    const parStatut = ensHorsCirco.reduce((acc: any, e) => {
      acc[e.statut] = (acc[e.statut] || 0) + 1;
      return acc;
    }, {});
    
    const parEcole = ensHorsCirco.reduce((acc: any, e) => {
      acc[e.ecole_nom] = (acc[e.ecole_nom] || 0) + 1;
      return acc;
    }, {});

    const avecSpecialite = ensHorsCirco.filter(e => 
      e.discipline && 
      !e.discipline.toUpperCase().includes('SANS SPECIALITE')
    ).length;

    return { total, parStatut, parEcole, avecSpecialite };
  };

  // Statistiques circonscription (personnel IEN)
  const getStatsCirconscription = () => {
    const personnelCirco = enseignants.filter(e => 
      (e.ecole_nom && e.ecole_nom.includes('IEN CAYENNE')) || 
      (e.ecole_nom && e.ecole_nom.includes('CIRCONSCRIPTION')) ||
      (e.ecole_uai === '9730456H')
    );

    const total = personnelCirco.length;
    
    const parSpecialite = personnelCirco.reduce((acc: any, e) => {
      const spec = e.discipline && !e.discipline.toUpperCase().includes('SANS SPECIALITE') 
        ? e.discipline 
        : 'Sans spécialité';
      acc[spec] = (acc[spec] || 0) + 1;
      return acc;
    }, {});

    const ipsUniques = new Map<string, number>();
    evaluations.forEach(e => {
      if (e.ips && e.uai) {
        ipsUniques.set(e.uai, e.ips);
      }
    });
    const ipsMoyen = ipsUniques.size > 0 
      ? Array.from(ipsUniques.values()).reduce((sum, ips) => sum + ips, 0) / ipsUniques.size
      : 0;

    const elevesTotal = evaluations.reduce((sum, e) => sum + (e.effectif || 0), 0);

    return { total, parSpecialite, personnelCirco, ipsMoyen, elevesTotal };
  };

  // Statistiques écoles (hors circonscription)
  const getStatsEcoles = () => {
    const ecolesHorsCirco = ecoles.filter(e => e.uai !== '9730456H');
    
    return {
      total: ecolesHorsCirco.length,
      liste: ecolesHorsCirco.map(e => ({
        ...e,
        enseignants: enseignants.filter(ens => ens.ecole_nom === e.nom).length,
        ips: getIpsEcole(e.uai)
      }))
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl">Chargement de l'archive...</p>
        </div>
      </div>
    );
  }

  const statsEns = getStatsEnseignants();
  const statsCirco = getStatsCirconscription();
  const statsEcoles = getStatsEcoles();

  // Préparer données graphiques
  const prepareDataCamembert = (data: any, label: string) => {
    const entries = Object.entries(data).sort((a: any, b: any) => b[1] - a[1]);
    return {
      labels: entries.map(([key]) => key),
      datasets: [{
        label,
        data: entries.map(([_, value]) => value),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(14, 165, 233, 0.8)',
          'rgba(251, 191, 36, 0.8)',
        ],
        borderColor: 'white',
        borderWidth: 2,
      }]
    };
  };

  const prepareDataBarresHorizontales = (data: any, label: string) => {
    const entries = Object.entries(data).sort((a: any, b: any) => b[1] - a[1]);
    return {
      labels: entries.map(([key]) => key),
      datasets: [{
        label,
        data: entries.map(([_, value]) => value),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      }]
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      {/* Header */}
      <div className="text-white py-16 px-6">
        <div className="container mx-auto">
          <Link href={`/archives/consulter?annee=${annee}`} className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6">
            ← Retour à l'archive {annee}
          </Link>

          {/* Banner mode archive */}
          <div className="bg-amber-500/20 border-2 border-amber-300 rounded-lg p-4 mb-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📖</span>
              <div>
                <h3 className="text-lg font-bold">Mode Consultation Archive</h3>
                <p className="opacity-90">Vue d'ensemble de la circonscription pour l'année scolaire {annee}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
              🌍
            </div>
            <div>
              <h1 className="text-5xl font-bold">Circonscription {annee}</h1>
              <p className="text-xl opacity-90 mt-2">Vue d'ensemble et données statistiques</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="container mx-auto px-6 py-8">
        
        {/* Statistiques générales */}
        <div id="stats-generales" className="card mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="text-3xl">📊</span>
            Statistiques générales
          </h2>
          
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-200">
              <div className="text-sm text-blue-600 font-semibold mb-1">ÉCOLES</div>
              <div className="text-4xl font-bold text-blue-900">{statsEcoles.total}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border-2 border-green-200">
              <div className="text-sm text-green-600 font-semibold mb-1">ENSEIGNANTS</div>
              <div className="text-4xl font-bold text-green-900">{statsEns.total}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border-2 border-purple-200">
              <div className="text-sm text-purple-600 font-semibold mb-1">PERSONNEL IEN</div>
              <div className="text-4xl font-bold text-purple-900">{statsCirco.total}</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border-2 border-orange-200">
              <div className="text-sm text-orange-600 font-semibold mb-1">IPS MOYEN</div>
              <div className="text-4xl font-bold text-orange-900">{statsCirco.ipsMoyen.toFixed(1)}</div>
            </div>
          </div>
        </div>

        {/* Enseignants par statut */}
        <div id="ens-par-statut" className="card mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="text-3xl">👥</span>
            Enseignants par statut
          </h2>
          <div className="max-w-md mx-auto">
            <Pie data={prepareDataCamembert(statsEns.parStatut, 'Enseignants')} />
          </div>
        </div>

        {/* Enseignants par école */}
        <div id="ens-par-ecole" className="card mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="text-3xl">🏫</span>
            Enseignants par école
          </h2>
          <div className="h-[600px]">
            <Bar 
              data={prepareDataBarresHorizontales(statsEns.parEcole, 'Enseignants')}
              options={{
                indexAxis: 'y' as const,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                }
              }}
            />
          </div>
        </div>

        {/* Liste des écoles */}
        <div id="liste-ecoles" className="card mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="text-3xl">📋</span>
            Liste des écoles ({statsEcoles.total})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">École</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">UAI</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Enseignants</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">IPS</th>
                </tr>
              </thead>
              <tbody>
                {statsEcoles.liste.map((ecole: any, i: number) => (
                  <tr key={i} className="border-t border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3">{ecole.nom}</td>
                    <td className="px-4 py-3 font-mono text-sm">{ecole.uai}</td>
                    <td className="px-4 py-3 text-center font-semibold">{ecole.enseignants}</td>
                    <td className="px-4 py-3 text-center">
                      {ecole.ips ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-semibold text-sm">
                          {ecole.ips.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Personnel IEN */}
        {statsCirco.personnelCirco.length > 0 && (
          <div id="personnel-ien" className="card">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <span className="text-3xl">👨‍💼</span>
              Personnel de la circonscription ({statsCirco.total})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Prénom</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Discipline</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {statsCirco.personnelCirco.map((pers: any, i: number) => (
                    <tr key={i} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold">{pers.nom}</td>
                      <td className="px-4 py-3">{pers.prenom}</td>
                      <td className="px-4 py-3 text-sm">{pers.discipline || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-semibold">
                          {pers.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CirconscriptionArchivePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl">Chargement...</p>
        </div>
      </div>
    }>
      <CirconscriptionArchiveContent />
    </Suspense>
  );
}
