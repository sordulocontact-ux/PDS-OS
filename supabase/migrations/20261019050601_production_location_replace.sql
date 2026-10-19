-- « Remplacer le lieu retenu » (proto « Projet complet » replaceForm, Artefact
-- § 11; production.md § 2.10, PR-9): replacing the place retained is a new
-- decision with its reason; the former one stays (« Remplacé ») with its
-- validation; the informations linked to it are decided with it; « Ce qu'il
-- faut revoir » makes a task for the right person (origin « Changement de
-- lieu du … »), and may ask for a revision of the quote and a new version of
-- the director's proposal — those steps read « À revoir », nothing blocks.

alter table public.production_location_options
  drop constraint production_location_options_status_check;
alter table public.production_location_options
  add constraint production_location_options_status_check
    check (status in ('candidate', 'discarded', 'chosen', 'replaced'));

alter table public.production_sheets
  add column direction_revision_reason text,
  add column direction_revision_at timestamptz,
  add constraint production_sheets_direction_revision_check
    check (direction_revision_reason is null or char_length(direction_revision_reason) <= 1000);

-- Every decision on the place, kept (« Décisions sur le lieu »).
create table public.production_location_decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  option_id uuid not null references public.production_location_options (id) on delete cascade,
  replaced_option_id uuid references public.production_location_options (id) on delete set null,
  reason text,
  decided_by uuid references public.people (id),
  decided_at timestamptz not null default now(),
  constraint production_location_decisions_reason_check
    check (reason is null or char_length(reason) <= 1000),
  constraint production_location_decisions_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade
);
create index production_location_decisions_sheet_idx
  on public.production_location_decisions (sheet_id, decided_at);
alter table public.production_location_decisions enable row level security;
alter table public.production_location_decisions force row level security;
revoke all on table public.production_location_decisions from anon, authenticated;
grant select on public.production_location_decisions to authenticated;
create policy production_location_decisions_select on public.production_location_decisions
  for select to authenticated using (public.can_see_project(project_id));

-- The place chosen until now, as its first decision.
insert into public.production_location_decisions
  (organization_id, project_id, sheet_id, option_id, reason, decided_by, decided_at)
select o.organization_id, o.project_id, o.sheet_id, o.id, o.decision_reason, o.decided_by,
       coalesce(o.decided_at, now())
  from public.production_location_options o where o.status = 'chosen';

-- « Retenir ce lieu » keeps its decision too (same rules as before).
create or replace function public.production_location_decided()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'chosen' and old.status is distinct from 'chosen' then
    insert into public.production_location_decisions
      (organization_id, project_id, sheet_id, option_id, reason, decided_by)
    values (new.organization_id, new.project_id, new.sheet_id, new.id, new.decision_reason,
            public.auth_person_id());
  end if;
  return new;
end;
$$;
revoke execute on function public.production_location_decided() from public, anon, authenticated;
create trigger z_location_decided after update of status on public.production_location_options
  for each row execute function public.production_location_decided();

create function public.replace_production_location(
  p_option_id uuid, p_reason text, p_reviews jsonb, p_revise_quote boolean,
  p_revise_direction boolean, p_note_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.production_location_options%rowtype;
  prev public.production_location_options%rowtype;
  s public.production_sheets%rowtype;
  v_origin text;
  v_review jsonb;
  v_task uuid;
  v_pos integer;
begin
  select * into o from public.production_location_options where id = p_option_id for update;
  if not found or not public.can_see_project(o.project_id) then
    raise exception 'location_not_found';
  end if;
  if not public.production_can_organize(o.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'reason_required';
  end if;
  if o.status <> 'candidate' then
    raise exception 'location_not_candidate';
  end if;
  select * into prev from public.production_location_options
   where sheet_id = o.sheet_id and status = 'chosen' for update;
  if not found then
    raise exception 'nothing_to_replace';
  end if;
  if jsonb_typeof(coalesce(p_reviews, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_reviews, '[]'::jsonb)) > 10 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  select * into s from public.production_sheets where id = o.sheet_id for update;
  v_origin := 'Changement de lieu du ' || to_char((now() at time zone 'Europe/Paris')::date, 'DD/MM');

  update public.production_location_options set status = 'replaced' where id = prev.id;
  update public.production_location_options
     set status = 'chosen', decided_by = public.auth_person_id(), decided_at = now(),
         decision_reason = left(btrim(p_reason), 1000)
   where id = o.id;
  update public.production_location_decisions
     set replaced_option_id = prev.id
   where id = (select id from public.production_location_decisions
                where option_id = o.id order by decided_at desc limit 1);
  update public.production_sheets
     set location_status = 'confirmed', location_name = o.name, location_address = o.address,
         location_notes = coalesce(o.constraints, location_notes)
   where id = s.id;

  -- « Ce qu'il faut revoir »: a task for the right person each.
  select coalesce(max(position) + 1, 0) into v_pos from public.production_plan_actions where sheet_id = s.id;
  for v_review in select * from jsonb_array_elements(coalesce(p_reviews, '[]'::jsonb)) loop
    if btrim(coalesce(v_review ->> 'title', '')) = '' then
      continue;
    end if;
    insert into public.production_plan_actions
      (organization_id, project_id, sheet_id, title, person_id, contact_id, status, approved_by,
       approved_at, position, origin, review)
    values (s.organization_id, s.project_id, s.id, left(btrim(v_review ->> 'title'), 300),
            nullif(v_review ->> 'person_id', '')::uuid, nullif(v_review ->> 'contact_id', '')::uuid,
            'approved', public.auth_person_id(), now(), v_pos, v_origin, true)
    returning id into v_task;
    v_pos := v_pos + 1;
  end loop;

  if coalesce(p_revise_quote, false)
     and exists (select 1 from public.production_quotes where sheet_id = s.id and status = 'approved') then
    update public.production_sheets
       set quote_revision_reason = left('Changement de lieu : ' || btrim(p_reason), 1000),
           quote_revision_by = public.auth_person_id(), quote_revision_at = now()
     where id = s.id;
  end if;
  if coalesce(p_revise_direction, false) and s.direction_status = 'approved' then
    update public.production_sheets
       set direction_revision_reason = left('Changement de lieu : ' || btrim(p_reason), 1000),
           direction_revision_at = now()
     where id = s.id;
  end if;

  -- The informations linked to the place are decided with it.
  update public.step_notes n
     set status = 'decided', decided_by = public.auth_person_id(), decided_at = now()
   where n.id = any (coalesce(p_note_ids, '{}')) and n.project_id = s.project_id
     and n.module = 'production' and n.discarded_at is null;

  perform public.production_log(s.organization_id, s.project_id, s.id, 'place', o.id, 'replaced',
    jsonb_build_object('name', prev.name), jsonb_build_object('name', o.name, 'reason', btrim(p_reason)));
end;
$$;
revoke execute on function public.replace_production_location(uuid, text, jsonb, boolean, boolean, uuid[])
  from public, anon;
grant execute on function public.replace_production_location(uuid, text, jsonb, boolean, boolean, uuid[])
  to authenticated;

-- A new version of the director's proposal clears its revision asked.
create or replace function public.production_direction_revision_done()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.direction_status = 'submitted' and old.direction_status is distinct from 'submitted' then
    new.direction_revision_reason := null;
    new.direction_revision_at := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.production_direction_revision_done() from public, anon, authenticated;
create trigger d_direction_revision before update on public.production_sheets
  for each row execute function public.production_direction_revision_done();
