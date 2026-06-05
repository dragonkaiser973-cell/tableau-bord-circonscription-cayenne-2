import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─── Constantes partagées avec le client ─────────────────────────────────────
// Dupliquées volontairement ici pour éviter d'importer un module client dans
// une route serveur. Si la liste des niveaux change, mettre à jour les deux.
const NIVEAUX_KEYS = [
  'TPS', 'PS', 'MS', 'GS',
  'CP', 'CE1', 'CE2', 'CM1', 'CM2',
  'ULIS', 'AUTRE',
] as const;
type NiveauKey = (typeof NIVEAUX_KEYS)[number];
const MAX_CLASSES = 35;

// ─── Validation du payload ───────────────────────────────────────────────────
type Body = {
  directeur_id: string;
  ecole_id: string;
  ecole_name: string;
  directeur_name: string;
  annee_n: string;
  annee_n1: string;
  nb_classes: number;
  rep_plus: boolean;
  effectifs: Record<string, number>;
  repartition: Record<string, number[]>;
  comm_positifs?: string;
  comm_negatifs?: string;
  client_id?: string;
};

function sanitizeText(v: unknown, max = 4000): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function sanitizeNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function validateAndNormalize(body: Body): { ok: true; data: Body } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Payload invalide.' };
  if (!body.directeur_id) return { ok: false, error: 'Directeur manquant.' };
  if (!body.ecole_id) return { ok: false, error: 'École manquante.' };

  const nb = Math.max(1, Math.min(MAX_CLASSES, Math.floor(Number(body.nb_classes) || 1)));
  const effectifs: Record<NiveauKey, number> = {} as Record<NiveauKey, number>;
  const repartition: Record<NiveauKey, number[]> = {} as Record<NiveauKey, number[]>;

  for (const k of NIVEAUX_KEYS) {
    effectifs[k] = sanitizeNumber(body.effectifs?.[k]);
    const row = Array.isArray(body.repartition?.[k]) ? body.repartition[k] : [];
    repartition[k] = Array.from({ length: nb }, (_, i) => sanitizeNumber(row[i]));
  }

  return {
    ok: true,
    data: {
      directeur_id: body.directeur_id,
      ecole_id: body.ecole_id,
      ecole_name: sanitizeText(body.ecole_name, 200),
      directeur_name: sanitizeText(body.directeur_name, 200),
      annee_n: sanitizeText(body.annee_n, 20),
      annee_n1: sanitizeText(body.annee_n1, 20),
      nb_classes: nb,
      rep_plus: Boolean(body.rep_plus),
      effectifs,
      repartition,
      comm_positifs: sanitizeText(body.comm_positifs ?? '', 4000),
      comm_negatifs: sanitizeText(body.comm_negatifs ?? '', 4000),
      client_id: body.client_id ? sanitizeText(body.client_id, 64) : undefined,
    },
  };
}

// ─── GET : liste publique des prévisions publiées ────────────────────────────
// ?id=<ecole_id> → renvoie la fiche détaillée d'une école précise.
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) return NextResponse.json([]);

    const { searchParams } = new URL(request.url);
    const ecoleId = searchParams.get('id');

    if (ecoleId) {
      const { data, error } = await supabase
        .from('previsions_structure')
        .select('*')
        .eq('ecole_id', ecoleId)
        .maybeSingle();
      if (error) {
        console.error('Supabase error fetching prevision:', error);
        return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
      }
      if (!data) return NextResponse.json({ message: 'Non trouvée' }, { status: 404 });
      return NextResponse.json(data);
    }

    const { data, error } = await supabase
      .from('previsions_structure')
      .select('*')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Supabase error listing previsions:', error);
      return NextResponse.json([]);
    }
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error('GET previsions-structure error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

// ─── POST : publier (upsert) la prévision d'une école ───────────────────────
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { message: 'Supabase non configuré côté serveur.' },
        { status: 503 },
      );
    }

    const body = (await request.json()) as Body;
    const v = validateAndNormalize(body);
    if (!v.ok) return NextResponse.json({ message: v.error }, { status: 400 });

    const payload = {
      ecole_id: v.data.ecole_id,
      directeur_id: v.data.directeur_id,
      directeur_name: v.data.directeur_name,
      ecole_name: v.data.ecole_name,
      annee_n: v.data.annee_n,
      annee_n1: v.data.annee_n1,
      nb_classes: v.data.nb_classes,
      rep_plus: v.data.rep_plus,
      effectifs: v.data.effectifs,
      repartition: v.data.repartition,
      comm_positifs: v.data.comm_positifs ?? '',
      comm_negatifs: v.data.comm_negatifs ?? '',
      client_id: v.data.client_id ?? null,
      published_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('previsions_structure')
      .upsert(payload, { onConflict: 'ecole_id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase upsert prevision error:', error);
      return NextResponse.json(
        { message: 'Publication impossible.', detail: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('POST previsions-structure error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
