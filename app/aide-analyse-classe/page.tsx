'use client';

import { useState } from 'react';
import Link from 'next/link';

const steps = [
  {
    num: 1,
    icon: '📥',
    titre: 'Télécharger vos fichiers Excel',
    couleur: 'teal',
    contenu: (
      <div>
        <p className="text-gray-600 mb-3">
          Connectez-vous sur le portail ONDE de votre académie et téléchargez les deux fichiers de restitution pour votre classe :
        </p>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-teal-500 font-bold mt-0.5">•</span>
            <span><strong>Fichier FRANÇAIS</strong> — nom contenant <code className="bg-gray-100 px-1 rounded text-sm">RestitutionCE1FR</code> ou similaire</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-teal-500 font-bold mt-0.5">•</span>
            <span><strong>Fichier MATHÉMATIQUES</strong> — nom contenant <code className="bg-gray-100 px-1 rounded text-sm">RestitutionCE1MA</code> ou similaire</span>
          </li>
        </ul>
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          💡 Les formats acceptés sont <strong>.xlsx</strong> et <strong>.xls</strong>. Compatible avec CP, CE1, CE2, CM1 et CM2.
        </div>
      </div>
    )
  },
  {
    num: 2,
    icon: '📂',
    titre: 'Importer les fichiers dans l\'outil',
    couleur: 'blue',
    contenu: (
      <div>
        <p className="text-gray-600 mb-3">
          Sur la page <Link href="/analyse-classe" className="text-teal-600 underline font-medium">Analyse classe</Link>, vous trouverez deux zones d&apos;import :
        </p>
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="font-semibold text-gray-700 mb-1">📝 Zone FRANÇAIS</p>
            <p className="text-sm text-gray-500">Cliquez sur <strong>Importer FRANÇAIS</strong> et sélectionnez votre fichier FR</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <p className="font-semibold text-gray-700 mb-1">🔢 Zone MATHÉMATIQUES</p>
            <p className="text-sm text-gray-500">Cliquez sur <strong>Importer MATHS</strong> et sélectionnez votre fichier MA</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          ⚠️ L&apos;outil vérifie automatiquement que les deux fichiers appartiennent à la même classe. Si vous inversez les fichiers, un message d&apos;erreur s&apos;affiche.
        </div>
      </div>
    )
  },
  {
    num: 3,
    icon: '📊',
    titre: 'Explorer les 6 onglets d\'analyse',
    couleur: 'purple',
    contenu: (
      <div className="space-y-3">
        {[
          { icon: '📊', nom: 'Vue d\'ensemble', desc: 'Statistiques globales de la classe : nombre d\'élèves, taux de réussite FR et MA, absences, et graphiques de répartition par groupe.' },
          { icon: '📈', nom: 'Analyse par compétence', desc: 'Sélectionnez une matière puis une compétence pour voir la répartition des élèves et la liste nominative par groupe.' },
          { icon: '👥', nom: 'Répartition des élèves', desc: 'Vue en 3 colonnes : groupe à besoins / fragile / satisfaisant. Filtrez par matière et par compétence.' },
          { icon: '👤', nom: 'Profil élève', desc: 'Graphique radar des compétences d\'un élève + tableau détaillé avec niveau de priorité pour chaque compétence.' },
          { icon: '📋', nom: 'Scores détaillés', desc: 'Tableau complet de tous les élèves avec leurs résultats à chaque compétence, exportable en PDF.' },
          { icon: '🎯', nom: 'Élèves prioritaires', desc: 'Liste décroissante des élèves ayant le plus de compétences "à besoin", avec barre de progression. Cliquez sur un élève pour accéder à son profil.' },
        ].map(onglet => (
          <div key={onglet.nom} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
            <span className="text-2xl">{onglet.icon}</span>
            <div>
              <p className="font-semibold text-gray-800">{onglet.nom}</p>
              <p className="text-sm text-gray-500">{onglet.desc}</p>
            </div>
          </div>
        ))}
      </div>
    )
  },
  {
    num: 4,
    icon: '📄',
    titre: 'Exporter en PDF ou imprimer',
    couleur: 'orange',
    contenu: (
      <div>
        <p className="text-gray-600 mb-3">
          Chaque onglet dispose d&apos;un bouton <strong>📄 Exporter PDF</strong> en haut à droite qui imprime uniquement le contenu de l&apos;onglet actif.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-3">
          <p className="font-semibold text-gray-700 mb-2">Conseils pour un PDF de qualité :</p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li className="flex items-start gap-2"><span>•</span><span>Dans la boîte de dialogue d&apos;impression, choisissez <strong>Enregistrer en PDF</strong></span></li>
            <li className="flex items-start gap-2"><span>•</span><span>Activez <strong>Graphiques en arrière-plan</strong> pour conserver les couleurs</span></li>
            <li className="flex items-start gap-2"><span>•</span><span>Orientation <strong>Paysage</strong> recommandée pour les tableaux larges</span></li>
          </ul>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
          ✅ <strong>Aucune donnée n&apos;est sauvegardée</strong> sur le serveur. Tout reste dans votre navigateur — vos données élèves sont confidentielles.
        </div>
      </div>
    )
  },
  {
    num: 5,
    icon: '🔄',
    titre: 'Réinitialiser pour une nouvelle classe',
    couleur: 'red',
    contenu: (
      <div>
        <p className="text-gray-600 mb-3">
          Pour analyser une autre classe, cliquez sur le bouton <strong>🔄 Réinitialiser</strong> en haut à droite de la zone d&apos;import. Cela efface toutes les données chargées et remet l&apos;outil à zéro.
        </p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          ⚠️ Pensez à exporter vos PDF <strong>avant</strong> de réinitialiser — les données ne sont pas sauvegardées.
        </div>
      </div>
    )
  }
];

