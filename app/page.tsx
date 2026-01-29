'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà authentifié
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('username', data.user.username);
        setIsAuthenticated(true);
        setShowLoginModal(false);
      } else {
        setError(data.message || 'Erreur de connexion');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-500 to-[#45b8a0] text-white">
        <div className="absolute top-0 left-[10%] w-48 h-48 bg-white/5 rounded-full -translate-y-1/2"></div>
        <div className="absolute top-24 left-[5%] w-36 h-36 bg-white/5 rounded-full"></div>
        
        <div className="container mx-auto px-6 py-16 relative z-10">
          <div className="flex justify-between items-center mb-12">
            <div></div>
            <div>
              {isAuthenticated ? (
                <button onClick={handleLogout} className="btn-secondary">
                  🚪 Déconnexion
                </button>
              ) : (
                <button onClick={() => setShowLoginModal(true)} className="btn-secondary">
                  🔐 Connexion
                </button>
              )}
            </div>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-xl mb-6">
              <span className="text-4xl">📊</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              Tableau de bord
            </h1>
            <p className="text-2xl md:text-3xl mb-8 opacity-95">
              Circonscription Cayenne 2 Roura
            </p>
            <p className="text-lg opacity-90 max-w-2xl mx-auto">
              Plateforme de gestion et d'analyse des données de la circonscription
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12 -mt-8 relative z-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Card Écoles */}
          <Link href="/ecoles">
            <div className="card hover:shadow-2xl transition-shadow cursor-pointer">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-2xl">
                  🏫
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Écoles</h2>
              </div>
              <p className="text-gray-600">
                Consultez les informations et les statistiques de chaque école de la circonscription
              </p>
            </div>
          </Link>

          {/* Card Circonscription */}
          <Link href="/circonscription">
            <div className="card hover:shadow-2xl transition-shadow cursor-pointer">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-2xl">
                  🌍
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Circonscription</h2>
              </div>
              <p className="text-gray-600">
                Vue d'ensemble des données de toute la circonscription avec filtres avancés
              </p>
            </div>
          </Link>

          {/* Card Évaluations */}
          <Link href="/evaluations">
            <div className="card hover:shadow-2xl transition-shadow cursor-pointer">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-2xl">
                  📈
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Évaluations</h2>
              </div>
              <p className="text-gray-600">
                Résultats et analyses des évaluations nationales
              </p>
            </div>
          </Link>

          {/* Card Enseignants */}
          <Link href="/enseignants">
            <div className="card hover:shadow-2xl transition-shadow cursor-pointer">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-2xl">
                  👨‍🏫
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Enseignants</h2>
              </div>
              <p className="text-gray-600">
                Recherche et parcours des enseignants de la circonscription
              </p>
            </div>
          </Link>

          {/* Card Données (authentifié seulement) */}
          {isAuthenticated && (
            <Link href="/donnees">
              <div className="card hover:shadow-2xl transition-shadow cursor-pointer bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary-500 text-white rounded-lg flex items-center justify-center text-2xl">
                    💾
                  </div>
                  <h2 className="text-2xl font-bold text-primary-700">Données</h2>
                </div>
                <p className="text-primary-600 font-medium">
                  Importation et gestion des données (accès réservé)
                </p>
              </div>
            </Link>
          )}

          {/* Card Calendrier (authentifié seulement) */}
          {isAuthenticated && (
            <Link href="/calendrier">
              <div className="card hover:shadow-2xl transition-shadow cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-500 text-white rounded-lg flex items-center justify-center text-2xl">
                    📅
                  </div>
                  <h2 className="text-2xl font-bold text-blue-700">Calendrier</h2>
                </div>
                <p className="text-blue-600 font-medium">
                  Planification des rendez-vous, formations et réunions
                </p>
              </div>
            </Link>
          )}

          {/* Card Archives (authentifié seulement) */}
          {isAuthenticated && (
            <Link href="/archives">
              <div className="card hover:shadow-2xl transition-shadow cursor-pointer bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-amber-500 text-white rounded-lg flex items-center justify-center text-2xl">
                    📚
                  </div>
                  <h2 className="text-2xl font-bold text-amber-700">Archives</h2>
                </div>
                <p className="text-amber-600 font-medium">
                  Consultation des années scolaires passées
                </p>
              </div>
            </Link>
          )}

          {/* Card Administration (admin seulement) */}
          {isAuthenticated && typeof window !== 'undefined' && localStorage.getItem('userRole') === 'admin' && (
            <Link href="/admin">
              <div className="card hover:shadow-2xl transition-shadow cursor-pointer bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-purple-500 text-white rounded-lg flex items-center justify-center text-2xl">
                    👑
                  </div>
                  <h2 className="text-2xl font-bold text-purple-700">Administration</h2>
                </div>
                <p className="text-purple-600 font-medium">
                  Gestion des utilisateurs et des archives
                </p>
              </div>
            </Link>
          )}

          {/* Card Statistiques */}
          <Link href="/statistiques">
            <div className="card hover:shadow-2xl transition-shadow cursor-pointer">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-2xl">
                  📊
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Statistiques</h2>
              </div>
              <p className="text-gray-600">
                Tableaux de bord et analyses statistiques détaillées
              </p>
            </div>
          </Link>

          {/* Card Pilotage (authentifié seulement) */}
          {isAuthenticated && (
            <Link href="/pilotage">
              <div className="card hover:shadow-2xl transition-shadow cursor-pointer bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-emerald-500 text-white rounded-lg flex items-center justify-center text-2xl">
                    📈
                  </div>
                  <h2 className="text-2xl font-bold text-emerald-700">Pilotage</h2>
                </div>
                <p className="text-emerald-600 font-medium">
                  Indicateurs clés et tableaux de bord dynamiques
                </p>
              </div>
            </Link>
          )}

          {/* Card Carte (authentifié seulement) */}
          {isAuthenticated && (
            <Link href="/carte">
              <div className="card hover:shadow-2xl transition-shadow cursor-pointer bg-gradient-to-br from-sky-50 to-sky-100 border-2 border-sky-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-sky-500 text-white rounded-lg flex items-center justify-center text-2xl">
                    🗺️
                  </div>
                  <h2 className="text-2xl font-bold text-sky-700">Carte</h2>
                </div>
                <p className="text-sky-600 font-medium">
                  Localisation géographique des écoles
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Modal de connexion */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Connexion</h2>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">
                  Nom d'utilisateur
                </label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  className="input-field"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    className="input-field w-full pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 text-xl"
                    title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full">
                Se connecter
              </button>
            </form>

            <p className="text-sm text-gray-500 mt-4 text-center">
              Compte par défaut : superadmin / SuperAdmin2026!
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-8 text-white/80">
        <p className="text-sm">
          Développé par <strong>LOUIS Olivier</strong> © 2026
        </p>
      </footer>
    </div>
  );
}
