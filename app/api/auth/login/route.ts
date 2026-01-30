import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { getUserByUsername } from '@/lib/database';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'circonscription-cayenne2-secret-key-2026'
);

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: 'Nom d\'utilisateur et mot de passe requis' },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur
    const user = await getUserByUsername(username);

    if (!user) {
      return NextResponse.json(
        { message: 'Identifiants invalides' },
        { status: 401 }
      );
    }

    // Vérifier le mot de passe
    const isPasswordValid = bcrypt.compareSync(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Identifiants invalides' },
        { status: 401 }
      );
    }

    // Créer le token JWT
    const token = await new SignJWT({ 
      userId: user.id, 
      username: user.username,
      role: user.role 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    return NextResponse.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    return NextResponse.json(
      { message: 'Erreur du serveur' },
      { status: 500 }
    );
  }
}
