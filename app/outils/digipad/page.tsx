'use client';

import Link from 'next/link';

export default function DigipadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      <div className="text-white py-10 px-6">
        <div className="container mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors">
            ← Retour à l&apos;accueil
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">🧩</div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Digipad de la circonscription</h1>
              <p className="text-lg opacity-90 mt-1">Ressources partagées — La Digitale</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-10">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-white/30">
          <iframe
            src="https://digipad.app/p/809985/6e7cf663e6d6d"
            title="Digipad Circonscription Cayenne 2"
            className="w-full block"
            style={{ height: 'calc(100vh - 220px)', minHeight: '500px', border: 0 }}
            allow="fullscreen"
          />
        </div>
      </div>
    </div>
  );
}
