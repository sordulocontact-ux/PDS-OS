-- Master workflow, lot 8: the mastering versions and the master final
-- (ticket "Workflow Master", § 13; docs/ARCHITECTURE.md § 8 septies).
--
-- The versions of lot 6 gain a stage: "mix" (an audio file at the mix
-- state) or "mastering" (at the master or master final state). Same
-- comments, synthesis and decision. A validated mastering version is the
-- title's Master final: the file moves to the "final_master" state and the
-- title with it (the Catalogue sees it, the État du master reads "Master
-- final reçu"). Then the other deliverables of the brief (instrumental,
-- clean…) are checked off as they arrive.

-- ---------------------------------------------------------------------------
-- Versions by stage
-- ---------------------------------------------------------------------------

alter table public.master_mix_versions
  add column stage text not null default 'mix',
  add constraint master_mix_versions_stage_check check (stage in ('mix', 'mastering'));

alter table public.master_mix_versions drop constraint master_mix_versions_number_key;
alter table public.master_mix_versions
  add constraint master_mix_versions_number_key unique (project_id, master_id, stage, number);

drop index public.master_mix_versions_final_key;
create unique index master_mix_versions_final_key
  on public.master_mix_versions (project_id, master_id, stage)
  where decision = 'approved';

-- An audio file at the mix state is a mix version; at the master or master
-- final state, a mastering version. One per project of the title that has a
-- Brief Mix/Master, numbered within its stage; the creative directors and
-- the brief's validator are notified (the uploader excepted).
create or replace function public.create_mix_versions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project record;
  v_version uuid;
  v_stage text;
  v_actor uuid := public.auth_person_id();
begin
  if new.category <> 'audio' then
    return new;
  end if;
  v_stage := case
    when new.audio_state = 'mix' then 'mix'
    when new.audio_state in ('master', 'final_master') then 'mastering'
    end;
  if v_stage is null then
    return new;
  end if;
  for v_project in
    select pm.project_id, b.validator_person_id
      from public.project_masters pm
      join public.master_briefs b on b.project_id = pm.project_id
     where pm.master_id = new.master_id
  loop
    insert into public.master_mix_versions
      (organization_id, project_id, master_id, file_id, stage, number, created_by)
    values (new.organization_id, v_project.project_id, new.master_id, new.id, v_stage,
            coalesce((select max(v.number) from public.master_mix_versions v
                       where v.project_id = v_project.project_id
                         and v.master_id = new.master_id and v.stage = v_stage), 0) + 1,
            coalesce(v_actor, new.created_by))
    returning id into v_version;

    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    select new.organization_id, r.person_id, v_actor,
           case v_stage when 'mix' then 'master_mix_version_received'
                        else 'master_mastering_version_received' end,
           v_project.project_id, v_version
      from (select c.person_id from public.project_creatives c
             where c.project_id = v_project.project_id
            union
            select v_project.validator_person_id) r
     where r.person_id is not null
       and r.person_id is distinct from v_actor;
  end loop;
  return new;
end;
$$;

