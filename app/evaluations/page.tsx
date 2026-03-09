'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Line, Bar } from 'react-chartjs-2';
import PDFExportModal from '@/components/PDFExportModal';
import { exportMultipleElementsToPDF, PDFExportOptions } from '@/lib/pdfExport';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function EvaluationsPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [ecoles, setEcoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Filtres tableau de bord principal
  const [selectedEcole, setSelectedEcole] = useState('');
  const [selectedAnnee, setSelectedAnnee] = useState('');
  const [selectedNiveau, setSelectedNiveau] = useState('');
  const [selectedMatiere, setSelectedMatiere] = useState('français');
  const [selectedLibelle, setSelectedLibelle] = useState('');

  // Filtres graphique 1 : Circonscription vs Académie
  const [graphe1Groupe, setGraphe1Groupe] = useState('groupe_3');
  const [graphe1Matiere, setGraphe1Matiere] = useState('');
  const [graphe1Competence, setGraphe1Competence] = useState('');
  
  // Filtres graphique 2 : Évolution par école
  const [graphe2Ecole, setGraphe2Ecole] = useState('');
  const [graphe2Matiere, setGraphe2Matiere] = useState('');
  const [graphe2Competence, setGraphe2Competence] = useState('');
  const [graphe2Groupe, setGraphe2Groupe] = useState('tous');
  const [graphe2Niveau, setGraphe2Niveau] = useState('');


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [evalRes, ecolesRes] = await Promise.all([
        fetch('/api/evaluations'),
        fetch('/api/ecoles')
      ]);

      const evalData = await evalRes.json();
      const ecolesData = await ecolesRes.json();

      console.log(`📊 Total évaluations chargées: ${evalData.length}`);
      console.log(`📊 Années présentes:`, [...new Set(evalData.map((e: any) => e.rentree))].sort());

      setEvaluations(evalData);
      
      // Filtrer les écoles maternelles et la circonscription
      const ecolesFiltered = ecolesData.filter((e: any) => {
        const nom = (e.nom || '').toUpperCase();
        const nomClean = nom.replace(/\./g, '').replace(/\s/g, '');
        
        // DEBUG: Afficher toutes les écoles pour diagnostic
        console.log('🏫 École:', e.uai, '-', nom);
        
        // Exclure les écoles maternelles
        const isMaternelle = nomClean.includes('EMPU') || nom.includes('MATERNELLE');
        
        // Exclure la circonscription
        const isCirconscription = e.uai === '9730456H' || nom.includes('CIRCONSCRIPTION') || nom.includes('IEN');
        
        // TEMPORAIRE: Tout afficher pour diagnostic
        return true; // !isMaternelle && !isCirconscription;
      });
      
      console.log('✅ Écoles conservées (DEBUG - toutes affichées):', ecolesFiltered.length);
      setEcoles(ecolesFiltered);

      // Ne pas présélectionner d'école (laisser "Toutes les écoles")

      if (evalData.length > 0) {
        const annees = [...new Set(evalData.map((e: any) => e.rentree))].sort().reverse();
        setSelectedAnnee(annees[0]?.toString() || '');

        const niveaux = [...new Set(evalData.map((e: any) => e.classe))].sort() as string[];
        // Chercher "CP rentrée" ou "CE1" en priorité
        const niveauDefaut = niveaux.find(n => n.includes('CP rentrée')) || 
                            niveaux.find(n => n.includes('CP')) || 
                            niveaux.find(n => n.includes('CE1')) || 
                            niveaux[0] || '';
        setSelectedNiveau(niveauDefaut);
      }

      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setLoading(false);
    }
  };

  const getFilteredData = () => {
    const baseFiltered = evaluations.filter(e => {
      const matchEcole = !selectedEcole || e.uai === selectedEcole;
      const matchAnnee = !selectedAnnee || e.rentree.toString() === selectedAnnee;
      const matchNiveau = !selectedNiveau || e.classe === selectedNiveau;
      const matchMatiere = !selectedMatiere || e.matiere === selectedMatiere;
      const matchLibelle = !selectedLibelle || e.libelle === selectedLibelle;
      
      return matchEcole && matchAnnee && matchNiveau && matchMatiere && matchLibelle;
    });

    // Si "Toutes les écoles" est sélectionné, agréger par compétence
    if (!selectedEcole && baseFiltered.length > 0) {
      const groupedByLibelle: { [key: string]: any[] } = {};
      
      baseFiltered.forEach(e => {
        if (!groupedByLibelle[e.libelle]) {
          groupedByLibelle[e.libelle] = [];
        }
        groupedByLibelle[e.libelle].push(e);
      });

      // Calculer les moyennes pour chaque compétence
      return Object.keys(groupedByLibelle).map(libelle => {
        const items = groupedByLibelle[libelle];
        const avgG1 = items.reduce((sum, i) => sum + (i.tx_groupe_1 || 0), 0) / items.length;
        const avgG2 = items.reduce((sum, i) => sum + (i.tx_groupe_2 || 0), 0) / items.length;
        const avgG3 = items.reduce((sum, i) => sum + (i.tx_groupe_3 || 0), 0) / items.length;
        const avgCirG1 = items.reduce((sum, i) => sum + (i.tx_cir_groupe_1 || 0), 0) / items.length;
        const avgCirG2 = items.reduce((sum, i) => sum + (i.tx_cir_groupe_2 || 0), 0) / items.length;
        const avgCirG3 = items.reduce((sum, i) => sum + (i.tx_cir_groupe_3 || 0), 0) / items.length;

        return {
          id: items[0].id,
          rentree: items[0].rentree,
          uai: 'CIRCONSCRIPTION',
          denomination: 'Moyenne Circonscription',
          classe: items[0].classe,
          matiere: items[0].matiere,
          libelle: libelle,
          tx_groupe_1: avgG1,
          tx_groupe_2: avgG2,
          tx_groupe_3: avgG3,
          tx_cir_groupe_1: avgCirG1,
          tx_cir_groupe_2: avgCirG2,
          tx_cir_groupe_3: avgCirG3
        };
      }).sort((a, b) => a.libelle.localeCompare(b.libelle));
    }

    return baseFiltered;
  };

  const getLibelles = () => {
    const filtered = evaluations.filter(e => {
      const matchEcole = !selectedEcole || e.uai === selectedEcole;
      const matchAnnee = !selectedAnnee || e.rentree.toString() === selectedAnnee;
      const matchNiveau = !selectedNiveau || e.classe === selectedNiveau;
      const matchMatiere = !selectedMatiere || e.matiere === selectedMatiere;
      
      return matchEcole && matchAnnee && matchNiveau && matchMatiere;
    });

    return [...new Set(filtered.map(e => e.libelle))].sort();
  };

  const renderDashboard = () => {
    const data = getFilteredData();
    
    if (data.length === 0) {
      return (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Aucune donnée disponible</h3>
          <p className="text-gray-600">Sélectionnez des filtres différents ou importez des données</p>
        </div>
      );
    }

    // Les données sont en décimal (0.464), il faut multiplier par 100 pour l'échelle 0-100
    const labels = data.map(d => d.libelle);
    const groupe1 = data.map(d => (d.tx_groupe_1 || 0) * 100);
    const groupe2 = data.map(d => (d.tx_groupe_2 || 0) * 100);
    const groupe3 = data.map(d => (d.tx_groupe_3 || 0) * 100);

    const chartData = {
      labels,
      datasets: [
        {
          label: 'Élèves à besoin',
          data: groupe1,
          backgroundColor: '#156082',
        },
        {
          label: 'Élèves fragiles',
          data: groupe2,
          backgroundColor: '#e97132',
        },
        {
          label: 'Élèves au-dessus du seuil 2',
          data: groupe3,
          backgroundColor: '#196b24',
        }
      ]
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        x: { stacked: true },
        y: {
          stacked: true,
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: (value: any) => value + '%'
          }
        }
      },
      plugins: {
        legend: {
          position: 'bottom' as const
        },
        tooltip: {
          callbacks: {
            label: (context: any) => context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%'
          }
        }
      }
    };

    // Calculer les statistiques (données en décimal, multiplier par 100)
    const avgGroupe3 = data.length > 0
      ? ((data.reduce((sum, d) => sum + (d.tx_groupe_3 || 0), 0) / data.length) * 100).toFixed(1)
      : '0';

    return (
      <div>
        {/* Statistiques */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="stat-card">
            <h3 className="text-xs uppercase tracking-wider opacity-90 mb-2">
              {selectedMatiere} - Au-dessus seuil 2
            </h3>
            <div className="text-4xl font-bold">{avgGroupe3}%</div>
          </div>
          
          <div className="stat-card bg-gradient-to-br from-info to-primary-800">
            <h3 className="text-xs uppercase tracking-wider opacity-90 mb-2">
              Nombre de compétences
            </h3>
            <div className="text-4xl font-bold">{data.length}</div>
          </div>
          
          <div className="stat-card bg-gradient-to-br from-success to-success-light">
            <h3 className="text-xs uppercase tracking-wider opacity-90 mb-2">
              Année scolaire
            </h3>
            <div className="text-4xl font-bold">{selectedAnnee}</div>
          </div>

          <div className="stat-card bg-gradient-to-br from-purple-500 to-purple-700">
            <h3 className="text-xs uppercase tracking-wider opacity-90 mb-2">
              Périmètre
            </h3>
            <div className="text-2xl font-bold">
              {selectedEcole ? ecoles.find(e => e.uai === selectedEcole)?.nom || 'École' : 'Circonscription'}
            </div>
          </div>
        </div>

        {/* Graphique */}
        <div className="card mb-8" id="section-barres-empilees">
          <h3 className="text-xl font-bold text-gray-800 mb-6 pb-3 border-b-2 border-gray-200">
            📚 Résultats {selectedMatiere}
          </h3>
          <Bar data={chartData} options={chartOptions} />
        </div>

        {/* Tableau des données */}
        <div className="card" id="section-tableau-barres-empilees">
          <h3 className="text-xl font-bold text-gray-800 mb-6">📊 Tableau de données</h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Compétence</th>
                  <th style={{ backgroundColor: '#156082', color: 'white' }}>À besoin</th>
                  <th style={{ backgroundColor: '#e97132', color: 'white' }}>Fragiles</th>
                  <th style={{ backgroundColor: '#196b24', color: 'white' }}>Au-dessus seuil 2</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, idx) => (
                  <tr key={idx}>
                    <td className="font-semibold">{item.libelle}</td>
                    <td>{((item.tx_groupe_1 || 0) * 100).toFixed(1)}%</td>
                    <td>{((item.tx_groupe_2 || 0) * 100).toFixed(1)}%</td>
                    <td>{((item.tx_groupe_3 || 0) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const annees = [...new Set(evaluations.map(e => e.rentree))].sort().reverse();
  const niveaux = [...new Set(evaluations.map(e => e.classe))].sort();
  const libelles = getLibelles();

  // Graphique 1 : Évolution Circonscription vs Académie
  const getGraphe1Data = () => {
    // Construire les noms de champs corrects
    const numGroupe = graphe1Groupe.replace('groupe_', ''); // "groupe_3" → "3"
    const champCir = `tx_cir_groupe_${numGroupe}`;  // "tx_cir_groupe_3"
    const champAca = `tx_aca_groupe_${numGroupe}`;  // "tx_aca_groupe_3"

    console.log('🔍 Graphe1 - Champs utilisés:', champCir, champAca);
    console.log('🔍 Graphe1 - Exemple évaluation:', evaluations[0]);
    console.log('🔍 Graphe1 - Valeur cir:', evaluations[0]?.[champCir]);
    console.log('🔍 Graphe1 - Valeur aca:', evaluations[0]?.[champAca]);

    // Filtrer les évaluations selon les critères
    let filtered = evaluations;
    
    if (graphe1Matiere) {
      filtered = filtered.filter(e => e.matiere === graphe1Matiere);
    }
    if (graphe1Competence) {
      filtered = filtered.filter(e => e.libelle === graphe1Competence);
    }

    // Grouper par année et calculer moyennes
    const annees = [...new Set(filtered.map(e => e.rentree))].sort();
    
    const dataCir = annees.map(annee => {
      const evals = filtered.filter(e => e.rentree === annee && e[champCir] != null);
      const moyenne = evals.length > 0
        ? (evals.reduce((sum, e) => sum + (e[champCir] || 0), 0) / evals.length) * 100
        : 0;
      console.log(`📊 ${annee} - Circonscription:`, moyenne.toFixed(1), '%', `(${evals.length} évaluations)`);
      return moyenne;
    });

    const dataAca = annees.map(annee => {
      const evals = filtered.filter(e => e.rentree === annee && e[champAca] != null);
      const moyenne = evals.length > 0
        ? (evals.reduce((sum, e) => sum + (e[champAca] || 0), 0) / evals.length) * 100
        : 0;
      console.log(`📊 ${annee} - Académie:`, moyenne.toFixed(1), '%', `(${evals.length} évaluations)`);
      return moyenne;
    });

    // Couleurs selon le groupe
    const couleurs = {
      groupe_1: { cir: '#156082', aca: '#e669b9' },  // Bleu foncé / Rose
      groupe_2: { cir: '#e97132', aca: '#e669b9' },  // Orange / Rose
      groupe_3: { cir: '#196b24', aca: '#e669b9' }   // Vert / Rose
    };

    const couleur = couleurs[graphe1Groupe as keyof typeof couleurs];

    return {
      labels: annees,
      datasets: [
        {
          label: 'Circonscription',
          data: dataCir,
          borderColor: couleur.cir,
          backgroundColor: couleur.cir + '20',
          tension: 0.3,
          fill: true,
          borderWidth: 3
        },
        {
          label: 'Académie',
          data: dataAca,
          borderColor: couleur.aca,
          backgroundColor: couleur.aca + '20',
          tension: 0.3,
          fill: true,
          borderWidth: 3
        }
      ]
    };
  };

  // Graphique 2 : Évolution par école/matière/compétence/niveau
  const getGraphe2Data = () => {
    // Filtrer les évaluations selon les critères
    let filtered = evaluations;
    
    if (graphe2Ecole) {
      filtered = filtered.filter(e => e.uai === graphe2Ecole);
    }
    if (graphe2Matiere) {
      filtered = filtered.filter(e => e.matiere === graphe2Matiere);
    }
    if (graphe2Niveau) {
      filtered = filtered.filter(e => e.classe === graphe2Niveau);
    }
    if (graphe2Competence) {
      filtered = filtered.filter(e => e.libelle === graphe2Competence);
    }

    // Grouper par année
    const annees = [...new Set(filtered.map(e => e.rentree))].sort();

    // Si "tous" est sélectionné, afficher les 3 groupes
    if (graphe2Groupe === 'tous') {
      const dataGroupe1 = annees.map(annee => {
        const evals = filtered.filter(e => e.rentree === annee && e.tx_groupe_1 != null);
        return evals.length > 0
          ? (evals.reduce((sum, e) => sum + (e.tx_groupe_1 || 0), 0) / evals.length) * 100
          : 0;
      });

      const dataGroupe2 = annees.map(annee => {
        const evals = filtered.filter(e => e.rentree === annee && e.tx_groupe_2 != null);
        return evals.length > 0
          ? (evals.reduce((sum, e) => sum + (e.tx_groupe_2 || 0), 0) / evals.length) * 100
          : 0;
      });

      const dataGroupe3 = annees.map(annee => {
        const evals = filtered.filter(e => e.rentree === annee && e.tx_groupe_3 != null);
        return evals.length > 0
          ? (evals.reduce((sum, e) => sum + (e.tx_groupe_3 || 0), 0) / evals.length) * 100
          : 0;
      });

      return {
        labels: annees,
        datasets: [
          {
            label: 'Groupe 1 - À besoin',
            data: dataGroupe1,
            borderColor: '#156082',
            backgroundColor: '#15608220',
            tension: 0.3,
            fill: true,
            borderWidth: 3
          },
          {
            label: 'Groupe 2 - Fragiles',
            data: dataGroupe2,
            borderColor: '#e97132',
            backgroundColor: '#e9713220',
            tension: 0.3,
            fill: true,
            borderWidth: 3
          },
          {
            label: 'Groupe 3 - Au-dessus du seuil 2',
            data: dataGroupe3,
            borderColor: '#196b24',
            backgroundColor: '#196b2420',
            tension: 0.3,
            fill: true,
            borderWidth: 3
          }
        ]
      };
    }

    // Sinon, afficher un seul groupe
    const numGroupe = graphe2Groupe.replace('groupe_', '');
    const champGroupe = `tx_groupe_${numGroupe}`;

    const data = annees.map(annee => {
      const evals = filtered.filter(e => e.rentree === annee && e[champGroupe] != null);
      return evals.length > 0
        ? (evals.reduce((sum, e) => sum + (e[champGroupe] || 0), 0) / evals.length) * 100
        : 0;
    });

    // Couleurs selon le groupe
    const couleurs = {
      groupe_1: '#156082',  // Bleu foncé
      groupe_2: '#e97132',  // Orange
      groupe_3: '#196b24'   // Vert
    };

    const couleur = couleurs[graphe2Groupe as keyof typeof couleurs];

    return {
      labels: annees,
      datasets: [
        {
          label: 'Circonscription',
          data: data,
          borderColor: couleur,
          backgroundColor: couleur + '20',
          tension: 0.3,
          fill: true,
          borderWidth: 3
        }
      ]
    };
  };

  // Options pour les graphiques en ligne
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value: any) => value + '%'
        }
      }
    },
    plugins: {
      legend: {
        position: 'bottom' as const
      },
      tooltip: {
        callbacks: {
          label: (context: any) => context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%'
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl text-white">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      {/* Header */}
      <div className="text-white py-16 px-6">
        <div className="container mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6">
            ← Retour à l'accueil
          </Link>
          <div className="flex items-center justify-between w-full mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
                📈
              </div>
              <div>
                <h1 className="text-5xl font-bold">Évaluations nationales</h1>
                <p className="text-xl opacity-90 mt-2">Analyse des résultats par école et compétence</p>
              </div>
            </div>
            <button
              onClick={() => setShowExportModal(true)}
              className="px-6 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-white/90 transition-colors shadow-lg flex items-center gap-2"
            >
              📥 Exporter en PDF
            </button>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="container mx-auto px-6 py-8">
        {/* Filtres */}
        <div className="card mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🔍 Filtres</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">École</label>
              <select
                value={selectedEcole}
                onChange={(e) => {
                  setSelectedEcole(e.target.value);
                  setSelectedLibelle(''); // Réinitialiser la compétence
                }}
                className="input-field text-sm"
              >
                <option value="">Toutes les écoles</option>
                {ecoles.map(ecole => (
                  <option key={ecole.id} value={ecole.uai}>
                    {ecole.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Année</label>
              <select
                value={selectedAnnee}
                onChange={(e) => {
                  setSelectedAnnee(e.target.value);
                  setSelectedLibelle(''); // Réinitialiser la compétence
                }}
                className="input-field text-sm"
              >
                {annees.map(annee => (
                  <option key={annee} value={annee}>
                    {annee}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Niveau</label>
              <select
                value={selectedNiveau}
                onChange={(e) => {
                  setSelectedNiveau(e.target.value);
                  setSelectedLibelle(''); // Réinitialiser la compétence
                }}
                className="input-field text-sm"
              >
                {niveaux.map(niveau => (
                  <option key={niveau} value={niveau}>
                    {niveau}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Matière</label>
              <select
                value={selectedMatiere}
                onChange={(e) => {
                  setSelectedMatiere(e.target.value);
                  setSelectedLibelle(''); // Réinitialiser la compétence
                }}
                className="input-field text-sm"
              >
                <option value="français">Français</option>
                <option value="mathématiques">Mathématiques</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Compétence</label>
              <select
                value={selectedLibelle}
                onChange={(e) => setSelectedLibelle(e.target.value)}
                className="input-field text-sm"
              >
                <option value="">Toutes</option>
                {libelles.map(lib => (
                  <option key={lib} value={lib}>
                    {lib}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="card mb-8">
          {renderDashboard()}
        </div>

        {/* Graphique 1 : Circonscription vs Académie */}
        <div className="card mb-8" id="section-graphique1">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📊 Évolution Circonscription vs Académie</h2>
          
          {/* Filtres Graphique 1 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Matière</label>
                <select
                  value={graphe1Matiere}
                  onChange={(e) => {
                    setGraphe1Matiere(e.target.value);
                    setGraphe1Competence(''); // Reset compétence
                  }}
                  className="input-field w-full"
                >
                  <option value="">Toutes les matières</option>
                  <option value="français">Français</option>
                  <option value="mathématiques">Mathématiques</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Compétence</label>
                <select
                  value={graphe1Competence}
                  onChange={(e) => setGraphe1Competence(e.target.value)}
                  className="input-field w-full"
                  disabled={!graphe1Matiere}
                >
                  <option value="">Toutes les compétences</option>
                  {graphe1Matiere && libelles
                    .filter(lib => {
                      const evalsMatiere = evaluations.filter(e => e.matiere === graphe1Matiere);
                      return evalsMatiere.some(e => e.libelle === lib);
                    })
                    .map(lib => (
                      <option key={lib} value={lib}>{lib}</option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Groupe de maîtrise</label>
                <select
                  value={graphe1Groupe}
                  onChange={(e) => setGraphe1Groupe(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="groupe_1">Groupe 1 - À besoin</option>
                  <option value="groupe_2">Groupe 2 - Fragiles</option>
                  <option value="groupe_3">Groupe 3 - Au-dessus du seuil 2</option>
                </select>
              </div>
            </div>
          </div>

          <Line data={getGraphe1Data()} options={lineChartOptions} />

          {/* Tableau de données Graphique 1 */}
          <div className="mt-6 overflow-x-auto" id="section-tableau-graphique1">
            <h3 className="text-lg font-bold text-gray-800 mb-3">📋 Données détaillées</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Année</th>
                  <th className="px-4 py-2 text-center">Circonscription</th>
                  <th className="px-4 py-2 text-center">Académie</th>
                  <th className="px-4 py-2 text-center">Écart</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const data = getGraphe1Data();
                  return data.labels.map((annee, idx) => {
                    const valCir = data.datasets[0].data[idx];
                    const valAca = data.datasets[1].data[idx];
                    const ecart = valCir - valAca;
                    return (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-semibold">{annee}</td>
                        <td className="px-4 py-2 text-center">{valCir.toFixed(1)}%</td>
                        <td className="px-4 py-2 text-center">{valAca.toFixed(1)}%</td>
                        <td className={`px-4 py-2 text-center font-semibold ${
                          ecart > 0 ? 'text-green-600' : ecart < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {ecart > 0 ? '+' : ''}{ecart.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Graphique 2 : Évolution par école/matière/compétence */}
        <div className="card mb-8" id="section-graphique2">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📈 Évolution Détaillée - Circonscription</h2>
          
          {/* Filtres Graphique 2 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">

              {/* 1. École */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">École</label>
                <select
                  value={graphe2Ecole}
                  onChange={(e) => setGraphe2Ecole(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="">Toutes les écoles</option>
                  {ecoles.map(ecole => (
                    <option key={ecole.uai} value={ecole.uai}>
                      {ecole.nom}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Niveau — conditionne matière et compétence */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Niveau</label>
                <select
                  value={graphe2Niveau}
                  onChange={(e) => {
                    setGraphe2Niveau(e.target.value);
                    setGraphe2Matiere('');
                    setGraphe2Competence('');
                  }}
                  className="input-field w-full"
                >
                  <option value="">Tous les niveaux</option>
                  {[...new Set(evaluations.map(e => e.classe))]
                    .filter(Boolean)
                    .sort((a, b) => {
                      const ordre = ['CP rentrée', `CP point d'étape`, 'CP', 'CE1', 'CE2', 'CM1', 'CM2'];
                      const ia = ordre.findIndex(o => a === o || a.startsWith(o + ' '));
                      const ib = ordre.findIndex(o => b === o || b.startsWith(o + ' '));
                      if (ia !== -1 && ib !== -1) return ia - ib;
                      if (ia !== -1) return -1;
                      if (ib !== -1) return 1;
                      return a.localeCompare(b);
                    })
                    .map(niveau => (
                      <option key={niveau} value={niveau}>{niveau}</option>
                    ))
                  }
                </select>
              </div>

              {/* 3. Matière — filtrée selon le niveau sélectionné */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Matière</label>
                <select
                  value={graphe2Matiere}
                  onChange={(e) => {
                    setGraphe2Matiere(e.target.value);
                    setGraphe2Competence('');
                  }}
                  className="input-field w-full"
                >
                  <option value="">Toutes les matières</option>
                  {[...new Set(
                    evaluations
                      .filter(e => !graphe2Niveau || e.classe === graphe2Niveau)
                      .map(e => e.matiere)
                  )]
                    .filter(Boolean)
                    .sort()
                    .map(mat => (
                      <option key={mat} value={mat}>{mat}</option>
                    ))
                  }
                </select>
              </div>

              {/* 4. Compétence — filtrée selon niveau ET matière */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Compétence</label>
                <select
                  value={graphe2Competence}
                  onChange={(e) => setGraphe2Competence(e.target.value)}
                  className="input-field w-full"
                  disabled={!graphe2Matiere && !graphe2Niveau}
                >
                  <option value="">Toutes les compétences</option>
                  {[...new Set(
                    evaluations
                      .filter(e =>
                        (!graphe2Niveau || e.classe === graphe2Niveau) &&
                        (!graphe2Matiere || e.matiere === graphe2Matiere)
                      )
                      .map(e => e.libelle)
                  )]
                    .filter(Boolean)
                    .sort()
                    .map(lib => (
                      <option key={lib} value={lib}>{lib}</option>
                    ))
                  }
                </select>
              </div>

              {/* 5. Groupe */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Groupe</label>
                <select
                  value={graphe2Groupe}
                  onChange={(e) => setGraphe2Groupe(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="tous">Tous les groupes</option>
                  <option value="groupe_1">Groupe 1 - À besoin</option>
                  <option value="groupe_2">Groupe 2 - Fragiles</option>
                  <option value="groupe_3">Groupe 3 - Au-dessus du seuil 2</option>
                </select>
              </div>
            </div>
          </div>

          <Line data={getGraphe2Data()} options={lineChartOptions} />

          {/* Tableau de données Graphique 2 */}
          <div className="mt-6 overflow-x-auto" id="section-tableau-graphique2">
            <h3 className="text-lg font-bold text-gray-800 mb-3">📋 Données détaillées</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Année</th>
                  {graphe2Groupe === 'tous' ? (
                    <>
                      <th className="px-4 py-2 text-center">Groupe 1</th>
                      <th className="px-4 py-2 text-center">Groupe 2</th>
                      <th className="px-4 py-2 text-center">Groupe 3</th>
                    </>
                  ) : (
                    <th className="px-4 py-2 text-center">Taux (%)</th>
                  )}
                  <th className="px-4 py-2 text-center">Évolution</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const data = getGraphe2Data();
                  return data.labels.map((annee, idx) => {
                    if (graphe2Groupe === 'tous') {
                      const val1 = data.datasets[0].data[idx];
                      const val2 = data.datasets[1].data[idx];
                      const val3 = data.datasets[2].data[idx];
                      const evolution = idx > 0 
                        ? ((val3 - data.datasets[2].data[idx - 1]) as number)
                        : 0;
                      return (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 font-semibold">{annee}</td>
                          <td className="px-4 py-2 text-center text-blue-700">{val1.toFixed(1)}%</td>
                          <td className="px-4 py-2 text-center text-orange-600">{val2.toFixed(1)}%</td>
                          <td className="px-4 py-2 text-center text-green-700">{val3.toFixed(1)}%</td>
                          <td className={`px-4 py-2 text-center font-semibold ${
                            evolution > 0 ? 'text-green-600' : evolution < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {idx > 0 ? (evolution > 0 ? '+' : '') + evolution.toFixed(1) + '%' : '-'}
                          </td>
                        </tr>
                      );
                    } else {
                      const val = data.datasets[0].data[idx];
                      const evolution = idx > 0 
                        ? ((val - data.datasets[0].data[idx - 1]) as number)
                        : 0;
                      return (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 font-semibold">{annee}</td>
                          <td className="px-4 py-2 text-center">{val.toFixed(1)}%</td>
                          <td className={`px-4 py-2 text-center font-semibold ${
                            evolution > 0 ? 'text-green-600' : evolution < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {idx > 0 ? (evolution > 0 ? '+' : '') + evolution.toFixed(1) + '%' : '-'}
                          </td>
                        </tr>
                      );
                    }
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-white/80">
        <p className="text-sm">
          Développé par <strong>LOUIS Olivier</strong> © 2026
        </p>
      </footer>

      {/* Modal d'export PDF */}
      <PDFExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={async (elements, options) => {
          setShowExportModal(false);
          await exportMultipleElementsToPDF(
            elements,
            `evaluations-${new Date().toISOString().split('T')[0]}`,
            options
          );
        }}
        availableElements={[
          { id: 'section-barres-empilees', label: '📊 Graphique en Barres Empilées', selected: true },
          { id: 'section-tableau-barres-empilees', label: '📋 Tableau de Données (Barres)', selected: true },
          { id: 'section-graphique1', label: '📊 Graphique 1 : Circonscription vs Académie', selected: true },
          { id: 'section-tableau-graphique1', label: '📋 Tableau de données Graphique 1', selected: true },
          { id: 'section-graphique2', label: '📈 Graphique 2 : Évolution Détaillée', selected: true },
          { id: 'section-tableau-graphique2', label: '📋 Tableau de données Graphique 2', selected: true }
        ]}
        defaultFilename="evaluations-circonscription"
      />
    </div>
  );
}
