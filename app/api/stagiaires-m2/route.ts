import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json([], { status: 200 });
    }

    const { data, error } = await supabase
      .from('stagiaires_m2')
      .select('*')
      .order('nom', { ascending: true });

    if (error) {
      console.error('Erreur Supabase stagiaires_m2:', error);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Erreur lecture stagiaires_m2:', error);
    return NextResponse.json([], { status: 200 });
  }
}
