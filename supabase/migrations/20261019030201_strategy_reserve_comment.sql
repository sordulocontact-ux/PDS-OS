-- « Valider avec réserves » as in the proto « Projet complet » (lot 3,
-- 19/10/2026): the validator writes one comment; it becomes a reserve and a
-- task of the project's owner (MKT-S1-16 asked an owner and a date for each
-- reserve; the proto of 18/10 keeps the comment alone). A task needs a date
-- (tasks_due_date_required): without one given, the code takes the release
-- date (a reserve is lifted before the release), else a week from today. A
-- date given must still be to come.

alter table public.strategy_document_reserves alter column due_on drop not null;

create or replace function public.decide_strategy_document(
  p_document_id uuid,
  p_approve boolean,
  p_comment text default null,
  p_accepted_alerts text[] default '{}',
  p_reserves jsonb default '[]'::jsonb
)
returns void
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
  if exists (select 1 from public.strategy_document_reviews
             where document_id = p_document_id and state = 'pending') then
    return;
  end if;

  update public.strategy_documents
     set state = 'approved', decided_at = now(), decided_by = public.auth_person_id()
   where id = p_document_id;
  if v_doc.kind = 'brief' then
    if v_stage_id is not null then
      update public.project_stages
         set state = 'validated', state_changed_at = now(),
             state_changed_by = public.auth_person_id()
       where id = v_stage_id and state = 'awaiting_validation';
    end if;
    update public.strategy_workspaces
       set revision_opened_at = null, revision_opened_by = null
     where project_id = v_doc.project_id;
  end if;
end;
$$;
