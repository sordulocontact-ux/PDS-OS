-- Production › the search for a location (Ibé's tests of 13/10, PROD-011,
-- PROD-012, PROD-013): several candidate places, each with its media, link,
-- contact, price, availability, constraints and its own verification;
-- the people consulted (the director for the artistic side, the director
-- of photography for the technical side, the production for feasibility)
-- give an opinion on each, without touching its data; then the owner
-- decides — who, when, why kept —, the place goes to the sheet, and a
-- change after that reopens what depends on it (the location check, hence
-- « prête pour tournage »; the call sheet reads the sheet's place).

-- 1. Candidates ---------------------------------------------------------------------

alter table public.production_files drop constraint production_files_kind_check;
alter table public.production_files add constraint production_files_kind_check
  check (kind in ('quote', 'capture', 'reference', 'version', 'attachment', 'other', 'location'));

create table public.production_location_options (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  name text not null,
  address text,
  url text,
  -- Who to call for it (a name, a phone): free, the Réseau is optional.
  contact_note text,
  price_cents bigint,
  price_note text,
  availability text,
  constraints text,
  -- Verification (to_verify / verified) is not the decision (PROD-011).
  verification text not null default 'to_verify',
  -- candidate = candidat; discarded = écarté (kept, with its reason);
  -- chosen = retenu (one per sheet).
  status text not null default 'candidate',
  decision_reason text,
  decided_by uuid references public.people (id),
  decided_at timestamptz,
  position integer not null default 0,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint production_location_options_id_org_key unique (id, organization_id),
  constraint production_location_options_name_check
    check (btrim(name) <> '' and char_length(name) <= 200),
  constraint production_location_options_url_check
    check (url is null or (url ~ '^https://\S+$' and char_length(url) <= 2000)),
  constraint production_location_options_texts_check check (
    coalesce(char_length(address), 0) <= 500 and coalesce(char_length(contact_note), 0) <= 500
    and coalesce(char_length(price_note), 0) <= 500 and coalesce(char_length(availability), 0) <= 1000
    and coalesce(char_length(constraints), 0) <= 2000 and coalesce(char_length(decision_reason), 0) <= 1000),
  constraint production_location_options_price_check check (price_cents is null or price_cents >= 0),
  constraint production_location_options_verification_check
    check (verification in ('to_verify', 'verified')),
  constraint production_location_options_status_check
    check (status in ('candidate', 'discarded', 'chosen')),
  -- A discarded place says why.
  constraint production_location_options_discard_check
    check (status <> 'discarded' or btrim(coalesce(decision_reason, '')) <> ''),
  constraint production_location_options_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_location_options_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create unique index production_location_options_chosen_idx
  on public.production_location_options (sheet_id) where status = 'chosen';
create trigger a_set_created_by before insert on public.production_location_options
  for each row execute function public.set_created_by();
create trigger a_child before insert or update on public.production_location_options
  for each row execute function public.production_child_check();
create trigger b_updated_at before update on public.production_location_options
  for each row execute function public.set_updated_at();

alter table public.production_location_options enable row level security;
alter table public.production_location_options force row level security;
revoke all on table public.production_location_options from anon, authenticated;
grant select on public.production_location_options to authenticated;
grant insert (organization_id, project_id, sheet_id, name, address, url, contact_note, price_cents,
              price_note, availability, constraints, verification, position)
  on public.production_location_options to authenticated;
-- Status and decision: through the functions below.
grant update (name, address, url, contact_note, price_cents, price_note, availability, constraints,
              verification, position)
  on public.production_location_options to authenticated;
create policy production_location_options_select on public.production_location_options
  for select to authenticated using (public.can_see_project(project_id));
create policy production_location_options_insert on public.production_location_options
  for insert to authenticated with check (public.production_can_organize(project_id));
create policy production_location_options_update on public.production_location_options
  for update to authenticated
  using (public.production_can_organize(project_id))
  with check (public.production_can_organize(project_id));

-- Photos, videos, plans: a file of the sheet or a link.
create table public.production_location_media (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  option_id uuid not null,
  file_id uuid,
  url text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint production_location_media_one_check check ((file_id is null) <> (url is null)),
  constraint production_location_media_url_check
    check (url is null or (url ~ '^https://\S+$' and char_length(url) <= 2000)),
  constraint production_location_media_option_same_org foreign key (option_id, organization_id)
    references public.production_location_options (id, organization_id) on delete cascade,
  constraint production_location_media_file_same_org foreign key (file_id, organization_id)
    references public.production_files (id, organization_id) on delete cascade,
  constraint production_location_media_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_location_media_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create index production_location_media_option_idx on public.production_location_media (option_id);
create trigger a_set_created_by before insert on public.production_location_media
  for each row execute function public.set_created_by();
create trigger a_child before insert or update on public.production_location_media
  for each row execute function public.production_child_check();
alter table public.production_location_media enable row level security;
alter table public.production_location_media force row level security;
revoke all on table public.production_location_media from anon, authenticated;
grant select, delete on public.production_location_media to authenticated;
grant insert (organization_id, project_id, sheet_id, option_id, file_id, url)
  on public.production_location_media to authenticated;
create policy production_location_media_select on public.production_location_media
  for select to authenticated using (public.can_see_project(project_id));
create policy production_location_media_insert on public.production_location_media
  for insert to authenticated with check (public.production_can_organize(project_id));
create policy production_location_media_delete on public.production_location_media
  for delete to authenticated using (public.production_can_organize(project_id));

-- 2. Who is consulted, and their opinions ----------------------------------------------

create table public.production_location_consults (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  person_id uuid references public.people (id),
  contact_id uuid,
  -- artistic = avis artistique (réalisation); technical = conditions
  -- techniques (image, son); production = faisabilité, coût, autorisations.
  role text not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint production_location_consults_holder_check check ((person_id is null) <> (contact_id is null)),
  constraint production_location_consults_role_check
    check (role in ('artistic', 'technical', 'production')),
  constraint production_location_consults_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id),
  constraint production_location_consults_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_location_consults_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create unique index production_location_consults_person_idx
  on public.production_location_consults (sheet_id, person_id) where person_id is not null;
create unique index production_location_consults_contact_idx
  on public.production_location_consults (sheet_id, contact_id) where contact_id is not null;
create trigger a_set_created_by before insert on public.production_location_consults
  for each row execute function public.set_created_by();
create trigger a_child before insert or update on public.production_location_consults
  for each row execute function public.production_child_check();
alter table public.production_location_consults enable row level security;
alter table public.production_location_consults force row level security;
revoke all on table public.production_location_consults from anon, authenticated;
grant select, delete on public.production_location_consults to authenticated;
grant insert (organization_id, project_id, sheet_id, person_id, contact_id, role)
  on public.production_location_consults to authenticated;
create policy production_location_consults_select on public.production_location_consults
  for select to authenticated using (public.can_see_project(project_id));
create policy production_location_consults_insert on public.production_location_consults
  for insert to authenticated with check (public.production_can_organize(project_id));
create policy production_location_consults_delete on public.production_location_consults
  for delete to authenticated using (public.production_can_organize(project_id));

create table public.production_location_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  option_id uuid not null,
  person_id uuid references public.people (id),
  contact_id uuid,
  role text not null,
  -- favorable, reserved (avec réserves), unfavorable.
  verdict text not null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint production_location_reviews_holder_check check ((person_id is null) <> (contact_id is null)),
  constraint production_location_reviews_role_check
    check (role in ('artistic', 'technical', 'production')),
  constraint production_location_reviews_verdict_check
    check (verdict in ('favorable', 'reserved', 'unfavorable')),
  constraint production_location_reviews_comment_check
    check (comment is null or char_length(comment) <= 2000),
  -- A reserve or a refusal says why.
  constraint production_location_reviews_reason_check
    check (verdict = 'favorable' or btrim(coalesce(comment, '')) <> ''),
  constraint production_location_reviews_option_same_org foreign key (option_id, organization_id)
    references public.production_location_options (id, organization_id) on delete cascade,
  constraint production_location_reviews_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id),
  constraint production_location_reviews_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_location_reviews_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
create unique index production_location_reviews_person_idx
  on public.production_location_reviews (option_id, person_id) where person_id is not null;
create unique index production_location_reviews_contact_idx
  on public.production_location_reviews (option_id, contact_id) where contact_id is not null;
alter table public.production_location_reviews enable row level security;
alter table public.production_location_reviews force row level security;
revoke all on table public.production_location_reviews from anon, authenticated;
-- Written through review_production_location only (by a member or a
-- provider's link): an opinion never edits the place's data.
grant select on public.production_location_reviews to authenticated;
create policy production_location_reviews_select on public.production_location_reviews
  for select to authenticated using (public.can_see_project(project_id));

-- Writes the opinion of whoever is consulted on the sheet, member or contact.
create function public.production_write_location_review(
  o public.production_location_options, p_person uuid, p_contact uuid, p_verdict text, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  select c.role into v_role from public.production_location_consults c
   where c.sheet_id = o.sheet_id
     and ((p_person is not null and c.person_id = p_person)
          or (p_contact is not null and c.contact_id = p_contact));
  if v_role is null then
    raise exception 'not_consulted';
  end if;
  if o.status = 'discarded' then
    raise exception 'location_discarded';
  end if;
  if not public.project_stage_in_progress(o.project_id, 'production') then
    raise exception 'stage_locked';
  end if;
  if p_verdict not in ('favorable', 'reserved', 'unfavorable') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if p_verdict <> 'favorable' and v_comment is null then
    raise exception 'reason_required';
  end if;
  if p_person is not null then
    insert into public.production_location_reviews
      (organization_id, project_id, sheet_id, option_id, person_id, role, verdict, comment)
    values (o.organization_id, o.project_id, o.sheet_id, o.id, p_person, v_role, p_verdict, v_comment)
    on conflict (option_id, person_id) where person_id is not null
      do update set verdict = excluded.verdict, comment = excluded.comment, role = excluded.role,
                    updated_at = now();
  else
    insert into public.production_location_reviews
      (organization_id, project_id, sheet_id, option_id, contact_id, role, verdict, comment)
    values (o.organization_id, o.project_id, o.sheet_id, o.id, p_contact, v_role, p_verdict, v_comment)
    on conflict (option_id, contact_id) where contact_id is not null
      do update set verdict = excluded.verdict, comment = excluded.comment, role = excluded.role,
                    updated_at = now();
  end if;
end;
$$;
revoke execute on function public.production_write_location_review(
  public.production_location_options, uuid, uuid, text, text) from public, anon, authenticated;

-- « Donner mon avis », a member consulted.
create function public.review_production_location(p_option_id uuid, p_verdict text, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.production_location_options%rowtype;
begin
  select * into o from public.production_location_options where id = p_option_id;
  if not found or not public.can_see_project(o.project_id) then
    raise exception 'location_not_found';
  end if;
  perform public.production_write_location_review(o, public.auth_person_id(), null, p_verdict, p_comment);
end;
$$;
revoke execute on function public.review_production_location(uuid, text, text) from public, anon;
grant execute on function public.review_production_location(uuid, text, text) to authenticated;

-- « Donner mon avis », a provider through their link.
create function public.review_production_location_by_link(
  p_token text, p_option_id uuid, p_verdict text, p_comment text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
  o public.production_location_options%rowtype;
begin
  v := public.production_link_of(p_token, false);
  if v.id is null then
    raise exception 'link_closed';
  end if;
  select * into o from public.production_location_options
   where id = p_option_id and sheet_id = v.sheet_id;
  if not found then
    raise exception 'location_not_found';
  end if;
  perform public.production_write_location_review(o, null, v.contact_id, p_verdict, p_comment);
end;
$$;
revoke execute on function public.review_production_location_by_link(text, uuid, text, text) from public;
grant execute on function public.review_production_location_by_link(text, uuid, text, text)
  to anon, authenticated;

-- 3. The decision ------------------------------------------------------------------------

-- « Écarter » (with its reason, kept with its opinions) or « Remettre en
-- candidat ».
create function public.discard_production_location(p_option_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.production_location_options%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into o from public.production_location_options where id = p_option_id for update;
  if not found or not public.can_see_project(o.project_id) then
    raise exception 'location_not_found';
  end if;
  if not public.production_can_organize(o.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if o.status = 'chosen' then
    raise exception 'location_chosen';
  end if;
  update public.production_location_options
     set status = case when v_reason is null then 'candidate' else 'discarded' end,
         decision_reason = v_reason,
         decided_by = case when v_reason is null then null else public.auth_person_id() end,
         decided_at = case when v_reason is null then null else now() end
   where id = o.id;
end;
$$;
revoke execute on function public.discard_production_location(uuid, text) from public, anon;
grant execute on function public.discard_production_location(uuid, text) to authenticated;

-- « Retenir ce lieu » (the owner, PROD-013): after its verification; the
-- place goes to the sheet, « confirmé ». A former choice goes back to the
-- candidates; the sheet's place changing reopens what depends on it.
create function public.choose_production_location(p_option_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.production_location_options%rowtype;
  v_me uuid := public.auth_person_id();
begin
  select * into o from public.production_location_options where id = p_option_id for update;
  if not found or not public.can_see_project(o.project_id) then
    raise exception 'location_not_found';
  end if;
  if not public.production_can_organize(o.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if o.status = 'discarded' then
    raise exception 'location_discarded';
  end if;
  if o.verification <> 'verified' then
    raise exception 'location_not_verified';
  end if;
  update public.production_location_options
     set status = 'candidate', decided_by = null, decided_at = null, decision_reason = null
   where sheet_id = o.sheet_id and status = 'chosen' and id <> o.id;
  update public.production_location_options
     set status = 'chosen', decided_by = v_me, decided_at = now(),
         decision_reason = nullif(btrim(coalesce(p_reason, '')), '')
   where id = o.id;
  -- Status first to « à vérifier » when the place changes: the location
  -- check reopens (z_recheck), then the new place is confirmed.
  update public.production_sheets
     set location_status = 'to_verify'
   where id = o.sheet_id and location_name is distinct from o.name and location_status = 'confirmed';
  update public.production_sheets
     set location_status = 'confirmed', location_name = o.name, location_address = o.address,
         location_notes = coalesce(o.constraints, location_notes)
   where id = o.sheet_id;
end;
$$;
revoke execute on function public.choose_production_location(uuid, text) from public, anon;
grant execute on function public.choose_production_location(uuid, text) to authenticated;

-- 4. Providers consulted reach their link; the log follows the decision ------------------

create or replace function public.create_production_provider_link(p_sheet_id uuid, p_contact_id uuid)
returns text
language plpgsql
volatile
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
  if not exists (select 1 from public.production_post_steps st
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

-- The places a consulted provider sees on their page, with their own opinion.
create function public.get_production_provider_locations(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.production_provider_links%rowtype;
  v_role text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select * into v from public.production_provider_links
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     and revoked_at is null and expires_at > now();
  if not found then
    return null;
  end if;
  select c.role into v_role from public.production_location_consults c
   where c.sheet_id = v.sheet_id and c.contact_id = v.contact_id;
  if v_role is null then
    return jsonb_build_object('role', null, 'options', '[]'::jsonb);
  end if;
  return jsonb_build_object('role', v_role, 'options', coalesce((select jsonb_agg(jsonb_build_object(
      'id', o.id, 'name', o.name, 'address', o.address, 'url', o.url,
      'availability', o.availability, 'constraints', o.constraints,
      'media', coalesce((select jsonb_agg(m.url) from public.production_location_media m
                          where m.option_id = o.id and m.url is not null), '[]'::jsonb),
      'files', (select count(*) from public.production_location_media m
                 where m.option_id = o.id and m.file_id is not null),
      'review', (select jsonb_build_object('verdict', r.verdict, 'comment', r.comment)
                   from public.production_location_reviews r
                  where r.option_id = o.id and r.contact_id = v.contact_id))
      order by o.position, o.created_at)
    from public.production_location_options o
    where o.sheet_id = v.sheet_id and o.status <> 'discarded'), '[]'::jsonb));
end;
$$;
revoke execute on function public.get_production_provider_locations(text) from public;
grant execute on function public.get_production_provider_locations(text) to anon, authenticated;

create function public.production_locations_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'place',
      new.id, 'created', null, jsonb_build_object('name', new.name));
  elsif new.status is distinct from old.status or new.verification is distinct from old.verification then
    perform public.production_log(new.organization_id, new.project_id, new.sheet_id, 'place',
      new.id, 'status',
      jsonb_build_object('name', old.name, 'status', old.status, 'verification', old.verification),
      jsonb_build_object('name', new.name, 'status', new.status, 'verification', new.verification,
                         'reason', new.decision_reason));
  end if;
  return null;
end;
$$;
revoke execute on function public.production_locations_log() from public, anon, authenticated;
create trigger z_log after insert or update on public.production_location_options
  for each row execute function public.production_locations_log();
