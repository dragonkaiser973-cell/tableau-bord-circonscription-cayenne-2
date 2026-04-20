'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function FormationsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/');
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      <div className="text-white py-16 px-6">
        <div className="container mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors">
            ← Retour à l&apos;accueil
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">🧭</div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold">Formations</h1>
              <p className="text-xl opacity-90 mt-2">Outils interactifs pour vos temps de formation</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Link href="/formations/boussole">
            <div className="card hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-primary-200">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🧭</div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-800 mb-1">Boussole d&apos;état d&apos;esprit</h2>
                  <p className="text-gray-500 text-sm">
                    Sondage tactile anonyme avant/après formation. Les participants déposent un émoji sur une carte 2D.
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <span className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold inline-block">
                  Ouvrir →
                </span>
              </div>
            </div>
          </Link>

          <Link href="/formations/scenarisation">
            <div className="card hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-primary-200">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-[#45b8a0] text-white rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🎬</div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-800 mb-1">Scénarisation ABC</h2>
                  <p className="text-gray-500 text-sm">
                    Concevez une formation par glisser-déposer selon la méthode <em>Active · Blended · Connected</em> de l&apos;UCL. Cartes recto-verso, 3 phases, export PDF.
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <span className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold inline-block">
                  Ouvrir →
                </span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
