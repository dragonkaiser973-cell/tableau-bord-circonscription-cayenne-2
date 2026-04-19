import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST — Ajoute un dépôt (émoji posé sur la boussole) à une session
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const { data: session } = await supabase
    .from('boussole_sessions')
    .select('created_by, statut')
    .eq('id', id)
    .single();

  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 });
  if (session.created_by !== username && request.headers.get('x-user-role') !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const body = await request.json();
  const { phase, emoji, label, x, y } = body;

  if (phase !== 'avant' && phase !== 'apres') {
    return NextResponse.json({ error: 'Phase invalide' }, { status: 400 });
  }
  if (typeof emoji !== 'string' || !emoji.trim()) {
    return NextResponse.json({ error: 'Émoji requis' }, { status: 400 });
  }
  if (typeof x !== 'number' || typeof y !== 'number' || x < 0 || x > 100 || y < 0 || y > 100) {
    return NextResponse.json({ error: 'Coordonnées invalides (0-100)' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('boussole_deposits')
    .insert({
      session_id: id,
      phase,
      emoji,
      label: label?.toString().trim() || null,
      x,
      y,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from('boussole_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json(data, { status: 201 });
}

// PATCH — Déplace un dépôt (nouvelles coordonnées x,y) identifié par ?deposit_id=
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const depositId = new URL(request.url).searchParams.get('deposit_id');
  if (!depositId) {
    return NextResponse.json({ error: 'deposit_id requis' }, { status: 400 });
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

  const { x, y } = await request.json();
  if (typeof x !== 'number' || typeof y !== 'number' || x < 0 || x > 100 || y < 0 || y > 100) {
    return NextResponse.json({ error: 'Coordonnées invalides (0-100)' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('boussole_deposits')
    .update({ x, y })
    .eq('id', depositId)
    .eq('session_id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — Supprime un dépôt (par son id, passé en query param ?deposit_id=)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const username = request.headers.get('x-username');
  if (!username) {
    return NextResponse.json({ error: 'Utilisateur non identifié' }, { status: 401 });
  }

  const depositId = new URL(request.url).searchParams.get('deposit_id');
  if (!depositId) {
    return NextResponse.json({ error: 'deposit_id requis' }, { status: 400 });
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

  const { error } = await supabase
    .from('boussole_deposits')
    .delete()
    .eq('id', depositId)
    .eq('session_id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
