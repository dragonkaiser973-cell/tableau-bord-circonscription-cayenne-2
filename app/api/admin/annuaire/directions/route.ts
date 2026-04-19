import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function isAdmin(request: NextRequest) {
  return request.headers.get('x-user-role') === 'admin';
}

function sanitizeTels(tels: any): any[] {
  if (!Array.isArray(tels)) return [];
  return tels
    .map((t: any) => ({
      type: t?.type === 'mobile' ? 'mobile' : 'fixe',
      number: String(t?.number || '').trim(),
    }))
    .filter(t => t.number.length > 0);
}

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const ecoleId = searchParams.get('ecole_id');
  let query = supabase.from('annuaire_directions').select('*').order('ordre', { ascending: true });
  if (ecoleId) query = query.eq('ecole_id', ecoleId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  try {
    const body = await request.json();
    const { ecole_id, name, role, email, tels, ordre } = body;
    if (!ecole_id || !name) {
      return NextResponse.json({ error: 'ecole_id et name requis' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('annuaire_directions')
      .insert({
        ecole_id,
        name,
        role: role || null,
        email: email || null,
        tels: sanitizeTels(tels),
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
    const { id, ecole_id, name, role, email, tels, ordre } = body;
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });
    const updates: any = { updated_at: new Date().toISOString() };
    if (ecole_id !== undefined) updates.ecole_id = ecole_id;
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role || null;
    if (email !== undefined) updates.email = email || null;
    if (tels !== undefined) updates.tels = sanitizeTels(tels);
    if (ordre !== undefined) updates.ordre = ordre;
    const { data, error } = await supabase
      .from('annuaire_directions')
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
    const { error } = await supabase.from('annuaire_directions').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
