-- Marketing › Suivi & bilan, lot 4 (ticket « Suivi & bilan », écran 3,
-- docs/ARCHITECTURE.md § 8 terdecies): the validation of a provisional
-- review.
--   * the owner submits one precise version (submit_marketing_report); a
--     validator must exist in the organization (« Validateur non configuré :
--     permettre la préparation mais pas la décision »);
--   * the validator (holder of « validate » who sees the project) decides on
--     that version only: « Approuver le bilan provisoire (avec réserves) »,
--     « Demander des corrections » or « Reporter la validation »
--     (decide_marketing_report). The decision names the version it was taken
--     on: an older or already decided version is refused
--     (report_superseded); the reserves of the version are stored with it;
--     a comment is required to ask for corrections or to postpone;
--   * separation of roles: whoever generated or submitted the version never
--     decides on it (self_approval);
--   * approving changes nothing else: the activations keep their declared /
--     verified levels, the reserves stay open, the Marketing is not closed.

create table public.marketing_report_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  report_id uuid not null,
  report_version integer not null,
  decision text not null,
  validator_person_id uuid not null references public.people (id),
  -- Who prepared the version: kept to show the roles were separate.
  preparer_person_id uuid references public.people (id),
  comment text,
  -- The reserves of the version, as they were when the decision was taken.
  reserves jsonb not null default '[]'::jsonb,
  decided_at timestamptz not null default now(),
  constraint marketing_report_approvals_decision_check
    check (decision in ('approved_provisional', 'changes_requested', 'postponed')),
  constraint marketing_report_approvals_comment_check
    check (comment is null or (btrim(comment) <> '' and char_length(comment) <= 2000)),
  constraint marketing_report_approvals_comment_required
    check (decision = 'approved_provisional' or comment is not null),
  constraint marketing_report_approvals_reserves_check check (jsonb_typeof(reserves) = 'array'),
  constraint marketing_report_approvals_separation
    check (preparer_person_id is null or preparer_person_id <> validator_person_id),
  constraint marketing_report_approvals_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint marketing_report_approvals_report_same_org foreign key (report_id, organization_id)
    references public.marketing_reports (id, organization_id) on delete cascade
);
create index marketing_report_approvals_report_idx
  on public.marketing_report_approvals (report_id, decided_at desc);

alter table public.marketing_report_approvals enable row level security;
alter table public.marketing_report_approvals force row level security;
revoke all on table public.marketing_report_approvals from anon, authenticated;
grant select on public.marketing_report_approvals to authenticated;
create policy marketing_report_approvals_select on public.marketing_report_approvals
  for select to authenticated using (public.can_see_project(project_id));

