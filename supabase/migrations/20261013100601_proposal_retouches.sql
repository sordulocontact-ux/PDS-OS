-- Retours Marketing du 12/10/2026, MKT-C2-10 (docs/ARCHITECTURE.md § 8 decies,
-- « Propositions créatives »).
--
--   1. A creative proposal (design_versions) may be set aside: « écartée »,
--      by the project's owner, with a reason — never deleted.
--   2. A decision keeps who decided as which role, and its scope: the whole
--      proposal, or a precise zone (« plan 2 à 0:45 », « la typo du titre »).
--   3. Asking for changes creates the retouche task of the proposal's author
--      in the Travail, once (tasks.design_version_id): never a duplicate. A
--      newer proposal for the same deliverable closes the open retouche
--      tasks of the older ones.

alter table public.design_versions
  drop constraint design_versions_status_check,
  add constraint design_versions_status_check
    check (status in ('submitted', 'approved', 'changes_requested', 'discarded')),
  add column review_scope text,
  add column reviewed_role text,
  add constraint design_versions_scope_length
    check (char_length(coalesce(review_scope, '')) <= 500),
  add constraint design_versions_discard_reason
    check (status <> 'discarded' or btrim(coalesce(review_comment, '')) <> '');

alter table public.tasks
  add column design_version_id uuid references public.design_versions (id) on delete set null;
create unique index tasks_design_version_key on public.tasks (design_version_id)
  where design_version_id is not null;

-- A discarded proposal tells its author.
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind = any (array[
    'project_transmitted',
    'project_accepted',
    'project_refused',
    'project_clarification_requested',
    'validation_requested',
    'validation_approved',
    'validation_rejected',
    'task_assigned',
    'project_creative_added',
    'design_version_submitted',
    'design_version_approved',
    'design_version_changes_requested',
    'contract_review_requested',
    'contract_approved',
    'contract_changes_requested',
    'meeting_invited',
    'master_transmission_received',
    'master_mix_version_received',
    'master_mix_approved',
    'master_mix_changes_requested',
    'master_mastering_version_received',
    'master_final_approved',
    'master_mastering_changes_requested',
    'clearance_terms_proposed',
    'clearance_terms_validated',
    'clearance_terms_rejected',
    'strategy_review_requested',
    'strategy_review_approved',
    'strategy_review_changes_requested',
    'strategy_review_reminder',
    'project_launched',
    'brief_approved',
    'call_invited',
    'master_delivery_received',
    'master_mastering_delivery_received',
    'legal_form_received',
    'call_report_shared',
    'master_engineer_signal',
    'design_version_discarded'])) not valid;

drop function public.review_design_version(uuid, boolean, text);

-- The owner approves the concept, asks for changes (reason, optional zone),
-- or sets the proposal aside (reason). Changes requested: the author's
-- retouche task, once. Never on what they deposited themselves (MKT-C2-08).
create function public.review_design_version(
  p_version_id uuid,
  p_decision text,
  p_comment text default null,
  p_scope text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.design_versions%rowtype;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_scope text := nullif(btrim(coalesce(p_scope, '')), '');
  v_title text;
begin
  select * into v from public.design_versions where id = p_version_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'version_not_found';
  end if;
  if not public.is_project_owner(v.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if v.created_by = public.auth_person_id() and not coalesce((
       select w.allow_self_approval from public.design_workspaces w
        where w.project_id = v.project_id), false) then
    raise exception 'self_approval' using errcode = '42501';
  end if;
  if not public.design_is_in_progress(v.project_id) then
    raise exception 'stage_locked' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'changes_requested', 'discarded') then
    raise exception 'invalid_transition';
  end if;
  -- Set aside from submitted or to rework; decided only while submitted.
  if (p_decision = 'discarded' and v.status not in ('submitted', 'changes_requested'))
     or (p_decision <> 'discarded' and v.status <> 'submitted') then
    raise exception 'invalid_transition';
  end if;
  if p_decision <> 'discarded' and exists (
       select 1 from public.design_versions o
        where o.project_id = v.project_id
          and o.deliverable_id is not distinct from v.deliverable_id
          and o.number > v.number) then
    raise exception 'version_superseded';
  end if;
  if p_decision <> 'approved' and v_comment is null then
    raise exception 'reason_required';
  end if;
  if char_length(coalesce(v_scope, '')) > 500 or char_length(coalesce(v_comment, '')) > 1000 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;

  update public.design_versions
     set status = p_decision,
         review_comment = v_comment,
         review_scope = v_scope,
         reviewed_role = 'project_owner',
         reviewed_by = public.auth_person_id(),
         reviewed_at = now()
   where id = p_version_id;

  if p_decision = 'changes_requested' and v.created_by is not null and exists (
       select 1 from public.memberships m
        where m.person_id = v.created_by and m.organization_id = v.organization_id
          and m.status = 'approved') then
    select coalesce(d.title, '') into v_title
      from public.strategy_deliverables d where d.id = v.deliverable_id;
    insert into public.tasks
      (organization_id, project_id, assignee_person_id, title, due_date,
       deliverable_id, design_version_id, created_by)
    values (v.organization_id, v.project_id, v.created_by,
            left('Retoucher la proposition V' || v.number
                 || case when coalesce(v_title, '') <> '' then ' de « ' || v_title || ' »' else '' end
                 || coalesce(' : ' || v_scope, ''), 300),
            (now() at time zone 'Europe/Paris')::date + 7,
            v.deliverable_id, v.id, public.auth_person_id())
    on conflict (design_version_id) where design_version_id is not null do nothing;
  end if;
end;
$$;
revoke execute on function public.review_design_version(uuid, text, text, text) from public, anon;
grant execute on function public.review_design_version(uuid, text, text, text) to authenticated;

-- A newer proposal answers the retouches asked on the older ones.
create or replace function public.design_versions_close_retouches()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.tasks t
     set status = 'done', done_at = now()
    from public.design_versions o
   where t.design_version_id = o.id and t.status <> 'done'
     and o.project_id = new.project_id
     and o.deliverable_id is not distinct from new.deliverable_id
     and o.number < new.number;
  return null;
end;
$$;
create trigger z_close_retouches after insert on public.design_versions
  for each row execute function public.design_versions_close_retouches();
