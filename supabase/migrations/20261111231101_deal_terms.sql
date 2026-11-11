-- Business module, lot BIZ 3: the terms negotiated in a music deal (splits
-- auteur-compositeur, master, royalties, advance or fee, credits,
-- territories, duration, exclusivity, promo…).
--
-- One row per term of a deal: its value, its state (proposed by PDS /
-- counter-proposal / confirmed / to define), who changed it last and when.
-- Every change goes to the deal's journal (deal_events, kind « term », the
-- value and state before and after): the history.
--
-- The list of the terms and the shape of their values are kept in ONE place,
-- the code's configuration (lib/deals/terms.ts), to follow Ibé's Excel
-- without a migration: the database checks the key's form, the state and the
-- size of the value, never the list. The splits use the Juridique's words
-- (legal_split_entries.role, a share in ten-thousandths of a percent):
-- written in the value, never a second split model.

create table public.deal_terms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  deal_id uuid not null,
  term_key text not null,
  value jsonb,
  state text not null default 'to_define',
  changed_by uuid references public.people (id),
  changed_at timestamptz not null default now(),
  constraint deal_terms_key unique (deal_id, term_key),
  constraint deal_terms_key_check check (term_key ~ '^[a-z][a-z0-9_]{0,39}$'),
  constraint deal_terms_state_check
    check (state in ('pds_proposal', 'counter_proposal', 'confirmed', 'to_define')),
  -- A value, unless the term is still to define.
  constraint deal_terms_value_check
    check ((value is not null and value <> 'null'::jsonb) or state = 'to_define'),
  constraint deal_terms_value_size_check
    check (value is null or octet_length(value::text) <= 4000),
  constraint deal_terms_deal_same_org
    foreign key (deal_id, organization_id) references public.deals (id, organization_id)
    on delete cascade
);

comment on table public.deal_terms is
  'Business module (BIZ 3): the terms negotiated in a deal, written by set_deal_term only; the list and the values'' shape live in lib/deals/terms.ts.';

alter table public.deal_terms enable row level security;
alter table public.deal_terms force row level security;
revoke all on table public.deal_terms from anon, authenticated;
grant select on table public.deal_terms to authenticated;
-- Whoever reads the deal reads its terms (the deals policy applies).
create policy deal_terms_select on public.deal_terms
  for select to authenticated
  using (exists (select 1 from public.deals d where d.id = deal_id));

-- « Modifier un terme »: the direction or the assignee, an open deal. A
-- value is required unless the term is to define (then it is dropped). The
-- same value and state twice is refused. The journal keeps before and after.
create or replace function public.set_deal_term(
  p_deal_id uuid,
  p_term_key text,
  p_value jsonb,
  p_state text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_old public.deal_terms%rowtype;
  v_value jsonb := case when p_value = 'null'::jsonb then null else p_value end;
begin
  v := public.lock_deal_for_write(p_deal_id);
  if p_term_key is null or p_term_key !~ '^[a-z][a-z0-9_]{0,39}$' then
    raise exception 'invalid_term' using errcode = '22023';
  end if;
  if p_state is null
     or p_state not in ('pds_proposal', 'counter_proposal', 'confirmed', 'to_define') then
    raise exception 'invalid_state' using errcode = '22023';
  end if;
  if p_state = 'to_define' then
    v_value := null;
  elsif v_value is null then
    raise exception 'term_value_required' using errcode = '22023';
  end if;
  if v_value is not null and octet_length(v_value::text) > 4000 then
    raise exception 'text_too_long' using errcode = '22023';
  end if;

  select * into v_old from public.deal_terms
   where deal_id = p_deal_id and term_key = p_term_key for update;
  if found and v_old.value is not distinct from v_value and v_old.state = p_state then
    raise exception 'term_unchanged' using errcode = 'P0001';
  end if;
  if not found and p_state = 'to_define' then
    raise exception 'term_unchanged' using errcode = 'P0001';
  end if;

  insert into public.deal_terms
    (organization_id, deal_id, term_key, value, state, changed_by, changed_at)
  values (v.organization_id, p_deal_id, p_term_key, v_value, p_state,
          public.auth_person_id(), now())
  on conflict (deal_id, term_key) do update
    set value = excluded.value,
        state = excluded.state,
        changed_by = excluded.changed_by,
        changed_at = excluded.changed_at;

  perform public.log_deal_event(v, 'term', null, null, null,
    jsonb_build_object('key', p_term_key, 'value', v_value, 'state', p_state,
                       'from_value', v_old.value, 'from_state', v_old.state));
end;
$$;
revoke execute on function public.set_deal_term(uuid, text, jsonb, text) from public, anon;
grant execute on function public.set_deal_term(uuid, text, jsonb, text) to authenticated;
