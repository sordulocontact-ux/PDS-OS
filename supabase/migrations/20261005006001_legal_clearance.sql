-- Juridique, branch 05: a generic clearance, driven by states, proofs and
-- dependencies (ticket Juridique 05, docs/ARCHITECTURE.md § 8 sexies).
-- legal_clearances (lot 2) gains its qualification; around it the objects of
-- the ticket: Rightsholder, Communication, NegotiationTerm, the agreement
-- of each right (a contract of the Contracts module: LegalDocument and
-- Evidence come with it) and the history.
--
-- From the ticket:
--   * « Les droits à sécuriser dépendent de l'usage exact et peuvent
--     concerner l'œuvre, le master ou les deux » → rights_scope (work,
--     master, both, or none: nothing to secure, its reason kept);
--   * « Contact trouvé ne signifie pas autorisation » / « Accord de principe
--     ne signifie pas dossier sécurisé » → advance_clearance refuses CLEARED
--     without the proof of each right concerned;
--   * « Les conditions économiques ou juridiques reçues restent proposées
--     jusqu'à validation PDS » → legal_clearance_terms, proposed until the
--     director decides;
--   * « CLEARED exige les preuves configurées pour les droits réellement
--     concernés » → each concerned right has a signed contract with its
--     signed copy and its proof (contract_files 'signed' and 'evidence');
--   * « Un refus bloque la sortie en l'état et permet de proposer retrait,
--     remplacement ou abandon » → REFUSED and ABANDONED need their reason;
--   * no HumanismeWorkflow: everything is generic.
--
-- Read by manage_legal on a visible project (the lot 2 policy); written only
-- through the functions below.

alter table public.legal_clearances
  add column usage text,
  add column rights_scope text,
  add column scope_reason text,
  add column qualified_at timestamptz;
alter table public.legal_clearances
  add constraint legal_clearances_usage_check
    check (usage is null or (btrim(usage) <> '' and char_length(usage) <= 2000)),
  add constraint legal_clearances_scope_check
    check (rights_scope is null or rights_scope in ('work', 'master', 'both', 'none')),
  add constraint legal_clearances_scope_reason_check
    check (scope_reason is null or char_length(scope_reason) <= 2000),
  add constraint legal_clearances_id_org_key unique (id, organization_id);

create table public.legal_clearance_rightsholders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  clearance_id uuid not null,
  "right" text not null,
  name text not null,
  role text not null,
  contact_id uuid,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint legal_clearance_rightsholders_right_check check ("right" in ('work', 'master')),
  constraint legal_clearance_rightsholders_name_check
    check (btrim(name) <> '' and char_length(name) <= 200),
  constraint legal_clearance_rightsholders_role_check
    check (role in ('publisher', 'author', 'composer', 'producer', 'label', 'other')),
  constraint legal_clearance_rightsholders_clearance_same_org
    foreign key (clearance_id, organization_id)
    references public.legal_clearances (id, organization_id) on delete cascade,
  constraint legal_clearance_rightsholders_contact_same_org
    foreign key (contact_id, organization_id) references public.network_contacts (id, organization_id)
);

create table public.legal_clearance_communications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  clearance_id uuid not null,
  kind text not null,
  direction text not null,
  body text not null,
  occurred_at timestamptz not null default now(),
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint legal_clearance_communications_kind_check
    check (kind in ('message', 'email', 'call', 'note')),
  constraint legal_clearance_communications_direction_check
    check (direction in ('in', 'out', 'internal')),
  constraint legal_clearance_communications_body_check
    check (btrim(body) <> '' and char_length(body) <= 8000),
  constraint legal_clearance_communications_key unique (id, organization_id),
  constraint legal_clearance_communications_clearance_same_org
    foreign key (clearance_id, organization_id)
    references public.legal_clearances (id, organization_id) on delete cascade
);

