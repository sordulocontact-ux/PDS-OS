-- The director's proposal in versions (proto « Projet complet » BODY.creative,
-- docs/projet-complet/production.md § 2.8, PR-11):
--   * the director deposits a version — V1, V2… numbered by the database —
--     with its treatment, moodboard and technical découpage (links to the
--     PDFs, like the quote's PDF: « Joignez au moins le traitement et le
--     découpage »);
--   * the internal creative validation decides it (« Valider la Vn » /
--     « Demander des modifications », a comment required to ask) and, when
--     « Qui fait quoi » names one, the external creative validation (the
--     artist's management, through its private link) decides it too — in
--     addition to the internal one, never in its place;
--   * the version retained is the latest one both validated; « Demander une
--     nouvelle version » keeps it retained until the next one is (proto rule
--     14: a validated decision is replaced, never erased).
-- The sheet's direction_status follows the versions (draft, submitted,
-- approved, changes) so the readers already written keep working.

-- 1. The external creative validation, a role of « Qui fait quoi » ------------------

alter table public.production_sheets
  add column creative_ext_contact_id uuid,
  add column direction_revision_by uuid references public.people (id),
  add constraint production_sheets_creative_ext_same_org
    foreign key (creative_ext_contact_id, organization_id)
    references public.network_contacts (id, organization_id);

-- The roles a link's contact holds on its sheet: + the external validation.
create or replace function public.production_link_roles(v public.production_provider_links)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_remove(array[
    case when s.company_contact_id = v.contact_id then 'company' end,
    case when s.director_contact_id = v.contact_id then 'director' end,
    case when s.dop_contact_id = v.contact_id then 'dop' end,
    case when s.creative_ext_contact_id = v.contact_id then 'creativeExt' end], null)
    from public.production_sheets s where s.id = v.sheet_id;
$$;
revoke execute on function public.production_link_roles(public.production_provider_links) from public, anon, authenticated;

-- A link may be made for the external validation too.
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
     and p_contact_id is distinct from s.creative_ext_contact_id
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

-- 2. The versions ----------------------------------------------------------------------

create table public.production_direction_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  number integer not null,
  treatment_url text not null,
  moodboard_url text,
  cutting_url text not null,
  note text,
  deposited_by_person uuid references public.people (id),
  deposited_by_contact uuid,
  deposited_at timestamptz not null default now(),
  int_status text not null default 'pending',
  int_by uuid references public.people (id),
  int_at timestamptz,
  int_comment text,
  ext_status text not null default 'none',
  ext_contact_id uuid,
  ext_at timestamptz,
  ext_comment text,
  constraint production_direction_versions_number_key unique (sheet_id, number),
  constraint production_direction_versions_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_direction_versions_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint production_direction_versions_contact_same_org foreign key (deposited_by_contact, organization_id)
    references public.network_contacts (id, organization_id),
  constraint production_direction_versions_ext_same_org foreign key (ext_contact_id, organization_id)
    references public.network_contacts (id, organization_id),
  constraint production_direction_versions_urls_check check (
    treatment_url ~ '^https://\S+$' and char_length(treatment_url) <= 2000
    and cutting_url ~ '^https://\S+$' and char_length(cutting_url) <= 2000
    and (moodboard_url is null or (moodboard_url ~ '^https://\S+$' and char_length(moodboard_url) <= 2000))),
  constraint production_direction_versions_status_check check (
    int_status in ('pending', 'approved', 'changes')
    and ext_status in ('none', 'pending', 'approved', 'changes')),
  constraint production_direction_versions_texts_check check (
    coalesce(char_length(note), 0) <= 2000 and coalesce(char_length(int_comment), 0) <= 2000
    and coalesce(char_length(ext_comment), 0) <= 2000),
  constraint production_direction_versions_by_check check (
    deposited_by_person is null or deposited_by_contact is null)
);
create index production_direction_versions_sheet_idx
  on public.production_direction_versions (sheet_id, number desc);

alter table public.production_direction_versions enable row level security;
alter table public.production_direction_versions force row level security;
revoke all on public.production_direction_versions from anon, authenticated;
grant select on public.production_direction_versions to authenticated;
-- Read by whoever sees the project; written only by the functions below.
create policy production_direction_versions_select on public.production_direction_versions
  for select to authenticated using (public.can_see_project(project_id));

