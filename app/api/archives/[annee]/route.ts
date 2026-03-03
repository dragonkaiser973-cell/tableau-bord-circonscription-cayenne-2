import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET une archive spécifique par année
export async function GET(
  request: NextRequest,
  { params }: { params: { annee: string } }
) {
  try {
    const annee = params.annee;

    console.log(`📖 Chargement archive: ${annee}`);

    const { data, error } = await supabase
      .from('archives')
      .select('*')
      .eq('annee_scolaire', annee)
      .single();

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Archive non trouvée' }, { status: 404 });
    }

    console.log(`✅ Archive trouvée: ${data.annee_scolaire}`);

    // Retourner l'archive complète avec la structure attendue
    return NextResponse.json({
      anneeScolaire: data.annee_scolaire,
      dateArchivage: data.date_creation,
      version: data.version || '3.0',
      metadata: data.metadata || {},
      donnees_brutes: data.donnees_brutes || {},
      donnees_calculees: data.donnees_calculees || {}
    });

  } catch (error: any) {
    console.error('Erreur lecture archive:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
