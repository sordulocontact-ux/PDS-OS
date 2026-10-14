-- Production › the call sheet, published (Ibé's tests of 13/10, PROD-016):
-- « Diffuser » freezes what the team receives as a dated version (V1, V2…,
-- numbered by the database, kept), composed by code from the data already
-- validated (date, place, team and contacts, equipment, the sheet's own
-- sections). The team reads the latest version through one stable private
-- link (only its hash is stored); the members holding a position are told
-- when a version is published, and the page says which version replaced
-- which.

create table public.production_call_sheet_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  number integer not null,
  -- What was published, as composed by lib/production/preprod/call-sheet-snapshot.ts.
  content jsonb not null,
  published_by uuid references public.people (id),
  published_at timestamptz not null default now(),
  constraint production_call_sheet_versions_number_key unique (sheet_id, number),
  constraint production_call_sheet_versions_content_check check (
    jsonb_typeof(content) = 'object' and octet_length(content::text) <= 200000),
  constraint production_call_sheet_versions_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_call_sheet_versions_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
alter table public.production_call_sheet_versions enable row level security;
alter table public.production_call_sheet_versions force row level security;
revoke all on table public.production_call_sheet_versions from anon, authenticated;
grant select on public.production_call_sheet_versions to authenticated;
create policy production_call_sheet_versions_select on public.production_call_sheet_versions
  for select to authenticated using (public.can_see_project(project_id));

create table public.production_call_sheet_links (
  sheet_id uuid primary key,
  organization_id uuid not null,
  project_id uuid not null,
  token_hash text not null unique,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint production_call_sheet_links_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade,
  constraint production_call_sheet_links_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
alter table public.production_call_sheet_links enable row level security;
alter table public.production_call_sheet_links force row level security;
revoke all on table public.production_call_sheet_links from anon, authenticated;
grant select (sheet_id, created_at) on public.production_call_sheet_links to authenticated;
create policy production_call_sheet_links_select on public.production_call_sheet_links
  for select to authenticated using (public.can_see_project(project_id));

-- « Diffuser la feuille » (the owner, while Production runs): a new
-- version, the members holding a position told.
create function public.publish_production_call_sheet(p_sheet_id uuid, p_content jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
  v_me uuid := public.auth_person_id();
  v_number integer;
begin
  select * into s from public.production_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(s.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  select coalesce(max(number), 0) + 1 into v_number
    from public.production_call_sheet_versions where sheet_id = s.id;
  insert into public.production_call_sheet_versions
    (organization_id, project_id, sheet_id, number, content, published_by)
  values (s.organization_id, s.project_id, s.id, v_number, p_content, v_me);
  perform public.production_log(s.organization_id, s.project_id, s.id, 'callsheet', s.id,
    'published', null, jsonb_build_object('number', v_number));
  insert into public.notifications
    (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
  select distinct s.organization_id, a.person_id, v_me, 'production_call_sheet_published',
         s.project_id, s.deliverable_id
    from public.production_assignments a
    join public.production_needs n on n.id = a.need_id
   where n.sheet_id = s.id and a.person_id is not null
     and a.availability <> 'unavailable' and a.person_id is distinct from v_me;
  return v_number;
end;
$$;
revoke execute on function public.publish_production_call_sheet(uuid, jsonb) from public, anon;
grant execute on function public.publish_production_call_sheet(uuid, jsonb) to authenticated;

-- « Lien de la feuille »: one stable link per sheet; asking again replaces
-- it. The token is returned once, never stored.
create function public.create_production_call_sheet_link(p_sheet_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
  v_token text;
begin
  select * into s from public.production_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(s.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.production_call_sheet_links
    (sheet_id, organization_id, project_id, token_hash, created_by)
  values (s.id, s.organization_id, s.project_id,
          encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), public.auth_person_id())
  on conflict (sheet_id) do update
    set token_hash = excluded.token_hash, created_by = excluded.created_by, created_at = now();
  return v_token;
end;
$$;
revoke execute on function public.create_production_call_sheet_link(uuid) from public, anon;
grant execute on function public.create_production_call_sheet_link(uuid) to authenticated;

-- The team's page: the latest published version, and the earlier numbers.
create function public.get_production_call_sheet(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  l public.production_call_sheet_links%rowtype;
  v public.production_call_sheet_versions%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select * into l from public.production_call_sheet_links
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if not found then
    return null;
  end if;
  select * into v from public.production_call_sheet_versions
   where sheet_id = l.sheet_id order by number desc limit 1;
  if not found then
    return jsonb_build_object('published', false);
  end if;
  return jsonb_build_object('published', true, 'number', v.number, 'publishedAt', v.published_at,
    'content', v.content);
end;
$$;
revoke execute on function public.get_production_call_sheet(text) from public;
grant execute on function public.get_production_call_sheet(text) to anon, authenticated;

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
    'production_call_sheet_published'])) not valid;
