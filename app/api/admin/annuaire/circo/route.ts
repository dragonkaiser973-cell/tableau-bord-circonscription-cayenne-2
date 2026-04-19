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
  const { data, error } = await supabase
    .from('annuaire_circo')
    .select('*')
    .order('ordre', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  try {
    const body = await request.json();
    const { role, role_long, name, email, tels, accent, icon_key, ordre } = body;
    if (!role || !role_long || !name) {
      return NextResponse.json({ error: 'role, role_long et name sont obligatoires' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('annuaire_circo')
      .insert({
        role,
        role_long,
        name,
        email: email || null,
        tels: sanitizeTels(tels),
        accent: accent || 'from-slate-400 to-slate-500',
        icon_key: icon_key || 'folder',
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
    const { id, role, role_long, name, email, tels, accent, icon_key, ordre } = body;
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });
    const updates: any = { updated_at: new Date().toISOString() };
    if (role !== undefined) updates.role = role;
    if (role_long !== undefined) updates.role_long = role_long;
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email || null;
    if (tels !== undefined) updates.tels = sanitizeTels(tels);
    if (accent !== undefined) updates.accent = accent;
    if (icon_key !== undefined) updates.icon_key = icon_key;
    if (ordre !== undefined) updates.ordre = ordre;
    const { data, error } = await supabase
      .from('annuaire_circo')
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
    const { error } = await supabase.from('annuaire_circo').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
