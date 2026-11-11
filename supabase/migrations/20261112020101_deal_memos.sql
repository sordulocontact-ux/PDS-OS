-- Business module, lot BIZ 7: the deal memo, versioned, and the step to the
-- contract.
--
--   1. deal_memos: a numbered photo of a deal's terms (value and state of
--      each), with its author, date and status (draft / validated). Made at
--      the accord de principe (proposed: a draft; validated by the direction:
--      the draft becomes validated, or one is made validated) and by hand
--      (« Nouveau deal memo »). A memo never changes; the direction validates
--      a draft (validate_deal_memo).
--   2. The contract. A participation's deal reads its contract on
--      title_participations.contract_id (never copied, docs/pds-mic-plan.md
--      § 0 ter); any other deal gets ONE main contract, deals.contract_id,
--      chosen among the contracts of its project or its artist (the other
--      contracts of an operation stay in Contrats, on its project or artist).
--      read_deal_contract gives its name, status, signature date and the
--      amount entered on it (financial_needs), for whoever reads the deal.
--   3. Comparison of the validated memo with the contract. PDS OS cannot read
--      a contract's PDF reliably: it compares what is ENTERED on the contract
--      (its amount, against the advance or fee) and asks a person, term by
--      term, « conforme » or « différent » (deal_memo_checks, per contract).
--      Nothing is ever corrected by itself.

-- 1. The journal's new kinds ------------------------------------------------------------

alter table public.deal_events drop constraint deal_events_kind_check;
alter table public.deal_events
  add constraint deal_events_kind_check
    check (kind in ('created', 'assigned', 'stage', 'agreement_validated',
                    'agreement_refused', 'abandoned', 'next_action', 'term',
                    'memo', 'memo_validated', 'contract_linked', 'contract_check'));

-- 2. The memos -----------------------------------------------------------------------------

create table public.deal_memos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  deal_id uuid not null,
  number integer not null,
  status text not null default 'draft',
  -- [{ key, value, state }] of every term written then (« À définir » left
  -- out), the shape of lib/deals/terms.ts.
  terms jsonb not null default '[]'::jsonb,
  -- Where the deal stood when it was made.
  stage text not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  validated_by uuid references public.people (id),
  validated_at timestamptz,
  constraint deal_memos_number_key unique (deal_id, number),
  constraint deal_memos_id_org_key unique (id, organization_id),
  constraint deal_memos_number_check check (number > 0),
  constraint deal_memos_status_check check (status in ('draft', 'validated')),
  constraint deal_memos_validated_check
    check ((status = 'validated') = (validated_at is not null)),
  constraint deal_memos_terms_check
    check (jsonb_typeof(terms) = 'array' and octet_length(terms::text) <= 64000),
  constraint deal_memos_deal_same_org
    foreign key (deal_id, organization_id) references public.deals (id, organization_id)
    on delete cascade
);
create index deal_memos_deal_idx on public.deal_memos (deal_id, number desc);

comment on table public.deal_memos is
  'Business module (BIZ 7): numbered photos of a deal''s terms, draft or validated by the direction; written by functions only, never changed.';

alter table public.deal_memos enable row level security;
alter table public.deal_memos force row level security;
revoke all on table public.deal_memos from anon, authenticated;
grant select on table public.deal_memos to authenticated;
create policy deal_memos_select on public.deal_memos
  for select to authenticated
  using (exists (select 1 from public.deals d where d.id = deal_id));

