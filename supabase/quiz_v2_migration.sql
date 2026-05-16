-- Migration V2 — ajoute le type 'classement' et le stockage de l'ordre choisi.
-- À exécuter une fois après quiz_schema.sql, dans l'éditeur SQL Supabase.

-- 1) Élargir la liste des types de questions autorisés
alter table quiz_questions drop constraint if exists quiz_questions_type_check;
alter table quiz_questions add constraint quiz_questions_type_check
  check (type in ('qcm','vrai_faux','classement'));

-- 2) Stocker l'ordre choisi par le participant pour les questions de classement
--    (un tableau JSON d'IDs de quiz_choix, dans l'ordre où le participant les a placés)
alter table quiz_reponses add column if not exists ordre_choisi jsonb;

-- Note : pour les questions de type 'classement', les items sont stockés dans
-- quiz_choix avec quiz_choix.ordre représentant la POSITION CORRECTE.
-- La colonne quiz_choix.est_correct n'est pas utilisée dans ce mode.
-- Le scoring serveur attribue 25 % des points par item à sa bonne position.
