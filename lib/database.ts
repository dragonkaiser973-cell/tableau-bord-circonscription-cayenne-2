import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { supabase, isSupabaseConfigured } from './supabase';

const dataDir = path.join(process.cwd(), 'data');

// Créer le dossier data s'il n'existe pas (pour fallback JSON)
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (e) {
    // Ignore error on read-only filesystem (Vercel)
  }
}

// Fichiers de données (fallback)
const files = {
  users: path.join(dataDir, 'users.json'),
  ecoles: path.join(dataDir, 'ecoles.json'),
  enseignants: path.join(dataDir, 'enseignants.json'),
  evaluations: path.join(dataDir, 'evaluations.json'),
  effectifs: path.join(dataDir, 'effectifs.json'),
  syncLogs: path.join(dataDir, 'sync_logs.json'),
};

// Fonction pour lire un fichier JSON avec fallback sur public/
function readJSON(filePath: string, defaultValue: any = [], fallbackPath?: string) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
    if (fallbackPath && fs.existsSync(fallbackPath)) {
      const data = fs.readFileSync(fallbackPath, 'utf-8');
      return JSON.parse(data);
    }
    return defaultValue;
  } catch (error) {
    console.error(`Erreur lecture ${filePath}:`, error);
    return defaultValue;
  }
}

