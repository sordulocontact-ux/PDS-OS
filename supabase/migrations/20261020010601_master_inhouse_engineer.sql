-- Master, the in-house engineer (docs/projet-complet/master.md § 3, proto
-- `master:hugo`): a member of PDS with an account mixes or masters. No link,
-- no e-mail, no invoice: « Assigner à Hugo Martin » gives him the round (his
-- action appears in his Maintenant and his Travail, read from the journey),
-- he reads the Brief in the app and deposits his versions in PDS OS, filed
-- in the title at the Catalogue; the versions follow as for a link.
--
-- 1. master_briefs: mix_person_id / mastering_person_id (exclusive with the
--    contact), the round assigned (when, by whom). A member of the
--    organization only (trigger).
-- 2. He sees the project (can_see_project_row, the production's clause kept
--    verbatim from 20261014001401).
-- 3. assign_master_round(project, role): the owner; he is told.
-- 4. His deposit: a one-time slot (master_member_slots), then the file as
--    an audio version of the title (mix or master), without manage_catalog.

-- 1 --------------------------------------------------------------------------
alter table public.master_briefs
  add column mix_person_id uuid references public.people (id),
  add column mastering_person_id uuid references public.people (id),
  add column mix_assigned_at timestamptz,
  add column mix_assigned_by uuid references public.people (id),
  add column mastering_assigned_at timestamptz,
  add column mastering_assigned_by uuid references public.people (id),
  add constraint master_briefs_mix_engineer_one
    check (mix_person_id is null or mix_contact_id is null),
  add constraint master_briefs_mastering_engineer_one
    check (mastering_person_id is null or mastering_contact_id is null);
grant insert (mix_person_id, mastering_person_id) on public.master_briefs to authenticated;
grant update (mix_person_id, mastering_person_id) on public.master_briefs to authenticated;

create or replace function public.check_master_brief_persons()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.mix_person_id is not null and not exists (
        select 1 from public.memberships m
         where m.person_id = new.mix_person_id and m.organization_id = new.organization_id
           and m.status = 'approved'))
     or (new.mastering_person_id is not null and not exists (
        select 1 from public.memberships m
         where m.person_id = new.mastering_person_id and m.organization_id = new.organization_id
           and m.status = 'approved')) then
    raise exception 'engineer_not_member' using errcode = '23514';
  end if;
  -- Another engineer chosen: the round is to assign again.
  if tg_op = 'UPDATE' then
    if new.mix_person_id is distinct from old.mix_person_id then
      new.mix_assigned_at := null;
      new.mix_assigned_by := null;
    end if;
    if new.mastering_person_id is distinct from old.mastering_person_id
       or new.mastering_same_engineer is distinct from old.mastering_same_engineer then
      new.mastering_assigned_at := null;
      new.mastering_assigned_by := null;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.check_master_brief_persons() from public, anon, authenticated;
create trigger master_briefs_check_persons
  before insert or update of mix_person_id, mastering_person_id, mastering_same_engineer
  on public.master_briefs
  for each row execute function public.check_master_brief_persons();

-- The member who holds a round, null when it is an engineer of the Réseau.
create or replace function public.master_round_person(p_project_id uuid, p_role text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case when p_role = 'mix' or b.mastering_same_engineer then b.mix_person_id
              else b.mastering_person_id end
    from public.master_briefs b where b.project_id = p_project_id;
$$;
revoke execute on function public.master_round_person(uuid, text) from public, anon, authenticated;

-- 2 --------------------------------------------------------------------------
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
      -- The in-house engineer of the Master (20261020010601).
      or exists (select 1 from public.master_briefs mb
                 where mb.project_id = p_project_id
                   and public.auth_person_id() in (mb.mix_person_id, mb.mastering_person_id))
      or exists (select 1 from public.production_sheets ps
                 where ps.project_id = p_project_id
                   and public.auth_person_id() in (ps.line_producer_person_id,
                                                   ps.quote_validator_person_id, ps.dop_person_id))
    );
$$;

-- 3 --------------------------------------------------------------------------
select public.add_notification_kinds(array['master_round_assigned']);

create or replace function public.assign_master_round(p_project_id uuid, p_role text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_person uuid;
  v_org uuid;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role not in ('mix', 'mastering') then
    raise exception 'invalid_role';
  end if;
  v_person := public.master_round_person(p_project_id, p_role);
  if v_person is null then
    raise exception 'no_engineer';
  end if;
  if p_role = 'mix' and exists (
       select 1 from public.project_masters pm
        join lateral (select s.vocals_final, s.plan from public.master_flow_sources s
                       where s.project_id = p_project_id and s.master_id = pm.master_id
                       order by s.created_at desc limit 1) cur on true
        where pm.project_id = p_project_id and cur.vocals_final = false and cur.plan = 'wait') then
    raise exception 'vocals_awaited' using errcode = '23514';
  end if;
  select organization_id into v_org from public.projects where id = p_project_id;
  if p_role = 'mix' then
    update public.master_briefs set mix_assigned_at = now(), mix_assigned_by = public.auth_person_id()
     where project_id = p_project_id;
  else
    update public.master_briefs
       set mastering_assigned_at = now(), mastering_assigned_by = public.auth_person_id()
     where project_id = p_project_id;
  end if;
  if v_person is distinct from public.auth_person_id() then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v_org, v_person, public.auth_person_id(), 'master_round_assigned', p_project_id, null);
  end if;
