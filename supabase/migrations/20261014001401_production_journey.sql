-- Production as a journey (Ibé's message of 14/10, docs/PRODUCTION-METIER.md § 0):
--   * the first decision is who produces: « internal » (PDS pilots, freelances
--     included) or « external » (a production company), with the roles —
--     the company, the line producer, who validates quotes, the director of
--     photography;
--   * the line producer designated on a sheet organises the Production like
--     the project's owner (Ibé: the chargé de production handles places,
--     quotes, rentals, planning, logistics);
--   * a quote is deposited (by the company through its link, or by the line
--     producer), checked point by point by the line producer, submitted to
--     its validator, who approves or refuses with a reason;
--   * the director's proposal (intention, découpage) is submitted, then
--     approved or sent back by the creative side;
--   * the company reports its preproduction's progress, proposes places and
--     the director of photography lists his gear, each through a private link.

-- 1. Organisation and roles ------------------------------------------------------------

alter table public.production_sheets
  add column organization text,
  add column company_contact_id uuid references public.network_contacts (id),
  add column line_producer_person_id uuid references public.people (id),
  add column quote_validator_person_id uuid references public.people (id),
  add column dop_person_id uuid references public.people (id),
  add column dop_contact_id uuid references public.network_contacts (id),
  add column organized_at timestamptz,
  add column organized_by uuid references public.people (id),
  add column company_progress jsonb not null default '{}'::jsonb,
  add column company_progress_at timestamptz,
  add column direction_status text not null default 'draft',
  add column direction_submitted_at timestamptz,
  add column direction_decided_by uuid references public.people (id),
  add column direction_decided_at timestamptz,
  add column direction_comment text,
  add constraint production_sheets_organization_check
    check (organization is null or organization in ('internal', 'external')),
  add constraint production_sheets_company_check
    check (organization is distinct from 'external' or company_contact_id is not null),
  add constraint production_sheets_dop_check check (dop_person_id is null or dop_contact_id is null),
  add constraint production_sheets_progress_check check (jsonb_typeof(company_progress) = 'object'),
  add constraint production_sheets_direction_status_check
    check (direction_status in ('draft', 'submitted', 'approved', 'changes')),
  add constraint production_sheets_direction_comment_check
    check (direction_comment is null or char_length(direction_comment) <= 1000);

-- Sheets opened before: PDS piloted them.
update public.production_sheets set organization = 'internal', organized_at = opened_at
 where organization is null;

