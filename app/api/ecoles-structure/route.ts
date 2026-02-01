import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json([]);
    }

    const { data, error } = await supabase
      .from('ecoles_structure')
      .select('*')
      .order('uai', { ascending: true });

    if (error) {
      console.error('Supabase error fetching ecoles_structure:', error);
      return NextResponse.json([]);
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Erreur lecture ecoles_structure:', error);
    return NextResponse.json([]);
  }
}