create table public.legal_clearance_terms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  clearance_id uuid not null,
  "right" text,
  amount_cents bigint,
  share text,
  credits text,
  territory text,
  duration text,
  other text,
  status text not null default 'proposed',
  decided_by uuid references public.people (id),
  decided_at timestamptz,
  communication_id uuid,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint legal_clearance_terms_right_check check ("right" is null or "right" in ('work', 'master')),
  constraint legal_clearance_terms_amount_check
    check (amount_cents is null or (amount_cents >= 0 and amount_cents <= 100000000)),
  constraint legal_clearance_terms_text_check check (
    coalesce(char_length(share), 0) <= 200 and coalesce(char_length(credits), 0) <= 500
    and coalesce(char_length(territory), 0) <= 200 and coalesce(char_length(duration), 0) <= 200
    and coalesce(char_length(other), 0) <= 2000),
  constraint legal_clearance_terms_any_check check (
    amount_cents is not null or share is not null or credits is not null
    or territory is not null or duration is not null or other is not null),
  constraint legal_clearance_terms_status_check
    check (status in ('proposed', 'validated', 'rejected')),
  constraint legal_clearance_terms_clearance_same_org
    foreign key (clearance_id, organization_id)
    references public.legal_clearances (id, organization_id) on delete cascade,
  constraint legal_clearance_terms_communication_same_org
    foreign key (communication_id, organization_id)
    references public.legal_clearance_communications (id, organization_id)
);

-- The agreement of each right: a contract of the project.
create table public.legal_clearance_contracts (
  clearance_id uuid not null,
  "right" text not null,
  organization_id uuid not null references public.organizations (id),
  contract_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (clearance_id, "right"),
  constraint legal_clearance_contracts_right_check check ("right" in ('work', 'master')),
  constraint legal_clearance_contracts_clearance_same_org
    foreign key (clearance_id, organization_id)
    references public.legal_clearances (id, organization_id) on delete cascade,
  constraint legal_clearance_contracts_contract_same_org
    foreign key (contract_id, organization_id) references public.contracts (id, organization_id)
);

create table public.legal_clearance_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  clearance_id uuid not null,
  kind text not null,
  from_status text,
  to_status text,
  note text,
  actor_person_id uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint legal_clearance_events_kind_check check (kind in (
    'clearance.updated', 'clearance.qualified', 'clearance.rightsholder_added',
    'clearance.rightsholder_removed', 'clearance.communication', 'clearance.conditions_received',
    'clearance.conditions_validated', 'clearance.conditions_rejected', 'clearance.contract_linked',
    'clearance.refused', 'clearance.signed', 'clearance.cleared')),
  constraint legal_clearance_events_note_check check (note is null or char_length(note) <= 2000),
  constraint legal_clearance_events_clearance_same_org
    foreign key (clearance_id, organization_id)
    references public.legal_clearances (id, organization_id) on delete cascade
);

create index legal_clearance_rightsholders_idx on public.legal_clearance_rightsholders (clearance_id);
create index legal_clearance_communications_idx
  on public.legal_clearance_communications (clearance_id, occurred_at desc);
create index legal_clearance_terms_idx on public.legal_clearance_terms (clearance_id, created_at desc);
create index legal_clearance_contracts_contract_idx on public.legal_clearance_contracts (contract_id);
create index legal_clearance_events_idx on public.legal_clearance_events (clearance_id, created_at);

create or replace function public.can_manage_clearance(p_clearance_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.legal_clearances c
     where c.id = p_clearance_id
       and public.has_permission(c.organization_id, 'manage_legal')
       and public.can_see_project(c.project_id));
$$;

do $$
declare
  t text;
begin
  foreach t in array array['legal_clearance_rightsholders', 'legal_clearance_communications',
                           'legal_clearance_terms', 'legal_clearance_contracts',
                           'legal_clearance_events']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.can_manage_clearance(clearance_id))',
      t || '_select', t);
  end loop;
end;
$$;

