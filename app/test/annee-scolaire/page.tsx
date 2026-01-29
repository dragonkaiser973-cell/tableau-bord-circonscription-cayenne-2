'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function TestAnneeScolairePage() {
  const [resultat, setResultat] = useState('');
  const [loading, setLoading] = useState(false);
  const [infoActuelle, setInfoActuelle] = useState<any>(null);

  const chargerInfos = async () => {
    setLoading(true);
    try {
      const configRes = await fetch('/api/config');
      const config = await configRes.json();
      
      const structuresRes = await fetch('/api/ecoles-structure');
      const structures = await structuresRes.json();
      
      let effectif = 0;
      structures.forEach((ecole: any) => {
        if (ecole.classes) {
          ecole.classes.forEach((classe: any) => {
            effectif += classe.nbEleves || classe.effectif || 0;
          });
        }
      });
      
      setInfoActuelle({
        annee: config.annee_scolaire_actuelle,
        effectif,
        historique: config.historique_effectifs
      });
      
    } catch (error: any) {
      setResultat(`❌ Erreur chargement : ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const simulerChangement = async () => {
    setLoading(true);
    try {
      const configRes = await fetch('/api/config');
      const config = await configRes.json();
      
      const structuresRes = await fetch('/api/ecoles-structure');
      const structures = await structuresRes.json();
      
      let effectif = 0;
      structures.forEach((ecole: any) => {
        if (ecole.classes) {
          ecole.classes.forEach((classe: any) => {
            effectif += classe.nbEleves || classe.effectif || 0;
          });
        }
      });
      
      console.log('🔍 DEBUG Simulation:');
      console.log('  - Année actuelle:', config.annee_scolaire_actuelle);
      console.log('  - Structures chargées:', structures.length);
      console.log('  - Effectif calculé:', effectif);
      
      const [debut] = config.annee_scolaire_actuelle.split('-');
      const nouvelleAnnee = `${parseInt(debut) + 1}-${parseInt(debut) + 2}`;
      
      console.log('  - Nouvelle année:', nouvelleAnnee);
      console.log('  - Effectif envoyé à l\'API:', effectif);
      
      const res = await fetch('/api/changer-annee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nouvelleAnnee,
          effectifActuel: effectif,
          creerArchive: true
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setResultat(`✅ Succès !

Changement effectué :
━━━━━━━━━━━━━━━━━━━━━━━━━━
Ancienne année : ${config.annee_scolaire_actuelle}
Nouvelle année : ${nouvelleAnnee}
Effectif ajouté  : ${effectif} élèves
Archive créée    : ${data.archive_creee ? 'Oui ✅' : 'Non ❌'}

Nouvel historique (4 dernières années) :
━━━━━━━━━━━━━━━━━━━━━━━━━━
${data.config.historique_effectifs.map((h: any) => 
  `  ${h.annee}  →  ${h.effectif.toLocaleString()} élèves`
).join('\n')}

Prochaine action :
━━━━━━━━━━━━━━━━━━━━━━━━━━
Allez sur /pilotage pour vérifier le graphique !`);
        
        await chargerInfos();
      } else {
        setResultat(`❌ Erreur : ${data.message}`);
      }
      
    } catch (error: any) {
      setResultat(`❌ Erreur : ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const restaurerAnnee = async () => {
    setLoading(true);
    try {
      const configRes = await fetch('/api/config');
      const config = await configRes.json();
      
      const [debut] = config.annee_scolaire_actuelle.split('-');
      const anneeOriginale = `${parseInt(debut) - 1}-${parseInt(debut)}`;
      
      const nouvelHistorique = config.historique_effectifs.slice(0, -1);
      
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annee_scolaire_actuelle: anneeOriginale,
          historique_effectifs: nouvelHistorique
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setResultat(`✅ Restauré à ${anneeOriginale}

L'historique a été réduit à ${nouvelHistorique.length} années.
L'application est revenue à l'état précédent.`);
        await chargerInfos();
      }
      
    } catch (error: any) {
      setResultat(`❌ Erreur : ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetComplet = async () => {
    if (!confirm('⚠️ ATTENTION !\n\nCela va réinitialiser la configuration à l\'état initial :\n- Année : 2025-2026\n- Historique : 2022-2023, 2023-2024, 2024-2025\n\nContinuer ?')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annee_scolaire_actuelle: "2025-2026",
          historique_effectifs: [
            { "annee": "2022-2023", "effectif": 3150 },
            { "annee": "2023-2024", "effectif": 3280 },
            { "annee": "2024-2025", "effectif": 3420 }
          ]
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        setResultat(`✅ Configuration réinitialisée !

État remis à :
━━━━━━━━━━━━━━━━━━━━━━━━━━
Année actuelle : 2025-2026
Historique (3 années) :
  • 2022-2023 → 3,150 élèves
  • 2023-2024 → 3,280 élèves
  • 2024-2025 → 3,420 élèves

Vous pouvez recommencer vos tests !`);
        await chargerInfos();
      }
      
    } catch (error: any) {
      setResultat(`❌ Erreur : ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-emerald-400 p-8">
      <div className="container mx-auto max-w-4xl">
        <Link href="/pilotage" className="text-white hover:underline mb-6 inline-block text-lg">
          ← Retour au tableau de bord
        </Link>
        
        <div className="card mb-6">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-5xl">🧪</span>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Test du Système de Changement d'Année
              </h1>
              <p className="text-gray-600 mt-1">
                Simulez le passage à une nouvelle année scolaire sans attendre septembre
              </p>
            </div>
          </div>
          
          {/* Informations actuelles */}
          <div className="mb-6">
            <button
              onClick={chargerInfos}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300"
            >
              {loading ? '⏳ Chargement...' : '🔄 Charger les infos actuelles'}
            </button>
            
            {infoActuelle && (
              <div className="mt-4 bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <h3 className="font-bold text-blue-800 mb-2">📊 État Actuel</h3>
                <div className="space-y-1 text-sm">
                  <div>Année scolaire : <strong>{infoActuelle.annee}</strong></div>
                  <div>Effectif total : <strong>{infoActuelle.effectif.toLocaleString()} élèves</strong></div>
                  <div className="mt-2">
                    <div className="font-semibold">Historique (4 dernières années) :</div>
                    {infoActuelle.historique.map((h: any) => (
                      <div key={h.annee} className="ml-4">
                        • {h.annee} → {h.effectif.toLocaleString()} élèves
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Actions de test */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={simulerChangement}
              disabled={loading}
              className="bg-primary-600 text-white px-6 py-6 rounded-lg font-bold hover:bg-primary-700 disabled:bg-gray-300 transition-colors flex flex-col items-center gap-2"
            >
              <span className="text-3xl">🚀</span>
              <span className="text-lg">
                {loading ? '⏳ En cours...' : 'Simuler un changement d\'année'}
              </span>
              <span className="text-sm opacity-80 font-normal">
                Passe à l'année scolaire suivante
              </span>
            </button>
            
            <button
              onClick={restaurerAnnee}
              disabled={loading}
              className="bg-orange-600 text-white px-6 py-6 rounded-lg font-bold hover:bg-orange-700 disabled:bg-gray-300 transition-colors flex flex-col items-center gap-2"
            >
              <span className="text-3xl">↩️</span>
              <span className="text-lg">
                {loading ? '⏳ En cours...' : 'Revenir à l\'année précédente'}
              </span>
              <span className="text-sm opacity-80 font-normal">
                Annule le dernier changement
              </span>
            </button>

            <button
              onClick={resetComplet}
              disabled={loading}
              className="bg-red-600 text-white px-6 py-6 rounded-lg font-bold hover:bg-red-700 disabled:bg-gray-300 transition-colors flex flex-col items-center gap-2"
            >
              <span className="text-3xl">🔄</span>
              <span className="text-lg">
                {loading ? '⏳ En cours...' : 'Reset Complet'}
              </span>
              <span className="text-sm opacity-80 font-normal">
                Remet l'état initial (2025-2026)
              </span>
            </button>
          </div>
          
          {/* Résultat */}
          {resultat && (
            <div className="bg-gray-800 text-green-400 p-6 rounded-lg border-2 border-gray-600 font-mono">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-2xl">💻</span>
                <h3 className="font-bold text-white text-lg">Résultat de l'opération</h3>
              </div>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">{resultat}</pre>
            </div>
          )}
        </div>
        
        {/* Informations et conseils */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card bg-blue-50 border-2 border-blue-300">
            <div className="flex items-start gap-3">
              <span className="text-3xl">ℹ️</span>
              <div>
                <h4 className="font-bold text-blue-800 mb-2">Comment ça marche ?</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>1. Cliquez sur "Charger les infos actuelles"</li>
                  <li>2. Notez l'année et l'historique</li>
                  <li>3. Cliquez sur "Simuler un changement"</li>
                  <li>4. Vérifiez le résultat</li>
                  <li>5. Allez sur /pilotage pour voir le graphique</li>
                  <li>6. Utilisez "Reset Complet" avant de retester</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="card bg-yellow-50 border-2 border-yellow-300">
            <div className="flex items-start gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h4 className="font-bold text-yellow-800 mb-2">Comportement en Mode Test</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• <strong>C'est normal que la nouvelle année affiche l'ancien effectif !</strong></li>
                  <li>• En test, on ne réimporte pas les données</li>
                  <li>• Les structures restent celles de 2025-2026</li>
                  <li>• L'effectif calculé = anciennes données</li>
                  <li>• En production, vous réimportez les nouvelles données</li>
                  <li>• Utilisez "Reset Complet" entre chaque test</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* Explication détaillée */}
        <div className="card mt-4 bg-purple-50 border-2 border-purple-300">
          <div className="flex items-start gap-3">
            <span className="text-3xl">🎓</span>
            <div className="flex-1">
              <h4 className="font-bold text-purple-800 mb-2">Pourquoi 2026-2027 affiche l'effectif de 2025-2026 ?</h4>
              <div className="text-sm text-purple-700 space-y-2">
                <p>
                  <strong>En mode TEST :</strong> On change juste l'année de référence dans la configuration. 
                  Les données (écoles, classes, élèves) restent les mêmes en base de données. 
                  Donc quand le graphique calcule l'effectif de 2026-2027, il compte les élèves présents 
                  dans la base... qui sont ceux de 2025-2026 ! 
                </p>
                <p>
                  <strong>En PRODUCTION :</strong> Début septembre 2026, vous changez d'année ET vous réimportez 
                  les nouvelles données (nouvelles écoles, nouvelles classes, nouveaux effectifs). 
                  Le graphique affichera alors les vrais effectifs de 2026-2027.
                </p>
                <p className="bg-purple-100 p-2 rounded border border-purple-300">
                  <strong>✅ Résumé :</strong> Ce comportement est NORMAL en test. En usage réel, 
                  vous importez les nouvelles données et tout sera cohérent.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Vérifications à faire */}
        <div className="card mt-4 bg-green-50 border-2 border-green-300">
          <div className="flex items-start gap-3">
            <span className="text-3xl">✅</span>
            <div className="flex-1">
              <h4 className="font-bold text-green-800 mb-2">Checklist de vérification après test</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-green-700">
                <div>
                  <div className="font-semibold mb-1">Sur /pilotage :</div>
                  <ul className="space-y-1">
                    <li>□ L'année affichée a changé</li>
                    <li>□ Le graphique montre 4 années</li>
                    <li>□ La plus ancienne a disparu</li>
                    <li>□ La nouvelle apparaît</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold mb-1">Sur /archives :</div>
                  <ul className="space-y-1">
                    <li>□ Une nouvelle archive est créée</li>
                    <li>□ Elle contient les bonnes données</li>
                    <li>□ Toutes les infos sont présentes</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
