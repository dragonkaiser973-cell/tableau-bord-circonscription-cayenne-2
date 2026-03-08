import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

interface User {
  id: number;
  username: string;
  password: string;
  role: 'user' | 'admin';
  created_at: string;
  last_login?: string;
}

// Vérifier si l'utilisateur est admin via le token JWT
function verifyAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '');
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
    const { data, error } = await supabase
      .from('users')
      .select('id, username, role, created_at, last_login')
      .order('id', { ascending: true });

    if (error) throw error;

    // Adapter snake_case → camelCase pour correspondre à l'interface User de la page
    const users = (data || []).map((u: any) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      createdAt: u.created_at,
      lastLogin: u.last_login
    }));

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

    // Vérifier si l'username existe déjà
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Cet utilisateur existe déjà' }, { status: 400 });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('users')
      .insert({
        username,
        password: hashedPassword,
        role: role || 'user',
        created_at: new Date().toISOString()
      })
      .select('id, username, role, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, user: data });
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

    // Vérifier si le nouveau username est déjà pris
    if (username) {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', id)
        .single();

      if (existing) {
        return NextResponse.json({ error: 'Cet username est déjà utilisé' }, { status: 400 });
      }
    }

    const updates: any = {};
    if (username) updates.username = username;
    if (password) updates.password = await bcrypt.hash(password, 10);
    if (role) updates.role = role;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, username, role, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, user: data });
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

    // Récupérer l'utilisateur à supprimer
    const { data: userToDelete } = await supabase
      .from('users')
      .select('role')
      .eq('id', id)
      .single();

    if (!userToDelete) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    // Empêcher la suppression du dernier admin
    if (userToDelete.role === 'admin') {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      if ((count || 0) <= 1) {
        return NextResponse.json({ error: 'Impossible de supprimer le dernier admin' }, { status: 400 });
      }
    }

    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
