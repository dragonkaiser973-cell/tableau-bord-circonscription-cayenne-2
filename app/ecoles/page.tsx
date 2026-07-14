'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AuroraHeader from '@/components/AuroraHeader';
import SpotlightCard from '@/components/SpotlightCard';
import StatPill from '@/components/StatPill';
import GradientMonogram, { initials } from '@/components/GradientMonogram';

interface EcoleIdentite {
  uai: string;
  secteur: string;
  type: string;
  nom: string;
  siret: string;
  etat: string;
  dateOuverture: string;
  commune: string;
  civilite: string;
  directeur: string;
  adresse: string;
  ville: string;
  telephone: string;
  email: string;
  college: string;
}

interface EcoleStructure {
  uai: string;
  classes: Array<{
    libelle: string;
    enseignant: string;
    niveau: string;
    nbEleves: number;
    dedoublee: boolean;
  }>;
  dispositifs: Array<{
    libelle: string;
    type: string;
    nbEleves: number;
  }>;
}

export default function EcolesPage() {
  const [ecoles, setEcoles] = useState<EcoleIdentite[]>([]);
  const [structures, setStructures] = useState<EcoleStructure[]>([]);
  const [selectedEcole, setSelectedEcole] = useState<EcoleIdentite | null>(null);
  const [selectedStructure, setSelectedStructure] = useState<EcoleStructure | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [identiteRes, structureRes] = await Promise.all([
        fetch('/api/ecoles-identite').catch(() => ({ ok: false })),
        fetch('/api/ecoles-structure').catch(() => ({ ok: false }))
      ]);
      
      if (identiteRes.ok && 'json' in identiteRes) {
        const identiteData = await identiteRes.json();
        setEcoles(identiteData);
      }
      
      if (structureRes.ok && 'json' in structureRes) {
        const structureData = await structureRes.json();
        setStructures(structureData);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    }
  };

  const openModal = (ecole: EcoleIdentite) => {
    setSelectedEcole(ecole);
    const structure = structures.find(s => s.uai === ecole.uai);
    setSelectedStructure(structure || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEcole(null);
    setSelectedStructure(null);
  };

  const getIconForType = (type: string | undefined | null) => {
    if (!type) return '🏛️';
    if (type.includes('Maternelle')) return '🎨';
    if (type.includes('Élémentaire')) return '📚';
    if (type.includes('Primaire')) return '🏫';
    return '🏛️';
  };

  const getGradientForType = (type: string | undefined | null): string => {
    if (!type) return 'from-slate-400 via-slate-500 to-slate-600';
    if (type.includes('Maternelle')) return 'from-rose-400 via-pink-400 to-fuchsia-400';
    if (type.includes('Élémentaire')) return 'from-sky-400 via-cyan-400 to-teal-400';
    if (type.includes('Primaire')) return 'from-amber-400 via-orange-400 to-rose-500';
    return 'from-violet-400 via-indigo-500 to-blue-500';
  };

  // Fonction pour filtrer les dispositifs des classes
  const filterDispositifsFromClasses = (classes: any[], dispositifs: any[]) => {
    if (!dispositifs || dispositifs.length === 0) return classes;
    
    // Mots-clés pour identifier les dispositifs
    const dispositifKeywords = ['ULIS', 'UPE2A', 'RASED', 'DISPOSITIF', 
                                'ES-ADP', 'ESDP', 'ES ADP',
                                'UNITÉ LOCALISÉE', 'UNITE LOCALISEE', 
                                'UNITE PEDAGOGIQUE', 'UNITÉ PÉDAGOGIQUE',
                                'RESEAU D\'AIDES', 'RÉSEAU D\'AIDES',
                                'REGROUPEMENT INCLUSIF'];
    
    return classes.filter(classe => {
      const libelleLower = classe.libelle.toLowerCase();
      
      // Vérifier si le libellé contient un mot-clé de dispositif
      const isDispositif = dispositifKeywords.some(keyword => 
        libelleLower.includes(keyword.toLowerCase())
      );
      
      // Garder la classe seulement si ce n'est PAS un dispositif
      return !isDispositif;
    });
  };

  const totalClasses = structures.reduce((sum, s) => {
    const classesFiltered = filterDispositifsFromClasses(s.classes, s.dispositifs || []);
    return sum + classesFiltered.length;
  }, 0);
  
  const totalEleves = structures.reduce((sum, s) => {
    const classesFiltered = filterDispositifsFromClasses(s.classes, s.dispositifs || []);
    return sum + classesFiltered.reduce((classSum, c) => classSum + c.nbEleves, 0);
  }, 0);
  
  const totalDispositifs = structures.reduce((sum, s) => sum + (s.dispositifs?.length || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <AuroraHeader
        kicker="Cayenne 2 — Roura"
        title="Écoles de la"
        titleAccent="circonscription."
        subtitle="Identité, structure, directeurs et dispositifs pour chacune des écoles du territoire."
        backLabel="Retour à l'accueil"
      />

      {/* Contenu principal */}
      <div className="container mx-auto max-w-7xl px-6 py-8 -mt-20 relative z-10">

        {/* Statistiques */}
        {ecoles.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-8">
            <StatPill
              value={ecoles.length}
              label="Écoles"
              gradient="from-sky-400 via-cyan-400 to-teal-400"
              variant="light"
            />
            <StatPill
              value={totalClasses}
              label="Classes"
              gradient="from-emerald-400 via-teal-400 to-cyan-400"
              variant="light"
            />
            <StatPill
              value={totalEleves}
              label="Élèves"
              gradient="from-violet-400 via-fuchsia-400 to-pink-400"
              variant="light"
              href="/statistiques"
            />
            <StatPill
              value={totalDispositifs}
              label="Dispositifs"
              gradient="from-amber-400 via-orange-400 to-rose-500"
              variant="light"
            />
          </div>
        )}

        {/* Liste des écoles */}
        {ecoles.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_1px_0_rgba(15,23,42,0.02),0_16px_36px_-20px_rgba(15,23,42,0.1)] p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18" />
                <path d="M5 21V7l7-4 7 4v14" />
                <path d="M9 21v-8h6v8" />
              </svg>
            </div>
            <h3 className="font-[Outfit,sans-serif] text-2xl font-bold text-slate-900 tracking-tight mb-2">Aucune école chargée</h3>
            <p className="text-slate-500 mb-6">Importez les fichiers ZIP depuis la page Données.</p>
            <Link
              href="/donnees"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0] text-white rounded-full font-semibold shadow-[0_8px_20px_-6px_rgba(30,90,120,0.4)] hover:shadow-[0_12px_30px_-8px_rgba(30,90,120,0.55)] hover:-translate-y-0.5 transition-all"
            >
              Aller à la page Données
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ecoles.map((ecole) => {
              const structure = structures.find(s => s.uai === ecole.uai);
              const classesFiltered = structure ? filterDispositifsFromClasses(structure.classes, structure.dispositifs || []) : [];
              const nbClasses = classesFiltered.length;
              const nbEleves = classesFiltered.reduce((sum, c) => sum + c.nbEleves, 0);
              const gradient = getGradientForType(ecole.type);

              return (
                <SpotlightCard key={ecole.uai} accent={gradient} onClick={() => openModal(ecole)}>
                  {/* Header row: monogram + UAI badge */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <GradientMonogram text={initials(ecole.nom)} gradient={gradient} size="md" />
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 px-2.5 py-1 text-[10px] font-mono font-semibold text-slate-500 tracking-wide">
                      {ecole.uai}
                    </div>
                  </div>

                  {/* Name */}
                  <h3 className="font-[Outfit,sans-serif] text-lg font-semibold text-slate-950 tracking-tight leading-tight mb-1.5">
                    {ecole.nom}
                  </h3>

                  {/* Type */}
                  <p className="text-[12px] font-medium text-slate-500 tracking-wide mb-5">
                    {ecole.type || 'École publique'}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center gap-5 pt-4 border-t border-slate-100">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-[Outfit,sans-serif] font-bold text-lg text-slate-950 tabular-nums">{nbClasses}</span>
                      <span className="text-[11px] uppercase tracking-[0.15em] font-semibold text-slate-400">classes</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-[Outfit,sans-serif] font-bold text-lg text-slate-950 tabular-nums">{nbEleves}</span>
                      <span className="text-[11px] uppercase tracking-[0.15em] font-semibold text-slate-400">élèves</span>
                    </div>
                    <div className="ml-auto text-slate-400 group-hover:text-[#45b8a0] group-hover:translate-x-0.5 transition-all">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" />
                        <path d="M12 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </SpotlightCard>
              );
            })}
          </div>
        )}

        {/* Modal */}
        {isModalOpen && selectedEcole && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* En-tête modal */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 relative">
                <button
                  onClick={closeModal}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 flex items-center justify-center transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="flex items-center gap-4">
                  <div className="text-5xl">{getIconForType(selectedEcole.type)}</div>
                  <div>
                    <h2 className="text-3xl font-bold">{selectedEcole.nom}</h2>
                    <p className="text-blue-100">{selectedEcole.type || 'École publique'}</p>
                  </div>
                </div>
              </div>

              {/* Contenu modal */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                {/* Carte d'identité complète */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 mb-6 border-2 border-blue-200">
                  <h3 className="text-xl font-bold text-blue-900 mb-4">📋 Carte d'Identité</h3>
                  
                  {/* Identification */}
                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-blue-800 mb-3 uppercase tracking-wide">Identification</h4>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-blue-700 font-semibold">Code UAI</p>
                        <p className="text-gray-800 font-mono">{selectedEcole.uai}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 font-semibold">Secteur</p>
                        <p className="text-gray-800">{selectedEcole.secteur || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 font-semibold">École</p>
                        <p className="text-gray-800">{selectedEcole.type || 'École publique'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 font-semibold">Libellé</p>
                        <p className="text-gray-800 font-semibold">{selectedEcole.nom}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 font-semibold">N° SIRET</p>
                        <p className="text-gray-800 font-mono text-sm">{selectedEcole.siret || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 font-semibold">État</p>
                        <p className="text-gray-800">{selectedEcole.etat || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 font-semibold">Date d'ouverture</p>
                        <p className="text-gray-800">{selectedEcole.dateOuverture || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 font-semibold">Commune</p>
                        <p className="text-gray-800">{selectedEcole.commune || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Direction */}
                  <div className="mb-6 pt-4 border-t-2 border-blue-200">
                    <h4 className="text-sm font-bold text-blue-800 mb-3 uppercase tracking-wide">Direction</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-blue-700 font-semibold">Directeur/Directrice</p>
                        <p className="text-gray-800">
                          {selectedEcole.civilite} {selectedEcole.directeur || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 font-semibold">Adresse</p>
                        <p className="text-gray-800">{selectedEcole.adresse || '—'}</p>
                        {selectedEcole.ville && <p className="text-gray-800">{selectedEcole.ville}</p>}
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 font-semibold">Téléphone</p>
                        <p className="text-gray-800 font-mono">{selectedEcole.telephone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 font-semibold">Courriel</p>
                        <p className="text-gray-800 text-sm">{selectedEcole.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Collège de rattachement */}
                  {selectedEcole.college && (
                    <div className="pt-4 border-t-2 border-blue-200">
                      <h4 className="text-sm font-bold text-blue-800 mb-2 uppercase tracking-wide">Collège de rattachement</h4>
                      <p className="text-gray-800 font-mono text-sm bg-white p-3 rounded border border-blue-200">
                        {selectedEcole.college}
                      </p>
                    </div>
                  )}
                </div>

                {/* Structure */}
                {selectedStructure && selectedStructure.classes.length > 0 && (
                  <>
                    {/* Classes (sans les dispositifs) */}
                    {(() => {
                      const classesFiltered = filterDispositifsFromClasses(
                        selectedStructure.classes, 
                        selectedStructure.dispositifs || []
                      );
                      
                      return classesFiltered.length > 0 && (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 mb-6">
                          <h3 className="text-xl font-bold text-green-800 mb-4">
                            📚 Classes ({classesFiltered.length})
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b-2 border-green-300">
                                  <th className="text-left p-3 font-bold text-green-900">Classe</th>
                                  <th className="text-left p-3 font-bold text-green-900">Enseignant</th>
                                  <th className="text-left p-3 font-bold text-green-900">Niveau</th>
                                  <th className="text-center p-3 font-bold text-green-900">Nb Élèves</th>
                                  <th className="text-center p-3 font-bold text-green-900">Dédoublée</th>
                                </tr>
                              </thead>
                              <tbody>
                                {classesFiltered.map((classe, idx) => (
                                  <tr key={idx} className="border-b border-green-100 hover:bg-green-100">
                                    <td className="p-3 font-medium">{classe.libelle}</td>
                                    <td className="p-3">{classe.enseignant}</td>
                                    <td className="p-3">
                                      <span className="inline-block bg-green-200 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                                        {classe.niveau}
                                      </span>
                                    </td>
                                    <td className="p-3 text-center">
                                      {classe.nbEleves > 0 ? (
                                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded font-bold">
                                          {classe.nbEleves}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </td>
                                    <td className="p-3 text-center">
                                      {classe.dedoublee ? (
                                        <span className="inline-block bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold">
                                          OUI
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Dispositifs */}
                    {selectedStructure.dispositifs && selectedStructure.dispositifs.length > 0 && (
                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200">
                        <h3 className="text-xl font-bold text-purple-800 mb-4">
                          🎯 Dispositifs spécialisés ({selectedStructure.dispositifs.length})
                        </h3>
                        <div className="space-y-3">
                          {selectedStructure.dispositifs.map((disp, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-4 border-2 border-purple-200 hover:border-purple-400 transition-colors">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-bold text-purple-900 text-lg">{disp.libelle}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="inline-block bg-purple-200 text-purple-800 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
                                      {disp.type}
                                    </span>
                                    <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                                      {disp.nbEleves} élève{disp.nbEleves > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!selectedStructure && (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                    <p className="text-yellow-800">
                      ⚠️ Aucune structure disponible pour cette école. Importez le fichier ZIP des structures.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
    </div>
  );
}
