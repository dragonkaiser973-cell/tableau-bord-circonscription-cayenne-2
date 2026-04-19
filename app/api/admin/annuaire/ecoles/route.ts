import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function isAdmin(request: NextRequest) {
  return request.headers.get('x-user-role') === 'admin';
}

const VALID_TYPES = ['EEPU', 'EMPU', 'EEPR', 'GS'];

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  const { data, error } = await supabase
    .from('annuaire_ecoles')
    .select('*')
    .order('ordre', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  try {
    const body = await request.json();
    const { name, type, ordre } = body;
    if (!name) return NextResponse.json({ error: 'name requis' }, { status: 400 });
    if (type && !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'type invalide' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('annuaire_ecoles')
      .insert({
        name,
        type: type || null,
        ordre: Number.isFinite(ordre) ? ordre : 0,
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
    const { id, name, type, ordre } = body;
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });
    if (type && !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'type invalide' }, { status: 400 });
    }
    const updates: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type || null;
    if (ordre !== undefined) updates.ordre = ordre;
    const { data, error } = await supabase
      .from('annuaire_ecoles')
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
    const { error } = await supabase.from('annuaire_ecoles').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
