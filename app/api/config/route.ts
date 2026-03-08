import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DEFAULT_CONFIG = {
  annee_scolaire_actuelle: '2025-2026',
  historique_effectifs: [
    { annee: '2022-2023', effectif: 0 },
    { annee: '2023-2024', effectif: 0 },
    { annee: '2024-2025', effectif: 0 }
  ],
  date_derniere_maj: new Date().toISOString().split('T')[0]
};

// GET - Récupérer la configuration
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('config')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) {
      // Créer la config par défaut si absente
      await supabase.from('config').upsert({ id: 1, ...DEFAULT_CONFIG });
      return NextResponse.json(DEFAULT_CONFIG);
    }

    return NextResponse.json({
      annee_scolaire_actuelle: data.annee_scolaire_actuelle,
      historique_effectifs: data.historique_effectifs || [],
      date_derniere_maj: data.date_derniere_maj
    });
  } catch (error) {
    console.error('Erreur lecture config:', error);
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

// PUT - Mettre à jour la configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    body.date_derniere_maj = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('config')
      .upsert({ id: 1, ...body });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Configuration mise à jour',
      config: body
    });
  } catch (error: any) {
    console.error('Erreur mise à jour config:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
