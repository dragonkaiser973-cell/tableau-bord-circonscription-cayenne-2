import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json([], { status: 200 });
    }

    const { data, error } = await supabase
      .from('ecoles_identite')
      .select('*')
      .order('nom', { ascending: true });

    if (error) {
      console.error('Erreur Supabase ecoles_identite:', error);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Erreur lecture ecoles_identite:', error);
    return NextResponse.json([], { status: 200 });
  }
}
