'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CartePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ecoles, setEcoles] = useState<any[]>([]);
  const [selectedEcole, setSelectedEcole] = useState<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [ecoleFiltre, setEcoleFiltre] = useState<string | null>(null);
  const [mapKey, setMapKey] = useState(0);
  
  const router = useRouter();

  // Coordonnées GPS des écoles de la circonscription Cayenne 2
  const ecolesGPS = [
    // Écoles Primaires (E.P.PU) - Coordonnées corrigées
    { nom: "E.P.PU MORTIN", lat: 4.914557058378157, lng: -52.32582255665332, ville: "Cayenne", type: "Primaire", uai: "9730200E" },
    { nom: "E.P.PU AUGUSTINE DUCHANGE", lat: 4.732592408840527, lng: -52.322007133737394, ville: "Cayenne", type: "Primaire", uai: "9730043J" },
    { nom: "E.P.PU DE CACAO", lat: 4.57349185221816, lng: -52.46273931779119, ville: "Cacao", type: "Primaire", uai: "9730104A" },
    
    // Écoles Élémentaires (E.E.PU) - Coordonnées corrigées
    { nom: "E.E.PU VENDOME", lat: 4.923255480744587, lng: -52.31372854741516, ville: "Cayenne", type: "Élémentaire", uai: "9730399W" },
    { nom: "E.E.PU ELIETTE DANGLADES", lat: 4.9205961176929165, lng: -52.31806231906588, ville: "Cayenne", type: "Élémentaire", uai: "9730129C" },
    { nom: "E.E.PU LEOPOLD HEDER", lat: 4.930928495078377, lng: -52.32047831906581, ville: "Cayenne", type: "Élémentaire", uai: "9730117P" },
    { nom: "E.E.PU MAXIMILIEN SABA", lat: 4.934574766688208, lng: -52.3174900427068, ville: "Cayenne", type: "Élémentaire", uai: "9730200E" },
    { nom: "E.E.PU MONT-LUCAS", lat: 4.926540505151057, lng: -52.2953207288352, ville: "Cayenne", type: "Élémentaire", uai: "9730391M" },
    { nom: "E.E.PU GAETAN HERMINE", lat: 4.9335748779952455, lng: -52.330316648867466, ville: "Cayenne", type: "Élémentaire", uai: "9730042H" },
    
    // Écoles Maternelles (E.M.PU) - Coordonnées corrigées
    { nom: "E.M.PU ELIETTE DANGLADES", lat: 4.920417890641002, lng: -52.31839365133718, ville: "Cayenne", type: "Maternelle", uai: "9730129C" },
    { nom: "E.M.PU LEOPOLD HEDER", lat: 4.9311251263349085, lng: -52.320696411044, ville: "Cayenne", type: "Maternelle", uai: "9730117P" },
    { nom: "E.M.PU MONT-LUCAS", lat: 4.925912336129802, lng: -52.29441186078051, ville: "Cayenne", type: "Maternelle", uai: "9730391M" },
    { nom: "E.M.PU LA ROSERAIE", lat: 4.912463483176401, lng: -52.31888724274783, ville: "Cayenne", type: "Maternelle", uai: "9730405C" },
    { nom: "E.M.PU LEODATE VOLMAR", lat: 4.930927295470528, lng: -52.32172183134931, ville: "Cayenne", type: "Maternelle", uai: "9730041G" },
    { nom: "E.M.PU GAETAN HERMINE", lat: 4.932704578542506, lng: -52.32988773958545, ville: "Cayenne", type: "Maternelle", uai: "9730042H" },
    { nom: "E.M.PU VENDOME", lat: 4.923227206507892, lng: -52.313715463744515, ville: "Cayenne", type: "Maternelle", uai: "9730399W" }
  ];


  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/');
    } else {
      setIsAuthenticated(true);
      loadData();
      setTimeout(() => setMapLoaded(true), 100);
    }
  }, [router]);

  const loadData = async () => {
    try {
      const res = await fetch('/api/ecoles-identite');
      const data = await res.json();
      setEcoles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMarkerColor = (type: string) => {
    if (type.includes('Maternelle')) return '#9333ea'; // Violet
    if (type.includes('Élémentaire')) return '#0ea5e9'; // Bleu
    return '#10b981'; // Vert pour primaire
  };

  const getStats = () => {
    return {
      cayenne: ecolesGPS.filter(e => e.ville === 'Cayenne').length,
      cacao: ecolesGPS.filter(e => e.ville === 'Cacao').length,
      maternelles: ecolesGPS.filter(e => e.type === 'Maternelle').length,
      elementaires: ecolesGPS.filter(e => e.type === 'Élémentaire').length,
      primaires: ecolesGPS.filter(e => e.type === 'Primaire').length
    };
  };

  // Fonction pour afficher une seule école sur la carte
  const filtrerEcole = (nomEcole: string) => {
    setEcoleFiltre(nomEcole);
    setMapKey(prev => prev + 1); // Force le rechargement de la carte
  };

  // Fonction pour réinitialiser et afficher toutes les écoles
  const afficherToutesEcoles = () => {
    setEcoleFiltre(null);
    setMapKey(prev => prev + 1); // Force le rechargement de la carte
  };

  // Filtrer les écoles à afficher
  const ecolesAffichees = ecoleFiltre 
    ? ecolesGPS.filter(e => e.nom === ecoleFiltre)
    : ecolesGPS;

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl">Chargement...</p>
        </div>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      {/* Header */}
      <div className="text-white py-16 px-6">
        <div className="container mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6">
            ← Retour à l'accueil
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
              🗺️
            </div>
            <div>
              <h1 className="text-5xl font-bold">Carte des Écoles</h1>
              <p className="text-xl opacity-90 mt-2">Localisation géographique de la circonscription</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="container mx-auto px-6 py-8">
        
        {/* Statistiques */}
        <div className="grid md:grid-cols-5 gap-4 mb-6">
          <div className="card text-center bg-blue-50">
            <div className="text-3xl mb-2">📍</div>
            <div className="text-3xl font-bold text-blue-700">{stats.cayenne}</div>
            <div className="text-sm text-gray-600">Cayenne</div>
          </div>
          <div className="card text-center bg-green-50">
            <div className="text-3xl mb-2">🌳</div>
            <div className="text-3xl font-bold text-green-700">{stats.cacao}</div>
            <div className="text-sm text-gray-600">Cacao</div>
          </div>
          <div className="card text-center bg-purple-50">
            <div className="text-3xl mb-2">🍼</div>
            <div className="text-3xl font-bold text-purple-700">{stats.maternelles}</div>
            <div className="text-sm text-gray-600">Maternelles</div>
          </div>
          <div className="card text-center bg-cyan-50">
            <div className="text-3xl mb-2">📚</div>
            <div className="text-3xl font-bold text-cyan-700">{stats.elementaires}</div>
            <div className="text-sm text-gray-600">Élémentaires</div>
          </div>
          <div className="card text-center bg-emerald-50">
            <div className="text-3xl mb-2">🎓</div>
            <div className="text-3xl font-bold text-emerald-700">{stats.primaires}</div>
            <div className="text-sm text-gray-600">Primaires</div>
          </div>
        </div>

        {/* Carte */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">🗺️ Carte Interactive</h2>
            {ecoleFiltre && (
              <button
                onClick={afficherToutesEcoles}
                className="btn-secondary flex items-center gap-2"
              >
                🔄 Afficher toutes les écoles
              </button>
            )}
          </div>
          
          {ecoleFiltre && (
            <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p className="text-sm text-blue-800">
                <strong>École sélectionnée :</strong> {ecoleFiltre}
              </p>
            </div>
          )}
          
          {/* Carte Leaflet avec tous les marqueurs */}
          <div id="map" className="relative bg-gray-200 rounded-lg overflow-hidden" style={{ height: '600px' }}>
            {mapLoaded ? (
              <iframe
                key={mapKey}
                srcDoc={`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { height: 600px; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // Initialiser la carte centrée sur Cayenne
    var map = L.map('map').setView([4.925, -52.325], 13);
    
    // Ajouter la couche OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    
    // Définir les icônes personnalisées
    var iconMaternelle = L.divIcon({
      className: 'custom-marker',
      html: '<div style="background-color: #9333ea; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">M</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    
    var iconElementaire = L.divIcon({
      className: 'custom-marker',
      html: '<div style="background-color: #0ea5e9; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">E</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    
    var iconPrimaire = L.divIcon({
      className: 'custom-marker',
      html: '<div style="background-color: #10b981; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">P</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
    
    // Ajouter les marqueurs pour chaque école
    var ecoles = ${JSON.stringify(ecolesAffichees)};
    
    ecoles.forEach(function(ecole) {
      var icon = ecole.type === 'Maternelle' ? iconMaternelle : 
                 ecole.type === 'Élémentaire' ? iconElementaire : iconPrimaire;
      
      var marker = L.marker([ecole.lat, ecole.lng], { icon: icon }).addTo(map);
      
      marker.bindPopup(\`
        <div style="font-family: sans-serif;">
          <strong style="font-size: 14px; color: #1f2937;">\${ecole.nom}</strong><br>
          <span style="display: inline-block; background-color: \${
            ecole.type === 'Maternelle' ? '#9333ea' : 
            ecole.type === 'Élémentaire' ? '#0ea5e9' : '#10b981'
          }; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-top: 4px;">\${ecole.type}</span><br>
          <span style="font-size: 12px; color: #6b7280; margin-top: 4px; display: block;">📍 \${ecole.ville}</span><br>
          <span style="font-size: 11px; color: #9ca3af; font-family: monospace;">\${ecole.lat.toFixed(4)}, \${ecole.lng.toFixed(4)}</span><br>
          <a href="https://www.openstreetmap.org/?mlat=\${ecole.lat}&mlon=\${ecole.lng}#map=18/\${ecole.lat}/\${ecole.lng}" 
             target="_blank" 
             style="display: inline-block; margin-top: 8px; color: #0ea5e9; text-decoration: none; font-size: 12px;">
            Voir sur OpenStreetMap ↗
          </a>
        </div>
      \`);
    });
    
    // Ajuster les limites de la carte pour montrer toutes les écoles
    var bounds = L.latLngBounds(ecoles.map(e => [e.lat, e.lng]));
    map.fitBounds(bounds, { padding: [50, 50] });
  </script>
</body>
</html>
                `}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Carte Interactive des Écoles"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl mb-4">🗺️</div>
                  <p className="text-gray-600">Chargement de la carte...</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Légende */}
          <div className="mt-4 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div style={{ backgroundColor: '#9333ea', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '2px solid white', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}>M</div>
              <span>Maternelle</span>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ backgroundColor: '#0ea5e9', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '2px solid white', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}>E</div>
              <span>Élémentaire</span>
            </div>
            <div className="flex items-center gap-2">
              <div style={{ backgroundColor: '#10b981', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '2px solid white', boxShadow: '0 2px 5px rgba(0,0,0,0.3)' }}>P</div>
              <span>Primaire</span>
            </div>
          </div>
        </div>

        {/* Liste des écoles avec coordonnées */}
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📍 Liste des Écoles</h2>
          
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>École</th>
                  <th>Type</th>
                  <th>Ville</th>
                  <th>Coordonnées GPS</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ecolesGPS.map((ecole, idx) => (
                  <tr key={idx} className={ecoleFiltre === ecole.nom ? 'bg-blue-50' : ''}>
                    <td className="font-semibold">
                      <button
                        onClick={() => filtrerEcole(ecole.nom)}
                        className="text-left hover:text-primary-600 hover:underline cursor-pointer w-full"
                      >
                        {ecole.nom}
                      </button>
                    </td>
                    <td>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        ecole.type === 'Maternelle' ? 'bg-purple-100 text-purple-800' :
                        ecole.type === 'Élémentaire' ? 'bg-cyan-100 text-cyan-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {ecole.type}
                      </span>
                    </td>
                    <td>{ecole.ville}</td>
                    <td className="text-sm font-mono text-gray-600">
                      {ecole.lat.toFixed(4)}, {ecole.lng.toFixed(4)}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => filtrerEcole(ecole.nom)}
                          className="text-primary-600 hover:text-primary-700 text-sm font-semibold"
                        >
                          📍 Voir sur carte
                        </button>
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${ecole.lat}&mlon=${ecole.lng}#map=18/${ecole.lat}/${ecole.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-gray-700 text-sm font-semibold"
                        >
                          OpenStreetMap ↗
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info */}
        <div className="card mt-6 bg-blue-50 border-2 border-blue-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <h3 className="font-bold text-blue-900 mb-2">À propos de cette carte</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Cayenne</strong> : {stats.cayenne} écoles réparties dans différents quartiers</li>
                <li>• <strong>Cacao</strong> : {stats.cacao} école(s) en zone rurale</li>
                <li>• Les coordonnées GPS permettent une localisation précise pour les visites</li>
                <li>• Cliquez sur "Voir sur la carte" pour obtenir un itinéraire</li>
                <li>• La carte utilise OpenStreetMap, un service libre et gratuit</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
