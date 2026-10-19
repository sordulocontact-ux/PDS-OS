-- Conception → Production, fiche by fiche (proto « Projet complet » de3,
-- ticket « Workflow Conception complet » § 13; docs/ARCHITECTURE.md § 8
-- decies). « Transférer en Production » opens the Production of that
-- deliverable: the Production stage starts with the first transfer, never
-- with a separate « Démarrer » nor with a validation of the whole
-- Conception. A new version transferred after a first one tells the
-- Production (« la V2 n'est pas encore transférée : la Production sera
-- prévenue »; ticket: « Nouvelle version après transfert : avertir
-- Production »). The Conception is done when every sheet is transferred
-- (design_is_done, read by the workflows' states); its stage is never
-- validated as a whole any more, so a sheet can still get a new version.
-- pass_to_production and reopen_design are kept, unused by the screens.

select public.add_notification_kinds(array['design_sheet_new_version']);

create or replace function public.handoff_design_sheet(p_sheet_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.design_sheets%rowtype;
  v_submission uuid;
  v_id uuid;
  v_production uuid;
  v_state text;
begin
  select * into v from public.design_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.is_project_owner(v.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  select s.id into v_submission from public.design_submissions s
   where s.sheet_id = v.id and s.status = 'approved'
   order by s.number desc limit 1;
  if v_submission is null then
    raise exception 'not_validated';
  end if;
  if exists (select 1 from public.design_handoffs h
             where h.sheet_id = v.id and h.submission_id = v_submission) then
    raise exception 'already_transferred';
  end if;
  insert into public.design_handoffs
    (organization_id, project_id, sheet_id, submission_id, brief_id, confirmed_by)
  values (v.organization_id, v.project_id, v.id, v_submission,
          (select b.id from public.design_briefs b where b.project_id = v.project_id
            order by b.number desc limit 1),
          public.auth_person_id())
  returning id into v_id;

  -- The first transfer opens the Production.
  select s.id, s.state into v_production, v_state
    from public.project_stages s
    join public.stage_definitions sd on sd.id = s.stage_definition_id
   where s.project_id = v.project_id and sd.key = 'production'
   for update of s;
  if v_production is not null and v_state = 'not_started' then
    update public.project_stages
       set state = 'in_progress', state_changed_at = now(),
           state_changed_by = public.auth_person_id()
     where id = v_production;
  end if;
  return v_id;
end;
$$;

-- A later version transferred: the Production of that deliverable is told
-- (its line producer and its director, when named), and the project's owner.
create function public.design_handoffs_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person uuid;
begin
  if not exists (select 1 from public.design_handoffs h
                  where h.sheet_id = new.sheet_id and h.id <> new.id) then
    return null;
  end if;
  for v_person in
    select p.owner_person_id from public.projects p where p.id = new.project_id
    union
    select x.person from public.design_sheets s
      join public.design_deliverables d on d.id = s.design_deliverable_id
      join public.production_sheets ps on ps.deliverable_id = d.strategy_deliverable_id
      cross join lateral (values (ps.line_producer_person_id), (ps.director_person_id)) as x(person)
     where s.id = new.sheet_id and x.person is not null
  loop
    perform public.notify(new.organization_id, v_person, 'design_sheet_new_version',
                          new.project_id, new.sheet_id);
  end loop;
  return null;
end;
$$;

revoke all on function public.design_handoffs_notify() from public, anon, authenticated;

create trigger z_notify after insert on public.design_handoffs
  for each row execute function public.design_handoffs_notify();

-- The Conception is done: it has sheets and every one was transferred.
create function public.design_is_done(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_see_project(p_project_id)
     and exists (select 1 from public.design_sheets s where s.project_id = p_project_id)
     and not exists (
       select 1 from public.design_sheets s
        where s.project_id = p_project_id
          and not exists (select 1 from public.design_handoffs h where h.sheet_id = s.id));
$$;

revoke all on function public.design_is_done(uuid) from public, anon;
grant execute on function public.design_is_done(uuid) to authenticated;
