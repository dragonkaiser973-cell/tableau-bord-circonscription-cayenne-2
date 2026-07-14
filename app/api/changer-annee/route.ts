import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { creerArchiveComplete } from '@/lib/archives';

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
      // ⚠️ SÉCURITÉ : l'archive doit réussir AVANT toute purge. Sans elle, vider
      // les tables (étape 3) entraînerait une perte de données IRRÉVERSIBLE.
      // On abandonne donc le changement d'année si l'archivage échoue.
      try {
        // Appel DIRECT de la logique d'archivage (pas de fetch HTTP interne) :
        // /api/changer-annee est déjà réservé aux admins par le middleware, et
        // /api/archives est désormais protégé — un fetch sans jeton échouerait.
        const resultat = await creerArchiveComplete(ancienneAnnee, request.nextUrl.origin);
        archive_creee = resultat.success;
        if (!archive_creee) {
          const detail = (resultat as any).error || 'erreur inconnue';
          console.error('❌ Archivage échoué → changement d\'année ABANDONNÉ:', detail);
          return NextResponse.json({
            success: false,
            message: `Archivage de ${ancienneAnnee} échoué : ${detail}. Aucune donnée n'a été supprimée.`
          }, { status: 500 });
        }
      } catch (error: any) {
        console.error('❌ Erreur création archive → changement d\'année ABANDONNÉ:', error);
        return NextResponse.json({
          success: false,
          message: `Erreur lors de l'archivage de ${ancienneAnnee} : ${error?.message || error}. Aucune donnée n'a été supprimée.`
        }, { status: 500 });
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
      'effectifs',
      'boussole_deposits',
      'boussole_sessions',
      'plan_formation_sessions',
      'plan_formation',
      // Outils directeurs (prévision de structure + répartition 108h) : on vide
      // la fiche publiée ET son historique de versions pour repartir à zéro.
      // Les fiches publiées ont déjà été archivées à l'étape 2 (donnees_brutes).
      'previsions_structure_versions',
      'previsions_structure',
      'repartition_108h_versions',
      'repartition_108h'
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
