'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Evenement {
  id: string;
  titre: string;
  type: 'rendez-vous' | 'formation' | 'reunion';
  dateDebut: string;
  dateFin: string;
  lieu: string;
}

interface PeriodeVacances {
  nom: string;
  debut: string;
  fin: string;
}

const TYPES_EVENEMENTS = {
  'rendez-vous': { label: 'Rendez-vous', color: 'bg-blue-500', lightColor: 'bg-blue-100', textColor: 'text-blue-800' },
  'formation': { label: 'Formation', color: 'bg-green-500', lightColor: 'bg-green-100', textColor: 'text-green-800' },
  'reunion': { label: 'Réunion', color: 'bg-purple-500', lightColor: 'bg-purple-100', textColor: 'text-purple-800' }
};

const MOIS = [
  'Septembre', 'Octobre', 'Novembre', 'Décembre',
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août'
];

// Vacances scolaires Guyane - mise à jour automatique
const getVacancesScolaires = (anneeScolaire: number): PeriodeVacances[] => {
  return [
    { nom: 'Toussaint', debut: `${anneeScolaire}-10-19`, fin: `${anneeScolaire}-11-04` },
    { nom: 'Noël', debut: `${anneeScolaire}-12-21`, fin: `${anneeScolaire + 1}-01-06` },
    { nom: 'Carnaval', debut: `${anneeScolaire + 1}-02-22`, fin: `${anneeScolaire + 1}-03-10` },
    { nom: 'Printemps', debut: `${anneeScolaire + 1}-04-12`, fin: `${anneeScolaire + 1}-04-28` },
    { nom: 'Été', debut: `${anneeScolaire + 1}-07-05`, fin: `${anneeScolaire + 1}-09-01` }
  ];
};

function CalendrierPageContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [moisActuel, setMoisActuel] = useState(0);
  const [anneeActuelle, setAnneeActuelle] = useState(2024);
  const [viewMode, setViewMode] = useState<'mois' | 'annee'>('mois'); // Vue mensuelle par défaut
  const searchParams = useSearchParams();
  const annee = searchParams.get('annee');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/');
    } else if (!annee) {
      router.push('/archives');
    } else {
      setIsAuthenticated(true);
      loadEvenements();
      initializeAnneeScolaire();
    }
  }, [router, annee]);

  const initializeAnneeScolaire = () => {
    if (annee) {
      const [debut] = annee.split('-');
      setAnneeActuelle(parseInt(debut));
      setMoisActuel(0); // Commencer à septembre
    }
  };

  const loadEvenements = async () => {
    try {
      const res = await fetch(`/api/archives/data?annee=${annee}&type=evenements`);
      const data = await res.json();
      setEvenements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erreur chargement événements:', error);
      setEvenements([]);
    }
  };

  const getVacances = () => {
    return getVacancesScolaires(anneeActuelle);
  };

  const getAnneeScolaire = () => {
    return `${anneeActuelle}-${anneeActuelle + 1}`;
  };

  const getMoisDate = () => {
    const moisCalendaire = moisActuel < 4 ? moisActuel + 8 : moisActuel - 4;
    const annee = moisActuel < 4 ? anneeActuelle : anneeActuelle + 1;
    return new Date(annee, moisCalendaire, 1);
  };

  const getJoursDuMois = () => {
    const date = getMoisDate();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const jours = [];
    const premierJour = firstDay.getDay();
    const offset = premierJour === 0 ? 6 : premierJour - 1;
    
    for (let i = 0; i < offset; i++) {
      jours.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      jours.push(new Date(date.getFullYear(), date.getMonth(), i));
    }
    
    return jours;
  };

  const getEvenementsForDate = (date: Date) => {
    if (!date) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    
    return evenements.filter(evt => {
      const debut = new Date(evt.dateDebut);
      const fin = new Date(evt.dateFin);
      const current = new Date(dateStr);
      
      return current >= debut && current <= fin;
    });
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const isVacances = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const vacances = getVacancesScolaires(anneeActuelle);
    
    return vacances.some(periode => {
      return dateStr >= periode.debut && dateStr <= periode.fin;
    });
  };

  const getNomVacances = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const vacances = getVacancesScolaires(anneeActuelle);
    
    const periode = vacances.find(p => dateStr >= p.debut && dateStr <= p.fin);
    return periode ? periode.nom : '';
  };

  const changerMois = (delta: number) => {
    let nouveauMois = moisActuel + delta;
    let nouvelleAnnee = anneeActuelle;
    
    if (nouveauMois < 0) {
      nouveauMois = 11;
      nouvelleAnnee--;
    } else if (nouveauMois > 11) {
      nouveauMois = 0;
      nouvelleAnnee++;
    }
    
    setMoisActuel(nouveauMois);
    setAnneeActuelle(nouvelleAnnee);
  };

  const changerAnneeScolaire = (nouvelleAnnee: number) => {
    setAnneeActuelle(nouvelleAnnee);
    setMoisActuel(0);
  };

  const getMoisAnneeScolaire = () => {
    // Retourne les 12 mois de l'année scolaire avec leurs dates
    const mois = [];
    for (let i = 0; i < 12; i++) {
      const moisCalendaire = i < 4 ? i + 8 : i - 4;
      const annee = i < 4 ? anneeActuelle : anneeActuelle + 1;
      mois.push({
        index: i,
        nom: MOIS[i],
        date: new Date(annee, moisCalendaire, 1),
        annee: annee
      });
    }
    return mois;
  };

  const getEvenementsForMonth = (monthIndex: number) => {
    const moisCalendaire = monthIndex < 4 ? monthIndex + 8 : monthIndex - 4;
    const annee = monthIndex < 4 ? anneeActuelle : anneeActuelle + 1;
    const firstDay = new Date(annee, moisCalendaire, 1);
    const lastDay = new Date(annee, moisCalendaire + 1, 0);
    
    return evenements.filter(evt => {
      const debut = new Date(evt.dateDebut);
      const fin = new Date(evt.dateFin);
      
      return (debut <= lastDay && fin >= firstDay);
    });
  };

  const hasVacancesInMonth = (monthIndex: number) => {
    const moisCalendaire = monthIndex < 4 ? monthIndex + 8 : monthIndex - 4;
    const annee = monthIndex < 4 ? anneeActuelle : anneeActuelle + 1;
    const firstDay = new Date(annee, moisCalendaire, 1);
    const lastDay = new Date(annee, moisCalendaire + 1, 0);
    const vacances = getVacancesScolaires(anneeActuelle);
    
    return vacances.some(periode => {
      const debut = new Date(periode.debut);
      const fin = new Date(periode.fin);
      return (debut <= lastDay && fin >= firstDay);
    });
  };

  if (!isAuthenticated) {
    return <div>Chargement...</div>;
  }

  const jours = getJoursDuMois();
  const vacances = getVacancesScolaires(anneeActuelle);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
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
                <p className="opacity-90">Calendrier - Année scolaire {annee}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
                📅
              </div>
              <div>
                <h1 className="text-5xl font-bold">Calendrier</h1>
                <p className="text-xl opacity-90 mt-2">Année scolaire {getAnneeScolaire()} - {evenements.length} événements</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setViewMode(viewMode === 'mois' ? 'annee' : 'mois')} 
                className="bg-white/20 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/30 transition-colors flex items-center gap-2"
              >
                {viewMode === 'mois' ? '📆 Vue annuelle' : '📅 Vue mensuelle'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="card mb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-6 flex-wrap">
              <span className="font-semibold text-gray-700">Types d'événements :</span>
              {Object.entries(TYPES_EVENEMENTS).map(([key, { label, color }]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded ${color}`}></div>
                  <span className="text-sm text-gray-600">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <span className="font-semibold text-gray-700">Périodes :</span>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-100 border-2 border-gray-300"></div>
                <span className="text-sm text-gray-600">Week-end</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-100 border-2 border-orange-300"></div>
                <span className="text-sm text-gray-600">Vacances scolaires</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-6 bg-orange-50 border-2 border-orange-200" id="section-evenements">
          <h3 className="font-bold text-orange-800 mb-3">📚 Vacances scolaires {getAnneeScolaire()} - Zone Guyane</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {vacances.map(periode => (
              <div key={periode.nom} className="bg-white rounded-lg p-3 border border-orange-200">
                <div className="font-semibold text-orange-700">{periode.nom}</div>
                <div className="text-sm text-gray-600 mt-1">
                  Du {new Date(periode.debut).toLocaleDateString('fr-FR')} au {new Date(periode.fin).toLocaleDateString('fr-FR')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation et Vue Mensuelle */}
        {viewMode === 'mois' && (
          <div className="card mb-6" id="section-calendrier">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => changerMois(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                ← Précédent
              </button>
              <h2 className="text-2xl font-bold text-gray-800">
                {MOIS[moisActuel]} {moisActuel < 4 ? anneeActuelle : anneeActuelle + 1}
              </h2>
              <button onClick={() => changerMois(1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                Suivant →
              </button>
            </div>

            {/* Grille du calendrier */}
            <div className="grid grid-cols-7 gap-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((jour, idx) => (
                <div key={jour} className={`text-center font-bold py-2 ${idx >= 5 ? 'text-gray-400' : 'text-gray-600'}`}>
                  {jour}
                </div>
              ))}
              
              {jours.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="min-h-[120px]"></div>;
                }
                
                const evts = getEvenementsForDate(date);
                const isToday = new Date().toDateString() === date.toDateString();
                const weekend = isWeekend(date);
                const vacance = isVacances(date);
                const nomVacance = getNomVacances(date);
                
                let bgColor = 'bg-white';
                let borderColor = 'border-gray-200';
                
                if (isToday) {
                  bgColor = 'bg-yellow-50';
                  borderColor = 'border-yellow-400';
                } else if (vacance) {
                  bgColor = 'bg-orange-50';
                  borderColor = 'border-orange-300';
                } else if (weekend) {
                  bgColor = 'bg-gray-50';
                  borderColor = 'border-gray-300';
                }
                
                return (
                  <div key={index} className={`min-h-[120px] border rounded-lg p-2 ${bgColor} ${borderColor}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className={`text-sm font-semibold ${
                        isToday ? 'text-yellow-800' : 
                        vacance ? 'text-orange-700' :
                        weekend ? 'text-gray-500' : 'text-gray-600'
                      }`}>
                        {date.getDate()}
                      </div>
                      {vacance && (
                        <div className="text-[9px] text-orange-600 font-semibold px-1 bg-orange-200 rounded">
                          {nomVacance}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      {evts.map(evt => {
                        const config = TYPES_EVENEMENTS[evt.type];
                        return (
                          <div
                            key={evt.id}
                            className={`${config.lightColor} ${config.textColor} text-xs p-1 rounded`}
                            title={`${evt.titre} - ${evt.lieu}`}
                          >
                            <div className="font-semibold truncate">{evt.titre}</div>
                            {evt.lieu && <div className="truncate text-[10px]">📍 {evt.lieu}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Vue Annuelle */}
        {viewMode === 'annee' && (
          <div className="grid md:grid-cols-3 gap-6" id="section-calendrier-annuel">
            {getMoisAnneeScolaire().map((mois) => {
              const evtsMois = getEvenementsForMonth(mois.index);
              const hasVacances = hasVacancesInMonth(mois.index);
              
              return (
                <div 
                  key={mois.index} 
                  className={`card cursor-pointer hover:shadow-xl transition-all ${
                    hasVacances ? 'bg-orange-50 border-2 border-orange-200' : ''
                  }`}
                  onClick={() => {
                    setMoisActuel(mois.index);
                    setViewMode('mois');
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800">
                      {mois.nom} {mois.annee}
                    </h3>
                    {hasVacances && (
                      <span className="text-xs bg-orange-200 text-orange-700 px-2 py-1 rounded font-semibold">
                        Vacances
                      </span>
                    )}
                  </div>
                  
                  {evtsMois.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 font-semibold">
                        {evtsMois.length} événement{evtsMois.length > 1 ? 's' : ''} :
                      </p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {evtsMois.map(evt => {
                          const config = TYPES_EVENEMENTS[evt.type];
                          return (
                            <div
                              key={evt.id}
                              className={`${config.lightColor} ${config.textColor} text-xs p-2 rounded`}
                            >
                              <div className="font-semibold">{evt.titre}</div>
                              <div className="text-[10px]">
                                {new Date(evt.dateDebut).toLocaleDateString('fr-FR')}
                                {evt.dateDebut !== evt.dateFin && ` → ${new Date(evt.dateFin).toLocaleDateString('fr-FR')}`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Aucun événement</p>
                  )}
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button className="text-sm text-primary-600 hover:text-primary-700 font-semibold">
                      Voir le mois →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalendrierPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-white">Chargement...</div></div>}>
      <CalendrierPageContent />
    </Suspense>
  );
}