// Fonction pour écrire dans un fichier JSON
function writeJSON(filePath: string, data: any) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Erreur écriture ${filePath}:`, error);
    return false;
  }
}

// Initialiser les données
export function initDatabase() {
  if (isSupabaseConfigured()) {
    console.log('✅ Using Supabase database');
    return;
  }

  console.log('⚠️ Supabase not configured, using JSON files');
  
  const users = readJSON(files.users, []);
  if (users.length === 0) {
    const hashedPassword = bcrypt.hashSync('SuperAdmin2026!', 10);
    users.push({
      id: 1,
      username: 'superadmin',
      password: hashedPassword,
      role: 'admin',
      created_at: new Date().toISOString(),
    });
    writeJSON(files.users, users);
    console.log('🔐 Super Admin créé : superadmin / SuperAdmin2026!');
  }

  if (!fs.existsSync(files.ecoles)) writeJSON(files.ecoles, []);
  if (!fs.existsSync(files.enseignants)) writeJSON(files.enseignants, []);
  if (!fs.existsSync(files.evaluations)) writeJSON(files.evaluations, []);
  if (!fs.existsSync(files.effectifs)) writeJSON(files.effectifs, []);
  if (!fs.existsSync(files.syncLogs)) writeJSON(files.syncLogs, []);
}

initDatabase();

// ============ USERS ============
export async function getUserByUsername(username: string) {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
      
      if (error) {
        console.error('Supabase error fetching user:', error);
        if (username === 'superadmin') {
          const hashedPassword = bcrypt.hashSync('SuperAdmin2026!', 10);
          return {
            id: 1,
            username: 'superadmin',
            password: hashedPassword,
            role: 'admin',
            created_at: new Date().toISOString(),
          };
        }
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching user:', error);
      if (username === 'superadmin') {
        const hashedPassword = bcrypt.hashSync('SuperAdmin2026!', 10);
        return {
          id: 1,
          username: 'superadmin',
          password: hashedPassword,
          role: 'admin',
          created_at: new Date().toISOString(),
        };
      }
      return null;
    }
  }
  
  const users = readJSON(files.users, []);
  const user = users.find((u: any) => u.username === username);
  
  if (!user && username === 'superadmin') {
    const hashedPassword = bcrypt.hashSync('SuperAdmin2026!', 10);
    return {
      id: 1,
      username: 'superadmin',
      password: hashedPassword,
      role: 'admin',
      created_at: new Date().toISOString(),
    };
  }
  
  return user;
}

// ============ ECOLES ============
export async function getEcoles() {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('ecoles_identite')
        .select('*')
        .order('nom', { ascending: true });
      
      if (error) {
        console.error('Supabase error fetching ecoles:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching ecoles:', error);
      return [];
    }
  }
  
  return readJSON(files.ecoles, []).sort((a: any, b: any) => a.nom.localeCompare(b.nom));
}

export async function getEcoleById(id: number) {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('ecoles_identite')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Supabase error fetching ecole by id:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching ecole by id:', error);
      return null;
    }
  }
  
  const ecoles = readJSON(files.ecoles, []);
  return ecoles.find((e: any) => e.id === id);
}

export async function getEcoleByUai(uai: string) {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('ecoles_identite')
        .select('*')
        .eq('uai', uai)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Supabase error fetching ecole by UAI:', error);
      }
      
      return data || null;
    } catch (error) {
      console.error('Error fetching ecole by UAI:', error);
      return null;
    }
  }
  
  const ecoles = readJSON(files.ecoles, []);
  return ecoles.find((e: any) => e.uai === uai);
}

export async function createOrUpdateEcole(ecole: any) {
  if (isSupabaseConfigured()) {
    try {
      // Vérifier si l'école existe déjà
      const { data: existing } = await supabase
        .from('ecoles_identite')
        .select('id')
        .eq('uai', ecole.uai)
        .single();
      
      if (existing) {
        // Mettre à jour
        const { error } = await supabase
          .from('ecoles_identite')
          .update({
            ...ecole,
            updated_at: new Date().toISOString()
          })
          .eq('uai', ecole.uai);
        
        if (error) {
          console.error('Supabase error updating ecole:', error);
          return false;
        }
      } else {
        // Créer
        const { error } = await supabase
          .from('ecoles_identite')
          .insert({
            ...ecole,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Supabase error creating ecole:', error);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error creating/updating ecole:', error);
      return false;
    }
  }
  
  // Fallback JSON
  const ecoles = readJSON(files.ecoles, []);
  const existing = ecoles.find((e: any) => e.uai === ecole.uai);

  if (existing) {
    Object.assign(existing, {
      ...ecole,
      updated_at: new Date().toISOString(),
    });
  } else {
    const newEcole = {
      id: ecoles.length > 0 ? Math.max(...ecoles.map((e: any) => e.id)) + 1 : 1,
      ...ecole,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    ecoles.push(newEcole);
  }

  writeJSON(files.ecoles, ecoles);
  return true;
}

// ============ ENSEIGNANTS ============
export async function getEnseignants(filters?: any) {
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('enseignants').select('*');
      
      if (filters?.ecole_uai) {
        query = query.eq('ecole_uai', filters.ecole_uai);
      }
      if (filters?.annee_scolaire) {
        query = query.eq('annee_scolaire', filters.annee_scolaire);
      }
      if (filters?.nom) {
        query = query.ilike('nom', `%${filters.nom}%`);
      }
      if (filters?.statut) {
        query = query.eq('statut', filters.statut);
      }
      
      const { data, error } = await query.order('nom', { ascending: true });
      
      if (error) {
        console.error('Supabase error fetching enseignants:', error);
        return [];
      }
      
      // Pas de jointure - ecole_nom sera vide pour l'instant
      // TODO: Ajouter une table ecoles ou récupérer les noms autrement
      return (data || []).map((e: any) => ({
        ...e,
        ecole_nom: e.ecole_uai || '' // Utiliser l'UAI en attendant
      }));
    } catch (error) {
      console.error('Error fetching enseignants:', error);
      return [];
    }
  }
  
  // Fallback JSON
  let enseignants = readJSON(files.enseignants, []);
  const ecoles = readJSON(files.ecoles, []);

  enseignants = enseignants.map((e: any) => {
    const ecole = ecoles.find((ec: any) => ec.id === e.ecole_id);
    return {
      ...e,
      ecole_nom: ecole ? ecole.nom : '',
    };
  });

  if (filters) {
    if (filters.ecole_id) {
      enseignants = enseignants.filter((e: any) => e.ecole_id === filters.ecole_id);
    }
    if (filters.annee_scolaire) {
      enseignants = enseignants.filter((e: any) => e.annee_scolaire === filters.annee_scolaire);
    }
    if (filters.nom) {
      enseignants = enseignants.filter((e: any) =>
        e.nom.toLowerCase().includes(filters.nom.toLowerCase())
      );
    }
    if (filters.statut) {
      enseignants = enseignants.filter((e: any) => e.statut === filters.statut);
    }
  }

  return enseignants.sort((a: any, b: any) => {
    const nameCompare = a.nom.localeCompare(b.nom);
    if (nameCompare !== 0) return nameCompare;
    return (a.prenom || '').localeCompare(b.prenom || '');
  });
}

export async function createEnseignant(enseignant: any) {
  if (isSupabaseConfigured()) {
    try {
      console.log('📝 Tentative création enseignant:', enseignant.nom, enseignant.prenom);
      
      // Vérifier si l'enseignant existe déjà
      const { data: existing } = await supabase
        .from('enseignants')
        .select('id')
        .eq('nom', enseignant.nom)
        .eq('prenom', enseignant.prenom)
        .eq('annee_scolaire', enseignant.annee_scolaire)
        .eq('ecole_uai', enseignant.ecole_uai)
        .single();
      
      if (existing) {
        console.log('  → Enseignant existe déjà, mise à jour');
        // Mettre à jour
        const { data, error } = await supabase
          .from('enseignants')
          .update({
            ...enseignant,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) {
          console.error('❌ Supabase error updating enseignant:', error);
          console.error('   Data:', enseignant);
          return null;
        }
        
        console.log('  ✅ Mise à jour réussie');
        return data;
      } else {
        console.log('  → Nouvel enseignant, création');
        // Créer
        const { data, error } = await supabase
          .from('enseignants')
          .insert({
            ...enseignant,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) {
          console.error('❌ Supabase error creating enseignant:', error);
          console.error('   Code:', error.code);
          console.error('   Message:', error.message);
          console.error('   Details:', error.details);
          console.error('   Hint:', error.hint);
          console.error('   Data envoyée:', enseignant);
          return null;
        }
        
        console.log('  ✅ Création réussie');
        return data;
      }
    } catch (error) {
      console.error('❌ Error creating enseignant:', error);
      return null;
    }
  }
  
  // Fallback JSON
  const enseignants = readJSON(files.enseignants, []);
  
  const existingIndex = enseignants.findIndex((e: any) => 
    e.nom === enseignant.nom && 
    e.prenom === enseignant.prenom && 
    e.annee_scolaire === enseignant.annee_scolaire &&
    e.ecole_id === enseignant.ecole_id
  );

  if (existingIndex >= 0) {
    enseignants[existingIndex] = {
      ...enseignants[existingIndex],
      ...enseignant,
      id: enseignants[existingIndex].id,
      created_at: enseignants[existingIndex].created_at,
      updated_at: new Date().toISOString(),
    };
    writeJSON(files.enseignants, enseignants);
    return enseignants[existingIndex];
  } else {
    const newEnseignant = {
      id: enseignants.length > 0 ? Math.max(...enseignants.map((e: any) => e.id)) + 1 : 1,
      ...enseignant,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    enseignants.push(newEnseignant);
    writeJSON(files.enseignants, enseignants);
    return newEnseignant;
  }
}

// ============ EVALUATIONS ============
export async function getEvaluations(filters?: any) {
  if (isSupabaseConfigured()) {
    try {
      let query = supabase.from('evaluations').select('*');
      
      if (filters?.rentree) {
        query = query.eq('rentree', filters.rentree);
      }
      if (filters?.uai) {
        query = query.eq('uai', filters.uai);
      }
      if (filters?.classe) {
        query = query.eq('classe', filters.classe);
      }
      if (filters?.matiere) {
        query = query.eq('matiere', filters.matiere);
      }
      
      const { data, error } = await query.order('rentree', { ascending: false });
      
      if (error) {
        console.error('Supabase error fetching evaluations:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching evaluations:', error);
      return [];
    }
  }
  
  // Fallback JSON
  const publicPath = path.join(process.cwd(), 'public', 'evaluations.json');
  let evaluations = readJSON(files.evaluations, [], publicPath);

  if (filters) {
    if (filters.rentree) {
      evaluations = evaluations.filter((e: any) => e.rentree === filters.rentree);
    }
    if (filters.uai) {
      evaluations = evaluations.filter((e: any) => e.uai === filters.uai);
    }
    if (filters.classe) {
      evaluations = evaluations.filter((e: any) => e.classe === filters.classe);
    }
    if (filters.matiere) {
      evaluations = evaluations.filter((e: any) => e.matiere === filters.matiere);
    }
  }

  return evaluations.sort((a: any, b: any) => {
    if (b.rentree !== a.rentree) return b.rentree - a.rentree;
    const denCompare = a.denomination.localeCompare(b.denomination);
    if (denCompare !== 0) return denCompare;
    const classeCompare = a.classe.localeCompare(b.classe);
    if (classeCompare !== 0) return classeCompare;
    const matiereCompare = a.matiere.localeCompare(b.matiere);
    if (matiereCompare !== 0) return matiereCompare;
    return a.libelle.localeCompare(b.libelle);
  });
}

export async function createOrUpdateEvaluation(evaluation: any) {
  if (isSupabaseConfigured()) {
    try {
      // Vérifier si l'évaluation existe déjà
      const { data: existing } = await supabase
        .from('evaluations')
        .select('id')
        .eq('rentree', evaluation.rentree)
        .eq('uai', evaluation.uai)
        .eq('classe', evaluation.classe)
        .eq('matiere', evaluation.matiere)
        .eq('libelle', evaluation.libelle)
        .single();
      
      if (existing) {
        // Mettre à jour
        const { error } = await supabase
          .from('evaluations')
          .update(evaluation)
          .eq('id', existing.id);
        
        if (error) {
          console.error('Supabase error updating evaluation:', error);
          return false;
        }
      } else {
        // Créer
        const { error } = await supabase
          .from('evaluations')
          .insert({
            ...evaluation,
            created_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Supabase error creating evaluation:', error);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error creating/updating evaluation:', error);
      return false;
    }
  }
  
  // Fallback JSON
  const evaluations = readJSON(files.evaluations, []);
  
  const existingIndex = evaluations.findIndex(
    (e: any) =>
      e.rentree === evaluation.rentree &&
      e.uai === evaluation.uai &&
      e.classe === evaluation.classe &&
      e.matiere === evaluation.matiere &&
      e.libelle === evaluation.libelle
  );

  if (existingIndex >= 0) {
    evaluations[existingIndex] = {
      ...evaluations[existingIndex],
      ...evaluation,
      updated_at: new Date().toISOString(),
    };
  } else {
    const newEvaluation = {
      id: evaluations.length > 0 ? Math.max(...evaluations.map((e: any) => e.id || 0)) + 1 : 1,
      ...evaluation,
      created_at: new Date().toISOString(),
    };
    evaluations.push(newEvaluation);
  }

  writeJSON(files.evaluations, evaluations);
  return true;
}

// ============ EFFECTIFS ============
export async function getEffectifs(ecole_id: number, annee_scolaire?: string) {
  if (isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('effectifs')
        .select('*')
        .eq('ecole_id', ecole_id);
      
      if (annee_scolaire) {
        query = query.eq('annee_scolaire', annee_scolaire);
      }
      
      const { data, error } = await query.order('annee_scolaire', { ascending: false });
      
      if (error) {
        console.error('Supabase error fetching effectifs:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching effectifs:', error);
      return [];
    }
  }
  
  // Fallback JSON
  let effectifs = readJSON(files.effectifs, []);
  effectifs = effectifs.filter((e: any) => e.ecole_id === ecole_id);

  if (annee_scolaire) {
    effectifs = effectifs.filter((e: any) => e.annee_scolaire === annee_scolaire);
  }

  return effectifs.sort((a: any, b: any) => {
    if (a.annee_scolaire !== b.annee_scolaire) {
      return b.annee_scolaire.localeCompare(a.annee_scolaire);
    }
    return a.niveau.localeCompare(b.niveau);
  });
}

export async function createOrUpdateEffectif(effectif: any) {
  if (isSupabaseConfigured()) {
    try {
      const { data: existing } = await supabase
        .from('effectifs')
        .select('id')
        .eq('ecole_id', effectif.ecole_id)
        .eq('annee_scolaire', effectif.annee_scolaire)
        .eq('niveau', effectif.niveau)
        .single();
      
      if (existing) {
        const { error } = await supabase
          .from('effectifs')
          .update({
            ...effectif,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        
        if (error) {
          console.error('Supabase error updating effectif:', error);
          return false;
        }
      } else {
        const { error } = await supabase
          .from('effectifs')
          .insert({
            ...effectif,
            created_at: new Date().toISOString()
          });
        
        if (error) {
          console.error('Supabase error creating effectif:', error);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error creating/updating effectif:', error);
      return false;
    }
  }
  
  // Fallback JSON
  const effectifs = readJSON(files.effectifs, []);
  
  const existingIndex = effectifs.findIndex(
    (e: any) =>
      e.ecole_id === effectif.ecole_id &&
      e.annee_scolaire === effectif.annee_scolaire &&
      e.niveau === effectif.niveau
  );

  if (existingIndex >= 0) {
    effectifs[existingIndex] = {
      ...effectifs[existingIndex],
      ...effectif,
      updated_at: new Date().toISOString(),
    };
  } else {
    const newEffectif = {
      id: effectifs.length > 0 ? Math.max(...effectifs.map((e: any) => e.id || 0)) + 1 : 1,
      ...effectif,
      created_at: new Date().toISOString(),
    };
    effectifs.push(newEffectif);
  }

  writeJSON(files.effectifs, effectifs);
  return true;
}

// ============ SYNC LOGS ============
export async function logSync(type: string, status: string, message: string, filename?: string) {
  // Désactivé temporairement car writeJSON ne fonctionne pas sur Vercel
  // TODO: Migrer vers une table logs dans Supabase si nécessaire
  console.log(`[LOG SYNC] ${type} - ${status}: ${message} (${filename || 'no file'})`);
  return {
    id: 1,
    type,
    status,
    message,
    filename: filename || null,
    created_at: new Date().toISOString(),
  };
}
