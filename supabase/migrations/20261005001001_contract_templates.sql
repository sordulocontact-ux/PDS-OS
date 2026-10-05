-- Juridique, branch 03: agreements generated from validated templates
-- (ticket Juridique 03, docs/ARCHITECTURE.md § 8 sexies). Extends the
-- Contracts module (20260929000201) rather than duplicating it.
--
-- From the ticket:
--   * « Le template original ne change jamais » → contract_templates rows are
--     never updated except their status; a correction is a new version of
--     the same series;
--   * « Chaque copie conserve le template source, sa version et la liste des
--     champs injectés » → contract_documents (template_id, template_version,
--     fields with their source);
--   * « Toute modification de clause est explicite, versionnée, auditée et
--     potentiellement soumise à une nouvelle validation » →
--     revise_contract_document: a new document version with its reason, an
--     approved contract goes back to draft;
--   * « Justine valide la cartographie rôle → template » →
--     legal_agreement_needs, written at once by approve_contract_mapping;
--   * « L'envoi et la signature ne sont jamais considérés comme réalisés sans
--     preuve » → for a generated contract, advance_contract asks how it was
--     sent, and refuses the signature without the signed copy and its proof
--     (contract_files categories 'signed' and 'evidence');
--   * « Un contrat signé avec rémunération crée un FinancialNeed en
--     WAITING_FOR_INVOICE, jamais TO_PAY » → financial_needs, one per
--     contract, written by a trigger on the signature;
--   * events contract_mapping.approved, contract.generated, contract.approved,
--     signature.requested, contract.signed, financial_need.created →
--     contract_events, written by the functions only.
--
-- Rendering is done here (placeholders {{field.id}} replaced by the values
-- the code read from their sources): the template text never goes through
-- the browser. No clause, no template is written by PO.

-- ---------------------------------------------------------------------------
-- 0. Proof of a signature, a new category of a contract's files.
-- ---------------------------------------------------------------------------

alter table public.contract_files drop constraint contract_files_category_check;
alter table public.contract_files add constraint contract_files_category_check
  check (category in ('draft', 'signed', 'evidence', 'annex', 'other'));

-- ---------------------------------------------------------------------------
-- 1. Templates, versioned by series.
-- ---------------------------------------------------------------------------

create table public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  series_id uuid not null,
  version integer not null,
  name text not null,
  type text not null,
  -- Roles of the fiche (lib/legal/forms/definition.ts) the template is for.
  roles text[] not null,
  usage text,
  body text not null,
  -- Placeholders found in the body, extracted here.
  fields text[] not null default '{}',
  status text not null default 'draft',
  validated_by uuid references public.people (id),
  validated_at timestamptz,
  retired_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint contract_templates_name_check
    check (btrim(name) <> '' and char_length(name) <= 200),
  constraint contract_templates_type_check check (type in (
    'artist', 'license', 'distribution', 'publishing', 'coproduction', 'image_rights',
    'service', 'partnership', 'other')),
  constraint contract_templates_roles_check
    check (cardinality(roles) between 1 and 11
           and roles <@ array['author', 'composer', 'arranger', 'performer', 'musician',
                              'backing_vocalist', 'producer', 'label', 'provider',
                              'publisher', 'other']::text[]),
  constraint contract_templates_usage_check
    check (usage is null or (btrim(usage) <> '' and char_length(usage) <= 500)),
  constraint contract_templates_body_check
    check (btrim(body) <> '' and char_length(body) <= 200000),
  constraint contract_templates_status_check
    check (status in ('draft', 'validated', 'retired')),
  constraint contract_templates_validated_check
    check (status <> 'validated' or validated_at is not null),
  constraint contract_templates_version_check check (version >= 1),
  constraint contract_templates_series_version_key unique (series_id, version),
  constraint contract_templates_id_org_key unique (id, organization_id)
);

create index contract_templates_org_idx
  on public.contract_templates (organization_id, series_id, version desc);

create trigger a_set_created_by before insert on public.contract_templates
  for each row execute function public.set_created_by();

alter table public.contract_templates enable row level security;
alter table public.contract_templates force row level security;
revoke all on public.contract_templates from anon, authenticated;

create policy contract_templates_select_legal on public.contract_templates
  for select to authenticated
  using (public.has_permission(organization_id, 'manage_legal')
         or public.has_permission(organization_id, 'manage_contracts'));

grant select on public.contract_templates to authenticated;