-- The decision, by stage. A validated mastering version is the Master
-- final: its file moves to "final_master" and the title with it.
create or replace function public.decide_mix_version(
  p_version_id uuid,
  p_decision text,
  p_note text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_mix_versions%rowtype;
  v_validator uuid;
  v_owner uuid;
  v_actor uuid := public.auth_person_id();
begin
  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'invalid_decision';
  end if;
  select * into v_row from public.master_mix_versions where id = p_version_id for update;
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select b.validator_person_id, p.owner_person_id into v_validator, v_owner
    from public.projects p
    left join public.master_briefs b on b.project_id = p.id
   where p.id = v_row.project_id;
  if v_actor is null
     or v_actor is distinct from coalesce(v_validator, v_owner)
     or not public.can_see_project(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.decision is not null then
    raise exception 'already_decided';
  end if;
  if exists (select 1 from public.master_mix_versions v
              where v.project_id = v_row.project_id and v.master_id = v_row.master_id
                and v.stage = v_row.stage and v.number > v_row.number) then
    raise exception 'not_latest';
  end if;
  if p_decision = 'approved' and exists (
       select 1 from public.master_mix_versions v
        where v.project_id = v_row.project_id and v.master_id = v_row.master_id
          and v.stage = v_row.stage and v.decision = 'approved') then
    raise exception 'already_final';
  end if;

  update public.master_mix_versions
     set decision = p_decision, decision_note = nullif(btrim(p_note), ''),
         decided_by = v_actor, decided_at = now()
   where id = p_version_id;

  if p_decision = 'approved' and v_row.stage = 'mastering' then
    update public.master_files set audio_state = 'final_master'
     where id = v_row.file_id and audio_state <> 'final_master';
    update public.masters set audio_state = 'final_master'
     where id = v_row.master_id;
  end if;

  if v_owner is not null and v_owner <> v_actor then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v_row.organization_id, v_owner, v_actor,
            case
              when p_decision = 'approved' and v_row.stage = 'mix' then 'master_mix_approved'
              when p_decision = 'approved' then 'master_final_approved'
              when v_row.stage = 'mix' then 'master_mix_changes_requested'
              else 'master_mastering_changes_requested' end,
            v_row.project_id, v_row.id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- The other deliverables, checked off as they arrive
-- ---------------------------------------------------------------------------

create table public.master_deliverables_received (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  master_id uuid not null,
  deliverable text not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint master_deliverables_received_key unique (project_id, master_id, deliverable),
  constraint master_deliverables_received_check
    check (deliverable in ('instrumental', 'acapella', 'clean', 'radio_edit', 'live',
                           'tv_mix', 'stems')),
  constraint master_deliverables_received_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade,
  constraint master_deliverables_received_title_in_project
    foreign key (project_id, master_id) references public.project_masters (project_id, master_id)
    on delete cascade
);

create trigger a_set_created_by before insert on public.master_deliverables_received
  for each row execute function public.set_created_by();

alter table public.master_deliverables_received enable row level security;
alter table public.master_deliverables_received force row level security;
revoke all on table public.master_deliverables_received from anon, authenticated;
grant select, delete on table public.master_deliverables_received to authenticated;
grant insert (organization_id, project_id, master_id, deliverable)
  on public.master_deliverables_received to authenticated;

create policy master_deliverables_received_select_visible
  on public.master_deliverables_received for select to authenticated
  using (public.can_see_project(project_id));
create policy master_deliverables_received_insert_owner
  on public.master_deliverables_received for insert to authenticated
  with check (public.is_project_owner(project_id));
create policy master_deliverables_received_delete_owner
  on public.master_deliverables_received for delete to authenticated
  using (public.is_project_owner(project_id));

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'project_transmitted', 'project_accepted', 'project_refused',
  'project_clarification_requested', 'validation_requested', 'validation_approved',
  'validation_rejected', 'task_assigned', 'project_creative_added',
  'design_version_submitted', 'design_version_approved', 'design_version_changes_requested',
  'contract_review_requested', 'contract_approved', 'contract_changes_requested',
  'meeting_invited', 'master_transmission_received', 'master_mix_version_received',
  'master_mix_approved', 'master_mix_changes_requested', 'master_mastering_version_received',
  'master_final_approved', 'master_mastering_changes_requested')) not valid;

-- ---------------------------------------------------------------------------
-- The engineer's page shows the feedback of its own stage
-- ---------------------------------------------------------------------------

create or replace function public.get_master_transmission(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_row public.master_transmissions%rowtype;
  v_state text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select * into v_row from public.master_transmissions
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if not found then
    return null;
  end if;
  v_state := case
    when v_row.revoked_at is not null then 'replaced'
    when v_row.expires_at < now() then 'expired'
    when v_row.acknowledged_at is not null then 'received'
    else 'open' end;
  if v_state in ('replaced', 'expired') then
    return jsonb_build_object('state', v_state);
  end if;
  return jsonb_build_object(
    'state', v_state,
    'package', v_row.package,
    'note', v_row.note,
    'sentAt', v_row.created_at,
    'expiresAt', v_row.expires_at,
    'acknowledgedAt', v_row.acknowledged_at,
    'feedback', coalesce((
      select jsonb_agg(jsonb_build_object(
               'title', m.title, 'number', v.number,
               'summary', v.feedback_summary, 'sentAt', v.feedback_sent_at)
             order by v.feedback_sent_at desc)
        from public.master_mix_versions v
        join public.masters m on m.id = v.master_id
       where v.project_id = v_row.project_id and v.feedback_sent_at is not null
         -- The feedback of the engineer's own stage.
         and v.stage = v_row.role), '[]'::jsonb));
end;
$$;