-- The line producer organises the Production of the project like its owner.
create or replace function public.production_can_organize(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.project_stage_in_progress(p_project_id, 'production')
     and (public.is_project_owner(p_project_id)
          or exists (select 1 from public.production_sheets s
                      where s.project_id = p_project_id
                        and s.line_producer_person_id = public.auth_person_id()
                        and public.production_person_is_member(s.line_producer_person_id,
                                                                s.organization_id)));
$$;

-- A member given a role on a production (line producer, quote validator,
-- director of photography) sees its project, as a creative director does.
create or replace function public.can_see_project_row(p_organization_id uuid, p_project_id uuid, p_owner_person_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_member(p_organization_id)
    and (
      public.has_permission(p_organization_id, 'view_all_projects')
      or (p_owner_person_id is not null and p_owner_person_id = public.auth_person_id())
      or exists (select 1 from public.project_assignments pa
                 where pa.project_id = p_project_id and pa.status = 'pending'
                   and pa.assignee_person_id = public.auth_person_id())
      or exists (select 1 from public.project_creatives pc
                 where pc.project_id = p_project_id and pc.person_id = public.auth_person_id())
      or exists (select 1 from public.production_sheets ps
                 where ps.project_id = p_project_id
                   and public.auth_person_id() in (ps.line_producer_person_id,
                                                   ps.quote_validator_person_id, ps.dop_person_id))
    );
$$;

-- « Lancer la production » (the owner): who produces and who holds each role.
create function public.set_production_organization(
  p_sheet_id uuid, p_organization text, p_company_contact_id uuid,
  p_line_producer_person_id uuid, p_quote_validator_person_id uuid,
  p_dop_person_id uuid, p_dop_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
  v_before jsonb;
begin
  select * into s from public.production_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.is_project_owner(s.project_id)
     or not public.project_stage_in_progress(s.project_id, 'production') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_organization is null or p_organization not in ('internal', 'external') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if p_organization = 'external' and p_company_contact_id is null then
    raise exception 'company_required';
  end if;
  if p_quote_validator_person_id is null then
    raise exception 'quote_validator_required';
  end if;
  if p_dop_person_id is not null and p_dop_contact_id is not null then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(array[p_line_producer_person_id, p_quote_validator_person_id,
                                        p_dop_person_id]) x(id)
              where x.id is not null
                and not public.production_person_is_member(x.id, s.organization_id)) then
    raise exception 'person_not_member' using errcode = '23514';
  end if;
  if exists (select 1 from unnest(array[p_company_contact_id, p_dop_contact_id]) x(id)
              where x.id is not null and not exists (
                select 1 from public.network_contacts c
                 where c.id = x.id and c.organization_id = s.organization_id
                   and c.archived_at is null)) then
    raise exception 'contact_not_found' using errcode = '23514';
  end if;
  v_before := jsonb_build_object('organization', s.organization, 'company', s.company_contact_id);
  update public.production_sheets
     set organization = p_organization,
         company_contact_id = case when p_organization = 'external' then p_company_contact_id end,
         line_producer_person_id = p_line_producer_person_id,
         quote_validator_person_id = p_quote_validator_person_id,
         dop_person_id = p_dop_person_id, dop_contact_id = p_dop_contact_id,
         organized_at = now(), organized_by = public.auth_person_id()
   where id = s.id;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'sheet', s.id, 'organized',
    v_before, jsonb_build_object('organization', p_organization, 'company', p_company_contact_id));
  -- Members given a role are told.
  insert into public.notifications
    (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
  select s.organization_id, x.id, public.auth_person_id(), 'production_organized', s.project_id,
         s.deliverable_id
    from (select distinct unnest(array[p_line_producer_person_id, p_quote_validator_person_id,
                                       p_dop_person_id]) as id) x
   where x.id is not null and x.id is distinct from public.auth_person_id();
end;
$$;
revoke execute on function public.set_production_organization(uuid, text, uuid, uuid, uuid, uuid, uuid)
  from public, anon;
grant execute on function public.set_production_organization(uuid, text, uuid, uuid, uuid, uuid, uuid)
  to authenticated;

-- 2. Quotes: deposited, checked, submitted, decided ------------------------------------

create table public.production_quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  label text not null,
  amount_cents bigint not null,
  delivery_on date,
  url text,
  file_id uuid references public.production_files (id) on delete set null,
  note text,
  -- A member, or nobody: the company through its link.
  deposited_by uuid references public.people (id),
  deposited_at timestamptz not null default now(),
  status text not null default 'deposited',
  checks jsonb not null default '{}'::jsonb,
  check_note text,
  submitted_by uuid references public.people (id),
  submitted_at timestamptz,
  decided_by uuid references public.people (id),
  decided_at timestamptz,
  reason text,
  constraint production_quotes_label_check check (btrim(label) <> '' and char_length(label) <= 200),
  constraint production_quotes_amount_check check (amount_cents >= 0 and amount_cents <= 100000000000),
  constraint production_quotes_url_check
    check (url is null or (url ~ '^https://\S+$' and char_length(url) <= 2000)),
  constraint production_quotes_status_check
    check (status in ('deposited', 'submitted', 'approved', 'rejected')),
  constraint production_quotes_reason_check
    check ((status <> 'rejected' or btrim(coalesce(reason, '')) <> '')
           and coalesce(char_length(reason), 0) <= 1000),
  constraint production_quotes_texts_check
    check (coalesce(char_length(note), 0) <= 1000 and coalesce(char_length(check_note), 0) <= 1000),
  constraint production_quotes_checks_check check (jsonb_typeof(checks) = 'object'),
  constraint production_quotes_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade
);
create index production_quotes_sheet_idx on public.production_quotes (sheet_id, deposited_at desc);
alter table public.production_quotes enable row level security;
alter table public.production_quotes force row level security;
revoke all on table public.production_quotes from anon, authenticated;
grant select on public.production_quotes to authenticated;
create policy production_quotes_select on public.production_quotes
  for select to authenticated using (public.can_see_project(project_id));

-- Who handles a quote: the line producer, else the owner.
create function public.production_quote_handler(p_sheet_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(s.line_producer_person_id, p.owner_person_id)
    from public.production_sheets s join public.projects p on p.id = s.project_id
   where s.id = p_sheet_id;
$$;
revoke execute on function public.production_quote_handler(uuid) from public, anon, authenticated;

create function public.production_quote_insert(
  s public.production_sheets, p_label text, p_amount_cents bigint, p_delivery_on date,
  p_url text, p_note text, p_by uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.production_quotes
    (organization_id, project_id, sheet_id, label, amount_cents, delivery_on, url, note, deposited_by)
  values (s.organization_id, s.project_id, s.id, btrim(coalesce(p_label, '')), p_amount_cents,
          p_delivery_on, nullif(btrim(coalesce(p_url, '')), ''), nullif(btrim(coalesce(p_note, '')), ''),
          p_by)
  returning id into v_id;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'quote', v_id, 'deposited',
    null, jsonb_build_object('label', p_label, 'amount', p_amount_cents));
  return v_id;
end;
$$;
revoke execute on function public.production_quote_insert(public.production_sheets, text, bigint, date, text, text, uuid)
  from public, anon, authenticated;

-- A quote added in the app (the line producer or the owner).
create function public.add_production_quote(
  p_sheet_id uuid, p_label text, p_amount_cents bigint, p_delivery_on date, p_url text, p_note text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
begin
  select * into s from public.production_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(s.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return public.production_quote_insert(s, p_label, p_amount_cents, p_delivery_on, p_url, p_note,
                                        public.auth_person_id());
end;
$$;
revoke execute on function public.add_production_quote(uuid, text, bigint, date, text, text) from public, anon;
grant execute on function public.add_production_quote(uuid, text, bigint, date, text, text) to authenticated;

-- « Vérifié, soumettre » (the line producer or the owner): every point checked.
create function public.submit_production_quote(p_quote_id uuid, p_checks jsonb, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.production_quotes%rowtype;
  s public.production_sheets%rowtype;
begin
  select * into q from public.production_quotes where id = p_quote_id for update;
  if not found or not public.can_see_project(q.project_id) then
    raise exception 'quote_not_found';
  end if;
  if not public.production_can_organize(q.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if q.status <> 'deposited' then
    raise exception 'quote_not_deposited';
  end if;
  if jsonb_typeof(coalesce(p_checks, 'null'::jsonb)) <> 'object'
     or not (p_checks ?& array['amount', 'delay', 'scope'])
     or exists (select 1 from jsonb_each(p_checks) e where e.value <> 'true'::jsonb) then
    raise exception 'checks_incomplete';
  end if;
  select * into s from public.production_sheets where id = q.sheet_id;
  if s.quote_validator_person_id is null then
    raise exception 'quote_validator_required';
  end if;
  update public.production_quotes
     set status = 'submitted', checks = p_checks, check_note = nullif(btrim(coalesce(p_note, '')), ''),
         submitted_by = public.auth_person_id(), submitted_at = now()
   where id = q.id;
  perform public.production_log(q.organization_id, q.project_id, q.sheet_id, 'quote', q.id,
    'submitted', null, jsonb_build_object('label', q.label));
  if s.quote_validator_person_id is distinct from public.auth_person_id() then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (q.organization_id, s.quote_validator_person_id, public.auth_person_id(),
            'production_quote_submitted', q.project_id, s.deliverable_id);
  end if;
end;
$$;
revoke execute on function public.submit_production_quote(uuid, jsonb, text) from public, anon;
grant execute on function public.submit_production_quote(uuid, jsonb, text) to authenticated;

-- « Valider » / « Refuser » (the quote's validator only).
create function public.decide_production_quote(p_quote_id uuid, p_approve boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.production_quotes%rowtype;
  s public.production_sheets%rowtype;
  v_handler uuid;
begin
  select * into q from public.production_quotes where id = p_quote_id for update;
  if not found or not public.can_see_project(q.project_id) then
    raise exception 'quote_not_found';
  end if;
  select * into s from public.production_sheets where id = q.sheet_id;
  if s.quote_validator_person_id is distinct from public.auth_person_id()
     or not public.project_stage_in_progress(q.project_id, 'production') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if q.status <> 'submitted' then
    raise exception 'quote_not_submitted';
  end if;
  if not coalesce(p_approve, false) and btrim(coalesce(p_reason, '')) = '' then
    raise exception 'reason_required';
  end if;
  update public.production_quotes
     set status = case when p_approve then 'approved' else 'rejected' end,
         reason = case when p_approve then null else btrim(p_reason) end,
         decided_by = public.auth_person_id(), decided_at = now()
   where id = q.id;
  perform public.production_log(q.organization_id, q.project_id, q.sheet_id, 'quote', q.id,
    case when p_approve then 'approved' else 'rejected' end, null,
    jsonb_build_object('label', q.label, 'reason', nullif(btrim(coalesce(p_reason, '')), '')));
  v_handler := public.production_quote_handler(q.sheet_id);
  if v_handler is not null and v_handler is distinct from public.auth_person_id() then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (q.organization_id, v_handler, public.auth_person_id(), 'production_quote_decided',
            q.project_id, s.deliverable_id);
  end if;
end;
$$;
revoke execute on function public.decide_production_quote(uuid, boolean, text) from public, anon;
grant execute on function public.decide_production_quote(uuid, boolean, text) to authenticated;

-- 3. The director's proposal --------------------------------------------------------------

-- Changing the proposal after it was submitted or approved takes it back to a draft.
create function public.production_direction_reset()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.direction_status = old.direction_status and old.direction_status <> 'draft'
     and (new.staging_intent, new.run_of_show, new.references_note)
         is distinct from (old.staging_intent, old.run_of_show, old.references_note) then
    new.direction_status := 'draft';
  end if;
  return new;
end;
$$;
revoke execute on function public.production_direction_reset() from public, anon, authenticated;
create trigger c_direction_reset before update on public.production_sheets
  for each row execute function public.production_direction_reset();

create function public.production_direction_submit(s public.production_sheets)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if btrim(coalesce(s.staging_intent, '')) = '' or btrim(coalesce(s.run_of_show, '')) = '' then
    raise exception 'direction_incomplete';
  end if;
  update public.production_sheets
     set direction_status = 'submitted', direction_submitted_at = now(), direction_comment = null
   where id = s.id;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'direction', s.id,
    'submitted', null, jsonb_build_object('status', 'submitted'));
  -- The creative side and the owner are told.
  insert into public.notifications
    (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
  select s.organization_id, x.id, public.auth_person_id(), 'production_direction_submitted',
         s.project_id, s.deliverable_id
    from (select pc.person_id as id from public.project_creatives pc where pc.project_id = s.project_id
          union select p.owner_person_id from public.projects p where p.id = s.project_id) x
   where x.id is not null and x.id is distinct from public.auth_person_id();
end;
$$;
revoke execute on function public.production_direction_submit(public.production_sheets) from public, anon, authenticated;

-- « Envoyer la proposition » (whoever writes the director's brief).
create function public.submit_production_direction(p_sheet_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
begin
  select * into s from public.production_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_brief_can_write(p_sheet_id) and not public.production_can_organize(s.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  perform public.production_direction_submit(s);
end;
$$;
revoke execute on function public.submit_production_direction(uuid) from public, anon;
grant execute on function public.submit_production_direction(uuid) to authenticated;

-- « Valider » / « Demander des modifications » (the owner or a creative director).
create function public.decide_production_direction(p_sheet_id uuid, p_approve boolean, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
begin
  select * into s from public.production_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_review(s.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if s.direction_status <> 'submitted' then
    raise exception 'direction_not_submitted';
  end if;
  if not coalesce(p_approve, false) and btrim(coalesce(p_comment, '')) = '' then
    raise exception 'reason_required';
  end if;
  update public.production_sheets
     set direction_status = case when p_approve then 'approved' else 'changes' end,
         direction_comment = case when p_approve then null else btrim(p_comment) end,
         direction_decided_by = public.auth_person_id(), direction_decided_at = now()
   where id = s.id;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'direction', s.id,
    case when p_approve then 'approved' else 'changes' end, null,
    jsonb_build_object('comment', nullif(btrim(coalesce(p_comment, '')), '')));
  insert into public.notifications
    (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
  select s.organization_id, x.id, public.auth_person_id(), 'production_direction_decided',
         s.project_id, s.deliverable_id
    from (select s.director_person_id as id
          union select p.owner_person_id from public.projects p where p.id = s.project_id) x
   where x.id is not null and x.id is distinct from public.auth_person_id();
end;
$$;
revoke execute on function public.decide_production_direction(uuid, boolean, text) from public, anon;
grant execute on function public.decide_production_direction(uuid, boolean, text) to authenticated;

-- 4. What each provider does through its private link ----------------------------------------

-- The roles a link's contact holds on its sheet.
create function public.production_link_roles(v public.production_provider_links)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_remove(array[
    case when s.company_contact_id = v.contact_id then 'company' end,
    case when s.director_contact_id = v.contact_id then 'director' end,
    case when s.dop_contact_id = v.contact_id then 'dop' end], null)
    from public.production_sheets s where s.id = v.sheet_id;
$$;
revoke execute on function public.production_link_roles(public.production_provider_links) from public, anon, authenticated;

create function public.production_link_for_role(p_token text, p_role text)
returns public.production_provider_links
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
begin
  v := public.production_link_of(p_token, true);
  if v.id is null then
    raise exception 'link_closed';
  end if;
  if not public.project_stage_in_progress(v.project_id, 'production') then
    raise exception 'stage_locked';
  end if;
  if not (p_role = any (public.production_link_roles(v))) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return v;
end;
$$;
revoke execute on function public.production_link_for_role(text, text) from public, anon, authenticated;

-- The company deposits its quote.
create function public.deposit_production_quote_by_link(
  p_token text, p_label text, p_amount_cents bigint, p_delivery_on date, p_url text, p_note text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
  s public.production_sheets%rowtype;
  v_handler uuid;
begin
  v := public.production_link_for_role(p_token, 'company');
  select * into s from public.production_sheets where id = v.sheet_id;
  perform public.production_quote_insert(s, p_label, p_amount_cents, p_delivery_on, p_url, p_note, null);
  v_handler := public.production_quote_handler(s.id);
  if v_handler is not null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (s.organization_id, v_handler, null, 'production_quote_deposited', s.project_id,
            s.deliverable_id);
  end if;
end;
$$;
revoke execute on function public.deposit_production_quote_by_link(text, text, bigint, date, text, text) from public;
grant execute on function public.deposit_production_quote_by_link(text, text, bigint, date, text, text)
  to anon, authenticated;

-- The company says where its preproduction stands.
create function public.set_production_progress_by_link(p_token text, p_key text, p_done boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
begin
  v := public.production_link_for_role(p_token, 'company');
  if p_key not in ('calls', 'gear', 'crew', 'schedule') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  update public.production_sheets
     set company_progress = company_progress || jsonb_build_object(p_key, coalesce(p_done, false)),
         company_progress_at = now()
   where id = v.sheet_id;
  perform public.production_log(v.organization_id, v.project_id, v.sheet_id, 'company', v.sheet_id,
    'progress', null, jsonb_build_object('key', p_key, 'done', coalesce(p_done, false)));
end;
$$;
revoke execute on function public.set_production_progress_by_link(text, text, boolean) from public;
grant execute on function public.set_production_progress_by_link(text, text, boolean) to anon, authenticated;

-- The company proposes a place (then given opinions and chosen in the app).
create function public.propose_production_location_by_link(
  p_token text, p_name text, p_address text, p_price_cents bigint, p_availability text,
  p_constraints text, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
begin
  v := public.production_link_for_role(p_token, 'company');
  insert into public.production_location_options
    (organization_id, project_id, sheet_id, name, address, price_cents, availability, constraints,
     url, position)
  values (v.organization_id, v.project_id, v.sheet_id, btrim(coalesce(p_name, '')),
          nullif(btrim(coalesce(p_address, '')), ''), p_price_cents,
          nullif(btrim(coalesce(p_availability, '')), ''), nullif(btrim(coalesce(p_constraints, '')), ''),
          nullif(btrim(coalesce(p_url, '')), ''),
          coalesce((select max(position) + 1 from public.production_location_options
                     where sheet_id = v.sheet_id), 0));
end;
$$;
revoke execute on function public.propose_production_location_by_link(text, text, text, bigint, text, text, text) from public;
grant execute on function public.propose_production_location_by_link(text, text, text, bigint, text, text, text)
  to anon, authenticated;

-- The director writes and sends the proposal (intention, découpage, references).
create function public.submit_production_direction_by_link(
  p_token text, p_staging_intent text, p_run_of_show text, p_references_note text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
  s public.production_sheets%rowtype;
begin
  v := public.production_link_for_role(p_token, 'director');
  if coalesce(char_length(p_staging_intent), 0) > 4000 or coalesce(char_length(p_run_of_show), 0) > 4000
     or coalesce(char_length(p_references_note), 0) > 4000 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  update public.production_sheets
     set staging_intent = nullif(btrim(coalesce(p_staging_intent, '')), ''),
         run_of_show = nullif(btrim(coalesce(p_run_of_show, '')), ''),
         references_note = nullif(btrim(coalesce(p_references_note, '')), ''),
         brief_updated_at = now(), brief_updated_by = null
   where id = v.sheet_id
  returning * into s;
  perform public.production_direction_submit(s);
end;
$$;
revoke execute on function public.submit_production_direction_by_link(text, text, text, text) from public;
grant execute on function public.submit_production_direction_by_link(text, text, text, text) to anon, authenticated;

-- The director of photography lists his gear: needs to price, never booked.
create function public.add_production_gear_by_link(p_token text, p_lines jsonb)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
  v_line jsonb;
  v_n integer := 0;
  v_pos integer;
begin
  v := public.production_link_for_role(p_token, 'dop');
  if jsonb_typeof(coalesce(p_lines, 'null'::jsonb)) <> 'array' or jsonb_array_length(p_lines) > 50 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  select coalesce(max(position) + 1, 0) into v_pos from public.production_equipment where sheet_id = v.sheet_id;
  for v_line in select * from jsonb_array_elements(p_lines) loop
    if btrim(coalesce(v_line ->> 'label', '')) = '' then
      continue;
    end if;
    insert into public.production_equipment
      (organization_id, project_id, sheet_id, category, label, quantity, status, source, note, position)
    values (v.organization_id, v.project_id, v.sheet_id,
            case when v_line ->> 'category' in ('image', 'light', 'sound') then v_line ->> 'category' else 'other' end,
            left(btrim(v_line ->> 'label'), 200),
            case when (v_line ->> 'quantity') ~ '^[0-9]{1,4}$' and (v_line ->> 'quantity')::integer between 1 and 1000
                 then (v_line ->> 'quantity')::integer end,
            'need', 'rental', 'Liste du chef opérateur', v_pos + v_n);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
revoke execute on function public.add_production_gear_by_link(text, jsonb) from public;
grant execute on function public.add_production_gear_by_link(text, jsonb) to anon, authenticated;

-- A link may be created for the company, the director and the director of photography.
create or replace function public.create_production_provider_link(p_sheet_id uuid, p_contact_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
  v_token text;
  v_end date;
  v_days integer;
begin
  select * into s from public.production_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(s.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_contact_id is distinct from s.company_contact_id
     and p_contact_id is distinct from s.director_contact_id
     and p_contact_id is distinct from s.dop_contact_id
     and not exists (select 1 from public.production_post_steps st
                      where st.sheet_id = s.id and st.contact_id = p_contact_id)
     and not exists (select 1 from public.production_correction_requests r
                      where r.sheet_id = s.id and r.contact_id = p_contact_id)
     and not exists (select 1 from public.production_location_consults c
                      where c.sheet_id = s.id and c.contact_id = p_contact_id) then
    raise exception 'not_a_provider';
  end if;
  select max(st.ends_on) into v_end from public.production_post_steps st
   where st.sheet_id = s.id and st.contact_id = p_contact_id;
  v_days := least(180, greatest(30,
    coalesce(v_end - (now() at time zone 'Europe/Paris')::date, 0) + 60));

  update public.production_provider_links set revoked_at = now()
   where sheet_id = s.id and contact_id = p_contact_id and revoked_at is null;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.production_provider_links
    (organization_id, project_id, sheet_id, contact_id, token_hash, expires_at, created_by)
  values (s.organization_id, s.project_id, s.id, p_contact_id,
          encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), now() + make_interval(days => v_days),
          public.auth_person_id());
  return v_token;
end;
$$;

-- What the link shows of the journey: the contact's roles, the company's
-- quotes and progress, the director's proposal, the actions held by the
-- contact. Read by the provider's page next to get_production_provider_space.
create function public.get_production_link_journey(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
  s public.production_sheets%rowtype;
begin
  v := public.production_link_of(p_token, false);
  if v.id is null then
    return null;
  end if;
  select * into s from public.production_sheets where id = v.sheet_id;
  return jsonb_build_object(
    'roles', to_jsonb(public.production_link_roles(v)),
    'organization', s.organization,
    'envelopeCents', s.budget_envelope_cents,
    'deliveryOn', s.delivery_date,
    'progress', s.company_progress,
    'direction', jsonb_build_object('status', s.direction_status, 'comment', s.direction_comment,
      'stagingIntent', s.staging_intent, 'runOfShow', s.run_of_show, 'references', s.references_note),
    'quotes', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'label', q.label,
        'amountCents', q.amount_cents, 'deliveryOn', q.delivery_on, 'status', q.status,
        'reason', q.reason, 'depositedAt', q.deposited_at) order by q.deposited_at desc)
      from public.production_quotes q where q.sheet_id = s.id), '[]'::jsonb),
    'gearCount', (select count(*) from public.production_equipment e where e.sheet_id = s.id),
    'locations', coalesce((select jsonb_agg(jsonb_build_object('name', o.name, 'status', o.status)
        order by o.position, o.created_at)
      from public.production_location_options o where o.sheet_id = s.id and o.status <> 'discarded'), '[]'::jsonb),
    'actions', coalesce((select jsonb_agg(jsonb_build_object('title', a.title, 'dueDate', a.due_date)
        order by a.due_date nulls last, a.position)
      from public.production_plan_actions a
      where a.sheet_id = s.id and a.contact_id = v.contact_id and a.status = 'approved'), '[]'::jsonb));
end;
$$;
revoke execute on function public.get_production_link_journey(text) from public;
grant execute on function public.get_production_link_journey(text) to anon, authenticated;

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind = any (array[
    'project_transmitted', 'project_accepted', 'project_refused',
    'project_clarification_requested', 'validation_requested', 'validation_approved',
    'validation_rejected', 'task_assigned', 'project_creative_added',
    'design_version_submitted', 'design_version_approved', 'design_version_changes_requested',
    'contract_review_requested', 'contract_approved', 'contract_changes_requested',
    'meeting_invited', 'master_transmission_received', 'master_mix_version_received',
    'master_mix_approved', 'master_mix_changes_requested', 'master_mastering_version_received',
    'master_final_approved', 'master_mastering_changes_requested', 'clearance_terms_proposed',
    'clearance_terms_validated', 'clearance_terms_rejected', 'strategy_review_requested',
    'strategy_review_approved', 'strategy_review_changes_requested', 'strategy_review_reminder',
    'project_launched', 'brief_approved', 'call_invited', 'master_delivery_received',
    'master_mastering_delivery_received', 'legal_form_received', 'call_report_shared',
    'master_engineer_signal', 'design_version_discarded', 'design_submission_requested',
    'design_submission_decided',
    'production_version_submitted', 'production_corrections_sent',
    'production_export_deposited', 'production_shoot_started',
    'production_call_sheet_published', 'production_step_done', 'production_handed_off',
    'production_organized', 'production_quote_deposited', 'production_quote_submitted',
    'production_quote_decided', 'production_direction_submitted',
    'production_direction_decided'])) not valid;
