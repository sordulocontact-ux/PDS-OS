-- Master, Ibé's feedback of 04/11/2026 (« je dois m'assigner moi-même le
-- mix ou le master, je ne comprends pas pourquoi ; le DG doit pouvoir
-- corriger ces rôles »).
--
-- 1. The in-house engineer is given his round by itself, never by a click:
--    the mix as soon as the Brief is recorded (and the final vocals are not
--    awaited with « Attendre »), the mastering as soon as a mix is validated.
--    He is told (master_round_assigned), as by « Assigner à … » before;
--    assign_master_round stays as a fallback.
-- 2. The DG (permission « validate ») may correct who mixes, who masters
--    and who validates the versions, as the project's owner does, as long
--    as no version of that round is validated (a validated round is
--    definitive). The owner keeps writing through the Brief's own grants.

-- 1 --------------------------------------------------------------------------
create or replace function public._master_auto_assign(p_project_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  b public.master_briefs%rowtype;
  v_actor uuid := public.auth_person_id();
  v_mastering uuid;
begin
  select * into b from public.master_briefs where project_id = p_project_id;
  if not found then
    return;
  end if;
  if b.mix_person_id is not null and b.mix_assigned_at is null and b.recorded_at is not null
     and not exists (
       select 1 from public.project_masters pm
        join lateral (select s.vocals_final, s.plan from public.master_flow_sources s
                       where s.project_id = p_project_id and s.master_id = pm.master_id
                       order by s.created_at desc limit 1) cur on true
        where pm.project_id = p_project_id and cur.vocals_final = false and cur.plan = 'wait') then
    update public.master_briefs set mix_assigned_at = now(), mix_assigned_by = v_actor
     where id = b.id;
    if b.mix_person_id is distinct from v_actor then
      insert into public.notifications
        (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
      values (b.organization_id, b.mix_person_id, v_actor, 'master_round_assigned', p_project_id, null);
    end if;
  end if;
  v_mastering := case when b.mastering_same_engineer then b.mix_person_id
                      else b.mastering_person_id end;
  if v_mastering is not null and b.mastering_assigned_at is null and exists (
       select 1 from public.master_mix_versions v
        where v.project_id = p_project_id and v.stage = 'mix' and v.decision = 'approved') then
    update public.master_briefs set mastering_assigned_at = now(), mastering_assigned_by = v_actor
     where id = b.id;
    if v_mastering is distinct from v_actor then
      insert into public.notifications
        (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
      values (b.organization_id, v_mastering, v_actor, 'master_round_assigned', p_project_id, null);
    end if;
  end if;
end;
$$;
revoke execute on function public._master_auto_assign(uuid) from public, anon, authenticated;

create or replace function public._master_auto_assign_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._master_auto_assign(new.project_id);
  return null;
end;
$$;
revoke execute on function public._master_auto_assign_trigger() from public, anon, authenticated;

-- The Brief recorded or its engineers changed (the BEFORE trigger
-- check_master_brief_persons cleared the assignment of a new engineer).
-- Only these columns: the assignment itself does not fire it again.
create trigger z_master_auto_assign_brief
  after insert or update of recorded_at, mix_person_id, mastering_person_id, mastering_same_engineer
  on public.master_briefs
  for each row execute function public._master_auto_assign_trigger();

-- The final vocals arrived, or the plan went from « Attendre » to « Anticiper ».
create trigger z_master_auto_assign_source
  after insert or update on public.master_flow_sources
  for each row execute function public._master_auto_assign_trigger();

-- A mix validated: the mastering is given.
create trigger z_master_auto_assign_version
  after insert or update of decision on public.master_mix_versions
  for each row
  when (new.stage = 'mix' and new.decision = 'approved')
  execute function public._master_auto_assign_trigger();

-- The projects already waiting for « Assigner à … ».
do $$
declare
  r record;
begin
  for r in select project_id from public.master_briefs
            where (mix_person_id is not null and mix_assigned_at is null)
               or ((case when mastering_same_engineer then mix_person_id
                         else mastering_person_id end) is not null
                   and mastering_assigned_at is null)
  loop
    perform public._master_auto_assign(r.project_id);
  end loop;
end;
$$;

-- 2 --------------------------------------------------------------------------
-- p_field: 'mix' / 'mastering' (p_value 'contact:<id>' or 'person:<id>'),
-- 'same' ('yes' / 'no'), 'validator' (a person's id).
create or replace function public.direction_set_master_person(
  p_project_id uuid, p_field text, p_value text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_kind text := split_part(coalesce(p_value, ''), ':', 1);
  v_id uuid;
  v_stage text;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or public.is_project_owner(p_project_id)
     or not public.has_permission(v_org, 'validate')
     or not public.can_see_project(p_project_id) then
    -- The owner writes through the Brief (RLS); here, the DG only.
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_field not in ('mix', 'mastering', 'same', 'validator') then
    raise exception 'invalid_field';
  end if;
  v_stage := case p_field when 'mix' then 'mix' when 'validator' then null else 'mastering' end;
  if v_stage is not null and exists (
       select 1 from public.master_mix_versions v
        where v.project_id = p_project_id and v.stage = v_stage and v.decision = 'approved') then
    raise exception 'round_validated' using errcode = '23514';
  end if;
  if p_field in ('mix', 'mastering') then
    if v_kind not in ('contact', 'person') then
      raise exception 'invalid_value';
    end if;
    v_id := split_part(p_value, ':', 2)::uuid;
  elsif p_field = 'validator' then
    v_id := p_value::uuid;
  elsif p_value not in ('yes', 'no') then
    raise exception 'invalid_value';
  end if;
  insert into public.master_briefs (organization_id, project_id)
  values (v_org, p_project_id)
  on conflict (project_id) do nothing;
  if p_field = 'mix' then
    update public.master_briefs
       set mix_contact_id = case when v_kind = 'contact' then v_id end,
           mix_person_id = case when v_kind = 'person' then v_id end
     where project_id = p_project_id;
  elsif p_field = 'mastering' then
    update public.master_briefs
       set mastering_same_engineer = false,
           mastering_contact_id = case when v_kind = 'contact' then v_id end,
           mastering_person_id = case when v_kind = 'person' then v_id end
     where project_id = p_project_id;
  elsif p_field = 'same' then
    update public.master_briefs
       set mastering_same_engineer = (p_value = 'yes'),
           mastering_contact_id = case when p_value = 'yes' then null else mastering_contact_id end,
           mastering_person_id = case when p_value = 'yes' then null else mastering_person_id end
     where project_id = p_project_id;
  else
    update public.master_briefs set validator_person_id = v_id where project_id = p_project_id;
  end if;
end;
$$;
revoke execute on function public.direction_set_master_person(uuid, text, text) from public, anon;
grant execute on function public.direction_set_master_person(uuid, text, text) to authenticated;
