-- Master, the engineer's rate (Sacha, 04/11/2026): the owner may refuse
-- a proposed rate, with why (rule 6); the engineer reads it on their link
-- and proposes another amount. Work goes on meanwhile: nothing is blocked
-- (Sacha's choice « pour la facilité »).
--
-- The refusal lives on the role's budget line (one per project and role):
-- the line goes back to Estimé (planned, the Brief's estimate), the refused
-- amount, the reason, when and by whom are kept and stay shown once a new
-- amount is proposed. Read by the budget readers through the line's RLS,
-- by the engineer through their link only (master_rate_refusals).

alter table public.budget_lines
  add column refused_cents bigint,
  add column refusal_reason text,
  add column refused_at timestamptz,
  add column refused_by uuid references public.people (id) on delete set null,
  add constraint budget_lines_refusal_master_only
    check (refused_at is null or master_role is not null);

-- « Refuser » ---------------------------------------------------------------
create function public.refuse_master_rate(p_project_id uuid, p_role text, p_reason text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_line public.budget_lines%rowtype;
  v_estimate bigint;
  v_actor uuid := public.auth_person_id();
  v_name text;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role not in ('mix', 'mastering') then
    raise exception 'invalid_role';
  end if;
  if v_reason is null or char_length(v_reason) > 1000 then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  select * into v_line from public.budget_lines
   where project_id = p_project_id and master_role = p_role and status = 'proposed'
   for update;
  if not found then
    raise exception 'nothing_proposed';
  end if;
  select case p_role when 'mix' then mix_rate_cents else mastering_rate_cents end
    into v_estimate
    from public.master_briefs where project_id = p_project_id;
  select nullif(btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')
    into v_name from public.people where id = v_actor;
  update public.budget_lines
     set status = 'planned',
         amount_cents = coalesce(v_estimate, v_line.amount_cents),
         refused_cents = v_line.amount_cents,
         refusal_reason = v_reason,
         refused_at = now(),
         refused_by = v_actor,
         note = 'Refusé par ' || coalesce(v_name, 'le responsable') || ' : ' || v_reason
   where id = v_line.id;
end;
$$;
revoke execute on function public.refuse_master_rate(uuid, text, text) from public, anon;
grant execute on function public.refuse_master_rate(uuid, text, text) to authenticated;

-- The link's roles: its own, plus the mastering on the mix link of the
-- engineer who masters too (as take_master_transmission).
create function public._master_link_roles(v_row public.master_transmissions)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when v_row.role = 'mix' and coalesce((select b.mastering_same_engineer
                                            from public.master_briefs b
                                           where b.project_id = v_row.project_id), false)
      then array['mix', 'mastering']
    else array[v_row.role] end;
$$;
revoke execute on function public._master_link_roles(public.master_transmissions) from public, anon, authenticated;

-- What the engineer reads on their link: per role of the link, the last
-- refusal (amount, reason, when) and whether it still waits for an answer,
-- with the amount proposed since. Nothing else of the budget.
create function public._master_rate_refusals_h(p_link_hash text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_transmissions%rowtype;
begin
  v_row := public._open_transmission_of_h(p_link_hash);
  return coalesce((
    select jsonb_object_agg(l.master_role, jsonb_build_object(
             'refusedCents', l.refused_cents,
             'reason', l.refusal_reason,
             'refusedAt', l.refused_at,
             'open', l.status = 'planned',
             'proposedCents', case when l.status <> 'planned' then l.amount_cents end))
      from public.budget_lines l
     where l.project_id = v_row.project_id
       and l.master_role = any (public._master_link_roles(v_row))
       and l.refused_at is not null), '{}'::jsonb);
end;
$$;
revoke execute on function public._master_rate_refusals_h(text) from public, anon, authenticated;

create function public.master_rate_refusals(p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return public._master_rate_refusals_h(public.link_token_hash(p_token));
end;
$$;
revoke execute on function public.master_rate_refusals(text) from public;
grant execute on function public.master_rate_refusals(text) to anon, authenticated;

create function public.master_rate_refusals(p_contact_token text, p_item_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return public._master_rate_refusals_h(
    public.contact_item_hash('master', p_contact_token, p_item_id));
end;
$$;
revoke execute on function public.master_rate_refusals(text, uuid) from public;
grant execute on function public.master_rate_refusals(text, uuid) to anon, authenticated;

-- « Proposer un autre montant », by the engineer after a refusal: the line
-- is proposed again, the owner notified (master_rate_proposed).
create function public._propose_master_rate_h(p_link_hash text, p_role text, p_cents bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_transmissions%rowtype;
  v_name text;
begin
  v_row := public._open_transmission_of_h(p_link_hash);
  if p_role is null or not (p_role = any (public._master_link_roles(v_row))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_cents is null or p_cents < 0 or p_cents > 100000000 then
    raise exception 'invalid_amount' using errcode = '23514';
  end if;
  select name into v_name from public.network_contacts where id = v_row.contact_id;
  update public.budget_lines
     set status = 'proposed',
         amount_cents = p_cents,
         note = 'Proposé par ' || coalesce(v_name, 'l''ingénieur') || ' par son lien, après refus'
   where project_id = v_row.project_id and master_role = p_role
     and status = 'planned' and refused_at is not null;
  if not found then
    raise exception 'nothing_refused';
  end if;
  update public.master_transmissions
     set proposed_mix_cents = case when p_role = 'mix' then p_cents else proposed_mix_cents end,
         proposed_mastering_cents = case when p_role = 'mastering' then p_cents
                                         else proposed_mastering_cents end
   where id = v_row.id;
  if v_row.created_by is not null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v_row.organization_id, v_row.created_by, null, 'master_rate_proposed',
            v_row.project_id, v_row.id);
  end if;
end;
$$;
revoke execute on function public._propose_master_rate_h(text, text, bigint) from public, anon, authenticated;

create function public.propose_master_rate(p_token text, p_role text, p_cents bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public._propose_master_rate_h(public.link_token_hash(p_token), p_role, p_cents);
end;
$$;
revoke execute on function public.propose_master_rate(text, text, bigint) from public;
grant execute on function public.propose_master_rate(text, text, bigint) to anon, authenticated;

create function public.propose_master_rate(p_contact_token text, p_item_id uuid, p_role text, p_cents bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public._propose_master_rate_h(
    public.contact_item_hash('master', p_contact_token, p_item_id), p_role, p_cents);
end;
$$;
revoke execute on function public.propose_master_rate(text, uuid, text, bigint) from public;
grant execute on function public.propose_master_rate(text, uuid, text, bigint) to anon, authenticated;
