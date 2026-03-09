'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: number;
  username: string;
  role: 'user' | 'admin';
  createdAt: string;
  lastLogin?: string;
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [archives, setArchives] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Modal création utilisateur
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  
  // Modal édition utilisateur
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Alerte sauvegarde
  const [sauvegardeInfo, setSauvegardeInfo] = useState<{ derniere_sauvegarde: string | null } | null>(null);
  const [savingBackup, setSavingBackup] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole');
    
    if (!token || userRole !== 'admin') {
      router.push('/');
    } else {
      setIsAdmin(true);
      loadData();
    }
  }, [router]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('authToken');

      // Charger statut sauvegarde
      const backupRes = await fetch('/api/sauvegarde', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (backupRes.ok) {
        const backupData = await backupRes.json();
        setSauvegardeInfo(backupData);
      }

      // Charger utilisateurs
      const usersRes = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }

      // Charger archives
      const archivesRes = await fetch('/api/archives');
      if (archivesRes.ok) {
        const archivesData = await archivesRes.json();
        setArchives(archivesData.archives || []);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) {
      setMessage({ type: 'error', text: 'Username et password requis' });
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: `Utilisateur ${newUser.username} créé` });
        setShowCreateModal(false);
        setNewUser({ username: '', password: '', role: 'user' });
        setShowCreatePassword(false);
        loadData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la création' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur réseau' });
    }
  };

  const confirmerSauvegarde = async () => {
    setSavingBackup(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/sauvegarde', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSauvegardeInfo(data);
        setMessage({ type: 'success', text: '✅ Sauvegarde confirmée — merci !' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la confirmation' });
    } finally {
      setSavingBackup(false);
    }
  };

  const handleEditUser = async () => {
    if (!editUser) return;

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editUser)
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Utilisateur modifié' });
        setShowEditModal(false);
        setEditUser(null);
        setShowEditPassword(false);
        loadData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la modification' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur réseau' });
    }
  };

  const handleDeleteUser = async (id: number, username: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${username}" ?\n\nCette action est irréversible !`)) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `Utilisateur ${username} supprimé` });
        loadData();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la suppression' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur réseau' });
    }
  };

  const handleDeleteArchive = async (annee: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'archive ${annee} ?\n\nCette action est irréversible !`)) {
      return;
    }

    try {
      const res = await fetch(`/api/archives?annee=${annee}`, { method: 'DELETE' });
      
      if (res.ok) {
        setMessage({ type: 'success', text: `Archive ${annee} supprimée` });
        loadData();
      } else {
        setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur réseau' });
    }
  };

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">⏳</div>
          <p className="text-xl">Chargement...</p>
        </div>
      </div>
    );
  }

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
              👑
            </div>
            <div>
              <h1 className="text-5xl font-bold">Administration</h1>
              <p className="text-xl opacity-90 mt-2">Gestion des utilisateurs et des archives</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="container mx-auto px-6 py-8">
        {/* Message */}
        {message && (
          <div className={`card mb-6 ${message.type === 'success' ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{message.type === 'success' ? '✅' : '❌'}</span>
              <p className={`font-semibold ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                {message.text}
              </p>
            </div>
          </div>
        )}

        {/* Alerte sauvegarde mensuelle */}
        {(() => {
          if (!sauvegardeInfo) return null;
          const now = new Date();
          const moisCourant = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const derniere = sauvegardeInfo.derniere_sauvegarde;
          const deja_ce_mois = derniere && derniere.startsWith(moisCourant);
          const est_premier_ou_apres = now.getDate() >= 1;
          if (deja_ce_mois) return null;
          if (!est_premier_ou_apres) return null;
          return (
            <div className="card mb-6 bg-amber-50 border-2 border-amber-400">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🗄️</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-800 mb-1">
                    Rappel mensuel — Sauvegarde des données
                  </h3>
                  <p className="text-amber-700 text-sm mb-3">
                    {derniere
                      ? `Dernière sauvegarde confirmée : ${new Date(derniere).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                      : 'Aucune sauvegarde enregistrée pour le moment.'
                    }
                  </p>
                  <div className="bg-amber-100 rounded-lg p-3 mb-4 text-sm text-amber-800">
                    <p className="font-semibold mb-2">📋 Procédure de sauvegarde :</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Connectez-vous sur <strong>supabase.com</strong> → votre projet</li>
                      <li>Allez dans <strong>Table Editor</strong></li>
                      <li>Pour chaque table ci-dessous, cliquez <strong>Export CSV</strong> :</li>
                    </ol>
                    <div className="flex flex-wrap gap-2 mt-2 ml-4">
                      {['enseignants', 'ecoles_identite', 'ecoles_structure', 'evaluations', 'evenements', 'users', 'config', 'archives'].map(t => (
                        <span key={t} className="bg-amber-200 px-2 py-0.5 rounded text-xs font-mono">{t}</span>
                      ))}
                    </div>
                    <p className="mt-2">4. Enregistrez les fichiers dans un dossier <strong>Sauvegardes / {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</strong> sur votre ordinateur ou Google Drive.</p>
                  </div>
                  <button
                    onClick={confirmerSauvegarde}
                    disabled={savingBackup}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {savingBackup ? '⏳ Enregistrement...' : '✅ J'ai effectué la sauvegarde ce mois-ci'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Section Utilisateurs */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center text-2xl">
                👥
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Utilisateurs ({users.length})</h2>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              ➕ Nouvel utilisateur
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Rôle</th>
                  <th>Créé le</th>
                  <th>Dernière connexion</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td className="font-semibold">{user.username}</td>
                    <td>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'admin' ? '👑 Admin' : '👤 Utilisateur'}
                      </span>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('fr-FR') : '-'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditUser({ ...user, password: '' });
                            setShowEditModal(true);
                          }}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          ✏️ Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section Archives */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-2xl">
              📚
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Gestion des Archives ({archives.length})</h2>
          </div>

          {archives.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              Aucune archive
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archives.map(annee => (
                <div key={annee} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-800">📅 {annee}</h4>
                      <p className="text-sm text-gray-600">Archive complète</p>
                    </div>
                    <button
                      onClick={() => handleDeleteArchive(annee)}
                      className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal création utilisateur */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Créer un utilisateur</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: jean.dupont"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 text-xl"
                    title={showCreatePassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showCreatePassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rôle</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="user">👤 Utilisateur</option>
                  <option value="admin">👑 Administrateur</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCreateUser}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700"
              >
                ✅ Créer
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewUser({ username: '', password: '', role: 'user' });
                  setShowCreatePassword(false);
                }}
                className="px-4 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal édition utilisateur */}
      {showEditModal && editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Modifier l'utilisateur</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  value={editUser.username}
                  onChange={(e) => setEditUser({...editUser, username: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nouveau mot de passe (laisser vide pour ne pas modifier)
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editUser.password || ''}
                    onChange={(e) => setEditUser({...editUser, password: e.target.value})}
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 text-xl"
                    title={showEditPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showEditPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rôle</label>
                <select
                  value={editUser.role}
                  onChange={(e) => setEditUser({...editUser, role: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="user">👤 Utilisateur</option>
                  <option value="admin">👑 Administrateur</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleEditUser}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700"
              >
                ✅ Modifier
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditUser(null);
                  setShowEditPassword(false);
                }}
                className="px-4 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
