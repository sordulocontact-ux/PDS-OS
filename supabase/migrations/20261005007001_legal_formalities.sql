-- Juridique, branch 06: a generic formality engine and the SACEM 725
-- definition (ticket Juridique 06, docs/ARCHITECTURE.md § 8 sexies).
--
-- Generic: legal_formalities (one per title and definition), its validated
-- values with their provenance, its document versions, its signatures, its
-- submission, outcome and proofs, its history. The rules of a definition
-- live in formality_missing (SQL) and lib/legal/formalities/ (the fields,
-- their sources): no SACEM page holds any logic.
--
-- From the ticket (bulletin SACEM 725 — 02/2026, œuvres éditées):
--   * « Déposé n'est pas enregistré » → SUBMITTED, PROCESSING and COMPLETED
--     are distinct; COMPLETED needs the proof of the result;
--   * « Une correction externe rouvre uniquement la partie concernée » →
--     require_formality_action reopens the fields named, the others stay
--     validated; a new document version is generated, with new signatures;
--   * « Le total des quotes-parts Phono doit être égal à 100 % » → checked
--     exactly here;
--   * « Modalités DEP / DR ← choix explicite ; ne pas les déduire du split »
--     → a value of its own, never computed;
--   * « Un emprunt à une œuvre préexistante exige l'autorisation préalable »
--     → every clearance of the title is secured (or abandoned) before the
--     bulletin is generated;
--   * « Le contrat d'édition est optionnel sauf si seuls les éditeurs
--     signent ; sans copie, renseigner la rubrique G »;
--   * « Le bulletin doit être signé par tous les ayants droit ; une
--     déclaration partielle est possible » → every signature, or a partial
--     declaration with its reason;
--   * « PO n'invente ni ISWC ni première exploitation » → both are typed or
--     read from the title, never deduced;
--   * deposit and proof stay human (MVP): the submission and the outcome are
--     recorded with their proof, the title's SACEM declaration follows.

create table public.legal_formalities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  project_id uuid not null,
  master_id uuid not null,
  definition_key text not null,
  definition_version integer not null,
  status text not null default 'collecting_data',
  responsible_person_id uuid references public.people (id),
  -- The fields an external correction reopened.
  reopened text[] not null default '{}',
  partial_reason text,
  submission_proof text,
  submitted_at timestamptz,
  completion_proof text,
  external_id text,
  completed_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_formalities_definition_check check (definition_key in ('SACEM_725_EDITED_WORK')),
  constraint legal_formalities_status_check check (status in (
    'collecting_data', 'ready_to_generate', 'document_ready', 'signatures_pending',
    'ready_to_submit', 'submitted', 'processing', 'completed', 'action_required')),
  constraint legal_formalities_text_check check (
    coalesce(char_length(partial_reason), 0) <= 2000
    and coalesce(char_length(submission_proof), 0) <= 2000
    and coalesce(char_length(completion_proof), 0) <= 2000
    and coalesce(char_length(external_id), 0) <= 100),
  constraint legal_formalities_key unique (project_id, master_id, definition_key),
  constraint legal_formalities_id_org_key unique (id, organization_id),
  constraint legal_formalities_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id),
  constraint legal_formalities_master_same_org
    foreign key (master_id, organization_id) references public.masters (id, organization_id)
);

create trigger a_set_updated_at before update on public.legal_formalities
  for each row execute function public.set_updated_at();

create table public.legal_formality_values (
  formality_id uuid not null,
  field_key text not null,
  organization_id uuid not null references public.organizations (id),
  value jsonb not null,
  -- Where the value came from (a source of PDS OS, or typed), as shown.
  source text not null,
  status text not null default 'validated',
  validated_by uuid references public.people (id),
  validated_at timestamptz,
  primary key (formality_id, field_key),
  constraint legal_formality_values_key_check check (char_length(field_key) between 1 and 60),
  constraint legal_formality_values_source_check check (char_length(source) between 1 and 200),
  constraint legal_formality_values_status_check check (status in ('validated', 'to_verify')),
  constraint legal_formality_values_size check (pg_column_size(value) <= 20000),
  constraint legal_formality_values_formality_same_org
    foreign key (formality_id, organization_id)
    references public.legal_formalities (id, organization_id) on delete cascade
);

