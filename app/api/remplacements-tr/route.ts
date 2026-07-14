import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─── /api/remplacements-tr : liste des Titulaires Remplaçants ────────────────
// Lecture publique (GET), écriture réservée aux utilisateurs authentifiés
// (middleware.ts — PUBLIC_READ_AUTH_WRITE). La liste est gérée par la
// secrétaire depuis /remplacements.

function sanitizeText(v: unknown, max = 200): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

// GET : liste triée par ordre puis nom.
export async function GET() {
  try {
    if (!isSupabaseConfigured()) return NextResponse.json([]);

    const { data, error } = await supabase
      .from('remplacements_tr')
      .select('*')
      .order('ordre', { ascending: true })
      .order('nom', { ascending: true });

    if (error) {
      console.error('Supabase error listing remplacements_tr:', error);
      return NextResponse.json([]);
    }
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error('GET remplacements-tr error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

// POST : ajouter un TR. Body : { nom, ordre? }
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ message: 'Supabase non configuré côté serveur.' }, { status: 503 });
    }

    const body = await request.json();
    const nom = sanitizeText(body?.nom);
    if (!nom) return NextResponse.json({ message: 'Nom du TR manquant.' }, { status: 400 });

    const ordre = Number.isFinite(Number(body?.ordre)) ? Math.floor(Number(body.ordre)) : 0;

    const { data, error } = await supabase
      .from('remplacements_tr')
      .insert({ nom, ordre })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert remplacements_tr error:', error);
      return NextResponse.json({ message: 'Ajout impossible.', detail: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error('POST remplacements-tr error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT : renommer / réordonner. Body : { id, nom?, ordre? }
export async function PUT(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ message: 'Supabase non configuré côté serveur.' }, { status: 503 });
    }

    const body = await request.json();
    const id = sanitizeText(body?.id, 64);
    if (!id) return NextResponse.json({ message: 'Identifiant manquant.' }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (body?.nom !== undefined) {
      const nom = sanitizeText(body.nom);
      if (!nom) return NextResponse.json({ message: 'Nom du TR invalide.' }, { status: 400 });
      updates.nom = nom;
    }
    if (body?.ordre !== undefined && Number.isFinite(Number(body.ordre))) {
      updates.ordre = Math.floor(Number(body.ordre));
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: 'Aucune modification.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('remplacements_tr')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update remplacements_tr error:', error);
      return NextResponse.json({ message: 'Modification impossible.', detail: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error('PUT remplacements-tr error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE ?id= : supprimer un TR (et ses remplacements, via on delete cascade).
export async function DELETE(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ message: 'Supabase non configuré côté serveur.' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ message: 'Identifiant manquant.' }, { status: 400 });

    const { error } = await supabase.from('remplacements_tr').delete().eq('id', id);

    if (error) {
      console.error('Supabase delete remplacements_tr error:', error);
      return NextResponse.json({ message: 'Suppression impossible.', detail: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('DELETE remplacements-tr error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
