import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { creerArchiveComplete } from '@/lib/archives';

// ====================================================================
// GET - Liste toutes les archives OU récupère une archive spécifique
// ====================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const annee = searchParams.get('annee');

    // CAS 1 : Récupérer une archive spécifique
    if (annee) {
      console.log(`📖 Chargement archive: ${annee}`);

      const { data, error } = await supabase
        .from('archives')
        .select('*')
        .eq('annee_scolaire', annee)
        .single();

      if (error || !data) {
        console.error('Erreur Supabase:', error);
        return NextResponse.json({ error: 'Archive non trouvée' }, { status: 404 });
      }

      console.log(`✅ Archive trouvée: ${data.annee_scolaire}`);

      return NextResponse.json({
        anneeScolaire: data.annee_scolaire,
        dateArchivage: data.date_creation,
        version: data.version || '3.0',
        metadata: data.metadata || {},
        donnees_brutes: data.donnees_brutes || {},
        donnees_calculees: data.donnees_calculees || {}
      });
    }

    // CAS 2 : Lister toutes les archives
    const { data, error } = await supabase
      .from('archives')
      .select('annee_scolaire, date_creation, metadata')
      .order('annee_scolaire', { ascending: false });

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json({ archives: [] });
    }

    return NextResponse.json({
      archives: data?.map(a => a.annee_scolaire) || []
    });
  } catch (error) {
    console.error('Erreur lecture archives:', error);
    return NextResponse.json({ archives: [] });
  }
}

// ====================================================================
// POST - Crée une nouvelle archive complète depuis Supabase (admin)
// La logique est déléguée à lib/archives afin d'être réutilisable
// directement par /api/changer-annee sans appel HTTP interne.
// ====================================================================
export async function POST(request: NextRequest) {
  try {
    const { anneeScolaire } = await request.json();

    if (!anneeScolaire) {
      return NextResponse.json({ error: 'Année scolaire manquante' }, { status: 400 });
    }

    const resultat = await creerArchiveComplete(anneeScolaire, request.nextUrl.origin);

    if (!resultat.success) {
      return NextResponse.json({ error: resultat.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Archive créée pour l'année ${resultat.anneeScolaire}`,
      anneeScolaire: resultat.anneeScolaire,
      metadata: resultat.metadata,
      taille: resultat.taille
    });
  } catch (error: any) {
    console.error('❌ Erreur création archive:', error);
    return NextResponse.json({
      error: error.message || 'Erreur lors de la création de l\'archive'
    }, { status: 500 });
  }
}

// ====================================================================
// DELETE - Supprimer une archive depuis Supabase (admin)
// ====================================================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const anneeScolaire = searchParams.get('annee');

    if (!anneeScolaire) {
      return NextResponse.json({ error: 'Année scolaire manquante' }, { status: 400 });
    }

    const { error } = await supabase
      .from('archives')
      .delete()
      .eq('annee_scolaire', anneeScolaire);

    if (error) {
      console.error('Erreur suppression:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erreur suppression archive:', error);
    return NextResponse.json({
      error: error.message || 'Erreur lors de la suppression'
    }, { status: 500 });
  }
}
