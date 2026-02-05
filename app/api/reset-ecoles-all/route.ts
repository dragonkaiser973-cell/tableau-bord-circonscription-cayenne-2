import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    // Réinitialiser identité, structure et statistiques
    const promises = [
      supabase.from('ecoles_identite').delete().neq('id', 0),
      supabase.from('ecoles_structure').delete().neq('id', 0),
      supabase.from('statistiques_ecoles').delete().neq('id', 0)
    ];

    const results = await Promise.all(promises);
    
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      throw new Error(errors.map(e => e.error?.message).join(', '));
    }

    return NextResponse.json({
      success: true,
      message: 'Toutes les données écoles réinitialisées (identité + structure + statistiques)'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
