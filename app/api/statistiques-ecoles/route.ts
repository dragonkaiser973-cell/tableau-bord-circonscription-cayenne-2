import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json([]);
    }

    const { data, error } = await supabase
      .from('statistiques_ecoles')
      .select('*')
      .order('nom', { ascending: true });

    if (error) {
      console.error('Supabase error fetching statistiques_ecoles:', error);
      return NextResponse.json([]);
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Erreur lecture statistiques_ecoles:', error);
    return NextResponse.json([]);
  }
}
