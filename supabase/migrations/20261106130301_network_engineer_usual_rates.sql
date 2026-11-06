-- Réseau: an engineer's usual rates, reused by the Master's Brief (ticket
-- « Workflow Master » § 4: « réutiliser les tarifs […] du Réseau » ; proto
-- master-v2: « Réseau · tarif habituel de Karim », and on the engineer's
-- link « Tarif estimé par PDS d'après vos tarifs habituels »).
--
-- The usual rate is what PDS last engaged with this engineer for that role:
-- learnt by the database when a rate is accepted (budget line « Engagé »),
-- never typed nor guessed. It lives in its own table, not on the contact:
-- every member reads the Réseau, only those who see a project's budget read
-- rates (the project managers and the direction).

create table public.network_engineer_rates (
  contact_id uuid primary key references public.network_contacts (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  mix_rate_cents integer check (mix_rate_cents is null or mix_rate_cents > 0),
  mix_project_id uuid references public.projects (id) on delete set null,
  mix_at timestamptz,
  mastering_rate_cents integer check (mastering_rate_cents is null or mastering_rate_cents > 0),
  mastering_project_id uuid references public.projects (id) on delete set null,
  mastering_at timestamptz
);

alter table public.network_engineer_rates enable row level security;
alter table public.network_engineer_rates force row level security;
revoke all on table public.network_engineer_rates from anon, authenticated;
grant select on public.network_engineer_rates to authenticated;
create policy network_engineer_rates_select on public.network_engineer_rates
  for select to authenticated
  using (public.has_permission(organization_id, 'view_all_projects')
         or public.has_permission(organization_id, 'pilot_projects'));

-- What a budget line of the Master says of its engineer's rate, once engaged.
create or replace function public._learn_engineer_rate(p_line public.budget_lines)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_contact uuid;
begin
  if p_line.master_role not in ('mix', 'mastering') or p_line.project_id is null
     or p_line.amount_cents is null or p_line.amount_cents <= 0 then
    return;
  end if;
  select case when p_line.master_role = 'mix' or b.mastering_same_engineer
              then b.mix_contact_id else b.mastering_contact_id end
    into v_contact
    from public.master_briefs b where b.project_id = p_line.project_id;
  if v_contact is null then
    -- An in-house engineer: no rate.
    return;
  end if;
  insert into public.network_engineer_rates (contact_id, organization_id)
  values (v_contact, p_line.organization_id)
  on conflict (contact_id) do nothing;
  if p_line.master_role = 'mix' then
    update public.network_engineer_rates
       set mix_rate_cents = p_line.amount_cents, mix_project_id = p_line.project_id, mix_at = now()
     where contact_id = v_contact;
  else
    update public.network_engineer_rates
       set mastering_rate_cents = p_line.amount_cents,
           mastering_project_id = p_line.project_id, mastering_at = now()
     where contact_id = v_contact;
  end if;
end;
$$;
revoke execute on function public._learn_engineer_rate(public.budget_lines) from public, anon, authenticated;

create or replace function public._learn_engineer_rate_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._learn_engineer_rate(new);
  return null;
end;
$$;
revoke execute on function public._learn_engineer_rate_trigger() from public, anon, authenticated;

-- « Accepter le tarif » (proposed → committed); a line created engaged too.
create trigger z_learn_engineer_rate
  after insert or update of status on public.budget_lines
  for each row
  when (new.master_role is not null and new.status = 'committed')
  execute function public._learn_engineer_rate_trigger();

-- What was already engaged, oldest first so the latest one stays.
do $$
declare
  r public.budget_lines;
begin
  for r in select * from public.budget_lines
            where master_role in ('mix', 'mastering')
              and status in ('committed', 'invoiced', 'paid')
            order by updated_at
  loop
    perform public._learn_engineer_rate(r);
  end loop;
end;
$$;
