'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

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
  nom: string;
  commune: string;
  type: string;
  classes: Array<{
    libelle: string;
    enseignant: string;
    niveau: string;
    nbEleves: number;
    dedoublee: boolean;
  }>;
  dispositifs?: Array<{
    libelle: string;
    type: string;
    nbEleves: number;
  }>;
}

function EcolesArchivePageContent() {
  const [ecoles, setEcoles] = useState<EcoleIdentite[]>([]);
  const [structures, setStructures] = useState<EcoleStructure[]>([]);
  const [selectedEcole, setSelectedEcole] = useState<EcoleIdentite | null>(null);
  const [selectedStructure, setSelectedStructure] = useState<EcoleStructure | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      const [identiteRes, structureRes] = await Promise.all([
        fetch(`/api/archives/data?annee=${annee}&type=ecoles_identite`),
        fetch(`/api/archives/data?annee=${annee}&type=ecoles_structure`)
      ]);
      
      const identiteData = await identiteRes.json();
      const structureData = await structureRes.json();
      
      setEcoles(Array.isArray(identiteData) ? identiteData : []);
      setStructures(Array.isArray(structureData) ? structureData : []);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
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
    if (type.includes('Élémentaire') || type.includes('lÃ©mentaire')) return '📚';
    if (type.includes('Primaire')) return '🏫';
    return '🏛️';
  };

  const filterDispositifsFromClasses = (classes: any[], dispositifs: any[]) => {
    if (!dispositifs || dispositifs.length === 0) return classes;
    
    const dispositifKeywords = ['ULIS', 'UPE2A', 'RASED', 'DISPOSITIF', 
                                'ES-ADP', 'ESDP', 'ES ADP',
                                'UNITÉ LOCALISÉE', 'UNITE LOCALISEE', 
                                'UNITES LOCALISEES'];
    
    return classes.filter(classe => {
      const libelle = classe.libelle?.toUpperCase() || '';
      return !dispositifKeywords.some(keyword => libelle.includes(keyword));
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-500 to-emerald-400">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl">Chargement...</p>
        </div>
      </div>
    );
  }

  const totalClasses = structures.reduce((sum, s) => {
    const classesFiltered = filterDispositifsFromClasses(s.classes || [], s.dispositifs || []);
    return sum + classesFiltered.length;
  }, 0);
  
  const totalEleves = structures.reduce((sum, s) => {
    const classesFiltered = filterDispositifsFromClasses(s.classes || [], s.dispositifs || []);
    return sum + classesFiltered.reduce((classSum, c) => classSum + (c.nbEleves || 0), 0);
  }, 0);
  
  const totalDispositifs = structures.reduce((sum, s) => sum + (s.dispositifs?.length || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-emerald-400">
      {/* En-tête */}
      <div className="text-white py-12 px-6">
        <div className="container mx-auto">
          <Link href={`/archives/consulter?annee=${annee}`} className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6">
            ← Retour à l&apos;archive {annee}
          </Link>
          
          {/* Banner mode archive */}
          <div className="bg-amber-500/20 border-2 border-amber-300 rounded-lg p-4 mb-6 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📖</span>
              <div>
                <h3 className="text-lg font-bold">Mode Consultation Archive</h3>
                <p className="opacity-90">Écoles - Année scolaire {annee}</p>
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-2">🏫 Écoles de la Circonscription</h1>
          <p className="text-white/90 text-lg">Cayenne 2 - Roura - {annee}</p>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="container mx-auto px-4 py-8 -mt-8 relative z-10">

        {/* Statistiques */}
        {ecoles.length > 0 && (
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
              <div className="text-3xl font-bold">{ecoles.length}</div>
              <div className="text-blue-100 text-sm">Écoles</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg">
              <div className="text-3xl font-bold">{totalClasses}</div>
              <div className="text-green-100 text-sm">Classes</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
              <div className="text-3xl font-bold">{totalEleves}</div>
              <div className="text-purple-100 text-sm">Élèves</div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-6 shadow-lg">
              <div className="text-3xl font-bold">{totalDispositifs}</div>
              <div className="text-orange-100 text-sm">Dispositifs</div>
            </div>
          </div>
        )}

        {/* Liste des écoles */}
        {ecoles.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🏫</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Aucune école dans cette archive</h3>
            <p className="text-gray-600">Les données d&apos;identité des écoles ne sont pas disponibles pour cette année.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ecoles.map((ecole) => {
              const structure = structures.find(s => s.uai === ecole.uai);
              const classesFiltered = structure ? filterDispositifsFromClasses(structure.classes || [], structure.dispositifs || []) : [];
              const nbClasses = classesFiltered.length;
              const nbEleves = classesFiltered.reduce((sum, c) => sum + (c.nbEleves || 0), 0);

              return (
                <div
                  key={ecole.uai}
                  onClick={() => openModal(ecole)}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-blue-500 p-6 relative group"
                >
                  {/* Badge UAI */}
                  <div className="absolute top-4 right-4 bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-mono">
                    {ecole.uai}
                  </div>

                  {/* Icône */}
                  <div className="text-5xl mb-4">{getIconForType(ecole.type)}</div>

                  {/* Nom */}
                  <h3 className="text-xl font-bold text-gray-800 mb-2 pr-24">
                    {ecole.nom}
                  </h3>

                  {/* Type */}
                  <p className="text-sm text-gray-600 mb-4">{ecole.type || 'École publique'}</p>

                  {/* Statistiques */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 border-t pt-4">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-blue-600">{nbClasses}</span>
                      <span>classes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-purple-600">{nbEleves}</span>
                      <span>élèves</span>
                    </div>
                  </div>

                  {/* Flèche */}
                  <div className="absolute bottom-4 right-4 text-gray-400 group-hover:text-blue-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal détails école */}
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
                    <h2 className="text-2xl font-bold">{selectedEcole.nom}</h2>
                    <p className="text-blue-100">{selectedEcole.type}</p>
                  </div>
                </div>
              </div>

              {/* Contenu modal */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Informations générales */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">📋 Informations générales</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-600">UAI:</span>
                        <span className="ml-2 font-semibold">{selectedEcole.uai}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Commune:</span>
                        <span className="ml-2 font-semibold">{selectedEcole.commune}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Directeur:</span>
                        <span className="ml-2 font-semibold">{selectedEcole.directeur}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Téléphone:</span>
                        <span className="ml-2 font-semibold">{selectedEcole.telephone}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">Adresse:</span>
                        <span className="ml-2 font-semibold">{selectedEcole.adresse}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">Email:</span>
                        <span className="ml-2 font-semibold">{selectedEcole.email}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">Collège de secteur:</span>
                        <span className="ml-2 font-semibold">{selectedEcole.college}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Structure des classes */}
                {selectedStructure && selectedStructure.classes && selectedStructure.classes.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-3">🎓 Structure des classes</h3>
                    <div className="space-y-2">
                      {filterDispositifsFromClasses(selectedStructure.classes, selectedStructure.dispositifs || []).map((classe, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800">{classe.libelle}</div>
                            <div className="text-sm text-gray-600">{classe.enseignant}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-blue-600">{classe.nbEleves} élèves</div>
                            {classe.dedoublee && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Dédoublée</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Dispositifs */}
                    {selectedStructure.dispositifs && selectedStructure.dispositifs.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-3">🎯 Dispositifs</h3>
                        <div className="space-y-2">
                          {selectedStructure.dispositifs.map((dispositif, idx) => (
                            <div key={idx} className="bg-orange-50 rounded-lg p-3 flex items-center justify-between border border-orange-200">
                              <div>
                                <div className="font-semibold text-gray-800">{dispositif.libelle}</div>
                                <div className="text-sm text-gray-600">{dispositif.type}</div>
                              </div>
                              <div className="font-bold text-orange-600">{dispositif.nbEleves} élèves</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(!selectedStructure || !selectedStructure.classes || selectedStructure.classes.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    Aucune donnée de structure disponible pour cette école
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

export default function EcolesArchivePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-white">Chargement...</div></div>}>
      <EcolesArchivePageContent />
    </Suspense>
  );
}