-- The photo of a deal's terms now, numbered after the last one.
create or replace function public.snapshot_deal_memo(p_deal public.deals, p_status text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.deal_memos
    (organization_id, deal_id, number, status, terms, stage, created_by,
     validated_by, validated_at)
  select p_deal.organization_id, p_deal.id,
         coalesce((select max(m.number) from public.deal_memos m where m.deal_id = p_deal.id), 0) + 1,
         p_status,
         coalesce((select jsonb_agg(jsonb_build_object('key', t.term_key, 'value', t.value,
                                                       'state', t.state) order by t.term_key)
                     from public.deal_terms t
                    where t.deal_id = p_deal.id and t.state <> 'to_define'), '[]'::jsonb),
         p_deal.stage, public.auth_person_id(),
         case when p_status = 'validated' then public.auth_person_id() end,
         case when p_status = 'validated' then now() end
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.snapshot_deal_memo(public.deals, text) from public, anon, authenticated;

-- « Nouveau deal memo »: whoever writes the deal, an open deal; a draft.
create or replace function public.create_deal_memo(p_deal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_id uuid;
begin
  v := public.lock_deal_for_write(p_deal_id);
  v_id := public.snapshot_deal_memo(v, 'draft');
  perform public.log_deal_event(v, 'memo', null, null, null,
    jsonb_build_object('memo', v_id, 'status', 'draft'));
  return v_id;
end;
$$;
revoke execute on function public.create_deal_memo(uuid) from public, anon;
grant execute on function public.create_deal_memo(uuid) to authenticated;

-- The direction validates a draft memo (the latest one).
create or replace function public.validate_deal_memo(p_memo_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_memo public.deal_memos%rowtype;
  v public.deals%rowtype;
begin
  select * into v_memo from public.deal_memos where id = p_memo_id for update;
  if not found then
    raise exception 'memo_not_found' using errcode = 'P0002';
  end if;
  v := public.lock_deal_for_write(v_memo.deal_id);
  if not public.has_permission(v.organization_id, 'validate') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_memo.status <> 'draft' then
    raise exception 'memo_validated' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.deal_memos m
              where m.deal_id = v_memo.deal_id and m.number > v_memo.number) then
    raise exception 'memo_not_latest' using errcode = 'P0001';
  end if;
  update public.deal_memos
     set status = 'validated', validated_by = public.auth_person_id(), validated_at = now()
   where id = p_memo_id;
  perform public.log_deal_event(v, 'memo_validated', null, null, null,
    jsonb_build_object('memo', p_memo_id, 'number', v_memo.number));
end;
$$;
revoke execute on function public.validate_deal_memo(uuid) from public, anon;
grant execute on function public.validate_deal_memo(uuid) to authenticated;

-- At the accord de principe: proposed, a draft memo; validated by the
-- direction, the latest draft is validated (or one is made validated).
create or replace function public.deal_events_memo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_memo uuid;
begin
  select * into v from public.deals where id = new.deal_id;
  if not found then
    return null;
  end if;
  if new.kind = 'stage' and new.to_stage = 'agreement' then
    v_memo := public.snapshot_deal_memo(v,
      case when new.detail ->> 'agreement' = 'validated' then 'validated' else 'draft' end);
    perform public.log_deal_event(v, 'memo', null, null, null,
      jsonb_build_object('memo', v_memo, 'agreement', true));
  elsif new.kind = 'agreement_validated' then
    update public.deal_memos m
       set status = 'validated', validated_by = public.auth_person_id(), validated_at = now()
     where m.id = (select x.id from public.deal_memos x
                    where x.deal_id = v.id order by x.number desc limit 1)
       and m.status = 'draft'
    returning m.id into v_memo;
    if v_memo is null then
      v_memo := public.snapshot_deal_memo(v, 'validated');
    end if;
    perform public.log_deal_event(v, 'memo_validated', null, null, null,
      jsonb_build_object('memo', v_memo, 'agreement', true));
  end if;
  return null;
end;
$$;
revoke execute on function public.deal_events_memo() from public, anon, authenticated;
create trigger y_memo after insert on public.deal_events
  for each row execute function public.deal_events_memo();

-- 3. The contract -----------------------------------------------------------------------------

alter table public.deals add column contract_id uuid;
alter table public.deals
  add constraint deals_contract_same_org
    foreign key (contract_id, organization_id) references public.contracts (id, organization_id);
-- A participation's contract is the participation's, never copied here.
alter table public.deals
  add constraint deals_contract_participation_check
    check (participation_id is null or contract_id is null);

-- The contract of a deal: its participation's, else its own.
create or replace function public.deal_contract_id(p_deal public.deals)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case when p_deal.participation_id is not null
              then (select tp.contract_id from public.title_participations tp
                     where tp.id = p_deal.participation_id)
              else p_deal.contract_id end;
$$;
revoke execute on function public.deal_contract_id(public.deals) from public, anon, authenticated;

-- What whoever reads the deal knows of its contract: name, type, status,
-- signature date, the amount entered on it, and whether he may open it in
-- Contrats (the contracts' own rule).
create or replace function public.read_deal_contract(p_deal_id uuid)
returns table (
  contract_id uuid,
  source text,
  title text,
  type text,
  status text,
  signed_on date,
  amount_cents bigint,
  visible boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id,
         case when d.participation_id is not null then 'participation' else 'deal' end,
         c.title, c.type, c.status, c.signed_on, fn.amount_cents,
         public.is_active_member(c.organization_id)
           and (c.owner_person_id = public.auth_person_id()
                or public.has_permission(c.organization_id, 'view_all_projects')
                or (c.project_id is not null and public.is_project_owner(c.project_id)))
    from public.deals d
    join public.contracts c on c.id = public.deal_contract_id(d)
    left join public.financial_needs fn on fn.contract_id = c.id
   where d.id = p_deal_id
     and public.can_read_deal(d.organization_id, d.assignee_person_id, d.project_id);
$$;
revoke execute on function public.read_deal_contract(uuid) from public, anon;
grant execute on function public.read_deal_contract(uuid) to authenticated;

-- The contracts a deal (not a participation's) may name: those of its
-- project or of its artist, for whoever writes the deal.
create or replace function public.list_deal_contract_options(p_deal_id uuid)
returns table (contract_id uuid, title text, type text, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.title, c.type, c.status
    from public.deals d
    join public.contracts c
      on c.organization_id = d.organization_id
     and ((d.project_id is not null and c.project_id = d.project_id)
          or (d.artist_id is not null and c.artist_id = d.artist_id))
   where d.id = p_deal_id
     and d.participation_id is null
     and public.can_write_deal(d.organization_id, d.assignee_person_id)
   order by c.created_at desc;
$$;
revoke execute on function public.list_deal_contract_options(uuid) from public, anon;
grant execute on function public.list_deal_contract_options(uuid) to authenticated;

-- « Lier le contrat »: whoever writes an open deal; null unlinks.
create or replace function public.link_deal_contract(p_deal_id uuid, p_contract_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
begin
  v := public.lock_deal_for_write(p_deal_id);
  if v.participation_id is not null then
    raise exception 'participation_contract' using errcode = 'P0001';
  end if;
  if p_contract_id is not null and not exists (
    select 1 from public.contracts c
     where c.id = p_contract_id and c.organization_id = v.organization_id
       and ((v.project_id is not null and c.project_id = v.project_id)
            or (v.artist_id is not null and c.artist_id = v.artist_id))) then
    raise exception 'contract_not_linkable' using errcode = '22023';
  end if;
  if v.contract_id is not distinct from p_contract_id then
    raise exception 'contract_unchanged' using errcode = 'P0001';
  end if;
  update public.deals set contract_id = p_contract_id where id = p_deal_id returning * into v;
  perform public.log_deal_event(v, 'contract_linked', null, null, null,
    jsonb_build_object('contract', p_contract_id));
end;
$$;
revoke execute on function public.link_deal_contract(uuid, uuid) from public, anon;
grant execute on function public.link_deal_contract(uuid, uuid) to authenticated;

-- 4. The memo against the contract ----------------------------------------------------------

create table public.deal_memo_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  memo_id uuid not null,
  contract_id uuid not null,
  term_key text not null,
  verdict text not null,
  note text,
  checked_by uuid references public.people (id),
  checked_at timestamptz not null default now(),
  constraint deal_memo_checks_key unique (memo_id, contract_id, term_key),
  constraint deal_memo_checks_verdict_check check (verdict in ('conform', 'different')),
  constraint deal_memo_checks_note_check
    check (note is null or (btrim(note) <> '' and char_length(note) <= 1000)),
  constraint deal_memo_checks_memo_same_org
    foreign key (memo_id, organization_id) references public.deal_memos (id, organization_id)
    on delete cascade,
  constraint deal_memo_checks_contract_same_org
    foreign key (contract_id, organization_id) references public.contracts (id, organization_id)
    on delete cascade
);

comment on table public.deal_memo_checks is
  'Business module (BIZ 7): a person''s verdict, term by term, on whether the contract says what the validated deal memo says; never a correction.';

alter table public.deal_memo_checks enable row level security;
alter table public.deal_memo_checks force row level security;
revoke all on table public.deal_memo_checks from anon, authenticated;
grant select on table public.deal_memo_checks to authenticated;
create policy deal_memo_checks_select on public.deal_memo_checks
  for select to authenticated
  using (exists (select 1 from public.deal_memos m where m.id = memo_id));

-- « Conforme » / « Différent » for a term of a validated memo against the
-- deal's contract now: whoever writes the deal, while contracting or once
-- signed too; the same verdict twice is
-- refused, a new one replaces the old (the journal keeps both).
create or replace function public.set_deal_memo_check(
  p_memo_id uuid,
  p_term_key text,
  p_verdict text,
  p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_memo public.deal_memos%rowtype;
  v public.deals%rowtype;
  v_contract uuid;
  v_note text := public.clean_deal_text(p_note, 1000);
begin
  select * into v_memo from public.deal_memos where id = p_memo_id;
  if not found then
    raise exception 'memo_not_found' using errcode = 'P0002';
  end if;
  -- Checked while contracting and after the signature; never on an
  -- abandoned deal.
  select * into v from public.deals where id = v_memo.deal_id for update;
  if not found or not public.can_read_deal(v.organization_id, v.assignee_person_id, v.project_id) then
    raise exception 'deal_not_found' using errcode = 'P0002';
  end if;
  if not public.can_write_deal(v.organization_id, v.assignee_person_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.stage = 'abandoned' then
    raise exception 'deal_closed' using errcode = 'P0001';
  end if;
  if v_memo.status <> 'validated' then
    raise exception 'memo_not_validated' using errcode = 'P0001';
  end if;
  if p_verdict is null or p_verdict not in ('conform', 'different') then
    raise exception 'invalid_verdict' using errcode = '22023';
  end if;
  if p_term_key is null or not exists (
    select 1 from jsonb_array_elements(v_memo.terms) e where e ->> 'key' = p_term_key) then
    raise exception 'invalid_term' using errcode = '22023';
  end if;
  v_contract := public.deal_contract_id(v);
  if v_contract is null then
    raise exception 'no_contract' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.deal_memo_checks c
              where c.memo_id = p_memo_id and c.contract_id = v_contract
                and c.term_key = p_term_key and c.verdict = p_verdict
                and c.note is not distinct from v_note) then
    raise exception 'check_unchanged' using errcode = 'P0001';
  end if;
  insert into public.deal_memo_checks
    (organization_id, memo_id, contract_id, term_key, verdict, note, checked_by, checked_at)
  values (v.organization_id, p_memo_id, v_contract, p_term_key, p_verdict, v_note,
          public.auth_person_id(), now())
  on conflict (memo_id, contract_id, term_key) do update
    set verdict = excluded.verdict, note = excluded.note,
        checked_by = excluded.checked_by, checked_at = excluded.checked_at;
  perform public.log_deal_event(v, 'contract_check', null, null, v_note,
    jsonb_build_object('memo', p_memo_id, 'number', v_memo.number, 'key', p_term_key,
                       'verdict', p_verdict, 'contract', v_contract));
end;
$$;
revoke execute on function public.set_deal_memo_check(uuid, text, text, text) from public, anon;
grant execute on function public.set_deal_memo_check(uuid, text, text, text) to authenticated;
