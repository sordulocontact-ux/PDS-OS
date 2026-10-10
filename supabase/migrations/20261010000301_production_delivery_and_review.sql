-- Marketing: Production delivers each deliverable, Suivi & bilan closes the
-- project (UX test of 09/10/2026: « Production » and « Suivi & bilan » had
-- no page, a content project could be neither delivered nor closed;
-- docs/ARCHITECTURE.md § 8 nonies).
--
-- Ticket « Workflow Production complet », the part that ends the journey:
--   * § 20 « Validation créative finale, contrôle technique et livraison sont
--     trois décisions distinctes » and « Le livrable passe à Livré uniquement
--     si la version finale est validée, les fichiers attendus sont présents
--     et le contrôle technique est confirmé » → one row per deliverable, the
--     final file (a link: exports live on a Drive, Frame.io, WeTransfer…),
--     then three human decisions in that order, each with who and when;
--   * « La livraison peut être rouverte si un fichier est remplacé » → a new
--     final file clears the decisions, « Rouvrir » clears them too;
--   * rôles : « Validateur créatif : décide sur une version » → the owner or a
--     creative director of the project validates; the check and the delivery
--     are the owner's (« Contrôleur technique / responsable livraison »).
-- The rest of the ticket (preproduction, shooting, equipment, call sheet,
-- timecoded feedback, hand-off to Activations) is not built here.
--
-- The stages are unchanged (« production », « review »: Bilan & clôture),
-- started by the owner and validated by the director like the others; two
-- checks are added to request_validation: Production waits for every
-- deliverable to be delivered, the closing for a written review.

create table public.deliverable_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  deliverable_id uuid not null,
  final_url text not null,
  final_note text,
  final_set_by uuid references public.people (id),
  final_set_at timestamptz not null default now(),
  approved_by uuid references public.people (id),
  approved_at timestamptz,
  checked_by uuid references public.people (id),
  checked_at timestamptz,
  delivered_by uuid references public.people (id),
  delivered_at timestamptz,
  constraint deliverable_deliveries_deliverable_key unique (deliverable_id),
  constraint deliverable_deliveries_url_check
    check (char_length(final_url) <= 2048 and final_url ~ '^https://\S+$'),
  constraint deliverable_deliveries_note_check
    check (final_note is null or char_length(final_note) <= 1000),
  -- No shortcut between the states (ticket, « Livraison »).
  constraint deliverable_deliveries_order check (
    (checked_at is null or approved_at is not null)
    and (delivered_at is null or checked_at is not null)),
  constraint deliverable_deliveries_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint deliverable_deliveries_deliverable_same_org foreign key (deliverable_id, organization_id)
    references public.strategy_deliverables (id, organization_id) on delete cascade
);

create index deliverable_deliveries_project_idx on public.deliverable_deliveries (project_id);

create table public.project_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  results text,
  worked text,
  improve text,
  updated_by uuid references public.people (id),
  updated_at timestamptz not null default now(),
  constraint project_reviews_project_key unique (project_id),
  constraint project_reviews_length_check check (
    char_length(coalesce(results, '')) <= 5000
    and char_length(coalesce(worked, '')) <= 5000
    and char_length(coalesce(improve, '')) <= 5000),
  constraint project_reviews_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);

alter table public.deliverable_deliveries enable row level security;
alter table public.deliverable_deliveries force row level security;
alter table public.project_reviews enable row level security;
alter table public.project_reviews force row level security;
revoke all on public.deliverable_deliveries, public.project_reviews from anon, authenticated;
grant select on public.deliverable_deliveries, public.project_reviews to authenticated;
create policy deliverable_deliveries_select_visible on public.deliverable_deliveries
  for select to authenticated using (public.can_see_project(project_id));
create policy project_reviews_select_visible on public.project_reviews
  for select to authenticated using (public.can_see_project(project_id));

