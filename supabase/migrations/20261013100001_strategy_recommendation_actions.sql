-- Retours Marketing du 12/10/2026, MKT-C2-02 (docs/ARCHITECTURE.md § 6 bis,
-- « Suivi : recommandations »).
--
--   1. a settled recommendation keeps what it said when it was settled: its
--      level (information, recommendation, risk, blocking — decided by the
--      code from its rule) and its text, since the rule may stop firing once
--      the data move; an ignored one keeps its reason;
--   2. « Créer la tâche » goes through one function: the recommendation and
--      its task are written together, the title, assignee and due date
--      prefilled by the code and corrected by the owner. Replaying it (two
--      clicks, two tabs) returns the same task, never a second one: before,
--      the task was inserted first and the recommendation second, outside
--      any transaction.

alter table public.strategy_recommendations
  add column level text,
  add column summary text,
  add column reason text,
  add constraint strategy_recommendations_level_check
    check (level is null or level in ('information', 'recommendation', 'risk', 'blocking')),
  add constraint strategy_recommendations_summary_length
    check (summary is null or char_length(summary) <= 1000),
  add constraint strategy_recommendations_reason_length
    check (reason is null or char_length(reason) <= 1000);
-- Ignoring now says why; the rows ignored before this rule keep no reason.
alter table public.strategy_recommendations
  add constraint strategy_recommendations_ignored_reason
    check (state <> 'ignored' or btrim(coalesce(reason, '')) <> '') not valid;

grant insert (level, summary, reason) on public.strategy_recommendations to authenticated;

-- « Créer la tâche »: the owner of the project turns a recommendation into
-- a task of a member's Travail, once. The level and the summary are the
-- code's (lib/strategy/follow-up-results.ts), the title, assignee and due
-- date the owner's, prefilled. Returns the task, the existing one when the
-- recommendation was already turned into a task.
create function public.apply_strategy_recommendation(
  p_project_id uuid,
  p_rule_key text,
  p_level text,
  p_summary text,
  p_title text,
  p_assignee uuid,
  p_due_on date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_rec public.strategy_recommendations%rowtype;
  v_task uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.is_project_owner(p_project_id)
     or not public.is_active_member(v_org) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_rule_key is null or p_rule_key !~ '^[a-z0-9_:-]{1,120}$'
     or p_level is null or p_level not in ('information', 'recommendation', 'risk', 'blocking')
     or v_title is null or char_length(v_title) > 300
     or char_length(coalesce(p_summary, '')) > 1000
     or p_due_on is null or p_due_on < (now() at time zone 'Europe/Paris')::date
     or p_assignee is null or not exists (
       select 1 from public.memberships m
        where m.person_id = p_assignee and m.organization_id = v_org
          and m.status = 'approved') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;

  -- The unique key (project, rule) serialises two concurrent calls: the
  -- second waits for the first, then finds its row.
  insert into public.strategy_recommendations
    (organization_id, project_id, rule_key, state, level, summary, created_by)
  values (v_org, p_project_id, p_rule_key, 'applied', p_level, p_summary,
          public.auth_person_id())
  on conflict (project_id, rule_key) do nothing
  returning * into v_rec;

  if v_rec.id is null then
    select * into v_rec from public.strategy_recommendations
     where project_id = p_project_id and rule_key = p_rule_key;
    if v_rec.state <> 'applied' then
      raise exception 'recommendation_settled' using errcode = '23505';
    end if;
    if v_rec.task_id is not null then
      return v_rec.task_id;
    end if;
  end if;

  insert into public.tasks
    (organization_id, project_id, assignee_person_id, title, due_date, created_by)
  values (v_org, p_project_id, p_assignee, v_title, p_due_on, public.auth_person_id())
  returning id into v_task;
  update public.strategy_recommendations set task_id = v_task where id = v_rec.id;
  return v_task;
end;
$$;
revoke execute on function public.apply_strategy_recommendation(uuid, text, text, text, text, uuid, date)
  from public, anon;
grant execute on function public.apply_strategy_recommendation(uuid, text, text, text, text, uuid, date)
  to authenticated;
