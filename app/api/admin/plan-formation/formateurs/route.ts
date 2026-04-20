import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function isAdmin(request: NextRequest) {
  return request.headers.get('x-user-role') === 'admin';
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  const { data, error } = await supabase
    .from('plan_formation_formateurs')
    .select('*')
    .order('ordre', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  try {
    const body = await request.json();
    const { raccourci, nomComplet, statut, ordre } = body;
    if (!raccourci?.trim()) return NextResponse.json({ error: 'raccourci requis' }, { status: 400 });
    if (!nomComplet?.trim()) return NextResponse.json({ error: 'nomComplet requis' }, { status: 400 });
    if (!statut?.trim()) return NextResponse.json({ error: 'statut requis' }, { status: 400 });

    const { data, error } = await supabase
      .from('plan_formation_formateurs')
      .insert({
        raccourci: raccourci.trim(),
        nom_complet: nomComplet.trim(),
        statut: statut.trim(),
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
    const { id, raccourci, nomComplet, statut, ordre } = body;
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

    const updates: any = { updated_at: new Date().toISOString() };
    if (raccourci !== undefined) updates.raccourci = String(raccourci).trim();
    if (nomComplet !== undefined) updates.nom_complet = String(nomComplet).trim();
    if (statut !== undefined) updates.statut = String(statut).trim();
    if (ordre !== undefined) updates.ordre = Number(ordre);

    const { data, error } = await supabase
      .from('plan_formation_formateurs')
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
    const { error } = await supabase.from('plan_formation_formateurs').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