end;
$$;
revoke execute on function public.assign_master_round(uuid, text) from public, anon;
grant execute on function public.assign_master_round(uuid, text) to authenticated;

-- 4 --------------------------------------------------------------------------
create table public.master_member_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  master_id uuid not null,
  stage text not null,
  person_id uuid not null references public.people (id),
  path text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  file_id uuid references public.master_files (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint master_member_slots_path_key unique (path),
  constraint master_member_slots_stage_check check (stage in ('mix', 'mastering')),
  constraint master_member_slots_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);
alter table public.master_member_slots enable row level security;
alter table public.master_member_slots force row level security;
revoke all on table public.master_member_slots from anon, authenticated;

create or replace function public.is_open_member_slot(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.master_member_slots s
                  where s.path = p_path and s.used_at is null and s.expires_at > now()
                    and s.person_id = public.auth_person_id());
$$;
revoke execute on function public.is_open_member_slot(text) from public, anon;
grant execute on function public.is_open_member_slot(text) to authenticated;

create policy master_files_objects_insert_member on storage.objects
  for insert to authenticated
  with check (bucket_id = 'master-files' and public.is_open_member_slot(objects.name));

-- « Déposer ma version » (the in-house engineer): his round assigned, the
-- title in the project (and its Mix final for the mastering).
create or replace function public.open_master_member_delivery(
  p_project_id uuid, p_master_id uuid, p_stage text, p_extension text, p_file_name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_brief public.master_briefs%rowtype;
  v_path text;
begin
  select * into v_brief from public.master_briefs where project_id = p_project_id;
  if not found or p_stage not in ('mix', 'mastering')
     or public.master_round_person(p_project_id, p_stage) is distinct from public.auth_person_id()
     or (p_stage = 'mix' and v_brief.mix_assigned_at is null)
     or (p_stage = 'mastering' and v_brief.mastering_assigned_at is null) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.project_masters pm
                  where pm.project_id = p_project_id and pm.master_id = p_master_id) then
    raise exception 'title_not_in_package' using errcode = 'P0001';
  end if;
  if p_stage = 'mastering' and not exists (
       select 1 from public.master_mix_versions v
        where v.project_id = p_project_id and v.master_id = p_master_id
          and v.stage = 'mix' and v.decision = 'approved') then
    raise exception 'mix_not_final' using errcode = 'P0001';
  end if;
  if p_extension is null or p_extension !~ '^(wav|aif|aiff|flac|mp3|m4a|aac|ogg)$' then
    raise exception 'invalid_extension' using errcode = 'P0001';
  end if;
  if p_file_name is not null and not public.master_delivery_name_ok(p_file_name) then
    raise exception 'invalid_file_name' using errcode = 'P0001';
  end if;
  select organization_id into v_org from public.projects where id = p_project_id;
  v_path := v_org::text || '/' || p_master_id::text || '/' || gen_random_uuid()::text || '.'
            || p_extension;
  insert into public.master_member_slots
    (organization_id, project_id, master_id, stage, person_id, path, expires_at)
  values (v_org, p_project_id, p_master_id, p_stage, public.auth_person_id(), v_path,
          now() + interval '1 hour');
  return v_path;
end;
$$;
revoke execute on function public.open_master_member_delivery(uuid, uuid, text, text, text) from public, anon;
grant execute on function public.open_master_member_delivery(uuid, uuid, text, text, text) to authenticated;

create or replace function public.record_master_member_delivery(
  p_path text, p_file_name text, p_mime text, p_bytes bigint)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_slot public.master_member_slots%rowtype;
  v_bytes bigint;
  v_file uuid;
begin
  select * into v_slot from public.master_member_slots
   where path = p_path and person_id = public.auth_person_id() for update;
  if not found or v_slot.used_at is not null then
    raise exception 'slot_unknown' using errcode = 'P0001';
  end if;
  select (o.metadata ->> 'size')::bigint into v_bytes
    from storage.objects o where o.bucket_id = 'master-files' and o.name = p_path;
  if v_bytes is null then
    raise exception 'file_missing' using errcode = 'P0001';
  end if;
  if p_bytes is not null and p_bytes <> v_bytes then
    raise exception 'file_mismatch' using errcode = 'P0001';
  end if;
  if p_file_name is null or btrim(p_file_name) = '' or char_length(p_file_name) > 255
     or p_mime is null or p_mime !~ '^audio/' then
    raise exception 'invalid_file' using errcode = 'P0001';
  end if;
  insert into public.master_files
    (organization_id, master_id, category, audio_state, path, file_name, mime, bytes)
  values (v_slot.organization_id, v_slot.master_id, 'audio',
          case v_slot.stage when 'mix' then 'mix' else 'master' end,
          p_path, btrim(p_file_name), p_mime, v_bytes)
  returning id into v_file;
  update public.master_member_slots set used_at = now(), file_id = v_file where id = v_slot.id;
  return v_file;
end;
$$;
revoke execute on function public.record_master_member_delivery(text, text, text, bigint) from public, anon;
grant execute on function public.record_master_member_delivery(text, text, text, bigint) to authenticated;
