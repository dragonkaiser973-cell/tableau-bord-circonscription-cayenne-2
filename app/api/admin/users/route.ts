import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';

const usersFile = path.join(process.cwd(), 'data', 'users.json');

interface User {
  id: number;
  username: string;
  password: string;
  role: 'user' | 'admin';
  createdAt: string;
  lastLogin?: string;
}

async function getUsers(): Promise<User[]> {
  try {
    const data = await readFile(usersFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function saveUsers(users: User[]): Promise<void> {
  await writeFile(usersFile, JSON.stringify(users, null, 2), 'utf-8');
}

// Vérifier si l'utilisateur est admin
function verifyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  
  const token = authHeader.replace('Bearer ', '');
  // Le token contient le role encodé (simplifié pour cet exemple)
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

// GET - Liste tous les utilisateurs (admin seulement)
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
  }

  try {
    const users = await getUsers();
    // Ne pas renvoyer les mots de passe
    const safeUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin
    }));
    return NextResponse.json(safeUsers);
  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Créer un nouvel utilisateur (admin seulement)
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
  }

  try {
    const { username, password, role } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username et password requis' }, { status: 400 });
    }

    if (role && role !== 'user' && role !== 'admin') {
      return NextResponse.json({ error: 'Role invalide' }, { status: 400 });
    }

    const users = await getUsers();

    // Vérifier si l'username existe déjà
    if (users.find(u => u.username === username)) {
      return NextResponse.json({ error: 'Cet utilisateur existe déjà' }, { status: 400 });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser: User = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      username,
      password: hashedPassword,
      role: role || 'user',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await saveUsers(users);

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Modifier un utilisateur (admin seulement)
export async function PUT(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
  }

  try {
    const { id, username, password, role } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const users = await getUsers();
    const userIndex = users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Vérifier si le nouveau username existe déjà (sauf pour cet utilisateur)
    if (username && users.find(u => u.username === username && u.id !== id)) {
      return NextResponse.json({ error: 'Cet username est déjà utilisé' }, { status: 400 });
    }

    // Mettre à jour les champs
    if (username) users[userIndex].username = username;
    if (password) users[userIndex].password = await bcrypt.hash(password, 10);
    if (role) users[userIndex].role = role;

    await saveUsers(users);

    return NextResponse.json({
      success: true,
      user: {
        id: users[userIndex].id,
        username: users[userIndex].username,
        role: users[userIndex].role,
        createdAt: users[userIndex].createdAt
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Supprimer un utilisateur (admin seulement)
export async function DELETE(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const users = await getUsers();
    const userToDelete = users.find(u => u.id === id);

    if (!userToDelete) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Empêcher la suppression du dernier admin
    const adminCount = users.filter(u => u.role === 'admin').length;
    if (userToDelete.role === 'admin' && adminCount === 1) {
      return NextResponse.json({ error: 'Impossible de supprimer le dernier admin' }, { status: 400 });
    }

    const filteredUsers = users.filter(u => u.id !== id);
    await saveUsers(filteredUsers);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
