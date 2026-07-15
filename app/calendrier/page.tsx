'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PDFExportModal from '@/components/PDFExportModal';
import AuroraHeader from '@/components/AuroraHeader';
import { exportMultipleElementsToPDF, PDFExportOptions } from '@/lib/pdfExport';
import { exportStyledExcel, ExcelSheetDef } from '@/lib/excelExport';
import { getVacancesScolaires, formatDateFr } from '@/lib/vacances-guyane';

interface Evenement {
  id: string;
  titre: string;
  type: 'rendez-vous' | 'formation' | 'reunion';
  dateDebut: string;
  dateFin: string;
  lieu: string;
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

export default function CalendrierPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [moisActuel, setMoisActuel] = useState(0);
  const [anneeActuelle, setAnneeActuelle] = useState(2024);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Evenement | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'mois' | 'annee'>('mois'); // Vue mensuelle par défaut
  const [showExportModal, setShowExportModal] = useState(false);
  const [formData, setFormData] = useState({
    titre: '',
    type: 'rendez-vous' as 'rendez-vous' | 'formation' | 'reunion',
    dateDebut: '',
    dateFin: '',
    lieu: ''
  });
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/');
    } else {
      setIsAuthenticated(true);
      loadEvenements();
      initializeAnneeScolaire();
    }
  }, [router]);

  const initializeAnneeScolaire = () => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    
    if (month >= 0 && month <= 7) {
      setAnneeActuelle(year - 1);
      setMoisActuel(month + 4);
    } else {
      setAnneeActuelle(year);
      setMoisActuel(month - 8);
    }
  };

  const loadEvenements = async () => {
    try {
      const res = await fetch('/api/evenements');
      const data = await res.json();
      setEvenements(data);
    } catch (error) {
      console.error('Erreur chargement événements:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = '/api/evenements';
      const method = editingEvent ? 'PUT' : 'POST';
      const body = editingEvent ? { ...formData, id: editingEvent.id } : formData;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        loadEvenements();
        closeModal();
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet événement ?')) return;
    
    try {
      const res = await fetch(`/api/evenements?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });
      if (res.ok) {
        loadEvenements();
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const openModal = (event?: Evenement) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        titre: event.titre,
        type: event.type,
        dateDebut: event.dateDebut,
        dateFin: event.dateFin,
        lieu: event.lieu
      });
    } else {
      setEditingEvent(null);
      setFormData({
        titre: '',
        type: 'rendez-vous',
        dateDebut: '',
        dateFin: '',
        lieu: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEvent(null);
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
      nouvelleAnnee++; // Passe à l'année scolaire suivante
    }
    
    setMoisActuel(nouveauMois);
    setAnneeActuelle(nouvelleAnnee);
  };

  const changerAnneeScolaire = (nouvelleAnnee: number) => {
    setAnneeActuelle(nouvelleAnnee);
    setMoisActuel(0);
    setShowUpdateModal(false);
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

  const handleExportExcel = async () => {
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const fmt = formatDateFr;

    const evts = [...evenements].sort((a, b) => (a.dateDebut || '').localeCompare(b.dateDebut || ''));
    const sheetEvts: ExcelSheetDef = {
      name: 'Événements',
      title: `Calendrier des événements — ${getAnneeScolaire()}`,
      subtitle: `Circonscription Cayenne 2 · Exporté le ${dateStr} · ${evts.length} événement${evts.length > 1 ? 's' : ''}`,
      columns: [
        { header: 'Titre', key: 'titre', width: 34 },
        { header: 'Type', key: 'type', width: 16 },
        { header: 'Date début', key: 'debut', width: 14, align: 'center' },
        { header: 'Date fin', key: 'fin', width: 14, align: 'center' },
        { header: 'Lieu', key: 'lieu', width: 24 },
      ],
      rows: evts.map(e => ({
        titre: e.titre || '',
        type: TYPES_EVENEMENTS[e.type]?.label || e.type || '',
        debut: fmt(e.dateDebut),
        fin: fmt(e.dateFin),
        lieu: e.lieu || '',
      })),
    };

    const vac = getVacancesScolaires(anneeActuelle);
    const sheetVac: ExcelSheetDef = {
      name: 'Vacances scolaires',
      title: `Vacances scolaires ${getAnneeScolaire()} — Zone Guyane`,
      subtitle: 'Circonscription Cayenne 2',
      columns: [
        { header: 'Période', key: 'nom', width: 20 },
        { header: 'Début', key: 'debut', width: 14, align: 'center' },
        { header: 'Fin', key: 'fin', width: 14, align: 'center' },
      ],
      rows: vac.map(v => ({ nom: v.nom, debut: fmt(v.debut), fin: fmt(v.fin) })),
    };

    await exportStyledExcel(`calendrier-${new Date().toISOString().slice(0, 10)}`, [sheetEvts, sheetVac]);
  };

  if (!isAuthenticated) {
    return <div>Chargement...</div>;
  }

  const jours = getJoursDuMois();
  const vacances = getVacancesScolaires(anneeActuelle);

  return (
    <div className="min-h-screen bg-slate-50">
      <AuroraHeader
        kicker={`Année scolaire ${getAnneeScolaire()}`}
        title="Calendrier des"
        titleAccent="événements."
        subtitle="Vacances, formations, conseils, réunions. Vue mensuelle ou annuelle."
        backLabel="Retour à l'accueil"
        action={
          <>
            <button
              onClick={() => setViewMode(viewMode === 'mois' ? 'annee' : 'mois')}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2.5 rounded-full font-semibold text-sm hover:bg-white/15 hover:-translate-y-0.5 transition-all"
            >
              {viewMode === 'mois' ? 'Vue annuelle' : 'Vue mensuelle'}
            </button>
            <button
              onClick={() => setShowUpdateModal(true)}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2.5 rounded-full font-semibold text-sm hover:bg-white/15 hover:-translate-y-0.5 transition-all"
            >
              Changer d&apos;année
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-md text-primary-700 px-5 py-2.5 rounded-full font-semibold text-sm shadow-lg hover:bg-white hover:-translate-y-0.5 transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              PDF
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 bg-emerald-600/95 backdrop-blur-md text-white px-5 py-2.5 rounded-full font-semibold text-sm shadow-lg hover:bg-emerald-600 hover:-translate-y-0.5 transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
                <rect x="8" y="2" width="8" height="4" rx="1" />
              </svg>
              Excel
            </button>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 bg-gradient-to-br from-amber-300 to-orange-400 text-slate-900 px-5 py-2.5 rounded-full font-semibold text-sm shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nouvel événement
            </button>
          </>
        }
      />

      <div className="container mx-auto max-w-7xl px-6 py-8 -mt-20 relative z-10">
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
                  Du {formatDateFr(periode.debut)} au {formatDateFr(periode.fin)}
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
                            className={`${config.lightColor} ${config.textColor} text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity`}
                            onClick={() => openModal(evt)}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                openModal(evt);
                              }}
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

      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Changer d'année scolaire</h3>
            <p className="text-gray-600 mb-6">Les dates des vacances scolaires seront automatiquement mises à jour.</p>
            
            <div className="space-y-3">
              {[0, 1, 2, 3].map(offset => {
                const year = new Date().getFullYear() - 1 + offset;
                return (
                  <button
                    key={year}
                    onClick={() => changerAnneeScolaire(year)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                      year === anneeActuelle ? 'bg-primary-50 border-primary-500' : 'bg-white border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    <div className="font-bold text-gray-800">Année {year}-{year + 1}</div>
                    <div className="text-sm text-gray-600">Septembre {year} → Août {year + 1}</div>
                  </button>
                );
              })}
            </div>

            <button onClick={() => setShowUpdateModal(false)} className="w-full mt-6 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-colors">
              Annuler
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">
              {editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Titre *</label>
                <input
                  type="text"
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Titre de l'événement"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {Object.entries(TYPES_EVENEMENTS).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date début *</label>
                  <input
                    type="date"
                    value={formData.dateDebut}
                    onChange={(e) => setFormData({ ...formData, dateDebut: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date fin</label>
                  <input
                    type="date"
                    value={formData.dateFin}
                    onChange={(e) => setFormData({ ...formData, dateFin: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Lieu</label>
                <input
                  type="text"
                  value={formData.lieu}
                  onChange={(e) => setFormData({ ...formData, lieu: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Lieu de l'événement"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors">
                  {editingEvent ? 'Modifier' : 'Créer'}
                </button>
                {editingEvent && (
                  <button type="button" onClick={() => handleDelete(editingEvent.id)} className="px-4 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors">
                    🗑️
                  </button>
                )}
                <button type="button" onClick={closeModal} className="px-4 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400 transition-colors">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal d'export PDF */}
      <PDFExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={async (elements, options) => {
          setShowExportModal(false);
          await exportMultipleElementsToPDF(
            elements,
            `calendrier-${new Date().toISOString().split('T')[0]}`,
            options
          );
        }}
        availableElements={[
          { id: 'section-calendrier', label: '📅 Calendrier Mensuel', selected: true },
          { id: 'section-calendrier-annuel', label: '📆 Vue Annuelle', selected: false },
          { id: 'section-evenements', label: '📚 Vacances Scolaires', selected: true }
        ]}
        defaultFilename="calendrier-scolaire"
      />
    </div>
  );
}