create or replace function public.contract_placeholders(p_body text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_agg(distinct m[1] order by m[1]), '{}')
  from regexp_matches(p_body, '\{\{\s*([a-z0-9_.]+)\s*\}\}', 'g') as m;
$$;

-- A new template, or a new version of one (p_series_id): nothing is ever
-- edited in place.
create or replace function public.create_contract_template(
  p_organization_id uuid,
  p_series_id uuid,
  p_name text,
  p_type text,
  p_roles text[],
  p_usage text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_series uuid := coalesce(p_series_id, gen_random_uuid());
  v_version integer := 1;
  v_id uuid;
begin
  if public.auth_person_id() is null
     or not public.has_permission(p_organization_id, 'manage_legal') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_series_id is not null then
    perform 1 from public.contract_templates
     where series_id = p_series_id and organization_id = p_organization_id
     for update;
    if not found then raise exception 'template_not_found'; end if;
    select max(version) + 1 into v_version
      from public.contract_templates where series_id = p_series_id;
  end if;
  insert into public.contract_templates
    (organization_id, series_id, version, name, type, roles, usage, body, fields)
  values (p_organization_id, v_series, v_version, btrim(p_name), p_type,
          (select array_agg(distinct r) from unnest(p_roles) r),
          nullif(btrim(coalesce(p_usage, '')), ''), p_body,
          public.contract_placeholders(p_body))
  returning id into v_id;
  return v_id;
end;
$$;

-- The director validates a draft (the previous validated version of the
-- series retires); manage_legal retires one.
create or replace function public.set_contract_template_status(
  p_template_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template public.contract_templates%rowtype;
begin
  select * into v_template from public.contract_templates
   where id = p_template_id for update;
  if not found or not public.has_permission(v_template.organization_id, 'manage_legal')
  then
    raise exception 'template_not_found';
  end if;
  if p_status = 'validated' then
    if not public.has_permission(v_template.organization_id, 'validate') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    if v_template.status <> 'draft' then raise exception 'template_wrong_status'; end if;
    update public.contract_templates
       set status = 'retired', retired_at = now()
     where series_id = v_template.series_id and status = 'validated';
    update public.contract_templates
       set status = 'validated', validated_by = public.auth_person_id(),
           validated_at = now()
     where id = p_template_id;
  elsif p_status = 'retired' then
    if v_template.status = 'retired' then raise exception 'template_wrong_status'; end if;
    update public.contract_templates
       set status = 'retired', retired_at = now()
     where id = p_template_id;
  else
    raise exception 'template_wrong_status';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Events (audit), written by the functions below only.
-- ---------------------------------------------------------------------------

create table public.contract_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  contract_id uuid,
  project_id uuid,
  kind text not null,
  actor_person_id uuid references public.people (id),
  note text,
  created_at timestamptz not null default now(),
  constraint contract_events_kind_check check (kind in (
    'contract_mapping.approved', 'contract.generated', 'contract.revised',
    'contract.submitted', 'contract.approved', 'contract.changes_requested',
    'signature.requested', 'contract.signed', 'contract.terminated',
    'financial_need.created')),
  constraint contract_events_target_check
    check (contract_id is not null or project_id is not null),
  constraint contract_events_note_check check (note is null or char_length(note) <= 2000),
  constraint contract_events_contract_same_org
    foreign key (contract_id, organization_id)
    references public.contracts (id, organization_id) on delete cascade,
  constraint contract_events_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
);

create index contract_events_contract_idx
  on public.contract_events (contract_id, created_at desc) where contract_id is not null;
create index contract_events_project_idx
  on public.contract_events (project_id, created_at desc) where project_id is not null;

alter table public.contract_events enable row level security;
alter table public.contract_events force row level security;
revoke all on public.contract_events from anon, authenticated;

create policy contract_events_select_visible on public.contract_events
  for select to authenticated
  using ((contract_id is not null and public.can_see_contract(contract_id))
         or (contract_id is null
             and public.has_permission(organization_id, 'manage_legal')
             and public.can_see_project(project_id)));

grant select on public.contract_events to authenticated;

create or replace function public.log_contract_event(
  p_organization_id uuid,
  p_contract_id uuid,
  p_project_id uuid,
  p_kind text,
  p_note text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.contract_events
    (organization_id, contract_id, project_id, kind, actor_person_id, note)
  values (p_organization_id, p_contract_id, p_project_id, p_kind,
          public.auth_person_id(), nullif(btrim(coalesce(p_note, '')), ''));
$$;

revoke execute on function public.log_contract_event(uuid, uuid, uuid, text, text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. The mapping: person → need → proposed template → document.
-- ---------------------------------------------------------------------------

create table public.legal_agreement_needs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  project_id uuid not null,
  contact_id uuid not null,
  -- What the credits and the fiche say this person does (fiche roles).
  roles text[] not null default '{}',
  contract_type text not null,
  template_id uuid,
  -- The agreed fee, in cents (euros), when there is one.
  fee_cents bigint,
  contract_id uuid,
  approved_by uuid references public.people (id),
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint legal_agreement_needs_type_check check (contract_type in (
    'artist', 'license', 'distribution', 'publishing', 'coproduction', 'image_rights',
    'service', 'partnership', 'other')),
  constraint legal_agreement_needs_fee_check
    check (fee_cents is null or (fee_cents > 0 and fee_cents <= 100000000)),
  constraint legal_agreement_needs_contact_key unique (project_id, contact_id),
  constraint legal_agreement_needs_contract_key unique (contract_id),
  constraint legal_agreement_needs_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id),
  constraint legal_agreement_needs_contact_same_org
    foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id),
  constraint legal_agreement_needs_template_same_org
    foreign key (template_id, organization_id)
    references public.contract_templates (id, organization_id),
  constraint legal_agreement_needs_contract_same_org
    foreign key (contract_id, organization_id) references public.contracts (id, organization_id)
);

