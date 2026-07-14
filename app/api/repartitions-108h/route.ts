import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─── Constantes partagées avec le client ─────────────────────────────────────
// Dupliquées volontairement ici pour éviter d'importer un module client dans
// une route serveur. Si la liste des catégories change, mettre à jour les deux.
const CATEGORY_KEYS = [
  'concertation',
  'conseil-ecole',
  'reunion-parents',
  'apc',
  'organisation',
] as const;
type CategoryKey = (typeof CATEGORY_KEYS)[number];
const MAX_SLOTS_PER_DAY = 4;
const PERIODE_KEYS = ['1', '2', '3', '4', '5'] as const;

// ─── Validation du payload ───────────────────────────────────────────────────
type PeriodeEvent = { id: string; category: CategoryKey; date: string; objet: string; theme: string };
type Body = {
  directeur_id: string;
  ecole_id: string;
  ecole_name: string;
  directeur_name: string;
  annee_n: string;
  type: 'maternelle' | 'elementaire';
  selections: Record<string, { category: string; slots: number }>;
  periodes: Record<string, PeriodeEvent[]>;
  notes: Record<string, string>;
  periode_bounds: Record<string, { start: string; end: string }>;
  client_id?: string;
};

function sanitizeText(v: unknown, max = 4000): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function isCategory(v: unknown): v is CategoryKey {
  return typeof v === 'string' && (CATEGORY_KEYS as readonly string[]).includes(v);
}

function sanitizeSelections(
  raw: unknown,
): Record<string, { category: CategoryKey; slots: number }> {
  const out: Record<string, { category: CategoryKey; slots: number }> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    // Clé attendue : "YYYY-MM-DD".
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    if (!val || typeof val !== 'object') continue;
    const cat = (val as { category?: unknown }).category;
    if (!isCategory(cat)) continue;
    const slotsRaw = Number((val as { slots?: unknown }).slots);
    const slots = Math.max(1, Math.min(MAX_SLOTS_PER_DAY, Math.floor(slotsRaw) || 1));
    out[key] = { category: cat, slots };
  }
  return out;
}

function sanitizePeriodes(raw: unknown): Record<string, PeriodeEvent[]> {
  const out: Record<string, PeriodeEvent[]> = {};
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  for (const k of PERIODE_KEYS) {
    const arr = Array.isArray(src[k]) ? (src[k] as unknown[]) : [];
    out[k] = arr
      .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
      .filter((e) => isCategory(e.category))
      .slice(0, 200)
      .map((e) => ({
        id: sanitizeText(e.id, 64) || `ev-${Math.random().toString(36).slice(2, 10)}`,
        category: e.category as CategoryKey,
        date: sanitizeText(e.date, 20),
        objet: sanitizeText(e.objet, 500),
        theme: sanitizeText(e.theme, 500),
      }));
  }
  return out;
}

function sanitizeNotes(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  for (const k of PERIODE_KEYS) out[k] = sanitizeText(src[k], 4000);
  return out;
}

function sanitizeBounds(raw: unknown): Record<string, { start: string; end: string }> {
  const out: Record<string, { start: string; end: string }> = {};
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  for (const k of PERIODE_KEYS) {
    const b = src[k] && typeof src[k] === 'object' ? (src[k] as Record<string, unknown>) : {};
    out[k] = { start: sanitizeText(b.start, 20), end: sanitizeText(b.end, 20) };
  }
  return out;
}

function validateAndNormalize(body: Body): { ok: true; data: Body } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Payload invalide.' };
  if (!body.directeur_id) return { ok: false, error: 'Directeur manquant.' };
  if (!body.ecole_id) return { ok: false, error: 'École manquante.' };

  const type = body.type === 'maternelle' ? 'maternelle' : 'elementaire';

  return {
    ok: true,
    data: {
      directeur_id: body.directeur_id,
      ecole_id: body.ecole_id,
      ecole_name: sanitizeText(body.ecole_name, 200),
      directeur_name: sanitizeText(body.directeur_name, 200),
      annee_n: sanitizeText(body.annee_n, 20),
      type,
      selections: sanitizeSelections(body.selections),
      periodes: sanitizePeriodes(body.periodes),
      notes: sanitizeNotes(body.notes),
      periode_bounds: sanitizeBounds(body.periode_bounds),
      client_id: body.client_id ? sanitizeText(body.client_id, 64) : undefined,
    },
  };
}

// ─── GET : liste publique des répartitions publiées ──────────────────────────
// ?id=<ecole_id> → renvoie la fiche détaillée d'une école précise.
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) return NextResponse.json([]);

    const { searchParams } = new URL(request.url);
    const ecoleId = searchParams.get('id');

    if (ecoleId) {
      const { data, error } = await supabase
        .from('repartition_108h')
        .select('*')
        .eq('ecole_id', ecoleId)
        .maybeSingle();
      if (error) {
        console.error('Supabase error fetching repartition 108h:', error);
        return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
      }
      if (!data) return NextResponse.json({ message: 'Non trouvée' }, { status: 404 });
      return NextResponse.json(data);
    }

    const { data, error } = await supabase
      .from('repartition_108h')
      .select('*')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Supabase error listing repartitions 108h:', error);
      return NextResponse.json([]);
    }
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error('GET repartitions-108h error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

// ─── POST : publier (upsert) la répartition 108h d'une école ────────────────
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
      type: v.data.type,
      selections: v.data.selections,
      periodes: v.data.periodes,
      notes: v.data.notes,
      periode_bounds: v.data.periode_bounds,
      client_id: v.data.client_id ?? null,
      published_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('repartition_108h')
      .upsert(payload, { onConflict: 'ecole_id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase upsert repartition 108h error:', error);
      return NextResponse.json(
        { message: 'Publication impossible.', detail: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('POST repartitions-108h error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
