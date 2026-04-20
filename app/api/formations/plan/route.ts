import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET — Plan de formation publique pour une année donnée (défaut : 2025-2026)
// Agrège formations + sessions + référentiel formateurs
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const annee = searchParams.get('annee') || '2025-2026';

  const [resFormations, resSessions, resFormateurs] = await Promise.all([
    supabase
      .from('plan_formation')
      .select('*')
      .eq('annee_scolaire', annee)
      .order('ordre', { ascending: true }),
    supabase
      .from('plan_formation_sessions')
      .select('*')
      .order('ordre', { ascending: true }),
    supabase
      .from('plan_formation_formateurs')
      .select('*')
      .order('ordre', { ascending: true }),
  ]);

  if (resFormations.error) return NextResponse.json({ error: resFormations.error.message }, { status: 500 });
  if (resSessions.error)   return NextResponse.json({ error: resSessions.error.message },   { status: 500 });
  if (resFormateurs.error) return NextResponse.json({ error: resFormateurs.error.message }, { status: 500 });

  const formations = (resFormations.data || []).map((f: any) => ({
    id: f.id,
    anneeScolaire: f.annee_scolaire,
    cycle: f.cycle,
    niveaux: f.niveaux || [],
    titre: f.titre,
    dureeH: Number(f.duree_h),
    type: f.type,
    piloteSofia: f.pilote_sofia,
    formateurs: f.formateurs || [],
    statut: f.statut,
    valideAdmin: f.valide_admin,
    notes: f.notes,
    ordre: f.ordre,
    sessions: (resSessions.data || [])
      .filter((s: any) => s.formation_id === f.id)
      .map((s: any) => ({
        id: s.id,
        date: s.date_session,
        dateLibre: s.date_libre,
        dureeH: s.duree_h != null ? Number(s.duree_h) : null,
        lieu: s.lieu,
        modalite: s.modalite,
        description: s.description,
        fait: s.fait,
        ordre: s.ordre,
      })),
  }));

  const formateurs = (resFormateurs.data || []).map((f: any) => ({
    id: f.id,
    raccourci: f.raccourci,
    nomComplet: f.nom_complet,
    statut: f.statut,
    ordre: f.ordre,
  }));

  return NextResponse.json({ annee, formations, formateurs });
}