create or replace function public.log_clearance_event(
  p_clearance public.legal_clearances,
  p_kind text,
  p_from text default null,
  p_to text default null,
  p_note text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.legal_clearance_events
    (organization_id, clearance_id, kind, from_status, to_status, note, actor_person_id)
  values (p_clearance.organization_id, p_clearance.id, p_kind, p_from, p_to,
          left(nullif(btrim(coalesce(p_note, '')), ''), 2000), public.auth_person_id());
$$;

-- The clearance, locked, once the caller may write it.
create or replace function public.clearance_for_write(p_clearance_id uuid)
returns public.legal_clearances
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_clearances%rowtype;
begin
  select * into v from public.legal_clearances where id = p_clearance_id for update;
  if not found or public.auth_person_id() is null
     or not public.can_manage_clearance(p_clearance_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.status in ('cleared', 'abandoned') then
    raise exception 'clearance_closed' using errcode = 'P0001';
  end if;
  return v;
end;
$$;

-- Rights a clearance really concerns.
create or replace function public.clearance_rights(p_scope text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_scope
    when 'work' then array['work']
    when 'master' then array['master']
    when 'both' then array['work', 'master']
    else array[]::text[] end;
$$;

-- ---------------------------------------------------------------------------
-- Writing a clearance (manage_legal).
-- ---------------------------------------------------------------------------

create or replace function public.qualify_clearance(
  p_clearance_id uuid,
  p_usage text,
  p_scope text,
  p_reason text,
  p_responsible uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_clearances%rowtype := public.clearance_for_write(p_clearance_id);
begin
  if nullif(btrim(coalesce(p_usage, '')), '') is null then
    raise exception 'clearance_usage_required' using errcode = 'P0001';
  end if;
  if p_scope not in ('work', 'master', 'both', 'none') then
    raise exception 'clearance_scope_invalid' using errcode = 'P0001';
  end if;
  -- Nothing to secure is a conclusion, and it says why.
  if p_scope = 'none' and nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'clearance_reason_required' using errcode = 'P0001';
  end if;
  if p_responsible is not null
     and not public.person_has_permission(v.organization_id, p_responsible, 'manage_legal') then
    raise exception 'clearance_responsible_invalid' using errcode = 'P0001';
  end if;
  update public.legal_clearances
     set usage = btrim(p_usage), rights_scope = p_scope,
         scope_reason = nullif(btrim(coalesce(p_reason, '')), ''),
         responsible_person_id = coalesce(p_responsible, responsible_person_id),
         qualified_at = now()
   where id = p_clearance_id;
  perform public.log_clearance_event(v, 'clearance.qualified', null, null,
                                     p_scope || coalesce(' · ' || nullif(btrim(p_reason), ''), ''));
end;
$$;

create or replace function public.add_clearance_rightsholder(
  p_clearance_id uuid,
  p_right text,
  p_name text,
  p_role text,
  p_contact_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_clearances%rowtype := public.clearance_for_write(p_clearance_id);
  v_id uuid;
begin
  if p_contact_id is not null and not exists (
    select 1 from public.network_contacts where id = p_contact_id and organization_id = v.organization_id
  ) then
    raise exception 'clearance_contact_invalid' using errcode = 'P0001';
  end if;
  insert into public.legal_clearance_rightsholders
    (organization_id, clearance_id, "right", name, role, contact_id, created_by)
  values (v.organization_id, p_clearance_id, p_right, btrim(p_name), p_role, p_contact_id,
          public.auth_person_id())
  returning id into v_id;
  perform public.log_clearance_event(v, 'clearance.rightsholder_added', null, null,
                                     btrim(p_name) || ' · ' || p_right);
  return v_id;
end;
$$;

create or replace function public.remove_clearance_rightsholder(p_rightsholder_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.legal_clearance_rightsholders%rowtype;
  v public.legal_clearances%rowtype;
begin
  select * into v_row from public.legal_clearance_rightsholders where id = p_rightsholder_id;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  v := public.clearance_for_write(v_row.clearance_id);
  delete from public.legal_clearance_rightsholders where id = p_rightsholder_id;
  perform public.log_clearance_event(v, 'clearance.rightsholder_removed', null, null, v_row.name);
end;
$$;

create or replace function public.log_clearance_communication(
  p_clearance_id uuid,
  p_kind text,
  p_direction text,
  p_body text,
  p_occurred_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_clearances%rowtype := public.clearance_for_write(p_clearance_id);
  v_id uuid;
begin
  insert into public.legal_clearance_communications
    (organization_id, clearance_id, kind, direction, body, occurred_at, created_by)
  values (v.organization_id, p_clearance_id, p_kind, p_direction, btrim(p_body),
          least(coalesce(p_occurred_at, now()), now()), public.auth_person_id())
  returning id into v_id;
  perform public.log_clearance_event(v, 'clearance.communication', null, null,
                                     p_kind || ' · ' || p_direction);
  return v_id;
end;
$$;

-- « Conditions reçues »: kept as proposed until the director decides.
create or replace function public.propose_clearance_terms(
  p_clearance_id uuid,
  p_terms jsonb,
  p_communication_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_clearances%rowtype := public.clearance_for_write(p_clearance_id);
  v_id uuid;
  txt text;
begin
  if p_communication_id is not null and not exists (
    select 1 from public.legal_clearance_communications
     where id = p_communication_id and clearance_id = p_clearance_id) then
    raise exception 'clearance_communication_invalid' using errcode = 'P0001';
  end if;
  insert into public.legal_clearance_terms
    (organization_id, clearance_id, "right", amount_cents, share, credits, territory, duration,
     other, communication_id, created_by)
  values (v.organization_id, p_clearance_id, nullif(p_terms ->> 'right', ''),
          nullif(p_terms ->> 'amount_cents', '')::bigint,
          nullif(btrim(coalesce(p_terms ->> 'share', '')), ''),
          nullif(btrim(coalesce(p_terms ->> 'credits', '')), ''),
          nullif(btrim(coalesce(p_terms ->> 'territory', '')), ''),
          nullif(btrim(coalesce(p_terms ->> 'duration', '')), ''),
          nullif(btrim(coalesce(p_terms ->> 'other', '')), ''),
          p_communication_id, public.auth_person_id())
  returning id into v_id;
  perform public.log_clearance_event(v, 'clearance.conditions_received');
  return v_id;
end;
$$;

-- « Validation PDS » of the conditions: the director.
create or replace function public.decide_clearance_terms(p_terms_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_terms public.legal_clearance_terms%rowtype;
  v public.legal_clearances%rowtype;
begin
  select * into v_terms from public.legal_clearance_terms where id = p_terms_id for update;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  v := public.clearance_for_write(v_terms.clearance_id);
  if not public.has_permission(v.organization_id, 'validate') then
    raise exception 'clearance_terms_not_allowed' using errcode = '42501';
  end if;
  if v_terms.status <> 'proposed' then
    raise exception 'clearance_terms_decided' using errcode = 'P0001';
  end if;
  update public.legal_clearance_terms
     set status = case when p_accept then 'validated' else 'rejected' end,
         decided_by = public.auth_person_id(), decided_at = now()
   where id = p_terms_id;
  perform public.log_clearance_event(v, case when p_accept then 'clearance.conditions_validated'
                                              else 'clearance.conditions_rejected' end);
end;
$$;

-- The contract that carries a right's agreement (a contract of the project).
create or replace function public.link_clearance_contract(
  p_clearance_id uuid,
  p_right text,
  p_contract_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_clearances%rowtype := public.clearance_for_write(p_clearance_id);
begin
  if not (p_right = any (public.clearance_rights(v.rights_scope))) then
    raise exception 'clearance_right_not_concerned' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.contracts
                  where id = p_contract_id and project_id = v.project_id) then
    raise exception 'clearance_contract_invalid' using errcode = 'P0001';
  end if;
  insert into public.legal_clearance_contracts (clearance_id, "right", organization_id, contract_id)
  values (p_clearance_id, p_right, v.organization_id, p_contract_id)
  on conflict (clearance_id, "right") do update set contract_id = excluded.contract_id;
  perform public.log_clearance_event(v, 'clearance.contract_linked', null, null, p_right);
end;
$$;

-- ---------------------------------------------------------------------------
-- The states, each with what it needs (the ticket's action matrix).
-- ---------------------------------------------------------------------------

create or replace function public.clearance_missing(p_clearance_id uuid, p_status text)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.legal_clearances%rowtype;
  v_rights text[];
  v_right text;
  v_missing text[] := '{}';
  v_contract uuid;
begin
  select * into v from public.legal_clearances where id = p_clearance_id;
  v_rights := public.clearance_rights(v.rights_scope);
  if p_status in ('refused', 'abandoned', 'action_required', 'to_investigate') then
    return v_missing;
  end if;
  if v.rights_scope is null then
    return array['qualification'];
  end if;
  if v.rights_scope = 'none' then
    -- Nothing to secure: it can only be cleared, with its reason.
    return case when p_status = 'cleared' then v_missing else array['scope_none'] end;
  end if;
  foreach v_right in array v_rights loop
    if not exists (select 1 from public.legal_clearance_rightsholders
                    where clearance_id = v.id and "right" = v_right) then
      v_missing := v_missing || ('rightsholder:' || v_right);
    end if;
  end loop;
  if p_status = 'rightsholders_identified' then return v_missing; end if;
  if not exists (select 1 from public.legal_clearance_communications
                  where clearance_id = v.id and direction = 'out') then
    v_missing := v_missing || 'contacted'::text;
  end if;
  if p_status in ('contacted', 'waiting_external', 'negotiating') then return v_missing; end if;
  if not exists (select 1 from public.legal_clearance_terms
                  where clearance_id = v.id and status = 'validated') then
    v_missing := v_missing || 'terms_validated'::text;
  end if;
  if p_status = 'agreement_reached' then return v_missing; end if;
  foreach v_right in array v_rights loop
    select contract_id into v_contract from public.legal_clearance_contracts
     where clearance_id = v.id and "right" = v_right;
    if v_contract is null then
      v_missing := v_missing || ('contract:' || v_right);
    elsif p_status in ('signed', 'cleared') then
      if not exists (select 1 from public.contracts where id = v_contract and status = 'signed') then
        v_missing := v_missing || ('signed:' || v_right);
      end if;
      if p_status = 'cleared' and not (
        exists (select 1 from public.contract_files where contract_id = v_contract and category = 'signed')
        and exists (select 1 from public.contract_files where contract_id = v_contract and category = 'evidence')
      ) then
        v_missing := v_missing || ('evidence:' || v_right);
      end if;
    end if;
  end loop;
  return v_missing;
end;
$$;

create or replace function public.advance_clearance(
  p_clearance_id uuid,
  p_status text,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_clearances%rowtype := public.clearance_for_write(p_clearance_id);
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_missing text[];
begin
  if p_status not in ('to_investigate', 'rightsholders_identified', 'contacted', 'waiting_external',
                      'negotiating', 'agreement_reached', 'document_pending', 'signed', 'cleared',
                      'refused', 'abandoned', 'action_required') then
    raise exception 'clearance_status_invalid' using errcode = 'P0001';
  end if;
  if p_status = v.status then return; end if;
  if p_status in ('refused', 'abandoned', 'action_required') and v_note is null then
    raise exception 'clearance_note_required' using errcode = 'P0001';
  end if;
  v_missing := public.clearance_missing(p_clearance_id, p_status);
  if cardinality(v_missing) > 0 then
    raise exception 'clearance_missing' using errcode = 'P0001',
      detail = array_to_string(v_missing, ',');
  end if;
  update public.legal_clearances set status = p_status where id = p_clearance_id;
  perform public.log_clearance_event(
    v, case p_status when 'refused' then 'clearance.refused'
                     when 'signed' then 'clearance.signed'
                     when 'cleared' then 'clearance.cleared'
                     else 'clearance.updated' end,
    v.status, p_status, v_note);
end;
$$;

-- Grants -----------------------------------------------------------------------

revoke execute on function public.can_manage_clearance(uuid) from public, anon;
revoke execute on function public.log_clearance_event(public.legal_clearances, text, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.clearance_for_write(uuid) from public, anon, authenticated;
revoke execute on function public.clearance_rights(text) from public, anon;
revoke execute on function public.clearance_missing(uuid, text) from public, anon;
revoke execute on function public.qualify_clearance(uuid, text, text, text, uuid) from public, anon;
revoke execute on function public.add_clearance_rightsholder(uuid, text, text, text, uuid)
  from public, anon;
revoke execute on function public.remove_clearance_rightsholder(uuid) from public, anon;
revoke execute on function public.log_clearance_communication(uuid, text, text, text, timestamptz)
  from public, anon;
revoke execute on function public.propose_clearance_terms(uuid, jsonb, uuid) from public, anon;
revoke execute on function public.decide_clearance_terms(uuid, boolean) from public, anon;
revoke execute on function public.link_clearance_contract(uuid, text, uuid) from public, anon;
revoke execute on function public.advance_clearance(uuid, text, text) from public, anon;

grant execute on function public.can_manage_clearance(uuid) to authenticated;
grant execute on function public.clearance_rights(text) to authenticated;
grant execute on function public.clearance_missing(uuid, text) to authenticated;
grant execute on function public.qualify_clearance(uuid, text, text, text, uuid) to authenticated;
grant execute on function public.add_clearance_rightsholder(uuid, text, text, text, uuid)
  to authenticated;
grant execute on function public.remove_clearance_rightsholder(uuid) to authenticated;
grant execute on function public.log_clearance_communication(uuid, text, text, text, timestamptz)
  to authenticated;
grant execute on function public.propose_clearance_terms(uuid, jsonb, uuid) to authenticated;
grant execute on function public.decide_clearance_terms(uuid, boolean) to authenticated;
grant execute on function public.link_clearance_contract(uuid, text, uuid) to authenticated;
grant execute on function public.advance_clearance(uuid, text, text) to authenticated;
