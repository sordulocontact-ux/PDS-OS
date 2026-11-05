-- Who gives the feedback on the mix, chosen when the project is created
-- (Ibé, 02/11/2026: « pouvoir désigner, lors de la création d'un projet, la
-- personne qui fait les retours sur le mix »; docs/ARCHITECTURE.md § 8 septies).
--
-- projects.master_validator_person_id: the person who validates the versions
-- of the Master, before the Brief Mix/Master exists. Same rule as the Brief's
-- validator (check_master_brief_validator): a person of the project's team,
-- i.e. its owner or one of its creative directors. At creation the project
-- has no owner yet (it is transmitted, accepted later) and its creative
-- directors are added after the insert, in the same transaction: the rule is
-- checked at commit (deferred constraint trigger, like z_check_masters), and
-- the person transmitted to (pending transmission) counts as the owner to be.
--
-- The Brief takes it over: a brief created without a validator gets the
-- project's, as long as that person is still the owner or a creative
-- director (a refused transmission may leave someone who is not), else the
-- owner. The Brief stays the place where it changes afterwards.

alter table public.projects
  add column master_validator_person_id uuid references public.people (id);

create index projects_master_validator_idx on public.projects (master_validator_person_id);

-- Same rights as the project's other columns: written by its creator, and
-- before launch only (RLS projects_update_before_launch). After launch the
-- Brief carries it (written by the owner).
grant insert (master_validator_person_id) on public.projects to authenticated;
grant update (master_validator_person_id) on public.projects to authenticated;

-- ---------------------------------------------------------------------------
-- The rule, at commit
-- ---------------------------------------------------------------------------

create or replace function public.check_project_master_validator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_validator uuid;
  v_owner uuid;
begin
  -- The row as it stands at commit, not as it was when the event fired.
  select p.master_validator_person_id, p.owner_person_id into v_validator, v_owner
    from public.projects p where p.id = new.id;
  if v_validator is null or v_validator = v_owner then
    return null;
  end if;
  if not exists (select 1 from public.project_creatives c
                  where c.project_id = new.id and c.person_id = v_validator)
     and not exists (select 1 from public.project_assignments a
                      where a.project_id = new.id and a.status = 'pending'
                        and a.assignee_person_id = v_validator) then
    raise exception 'invalid_master_validator';
  end if;
  return null;
end;
$$;

revoke execute on function public.check_project_master_validator() from public, anon, authenticated;

create constraint trigger z_check_master_validator
  after insert or update of master_validator_person_id on public.projects
  deferrable initially deferred
  for each row execute function public.check_project_master_validator();

-- ---------------------------------------------------------------------------
-- The Brief takes it over
-- ---------------------------------------------------------------------------

-- Fires before master_briefs_check_validator (triggers run in name order).
create or replace function public.default_master_brief_validator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.validator_person_id is null then
    select case
             when p.master_validator_person_id is not null
                  and (p.master_validator_person_id = p.owner_person_id
                       or exists (select 1 from public.project_creatives c
                                   where c.project_id = p.id
                                     and c.person_id = p.master_validator_person_id))
               then p.master_validator_person_id
             else p.owner_person_id
           end
      into new.validator_person_id
      from public.projects p where p.id = new.project_id;
  end if;
  return new;
end;
$$;

revoke execute on function public.default_master_brief_validator() from public, anon, authenticated;

create trigger a_default_validator
  before insert on public.master_briefs
  for each row execute function public.default_master_brief_validator();

