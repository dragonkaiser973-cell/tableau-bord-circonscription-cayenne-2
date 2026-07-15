import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─── /api/pacte/repartitions : fiches « répartition PACTE » publiées ─────────
// Lecture publique ; publication directeur sans auth (sélection annuaire),
// comme /api/previsions-structure. Filet de sécurité : table _versions.

const MISSION_KEYS = [
  'devoirs-faits-6e',
  'soutien-renforce',
  'stage-reussite',
  'harcelement',
  'appui-besoins-particuliers',
] as const;

const MAX_LIGNES = 22;

function sanitizeText(v: unknown, max = 200): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function sanitizeLignes(raw: unknown): { nom: string; prenom: string; parts: Record<string, number> }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l): l is Record<string, unknown> => !!l && typeof l === 'object')
    .slice(0, MAX_LIGNES)
    .map((l) => {
      const parts: Record<string, number> = {};
      const rawParts = (l.parts && typeof l.parts === 'object' ? l.parts : {}) as Record<string, unknown>;
      for (const key of MISSION_KEYS) {
        const v = Math.max(0, Math.min(99, Math.floor(Number(rawParts[key]) || 0)));
        if (v > 0) parts[key] = v;
      }
      return {
        nom: sanitizeText(l.nom, 120),
        prenom: sanitizeText(l.prenom, 120),
        parts,
      };
    })
    .filter((l) => l.nom || l.prenom || Object.keys(l.parts).length > 0);
}

// GET : liste publique (ou ?id=<ecole_id> → fiche unique).
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) return NextResponse.json([]);

    const { searchParams } = new URL(request.url);
    const ecoleId = searchParams.get('id');

    if (ecoleId) {
      const { data, error } = await supabase
        .from('pacte_repartitions')
        .select('*')
        .eq('ecole_id', ecoleId)
        .maybeSingle();
      if (error) {
        console.error('Supabase error fetching pacte_repartitions:', error);
        return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
      }
      if (!data) return NextResponse.json({ message: 'Non trouvée' }, { status: 404 });
      return NextResponse.json(data);
    }

    const { data, error } = await supabase
      .from('pacte_repartitions')
      .select('*')
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Supabase error listing pacte_repartitions:', error);
      return NextResponse.json([]);
    }
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error('GET pacte/repartitions error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

// POST : publier (upsert) la répartition d'une école.
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ message: 'Supabase non configuré côté serveur.' }, { status: 503 });
    }

    const body = await request.json();
    if (!body?.directeur_id) return NextResponse.json({ message: 'Directeur manquant.' }, { status: 400 });
    if (!body?.ecole_id) return NextResponse.json({ message: 'École manquante.' }, { status: 400 });

    const payload = {
      ecole_id: sanitizeText(body.ecole_id, 64),
      directeur_id: sanitizeText(body.directeur_id, 64),
      directeur_name: sanitizeText(body.directeur_name),
      ecole_name: sanitizeText(body.ecole_name),
      annee_n: sanitizeText(body.annee_n, 20) || '2025-2026',
      lignes: sanitizeLignes(body.lignes),
      client_id: body.client_id ? sanitizeText(body.client_id, 64) : null,
      published_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('pacte_repartitions')
      .upsert(payload, { onConflict: 'ecole_id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase upsert pacte_repartitions error:', error);
      return NextResponse.json({ message: 'Publication impossible.', detail: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error('POST pacte/repartitions error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
