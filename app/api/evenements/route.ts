import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Récupérer tous les événements
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('evenements')
      .select('*')
      .order('date_debut', { ascending: true });

    if (error) throw error;

    // Adapter le format snake_case Supabase → camelCase attendu par la page
    const evenements = (data || []).map((e: any) => ({
      id: e.id,
      titre: e.titre,
      type: e.type,
      dateDebut: e.date_debut,
      dateFin: e.date_fin,
      lieu: e.lieu || ''
    }));

    return NextResponse.json(evenements);
  } catch (error: any) {
    console.error('Erreur lecture événements:', error);
    return NextResponse.json({ error: 'Erreur lors de la lecture des événements' }, { status: 500 });
  }
}

// POST - Créer un événement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { titre, type, dateDebut, dateFin, lieu } = body;

    if (!titre || !type || !dateDebut) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('evenements')
      .insert({
        titre,
        type,
        date_debut: dateDebut,
        date_fin: dateFin || dateDebut,
        lieu: lieu || '',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Retourner au format camelCase
    return NextResponse.json({
      success: true,
      event: {
        id: data.id,
        titre: data.titre,
        type: data.type,
        dateDebut: data.date_debut,
        dateFin: data.date_fin,
        lieu: data.lieu || ''
      }
    });
  } catch (error: any) {
    console.error('Erreur création événement:', error);
    return NextResponse.json({ error: `Erreur lors de la création: ${error.message}` }, { status: 500 });
  }
}

// DELETE - Supprimer un événement
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }

    const { error } = await supabase
      .from('evenements')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erreur suppression événement:', error);
    return NextResponse.json({ error: `Erreur lors de la suppression: ${error.message}` }, { status: 500 });
  }
}

// PUT - Modifier un événement
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, titre, type, dateDebut, dateFin, lieu } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('evenements')
      .update({
        titre,
        type,
        date_debut: dateDebut,
        date_fin: dateFin || dateDebut,
        lieu: lieu || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      event: {
        id: data.id,
        titre: data.titre,
        type: data.type,
        dateDebut: data.date_debut,
        dateFin: data.date_fin,
        lieu: data.lieu || ''
      }
    });
  } catch (error: any) {
    console.error('Erreur modification événement:', error);
    return NextResponse.json({ error: `Erreur lors de la modification: ${error.message}` }, { status: 500 });
  }
}
