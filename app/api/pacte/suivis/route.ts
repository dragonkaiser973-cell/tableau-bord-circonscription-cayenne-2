import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─── /api/pacte/suivis : suivis mensuels PACTE publiés ───────────────────────
// Lecture publique ; publication directeur sans auth (sélection annuaire).
// Une fiche par (école, mois) — upsert sur le couple.

const MISSION_SUIVI_KEYS = ['soutien-renforce', 'stage-reussite', 'appui-besoins-particuliers'] as const;
const MOIS_RE = /^\d{4}-\d{2}$/;

function sanitizeText(v: unknown, max = 200): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function sanitizeLignes(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l): l is Record<string, unknown> => !!l && typeof l === 'object')
    .slice(0, 60)
    .map((l) => {
      const missions: Record<string, { heures: number; nbEleves: number; niveau: string }> = {};
      const rawMissions = (l.missions && typeof l.missions === 'object' ? l.missions : {}) as Record<string, unknown>;
      for (const key of MISSION_SUIVI_KEYS) {
        const rm = rawMissions[key];
        if (!rm || typeof rm !== 'object') continue;
        const heures = Math.max(0, Math.min(200, Number((rm as Record<string, unknown>).heures) || 0));
        const nbEleves = Math.max(0, Math.min(999, Math.floor(Number((rm as Record<string, unknown>).nbEleves) || 0)));
        const niveau = sanitizeText((rm as Record<string, unknown>).niveau, 60);
        if (heures > 0 || nbEleves > 0 || niveau) missions[key] = { heures, nbEleves, niveau };
      }
      return {
        nom: sanitizeText(l.nom, 120),
        prenom: sanitizeText(l.prenom, 120),
        ecole: sanitizeText(l.ecole, 200),
        missions,
      };
    })
    .filter((l) => l.nom || l.prenom || Object.keys(l.missions).length > 0);
}

// GET : tous les suivis, ou filtrés par ?ecole_id= et/ou ?mois=.
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) return NextResponse.json([]);

    const { searchParams } = new URL(request.url);
    const ecoleId = searchParams.get('ecole_id');
    const mois = searchParams.get('mois');

    let query = supabase.from('pacte_suivis').select('*');
    if (ecoleId) query = query.eq('ecole_id', ecoleId);
    if (mois && MOIS_RE.test(mois)) query = query.eq('mois', mois);
    const { data, error } = await query.order('mois', { ascending: true }).order('ecole_name', { ascending: true });

    if (error) {
      console.error('Supabase error listing pacte_suivis:', error);
      return NextResponse.json([]);
    }
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error('GET pacte/suivis error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

// POST : publier (upsert) le suivi d'une école pour un mois.
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ message: 'Supabase non configuré côté serveur.' }, { status: 503 });
    }

    const body = await request.json();
    if (!body?.directeur_id) return NextResponse.json({ message: 'Directeur manquant.' }, { status: 400 });
    if (!body?.ecole_id) return NextResponse.json({ message: 'École manquante.' }, { status: 400 });
    const mois = sanitizeText(body?.mois, 7);
    if (!MOIS_RE.test(mois)) return NextResponse.json({ message: 'Mois invalide.' }, { status: 400 });

    const payload = {
      ecole_id: sanitizeText(body.ecole_id, 64),
      directeur_id: sanitizeText(body.directeur_id, 64),
      directeur_name: sanitizeText(body.directeur_name),
      ecole_name: sanitizeText(body.ecole_name),
      annee_n: sanitizeText(body.annee_n, 20) || '2025-2026',
      mois,
      lignes: sanitizeLignes(body.lignes),
      published_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('pacte_suivis')
      .upsert(payload, { onConflict: 'ecole_id,mois' })
      .select()
      .single();

    if (error) {
      console.error('Supabase upsert pacte_suivis error:', error);
      return NextResponse.json({ message: 'Publication impossible.', detail: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error('POST pacte/suivis error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