-- The version retained: the latest validated inside and, when asked, outside.
create function public.production_direction_retained(p_sheet_id uuid)
returns public.production_direction_versions
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.production_direction_versions v
   where v.sheet_id = p_sheet_id and v.int_status = 'approved'
     and v.ext_status in ('approved', 'none')
   order by v.number desc limit 1;
$$;
revoke execute on function public.production_direction_retained(uuid) from public, anon, authenticated;

-- The sheet's direction_status from its versions (readers written before).
create function public.production_direction_sync(p_sheet_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.production_direction_versions%rowtype;
  l public.production_direction_versions%rowtype;
begin
  select * into l from public.production_direction_versions
   where sheet_id = p_sheet_id order by number desc limit 1;
  if l.id is null then
    return;
  end if;
  r := public.production_direction_retained(p_sheet_id);
  if r.id is not null then
    update public.production_sheets
       set direction_status = 'approved', direction_comment = null,
           direction_decided_by = coalesce(r.int_by, direction_decided_by),
           direction_decided_at = greatest(r.int_at, r.ext_at)
     where id = p_sheet_id and (direction_status <> 'approved'
                                or direction_decided_at is distinct from greatest(r.int_at, r.ext_at));
  elsif l.int_status = 'changes' or l.ext_status = 'changes' then
    update public.production_sheets
       set direction_status = 'changes',
           direction_comment = left(coalesce(l.int_comment, l.ext_comment), 1000),
           direction_decided_by = l.int_by, direction_decided_at = greatest(l.int_at, l.ext_at)
     where id = p_sheet_id;
  else
    update public.production_sheets
       set direction_status = 'submitted', direction_submitted_at = l.deposited_at,
           direction_comment = null
     where id = p_sheet_id and direction_status <> 'submitted';
  end if;
end;
$$;
revoke execute on function public.production_direction_sync(uuid) from public, anon, authenticated;

select public.add_notification_kinds(array['production_direction_submitted',
                                           'production_direction_decided']);

-- The body of a deposit, in the app or through the director's link.
create function public.production_direction_deposit(
  p_sheet_id uuid, p_treatment text, p_moodboard text, p_cutting text, p_note text,
  p_person uuid, p_contact uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
  l public.production_direction_versions%rowtype;
  r public.production_direction_versions%rowtype;
  v_t text := nullif(btrim(coalesce(p_treatment, '')), '');
  v_m text := nullif(btrim(coalesce(p_moodboard, '')), '');
  v_c text := nullif(btrim(coalesce(p_cutting, '')), '');
  v_n text := nullif(btrim(coalesce(p_note, '')), '');
  v_number integer;
  v_id uuid;
begin
  select * into s from public.production_sheets where id = p_sheet_id for update;
  if v_t is null or v_c is null then
    raise exception 'pieces_required';
  end if;
  if v_t !~ '^https://\S+$' or v_c !~ '^https://\S+$'
     or (v_m is not null and v_m !~ '^https://\S+$')
     or greatest(char_length(v_t), char_length(v_c), coalesce(char_length(v_m), 0)) > 2000 then
    raise exception 'invalid_url';
  end if;
  if v_n is not null and char_length(v_n) > 2000 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  select * into l from public.production_direction_versions
   where sheet_id = s.id order by number desc limit 1;
  r := public.production_direction_retained(s.id);
  -- A new version once the last one is sent back, or asked again after it
  -- was retained (proto: never while one waits for its decision).
  if l.id is not null and not (l.int_status = 'changes' or l.ext_status = 'changes'
                               or (r.id = l.id and s.direction_revision_at is not null)) then
    raise exception 'version_pending';
  end if;
  v_number := coalesce(l.number, 0) + 1;
  insert into public.production_direction_versions
    (organization_id, project_id, sheet_id, number, treatment_url, moodboard_url, cutting_url,
     note, deposited_by_person, deposited_by_contact, ext_status)
  values (s.organization_id, s.project_id, s.id, v_number, v_t, v_m, v_c, v_n, p_person, p_contact,
          case when s.creative_ext_contact_id is not null then 'pending' else 'none' end)
  returning id into v_id;
  update public.production_sheets
     set direction_revision_reason = null, direction_revision_at = null, direction_revision_by = null
   where id = s.id;
  perform public.production_direction_sync(s.id);
  perform public.production_log(s.organization_id, s.project_id, s.id, 'direction', v_id,
    'deposited', null, jsonb_build_object('number', v_number));
  -- The internal creative validation and the owner are told.
  insert into public.notifications
    (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
  select s.organization_id, x.id, public.auth_person_id(), 'production_direction_submitted',
         s.project_id, s.deliverable_id
    from (select pc.person_id as id from public.project_creatives pc where pc.project_id = s.project_id
          union select p.owner_person_id from public.projects p where p.id = s.project_id) x
   where x.id is not null and x.id is distinct from public.auth_person_id();
  return v_number;
end;
$$;
revoke execute on function public.production_direction_deposit(uuid, text, text, text, text, uuid, uuid) from public, anon, authenticated;

-- « Déposer la Vn » in the app: the director when a member, or whoever
-- organises the production, for the director.
create function public.deposit_production_direction_version(
  p_sheet_id uuid, p_treatment text, p_moodboard text, p_cutting text, p_note text)
returns integer
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
  if not public.project_stage_in_progress(s.project_id, 'production') or s.closed_at is not null
     or not (public.production_can_organize(s.project_id)
             or s.director_person_id = public.auth_person_id()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return public.production_direction_deposit(s.id, p_treatment, p_moodboard, p_cutting, p_note,
    public.auth_person_id(), null);
end;
$$;
revoke execute on function public.deposit_production_direction_version(uuid, text, text, text, text) from public, anon;
grant execute on function public.deposit_production_direction_version(uuid, text, text, text, text) to authenticated;

-- « Déposer la Vn » on the director's private link.
create function public._deposit_production_direction_by_link_h(
  p_link_hash text, p_treatment text, p_moodboard text, p_cutting text, p_note text)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
begin
  v := public._production_link_for_role_h(p_link_hash, 'director');
  return public.production_direction_deposit(v.sheet_id, p_treatment, p_moodboard, p_cutting,
    p_note, null, v.contact_id);
end;
$$;
revoke execute on function public._deposit_production_direction_by_link_h(text, text, text, text, text) from public, anon, authenticated;

create function public.deposit_production_direction_by_link(
  p_token text, p_treatment text, p_moodboard text, p_cutting text, p_note text)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return public._deposit_production_direction_by_link_h(public.link_token_hash(p_token),
    p_treatment, p_moodboard, p_cutting, p_note);
end;
$$;
revoke execute on function public.deposit_production_direction_by_link(text, text, text, text, text) from public;
grant execute on function public.deposit_production_direction_by_link(text, text, text, text, text) to anon, authenticated;

create function public.deposit_production_direction_by_link(
  p_contact_token text, p_item_id uuid, p_treatment text, p_moodboard text, p_cutting text, p_note text)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return public._deposit_production_direction_by_link_h(
    public.contact_item_hash('provider', p_contact_token, p_item_id),
    p_treatment, p_moodboard, p_cutting, p_note);
end;
$$;
revoke execute on function public.deposit_production_direction_by_link(text, uuid, text, text, text, text) from public;
grant execute on function public.deposit_production_direction_by_link(text, uuid, text, text, text, text) to anon, authenticated;

-- 3. The decisions ---------------------------------------------------------------------

-- The body of a decision: one side of the latest version, still waiting.
create function public.production_direction_decide(
  p_version_id uuid, p_side text, p_approve boolean, p_comment text, p_contact uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.production_direction_versions%rowtype;
  s public.production_sheets%rowtype;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_to text := case when coalesce(p_approve, false) then 'approved' else 'changes' end;
begin
  select * into d from public.production_direction_versions where id = p_version_id for update;
  if not found then
    raise exception 'version_not_found';
  end if;
  select * into s from public.production_sheets where id = d.sheet_id for update;
  if exists (select 1 from public.production_direction_versions x
              where x.sheet_id = d.sheet_id and x.number > d.number) then
    raise exception 'version_replaced';
  end if;
  if (p_side = 'int' and d.int_status <> 'pending') or (p_side = 'ext' and d.ext_status <> 'pending') then
    raise exception 'invalid_transition';
  end if;
  if v_to = 'changes' and v_comment is null then
    raise exception 'reason_required';
  end if;
  if v_comment is not null and char_length(v_comment) > 2000 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if p_side = 'int' then
    update public.production_direction_versions
       set int_status = v_to, int_by = public.auth_person_id(), int_at = now(), int_comment = v_comment
     where id = d.id;
  else
    update public.production_direction_versions
       set ext_status = v_to, ext_contact_id = p_contact, ext_at = now(), ext_comment = v_comment
     where id = d.id;
  end if;
  perform public.production_direction_sync(s.id);
  perform public.production_log(s.organization_id, s.project_id, s.id, 'direction', d.id,
    'decided', null, jsonb_build_object('number', d.number, 'side', p_side, 'status', v_to,
                                        'comment', v_comment));
  -- The owner, the director when a member, the creative side for the outside's.
  insert into public.notifications
    (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
  select s.organization_id, x.id, public.auth_person_id(), 'production_direction_decided',
         s.project_id, s.deliverable_id
    from (select s.director_person_id as id
          union select p.owner_person_id from public.projects p where p.id = s.project_id
          union select pc.person_id from public.project_creatives pc
                 where pc.project_id = s.project_id and p_side = 'ext') x
   where x.id is not null and x.id is distinct from public.auth_person_id();
end;
$$;
revoke execute on function public.production_direction_decide(uuid, text, boolean, text, uuid) from public, anon, authenticated;

-- « Valider la Vn » / « Demander des modifications »: the internal creative
-- validation (the owner or a creative director of the project).
create function public.decide_production_direction_version(
  p_version_id uuid, p_approve boolean, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
begin
  select project_id into v_project from public.production_direction_versions where id = p_version_id;
  if v_project is null or not public.can_see_project(v_project) then
    raise exception 'version_not_found';
  end if;
  if not public.production_can_review(v_project) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  perform public.production_direction_decide(p_version_id, 'int', p_approve, p_comment, null);
end;
$$;
revoke execute on function public.decide_production_direction_version(uuid, boolean, text) from public, anon;
grant execute on function public.decide_production_direction_version(uuid, boolean, text) to authenticated;

-- The same, by the external creative validation on its private link.
create function public._decide_production_direction_by_link_h(
  p_link_hash text, p_version_id uuid, p_approve boolean, p_comment text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
begin
  v := public._production_link_for_role_h(p_link_hash, 'creativeExt');
  if not exists (select 1 from public.production_direction_versions d
                  where d.id = p_version_id and d.sheet_id = v.sheet_id) then
    raise exception 'version_not_found';
  end if;
  perform public.production_direction_decide(p_version_id, 'ext', p_approve, p_comment, v.contact_id);
end;
$$;
revoke execute on function public._decide_production_direction_by_link_h(text, uuid, boolean, text) from public, anon, authenticated;

create function public.decide_production_direction_by_link(
  p_token text, p_version_id uuid, p_approve boolean, p_comment text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public._decide_production_direction_by_link_h(public.link_token_hash(p_token),
    p_version_id, p_approve, p_comment);
end;
$$;
revoke execute on function public.decide_production_direction_by_link(text, uuid, boolean, text) from public;
grant execute on function public.decide_production_direction_by_link(text, uuid, boolean, text) to anon, authenticated;

create function public.decide_production_direction_by_link(
  p_contact_token text, p_item_id uuid, p_version_id uuid, p_approve boolean, p_comment text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public._decide_production_direction_by_link_h(
    public.contact_item_hash('provider', p_contact_token, p_item_id), p_version_id, p_approve, p_comment);
end;
$$;
revoke execute on function public.decide_production_direction_by_link(text, uuid, uuid, boolean, text) from public;
grant execute on function public.decide_production_direction_by_link(text, uuid, uuid, boolean, text) to anon, authenticated;

-- « Demander une nouvelle version » (the owner or the creative side): the
-- retained version stays retained until the next one is.
create function public.request_production_direction_version(p_sheet_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
  r public.production_direction_versions%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into s from public.production_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_review(s.project_id) or s.closed_at is not null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_reason is null then
    raise exception 'reason_required';
  end if;
  if char_length(v_reason) > 1000 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  r := public.production_direction_retained(s.id);
  if r.id is null or exists (select 1 from public.production_direction_versions x
                              where x.sheet_id = s.id and x.number > r.number) then
    raise exception 'nothing_retained';
  end if;
  if s.direction_revision_at is not null then
    raise exception 'already_requested';
  end if;
  update public.production_sheets
     set direction_revision_reason = v_reason, direction_revision_at = now(),
         direction_revision_by = public.auth_person_id()
   where id = s.id;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'direction', r.id,
    'version_requested', null, jsonb_build_object('reason', v_reason));
end;
$$;
revoke execute on function public.request_production_direction_version(uuid, text) from public, anon;
grant execute on function public.request_production_direction_version(uuid, text) to authenticated;

-- 4. « Validation créative externe » in « Qui fait quoi » ---------------------------------

-- The owner names the management (a Réseau contact) or nobody. Removed, what
-- waited for it is no longer awaited (proto: « Pas de validation externe »).
create function public.set_production_creative_ext(p_sheet_id uuid, p_contact_id uuid)
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
  if not public.is_project_owner(s.project_id)
     or not public.project_stage_in_progress(s.project_id, 'production') or s.closed_at is not null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_contact_id is not null and not exists (
    select 1 from public.network_contacts c
     where c.id = p_contact_id and c.organization_id = s.organization_id and c.archived_at is null) then
    raise exception 'contact_not_found' using errcode = '23514';
  end if;
  if p_contact_id is not distinct from s.creative_ext_contact_id then
    return;
  end if;
  update public.production_sheets set creative_ext_contact_id = p_contact_id where id = s.id;
  if p_contact_id is null then
    update public.production_direction_versions set ext_status = 'none'
     where sheet_id = s.id and ext_status = 'pending';
    perform public.production_direction_sync(s.id);
  end if;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'sheet', s.id, 'creative_ext',
    jsonb_build_object('contact', s.creative_ext_contact_id), jsonb_build_object('contact', p_contact_id));
end;
$$;
revoke execute on function public.set_production_creative_ext(uuid, uuid) from public, anon;
grant execute on function public.set_production_creative_ext(uuid, uuid) to authenticated;

-- 5. What the links read: the versions for the director and the validation --------------

create or replace function public._get_production_link_journey_h(p_link_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v public.production_provider_links%rowtype;
  s public.production_sheets%rowtype;
  v_roles text[];
begin
  v := public._production_link_of_h(p_link_hash, false);
  if v.id is null then
    return null;
  end if;
  select * into s from public.production_sheets where id = v.sheet_id;
  v_roles := public.production_link_roles(v);
  return jsonb_build_object(
    'roles', to_jsonb(v_roles),
    'organization', s.organization,
    'deliveryOn', s.delivery_date,
    'progress', s.company_progress,
    'direction', jsonb_build_object('status', s.direction_status, 'comment', s.direction_comment,
      'stagingIntent', s.staging_intent, 'runOfShow', s.run_of_show, 'references', s.references_note),
    -- The proposal's versions: the director deposits them, the external
    -- validation decides them; nobody else on a link sees them.
    'directionVersions', case when v_roles && array['director', 'creativeExt'] then
      coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'number', d.number,
          'treatmentUrl', d.treatment_url, 'moodboardUrl', d.moodboard_url, 'cuttingUrl', d.cutting_url,
          'note', d.note, 'depositedAt', d.deposited_at,
          'depositedBy', coalesce((select c.name from public.network_contacts c where c.id = d.deposited_by_contact),
                                  (select btrim(pe.first_name || ' ' || coalesce(pe.last_name, ''))
                                     from public.people pe where pe.id = d.deposited_by_person)),
          'intStatus', d.int_status, 'intComment', d.int_comment, 'intAt', d.int_at,
          'extStatus', d.ext_status, 'extComment', d.ext_comment, 'extAt', d.ext_at)
          order by d.number desc)
        from public.production_direction_versions d where d.sheet_id = s.id), '[]'::jsonb)
      else '[]'::jsonb end,
    'directionRevision', case when s.direction_revision_at is null or not (v_roles && array['director'])
      then null else jsonb_build_object('reason', s.direction_revision_reason, 'at', s.direction_revision_at) end,
    'quotes', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'label', q.label,
        'number', q.number, 'amountCents', q.amount_cents, 'locBudgetCents', q.loc_budget_cents,
        'deliveryOn', q.delivery_on, 'status', q.status, 'url', q.url, 'note', q.note,
        'reason', q.reason, 'depositedAt', q.deposited_at, 'decidedAt', q.decided_at)
        order by q.number desc)
      from public.production_quotes q where q.sheet_id = s.id and 'company' = any (v_roles)), '[]'::jsonb),
    'quoteRevision', case when s.quote_revision_at is null then null
      else jsonb_build_object('reason', s.quote_revision_reason, 'at', s.quote_revision_at) end,
    -- The deposit's deadline: the company's task about the quote, from the call.
    'quoteDue', (select a.due_date from public.production_plan_actions a
                  where a.sheet_id = s.id and a.contact_id = v.contact_id and a.status = 'approved'
                    and a.title ilike '%devis%' and a.due_date is not null
                  order by a.due_date limit 1),
    'shootOn', public.production_shoot_day(s),
    'readyAt', s.ready_at,
    'shootState', (select sh.state from public.production_shoots sh where sh.sheet_id = s.id),
    'rushesUrl', case when s.company_contact_id = v.contact_id then
      (select sh.rushes_url from public.production_shoots sh where sh.sheet_id = s.id) end,
    'rushesAt', case when s.company_contact_id = v.contact_id then
      (select sh.rushes_url_at from public.production_shoots sh where sh.sheet_id = s.id) end,
    'gearCount', (select count(*) from public.production_equipment e where e.sheet_id = s.id),
    'locations', coalesce((select jsonb_agg(jsonb_build_object('name', o.name, 'status', o.status)
        order by o.position, o.created_at)
      from public.production_location_options o
      where o.sheet_id = s.id and o.status <> 'discarded' and 'company' = any (v_roles)), '[]'::jsonb),
    'actions', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title,
        'dueDate', a.due_date, 'origin', a.origin, 'doneAt', a.done_at, 'review', a.review,
        'checklist', coalesce(a.origin = 'checklist' or a.template_key like 'checklist\_%', false))
        order by a.due_date nulls last, a.position)
      from public.production_plan_actions a
      where a.sheet_id = s.id and a.contact_id = v.contact_id and a.status = 'approved'), '[]'::jsonb),
    'calls', coalesce((select jsonb_agg(jsonb_build_object(
        'title', c.title, 'occurredAt', c.occurred_at, 'format', pc.format,
        'meetingUrl', c.meeting_url, 'status', c.status,
        'participants', coalesce((select jsonb_agg(p ->> 'name')
           from jsonb_array_elements(pc.participants) p), '[]'::jsonb),
        'agenda', coalesce((select jsonb_agg(a ->> 'topic')
           from jsonb_array_elements(case when jsonb_typeof(c.agenda) = 'array'
                                          then c.agenda else '[]'::jsonb end) a), '[]'::jsonb),
        'invitedAt', c.created_at,
        'invitedBy', (select btrim(pe.first_name || ' ' || coalesce(pe.last_name, ''))
           from public.people pe where pe.id = c.created_by),
        'summary', (select jsonb_build_object('version', cs.version, 'text', cs.text,
              'sentAt', cs.sent_at,
              'sentBy', (select btrim(pe.first_name || ' ' || coalesce(pe.last_name, ''))
                           from public.people pe where pe.id = cs.sent_by))
           from public.call_summaries cs
          where cs.call_id = c.id
            and cs.recipients @> jsonb_build_array(jsonb_build_object('contact_id', v.contact_id))
          order by cs.version desc limit 1))
        order by c.occurred_at)
      from public.production_calls pc join public.calls c on c.id = pc.call_id
      where pc.sheet_id = s.id
        and (pc.participants @> jsonb_build_array(jsonb_build_object('contact_id', v.contact_id))
             or exists (select 1 from public.call_guests g
                         where g.call_id = c.id and g.contact_id = v.contact_id))), '[]'::jsonb),
    'directorProposals', case when s.company_contact_id = v.contact_id then
      coalesce((select jsonb_agg(jsonb_build_object('name', d.name, 'reelUrl', d.reel_url,
          'note', d.note, 'status', d.status, 'proposedAt', d.proposed_at) order by d.proposed_at)
        from public.production_director_proposals d
        where d.sheet_id = s.id and d.proposed_by_contact_id = v.contact_id), '[]'::jsonb)
      else '[]'::jsonb end);
end;
$function$;
revoke execute on function public._get_production_link_journey_h(text) from public, anon, authenticated;
