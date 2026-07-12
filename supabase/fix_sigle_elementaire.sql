-- ============================================================================
-- CORRECTIF : sigle des écoles élémentaires
-- ============================================================================
-- Contexte : à l'import, le sigle était calculé à partir du champ « type ».
-- Le test ignorait les accents ; or le type officiel est « Élémentaire publique ».
-- Résultat : les 6 écoles élémentaires ont reçu le sigle fallback « E.PU »
-- au lieu de « E.E.PU ». Conséquences :
--   • page Circonscription : « 0 élém. » au lieu de 6 ;
--   • pages Enseignants / Évaluations : sigle tronqué « E.PU … ».
--
-- Le code est désormais corrigé (import dé-accentué + classement basé sur `type`),
-- mais les 6 lignes DÉJÀ en base gardent l'ancien sigle. Ce script les corrige.
--
-- À exécuter UNE FOIS dans l'éditeur SQL de Supabase. Idempotent (relançable).
-- ============================================================================

update ecoles_identite
set sigle = 'E.E.PU',
    updated_at = now()
where sigle = 'E.PU'
  and type ilike '%lémentaire%';   -- « Élémentaire publique » (é accentué inclus)

-- Vérification : devrait afficher les 6 écoles élémentaires avec sigle E.E.PU
-- select nom, type, sigle from ecoles_identite where type ilike '%lémentaire%' order by nom;
