-- Deliverables without a shoot of their own (proto « Projet complet »
-- lightSteps, production.md § 2.17, PR-13; PRODUCTION-METIER.md question 13):
--   * the cover (« Pochette »): internal or external (a photographer or an
--     illustrator of the Réseau), then Versions → Contrôle technique →
--     Livraison; the image's format, size and weight are read by code;
--   * the teasers « Décliné du Clip officiel »: the same production as the
--     clip draws them from the clip's edit — they follow the clip's
--     production (its organisation and its company), and their versions
--     wait for the clip's edit to be validated.
-- And the delivery's recipients, for every deliverable: who receives the
-- validated file (Distribution, Activations, the external validation…),
-- picked from the project and the Réseau. Delivered is never published.

-- 1. The teasers drawn from the clip ------------------------------------------------------

alter table public.production_sheets
  add column derived_from_sheet_id uuid references public.production_sheets (id) on delete set null,
  add constraint production_sheets_derived_check check (derived_from_sheet_id is distinct from id);

-- The deliverable is a cover (same rule as the Distribution's
-- distribution_cover: its title says it).
create function public.production_is_artwork(p_deliverable_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select d.title ~* '(pochette|cover|artwork)'
                     from public.strategy_deliverables d where d.id = p_deliverable_id), false);
$$;
revoke execute on function public.production_is_artwork(uuid) from public, anon;
grant execute on function public.production_is_artwork(uuid) to authenticated;

-- The clip's edit is validated: one of its versions approved.
create function public.production_cut_approved(p_sheet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.production_versions v
                  where v.sheet_id = p_sheet_id and v.status = 'approved');
$$;
revoke execute on function public.production_cut_approved(uuid) from public, anon, authenticated;

-- « Décliné du Clip officiel » (the owner): the sheet follows the clip's
-- production; null takes it back to its own choice.
create function public.set_production_derived(p_sheet_id uuid, p_from_sheet_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
  f public.production_sheets%rowtype;
begin
  select * into s from public.production_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.is_project_owner(s.project_id)
     or not public.project_stage_in_progress(s.project_id, 'production') or s.closed_at is not null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_from_sheet_id is null then
    update public.production_sheets set derived_from_sheet_id = null where id = s.id;
    return;
  end if;
  select * into f from public.production_sheets where id = p_from_sheet_id;
  if not found or f.project_id <> s.project_id or f.id = s.id
     or f.derived_from_sheet_id is not null or f.organization is null then
    raise exception 'invalid_source' using errcode = '23514';
  end if;
  update public.production_sheets
     set derived_from_sheet_id = f.id, organization = f.organization,
         company_contact_id = f.company_contact_id,
         quote_validator_person_id = coalesce(quote_validator_person_id, f.quote_validator_person_id),
         line_producer_person_id = coalesce(line_producer_person_id, f.line_producer_person_id),
         organized_at = now(), organized_by = public.auth_person_id()
   where id = s.id;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'sheet', s.id, 'derived',
    null, jsonb_build_object('from', f.id));
end;
$$;
revoke execute on function public.set_production_derived(uuid, uuid) from public, anon;
grant execute on function public.set_production_derived(uuid, uuid) to authenticated;

-- When the clip's production changes, the teasers drawn from it follow.
create function public.production_derived_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.organization, new.company_contact_id) is distinct from (old.organization, old.company_contact_id) then
    update public.production_sheets
       set organization = new.organization, company_contact_id = new.company_contact_id
     where derived_from_sheet_id = new.id and closed_at is null;
  end if;
  return null;
end;
$$;
revoke execute on function public.production_derived_follow() from public, anon, authenticated;
create trigger z_derived_follow after update of organization, company_contact_id on public.production_sheets
  for each row execute function public.production_derived_follow();

-- 2. The versions of a light journey -------------------------------------------------------

-- The image's size, read by code when it was deposited (the browser reads
-- it from the file; the format and the weight come from the storage).
alter table public.production_versions
  add column image_width integer,
  add column image_height integer,
  add constraint production_versions_image_check check (
    (image_width is null) = (image_height is null)
    and (image_width is null or (image_width between 1 and 30000 and image_height between 1 and 30000)));

-- Who may deposit a version in the app or through a link, and when: one at
-- a time (the last one sent back, or none yet), and for the teasers drawn
-- from the clip, once the clip's edit is validated.
create function public.production_light_can_deposit(s public.production_sheets)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if s.derived_from_sheet_id is not null
     and not public.production_cut_approved(s.derived_from_sheet_id) then
    raise exception 'clip_not_validated';
  end if;
  if exists (select 1 from public.production_versions v
              where v.sheet_id = s.id and v.status in ('in_review', 'final_review', 'approved')
                and v.number = (select max(x.number) from public.production_versions x
                                 where x.sheet_id = s.id and x.status <> 'draft')) then
    raise exception 'version_pending';
  end if;
