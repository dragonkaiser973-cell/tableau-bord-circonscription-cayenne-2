const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

console.log('🔧 Création du Super Administrateur...\n');

// Créer le dossier data s'il n'existe pas
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ Dossier "data" créé');
}

// Créer le super admin
const hashedPassword = bcrypt.hashSync('SuperAdmin2026!', 10);
const users = [
  {
    id: 1,
    username: 'superadmin',
    password: hashedPassword,
    role: 'admin',
    created_at: new Date().toISOString()
  }
];

// Écrire dans users.json
const usersFile = path.join(dataDir, 'users.json');
fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

console.log('✅ Super Admin créé avec succès !\n');
console.log('📁 Fichier créé : ' + usersFile);
console.log('\n🔐 Identifiants de connexion :');
console.log('   Username: superadmin');
console.log('   Password: SuperAdmin2026!');
console.log('\n⚠️  IMPORTANT : Changez ce mot de passe après la première connexion !');
console.log('\n🚀 Vous pouvez maintenant lancer l\'application avec : npm start');
