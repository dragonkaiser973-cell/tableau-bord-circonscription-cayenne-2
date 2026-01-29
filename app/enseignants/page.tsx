'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { calculerEchelonComplet } from '@/lib/echelons';
import PDFExportModal from '@/components/PDFExportModal';
import { exportMultipleElementsToPDF, PDFExportOptions } from '@/lib/pdfExport';

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

export default function EnseignantsPage() {
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
  const [ecoles, setEcoles] = useState<any[]>([]);
  const [stagiaireM2, setStagiaireM2] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Filtres
  const [searchNom, setSearchNom] = useState('');
  const [selectedEcole, setSelectedEcole] = useState('');
  const [selectedAnnee, setSelectedAnnee] = useState('');
  const [selectedStatut, setSelectedStatut] = useState('');
  const [selectedNiveau, setSelectedNiveau] = useState('');
  const [selectedSpecialite, setSelectedSpecialite] = useState('');
  const [hasDecharge, setHasDecharge] = useState('');

  // Fonction pour normaliser les noms (enlever accents, tirets, espaces multiples)
  const normaliserNom = (nom: string): string => {
    return nom
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Enlever accents
      .replace(/[-\s]+/g, ' ') // Normaliser espaces et tirets
      .trim();
  };

  // Fonction pour extraire nom et prénom d'une chaîne
  const extraireNomPrenom = (texte: string): { nom: string, prenom: string } => {
    // Format attendu: "Mme/M. NOM Prénom" ou "NOM Prénom"
    const nettoye = texte.replace(/^(Mme|M\.|Mlle)\s+/i, '').trim();
    const parties = nettoye.split(/\s+/);
    
    if (parties.length >= 2) {
      // Le premier mot est généralement le nom, le reste le prénom
      const nom = parties[0];
      const prenom = parties.slice(1).join(' ');
      return { nom, prenom };
    }
    
    return { nom: nettoye, prenom: '' };
  };

  // Fonction pour comparer deux enseignants (matching fuzzy)
  const enseignantsCorrespondent = (ens1Nom: string, ens1Prenom: string, ens2Texte: string): boolean => {
    const nom1 = normaliserNom(ens1Nom);
    const prenom1 = normaliserNom(ens1Prenom);
    
    const { nom: nom2, prenom: prenom2 } = extraireNomPrenom(ens2Texte);
    const nom2Norm = normaliserNom(nom2);
    const prenom2Norm = normaliserNom(prenom2);
    
    // Match exact
    if (nom1 === nom2Norm && prenom1 === prenom2Norm) {
      return true;
    }
    
    // Match nom exact et première lettre du prénom
    if (nom1 === nom2Norm && prenom1.length > 0 && prenom2Norm.length > 0) {
      if (prenom1[0] === prenom2Norm[0]) {
        return true;
      }
    }
    
    // Match avec nom composé (ex: "JEAN-PIERRE" vs "JEAN PIERRE")
    const nom1SansEspace = nom1.replace(/[\s-]/g, '');
    const nom2SansEspace = nom2Norm.replace(/[\s-]/g, '');
    if (nom1SansEspace === nom2SansEspace && prenom1[0] === prenom2Norm[0]) {
      return true;
    }
    
    return false;
  };

  // Fonction d'enrichissement principale
  const enrichirEnseignantsAvecStructure = (enseignants: Enseignant[], structures: any[], ecoles: any[]): Enseignant[] => {
    if (!structures || structures.length === 0) {
      console.log('❌ Pas de données de structure disponibles');
      return enseignants;
    }

    if (!ecoles || ecoles.length === 0) {
      console.log('❌ Pas de données écoles disponibles');
      return enseignants;
    }

    console.log(`🔄 Enrichissement: ${enseignants.length} enseignants, ${structures.length} structures, ${ecoles.length} écoles`);
    
    // Créer un mapping nom école -> UAI
    const nomToUai = new Map<string, string>();
    ecoles.forEach((ecole: any) => {
      if (ecole.nom && ecole.uai) {
        const nomNorm = normaliserNom(ecole.nom);
        nomToUai.set(nomNorm, ecole.uai);
        console.log(`📍 Mapping: "${ecole.nom}" -> ${ecole.uai}`);
      }
    });

    // Créer un mapping UAI -> structure
    const uaiToStructure = new Map<string, any>();
    structures.forEach((structure: any) => {
      if (structure.uai) {
        uaiToStructure.set(structure.uai, structure);
      }
    });

    console.log(`📋 ${nomToUai.size} écoles mappées, ${uaiToStructure.size} structures disponibles`);

    let nbEnrichis = 0;
    let nbTentes = 0;

    const enseignantsEnrichis = enseignants.map(ens => {
      // Si niveau et effectif déjà renseignés, ne rien faire
      if (ens.niveau_classe && ens.niveau_classe !== '' && ens.effectif_classe > 0) {
        return ens;
      }

      nbTentes++;

      // Trouver l'UAI de l'école de l'enseignant
      const nomEcoleNorm = normaliserNom(ens.ecole_nom);
      const uai = nomToUai.get(nomEcoleNorm);

      if (!uai) {
        console.log(`⚠️  École non trouvée: "${ens.ecole_nom}" (normalisé: "${nomEcoleNorm}")`);
        return ens;
      }

      // Trouver la structure correspondante
      const structure = uaiToStructure.get(uai);

      if (!structure || !structure.classes) {
        console.log(`⚠️  Structure non trouvée pour UAI ${uai}`);
        return ens;
      }

      // Chercher une classe correspondant à cet enseignant
      const classeCorrespondante = structure.classes.find((classe: any) => {
        if (!classe.enseignant) return false;
        
        // Gérer le cas de multi-enseignants (séparés par des espaces multiples)
        const enseignants = classe.enseignant.split(/\s{2,}/).map((e: string) => e.trim());
        
        return enseignants.some((enseignantTexte: string) => 
          enseignantsCorrespondent(ens.nom, ens.prenom, enseignantTexte)
        );
      });

      if (classeCorrespondante) {
        nbEnrichis++;
        console.log(`✅ Match: ${ens.nom} ${ens.prenom} (${ens.ecole_nom}) -> ${classeCorrespondante.niveau} (${classeCorrespondante.nbEleves} élèves)`);
        
        return {
          ...ens,
          niveau_classe: classeCorrespondante.niveau || ens.niveau_classe,
          effectif_classe: classeCorrespondante.nbEleves || ens.effectif_classe
        };
      } else {
        console.log(`❌ Pas de match pour: ${ens.nom} ${ens.prenom} dans ${ens.ecole_nom} (${structure.classes.length} classes)`);
      }

      return ens;
    });

    console.log(`\n📊 Résultat: ${nbEnrichis}/${nbTentes} enseignants enrichis (${((nbEnrichis/nbTentes)*100).toFixed(1)}%)`);
    return enseignantsEnrichis;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [ensRes, ecolesRes, structuresRes] = await Promise.all([
        fetch('/api/enseignants'),
        fetch('/api/ecoles'),
        fetch('/ecoles_structure.json').catch(() => ({ ok: false }))
      ]);

      const ensData = await ensRes.json();
      const ecolesData = await ecolesRes.json();

      // Charger les structures si disponibles
      let structuresData = [];
      if (structuresRes.ok && 'json' in structuresRes) {
        structuresData = await structuresRes.json();
      }

      console.log('📊 Données chargées:', {
        enseignants: ensData.length,
        ecoles: ecolesData.length, 
        structures: structuresData.length
      });

      // Enrichir les enseignants avec les données de structure
      const enseignantsEnrichis = enrichirEnseignantsAvecStructure(ensData, structuresData, ecolesData);
      
      setEnseignants(enseignantsEnrichis);
      setEcoles(ecolesData);

      // Ne pas définir d'année par défaut pour afficher tous les enseignants
      // L'utilisateur pourra filtrer manuellement si besoin
      setSelectedAnnee('');

      // Charger les stagiaires M2
      try {
        const stagiaireRes = await fetch('/stagiaires_m2.json');
        if (stagiaireRes.ok) {
          const stagiaireData = await stagiaireRes.json();
          setStagiaireM2(stagiaireData);
        }
      } catch (err) {
        console.warn('Fichier stagiaires M2 non trouvé');
        setStagiaireM2([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setLoading(false);
    }
  };

  const getFilteredEnseignants = () => {
    return enseignants.filter(e => {
      const matchNom = !searchNom || 
        e.nom.toLowerCase().includes(searchNom.toLowerCase()) ||
        (e.prenom && e.prenom.toLowerCase().includes(searchNom.toLowerCase()));
      
      const matchEcole = !selectedEcole || e.ecole_nom === selectedEcole;
      const matchAnnee = !selectedAnnee || e.annee_scolaire === selectedAnnee;
      const matchStatut = !selectedStatut || e.statut === selectedStatut;
      const matchNiveau = !selectedNiveau || e.niveau_classe === selectedNiveau;
      
      // Filtre spécialité
      const matchSpecialite = !selectedSpecialite || 
        (e.discipline && e.discipline.toUpperCase().includes(selectedSpecialite.toUpperCase()));
      
      const matchDecharge = !hasDecharge || 
        (hasDecharge === 'oui' && e.decharge_binome) ||
        (hasDecharge === 'non' && !e.decharge_binome);

      return matchNom && matchEcole && matchAnnee && matchStatut && matchNiveau && matchSpecialite && matchDecharge;
    });
  };

  const getUniqueValues = (field: keyof Enseignant) => {
    return [...new Set(enseignants.map(e => e[field]).filter(Boolean))].sort();
  };

  const getStatistiques = () => {
    const filtered = getFilteredEnseignants();
    const total = filtered.length;
    const parStatut: { [key: string]: number } = {};
    const parNiveau: { [key: string]: number } = {};
    
    filtered.forEach(e => {
      if (e.statut) {
        parStatut[e.statut] = (parStatut[e.statut] || 0) + 1;
      }
      if (e.niveau_classe) {
        parNiveau[e.niveau_classe] = (parNiveau[e.niveau_classe] || 0) + 1;
      }
    });

    return { total, parStatut, parNiveau };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl text-white">Chargement des enseignants...</p>
        </div>
      </div>
    );
  }

  const handleExportPDF = () => {
    setShowExportModal(true);
  };

  const filteredEnseignants = getFilteredEnseignants();
  const stats = getStatistiques();
  const annees = getUniqueValues('annee_scolaire');
  const statuts = getUniqueValues('statut');
  const niveaux = getUniqueValues('niveau_classe');

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      {/* Header */}
      <div className="text-white py-16 px-6">
        <div className="container mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6">
            ← Retour à l'accueil
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
                👨‍🏫
              </div>
              <div>
                <h1 className="text-5xl font-bold">Enseignants</h1>
                <p className="text-xl opacity-90 mt-2">Recherche et parcours des enseignants de la circonscription</p>
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
        <div className="grid md:grid-cols-4 gap-6 mb-6" id="section-stats">
          <div className="card bg-gradient-to-br from-primary-500 to-primary-700 text-white">
            <h3 className="text-xs uppercase tracking-wider opacity-90 mb-2">Total enseignants</h3>
            <div className="text-4xl font-bold">{stats.total}</div>
          </div>
          
          <div className="card bg-gradient-to-br from-info to-primary-800 text-white">
            <h3 className="text-xs uppercase tracking-wider opacity-90 mb-2">Titulaires</h3>
            <div className="text-4xl font-bold">{stats.parStatut['Titulaire'] || 0}</div>
          </div>
          
          <div className="card bg-gradient-to-br from-warning to-[#d66028] text-white">
            <h3 className="text-xs uppercase tracking-wider opacity-90 mb-2">Stagiaires</h3>
            <div className="text-4xl font-bold">{stats.parStatut['Stagiaire'] || 0}</div>
          </div>
          
          <div className="card bg-gradient-to-br from-success to-success-light text-white">
            <h3 className="text-xs uppercase tracking-wider opacity-90 mb-2">Contractuels</h3>
            <div className="text-4xl font-bold">{stats.parStatut['Contractuel'] || 0}</div>
          </div>
        </div>

        {/* Filtres de recherche */}
        <div className="card mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🔍 Recherche et filtres</h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nom / Prénom</label>
              <input
                type="text"
                value={searchNom}
                onChange={(e) => setSearchNom(e.target.value)}
                placeholder="Rechercher un enseignant..."
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">École</label>
              <select
                value={selectedEcole}
                onChange={(e) => setSelectedEcole(e.target.value)}
                className="input-field"
              >
                <option value="">Toutes les écoles</option>
                {ecoles.map(ecole => (
                  <option key={ecole.id} value={ecole.nom}>{ecole.nom}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Année scolaire</label>
              <select
                value={selectedAnnee}
                onChange={(e) => setSelectedAnnee(e.target.value)}
                className="input-field"
              >
                <option value="">Toutes les années</option>
                {annees.map(annee => (
                  <option key={annee} value={annee}>{annee}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Statut</label>
              <select
                value={selectedStatut}
                onChange={(e) => setSelectedStatut(e.target.value)}
                className="input-field"
              >
                <option value="">Tous les statuts</option>
                {statuts.map(statut => (
                  <option key={statut} value={statut}>{statut}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Niveau</label>
              <select
                value={selectedNiveau}
                onChange={(e) => setSelectedNiveau(e.target.value)}
                className="input-field"
              >
                <option value="">Tous les niveaux</option>
                {niveaux.map(niveau => (
                  <option key={niveau} value={niveau}>{niveau}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Spécialité</label>
              <select
                value={selectedSpecialite}
                onChange={(e) => setSelectedSpecialite(e.target.value)}
                className="input-field"
              >
                <option value="">Toutes les spécialités</option>
                <option value="DIRECTION">Direction</option>
                <option value="ULIS">ULIS</option>
                <option value="RASED">RASED</option>
                <option value="OPTION E">Option E</option>
                <option value="ACCUEIL PRIMO">Accueil primo-arrivants</option>
                <option value="REFERENT">Référent numérique</option>
                <option value="COORDO">Coordinateur</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Décharge/Binôme</label>
              <select
                value={hasDecharge}
                onChange={(e) => setHasDecharge(e.target.value)}
                className="input-field"
              >
                <option value="">Tous</option>
                <option value="oui">Avec décharge/binôme</option>
                <option value="non">Sans décharge/binôme</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => {
              setSearchNom('');
              setSelectedEcole('');
              setSelectedStatut('');
              setSelectedNiveau('');
              setSelectedSpecialite('');
              setHasDecharge('');
            }}
            className="text-sm text-primary-600 hover:text-primary-700 font-semibold"
          >
            🔄 Réinitialiser les filtres
          </button>
        </div>

        {/* Résultats */}
        <div className="card" id="section-liste">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">
              📋 Résultats ({filteredEnseignants.length} enseignant{filteredEnseignants.length > 1 ? 's' : ''})
            </h3>
          </div>

          {filteredEnseignants.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Aucun enseignant trouvé</h3>
              <p className="text-gray-600">Modifiez vos critères de recherche</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>École</th>
                    <th>Année</th>
                    <th>Statut</th>
                    <th>Ancienneté dans l'école</th>
                    <th>Classe / Échelon</th>
                    <th>Spécialité</th>
                    <th>Mode affectation</th>
                    <th>Niveau</th>
                    <th>Effectif</th>
                    <th>Quotité</th>
                    <th>Décharge/Binôme</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnseignants.map((ens, idx) => {
                    const echelonInfo = calculerEchelonComplet(ens.anciennete, ens.code_grade);
                    
                    // Nettoyer la spécialité : masquer "SANS SPECIALITE"
                    const specialite = ens.discipline && 
                                      !ens.discipline.toUpperCase().includes('SANS SPECIALITE') &&
                                      !ens.discipline.toUpperCase().includes('SANS SPÉCIALITÉ')
                                      ? ens.discipline 
                                      : '';
                    
                    return (
                      <tr key={idx}>
                        <td className="font-semibold">
                          {ens.nom} {ens.prenom}
                        </td>
                        <td>{ens.ecole_nom}</td>
                        <td>{ens.annee_scolaire}</td>
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
                        <td>
                          {specialite ? (
                            <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                              {specialite}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td>
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            ens.mode_affectation === 'Affectation Définitive' ? 'bg-blue-100 text-blue-800' :
                            ens.mode_affectation === 'Affectation Provisoire' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {ens.mode_affectation === 'Affectation Définitive' ? 'Définitive' :
                             ens.mode_affectation === 'Affectation Provisoire' ? 'Provisoire' :
                             '-'}
                          </span>
                        </td>
                        <td>{ens.niveau_classe || '-'}</td>
                        <td className="text-center">{ens.effectif_classe || '-'}</td>
                        <td className="text-center">{(ens.quotite * 100).toFixed(0)}%</td>
                        <td>
                          {ens.decharge_binome ? (
                            <div className="text-sm">
                              <div className="font-semibold text-primary-600">{ens.decharge_binome}</div>
                              {ens.nom_decharge_binome && (
                                <div className="text-gray-500">{ens.nom_decharge_binome}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Tableau Stagiaires M2 SOPA */}
        <div className="card mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                🎓 Stagiaires M2 SOPA
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Stagiaires non contractualisés - Année 2025-2026
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
                      <div className="text-sm font-semibold">{stag.stage_file.ecole}</div>
                    </td>
                    <td className="bg-green-50/50">
                      <div className="text-sm">{stag.stage_file.tuteur}</div>
                    </td>
                    <td className="bg-green-50/50 text-center border-r-4 border-gray-400">
                      <span className="inline-block px-2 py-1 bg-green-500 text-white rounded text-xs font-bold">
                        {stag.stage_file.niveau}
                      </span>
                    </td>
                    {/* Stage Massé 1 */}
                    <td className="bg-blue-50/50">
                      <div className="text-sm font-semibold">{stag.stage_masse_1.ecole}</div>
                    </td>
                    <td className="bg-blue-50/50">
                      <div className="text-sm">{stag.stage_masse_1.tuteur}</div>
                    </td>
                    <td className="bg-blue-50/50 text-center border-r-4 border-gray-400">
                      <span className="inline-block px-2 py-1 bg-blue-500 text-white rounded text-xs font-bold">
                        {stag.stage_masse_1.niveau}
                      </span>
                    </td>
                    {/* Stage Massé 2 */}
                    <td className="bg-purple-50/50">
                      <div className="text-sm font-semibold">{stag.stage_masse_2.ecole}</div>
                    </td>
                    <td className="bg-purple-50/50">
                      <div className="text-sm">{stag.stage_masse_2.tuteur}</div>
                    </td>
                    <td className="bg-purple-50/50 text-center">
                      <span className="inline-block px-2 py-1 bg-purple-500 text-white rounded text-xs font-bold">
                        {stag.stage_masse_2.niveau}
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
            `enseignants-${new Date().toISOString().split('T')[0]}`,
            options
          );
        }}
        availableElements={[
          { id: 'section-stats', label: '📊 Statistiques Enseignants', selected: true },
          { id: 'section-liste', label: '👥 Liste des Enseignants', selected: true }
        ]}
        defaultFilename="enseignants-circonscription"
      />
    </div>
  );
}