const faq = [
  {
    q: "Je n'ai qu'un seul fichier (FR ou MA), puis-je quand même utiliser l'outil ?",
    r: "Oui, l'outil fonctionne avec un seul fichier. Importez celui que vous avez et les onglets disponibles s'adaptent automatiquement."
  },
  {
    q: "L'outil accepte-t-il les fichiers CP rentrée, CP point d'étape et CP fin d'année ?",
    r: "Oui, les trois formats CP sont compatibles. Le nom de classe est détecté automatiquement depuis le fichier Excel."
  },
  {
    q: "Que signifient les 3 groupes de maîtrise ?",
    r: "Groupe 1 (À besoins) = en-dessous du seuil 1 — nécessite un soutien prioritaire. Groupe 2 (Fragile) = entre seuil 1 et seuil 2. Groupe 3 (Satisfaisant) = au-dessus du seuil 2."
  },
  {
    q: "Mes données sont-elles partagées avec la circonscription ?",
    r: "Non. L'outil fonctionne entièrement dans votre navigateur. Aucune donnée n'est envoyée ni sauvegardée sur un serveur. Fermez l'onglet et tout est effacé."
  },
  {
    q: "Le fichier que j'importe génère une erreur 'Structure non reconnue'",
    r: "Vérifiez que vous utilisez bien le fichier de restitution téléchargé depuis ONDE (format .xls ou .xlsx). Les fichiers modifiés manuellement peuvent ne pas être reconnus."
  },
];

export default function AideAnalyseClassePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [openStep, setOpenStep] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      {/* Header */}
      <div className="text-white py-16 px-6">
        <div className="container mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors">
            ← Retour à l&apos;accueil
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
              📖
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold">Guide d&apos;utilisation</h1>
              <p className="text-xl opacity-90 mt-2">Outil d&apos;analyse des évaluations nationales — Classe</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">

        {/* Bouton accès rapide */}
        <div className="card mb-8 bg-teal-50 border-2 border-teal-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-teal-800 mb-1">🔬 Accéder à l&apos;outil</h2>
              <p className="text-teal-600">Importez vos fichiers Excel et analysez les résultats de votre classe en quelques secondes.</p>
            </div>
            <Link
              href="/analyse-classe"
              className="bg-teal-500 hover:bg-teal-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors whitespace-nowrap"
            >
              Ouvrir l&apos;outil →
            </Link>
          </div>
        </div>

        {/* Étapes */}
        <div className="card mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">🪜 Étapes d&apos;utilisation</h2>
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenStep(openStep === idx ? null : idx)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {step.num}
                  </div>
                  <span className="text-2xl">{step.icon}</span>
                  <span className="font-semibold text-gray-800 flex-1">{step.titre}</span>
                  <span className="text-gray-400 text-xl">{openStep === idx ? '▲' : '▼'}</span>
                </button>
                {openStep === idx && (
                  <div className="px-6 pb-5 pt-1 border-t border-gray-100">
                    {step.contenu}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="card mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">❓ Questions fréquentes</h2>
          <div className="space-y-3">
            {faq.map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-teal-500 font-bold text-lg flex-shrink-0">Q.</span>
                  <span className="font-medium text-gray-800 flex-1">{item.q}</span>
                  <span className="text-gray-400">{openFaq === idx ? '▲' : '▼'}</span>
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-4 pt-1 border-t border-gray-100">
                    <p className="text-gray-600"><span className="text-teal-500 font-bold mr-2">R.</span>{item.r}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="card bg-gray-50 border border-gray-200">
          <div className="flex items-start gap-4">
            <span className="text-4xl">✉️</span>
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">Besoin d&apos;aide supplémentaire ?</h3>
              <p className="text-gray-600">Contactez l&apos;IEN ou le conseiller pédagogique de la circonscription Cayenne 2 Roura.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-white/80">
        <p className="text-sm">Développé par <strong>LOUIS Olivier</strong> © 2026</p>
      </footer>
    </div>
  );
}