create table public.legal_formality_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  formality_id uuid not null,
  version integer not null,
  content jsonb not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint legal_formality_documents_key unique (formality_id, version),
  constraint legal_formality_documents_formality_same_org
    foreign key (formality_id, organization_id)
    references public.legal_formalities (id, organization_id) on delete cascade
);

create table public.legal_formality_signatures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  formality_id uuid not null,
  document_version integer not null,
  signer text not null,
  role text not null,
  status text not null default 'pending',
  proof text,
  signed_at timestamptz,
  recorded_by uuid references public.people (id),
  constraint legal_formality_signatures_status_check check (status in ('pending', 'signed')),
  constraint legal_formality_signatures_proof_check check (proof is null or char_length(proof) <= 2000),
  constraint legal_formality_signatures_formality_same_org
    foreign key (formality_id, organization_id)
    references public.legal_formalities (id, organization_id) on delete cascade
);

create table public.legal_formality_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  formality_id uuid not null,
  kind text not null,
  note text,
  actor_person_id uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint legal_formality_events_kind_check check (kind in (
    'formality.values_validated', 'formality.ready', 'document.generated',
    'signature.completed', 'formality.partial', 'formality.submitted', 'formality.processing',
    'formality.action_required', 'formality.completed')),
  constraint legal_formality_events_note_check check (note is null or char_length(note) <= 2000),
  constraint legal_formality_events_formality_same_org
    foreign key (formality_id, organization_id)
    references public.legal_formalities (id, organization_id) on delete cascade
);

create index legal_formality_signatures_idx on public.legal_formality_signatures (formality_id, document_version);
create index legal_formality_events_idx on public.legal_formality_events (formality_id, created_at);

create or replace function public.can_manage_formality(p_formality_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.legal_formalities f
     where f.id = p_formality_id
       and public.has_permission(f.organization_id, 'manage_legal')
       and public.can_see_project(f.project_id));
$$;

alter table public.legal_formalities enable row level security;
alter table public.legal_formalities force row level security;
revoke all on public.legal_formalities from anon, authenticated;
grant select on public.legal_formalities to authenticated;
create policy legal_formalities_select on public.legal_formalities
  for select to authenticated
  using (public.has_permission(organization_id, 'manage_legal') and public.can_see_project(project_id));

do $$
declare
  t text;
begin
  foreach t in array array['legal_formality_values', 'legal_formality_documents',
                           'legal_formality_signatures', 'legal_formality_events']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.can_manage_formality(formality_id))',
      t || '_select', t);
  end loop;
end;
$$;

