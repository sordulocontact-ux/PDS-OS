-- « Mes tâches » : une tâche mène à la page concernée de son projet (retour
-- du 09/11/2026 : « quand on clique dessus, ça nous emmène sur la page
-- concernée »). La page est prise dans une liste fixe (lib/work/task-pages.ts),
-- lue dans les mots de la tâche quand PO la met depuis une réunion, ou choisie
-- dans la modale ; sans page, la tâche ouvre la Vue d'ensemble du projet.
--
-- Les tâches déjà mises depuis une réunion de projet prennent le projet de
-- leur réunion (elles l'avaient perdu) ; leur page reste à choisir.

alter table public.personal_tasks
  add column project_page text,
  add constraint personal_tasks_project_page_check
    check (project_page is null or project_page in (
      'overview', 'framing', 'strategy', 'design', 'production', 'activations',
      'master', 'sessions', 'legal', 'release', 'budget', 'calls', 'files'));
-- No check tying the page to a project: deleting a project empties
-- project_id (on delete set null) and keeps the page, which the code then
-- ignores (no project, no link).

update public.personal_tasks t
   set project_id = c.project_id
  from public.calls c
 where c.id = t.source_call_id
   and t.project_id is null
   and c.project_id is not null;
