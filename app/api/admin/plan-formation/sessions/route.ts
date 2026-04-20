import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function isAdmin(request: NextRequest) {
  return request.headers.get('x-user-role') === 'admin';
}

const VALID_MODALITES = ['presentiel', 'distanciel', 'observation'];

export async function GET(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const formationId = searchParams.get('formation_id');
  let q = supabase.from('plan_formation_sessions').select('*').order('ordre', { ascending: true });
  if (formationId) q = q.eq('formation_id', formationId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  try {
    const body = await request.json();
    const { formationId, date, dateLibre, dureeH, lieu, modalite, description, fait, ordre } = body;
    if (!formationId) return NextResponse.json({ error: 'formationId requis' }, { status: 400 });
    const mod = VALID_MODALITES.includes(modalite) ? modalite : 'presentiel';

    const { data, error } = await supabase
      .from('plan_formation_sessions')
      .insert({
        formation_id: formationId,
        date_session: date || null,
        date_libre: dateLibre?.trim() || null,
        duree_h: dureeH != null && dureeH !== '' ? Number(dureeH) : null,
        lieu: lieu?.trim() || null,
        modalite: mod,
        description: description?.trim() || null,
        fait: !!fait,
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
    const { id, date, dateLibre, dureeH, lieu, modalite, description, fait, ordre } = body;
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 });

    const updates: any = { updated_at: new Date().toISOString() };
    if (date !== undefined) updates.date_session = date || null;
    if (dateLibre !== undefined) updates.date_libre = dateLibre?.trim() || null;
    if (dureeH !== undefined) updates.duree_h = dureeH != null && dureeH !== '' ? Number(dureeH) : null;
    if (lieu !== undefined) updates.lieu = lieu?.trim() || null;
    if (modalite !== undefined) {
      if (!VALID_MODALITES.includes(modalite)) return NextResponse.json({ error: 'modalite invalide' }, { status: 400 });
      updates.modalite = modalite;
    }
    if (description !== undefined) updates.description = description?.trim() || null;
    if (fait !== undefined) updates.fait = !!fait;
    if (ordre !== undefined) updates.ordre = Number(ordre);

    const { data, error } = await supabase
      .from('plan_formation_sessions')
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
    const { error } = await supabase.from('plan_formation_sessions').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
