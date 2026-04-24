'use client';

import AuroraHeader from '@/components/AuroraHeader';

export default function DigipadPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <AuroraHeader
        kicker="Ressources partagées · La Digitale"
        title="Digipad de la"
        titleAccent="circonscription."
        subtitle="Mur collaboratif de ressources pédagogiques pour les enseignants de Cayenne 2 — Roura."
        backLabel="Retour à l'accueil"
        padding="py-10 md:py-12"
      />

      <div className="mx-auto w-full max-w-[1720px] px-4 md:px-6 pb-10 relative z-10">
        <div className="bg-white rounded-3xl shadow-[0_1px_0_rgba(15,23,42,0.02),0_32px_60px_-24px_rgba(30,90,120,0.28)] border border-slate-200 overflow-hidden">
          <iframe
            src="https://digipad.app/p/809985/6e7cf663e6d6d"
            title="Digipad Circonscription Cayenne 2"
            className="w-full block"
            style={{ height: 'calc(100dvh - 320px)', minHeight: '540px', border: 0 }}
            allow="fullscreen"
          />
        </div>
      </div>
    </div>
  );
}