-- An answer applied before the Brief was ever saved creates it: the
-- validator now comes from the trigger above (it was the owner, written
-- here). Otherwise unchanged from 20261020010401_master_answer_reading.
create or replace function public.apply_master_question(p_question_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_brief_questions%rowtype;
  v_lines text;
begin
  select * into v_row from public.master_brief_questions where id = p_question_id for update;
  if not found or not public.is_project_owner(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.answered_at is null then
    raise exception 'not_answered';
  end if;
  if v_row.applied_at is not null then
    raise exception 'already_applied';
  end if;
  insert into public.master_briefs (organization_id, project_id)
  values (v_row.organization_id, v_row.project_id)
  on conflict (project_id) do nothing;
  if v_row.dimension = 'direction' and jsonb_array_length(coalesce(v_row.answer_items, '[]')) > 0 then
    select string_agg(btrim(i ->> 'label'), E'\n') into v_lines
      from jsonb_array_elements(v_row.answer_items) i where i ->> 'group' = 'direction';
    if v_lines is not null then
      update public.master_briefs
         set direction = left(coalesce(nullif(direction, '') || E'\n', '') || v_lines, 2000)
       where project_id = v_row.project_id;
    end if;
    select string_agg(btrim(i ->> 'label'), E'\n') into v_lines
      from jsonb_array_elements(v_row.answer_items) i where i ->> 'group' = 'references';
    if v_lines is not null then
      update public.master_briefs
         set references_text = left(coalesce(nullif(references_text, '') || E'\n', '') || v_lines, 2000)
       where project_id = v_row.project_id;
    end if;
    select string_agg(btrim(i ->> 'label'), E'\n') into v_lines
      from jsonb_array_elements(v_row.answer_items) i where i ->> 'group' = 'constraints';
    if v_lines is not null then
      update public.master_briefs
         set constraints_text = left(coalesce(nullif(constraints_text, '') || E'\n', '') || v_lines, 2000)
       where project_id = v_row.project_id;
    end if;
  elsif v_row.dimension = 'direction' then
    update public.master_briefs
       set direction = left(coalesce(nullif(direction, '') || E'\n', '') || v_row.answer_text, 2000)
     where project_id = v_row.project_id;
  else
    update public.master_briefs
       set deliverables = array(select distinct unnest(deliverables || v_row.answer_choices))
     where project_id = v_row.project_id;
  end if;
  update public.master_brief_questions set applied_at = now() where id = p_question_id;
end;
$$;
revoke execute on function public.apply_master_question(uuid) from public, anon;
grant execute on function public.apply_master_question(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- create_project: one more parameter
-- ---------------------------------------------------------------------------

drop function public.create_project(uuid, text, text, uuid[], date, bigint, text, text, uuid, uuid[], text, uuid, uuid);

create or replace function public.create_project(
  p_organization_id uuid,
  p_title text,
  p_type text,
  p_master_ids uuid[] default null,
  p_due_date date default null,
  p_budget_cents bigint default null,
  p_priority text default null,
  p_initial_context text default null,
  -- Transmitted right away when given (transmit_project checks the rights).
  p_assignee_person_id uuid default null,
  p_creative_person_ids uuid[] default null,
  p_music_format text default null,
  p_content_format_id uuid default null,
  p_artist_id uuid default null,
  -- Who validates the Master's versions: the manager or a creative director
  -- chosen here (z_check_master_validator, at commit). A music release only:
  -- the Master works on the titles it links.
  p_master_validator_person_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_creative uuid;
begin
  -- The event branch is closed in V1: the type exists, no new project uses it.
  if p_type = 'event' then
    raise exception 'project_type_unavailable';
  end if;
  perform public.check_project_shape(p_type, p_master_ids, p_music_format);

  insert into public.projects (organization_id, title, type, due_date, budget_cents, priority,
                               initial_context, music_format, content_format_id, artist_id,
                               master_validator_person_id)
  values (p_organization_id, btrim(p_title), p_type, p_due_date, p_budget_cents, p_priority,
          nullif(btrim(p_initial_context), ''),
          case when p_type = 'music_release' then p_music_format end,
          case when p_type = 'content' then p_content_format_id end,
          case when p_type = 'content' then p_artist_id end,
          case when p_type = 'music_release' then p_master_validator_person_id end)
  returning id into v_id;

  -- A content project links no master; a music one, those chosen.
  insert into public.project_masters (organization_id, project_id, master_id, position)
  select p_organization_id, v_id, m.id, row_number() over (order by m.first_seen)::integer
  from (
    select u.id, min(u.ordinality) as first_seen
    from unnest(case when p_type = 'music_release' then coalesce(p_master_ids, '{}'::uuid[])
                     else '{}'::uuid[] end) with ordinality as u (id, ordinality)
    group by u.id
  ) m;

  if p_assignee_person_id is not null then
    perform public.transmit_project(v_id, p_assignee_person_id, null);
  end if;

  foreach v_creative in array coalesce(p_creative_person_ids, array[]::uuid[])
  loop
    perform public.add_project_creative(v_id, v_creative);
  end loop;

  return v_id;
end;
$$;

revoke execute on function public.create_project(uuid, text, text, uuid[], date, bigint, text, text, uuid, uuid[], text, uuid, uuid, uuid)
  from public, anon;
grant execute on function public.create_project(uuid, text, text, uuid[], date, bigint, text, text, uuid, uuid[], text, uuid, uuid, uuid)
  to authenticated;
