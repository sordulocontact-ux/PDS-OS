-- Master workflow, lot 3 bis: "Préparer un échange" (ticket "Workflow
-- Master", § 3; docs/ARCHITECTURE.md § 8 septies). A call of the project
-- held to fill the Brief Mix/Master: its agenda is built by code from what
-- the brief still lacks, and once processed its transcript proposes answers
-- to the brief (reviewed by a person, never written by the model).
--
-- One row per exchange: the call it is. The call itself stays an ordinary
-- call of the project (recording, transcription, report), except that it is
-- never imported into the Cadrage's Brief (app/api/calls/[callId]/extract).
--
-- Read: whoever sees the project. Write: its owner only (is_project_owner).
-- Never updated; deleting the call removes the link.

create table public.master_brief_calls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  call_id uuid not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint master_brief_calls_call_key unique (call_id),
  constraint master_brief_calls_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade,
  constraint master_brief_calls_call_same_org
    foreign key (call_id, organization_id) references public.calls (id, organization_id)
    on delete cascade
);

create index master_brief_calls_project_idx
  on public.master_brief_calls (project_id, created_at desc);

-- The call belongs to the same project. Security definer: it reads the call
-- whatever the caller may read, and raises one stable message.
create or replace function public.check_master_brief_call()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.calls c
                  where c.id = new.call_id and c.project_id = new.project_id) then
    raise exception 'call_not_in_project';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_master_brief_call() from public, anon, authenticated;

create trigger master_brief_calls_check
  before insert on public.master_brief_calls
  for each row execute function public.check_master_brief_call();

create trigger a_set_created_by before insert on public.master_brief_calls
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.master_brief_calls enable row level security;
alter table public.master_brief_calls force row level security;
revoke all on table public.master_brief_calls from anon, authenticated;
grant select on table public.master_brief_calls to authenticated;
grant insert (organization_id, project_id, call_id) on public.master_brief_calls to authenticated;

create policy master_brief_calls_select_visible on public.master_brief_calls
  for select to authenticated
  using (public.can_see_project(project_id));

create policy master_brief_calls_insert_owner on public.master_brief_calls
  for insert to authenticated
  with check (public.is_project_owner(project_id));

-- ---------------------------------------------------------------------------
-- Creating an exchange: the call and its link in one transaction
-- ---------------------------------------------------------------------------

-- Security invoker: the caller's own rights apply (only the project's owner
-- creates a call of the project and links it). The agenda is built by code
-- from what the brief lacks; its total is the sum of its points, never a
-- typed value (CLAUDE.md rule 6). Recording consent is given by contract.
-- An empty link means none.
create or replace function public.create_master_exchange(
  p_project_id uuid,
  p_title text,
  p_occurred_at timestamptz,
  p_meeting_url text,
  p_agenda jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
  v_call uuid;
  v_minutes integer;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null then
    raise exception 'project_not_found';
  end if;
  select coalesce(sum((item ->> 'minutes')::integer), 0) into v_minutes
    from jsonb_array_elements(coalesce(p_agenda, '[]'::jsonb)) as item;

  insert into public.calls (organization_id, project_id, title, occurred_at, meeting_url,
                            consent, agenda, duration_minutes)
  values (v_org, p_project_id, p_title, p_occurred_at, nullif(btrim(p_meeting_url), ''),
          'granted', p_agenda, nullif(v_minutes, 0))
  returning id into v_call;

  insert into public.master_brief_calls (organization_id, project_id, call_id)
  values (v_org, p_project_id, v_call);
  return v_call;
end;
$$;

revoke execute on function public.create_master_exchange(uuid, text, timestamptz, text, jsonb)
  from public, anon;
grant execute on function public.create_master_exchange(uuid, text, timestamptz, text, jsonb)
  to authenticated;