create index legal_agreement_needs_project_idx on public.legal_agreement_needs (project_id);

alter table public.legal_agreement_needs enable row level security;
alter table public.legal_agreement_needs force row level security;
revoke all on public.legal_agreement_needs from anon, authenticated;

create policy legal_agreement_needs_select_legal on public.legal_agreement_needs
  for select to authenticated
  using (public.has_permission(organization_id, 'manage_legal')
         and public.can_see_project(project_id));

grant select on public.legal_agreement_needs to authenticated;

-- The whole mapping at once: one item per person, {contact_id, roles,
-- needed, template_id, contract_type, fee_cents}. A need already turned
-- into a contract is kept as it is (its document says what was agreed).
create or replace function public.approve_contract_mapping(
  p_project_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_me uuid := public.auth_person_id();
  v_item jsonb;
  v_contact uuid;
  v_roles text[];
  v_template public.contract_templates%rowtype;
  v_type text;
  v_fee bigint;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or v_me is null
     or not public.has_permission(v_org, 'manage_legal')
     or not public.can_see_project(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 200 then
    raise exception 'mapping_invalid';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_contact := (v_item ->> 'contact_id')::uuid;
    if not exists (select 1 from public.network_contacts
                    where id = v_contact and organization_id = v_org) then
      raise exception 'mapping_contact_invalid';
    end if;
    -- Generated already: left untouched.
    continue when exists (select 1 from public.legal_agreement_needs
                           where project_id = p_project_id and contact_id = v_contact
                             and contract_id is not null);

    if coalesce((v_item ->> 'needed')::boolean, false) is false then
      delete from public.legal_agreement_needs
       where project_id = p_project_id and contact_id = v_contact;
      continue;
    end if;

    v_roles := array(select jsonb_array_elements_text(coalesce(v_item -> 'roles', '[]')));
    v_fee := nullif(v_item ->> 'fee_cents', '')::bigint;
    v_template := null;
    if nullif(v_item ->> 'template_id', '') is not null then
      select * into v_template from public.contract_templates
       where id = (v_item ->> 'template_id')::uuid and organization_id = v_org;
      if not found or v_template.status <> 'validated' then
        raise exception 'mapping_template_not_validated';
      end if;
      if not (v_template.roles && v_roles) then
        raise exception 'mapping_template_incompatible';
      end if;
      v_type := v_template.type;
    else
      v_type := coalesce(nullif(v_item ->> 'contract_type', ''), 'other');
    end if;

    insert into public.legal_agreement_needs
      (organization_id, project_id, contact_id, roles, contract_type, template_id,
       fee_cents, approved_by, approved_at)
    values (v_org, p_project_id, v_contact, v_roles, v_type, v_template.id, v_fee,
            v_me, now())
    on conflict (project_id, contact_id) do update
      set roles = excluded.roles, contract_type = excluded.contract_type,
          template_id = excluded.template_id, fee_cents = excluded.fee_cents,
          approved_by = excluded.approved_by, approved_at = excluded.approved_at;
  end loop;

  perform public.log_contract_event(v_org, null, p_project_id, 'contract_mapping.approved');
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. The filled copy, versioned.
-- ---------------------------------------------------------------------------

create table public.contract_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  contract_id uuid not null,
  version integer not null,
  template_id uuid not null,
  template_version integer not null,
  body text not null,
  -- {field id: {value, source}} as injected.
  fields jsonb not null default '{}',
  -- Why the clauses changed (every version after the first).
  comment text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint contract_documents_body_check
    check (btrim(body) <> '' and char_length(body) <= 200000),
  constraint contract_documents_fields_check check (jsonb_typeof(fields) = 'object'),
  constraint contract_documents_comment_check
    check ((version = 1) or (comment is not null and btrim(comment) <> ''
                             and char_length(comment) <= 2000)),
  constraint contract_documents_version_key unique (contract_id, version),
  constraint contract_documents_contract_same_org
    foreign key (contract_id, organization_id)
    references public.contracts (id, organization_id) on delete cascade,
  constraint contract_documents_template_same_org
    foreign key (template_id, organization_id)
    references public.contract_templates (id, organization_id)
);

create trigger a_set_created_by before insert on public.contract_documents
  for each row execute function public.set_created_by();

alter table public.contract_documents enable row level security;
alter table public.contract_documents force row level security;
revoke all on public.contract_documents from anon, authenticated;

create policy contract_documents_select_visible on public.contract_documents
  for select to authenticated
  using (public.can_see_contract(contract_id));

grant select on public.contract_documents to authenticated;

-- Copies the need's template, every placeholder replaced by the value read
-- by the code from its source; refused while one is missing (« Dès que les
-- prérequis d'un accord sont disponibles »). Creates the contract (draft,
-- followed by its author) with the person as party.
create or replace function public.generate_legal_contract(
  p_need_id uuid,
  p_fields jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_need public.legal_agreement_needs%rowtype;
  v_template public.contract_templates%rowtype;
  v_me uuid := public.auth_person_id();
  v_body text;
  v_key text;
  v_value text;
  v_missing text[] := '{}';
  v_fields jsonb := '{}';
  v_contract uuid;
  v_name text;
begin
  select * into v_need from public.legal_agreement_needs where id = p_need_id for update;
  if not found or v_me is null
     or not public.has_permission(v_need.organization_id, 'manage_legal')
     or not public.has_permission(v_need.organization_id, 'manage_contracts')
     or not public.can_see_project(v_need.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_need.contract_id is not null then raise exception 'agreement_already_generated'; end if;
  select * into v_template from public.contract_templates where id = v_need.template_id;
  if not found or v_template.status <> 'validated' then
    raise exception 'template_not_validated';
  end if;
  if jsonb_typeof(coalesce(p_fields, '{}')) <> 'object' then
    raise exception 'contract_fields_invalid';
  end if;

  v_body := v_template.body;
  foreach v_key in array v_template.fields loop
    v_value := nullif(btrim(coalesce(p_fields -> v_key ->> 'value', '')), '');
    if v_value is null then
      v_missing := v_missing || v_key;
      continue;
    end if;
    v_value := left(v_value, 2000);
    v_fields := v_fields || jsonb_build_object(v_key, jsonb_build_object(
      'value', v_value,
      'source', left(coalesce(p_fields -> v_key ->> 'source', ''), 200)));
    v_body := regexp_replace(
      v_body, '\{\{\s*' || replace(v_key, '.', '\.') || '\s*\}\}',
      replace(v_value, '\', '\\'), 'g');
  end loop;
  if cardinality(v_missing) > 0 then
    raise exception 'contract_fields_missing'
      using detail = array_to_string(v_missing, ',');
  end if;

  select name into v_name from public.network_contacts where id = v_need.contact_id;
  insert into public.contracts
    (organization_id, title, type, status, project_id, owner_person_id)
  values (v_need.organization_id, left(v_template.name || ' — ' || v_name, 200),
          v_template.type, 'draft', v_need.project_id, v_me)
  returning id into v_contract;
  insert into public.contract_parties (contract_id, organization_id, contact_id)
  values (v_contract, v_need.organization_id, v_need.contact_id);
  insert into public.contract_documents
    (organization_id, contract_id, version, template_id, template_version, body, fields)
  values (v_need.organization_id, v_contract, 1, v_template.id, v_template.version,
          v_body, v_fields);
  update public.legal_agreement_needs set contract_id = v_contract where id = p_need_id;

  perform public.log_contract_event(v_need.organization_id, v_contract, v_need.project_id,
                                    'contract.generated',
                                    v_template.name || ' v' || v_template.version);
  return v_contract;
end;
$$;

-- An explicit change of clauses: a new version with its reason. An approved
-- contract goes back to draft, to be validated again.
create or replace function public.revise_contract_document(
  p_contract_id uuid,
  p_body text,
  p_comment text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contract public.contracts%rowtype;
  v_last public.contract_documents%rowtype;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  select * into v_contract from public.contracts where id = p_contract_id for update;
  if not found or not public.can_edit_contract(p_contract_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_contract.status not in ('draft', 'approved') then
    raise exception 'contract_wrong_status';
  end if;
  select * into v_last from public.contract_documents
   where contract_id = p_contract_id order by version desc limit 1;
  if not found then raise exception 'contract_document_missing'; end if;
  if v_comment is null then raise exception 'contract_comment_required'; end if;
  if p_body is null or p_body = v_last.body then raise exception 'contract_body_unchanged'; end if;

  insert into public.contract_documents
    (organization_id, contract_id, version, template_id, template_version, body, fields,
     comment)
  values (v_contract.organization_id, p_contract_id, v_last.version + 1, v_last.template_id,
          v_last.template_version, p_body, v_last.fields, left(v_comment, 2000));
  if v_contract.status = 'approved' then
    update public.contracts set status = 'draft' where id = p_contract_id;
  end if;
  perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                    v_contract.project_id, 'contract.revised', v_comment);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Financial needs: a signed agreement with a fee waits for its invoice.
-- ---------------------------------------------------------------------------

create table public.financial_needs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  project_id uuid,
  contract_id uuid not null,
  contact_id uuid not null,
  amount_cents bigint not null,
  currency text not null default 'EUR',
  -- Finance after WAITING_FOR_INVOICE is out of this ticket's scope.
  status text not null default 'waiting_for_invoice',
  created_at timestamptz not null default now(),
  constraint financial_needs_amount_check check (amount_cents > 0),
  constraint financial_needs_currency_check check (currency = 'EUR'),
  constraint financial_needs_status_check check (status in ('waiting_for_invoice')),
  constraint financial_needs_contract_key unique (contract_id),
  constraint financial_needs_contract_same_org
    foreign key (contract_id, organization_id) references public.contracts (id, organization_id),
  constraint financial_needs_contact_same_org
    foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id)
);

create index financial_needs_project_idx on public.financial_needs (project_id);

alter table public.financial_needs enable row level security;
alter table public.financial_needs force row level security;
revoke all on public.financial_needs from anon, authenticated;

create policy financial_needs_select_visible on public.financial_needs
  for select to authenticated
  using (public.can_see_contract(contract_id));

grant select on public.financial_needs to authenticated;

create or replace function public.contracts_financial_need()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_need public.legal_agreement_needs%rowtype;
  v_id uuid;
begin
  select * into v_need from public.legal_agreement_needs where contract_id = new.id;
  if not found or v_need.fee_cents is null then return new; end if;
  insert into public.financial_needs
    (organization_id, project_id, contract_id, contact_id, amount_cents)
  values (new.organization_id, new.project_id, new.id, v_need.contact_id, v_need.fee_cents)
  on conflict (contract_id) do nothing
  returning id into v_id;
  if v_id is not null then
    perform public.log_contract_event(new.organization_id, new.id, new.project_id,
                                      'financial_need.created',
                                      (v_need.fee_cents / 100.0)::text || ' EUR');
  end if;
  return new;
end;
$$;

create trigger z_financial_need after update of status on public.contracts
  for each row when (new.status = 'signed' and old.status is distinct from 'signed')
  execute function public.contracts_financial_need();

-- ---------------------------------------------------------------------------
-- 6. advance_contract: same steps, logged; a generated contract needs how it
-- was sent, and its signed copy with the proof before it is signed.
-- ---------------------------------------------------------------------------

create or replace function public.advance_contract(
  p_contract_id uuid,
  p_action text,
  p_comment text default null,
  p_signed_on date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contract public.contracts%rowtype;
  v_me uuid := public.auth_person_id();
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_editor boolean;
  v_validator boolean;
  v_generated boolean;
  v_person uuid;
begin
  select * into v_contract from public.contracts where id = p_contract_id for update;
  if not found or not public.can_see_contract(p_contract_id) then
    raise exception 'contract_not_found';
  end if;

  v_editor := public.has_permission(v_contract.organization_id, 'manage_contracts')
              and (v_contract.owner_person_id = v_me
                   or public.has_permission(v_contract.organization_id, 'view_all_projects'));
  v_validator := public.has_permission(v_contract.organization_id, 'validate');
  v_generated := exists (select 1 from public.contract_documents
                          where contract_id = p_contract_id);

  if p_action = 'submit' then
    if v_contract.status <> 'draft' then raise exception 'contract_wrong_status'; end if;
    if not v_editor then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    update public.contracts set status = 'in_review' where id = p_contract_id;
    for v_person in
      select m.person_id from public.memberships m
        join public.accounts a on a.id = m.approved_account_id
       where m.organization_id = v_contract.organization_id
         and m.status = 'approved' and a.disabled_at is null
         and 'validate' = any (public.role_permissions(m.role))
    loop
      perform public.notify(v_contract.organization_id, v_person, 'contract_review_requested',
                            v_contract.project_id, p_contract_id);
    end loop;
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id, 'contract.submitted');

  elsif p_action in ('approve', 'request_changes') then
    if v_contract.status <> 'in_review' then raise exception 'contract_wrong_status'; end if;
    if not v_validator then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    if p_action = 'request_changes' and v_comment is null then
      raise exception 'contract_comment_required';
    end if;
    update public.contracts
       set status = case p_action when 'approve' then 'approved' else 'draft' end,
           review_comment = v_comment,
           reviewed_by = v_me,
           reviewed_at = now()
     where id = p_contract_id;
    perform public.notify(v_contract.organization_id, v_contract.owner_person_id,
                          case p_action when 'approve' then 'contract_approved'
                                        else 'contract_changes_requested' end,
                          v_contract.project_id, p_contract_id);
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id,
                                      case p_action when 'approve' then 'contract.approved'
                                                    else 'contract.changes_requested' end,
                                      v_comment);

  elsif p_action = 'send' then
    if v_contract.status <> 'approved' then raise exception 'contract_wrong_status'; end if;
    if not v_editor then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    if v_generated and v_comment is null then
      raise exception 'contract_send_proof_required';
    end if;
    update public.contracts set status = 'sent' where id = p_contract_id;
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id, 'signature.requested',
                                      v_comment);

  elsif p_action = 'sign' then
    if v_contract.status not in ('approved', 'sent') then
      raise exception 'contract_wrong_status';
    end if;
    if not v_editor then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    if p_signed_on is null or p_signed_on > current_date then
      raise exception 'contract_signed_on_invalid';
    end if;
    if v_generated and not (
      exists (select 1 from public.contract_files
               where contract_id = p_contract_id and category = 'signed')
      and exists (select 1 from public.contract_files
                   where contract_id = p_contract_id and category = 'evidence')
    ) then
      raise exception 'contract_proof_missing';
    end if;
    update public.contracts set status = 'signed', signed_on = p_signed_on
     where id = p_contract_id;
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id, 'contract.signed');

  elsif p_action = 'terminate' then
    if v_contract.status <> 'signed' then raise exception 'contract_wrong_status'; end if;
    if not v_editor then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    update public.contracts set status = 'terminated' where id = p_contract_id;
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id, 'contract.terminated');

  else
    raise exception 'contract_unknown_action';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on function public.contract_placeholders(text) from public, anon;
revoke execute on function public.create_contract_template(uuid, uuid, text, text, text[], text, text)
  from public, anon;
revoke execute on function public.set_contract_template_status(uuid, text) from public, anon;
revoke execute on function public.approve_contract_mapping(uuid, jsonb) from public, anon;
revoke execute on function public.generate_legal_contract(uuid, jsonb) from public, anon;
revoke execute on function public.revise_contract_document(uuid, text, text) from public, anon;
revoke execute on function public.contracts_financial_need() from public, anon, authenticated;
revoke execute on function public.advance_contract(uuid, text, text, date) from public, anon;

grant execute on function public.contract_placeholders(text) to authenticated;
grant execute on function public.create_contract_template(uuid, uuid, text, text, text[], text, text)
  to authenticated;
grant execute on function public.set_contract_template_status(uuid, text) to authenticated;
grant execute on function public.approve_contract_mapping(uuid, jsonb) to authenticated;
grant execute on function public.generate_legal_contract(uuid, jsonb) to authenticated;
grant execute on function public.revise_contract_document(uuid, text, text) to authenticated;
grant execute on function public.advance_contract(uuid, text, text, date) to authenticated;
