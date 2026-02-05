import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    const { error } = await supabase.from('stagiaires_m2').delete().neq('id', 0);
    
    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Stagiaires M2 réinitialisés'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
