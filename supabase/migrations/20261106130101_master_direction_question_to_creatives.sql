-- Master: the artistic direction is asked to the project's creative
-- directors, whoever validates the versions (ticket « Workflow Master » § 6:
-- « ne pas demander systématiquement toutes les informations au Chef de
-- projet » ; proto master-v2: « Question de PO · pour Nadia Benali »).
--
-- Until now the question left from « Commencer directement » only when the
-- validator was a creative director. Since the validator is chosen at the
-- project's creation, the project manager by default (Ibé, 02/11/2026),
-- the question almost never left. It is now asked by the database:
--   - when the Brief starts « directement » without a direction;
--   - when a creative director joins a project whose Brief started so;
--   - once, below, for the Briefs already started without the question.
-- Never the project's owner, never twice to the same person (an answer
-- counts), never when the Brief already says the direction, never once a
-- mix came back or the project is archived.

create or replace function public._master_ask_direction(p_project_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  b public.master_briefs%rowtype;
  v_owner uuid;
  v_actor uuid;
  r record;
  v_question uuid;
begin
  select * into b from public.master_briefs where project_id = p_project_id;
  if not found or b.start_mode is distinct from 'direct'
     or nullif(btrim(coalesce(b.direction, '')), '') is not null then
    return;
  end if;
  -- Too late once the project is archived or a mix came back: the
  -- direction would no longer reach the engineer before he works.
  if exists (select 1 from public.projects where id = p_project_id and archived_at is not null)
     or exists (select 1 from public.master_mix_versions v where v.project_id = p_project_id) then
    return;
  end if;
  select owner_person_id into v_owner from public.projects where id = p_project_id;
  v_actor := coalesce(public.auth_person_id(), v_owner);
  for r in
    select c.person_id from public.project_creatives c
     where c.project_id = p_project_id
       and c.person_id is distinct from v_owner
       and not exists (select 1 from public.master_brief_questions q
                        where q.project_id = p_project_id and q.dimension = 'direction'
                          and q.asked_to = c.person_id)
  loop
    insert into public.master_brief_questions
      (organization_id, project_id, dimension, asked_to, created_by)
    values (b.organization_id, p_project_id, 'direction', r.person_id, v_actor)
    returning id into v_question;
    insert into public.tasks
      (organization_id, project_id, title, assignee_person_id, due_date, master_question_id,
       created_by)
    values (b.organization_id, p_project_id,
            'Brief Mix/Master : donner la direction artistique', r.person_id,
            (now() at time zone 'Europe/Paris')::date + 3, v_question, v_actor);
  end loop;
end;
$$;
revoke execute on function public._master_ask_direction(uuid) from public, anon, authenticated;

create or replace function public._master_ask_direction_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._master_ask_direction(new.project_id);
  return null;
end;
$$;
revoke execute on function public._master_ask_direction_trigger() from public, anon, authenticated;

-- The Brief started « directement ».
create trigger z_master_ask_direction_brief
  after insert or update of start_mode on public.master_briefs
  for each row
  when (new.start_mode = 'direct')
  execute function public._master_ask_direction_trigger();

-- A creative director joins the project afterwards.
create trigger z_master_ask_direction_creative
  after insert on public.project_creatives
  for each row execute function public._master_ask_direction_trigger();

-- The Briefs already started without the question.
do $$
declare
  r record;
begin
  for r in select project_id from public.master_briefs where start_mode = 'direct' loop
    perform public._master_ask_direction(r.project_id);
  end loop;
end;
$$;
