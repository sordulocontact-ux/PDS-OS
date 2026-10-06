-- Master workflow, lot 9: asking the right people (ticket "Workflow
-- Master", § 6: « ne pas demander systématiquement toutes les informations
-- au Chef de projet » ; docs/ARCHITECTURE.md § 8 septies).
--
-- What the Brief Mix/Master lacks is asked to whoever is responsible for it
-- (decided by code, lib/master-workflow/questions.ts): the artistic
-- direction and the deliverables to the project's creative directors. The
-- owner asks (a human gesture); each question is a task of the person's
-- Travail, ticked when they answer on the brief's page; the owner applies an
-- answer to the brief (the answers feed it, a person decides).

create table public.master_brief_questions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- What is asked: the artistic direction (free text), or the deliverables
  -- (choices from the brief's closed list).
  dimension text not null,
  asked_to uuid not null references public.people (id),
  answer_text text,
  answer_choices text[],
  answered_at timestamptz,
  applied_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint master_brief_questions_dimension_check
    check (dimension in ('direction', 'deliverables')),
  constraint master_brief_questions_answer_text_check
    check (answer_text is null
           or (btrim(answer_text) <> '' and char_length(answer_text) <= 2000)),
  constraint master_brief_questions_answer_choices_check
    check (answer_choices is null
           or answer_choices <@ array['instrumental', 'acapella', 'clean', 'radio_edit', 'live',
                                      'tv_mix', 'stems']::text[]),
  constraint master_brief_questions_id_org_key unique (id, organization_id),
  constraint master_brief_questions_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade
);

create index master_brief_questions_project_idx
  on public.master_brief_questions (project_id, created_at desc);
create index master_brief_questions_asked_idx on public.master_brief_questions (asked_to);
-- One open question per dimension and person.
create unique index master_brief_questions_open_key
  on public.master_brief_questions (project_id, dimension, asked_to)
  where answered_at is null;

alter table public.master_brief_questions enable row level security;
alter table public.master_brief_questions force row level security;
revoke all on table public.master_brief_questions from anon, authenticated;
grant select on table public.master_brief_questions to authenticated;

create policy master_brief_questions_select_visible on public.master_brief_questions
  for select to authenticated
  using (public.can_see_project(project_id));

-- The task of the Travail that stands for a question.
alter table public.tasks add column master_question_id uuid;
alter table public.tasks add constraint tasks_master_question_same_org
  foreign key (master_question_id, organization_id)
  references public.master_brief_questions (id, organization_id) on delete cascade;
create unique index tasks_master_question_key on public.tasks (master_question_id)
  where master_question_id is not null;

-- ---------------------------------------------------------------------------
-- ask_master_brief_questions (the project's owner)
-- ---------------------------------------------------------------------------
-- p_items: [{"dimension", "person_id", "task_title"}], built by code (who is
-- responsible, the task's words). Checked here: the owner asks, the person is
-- a creative director of the project, no same question is already open. One
-- task per question, due in three days (Paris); the task notification
-- follows (tasks' own trigger). Returns how many were asked.
create or replace function public.ask_master_brief_questions(
  p_project_id uuid,
  p_items jsonb
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_item jsonb;
  v_person uuid;
  v_question uuid;
  v_count integer := 0;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select organization_id into v_org from public.projects where id = p_project_id;
  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_person := (v_item ->> 'person_id')::uuid;
    if not exists (select 1 from public.project_creatives c
                    where c.project_id = p_project_id and c.person_id = v_person) then
      raise exception 'not_responsible';
    end if;
    if exists (select 1 from public.master_brief_questions q
                where q.project_id = p_project_id and q.dimension = v_item ->> 'dimension'
                  and q.asked_to = v_person and q.answered_at is null) then
      continue;
    end if;
    insert into public.master_brief_questions
      (organization_id, project_id, dimension, asked_to, created_by)
    values (v_org, p_project_id, v_item ->> 'dimension', v_person, public.auth_person_id())
    returning id into v_question;
    insert into public.tasks
      (organization_id, project_id, title, assignee_person_id, due_date, master_question_id,
       created_by)
    values (v_org, p_project_id, left(btrim(v_item ->> 'task_title'), 200), v_person,
            (now() at time zone 'Europe/Paris')::date + 3, v_question, public.auth_person_id());
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke execute on function public.ask_master_brief_questions(uuid, jsonb) from public, anon;
grant execute on function public.ask_master_brief_questions(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- answer_master_question (the person asked)
-- ---------------------------------------------------------------------------
-- Once; the answer matches the dimension (text for the direction, choices
-- for the deliverables, [] = nothing else). Its task is ticked in the
-- same transaction.
create or replace function public.answer_master_question(
  p_question_id uuid,
  p_text text,
  p_choices text[] default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_brief_questions%rowtype;
begin
  select * into v_row from public.master_brief_questions where id = p_question_id for update;
  if not found or v_row.asked_to is distinct from public.auth_person_id() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.answered_at is not null then
    raise exception 'already_answered';
  end if;
  if v_row.dimension = 'direction' and nullif(btrim(p_text), '') is null then
    raise exception 'empty_answer';
  end if;
  if v_row.dimension = 'deliverables' and p_choices is null then
    raise exception 'empty_answer';
  end if;
  update public.master_brief_questions
     set answer_text = case when v_row.dimension = 'direction' then btrim(p_text) end,
         answer_choices = case when v_row.dimension = 'deliverables' then p_choices end,
         answered_at = now()
   where id = p_question_id;
  update public.tasks set status = 'done', done_at = now()
   where master_question_id = p_question_id and status = 'todo';
end;
$$;

revoke execute on function public.answer_master_question(uuid, text, text[]) from public, anon;
grant execute on function public.answer_master_question(uuid, text, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- apply_master_question (the project's owner)
-- ---------------------------------------------------------------------------
-- An answer into the brief: the direction is added after what is already
-- written; the deliverables join the ones already expected. Once.
create or replace function public.apply_master_question(p_question_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_brief_questions%rowtype;
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
  insert into public.master_briefs (organization_id, project_id, validator_person_id)
  select v_row.organization_id, v_row.project_id, p.owner_person_id
    from public.projects p where p.id = v_row.project_id
  on conflict (project_id) do nothing;
  if v_row.dimension = 'direction' then
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
