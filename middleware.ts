import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Routes publiques — accessibles sans token
const PUBLIC_API_ROUTES = [
  '/api/auth/login',
  '/api/ecoles',
  '/api/ecoles-identite',
  '/api/ecoles-structure',
  '/api/enseignants',
  '/api/evaluations',
  '/api/evenements',
  '/api/config',
  '/api/statistiques-ecoles',
  '/api/stagiaires-m2',
  '/api/archives',
  '/api/archives/data',
  '/api/questionnaires',  // lecture publique (actifs seulement)
  '/api/questionnaires/soumissions',     // soumission publique
];

// Routes réservées aux admins
const ADMIN_API_ROUTES = [
  '/api/admin',
  '/api/import',
  '/api/import-ecole-identite-single',
  '/api/import-ecole-structure-single',
  '/api/import-ecoles-identite',
  '/api/import-ecoles-pdf',
  '/api/import-ecoles-structure',
  '/api/import-stagiaires',
  '/api/import-statistique-single',
  '/api/import-statistiques',
  '/api/import-statistiques-onde',
  '/api/reset',
  '/api/reset-ecoles-all',
  '/api/reset-ecoles-identite',
  '/api/reset-ecoles-structure',
  '/api/reset-enseignants',
  '/api/reset-evaluations',
  '/api/reset-stagiaires',
  '/api/reset-statistiques',
  '/api/changer-annee',
  '/api/dedoublonner-enseignants',
  '/api/sauvegarde',
  '/api/logs-connexion',
];

async function verifyToken(token: string): Promise<{ userId: number; username: string; role: string } | null> {
  try {
    if (!process.env.JWT_SECRET) return null;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as any;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Routes API seulement ──────────────────────────────────────
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Routes publiques → laisser passer
  const isPublic = PUBLIC_API_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
  if (isPublic) {
    // Exception : POST/PUT/DELETE sur /api/questionnaires nécessite admin
    // MAIS /api/soumissions POST reste toujours public (répondants non connectés)
    const isQuestionnairesWrite = pathname.startsWith('/api/questionnaires') &&
      ['POST', 'PUT', 'DELETE'].includes(request.method);
    if (!isQuestionnairesWrite) {
      return NextResponse.next();
    }
    // Pour /api/questionnaires en écriture → continuer vers vérification token
  }

  // Toutes les autres routes API → token requis
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 });
  }

  // Routes admin → rôle admin requis
  const isAdminRoute = ADMIN_API_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
  const isQuestionnairesWrite = pathname.startsWith('/api/questionnaires') && ['POST', 'PUT', 'DELETE'].includes(request.method);

  if ((isAdminRoute || isQuestionnairesWrite) && payload.role !== 'admin') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
  }

  // Token valide → ajouter les infos user dans les headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', String(payload.userId));
  requestHeaders.set('x-user-role', payload.role);
  requestHeaders.set('x-username', payload.username);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*'],
};
