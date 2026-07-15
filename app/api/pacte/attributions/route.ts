import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─── /api/pacte/attributions : parts PACTE attribuées par l'IEN, par école ──
// Lecture publique (les directeurs voient l'attribué), écriture réservée aux
// utilisateurs authentifiés (middleware.ts — PUBLIC_READ_AUTH_WRITE).

// Clés de missions autorisées — dupliquées du référentiel client
// (app/outils/pacte/types.ts) pour ne pas importer un module client ici.
const MISSION_KEYS = [
  'devoirs-faits-6e',
  'soutien-renforce',
  'stage-reussite',
  'harcelement',
  'appui-besoins-particuliers',
] as const;

function sanitizeText(v: unknown, max = 200): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function sanitizeParts(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of MISSION_KEYS) {
    const v = Math.max(0, Math.min(999, Math.floor(Number((raw as Record<string, unknown>)[key]) || 0)));
    if (v > 0) out[key] = v;
  }
  return out;
}

// GET : liste complète, triée par nom d'école.
export async function GET() {
  try {
    if (!isSupabaseConfigured()) return NextResponse.json([]);

    const { data, error } = await supabase
      .from('pacte_attributions')
      .select('*')
      .order('ecole_name', { ascending: true });

    if (error) {
      console.error('Supabase error listing pacte_attributions:', error);
      return NextResponse.json([]);
    }
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error('GET pacte/attributions error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT : upsert d'une attribution. Body : { ecole_id, ecole_name, annee_n, parts }
export async function PUT(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ message: 'Supabase non configuré côté serveur.' }, { status: 503 });
    }

    const body = await request.json();
    const ecole_id = sanitizeText(body?.ecole_id, 64);
    const ecole_name = sanitizeText(body?.ecole_name);
    if (!ecole_id || !ecole_name) {
      return NextResponse.json({ message: 'École manquante.' }, { status: 400 });
    }

    const payload = {
      ecole_id,
      ecole_name,
      annee_n: sanitizeText(body?.annee_n, 20) || '2025-2026',
      parts: sanitizeParts(body?.parts),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('pacte_attributions')
      .upsert(payload, { onConflict: 'ecole_id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase upsert pacte_attributions error:', error);
      return NextResponse.json({ message: 'Enregistrement impossible.', detail: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error('PUT pacte/attributions error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE ?id=<ecole_id> : retirer l'attribution d'une école.
export async function DELETE(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ message: 'Supabase non configuré côté serveur.' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'Identifiant manquant.' }, { status: 400 });

    const { error } = await supabase.from('pacte_attributions').delete().eq('ecole_id', id);

    if (error) {
      console.error('Supabase delete pacte_attributions error:', error);
      return NextResponse.json({ message: 'Suppression impossible.', detail: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE pacte/attributions error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
