-- JUR-12 / JUR-28 (retours Juridique du 11/10/2026, docs/ARCHITECTURE.md
-- § 8 sexies, « Synchronisation »): a page of a project shows the new state
-- of the Juridique without a manual reload, in every open tab, including
-- what arrives from outside (a fiche, a split confirmation sent through a
-- public link).
--
-- One small row per project, bumped by triggers whenever a legal row (or a
-- contract, a task) of that project changes. Pages listen to it through
-- Supabase Realtime (RLS applies: only who sees the project hears it) and
-- read their data again. The signal carries no data: what is shown is
-- always read again with the person's session.

create table public.project_live (
  project_id uuid primary key,
  organization_id uuid not null,
  version bigint not null default 1,
  changed_at timestamptz not null default now(),
  constraint project_live_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);

alter table public.project_live enable row level security;
alter table public.project_live force row level security;
revoke all on table public.project_live from anon, authenticated;
grant select on table public.project_live to authenticated;
create policy project_live_select_visible on public.project_live
  for select to authenticated using (public.can_see_project(project_id));

alter publication supabase_realtime add table public.project_live;

-- Bumps the project's version. Inserting through the projects table makes a
-- project being deleted (its row already gone) a no-op, never an error.
create or replace function public.project_live_bump(p_project_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.project_live (project_id, organization_id)
  select p.id, p.organization_id from public.projects p where p.id = p_project_id
  on conflict (project_id) do update
    set version = public.project_live.version + 1, changed_at = now();
$$;
revoke execute on function public.project_live_bump(uuid) from public, anon, authenticated;

-- The project a changed row belongs to, by the way its table reaches it
-- (TG_ARGV[0]): its own project_id, or its clearance, formality, split
-- version or sheet, or contract.
create or replace function public.project_live_tick()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  v_project uuid;
begin
  case tg_argv[0]
    when 'project' then
      v_project := (v_row ->> 'project_id')::uuid;
      if v_project is null and v_row ? 'contract_id' then
        select c.project_id into v_project from public.contracts c
         where c.id = (v_row ->> 'contract_id')::uuid;
      end if;
    when 'clearance' then
      select c.project_id into v_project from public.legal_clearances c
       where c.id = (v_row ->> 'clearance_id')::uuid;
    when 'formality' then
      select f.project_id into v_project from public.legal_formalities f
       where f.id = (v_row ->> 'formality_id')::uuid;
    when 'split_sheet' then
      select s.project_id into v_project from public.legal_split_sheets s
       where s.id = (v_row ->> 'sheet_id')::uuid;
    when 'split_version' then
      select s.project_id into v_project
        from public.legal_split_versions v
        join public.legal_split_sheets s on s.id = v.sheet_id
       where v.id = (v_row ->> 'version_id')::uuid;
    when 'contract' then
      select c.project_id into v_project from public.contracts c
       where c.id = (v_row ->> 'contract_id')::uuid;
    else
      v_project := null;
  end case;
  if v_project is not null then
    perform public.project_live_bump(v_project);
  end if;
  return null;
end;
$$;
revoke execute on function public.project_live_tick() from public, anon, authenticated;

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('legal_intakes', 'project'), ('legal_answers', 'project'),
      ('legal_facts', 'project'), ('legal_clearances', 'project'),
      ('legal_formalities', 'project'), ('legal_forms', 'project'),
      ('legal_form_submissions', 'project'), ('legal_plans', 'project'),
      ('legal_plan_items', 'project'), ('legal_plan_events', 'project'),
      ('legal_project_contacts', 'project'), ('legal_split_sheets', 'project'),
      ('legal_agreement_needs', 'project'), ('contracts', 'project'),
      ('contract_events', 'project'), ('tasks', 'project'),
      ('legal_clearance_events', 'clearance'), ('legal_clearance_terms', 'clearance'),
      ('legal_clearance_rightsholders', 'clearance'),
      ('legal_clearance_communications', 'clearance'),
      ('legal_clearance_contracts', 'clearance'),
      ('legal_formality_events', 'formality'), ('legal_formality_signatures', 'formality'),
      ('legal_formality_values', 'formality'), ('legal_formality_documents', 'formality'),
      ('legal_split_versions', 'split_sheet'),
      ('legal_split_entries', 'split_version'), ('legal_split_confirmations', 'split_version'),
      ('legal_split_events', 'split_version'),
      ('contract_files', 'contract'), ('contract_parties', 'contract'),
      ('contract_documents', 'contract')
    ) as v(tbl, mode)
  loop
    execute format(
      'create trigger zz_project_live after insert or update or delete on public.%I '
      'for each row execute function public.project_live_tick(%L)', t.tbl, t.mode);
  end loop;
end;
$$;
