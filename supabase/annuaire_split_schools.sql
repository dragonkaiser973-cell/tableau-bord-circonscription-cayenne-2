-- Migration : séparer les écoles à double direction en 2 écoles distinctes
-- (Élémentaire + Maternelle). Résultat : 18 écoles, 1 directeur par école.
-- À exécuter UNE SEULE FOIS dans l'éditeur SQL de Supabase.

begin;

-- 1. Créer les nouvelles écoles « Maternelle » (ordre temporaire, remis après)
insert into annuaire_ecoles (name, type, ordre) values
  ('Eliette Danglades Maternelle', 'EMPU', 102),
  ('Heder Maternelle',              'EMPU', 104),
  ('Gaetan Hermine Maternelle',     'EMPU', 106),
  ('Mont-Lucas Maternelle',         'EMPU', 108),
  ('Vendome Maternelle',            'EMPU', 110)
on conflict (name) do nothing;

-- 2. Rattacher les directeurs « Maternelle » aux nouvelles écoles
update annuaire_directions d
set ecole_id = (select id from annuaire_ecoles where name = 'Eliette Danglades Maternelle')
from annuaire_ecoles e
where d.ecole_id = e.id and e.name = 'Eliette Danglades' and d.role = 'Maternelle';

update annuaire_directions d
set ecole_id = (select id from annuaire_ecoles where name = 'Heder Maternelle')
from annuaire_ecoles e
where d.ecole_id = e.id and e.name = 'Heder' and d.role = 'Maternelle';

update annuaire_directions d
set ecole_id = (select id from annuaire_ecoles where name = 'Gaetan Hermine Maternelle')
from annuaire_ecoles e
where d.ecole_id = e.id and e.name = 'Gaetan Hermine' and d.role = 'Maternelle';

update annuaire_directions d
set ecole_id = (select id from annuaire_ecoles where name = 'Mont-Lucas Maternelle')
from annuaire_ecoles e
where d.ecole_id = e.id and e.name = 'Mont-Lucas' and d.role = 'Maternelle';

update annuaire_directions d
set ecole_id = (select id from annuaire_ecoles where name = 'Vendome Maternelle')
from annuaire_ecoles e
where d.ecole_id = e.id and e.name = 'Vendome' and d.role = 'Maternelle';

-- 3. Renommer les écoles existantes en « X Élémentaire » (type EEPU)
update annuaire_ecoles set name = 'Eliette Danglades Élémentaire', type = 'EEPU' where name = 'Eliette Danglades';
update annuaire_ecoles set name = 'Heder Élémentaire',              type = 'EEPU' where name = 'Heder';
update annuaire_ecoles set name = 'Gaetan Hermine Élémentaire',     type = 'EEPU' where name = 'Gaetan Hermine';
update annuaire_ecoles set name = 'Mont-Lucas Élémentaire',         type = 'EEPU' where name = 'Mont-Lucas';
update annuaire_ecoles set name = 'Vendome Élémentaire',            type = 'EEPU' where name = 'Vendome';

-- 4. Nettoyer les rôles « Élémentaire » / « Maternelle » (le type de l'école porte l'info désormais)
update annuaire_directions set role = null where role in ('Élémentaire', 'Maternelle');

-- 5. Réordonner proprement (élém + mat qui se suivent, puis le reste)
update annuaire_ecoles set ordre = 1  where name = 'Eliette Danglades Élémentaire';
update annuaire_ecoles set ordre = 2  where name = 'Eliette Danglades Maternelle';
update annuaire_ecoles set ordre = 3  where name = 'Heder Élémentaire';
update annuaire_ecoles set ordre = 4  where name = 'Heder Maternelle';
update annuaire_ecoles set ordre = 5  where name = 'Gaetan Hermine Élémentaire';
update annuaire_ecoles set ordre = 6  where name = 'Gaetan Hermine Maternelle';
update annuaire_ecoles set ordre = 7  where name = 'Mont-Lucas Élémentaire';
update annuaire_ecoles set ordre = 8  where name = 'Mont-Lucas Maternelle';
update annuaire_ecoles set ordre = 9  where name = 'Vendome Élémentaire';
update annuaire_ecoles set ordre = 10 where name = 'Vendome Maternelle';
update annuaire_ecoles set ordre = 11 where name = 'Saba';
update annuaire_ecoles set ordre = 12 where name = 'La Roseraie';
update annuaire_ecoles set ordre = 13 where name = 'Léodate Volmar';
update annuaire_ecoles set ordre = 14 where name = 'Jean-Marie Mortin';
update annuaire_ecoles set ordre = 15 where name = 'Augustine Duchange';
update annuaire_ecoles set ordre = 16 where name = 'De Cacao';
update annuaire_ecoles set ordre = 17 where name = 'Saint-Paul';
update annuaire_ecoles set ordre = 18 where name = 'La Persévérance';

-- 6. Un seul directeur par école → ordre remis à 1
update annuaire_directions set ordre = 1;

commit;

-- Vérification : devrait renvoyer 18 / 18 (1 directeur par école)
select count(*) as nb_ecoles from annuaire_ecoles;
select count(*) as nb_directeurs from annuaire_directions;
