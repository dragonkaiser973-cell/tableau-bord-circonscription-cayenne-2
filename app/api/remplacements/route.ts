import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─── /api/remplacements : remplacements effectués par les TR ────────────────
// Lecture publique (GET), écriture réservée aux utilisateurs authentifiés
// (middleware.ts — PUBLIC_READ_AUTH_WRITE).

const PLAGES = ['journee', 'matin', 'apres-midi'] as const;
type Plage = (typeof PLAGES)[number];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeText(v: unknown, max = 200): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function sanitizeEnseignants(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e) => sanitizeText(e))
    .filter((e) => e.length > 0)
    .slice(0, 20);
}

type Payload = {
  tr_id: string;
  date_debut: string;
  date_fin: string;
  plage: Plage;
  ecole_uai: string;
  ecole_nom: string;
  enseignants: string[];
};

function validate(body: any): { ok: true; data: Payload } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Payload invalide.' };

  const tr_id = sanitizeText(body.tr_id, 64);
  if (!tr_id) return { ok: false, error: 'TR manquant.' };

  const date_debut = sanitizeText(body.date_debut, 10);
  const date_fin = sanitizeText(body.date_fin, 10);
  if (!DATE_RE.test(date_debut) || !DATE_RE.test(date_fin)) {
    return { ok: false, error: 'Dates invalides.' };
  }
  if (date_fin < date_debut) {
    return { ok: false, error: 'La date de fin doit être postérieure ou égale à la date de début.' };
  }

  const plage = (PLAGES as readonly string[]).includes(body.plage) ? (body.plage as Plage) : null;
  if (!plage) return { ok: false, error: 'Créneau invalide (journée, matin ou après-midi).' };

  const ecole_uai = sanitizeText(body.ecole_uai, 20);
  const ecole_nom = sanitizeText(body.ecole_nom, 200);
  if (!ecole_uai || !ecole_nom) return { ok: false, error: 'École manquante.' };

  const enseignants = sanitizeEnseignants(body.enseignants);
  if (enseignants.length === 0) return { ok: false, error: 'Enseignant remplacé manquant.' };

  return { ok: true, data: { tr_id, date_debut, date_fin, plage, ecole_uai, ecole_nom, enseignants } };
}

// Deux plages entrent-elles en conflit sur un même jour ?
// 'journee' bloque tout ; 'matin' et 'apres-midi' peuvent coexister.
function plagesEnConflit(a: Plage, b: Plage): boolean {
  return a === 'journee' || b === 'journee' || a === b;
}

/**
 * Vérifie qu'aucun autre remplacement du même TR ne chevauche la plage
 * demandée. Renvoie le remplacement en conflit, ou null.
 */
async function chercherConflit(
  data: Payload,
  excludeId: string | null
): Promise<{ conflit: any | null; error: string | null }> {
  let query = supabase
    .from('remplacements')
    .select('*')
    .eq('tr_id', data.tr_id)
    .lte('date_debut', data.date_fin)
    .gte('date_fin', data.date_debut);
  if (excludeId) query = query.neq('id', excludeId);

  const { data: candidats, error } = await query;
  if (error) return { conflit: null, error: error.message };

  const conflit = (candidats || []).find((c: any) => plagesEnConflit(c.plage, data.plage));
  return { conflit: conflit || null, error: null };
}

// GET : liste complète, triée par date de début.
export async function GET() {
  try {
    if (!isSupabaseConfigured()) return NextResponse.json([]);

    const { data, error } = await supabase
      .from('remplacements')
      .select('*')
      .order('date_debut', { ascending: true });

    if (error) {
      console.error('Supabase error listing remplacements:', error);
      return NextResponse.json([]);
    }
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error('GET remplacements error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

// POST : créer un remplacement.
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ message: 'Supabase non configuré côté serveur.' }, { status: 503 });
    }

    const body = await request.json();
    const v = validate(body);
    if (!v.ok) return NextResponse.json({ message: v.error }, { status: 400 });

    const { conflit, error: errConflit } = await chercherConflit(v.data, null);
    if (errConflit) {
      console.error('Supabase error checking conflict:', errConflit);
      return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
    }
    if (conflit) {
      return NextResponse.json(
        {
          message: `Ce TR a déjà un remplacement du ${conflit.date_debut} au ${conflit.date_fin} (${conflit.ecole_nom}) sur ce créneau.`,
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('remplacements')
      .insert({ ...v.data, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert remplacement error:', error);
      return NextResponse.json({ message: 'Enregistrement impossible.', detail: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error('POST remplacements error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT : éditer un remplacement. Body : { id, ...payload }
export async function PUT(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ message: 'Supabase non configuré côté serveur.' }, { status: 503 });
    }

    const body = await request.json();
    const id = sanitizeText(body?.id, 64);
    if (!id) return NextResponse.json({ message: 'Identifiant manquant.' }, { status: 400 });

    const v = validate(body);
    if (!v.ok) return NextResponse.json({ message: v.error }, { status: 400 });

    const { conflit, error: errConflit } = await chercherConflit(v.data, id);
    if (errConflit) {
      console.error('Supabase error checking conflict:', errConflit);
      return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
    }
    if (conflit) {
      return NextResponse.json(
        {
          message: `Ce TR a déjà un remplacement du ${conflit.date_debut} au ${conflit.date_fin} (${conflit.ecole_nom}) sur ce créneau.`,
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from('remplacements')
      .update({ ...v.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update remplacement error:', error);
      return NextResponse.json({ message: 'Modification impossible.', detail: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error('PUT remplacements error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE ?id= : supprimer un remplacement.
export async function DELETE(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ message: 'Supabase non configuré côté serveur.' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'Identifiant manquant.' }, { status: 400 });

    const { error } = await supabase.from('remplacements').delete().eq('id', id);

    if (error) {
      console.error('Supabase delete remplacement error:', error);
      return NextResponse.json({ message: 'Suppression impossible.', detail: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE remplacements error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
