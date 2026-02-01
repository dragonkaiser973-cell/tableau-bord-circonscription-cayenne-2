import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Supabase non configuré'
        },
        { status: 500 }
      );
    }

    let deletedCount = 0;
    const errors: string[] = [];

    // Supprimer les enseignants
    try {
      const { error } = await supabase.from('enseignants').delete().neq('id', 0);
      if (error) {
        errors.push(`Enseignants: ${error.message}`);
      } else {
        deletedCount++;
      }
    } catch (e: any) {
      errors.push(`Enseignants: ${e.message}`);
    }

    // Supprimer les évaluations
    try {
      const { error } = await supabase.from('evaluations').delete().neq('id', 0);
      if (error) {
        errors.push(`Évaluations: ${error.message}`);
      } else {
        deletedCount++;
      }
    } catch (e: any) {
      errors.push(`Évaluations: ${e.message}`);
    }

    // Supprimer les effectifs
    try {
      const { error } = await supabase.from('effectifs').delete().neq('id', 0);
      if (error) {
        errors.push(`Effectifs: ${error.message}`);
      } else {
        deletedCount++;
      }
    } catch (e: any) {
      errors.push(`Effectifs: ${e.message}`);
    }

    // Supprimer les écoles identite
    try {
      const { error } = await supabase.from('ecoles_identite').delete().neq('id', 0);
      if (error) {
        errors.push(`Écoles identité: ${error.message}`);
      } else {
        deletedCount++;
      }
    } catch (e: any) {
      errors.push(`Écoles identité: ${e.message}`);
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        message: `⚠️ Réinitialisation partielle : ${deletedCount} tables vidées, ${errors.length} erreurs`,
        details: errors.join(', ')
      }, { status: 207 }); // 207 = Multi-Status
    }

    return NextResponse.json({
      success: true,
      message: `✅ Réinitialisation réussie`,
      details: `${deletedCount} tables vidées`
    });

  } catch (error: any) {
    console.error('Erreur lors de la réinitialisation:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Erreur lors de la réinitialisation',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
