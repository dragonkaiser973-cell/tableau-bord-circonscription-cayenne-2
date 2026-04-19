import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const [{ data: circo, error: errCirco }, { data: ecoles, error: errEcoles }, { data: directions, error: errDir }] =
      await Promise.all([
        supabase.from('annuaire_circo').select('*').order('ordre', { ascending: true }),
        supabase.from('annuaire_ecoles').select('*').order('ordre', { ascending: true }),
        supabase.from('annuaire_directions').select('*').order('ordre', { ascending: true }),
      ]);

    if (errCirco) throw errCirco;
    if (errEcoles) throw errEcoles;
    if (errDir) throw errDir;

    const ecolesWithDirs = (ecoles || []).map((e: any) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      ordre: e.ordre,
      directors: (directions || [])
        .filter((d: any) => d.ecole_id === e.id)
        .map((d: any) => ({
          id: d.id,
          name: d.name,
          role: d.role,
          email: d.email,
          tels: d.tels || [],
          ordre: d.ordre,
        })),
    }));

    const circoMapped = (circo || []).map((c: any) => ({
      id: c.id,
      role: c.role,
      roleLong: c.role_long,
      name: c.name,
      email: c.email,
      tels: c.tels || [],
      accent: c.accent,
      iconKey: c.icon_key,
      ordre: c.ordre,
    }));

    return NextResponse.json({ circo: circoMapped, ecoles: ecolesWithDirs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