create or replace function public.log_formality_event(
  p_formality public.legal_formalities, p_kind text, p_note text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.legal_formality_events (organization_id, formality_id, kind, note, actor_person_id)
  values (p_formality.organization_id, p_formality.id, p_kind,
          left(nullif(btrim(coalesce(p_note, '')), ''), 2000), public.auth_person_id());
$$;

create or replace function public.formality_for_write(p_formality_id uuid)
returns public.legal_formalities
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype;
begin
  select * into v from public.legal_formalities where id = p_formality_id for update;
  if not found or public.auth_person_id() is null
     or not public.can_manage_formality(p_formality_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.status = 'completed' then
    raise exception 'formality_closed' using errcode = 'P0001';
  end if;
  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- What the definition still needs (SACEM_725_EDITED_WORK v1).
-- ---------------------------------------------------------------------------

create or replace function public.formality_missing(p_formality_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype;
  v_vals jsonb;
  v_missing text[] := '{}';
  v_creators jsonb;
  v_publishers jsonb;
  v_total numeric := 0;
  v_item jsonb;
  v_i integer := 0;
  v_any_creator_signs boolean := false;
  v_arranger boolean := false;
  v_work text;
begin
  select * into v from public.legal_formalities where id = p_formality_id;
  select coalesce(jsonb_object_agg(field_key, value), '{}'::jsonb) into v_vals
    from public.legal_formality_values where formality_id = p_formality_id and status = 'validated';
  -- A reopened field is to verify again.
  select v_missing || coalesce(array_agg('to_verify:' || field_key), '{}') into v_missing
    from public.legal_formality_values where formality_id = p_formality_id and status = 'to_verify';

  if nullif(btrim(coalesce(v_vals ->> 'title', '')), '') is null then
    v_missing := v_missing || 'title'::text;
  end if;
  if nullif(btrim(coalesce(v_vals ->> 'duration', '')), '') is null then
    v_missing := v_missing || 'duration'::text;
  end if;

  v_creators := coalesce(v_vals -> 'creators', '[]'::jsonb);
  v_publishers := coalesce(v_vals -> 'publishers', '[]'::jsonb);
  if jsonb_typeof(v_creators) <> 'array' then v_creators := '[]'::jsonb; end if;
  if jsonb_typeof(v_publishers) <> 'array' then v_publishers := '[]'::jsonb; end if;
  if jsonb_array_length(v_creators) = 0 then
    v_missing := v_missing || 'creators'::text;
  else
    for v_item in select * from jsonb_array_elements(v_creators) loop
      v_i := v_i + 1;
      if nullif(btrim(coalesce(v_item ->> 'last_name', '')), '') is null then
        v_missing := v_missing || ('creator_name:' || v_i);
      end if;
      if coalesce(v_item ->> 'quality', '') not in ('author', 'composer', 'arranger', 'adapter') then
        v_missing := v_missing || ('creator_quality:' || v_i);
      end if;
      if v_item ->> 'quality' = 'arranger' then v_arranger := true; end if;
      if coalesce((v_item ->> 'signs')::boolean, false) then v_any_creator_signs := true; end if;
      v_total := v_total + coalesce(nullif(v_item ->> 'phono', '')::numeric, 0);
    end loop;
  end if;
  if jsonb_array_length(v_creators) > 5 then v_missing := v_missing || 'creators_max'::text; end if;
  if jsonb_array_length(v_publishers) > 3 then v_missing := v_missing || 'publishers_max'::text; end if;
  for v_item in select * from jsonb_array_elements(v_publishers) loop
    v_total := v_total + coalesce(nullif(v_item ->> 'phono', '')::numeric, 0);
  end loop;
  if v_total <> 100 then v_missing := v_missing || 'phono_total'::text; end if;

  if coalesce(v_vals -> 'dep_dr' ->> 'choice', '') not in ('DEP', 'DR') then
    v_missing := v_missing || 'dep_dr'::text;
  end if;
  if v_arranger and coalesce(v_vals -> 'arrangement' ->> 'scope', '') not in ('all', 'specific') then
    v_missing := v_missing || 'arrangement'::text;
  end if;
  -- Publishing contract: required when only publishers sign; without a copy,
  -- the rubric G.
  if jsonb_array_length(v_publishers) > 0 then
    if not v_any_creator_signs
       and not coalesce((v_vals -> 'publishing_contract' ->> 'provided')::boolean, false) then
      v_missing := v_missing || 'publishing_contract'::text;
    elsif not coalesce((v_vals -> 'publishing_contract' ->> 'provided')::boolean, false)
       and nullif(btrim(coalesce(v_vals -> 'publishing_contract' ->> 'rubric_g', '')), '') is null then
      v_missing := v_missing || 'rubric_g'::text;
    end if;
  end if;
  -- Borrowings: every element taken from an existing work is secured.
  for v_work in
    select c.work from public.legal_clearances c
     where c.master_id = v.master_id and c.project_id = v.project_id
       and c.status not in ('cleared', 'abandoned')
  loop
    v_missing := v_missing || ('borrowing:' || v_work);
  end loop;
  return v_missing;
end;
$$;

-- The state while the values are being written: ready once nothing misses.
create or replace function public.formality_settle(p_formality_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype;
  v_ready boolean;
begin
  select * into v from public.legal_formalities where id = p_formality_id;
  if v.status not in ('collecting_data', 'ready_to_generate', 'action_required') then return; end if;
  v_ready := cardinality(public.formality_missing(p_formality_id)) = 0;
  if v.status = 'action_required' and cardinality(v.reopened) > 0 then return; end if;
  update public.legal_formalities
     set status = case when v_ready then 'ready_to_generate' else 'collecting_data' end
   where id = p_formality_id;
  if v_ready and v.status <> 'ready_to_generate' then
    perform public.log_formality_event(v, 'formality.ready');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- The steps (manage_legal).
-- ---------------------------------------------------------------------------

create or replace function public.open_formality(p_project_id uuid, p_master_id uuid, p_key text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_id uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or public.auth_person_id() is null
     or not public.has_permission(v_org, 'manage_legal')
     or not public.can_see_project(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.project_masters where project_id = p_project_id and master_id = p_master_id) then
    raise exception 'formality_title_invalid' using errcode = 'P0001';
  end if;
  insert into public.legal_formalities
    (organization_id, project_id, master_id, definition_key, definition_version, created_by)
  values (v_org, p_project_id, p_master_id, p_key, 1, public.auth_person_id())
  on conflict (project_id, master_id, definition_key) do nothing;
  select id into v_id from public.legal_formalities
   where project_id = p_project_id and master_id = p_master_id and definition_key = p_key;
  return v_id;
end;
$$;

-- « Justine valide les valeurs » : {field_key: {value, source}}, the ones
-- given are validated (and leave the reopened list).
create or replace function public.save_formality_values(p_formality_id uuid, p_values jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype := public.formality_for_write(p_formality_id);
  v_key text;
  v_entry jsonb;
begin
  if v.status in ('submitted', 'processing') then
    raise exception 'formality_submitted' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_values) <> 'object' then raise exception 'formality_values_invalid' using errcode = 'P0001'; end if;
  for v_key, v_entry in select * from jsonb_each(p_values) loop
    -- After an external correction, only the fields it reopened.
    continue when v.status = 'action_required' and not (v_key = any (v.reopened));
    insert into public.legal_formality_values
      (formality_id, field_key, organization_id, value, source, status, validated_by, validated_at)
    values (p_formality_id, v_key, v.organization_id, coalesce(v_entry -> 'value', 'null'::jsonb),
            left(coalesce(nullif(v_entry ->> 'source', ''), 'Saisi'), 200), 'validated',
            public.auth_person_id(), now())
    on conflict (formality_id, field_key) do update
      set value = excluded.value, source = excluded.source, status = 'validated',
          validated_by = excluded.validated_by, validated_at = excluded.validated_at;
    update public.legal_formalities set reopened = array_remove(reopened, v_key)
     where id = p_formality_id;
  end loop;
  perform public.log_formality_event(v, 'formality.values_validated');
  update public.legal_formalities
     set status = case
       when status = 'action_required' and cardinality(reopened) = 0 then 'collecting_data'
       -- A change after a version was generated calls for a new version.
       when status in ('document_ready', 'signatures_pending', 'ready_to_submit') then 'collecting_data'
       else status end
   where id = p_formality_id;
  perform public.formality_settle(p_formality_id);
end;
$$;

-- A version of the bulletin, from the validated values; its signers.
create or replace function public.generate_formality_document(p_formality_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype := public.formality_for_write(p_formality_id);
  v_version integer;
  v_content jsonb;
  v_item jsonb;
begin
  if v.status not in ('ready_to_generate', 'document_ready', 'signatures_pending') then
    raise exception 'formality_not_ready' using errcode = 'P0001';
  end if;
  if cardinality(public.formality_missing(p_formality_id)) > 0 then
    raise exception 'formality_missing' using errcode = 'P0001',
      detail = array_to_string(public.formality_missing(p_formality_id), ',');
  end if;
  select coalesce(jsonb_object_agg(field_key, jsonb_build_object('value', value, 'source', source)), '{}')
    into v_content from public.legal_formality_values where formality_id = p_formality_id;
  select coalesce(max(version), 0) + 1 into v_version
    from public.legal_formality_documents where formality_id = p_formality_id;
  insert into public.legal_formality_documents (organization_id, formality_id, version, content, created_by)
  values (v.organization_id, p_formality_id, v_version, v_content, public.auth_person_id());

  -- « Le bulletin doit être signé par tous les ayants droit »: the creators
  -- who sign and the publishers, for this version.
  for v_item in select * from jsonb_array_elements(coalesce(v_content -> 'creators' -> 'value', '[]')) loop
    continue when not coalesce((v_item ->> 'signs')::boolean, false);
    insert into public.legal_formality_signatures (organization_id, formality_id, document_version, signer, role)
    values (v.organization_id, p_formality_id, v_version,
            left(btrim(concat_ws(' ', v_item ->> 'first_name', v_item ->> 'last_name')), 200),
            coalesce(v_item ->> 'quality', 'author'));
  end loop;
  for v_item in select * from jsonb_array_elements(coalesce(v_content -> 'publishers' -> 'value', '[]')) loop
    insert into public.legal_formality_signatures (organization_id, formality_id, document_version, signer, role)
    values (v.organization_id, p_formality_id, v_version, left(btrim(v_item ->> 'name'), 200), 'publisher');
  end loop;
  update public.legal_formalities
     set status = case when exists (
           select 1 from public.legal_formality_signatures
            where formality_id = p_formality_id and document_version = v_version)
         then 'signatures_pending' else 'ready_to_submit' end,
         partial_reason = null
   where id = p_formality_id;
  perform public.log_formality_event(v, 'document.generated', 'v' || v_version);
  return v_version;
end;
$$;

create or replace function public.record_formality_signature(p_signature_id uuid, p_proof text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sig public.legal_formality_signatures%rowtype;
  v public.legal_formalities%rowtype;
  v_current integer;
begin
  select * into v_sig from public.legal_formality_signatures where id = p_signature_id for update;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  v := public.formality_for_write(v_sig.formality_id);
  select max(version) into v_current from public.legal_formality_documents where formality_id = v.id;
  if v.status <> 'signatures_pending' or v_sig.document_version <> v_current then
    raise exception 'formality_signature_closed' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_proof, '')), '') is null then
    raise exception 'formality_proof_required' using errcode = 'P0001';
  end if;
  update public.legal_formality_signatures
     set status = 'signed', proof = btrim(p_proof), signed_at = now(), recorded_by = public.auth_person_id()
   where id = p_signature_id;
  perform public.log_formality_event(v, 'signature.completed', v_sig.signer);
  if not exists (select 1 from public.legal_formality_signatures
                  where formality_id = v.id and document_version = v_current and status = 'pending') then
    update public.legal_formalities set status = 'ready_to_submit' where id = v.id;
  end if;
end;
$$;

-- « Une déclaration partielle est possible en cas de difficulté » : said why.
create or replace function public.declare_formality_partial(p_formality_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype := public.formality_for_write(p_formality_id);
begin
  if v.status <> 'signatures_pending' then raise exception 'formality_not_signing' using errcode = 'P0001'; end if;
  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'formality_reason_required' using errcode = 'P0001';
  end if;
  update public.legal_formalities set status = 'ready_to_submit', partial_reason = btrim(p_reason)
   where id = p_formality_id;
  perform public.log_formality_event(v, 'formality.partial', p_reason);
end;
$$;

-- The deposit, done by a person outside PDS OS, with its proof.
create or replace function public.submit_formality(p_formality_id uuid, p_proof text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype := public.formality_for_write(p_formality_id);
begin
  if v.status <> 'ready_to_submit' then raise exception 'formality_not_ready' using errcode = 'P0001'; end if;
  if nullif(btrim(coalesce(p_proof, '')), '') is null then
    raise exception 'formality_proof_required' using errcode = 'P0001';
  end if;
  update public.legal_formalities
     set status = 'submitted', submission_proof = btrim(p_proof), submitted_at = now(), reopened = '{}'
   where id = p_formality_id;
  if v.definition_key = 'SACEM_725_EDITED_WORK' then
    insert into public.master_declarations (organization_id, master_id, organism, status, declared_on, notes)
    values (v.organization_id, v.master_id, 'sacem', 'submitted', current_date, left(btrim(p_proof), 2000))
    on conflict (master_id, organism) do update
      set status = 'submitted', declared_on = current_date, notes = excluded.notes;
  end if;
  perform public.log_formality_event(v, 'formality.submitted', p_proof);
end;
$$;

create or replace function public.mark_formality_processing(p_formality_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype := public.formality_for_write(p_formality_id);
begin
  if v.status <> 'submitted' then raise exception 'formality_not_submitted' using errcode = 'P0001'; end if;
  update public.legal_formalities set status = 'processing' where id = p_formality_id;
  perform public.log_formality_event(v, 'formality.processing');
end;
$$;

-- An external correction: only the fields named are reopened.
create or replace function public.require_formality_action(p_formality_id uuid, p_fields text[], p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype := public.formality_for_write(p_formality_id);
begin
  if v.status not in ('submitted', 'processing') then
    raise exception 'formality_not_submitted' using errcode = 'P0001';
  end if;
  if coalesce(cardinality(p_fields), 0) = 0 or nullif(btrim(coalesce(p_note, '')), '') is null then
    raise exception 'formality_correction_invalid' using errcode = 'P0001';
  end if;
  update public.legal_formality_values set status = 'to_verify'
   where formality_id = p_formality_id and field_key = any (p_fields);
  update public.legal_formalities set status = 'action_required', reopened = p_fields
   where id = p_formality_id;
  perform public.log_formality_event(v, 'formality.action_required',
                                     array_to_string(p_fields, ', ') || ' · ' || btrim(p_note));
end;
$$;

-- « COMPLETED exige la preuve du résultat et propage l'identifiant externe ».
create or replace function public.complete_formality(
  p_formality_id uuid, p_proof text, p_external_id text, p_iswc text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype := public.formality_for_write(p_formality_id);
  v_iswc text := nullif(upper(regexp_replace(coalesce(p_iswc, ''), '[^A-Za-z0-9]', '', 'g')), '');
begin
  if v.status not in ('submitted', 'processing') then
    raise exception 'formality_not_submitted' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_proof, '')), '') is null then
    raise exception 'formality_proof_required' using errcode = 'P0001';
  end if;
  if v_iswc is not null and v_iswc !~ '^T[0-9]{10}$' then
    raise exception 'formality_iswc_invalid' using errcode = 'P0001';
  end if;
  update public.legal_formalities
     set status = 'completed', completion_proof = btrim(p_proof), completed_at = now(),
         external_id = nullif(btrim(coalesce(p_external_id, '')), '')
   where id = p_formality_id;
  if v.definition_key = 'SACEM_725_EDITED_WORK' then
    insert into public.master_declarations (organization_id, master_id, organism, status, reference, declared_on, notes)
    values (v.organization_id, v.master_id, 'sacem', 'confirmed',
            nullif(btrim(coalesce(p_external_id, '')), ''), current_date, left(btrim(p_proof), 2000))
    on conflict (master_id, organism) do update
      set status = 'confirmed', reference = coalesce(excluded.reference, public.master_declarations.reference),
          notes = excluded.notes;
    if v_iswc is not null then
      update public.masters set iswc = v_iswc where id = v.master_id and iswc is null;
    end if;
  end if;
  perform public.log_formality_event(v, 'formality.completed', p_proof);
end;
$$;

-- Grants -----------------------------------------------------------------------

revoke execute on function public.can_manage_formality(uuid) from public, anon;
revoke execute on function public.log_formality_event(public.legal_formalities, text, text)
  from public, anon, authenticated;
revoke execute on function public.formality_for_write(uuid) from public, anon, authenticated;
revoke execute on function public.formality_settle(uuid) from public, anon, authenticated;
revoke execute on function public.formality_missing(uuid) from public, anon;
revoke execute on function public.open_formality(uuid, uuid, text) from public, anon;
revoke execute on function public.save_formality_values(uuid, jsonb) from public, anon;
revoke execute on function public.generate_formality_document(uuid) from public, anon;
revoke execute on function public.record_formality_signature(uuid, text) from public, anon;
revoke execute on function public.declare_formality_partial(uuid, text) from public, anon;
revoke execute on function public.submit_formality(uuid, text) from public, anon;
revoke execute on function public.mark_formality_processing(uuid) from public, anon;
revoke execute on function public.require_formality_action(uuid, text[], text) from public, anon;
revoke execute on function public.complete_formality(uuid, text, text, text) from public, anon;

grant execute on function public.can_manage_formality(uuid) to authenticated;
grant execute on function public.formality_missing(uuid) to authenticated;
grant execute on function public.open_formality(uuid, uuid, text) to authenticated;
grant execute on function public.save_formality_values(uuid, jsonb) to authenticated;
grant execute on function public.generate_formality_document(uuid) to authenticated;
grant execute on function public.record_formality_signature(uuid, text) to authenticated;
grant execute on function public.declare_formality_partial(uuid, text) to authenticated;
grant execute on function public.submit_formality(uuid, text) to authenticated;
grant execute on function public.mark_formality_processing(uuid) to authenticated;
grant execute on function public.require_formality_action(uuid, text[], text) to authenticated;
grant execute on function public.complete_formality(uuid, text, text, text) to authenticated;
