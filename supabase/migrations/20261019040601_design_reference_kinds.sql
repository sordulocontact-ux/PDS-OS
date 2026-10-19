-- Conception › Références, the words of the proto « Projet complet »
-- (refAddForm): four sorts — Référence, Moodboard, Proposition créative,
-- Version de travail — and three rights of use — Licence libre, Usage
-- interne, À vérifier (by default). The values of MKT-C2-09 (« to_qualify »,
-- « inspiration », « licensed », « to_license », « owned ») stay valid for
-- what was gathered before: nothing is rewritten.

alter table public.design_references drop constraint design_references_type_check;
alter table public.design_references add constraint design_references_type_check
  check (type = any (array['reference', 'moodboard', 'proposal', 'work_version', 'to_qualify']));

alter table public.design_references drop constraint design_references_usage_check;
alter table public.design_references add constraint design_references_usage_check
  check (usage is null or usage = any (array['free', 'internal', 'to_check',
                                             'inspiration', 'licensed', 'to_license', 'owned']));