end;
$$;
revoke execute on function public.production_light_can_deposit(public.production_sheets) from public, anon, authenticated;

-- « Déposer la Vn » in the app (whoever organises the production or the
-- creative side): a file of the sheet or a link, submitted at once.
create function public.deposit_production_light_version(
  p_sheet_id uuid, p_file_id uuid, p_url text, p_width integer, p_height integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
  v_id uuid;
  v_number integer;
begin
  select * into s from public.production_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if s.closed_at is not null
     or not (public.production_can_organize(s.project_id) or public.production_can_review(s.project_id)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if (p_file_id is null) = (v_url is null) then
    raise exception 'one_media';
  end if;
  perform public.production_light_can_deposit(s);
  insert into public.production_versions
    (organization_id, project_id, sheet_id, url, file_id, person_id, image_width, image_height)
  values (s.organization_id, s.project_id, s.id, v_url, p_file_id, public.auth_person_id(),
          p_width, p_height)
  returning id, number into v_id, v_number;
  update public.production_versions
     set status = 'in_review', submitted_by = public.auth_person_id(), submitted_at = now()
   where id = v_id;
  return v_number;
end;
$$;
revoke execute on function public.deposit_production_light_version(uuid, uuid, text, integer, integer) from public, anon;
grant execute on function public.deposit_production_light_version(uuid, uuid, text, integer, integer) to authenticated;

-- The same through the link of whoever produces it (a photographer, the
-- clip's company).
create function public._deposit_production_light_version_h(
  p_link_hash text, p_url text, p_path text, p_file_name text, p_width integer, p_height integer)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
  s public.production_sheets%rowtype;
  v_number integer;
begin
  v := public._production_link_for_role_h(p_link_hash, 'company');
  select * into s from public.production_sheets where id = v.sheet_id for update;
  perform public.production_light_can_deposit(s);
  v_number := public._deposit_production_version_h(p_link_hash, p_url, p_path, p_file_name, null);
  if p_width is not null and p_height is not null then
    update public.production_versions set image_width = p_width, image_height = p_height
     where sheet_id = s.id and number = v_number;
  end if;
  return v_number;
end;
$$;
revoke execute on function public._deposit_production_light_version_h(text, text, text, text, integer, integer) from public, anon, authenticated;

create function public.deposit_production_light_version_by_link(
  p_token text, p_url text, p_path text, p_file_name text, p_width integer, p_height integer)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return public._deposit_production_light_version_h(public.link_token_hash(p_token), p_url, p_path,
    p_file_name, p_width, p_height);
end;
$$;
revoke execute on function public.deposit_production_light_version_by_link(text, text, text, text, integer, integer) from public;
grant execute on function public.deposit_production_light_version_by_link(text, text, text, text, integer, integer) to anon, authenticated;

create function public.deposit_production_light_version_by_link(
  p_contact_token text, p_item_id uuid, p_url text, p_path text, p_file_name text, p_width integer, p_height integer)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return public._deposit_production_light_version_h(
    public.contact_item_hash('provider', p_contact_token, p_item_id), p_url, p_path, p_file_name,
    p_width, p_height);
end;
$$;
revoke execute on function public.deposit_production_light_version_by_link(text, uuid, text, text, text, integer, integer) from public;
grant execute on function public.deposit_production_light_version_by_link(text, uuid, text, text, text, integer, integer) to anon, authenticated;

-- « Valider la Vn » / « Demander des modifications » on a light journey
-- (the creative validation): the comment required to ask; a validation goes
-- through decide_production_version (the delivery's creative decision).
create function public.decide_production_light_version(p_version_id uuid, p_approve boolean, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.production_versions%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select * into v from public.production_versions where id = p_version_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'version_not_found';
  end if;
  if not public.production_can_review(v.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if coalesce(p_approve, false) then
    perform public.decide_production_version(p_version_id, 'approve', v_note);
    return;
  end if;
  if v.status not in ('in_review', 'final_review') then
    raise exception 'invalid_transition';
  end if;
  if v_note is null then
    raise exception 'reason_required';
  end if;
  update public.production_versions
     set status = 'changes_requested', decided_by = public.auth_person_id(), decided_at = now(),
         decision_note = left(v_note, 2000)
   where id = v.id;
end;
$$;
revoke execute on function public.decide_production_light_version(uuid, boolean, text) from public, anon;
grant execute on function public.decide_production_light_version(uuid, boolean, text) to authenticated;

-- 3. The technical check of a light journey ------------------------------------------------

-- The cover's rules read by code: 3000 × 3000 px, JPG or PNG, square, at
-- most 10 Mo. True when the version is a conforming image.
create function public.production_cover_conforms(p_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select v.image_width = 3000 and v.image_height = 3000
       and f.mime in ('image/jpeg', 'image/png') and f.bytes <= 10 * 1024 * 1024
      from public.production_versions v join public.production_files f on f.id = v.file_id
     where v.id = p_version_id), false);
$$;
revoke execute on function public.production_cover_conforms(uuid) from public, anon, authenticated;

-- « Confirmer : fichiers conformes » (whoever organises the production):
-- after the creative validation, never before; for a cover, refused unless
-- the code found the validated file conforming.
create function public.confirm_production_light_check(p_sheet_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
  d public.deliverable_deliveries%rowtype;
begin
  select * into s from public.production_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(s.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into d from public.deliverable_deliveries where deliverable_id = s.deliverable_id for update;
  if not found or d.approved_at is null or d.checked_at is not null then
    raise exception 'invalid_transition';
  end if;
  if public.production_is_artwork(s.deliverable_id)
     and not public.production_cover_conforms(d.version_id) then
    raise exception 'cover_not_conforming';
  end if;
  update public.deliverable_deliveries set checked_by = public.auth_person_id(), checked_at = now()
   where id = d.id;
end;
$$;
revoke execute on function public.confirm_production_light_check(uuid) from public, anon;
grant execute on function public.confirm_production_light_check(uuid) to authenticated;

-- 4. The delivery's recipients (every deliverable) --------------------------------------------

create table public.production_delivery_recipients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  delivered_at timestamptz not null,
  person_id uuid references public.people (id),
  contact_id uuid,
  name text,
  purpose text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint production_delivery_recipients_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_delivery_recipients_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint production_delivery_recipients_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id),
  constraint production_delivery_recipients_who_check check (
    num_nonnulls(person_id, contact_id, nullif(btrim(coalesce(name, '')), '')) = 1),
  constraint production_delivery_recipients_texts_check check (
    coalesce(char_length(name), 0) <= 200
    and (purpose is null or purpose in ('distribution', 'activations', 'validation')))
);
create index production_delivery_recipients_sheet_idx
  on public.production_delivery_recipients (sheet_id, delivered_at desc);

alter table public.production_delivery_recipients enable row level security;
alter table public.production_delivery_recipients force row level security;
revoke all on public.production_delivery_recipients from anon, authenticated;
grant select on public.production_delivery_recipients to authenticated;
create policy production_delivery_recipients_select on public.production_delivery_recipients
  for select to authenticated using (public.can_see_project(project_id));

select public.add_notification_kinds(array['production_delivered']);

-- « Confirmer la livraison » (the project's owner): once the files are
-- checked, to at least one recipient — members, Réseau contacts or a bare
-- name. Members are told. Delivered is never published.
create function public.deliver_production(p_sheet_id uuid, p_recipients jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
  d public.deliverable_deliveries%rowtype;
  r jsonb;
  v_at timestamptz := now();
  v_person uuid;
  v_contact uuid;
  v_name text;
  v_purpose text;
begin
  select * into s from public.production_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.is_project_owner(s.project_id)
     or not public.project_stage_in_progress(s.project_id, 'production') or s.closed_at is not null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(p_recipients) <> 'array' or jsonb_array_length(p_recipients) = 0 then
    raise exception 'recipients_required';
  end if;
  if jsonb_array_length(p_recipients) > 30 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  select * into d from public.deliverable_deliveries where deliverable_id = s.deliverable_id for update;
  if not found or d.checked_at is null or d.delivered_at is not null then
    raise exception 'invalid_transition';
  end if;
  for r in select * from jsonb_array_elements(p_recipients) loop
    v_person := nullif(r ->> 'personId', '')::uuid;
    v_contact := nullif(r ->> 'contactId', '')::uuid;
    v_name := nullif(btrim(coalesce(r ->> 'name', '')), '');
    v_purpose := nullif(r ->> 'purpose', '');
    if v_person is not null and not public.production_person_is_member(v_person, s.organization_id) then
      raise exception 'person_not_member' using errcode = '23514';
    end if;
    insert into public.production_delivery_recipients
      (organization_id, project_id, sheet_id, delivered_at, person_id, contact_id, name, purpose, created_by)
    values (s.organization_id, s.project_id, s.id, v_at, v_person, v_contact,
            case when v_person is null and v_contact is null then v_name end, v_purpose,
            public.auth_person_id());
    if v_person is not null and v_person is distinct from public.auth_person_id() then
      insert into public.notifications
        (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
      values (s.organization_id, v_person, public.auth_person_id(), 'production_delivered',
              s.project_id, s.deliverable_id);
    end if;
  end loop;
  update public.deliverable_deliveries set delivered_by = public.auth_person_id(), delivered_at = v_at
   where id = d.id;
end;
$$;
revoke execute on function public.deliver_production(uuid, jsonb) from public, anon;
grant execute on function public.deliver_production(uuid, jsonb) to authenticated;
