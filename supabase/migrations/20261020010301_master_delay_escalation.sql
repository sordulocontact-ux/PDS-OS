-- Master, a delay the engineer signals (docs/projet-complet/master.md § 6,
-- proto `master:thread`): the owner applies the dates it touches, keeps
-- them (saying why to the engineer, who reads it on their link), or — when
-- the Master final would pass the release — sends it to the direction,
-- who is told and decides: apply the dates (the release is to review) or
-- refuse the delay. Nothing moves by itself; the dates moved are computed
-- by the code (lib/master-workflow/delay-impact.ts) and ordered by the
-- Brief's own check.
--
-- master_engineer_messages: status 'escalated' (« Chez la direction »),
-- who escalated and when, the outcome of a delay (applied, kept, refused)
-- and who decided. The answer to the engineer is a team message of the
-- same sending, as any answer.

alter table public.master_engineer_messages
  drop constraint master_engineer_messages_status_check,
  drop constraint master_engineer_messages_handled_check;
alter table public.master_engineer_messages
  add column escalated_at timestamptz,
  add column escalated_by uuid references public.people (id),
  add column outcome text,
  add constraint master_engineer_messages_status_check check (
    (kind = 'message' and status is null)
    or (kind <> 'message' and status in ('open', 'escalated', 'handled'))),
  add constraint master_engineer_messages_handled_check
    check ((status = 'handled') = (handled_at is not null)),
  add constraint master_engineer_messages_escalated_check
    check (status is distinct from 'escalated' or (kind = 'delay' and escalated_at is not null)),
  add constraint master_engineer_messages_outcome_check
    check (outcome is null or (kind = 'delay' and outcome in ('applied', 'kept', 'refused')));

select public.add_notification_kinds(array['master_delay_escalated', 'master_delay_decided']);

-- The delay a member may decide on now: the owner while it is open, the
-- direction once it was sent to them.
create or replace function public.master_delay_for_decision(p_message_id uuid)
returns public.master_engineer_messages
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.master_engineer_messages%rowtype;
begin
  select * into v from public.master_engineer_messages
   where id = p_message_id and kind = 'delay' for update;
  if not found
     or not ((v.status = 'open' and public.is_project_owner(v.project_id))
             or (v.status = 'escalated' and public.is_direction(v.organization_id))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return v;
end;
$$;
revoke execute on function public.master_delay_for_decision(uuid) from public, anon, authenticated;

-- The answer the engineer reads on their link, then the delay handled.
create or replace function public.close_master_delay(
  p_delay public.master_engineer_messages, p_outcome text, p_reply text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_reply text := nullif(btrim(coalesce(p_reply, '')), '');
  v_owner uuid;
  v_actor uuid := public.auth_person_id();
begin
  if v_reply is not null then
    if char_length(v_reply) > 2000 then
      raise exception 'invalid_input' using errcode = '23514';
    end if;
    insert into public.master_engineer_messages
      (organization_id, project_id, transmission_id, stage, kind, author, author_person_id, body)
    values (p_delay.organization_id, p_delay.project_id, p_delay.transmission_id, p_delay.stage,
            'message', 'team', v_actor, v_reply);
  end if;
  update public.master_engineer_messages
     set status = 'handled', outcome = p_outcome
   where id = p_delay.id;
  -- The direction decided: the owner is told.
  if p_delay.status = 'escalated' then
    select owner_person_id into v_owner from public.projects where id = p_delay.project_id;
    if v_owner is not null and v_owner is distinct from v_actor then
      insert into public.notifications
        (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
      values (p_delay.organization_id, v_owner, v_actor, 'master_delay_decided',
              p_delay.project_id, p_delay.transmission_id);
    end if;
  end if;
end;
$$;
revoke execute on function public.close_master_delay(public.master_engineer_messages, text, text)
  from public, anon, authenticated;

-- « Envoyer à la direction » (the owner): the direction is told.
create or replace function public.escalate_master_delay(p_message_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.master_engineer_messages%rowtype := public.master_delay_for_decision(p_message_id);
begin
  if v.status <> 'open' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  update public.master_engineer_messages
     set status = 'escalated', escalated_at = now(), escalated_by = public.auth_person_id()
   where id = v.id;
  perform public.notify_direction(v.organization_id, 'master_delay_escalated', v.project_id,
                                  v.transmission_id, public.auth_person_id());
end;
$$;
revoke execute on function public.escalate_master_delay(uuid) from public, anon;
grant execute on function public.escalate_master_delay(uuid) to authenticated;

-- « Garder les dates » (owner) or « Refuser le retard » (direction): the
-- engineer is told why (required).
create or replace function public.keep_master_dates(p_message_id uuid, p_reply text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.master_engineer_messages%rowtype := public.master_delay_for_decision(p_message_id);
begin
  if nullif(btrim(coalesce(p_reply, '')), '') is null then
    raise exception 'reply_required' using errcode = '23514';
  end if;
  perform public.close_master_delay(v, case v.status when 'escalated' then 'refused' else 'kept' end,
                                    p_reply);
end;
$$;
revoke execute on function public.keep_master_dates(uuid, text) from public, anon;
grant execute on function public.keep_master_dates(uuid, text) to authenticated;

-- « Appliquer ces dates » (owner) or « Appliquer ces dates (la sortie est à
-- revoir) » (direction): the Brief's dates the delay touches, computed by the
-- code, written (their order checked by the Brief), the engineer answered.
create or replace function public.apply_master_delay(p_message_id uuid, p_dates jsonb, p_reply text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.master_engineer_messages%rowtype := public.master_delay_for_decision(p_message_id);
begin
  if jsonb_typeof(coalesce(p_dates, 'null'::jsonb)) <> 'object'
     or exists (select 1 from jsonb_object_keys(p_dates) k
                 where k not in ('mix_v1_due', 'mix_final_due', 'mastering_due', 'master_final_due')) then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  update public.master_briefs
     set mix_v1_due = coalesce((p_dates ->> 'mix_v1_due')::date, mix_v1_due),
         mix_final_due = coalesce((p_dates ->> 'mix_final_due')::date, mix_final_due),
         mastering_due = coalesce((p_dates ->> 'mastering_due')::date, mastering_due),
         master_final_due = coalesce((p_dates ->> 'master_final_due')::date, master_final_due)
   where project_id = v.project_id;
  perform public.close_master_delay(v, 'applied', p_reply);
end;
$$;
revoke execute on function public.apply_master_delay(uuid, jsonb, text) from public, anon;
grant execute on function public.apply_master_delay(uuid, jsonb, text) to authenticated;
