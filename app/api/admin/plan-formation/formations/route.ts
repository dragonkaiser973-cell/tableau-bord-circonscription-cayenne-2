import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function isAdmin(request: NextRequest) {
  return request.headers.get('x-user-role') === 'admin';
}

const VALID_TYPES = [
  'plan_maths', 'plan_francais', 'plan_lecture',
  'anim_ped', 'plan_laicite', 'plan_phare',
  'anglais', 'savoir_rouler', 'autre',
];
const VALID_STATUTS = ['prevu', 'en_cours', 'termine', 'annule'];

function sanitizeFormateurs(input: any): any[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((g: any) => ({
      label: typeof g?.label === 'string' && g.label.trim() ? g.label.trim() : undefined,
      membres: Array.isArray(g?.membres)
        ? g.membres
            .map((m: any) => ({ raccourci: String(m?.raccourci || '').trim() }))
            .filter((m: any) => m.raccourci.length > 0)
        : [],
    }))
    .filter((g: any) => g.membres.length > 0);
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const annee = searchParams.get('annee') || '2025-2026';
  const { data, error } = await supabase
    .from('plan_formation')
    .select('*')
    .eq('annee_scolaire', annee)
    .order('ordre', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  try {
    const body = await request.json();
    const { anneeScolaire, cycle, niveaux, titre, dureeH, type, piloteSofia, formateurs, statut, notes, ordre } = body;
    if (!titre || !titre.trim()) return NextResponse.json({ error: 'titre requis' }, { status: 400 });
    if (![1, 2, 3].includes(Number(cycle))) return NextResponse.json({ error: 'cycle invalide' }, { status: 400 });
    if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: 'type invalide' }, { status: 400 });

    const { data, error } = await supabase
      .from('plan_formation')
      .insert({
        annee_scolaire: anneeScolaire || '2025-2026',
        cycle: Number(cycle),
        niveaux: Array.isArray(niveaux) ? niveaux : [],
        titre: titre.trim(),
        duree_h: Number.isFinite(Number(dureeH)) ? Number(dureeH) : 0,
        type,
        pilote_sofia: piloteSofia?.trim() || null,
        formateurs: sanitizeFormateurs(formateurs),
        statut: VALID_STATUTS.includes(statut) ? statut : 'prevu',
        notes: notes?.trim() || null,
        ordre: Number.isFinite(Number(ordre)) ? Number(ordre) : 0,
      })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  try {
    const body = await request.json();
    const { id, cycle, niveaux, titre, dureeH, type, piloteSofia, formateurs, statut, valideAdmin, notes, ordre } = body;
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

    const updates: any = { updated_at: new Date().toISOString() };
    if (cycle !== undefined) {
      if (![1, 2, 3].includes(Number(cycle))) return NextResponse.json({ error: 'cycle invalide' }, { status: 400 });
      updates.cycle = Number(cycle);
    }
    if (niveaux !== undefined) updates.niveaux = Array.isArray(niveaux) ? niveaux : [];
    if (titre !== undefined) updates.titre = String(titre).trim();
    if (dureeH !== undefined) updates.duree_h = Number(dureeH);
    if (type !== undefined) {
      if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: 'type invalide' }, { status: 400 });
      updates.type = type;
    }
    if (piloteSofia !== undefined) updates.pilote_sofia = piloteSofia?.trim() || null;
    if (formateurs !== undefined) updates.formateurs = sanitizeFormateurs(formateurs);
    if (statut !== undefined) {
      if (!VALID_STATUTS.includes(statut)) return NextResponse.json({ error: 'statut invalide' }, { status: 400 });
      updates.statut = statut;
    }
    if (valideAdmin !== undefined) updates.valide_admin = !!valideAdmin;
    if (notes !== undefined) updates.notes = notes?.trim() || null;
    if (ordre !== undefined) updates.ordre = Number(ordre);

    const { data, error } = await supabase
      .from('plan_formation')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });
    const { error } = await supabase.from('plan_formation').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
