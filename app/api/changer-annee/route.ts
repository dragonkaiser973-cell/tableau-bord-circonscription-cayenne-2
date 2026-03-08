import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST - Changer l'année scolaire et remettre toutes les données à zéro
export async function POST(request: NextRequest) {
  try {
    const { nouvelleAnnee, effectifActuel, creerArchive } = await request.json();

    if (!nouvelleAnnee) {
      return NextResponse.json(
        { success: false, message: 'Nouvelle année manquante' },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────
    // ÉTAPE 1 : Lire la config actuelle depuis Supabase
    // ─────────────────────────────────────────────
    const { data: configData } = await supabase
      .from('config')
      .select('*')
      .eq('id', 1)
      .single();

    const ancienneAnnee = configData?.annee_scolaire_actuelle || '2025-2026';
    const historiqueActuel = configData?.historique_effectifs || [];

    console.log(`🔄 Changement d'année : ${ancienneAnnee} → ${nouvelleAnnee}`);

    // ─────────────────────────────────────────────
    // ÉTAPE 2 : Créer l'archive si demandé
    // ─────────────────────────────────────────────
    let archive_creee = false;
    if (creerArchive) {
      try {
        const archiveRes = await fetch(`${request.nextUrl.origin}/api/archives`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anneeScolaire: ancienneAnnee, auto_created: true })
        });
        archive_creee = archiveRes.ok;
        if (!archive_creee) console.warn('⚠️ Impossible de créer l\'archive automatiquement');
      } catch (error) {
        console.warn('⚠️ Erreur création archive:', error);
        // On continue même si l'archive échoue
      }
    }

    // ─────────────────────────────────────────────
    // ÉTAPE 3 : Vider toutes les tables de données
    // (sauf archives qui sont conservées)
    // ─────────────────────────────────────────────
    console.log('🗑️ Vidage des tables Supabase...');

    const tables = [
      'enseignants',
      'evaluations',
      'ecoles_identite',
      'ecoles_structure',
      'statistiques_ecoles',
      'stagiaires_m2',
      'evenements',
      'effectifs'
    ];

    const erreurs: string[] = [];

    for (const table of tables) {
      try {
        // delete().neq('id', 0) supprime toutes les lignes
        // Pour les tables avec id uuid, on utilise delete().gte('created_at', '1970-01-01')
        const { error } = await supabase
          .from(table)
          .delete()
          .gte('created_at', '1970-01-01T00:00:00.000Z');

        if (error) {
          // Fallback : essayer avec neq sur id text/uuid
          const { error: error2 } = await supabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

          if (error2) {
            erreurs.push(`${table}: ${error2.message}`);
            console.warn(`⚠️ Erreur vidage ${table}:`, error2.message);
          } else {
            console.log(`✅ Table ${table} vidée`);
          }
        } else {
          console.log(`✅ Table ${table} vidée`);
        }
      } catch (e: any) {
        erreurs.push(`${table}: ${e.message}`);
        console.warn(`⚠️ Exception vidage ${table}:`, e.message);
      }
    }

    // ─────────────────────────────────────────────
    // ÉTAPE 4 : Mettre à jour la config dans Supabase
    // ─────────────────────────────────────────────
    const nouvelHistorique = [
      ...historiqueActuel,
      { annee: ancienneAnnee, effectif: effectifActuel || 0 }
    ].slice(-5); // Garder les 5 dernières années

    const { error: configError } = await supabase
      .from('config')
      .upsert({
        id: 1,
        annee_scolaire_actuelle: nouvelleAnnee,
        historique_effectifs: nouvelHistorique,
        date_derniere_maj: new Date().toISOString().split('T')[0]
      });

    if (configError) {
      console.error('❌ Erreur mise à jour config:', configError);
      return NextResponse.json({
        success: false,
        message: `Données vidées mais erreur config: ${configError.message}`
      }, { status: 500 });
    }

    console.log(`✅ Année scolaire mise à jour : ${nouvelleAnnee}`);

    return NextResponse.json({
      success: true,
      message: `Année scolaire changée de ${ancienneAnnee} à ${nouvelleAnnee}`,
      ancienneAnnee,
      nouvelleAnnee,
      archive_creee,
      tables_videes: tables.length - erreurs.length,
      avertissements: erreurs.length > 0 ? erreurs : undefined
    });

  } catch (error: any) {
    console.error('❌ Erreur changement année:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
