import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET — Détail d'une session avec tous ses dépôts
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const { data: session, error } = await supabase
    .from('boussole_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  }

  if (session.created_by !== username && request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { data: deposits } = await supabase
    .from('boussole_deposits')
    .select('*')
    .eq('session_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ ...session, deposits: deposits || [] });
}

// PATCH — Met à jour les métadonnées ou le statut
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const { data: session } = await supabase
    .from('boussole_sessions')
    .select('created_by')
    .eq('id', id)
    .single();

  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  if (session.created_by !== username && request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.titre === 'string') updates.titre = body.titre.trim();
  if (typeof body.description === 'string') updates.description = body.description.trim() || null;
  if (typeof body.date_formation === 'string') updates.date_formation = body.date_formation;
  if (body.statut === 'en_cours' || body.statut === 'terminee') updates.statut = body.statut;

  const { data, error } = await supabase
    .from('boussole_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — Supprime une session et tous ses dépôts (cascade)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const { data: session } = await supabase
    .from('boussole_sessions')
    .select('created_by')
    .eq('id', id)
    .single();

  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  if (session.created_by !== username && request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { error } = await supabase.from('boussole_sessions').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