-- A stage of the project is in progress (writes follow the stage, as the
-- Conception's design_is_in_progress).
create function public.project_stage_in_progress(p_project_id uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_stages s
    join public.stage_definitions d on d.id = s.stage_definition_id
    where s.project_id = p_project_id and d.key = p_key and s.state = 'in_progress');
$$;
revoke execute on function public.project_stage_in_progress(uuid, text) from public, anon, authenticated;

-- « Fichier final »: the export to deliver. A new one clears the decisions
-- taken on the previous one.
create function public.set_deliverable_final(
  p_deliverable_id uuid,
  p_url text,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deliverable public.strategy_deliverables%rowtype;
  v_url text := btrim(coalesce(p_url, ''));
begin
  select * into v_deliverable from public.strategy_deliverables where id = p_deliverable_id;
  if not found or not public.is_project_owner(v_deliverable.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.project_stage_in_progress(v_deliverable.project_id, 'production') then
    raise exception 'stage_locked';
  end if;
  if v_url !~ '^https://\S+$' or char_length(v_url) > 2048 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  insert into public.deliverable_deliveries
    (organization_id, project_id, deliverable_id, final_url, final_note, final_set_by)
  values (v_deliverable.organization_id, v_deliverable.project_id, p_deliverable_id, v_url,
          nullif(btrim(coalesce(p_note, '')), ''), public.auth_person_id())
  on conflict (deliverable_id) do update
    set final_url = excluded.final_url, final_note = excluded.final_note,
        final_set_by = excluded.final_set_by, final_set_at = now(),
        approved_by = null, approved_at = null, checked_by = null, checked_at = null,
        delivered_by = null, delivered_at = null;
end;
$$;

-- The three decisions, in order, and « Rouvrir ».
create function public.advance_deliverable_delivery(p_deliverable_id uuid, p_step text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.deliverable_deliveries%rowtype;
  v_me uuid := public.auth_person_id();
  v_owner boolean;
begin
  select * into v_row from public.deliverable_deliveries
   where deliverable_id = p_deliverable_id for update;
  if not found or not public.can_see_project(v_row.project_id) then
    raise exception 'not_found';
  end if;
  v_owner := public.is_project_owner(v_row.project_id);
  -- The creative validation: the owner or a creative director of the project.
  if not (v_owner or (p_step = 'approve' and exists (
            select 1 from public.project_creatives pc
             where pc.project_id = v_row.project_id and pc.person_id = v_me))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.project_stage_in_progress(v_row.project_id, 'production') then
    raise exception 'stage_locked';
  end if;
  case p_step
    when 'approve' then
      if v_row.approved_at is not null then raise exception 'invalid_transition'; end if;
      update public.deliverable_deliveries set approved_by = v_me, approved_at = now()
       where id = v_row.id;
    when 'check' then
      if v_row.approved_at is null or v_row.checked_at is not null then
        raise exception 'invalid_transition';
      end if;
      update public.deliverable_deliveries set checked_by = v_me, checked_at = now()
       where id = v_row.id;
    when 'deliver' then
      if v_row.checked_at is null or v_row.delivered_at is not null then
        raise exception 'invalid_transition';
      end if;
      update public.deliverable_deliveries set delivered_by = v_me, delivered_at = now()
       where id = v_row.id;
    when 'reopen' then
      update public.deliverable_deliveries
         set approved_by = null, approved_at = null, checked_by = null, checked_at = null,
             delivered_by = null, delivered_at = null
       where id = v_row.id;
    else
      raise exception 'invalid_input' using errcode = '23514';
  end case;
end;
$$;

-- The review (Bilan): written by the owner while « Bilan & clôture » runs.
create function public.save_project_review(
  p_project_id uuid,
  p_results text,
  p_worked text,
  p_improve text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.project_stage_in_progress(p_project_id, 'review') then
    raise exception 'stage_locked';
  end if;
  insert into public.project_reviews
    (organization_id, project_id, results, worked, improve, updated_by)
  values (v_org, p_project_id, nullif(btrim(coalesce(p_results, '')), ''),
          nullif(btrim(coalesce(p_worked, '')), ''), nullif(btrim(coalesce(p_improve, '')), ''),
          public.auth_person_id())
  on conflict (project_id) do update
    set results = excluded.results, worked = excluded.worked, improve = excluded.improve,
        updated_by = excluded.updated_by, updated_at = now();
end;
$$;

revoke execute on function public.set_deliverable_final(uuid, text, text) from public, anon;
grant execute on function public.set_deliverable_final(uuid, text, text) to authenticated;
revoke execute on function public.advance_deliverable_delivery(uuid, text) from public, anon;
grant execute on function public.advance_deliverable_delivery(uuid, text) to authenticated;
revoke execute on function public.save_project_review(uuid, text, text, text) from public, anon;
grant execute on function public.save_project_review(uuid, text, text, text) to authenticated;

-- request_validation (20261006000101_framing_intelligent.sql) plus two checks:
-- the Production is finished when every deliverable is delivered, and a
-- project is closed with its review written.
create or replace function public.request_validation(p_stage_id uuid, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage public.project_stages%rowtype;
  v_key text;
  v_validator_person_id uuid;
  v_id uuid;
begin
  select * into v_stage from public.project_stages where id = p_stage_id for update;
  if not found or not public.is_active_member(v_stage.organization_id) then
    raise exception 'stage_not_found';
  end if;
  if not public.is_project_owner(v_stage.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if v_stage.state <> 'in_progress' then
    raise exception 'invalid_transition';
  end if;
  select d.key into v_key from public.stage_definitions d where d.id = v_stage.stage_definition_id;
  if v_key = 'framing' and not exists (
    select 1 from public.framing_briefs b
    where b.project_id = v_stage.project_id and b.state = 'pending') then
    raise exception 'brief_required';
  end if;
  if v_key = 'production' and exists (
    select 1 from public.strategy_deliverables d
    left join public.deliverable_deliveries x on x.deliverable_id = d.id
    where d.project_id = v_stage.project_id and x.delivered_at is null) then
    raise exception 'deliveries_open';
  end if;
  if v_key = 'review' and not exists (
    select 1 from public.project_reviews r
    where r.project_id = v_stage.project_id
      and coalesce(r.results, r.worked, r.improve) is not null) then
    raise exception 'review_required';
  end if;

  v_validator_person_id := public.sole_validator(v_stage.organization_id);

  insert into public.validations
    (organization_id, project_stage_id, requested_by, validator_person_id, request_note)
  values
    (v_stage.organization_id, p_stage_id, public.auth_person_id(), v_validator_person_id,
     nullif(btrim(p_note), ''))
  returning id into v_id;

  update public.project_stages
     set state = 'awaiting_validation', state_changed_at = now(),
         state_changed_by = public.auth_person_id()
   where id = p_stage_id;
  return v_id;
end;
$$;
