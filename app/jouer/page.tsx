'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JouerPinPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) {
      setError('Le PIN doit comporter 6 chiffres');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quiz/public/sessions/by-pin/${pin}`);
      if (res.ok) {
        router.push(`/jouer/${pin}`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'PIN invalide');
        setLoading(false);
      }
    } catch {
      setError('Erreur de connexion');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-block bg-gradient-to-br from-emerald-400 via-cyan-400 to-sky-500 p-1 rounded-3xl mb-5 shadow-2xl">
            <div className="bg-slate-900 rounded-3xl px-6 py-4">
              <p className="text-3xl font-black tracking-tight">Quiz live</p>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Rejoindre une partie</h1>
          <p className="text-slate-400">Saisissez le code à 6 chiffres affiché à l&apos;écran</p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            autoFocus
            className="w-full bg-white/10 border-2 border-white/20 rounded-2xl px-6 py-6 text-center text-5xl font-mono font-black tracking-[0.4em] text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 focus:bg-white/15 transition-all"
          />
          {error && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || pin.length !== 6}
            className="w-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-white py-5 rounded-2xl text-xl font-bold shadow-2xl hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {loading ? 'Vérification…' : 'Continuer →'}
          </button>
        </form>
      </div>
    </div>
  );
}
