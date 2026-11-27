-- A strategy document's validator can be taken off (Maël's test of
-- 26/11/2026, « Validation sans recours »). A creative director asked to
-- validate the Brief de sortie, then removed from the project's team, lost
-- the project (« Page introuvable ») while their review stayed pending for
-- good: the Brief stayed sent, no new version could be written, and the
-- only gesture was « Relancer ».
--
-- 1. `strategy_document_finish`: what closes a sent version once nobody is
--    awaited any more, taken out of decide_strategy_document so a withdrawal
--    closes it the same way.
-- 2. `withdraw_strategy_review`: the project's owner takes a creative off a
--    pending review (« Retirer »). The direction's review stays: it carries
--    the stage's validation.
-- 3. Removed from the project's team = their pending reviews withdrawn.
-- 4. `strategy_document_reviews` stamps its project (project_live): a
--    validator's decision changed only this table until the last one, so the
--    pages kept showing it « En attente » (same test).

create or replace function public.strategy_document_finish(
  p_document_id uuid,
  p_by uuid
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.strategy_documents%rowtype;
  v_stage_id uuid;
begin
  select * into v_doc from public.strategy_documents where id = p_document_id for update;
  if not found or v_doc.state <> 'sent' then
    return;
  end if;
  if exists (select 1 from public.strategy_document_reviews
             where document_id = p_document_id and state in ('pending', 'changes_requested')) then
    return;
  end if;
  perform set_config('pds.strategy_decision', 'on', true);
  select project_stage_id into v_stage_id from public.validations where id = v_doc.validation_id;

  update public.strategy_documents
     set state = 'approved', decided_at = now(), decided_by = p_by
   where id = p_document_id;
  if v_doc.kind = 'brief' then
    if v_stage_id is not null then
      update public.project_stages
         set state = 'validated', state_changed_at = now(),
             state_changed_by = p_by
       where id = v_stage_id and state = 'awaiting_validation';
    end if;
    update public.strategy_workspaces
       set revision_opened_at = null, revision_opened_by = null
     where project_id = v_doc.project_id;
  end if;
end;
$$;

revoke all on function public.strategy_document_finish(uuid, uuid) from public, anon, authenticated;

-- decide_strategy_document unchanged, its closing now strategy_document_finish.
create or replace function public.decide_strategy_document(
  p_document_id uuid,
  p_approve boolean,
  p_comment text default null,
  p_accepted_alerts text[] default '{}',
  p_reserves jsonb default '[]'
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc public.strategy_documents%rowtype;
  v_review public.strategy_document_reviews%rowtype;
  v_stage_id uuid;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_reserves jsonb := coalesce(p_reserves, '[]'::jsonb);
  v_reserve jsonb;
  v_owner uuid;
  v_due date;
  v_text text;
  v_reserve_id uuid;
  v_today date := (now() at time zone 'Europe/Paris')::date;
begin
  select * into v_doc from public.strategy_documents where id = p_document_id for update;
  if not found then
    raise exception 'document_not_found';
  end if;
  select * into v_review from public.strategy_document_reviews
   where document_id = p_document_id and person_id = public.auth_person_id() for update;
  if not found or not public.is_active_member(v_doc.organization_id) then
    raise exception 'not_the_validator';
  end if;
  if v_doc.state <> 'sent' or v_review.state <> 'pending' then
    raise exception 'already_decided';
  end if;
  if not p_approve and v_comment is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  if jsonb_typeof(v_reserves) <> 'array' or jsonb_array_length(v_reserves) > 20 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;

  if p_approve then
    -- Every critical alert is accepted by name, or the version goes back.
    if exists (select 1 from unnest(public.strategy_critical_alerts(v_doc.content)) k
               where not (k = any (coalesce(p_accepted_alerts, '{}')))) then
      raise exception 'critical_alert_unaccepted' using errcode = 'P0001';
    end if;
    for v_reserve in select * from jsonb_array_elements(v_reserves) loop
      v_text := nullif(btrim(coalesce(v_reserve ->> 'text', '')), '');
      begin
        -- The project's owner by default: the reserve is theirs to lift.
        v_owner := coalesce((v_reserve ->> 'owner_person_id')::uuid,
                            (select p.owner_person_id from public.projects p
                              where p.id = v_doc.project_id));
        v_due := (v_reserve ->> 'due_on')::date;
      exception when others then
        raise exception 'invalid_reserve' using errcode = '23514';
      end;
      if v_reserve ->> 'due_on' is null then
        v_due := coalesce(
          (select d from (select public.strategy_reference_date(v_doc.project_id) as d) x
            where x.d >= v_today),
          v_today + 7);
      end if;
      if v_text is null or char_length(v_text) > 1000 or (v_due is not null and v_due < v_today)
         or v_owner is null or not exists (
           select 1 from public.memberships m
            where m.person_id = v_owner and m.organization_id = v_doc.organization_id
              and m.status = 'approved') then
        raise exception 'invalid_reserve' using errcode = '23514';
      end if;
      insert into public.strategy_document_reserves
        (organization_id, project_id, document_id, review_id, text, owner_person_id,
         due_on, created_by)
      values (v_doc.organization_id, v_doc.project_id, p_document_id, v_review.id, v_text,
              v_owner, v_due, public.auth_person_id())
      returning id into v_reserve_id;
      insert into public.tasks
        (organization_id, project_id, assignee_person_id, title, due_date,
         strategy_reserve_id, created_by)
      values (v_doc.organization_id, v_doc.project_id, v_owner,
              left('Lever la réserve : ' || v_text, 300), v_due, v_reserve_id,
              public.auth_person_id());
    end loop;
  end if;

  update public.strategy_document_reviews
     set state = case when p_approve then 'approved' else 'changes_requested' end,
         comment = v_comment, decided_at = now(),
         accepted_alerts = case when p_approve
           then public.strategy_critical_alerts(v_doc.content) else '{}' end,
         with_reserves = p_approve and jsonb_array_length(v_reserves) > 0
   where id = v_review.id;
  -- The stage's validation follows this function only (validations guard).
  perform set_config('pds.strategy_decision', 'on', true);
  select project_stage_id into v_stage_id from public.validations where id = v_doc.validation_id;

  if not p_approve then
    update public.strategy_document_reviews set state = 'cancelled'
     where document_id = p_document_id and state = 'pending';
    update public.strategy_documents
       set state = 'changes_requested', change_comment = v_comment,
           decided_at = now(), decided_by = public.auth_person_id()
     where id = p_document_id;
    if v_doc.validation_id is not null then
      update public.validations
         set state = 'rejected', decision_comment = v_comment, decided_at = now()
       where id = v_doc.validation_id and state = 'pending';
      update public.project_stages
         set state = 'in_progress', state_changed_at = now(),
             state_changed_by = public.auth_person_id()
       where id = v_stage_id and state = 'awaiting_validation';
    end if;
    return;
  end if;

  if v_doc.validation_id is not null then
    update public.validations
       set state = 'approved', decision_comment = v_comment, decided_at = now()
     where id = v_doc.validation_id and state = 'pending'
       and validator_person_id = public.auth_person_id();
  end if;
  perform public.strategy_document_finish(p_document_id, public.auth_person_id());
end;
$$;

-- Whether a review is the direction's: the stage's validator, or the sole
-- validator the version was sent to (a revision has no stage validation).
-- sole_validator raises without exactly one validator: then the stage's
-- validator alone says it.
create or replace function public.strategy_review_is_direction(
  p_review public.strategy_document_reviews
) returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sole uuid;
begin
  begin
    v_sole := public.sole_validator(p_review.organization_id);
  exception when others then
    v_sole := null;
  end;
  return p_review.person_id = v_sole
      or exists (
        select 1 from public.strategy_documents d
          join public.validations v on v.id = d.validation_id
         where d.id = p_review.document_id
           and v.validator_person_id = p_review.person_id);
end;
$$;

revoke all on function public.strategy_review_is_direction(public.strategy_document_reviews)
  from public, anon, authenticated;

-- « Retirer » a validator still awaited, by the project's owner.
create or replace function public.withdraw_strategy_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review public.strategy_document_reviews%rowtype;
  v_doc public.strategy_documents%rowtype;
begin
  select * into v_review from public.strategy_document_reviews where id = p_review_id for update;
  if not found then
    raise exception 'review_not_found';
  end if;
  select * into v_doc from public.strategy_documents where id = v_review.document_id;
  if not public.is_project_owner(v_doc.project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if v_review.state <> 'pending' or v_doc.state <> 'sent' then
    raise exception 'already_decided';
  end if;
  if public.strategy_review_is_direction(v_review) then
    raise exception 'direction_review_kept';
  end if;
  update public.strategy_document_reviews set state = 'cancelled' where id = p_review_id;
  perform public.strategy_document_finish(v_doc.id, public.auth_person_id());
end;
$$;

revoke all on function public.withdraw_strategy_review(uuid) from public, anon;
grant execute on function public.withdraw_strategy_review(uuid) to authenticated;

-- Removed from the project's team: who no longer sees the project no longer
-- holds a version back.
create or replace function public.project_creatives_withdraw_reviews()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review public.strategy_document_reviews%rowtype;
begin
  for v_review in
    select r.* from public.strategy_document_reviews r
      join public.strategy_documents d on d.id = r.document_id
     where d.project_id = old.project_id and d.state = 'sent'
       and r.person_id = old.person_id and r.state = 'pending'
     for update of r
  loop
    continue when public.strategy_review_is_direction(v_review);
    update public.strategy_document_reviews set state = 'cancelled' where id = v_review.id;
    perform public.strategy_document_finish(v_review.document_id, public.auth_person_id());
  end loop;
  return null;
end;
$$;

drop trigger if exists withdraw_reviews on public.project_creatives;
create trigger withdraw_reviews
  after delete on public.project_creatives
  for each row execute function public.project_creatives_withdraw_reviews();

-- project_live: a review reaches its project through its document.
create or replace function public.project_live_tick()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  v_projects uuid[];
  v_project uuid;
  v_done text := coalesce(current_setting('pds.live_bumped', true), '');
  v_key text;
begin
  case tg_argv[0]
    when 'project' then
      v_project := (v_row ->> 'project_id')::uuid;
      if v_project is null and v_row ? 'contract_id' then
        select c.project_id into v_project from public.contracts c
         where c.id = (v_row ->> 'contract_id')::uuid;
      end if;
      v_projects := array[v_project];
    when 'self' then
      v_projects := array[(v_row ->> 'id')::uuid];
    when 'stage' then
      select array_agg(s.project_id) into v_projects from public.project_stages s
       where s.id = (v_row ->> 'project_stage_id')::uuid;
    when 'call' then
      select array_agg(c.project_id) into v_projects from public.calls c
       where c.id = (v_row ->> 'call_id')::uuid;
    when 'master' then
      select array_agg(pm.project_id) into v_projects from public.project_masters pm
       where pm.master_id = (v_row ->> 'master_id')::uuid;
    when 'master_self' then
      select array_agg(pm.project_id) into v_projects from public.project_masters pm
       where pm.master_id = (v_row ->> 'id')::uuid;
    when 'clearance' then
      select array_agg(c.project_id) into v_projects from public.legal_clearances c
       where c.id = (v_row ->> 'clearance_id')::uuid;
    when 'formality' then
      select array_agg(f.project_id) into v_projects from public.legal_formalities f
       where f.id = (v_row ->> 'formality_id')::uuid;
    when 'split_sheet' then
      select array_agg(s.project_id) into v_projects from public.legal_split_sheets s
       where s.id = (v_row ->> 'sheet_id')::uuid;
    when 'split_version' then
      select array_agg(s.project_id) into v_projects
        from public.legal_split_versions v
        join public.legal_split_sheets s on s.id = v.sheet_id
       where v.id = (v_row ->> 'version_id')::uuid;
    when 'contract' then
      select array_agg(c.project_id) into v_projects from public.contracts c
       where c.id = (v_row ->> 'contract_id')::uuid;
    when 'strategy_document' then
      select array_agg(d.project_id) into v_projects from public.strategy_documents d
       where d.id = (v_row ->> 'document_id')::uuid;
    else
      v_projects := null;
  end case;

  -- One version per project and transaction (`<project>,`), each table of
  -- it stamped once (`<project>:<table>,`).
  foreach v_project in array coalesce(v_projects, array[]::uuid[]) loop
    continue when v_project is null;
    v_key := v_project::text || ':' || tg_table_name || ',';
    continue when position(v_key in v_done) > 0;
    perform public.project_live_bump(
      v_project, tg_table_name::text,
      position(v_project::text || ',' in v_done) = 0);
    v_done := v_done || v_project::text || ',' || v_key;
    perform set_config('pds.live_bumped', v_done, true);
  end loop;
  return null;
end;
$$;

drop trigger if exists zz_project_live on public.strategy_document_reviews;
create trigger zz_project_live
  after insert or update or delete on public.strategy_document_reviews
  for each row execute function public.project_live_tick('strategy_document');

select public.attach_project_live();
