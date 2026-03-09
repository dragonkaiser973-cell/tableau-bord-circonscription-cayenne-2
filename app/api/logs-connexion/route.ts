import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET — Récupérer les logs de connexion (50 derniers)
export async function GET(request: NextRequest) {
  const { data, error } = await supabase
    .from('logs_connexion')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
