'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { calculerEchelonComplet } from '@/lib/echelons';
import { exportTableToPDF } from '@/lib/pdfExport';

interface Enseignant {
  id: number;
  ecole_nom: string;
  annee_scolaire: string;
  nom: string;
  prenom: string;
  statut: string;
  anciennete: number;
  code_grade: string;
  discipline: string;
  type_poste: string;
  niveau_classe: string;
  classe_specialisee: string;
  effectif_classe: number;
  quotite: number;
  decharge_binome: string;
  nom_decharge_binome: string;
  mode_affectation: string;
  individu: string;
}

export default function EnseignantsArchivesPage() {
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
  const [ecoles, setEcoles] = useState<any[]>([]);
  const [stagiaireM2, setStagiaireM2] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const annee = searchParams.get('annee');
  const router = useRouter();
  
  // Filtres
  const [searchNom, setSearchNom] = useState('');
  const [selectedEcole, setSelectedEcole] = useState('');
  const [selectedStatut, setSelectedStatut] = useState('');
  const [selectedNiveau, setSelectedNiveau] = useState('');

  useEffect(() => {
    if (!annee) {
      router.push('/archives');
      return;
    }
    loadData();
  }, [annee, router]);

  const loadData = async () => {
    try {
      // Charger les données depuis l'API archives
      const [ensRes, ecolesRes, stagRes] = await Promise.all([
        fetch(`/api/archives/data?annee=${annee}&type=enseignants`),
        fetch(`/api/archives/data?annee=${annee}&type=ecoles`),
        fetch(`/api/archives/data?annee=${annee}&type=stagiaires_m2`)
      ]);

      const ensData = await ensRes.json();
      const ecolesData = await ecolesRes.json();
      const stagData = await stagRes.json();

      setEnseignants(Array.isArray(ensData) ? ensData : []);
      setEcoles(Array.isArray(ecolesData) ? ecolesData : []);
      setStagiaireM2(Array.isArray(stagData) ? stagData : []);
    } catch (error) {
      console.error('Erreur chargement:', error);
      setEnseignants([]);
      setEcoles([]);
      setStagiaireM2([]);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredEnseignants = () => {
    return enseignants.filter(ens => {
      // Filtre nom
      if (searchNom) {
        const search = searchNom.toLowerCase();
        const nomComplet = `${ens.nom} ${ens.prenom}`.toLowerCase();
        if (!nomComplet.includes(search)) return false;
      }

      // Filtre école
      if (selectedEcole && ens.ecole_nom !== selectedEcole) return false;

      // Filtre statut
      if (selectedStatut && ens.statut !== selectedStatut) return false;

      // Filtre niveau
      if (selectedNiveau && ens.niveau_classe !== selectedNiveau) return false;

      return true;
    });
  };

  const getUniqueValues = (field: keyof Enseignant) => {
    const values = enseignants.map(e => e[field]).filter(v => v);
    return [...new Set(values)].sort();
  };

  const getStatistiques = () => {
    const filtered = getFilteredEnseignants();
    return {
      total: filtered.length,
      titulaires: filtered.filter(e => e.statut === 'Titulaire').length,
      stagiaires: filtered.filter(e => e.statut === 'Stagiaire').length,
      contractuels: filtered.filter(e => e.statut === 'Contractuel').length,
    };
  };

  const handleExportPDF = () => {
    const filtered = getFilteredEnseignants();
    const headers = ['Nom', 'Prénom', 'École', 'Statut', 'Niveau', 'Échelon'];
    const data = filtered.map(ens => [
      ens.nom,
      ens.prenom,
      ens.ecole_nom,
      ens.statut,
      ens.niveau_classe || '-',
      calculerEchelonComplet(ens.anciennete, ens.code_grade).affichage
    ]);
    
    exportTableToPDF(
      `Enseignants ${annee} - Circonscription Cayenne 2`,
      headers,
      data,
      `Enseignants_Archive_${annee}_${new Date().toISOString().split('T')[0]}`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl">Chargement des enseignants archivés...</p>
        </div>
      </div>
    );
  }

  const filteredEnseignants = getFilteredEnseignants();
  const stats = getStatistiques();
  const statuts = getUniqueValues('statut');
  const niveaux = getUniqueValues('niveau_classe');

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
                <p className="opacity-90">Vous consultez les enseignants de l'année scolaire {annee}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
                👨‍🏫
              </div>
              <div>
                <h1 className="text-5xl font-bold">Enseignants {annee}</h1>
                <p className="text-xl opacity-90 mt-2">Archive de la circonscription</p>
              </div>
            </div>
            <button
              onClick={handleExportPDF}
              className="bg-white text-primary-700 px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors flex items-center gap-2"
            >
              📄 Exporter en PDF
            </button>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="container mx-auto px-6 py-8">
        
        {/* Statistiques */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card text-center">
            <div className="text-sm text-gray-600 mb-2">Total</div>
            <div className="text-4xl font-bold text-primary-700">{stats.total}</div>
          </div>
          <div className="card text-center">
            <div className="text-sm text-gray-600 mb-2">Titulaires</div>
            <div className="text-4xl font-bold text-green-600">{stats.titulaires}</div>
          </div>
          <div className="card text-center">
            <div className="text-sm text-gray-600 mb-2">Stagiaires</div>
            <div className="text-4xl font-bold text-orange-600">{stats.stagiaires}</div>
          </div>
          <div className="card text-center">
            <div className="text-sm text-gray-600 mb-2">Contractuels</div>
            <div className="text-4xl font-bold text-red-600">{stats.contractuels}</div>
          </div>
        </div>

        {/* Filtres */}
        <div className="card mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🔍 Filtres</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Recherche nom/prénom</label>
              <input
                type="text"
                value={searchNom}
                onChange={(e) => setSearchNom(e.target.value)}
                placeholder="Ex: Dupont Marie"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">École</label>
              <select
                value={selectedEcole}
                onChange={(e) => setSelectedEcole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Toutes les écoles</option>
                {ecoles.map((ecole, idx) => (
                  <option key={idx} value={ecole.nom}>{ecole.nom}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Statut</label>
              <select
                value={selectedStatut}
                onChange={(e) => setSelectedStatut(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Tous les statuts</option>
                {statuts.map((statut, idx) => (
                  <option key={idx} value={String(statut)}>{statut}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Niveau</label>
              <select
                value={selectedNiveau}
                onChange={(e) => setSelectedNiveau(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Tous les niveaux</option>
                {niveaux.map((niveau, idx) => (
                  <option key={idx} value={String(niveau)}>{niveau}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tableau des enseignants */}
        <div className="card">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            📋 Liste des enseignants ({filteredEnseignants.length})
          </h3>
          
          {filteredEnseignants.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              Aucun enseignant trouvé avec ces filtres
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>École</th>
                    <th>Statut</th>
                    <th>Ancienneté dans l'école</th>
                    <th>Classe / Échelon</th>
                    <th>Niveau</th>
                    <th>Effectif</th>
                    <th>Quotité</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnseignants.map((ens, idx) => {
                    const echelonInfo = calculerEchelonComplet(ens.anciennete, ens.code_grade);
                    
                    return (
                      <tr key={idx}>
                        <td className="font-semibold">
                          {ens.nom} {ens.prenom}
                        </td>
                        <td>{ens.ecole_nom}</td>
                        <td>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            ens.statut === 'Titulaire' ? 'bg-green-100 text-green-800' :
                            ens.statut === 'Stagiaire' ? 'bg-orange-100 text-orange-800' :
                            ens.statut === 'Contractuel' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {ens.statut}
                          </span>
                        </td>
                        <td className="text-center">
                          {ens.anciennete > 0 ? (
                            <span className="text-sm font-semibold text-primary-700">
                              {ens.anciennete} an{ens.anciennete > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm">
                              ✨ Nouveau
                            </span>
                          )}
                        </td>
                        <td>
                          {echelonInfo.affichage !== '-' ? (
                            <div className="text-sm">
                              <div className="font-semibold text-primary-700">{echelonInfo.classe}</div>
                              <div className="text-gray-600">Échelon {echelonInfo.echelon}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td>{ens.niveau_classe || '-'}</td>
                        <td className="text-center">{ens.effectif_classe || '-'}</td>
                        <td className="text-center">{ens.quotite ? `${ens.quotite}%` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tableau Stagiaires M2 SOPA */}
        {stagiaireM2.length > 0 && (
          <div className="card mt-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                  🎓 Stagiaires M2 SOPA
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Stagiaires non contractualisés - Année {annee}
                </p>
              </div>
              <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg font-semibold">
                {stagiaireM2.length} stagiaires
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">ℹ️</span>
                <div>
                  <h4 className="font-bold text-blue-900 mb-2">Informations sur les stages</h4>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <strong>Stage filé :</strong> Tous les lundis (accompagnement continu)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-500 rounded"></div>
                      <strong>Stage massé période 1 :</strong> Du 01/12 au 13/12/2025
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-purple-500 rounded"></div>
                      <strong>Stage massé période 2 :</strong> Du 02/03 au 14/03/2026
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th rowSpan={2} className="text-center border-r-2 border-gray-300">N°</th>
                    <th rowSpan={2} className="border-r-4 border-gray-400">Stagiaire</th>
                    <th colSpan={3} className="text-center bg-green-100 border-r-4 border-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                        Stage Filé (Lundis)
                      </div>
                    </th>
                    <th colSpan={3} className="text-center bg-blue-100 border-r-4 border-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        Stage Massé 1 (01/12-13/12)
                      </div>
                    </th>
                    <th colSpan={3} className="text-center bg-purple-100">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-3 h-3 bg-purple-500 rounded"></div>
                        Stage Massé 2 (02/03-14/03)
                      </div>
                    </th>
                  </tr>
                  <tr>
                    <th className="bg-green-100">École</th>
                    <th className="bg-green-100">Tuteur</th>
                    <th className="bg-green-100 border-r-4 border-gray-400">Niveau</th>
                    <th className="bg-blue-100">École</th>
                    <th className="bg-blue-100">Tuteur</th>
                    <th className="bg-blue-100 border-r-4 border-gray-400">Niveau</th>
                    <th className="bg-purple-100">École</th>
                    <th className="bg-purple-100">Tuteur</th>
                    <th className="bg-purple-100">Niveau</th>
                  </tr>
                </thead>
                <tbody>
                  {stagiaireM2.map((stag, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="text-center font-bold text-gray-600 border-r-2 border-gray-300">{idx + 1}</td>
                      <td className="border-r-4 border-gray-400">
                        <div className="font-bold text-gray-800">{stag.nom}</div>
                        <div className="text-sm text-gray-600">{stag.prenom}</div>
                      </td>
                      {/* Stage Filé */}
                      <td className="bg-green-50/50">
                        <div className="text-sm font-semibold">{stag.stage_file?.ecole || '-'}</div>
                      </td>
                      <td className="bg-green-50/50">
                        <div className="text-sm">{stag.stage_file?.tuteur || '-'}</div>
                      </td>
                      <td className="bg-green-50/50 text-center border-r-4 border-gray-400">
                        <span className="inline-block px-2 py-1 bg-green-500 text-white rounded text-xs font-bold">
                          {stag.stage_file?.niveau || '-'}
                        </span>
                      </td>
                      {/* Stage Massé 1 */}
                      <td className="bg-blue-50/50">
                        <div className="text-sm font-semibold">{stag.stage_masse_1?.ecole || '-'}</div>
                      </td>
                      <td className="bg-blue-50/50">
                        <div className="text-sm">{stag.stage_masse_1?.tuteur || '-'}</div>
                      </td>
                      <td className="bg-blue-50/50 text-center border-r-4 border-gray-400">
                        <span className="inline-block px-2 py-1 bg-blue-500 text-white rounded text-xs font-bold">
                          {stag.stage_masse_1?.niveau || '-'}
                        </span>
                      </td>
                      {/* Stage Massé 2 */}
                      <td className="bg-purple-50/50">
                        <div className="text-sm font-semibold">{stag.stage_masse_2?.ecole || '-'}</div>
                      </td>
                      <td className="bg-purple-50/50">
                        <div className="text-sm">{stag.stage_masse_2?.tuteur || '-'}</div>
                      </td>
                      <td className="bg-purple-50/50 text-center">
                        <span className="inline-block px-2 py-1 bg-purple-500 text-white rounded text-xs font-bold">
                          {stag.stage_masse_2?.niveau || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
              <p className="font-semibold mb-2">📋 Responsable : Madame Chantal LAUTRIC - IEN CAYENNE 2 ROURA</p>
              <p><strong>Note :</strong> Ces stagiaires ne sont pas comptabilisés dans les effectifs enseignants car non contractualisés par le rectorat.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
