'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import PageLoader from '@/components/PageLoader';
interface ArchivedSession {
  id: string;
  titre: string;
  description: string | null;
  date_formation: string;
  statut: 'en_cours' | 'terminee';
  created_by: string;
}

interface ArchivedDeposit {
  id: string;
  session_id: string;
  phase: 'avant' | 'apres';
  emoji: string;
  x: number;
  y: number;
}

function ArchivesBoussoleList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const annee = searchParams.get('annee');
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ArchivedSession[]>([]);
  const [deposits, setDeposits] = useState<ArchivedDeposit[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/');
      return;
    }
    if (!annee) return;
    (async () => {
      try {
        const res = await fetch(`/api/archives?annee=${annee}`);
        if (res.ok) {
          const data = await res.json();
          const brutes = data.donnees_brutes || {};
          setSessions(brutes.boussole_sessions || []);
          setDeposits(brutes.boussole_deposits || []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [annee, router]);

  const countsBySession = deposits.reduce((acc, d) => {
    if (!acc[d.session_id]) acc[d.session_id] = { avant: 0, apres: 0 };
    acc[d.session_id][d.phase]++;
    return acc;
  }, {} as Record<string, { avant: number; apres: number }>);

  if (!annee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0] text-white">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p>Paramètre année manquant</p>
          <Link href="/archives" className="text-white underline mt-4 inline-block">Retour aux archives</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0]">
      <div className="text-white py-10 px-6">
        <div className="container mx-auto">
          <Link href={`/archives/consulter?annee=${annee}`} className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors">
            ← Retour à l&apos;archive {annee}
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-3xl">🧭</div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Boussole d&apos;état d&apos;esprit</h1>
              <p className="text-lg opacity-90 mt-1">Sessions archivées · année {annee}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-10">
        {loading ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-500">Chargement…</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">🗄️</div>
            <p className="text-gray-700">Aucune session archivée pour cette année.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {sessions.map(s => {
              const c = countsBySession[s.id] || { avant: 0, apres: 0 };
              return (
                <Link
                  key={s.id}
                  href={`/archives/consulter/formations/boussole/${s.id}?annee=${annee}`}
                  className="card hover:shadow-2xl transition-all border-2 border-transparent hover:border-primary-200 block"
                >
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🧭</div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold text-gray-800 truncate">{s.titre}</h2>
                      {s.description && <p className="text-gray-500 text-sm line-clamp-2 mt-0.5">{s.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center flex-wrap gap-3 text-sm text-gray-500">
                    <span>📅 {new Date(s.date_formation).toLocaleDateString('fr-FR')}</span>
                    <span>👥 {c.avant} / {c.apres}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Archive</span>
                  </div>
                  <div className="mt-3">
                    <span className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold inline-block">
                      Consulter →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <PageLoader />
    }>
      <ArchivesBoussoleList />
    </Suspense>
  );
}
