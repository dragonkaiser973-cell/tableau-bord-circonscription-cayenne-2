import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const dataDir = path.join(process.cwd(), 'data');

// Créer le dossier data s'il n'existe pas
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Fichiers de données
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
    // Essayer le chemin principal
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
    // Essayer le chemin fallback (public/)
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
  // Créer le super admin par défaut s'il n'existe pas déjà
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

  // Initialiser les autres fichiers
  if (!fs.existsSync(files.ecoles)) writeJSON(files.ecoles, []);
  if (!fs.existsSync(files.enseignants)) writeJSON(files.enseignants, []);
  if (!fs.existsSync(files.evaluations)) writeJSON(files.evaluations, []);
  if (!fs.existsSync(files.effectifs)) writeJSON(files.effectifs, []);
  if (!fs.existsSync(files.syncLogs)) writeJSON(files.syncLogs, []);
}

// Initialiser au démarrage
initDatabase();

// ============ USERS ============
export function getUserByUsername(username: string) {
  const users = readJSON(files.users, []);
  return users.find((u: any) => u.username === username);
}

// ============ ECOLES ============
export function getEcoles() {
  return readJSON(files.ecoles, []).sort((a: any, b: any) => a.nom.localeCompare(b.nom));
}

export function getEcoleById(id: number) {
  const ecoles = readJSON(files.ecoles, []);
  return ecoles.find((e: any) => e.id === id);
}

export function getEcoleByUai(uai: string) {
  const ecoles = readJSON(files.ecoles, []);
  return ecoles.find((e: any) => e.uai === uai);
}

export function createOrUpdateEcole(ecole: any) {
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
export function getEnseignants(filters?: any) {
  let enseignants = readJSON(files.enseignants, []);
  const ecoles = readJSON(files.ecoles, []);

  // Ajouter le nom de l'école
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

export function createEnseignant(enseignant: any) {
  const enseignants = readJSON(files.enseignants, []);
  
  // Vérifier si un enseignant avec le même nom, prénom, année scolaire et école existe déjà
  const existingIndex = enseignants.findIndex((e: any) => 
    e.nom === enseignant.nom && 
    e.prenom === enseignant.prenom && 
    e.annee_scolaire === enseignant.annee_scolaire &&
    e.ecole_id === enseignant.ecole_id
  );

  if (existingIndex >= 0) {
    // Mettre à jour l'enseignant existant
    enseignants[existingIndex] = {
      ...enseignants[existingIndex],
      ...enseignant,
      id: enseignants[existingIndex].id, // Garder l'ID original
      created_at: enseignants[existingIndex].created_at, // Garder la date de création
      updated_at: new Date().toISOString(),
    };
    writeJSON(files.enseignants, enseignants);
    return enseignants[existingIndex];
  } else {
    // Créer un nouvel enseignant
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
export function getEvaluations(filters?: any) {
  const publicPath = path.join(process.cwd(), 'public', 'evaluations.json');
  console.log('🔍 Lecture évaluations - data:', files.evaluations, 'public:', publicPath);
  let evaluations = readJSON(files.evaluations, [], publicPath);
  console.log('📊 Évaluations chargées:', evaluations.length);

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

export function createOrUpdateEvaluation(evaluation: any) {
  const evaluations = readJSON(files.evaluations, []);
  
  // Chercher une évaluation existante avec les mêmes critères
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
export function getEffectifs(ecole_id: number, annee_scolaire?: string) {
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

export function createOrUpdateEffectif(effectif: any) {
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
export function logSync(type: string, status: string, message: string, filename?: string) {
  const logs = readJSON(files.syncLogs, []);
  const newLog = {
    id: logs.length > 0 ? Math.max(...logs.map((l: any) => l.id || 0)) + 1 : 1,
    type,
    status,
    message,
    filename: filename || null,
    created_at: new Date().toISOString(),
  };
  logs.push(newLog);
  writeJSON(files.syncLogs, logs);
  return newLog;
}
