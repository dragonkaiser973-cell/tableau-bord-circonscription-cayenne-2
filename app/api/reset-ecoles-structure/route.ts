import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    const { error } = await supabase.from('ecoles_structure').delete().neq('id', 0);
    
    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Structure des écoles réinitialisée'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