-- « Soumettre à validation »: the latest version, by the project's owner.
create function public.submit_marketing_report(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report public.marketing_reports%rowtype;
begin
  select * into v_report from public.marketing_reports where id = p_report_id for update;
  if not found or not public.can_see_project(v_report.project_id) then
    raise exception 'not_found';
  end if;
  if not public.is_project_owner(v_report.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if exists (select 1 from public.marketing_reports r
              where r.project_id = v_report.project_id and r.version > v_report.version) then
    raise exception 'report_superseded';
  end if;
  -- Corrections asked: a new version is generated, this one stays as it was.
  if v_report.state not in ('generated', 'postponed') then
    raise exception 'invalid_transition';
  end if;
  -- Raises no_validator / multiple_validators: preparing is allowed, not
  -- sending to nobody.
  perform public.sole_validator(v_report.organization_id);
  update public.marketing_reports
     set state = 'to_validate', submitted_by = public.auth_person_id(), submitted_at = now()
   where id = p_report_id;
end;
$$;
revoke execute on function public.submit_marketing_report(uuid) from public, anon;
grant execute on function public.submit_marketing_report(uuid) to authenticated;

-- The validator's decision on one precise version.
create function public.decide_marketing_report(
  p_report_id uuid,
  p_expected_version integer,
  p_decision text,
  p_comment text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report public.marketing_reports%rowtype;
  v_me uuid := public.auth_person_id();
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_id uuid;
begin
  select * into v_report from public.marketing_reports where id = p_report_id for update;
  if not found or not public.can_see_project(v_report.project_id) then
    raise exception 'not_found';
  end if;
  if not public.has_permission(v_report.organization_id, 'validate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_decision not in ('approved_provisional', 'changes_requested', 'postponed') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  -- The decision is taken on the version the validator read.
  if v_report.version <> p_expected_version or v_report.state <> 'to_validate'
     or exists (select 1 from public.marketing_reports r
                 where r.project_id = v_report.project_id and r.version > v_report.version) then
    raise exception 'report_superseded';
  end if;
  if v_me = v_report.created_by or v_me = v_report.submitted_by then
    raise exception 'self_approval' using errcode = '42501';
  end if;
  if p_decision <> 'approved_provisional' and v_comment is null then
    raise exception 'comment_required' using errcode = '23514';
  end if;
  if char_length(coalesce(v_comment, '')) > 2000 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;

  insert into public.marketing_report_approvals
    (organization_id, project_id, report_id, report_version, decision, validator_person_id,
     preparer_person_id, comment, reserves)
  values (v_report.organization_id, v_report.project_id, v_report.id, v_report.version, p_decision,
          v_me, v_report.created_by, v_comment,
          coalesce(v_report.snapshot -> 'reserves', '[]'::jsonb))
  returning id into v_id;
  update public.marketing_reports set state = p_decision where id = v_report.id;
  return v_id;
end;
$$;
revoke execute on function public.decide_marketing_report(uuid, integer, text, text) from public, anon;
grant execute on function public.decide_marketing_report(uuid, integer, text, text) to authenticated;

-- Audit: the decision, its author, its target and its comment.
create function public.marketing_approval_events_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.marketing_log(new.organization_id, new.project_id, 'approval.' || new.decision,
                               new.report_id, null, jsonb_build_object('state', 'to_validate'),
                               jsonb_build_object('state', new.decision,
                                                  'version', new.report_version,
                                                  'reserves', jsonb_array_length(new.reserves)),
                               new.comment);
  return null;
end;
$$;
revoke execute on function public.marketing_approval_events_write() from public, anon, authenticated;
create trigger z_events after insert on public.marketing_report_approvals
  for each row execute function public.marketing_approval_events_write();

-- The report's own trigger (lot 3) leaves the decisions to the approvals'
-- one above, which carries the comment: one event per decision.
create or replace function public.marketing_report_events_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'marketing_reserves' then
    if tg_op = 'INSERT' then
      perform public.marketing_log(new.organization_id, new.project_id, 'reserve.created', new.id,
                                   new.activation_id, null,
                                   jsonb_build_object('category', new.category,
                                                      'description', new.description,
                                                      'origin', new.origin), null);
    elsif (to_jsonb(new) - array['updated_at', 'origin_report_id'])
          is distinct from (to_jsonb(old) - array['updated_at', 'origin_report_id']) then
      perform public.marketing_log(new.organization_id, new.project_id, 'reserve.updated', new.id,
                                   new.activation_id, d.old_value, d.new_value, null)
         from public.marketing_diff(to_jsonb(old), to_jsonb(new),
                                    array['updated_at', 'origin_report_id']) d;
    end if;
  elsif tg_op = 'INSERT' then
    perform public.marketing_log(new.organization_id, new.project_id, 'report.generated', new.id,
                                 null, null,
                                 jsonb_build_object('version', new.version,
                                                    'content_hash', new.content_hash), null);
  elsif new.state is distinct from old.state
        and new.state not in ('approved_provisional', 'changes_requested', 'postponed') then
    perform public.marketing_log(new.organization_id, new.project_id, 'report.' || new.state,
                                 new.id, null, jsonb_build_object('state', old.state),
                                 jsonb_build_object('state', new.state, 'version', new.version),
                                 null);
  end if;
  return null;
end;
$$;
