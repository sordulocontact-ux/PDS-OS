-- Page loads audit (26/10/2026, docs/ARCHITECTURE.md § 3 bis, « Cache des
-- parcours »): project_live.version becomes the version of the WHOLE
-- project, not of its Juridique only. The server keeps a project's journeys
-- and workflow states for the version it read them at (lib/projects/
-- version-cache.ts): any change of the project must bump it, or a page
-- would show a past state. It also lets ProjectLive refresh an open page
-- for a teammate's change in any workflow, not only the Juridique.
--
-- 1. project_live_tick() learns the ways a row reaches its project(s):
--    `self` (projects), `stage` (validations), `call` (a call's reports,
--    summaries, transcripts), `master` / `master_self` (a catalog title and
--    its rows: every project that holds the title). The existing modes are
--    kept as they were.
-- 2. One bump per project and transaction: an action that writes fifty rows
--    bumps once (a transaction-local list, pds.live_bumped), so a Realtime
--    burst and the hot project_live row stay small.
-- 3. attach_project_live() puts the trigger on every table that reaches a
--    project and does not have it yet. Idempotent: a migration that creates
--    a project table runs `select public.attach_project_live();`.
--
-- Left out on purpose: project_live itself (it would bump itself),
-- notifications (per person, never part of a page's project state; a burst
-- of notifications would refresh every open page of the project) and the
-- call recorder's takes and pieces (saved every 20 s while recording: the
-- call's state changes with its transcript and report, which do bump).

create or replace function public.project_live_tick()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  v_projects uuid[];
  v_project uuid;
  v_done text := coalesce(current_setting('pds.live_bumped', true), '');
begin
  case tg_argv[0]
    when 'project' then
      v_project := (v_row ->> 'project_id')::uuid;
      if v_project is null and v_row ? 'contract_id' then
        select c.project_id into v_project from public.contracts c
         where c.id = (v_row ->> 'contract_id')::uuid;
      end if;
      v_projects := array[v_project];
    when 'self' then
      v_projects := array[(v_row ->> 'id')::uuid];
    when 'stage' then
      select array_agg(s.project_id) into v_projects from public.project_stages s
       where s.id = (v_row ->> 'project_stage_id')::uuid;
    when 'call' then
      select array_agg(c.project_id) into v_projects from public.calls c
       where c.id = (v_row ->> 'call_id')::uuid;
    when 'master' then
      select array_agg(pm.project_id) into v_projects from public.project_masters pm
       where pm.master_id = (v_row ->> 'master_id')::uuid;
    when 'master_self' then
      select array_agg(pm.project_id) into v_projects from public.project_masters pm
       where pm.master_id = (v_row ->> 'id')::uuid;
    when 'clearance' then
      select array_agg(c.project_id) into v_projects from public.legal_clearances c
       where c.id = (v_row ->> 'clearance_id')::uuid;
    when 'formality' then
      select array_agg(f.project_id) into v_projects from public.legal_formalities f
       where f.id = (v_row ->> 'formality_id')::uuid;
    when 'split_sheet' then
      select array_agg(s.project_id) into v_projects from public.legal_split_sheets s
       where s.id = (v_row ->> 'sheet_id')::uuid;
    when 'split_version' then
      select array_agg(s.project_id) into v_projects
        from public.legal_split_versions v
        join public.legal_split_sheets s on s.id = v.sheet_id
       where v.id = (v_row ->> 'version_id')::uuid;
    when 'contract' then
      select array_agg(c.project_id) into v_projects from public.contracts c
       where c.id = (v_row ->> 'contract_id')::uuid;
    else
      v_projects := null;
  end case;

  foreach v_project in array coalesce(v_projects, array[]::uuid[]) loop
    if v_project is not null and position(v_project::text in v_done) = 0 then
      perform public.project_live_bump(v_project);
      v_done := v_done || v_project::text || ',';
      perform set_config('pds.live_bumped', v_done, true);
    end if;
  end loop;
  return null;
end;
$$;
revoke execute on function public.project_live_tick() from public, anon, authenticated;

-- The trigger on every table that reaches a project, by the column it
-- reaches it through. Tables that already have it keep their mode.
create or replace function public.attach_project_live()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  t record;
  v_count integer := 0;
begin
  for t in
    select c.relname as tbl,
      case
        when c.relname = 'projects' then 'self'
        when c.relname = 'masters' then 'master_self'
        when cols.names @> array['project_id'] then 'project'
        when cols.names @> array['project_stage_id'] then 'stage'
        when cols.names @> array['call_id'] then 'call'
        when cols.names @> array['master_id'] then 'master'
      end as mode
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral (
      select array_agg(a.attname::text) as names from pg_attribute a
       where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    ) cols
    where n.nspname = 'public' and c.relkind = 'r'
      and c.relname not in ('project_live', 'notifications',
                            'call_recording_takes', 'call_recording_pieces')
      and not exists (
        select 1 from pg_trigger tg
         where tg.tgrelid = c.oid and tg.tgname = 'zz_project_live')
  loop
    continue when t.mode is null;
    execute format(
      'create trigger zz_project_live after insert or update or delete on public.%I '
      'for each row execute function public.project_live_tick(%L)', t.tbl, t.mode);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.attach_project_live() from public, anon, authenticated;

select public.attach_project_live();

-- 4. Every project has its signal from now on (creating one bumps it): a
--    missing row then only means a project the reader may not see, which
--    the server never serves from its cache.
insert into public.project_live (project_id, organization_id)
select p.id, p.organization_id from public.projects p
on conflict (project_id) do nothing;
