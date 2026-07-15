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
  '/api/statistiques-ecoles',
  '/api/stagiaires-m2',
  '/api/archives/data',   // consultation seule (GET) des données d'une archive
  '/api/questionnaires',  // lecture publique (actifs seulement)
  '/api/questionnaires/soumissions',     // soumission publique
  '/api/annuaire',         // lecture publique de l'annuaire circo
  '/api/formations/plan',  // lecture publique du plan de formation
  '/api/previsions-structure', // lecture publique + publication directeur sans auth
  '/api/repartitions-108h',    // lecture publique + publication directeur sans auth

  '/api/quiz/public',      // accès participants quiz live (via PIN, sans auth)
];

// Routes à LECTURE publique (GET) mais ÉCRITURE réservée aux admins
// (POST/PUT/PATCH/DELETE nécessitent un token admin).
const PUBLIC_READ_ADMIN_WRITE = [
  '/api/config',
  '/api/archives',
];

// Routes à LECTURE publique (GET) mais ÉCRITURE réservée aux utilisateurs
// authentifiés, quel que soit leur rôle (token valide requis, pas forcément admin).
const PUBLIC_READ_AUTH_WRITE = [
  '/api/evenements',
  '/api/remplacements',     // gestion des remplacements TR (écriture secrétaire authentifiée)
  '/api/remplacements-tr',  // liste des TR gérée dans l'outil remplacements
];

const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

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
    // Exception : POST/PUT/DELETE sur /api/questionnaires (exactement) nécessite admin
    // /api/questionnaires/soumissions reste toujours public
    const isQuestionnairesExact = pathname === '/api/questionnaires' &&
      ['POST', 'PUT', 'DELETE'].includes(request.method);
    // DELETE sur /api/questionnaires/soumissions = suppression admin, pas une soumission publique
    const isSoumissionsDelete = pathname === '/api/questionnaires/soumissions' &&
      request.method === 'DELETE';
    const isEnseignantsWrite = pathname === '/api/enseignants' &&
      ['PUT', 'DELETE'].includes(request.method);
    if (!isQuestionnairesExact && !isSoumissionsDelete && !isEnseignantsWrite) {
      return NextResponse.next();
    }
    // Pour /api/questionnaires ou /api/enseignants en écriture → continuer vers vérification token
  }

  // Routes lecture publique / écriture réservée (admin ou simple authentifié)
  const isPublicReadAdminWrite = PUBLIC_READ_ADMIN_WRITE.some(
    r => pathname === r || pathname.startsWith(r + '/')
  );
  const isPublicReadAuthWrite = PUBLIC_READ_AUTH_WRITE.some(
    r => pathname === r || pathname.startsWith(r + '/')
  );
  const isMutation = MUTATION_METHODS.includes(request.method);
  if ((isPublicReadAdminWrite || isPublicReadAuthWrite) && !isMutation) {
    // GET/HEAD → lecture publique autorisée
    return NextResponse.next();
  }
  // Écriture sur ces routes → continuer vers vérification token
  // (rôle admin exigé uniquement pour PUBLIC_READ_ADMIN_WRITE, voir plus bas)

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
  const isEnseignantsWriteAdmin = pathname === '/api/enseignants' && ['PUT', 'DELETE'].includes(request.method);

  const isPublicReadAdminWriteMutation = isPublicReadAdminWrite && isMutation;

  if ((isAdminRoute || isQuestionnairesWrite || isEnseignantsWriteAdmin || isPublicReadAdminWriteMutation) && payload.role !== 'admin') {
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
