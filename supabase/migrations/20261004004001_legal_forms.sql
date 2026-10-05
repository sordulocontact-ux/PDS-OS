-- Juridique, branch 02: fiches de renseignements filled from a link, without
-- an account (ticket Juridique 02, docs/ARCHITECTURE.md § 8 sexies).
--
-- From the ticket:
--   * « Le lien est signé, expirable, révocable et limité à une personne et
--     un projet » → legal_forms: only the token's SHA-256 is stored (the link
--     is shown once, a new one revokes the old), 30 days, one contact and
--     one project;
--   * « Aucun compte PO obligatoire pour répondre » → get_legal_form and
--     submit_legal_form are security definer functions open to anon, which
--     check the token themselves (no service role, CLAUDE.md rule 3);
--   * « Les données permanentes alimentent Person ; les rôles, crédits et
--     conditions propres au morceau alimentent Contribution » →
--     contact_legal_details (the person, kept across projects) apart from
--     legal_form_submissions.contribution (this project);
--   * « Les données déjà fiables ne sont pas redemandées » → the form shows
--     what is known, to confirm;
--   * « Une correction sensible peut être signalée pour revue avant
--     propagation » → a submitted value that differs from a known one is not
--     applied: the form waits for review (action_required);
--   * states À_COMPLÉTER → LIEN_GÉNÉRÉ → ENVOYÉ → … → COMPLET, exceptions
--     EXPIRED · REVOKED · ACTION_REQUIRED → legal_forms.status (expired is
--     read from expires_at).
--
-- Read: manage_legal on a visible project (details: manage_legal or
-- manage_contracts, who draft contracts from them). Written only through
-- the functions below.

create table public.contact_legal_details (
  contact_id uuid primary key,
  organization_id uuid not null references public.organizations (id),
  -- Field ids of lib/legal/forms/definition.ts (target "person").
  details jsonb not null default '{}',
  definition_version integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint contact_legal_details_object check (jsonb_typeof(details) = 'object'),
  constraint contact_legal_details_size check (pg_column_size(details) <= 20000),
  constraint contact_legal_details_contact_same_org
    foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id)
);

create table public.legal_forms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  project_id uuid not null,
  contact_id uuid not null,
  status text not null default 'link_generated',
  token_hash text not null,
  expires_at timestamptz not null,
  definition_version integer not null,
  -- What the form shows to confirm: the roles the credits already name.
  prefill jsonb not null default '{}',
  created_by uuid references public.people (id),
  sent_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_forms_status_check
    check (status in ('link_generated', 'sent', 'action_required', 'complete', 'revoked')),
  constraint legal_forms_token_key unique (token_hash),
  constraint legal_forms_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id),
  constraint legal_forms_contact_same_org
    foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id)
);

create index legal_forms_project_idx on public.legal_forms (project_id, contact_id);

create table public.legal_form_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  form_id uuid not null references public.legal_forms (id) on delete cascade,
  project_id uuid not null,
  contact_id uuid not null,
  roles text[] not null,
  other_role text,
  person jsonb not null,
  contribution jsonb not null,
  -- { field: { "before": …, "after": … } }: what differed from the known.
  corrections jsonb not null default '{}',
  definition_version integer not null,
  created_at timestamptz not null default now(),
  constraint legal_form_submissions_size
    check (pg_column_size(person) + pg_column_size(contribution) <= 40000),
  constraint legal_form_submissions_other_check
    check (other_role is null or char_length(other_role) <= 200)
);

create index legal_form_submissions_form_idx on public.legal_form_submissions (form_id, created_at);

do $$
declare
  t text;
begin
  foreach t in array array['contact_legal_details', 'legal_forms', 'legal_form_submissions']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end;
$$;

create policy contact_legal_details_select on public.contact_legal_details
  for select to authenticated
  using (public.has_permission(organization_id, 'manage_legal')
         or public.has_permission(organization_id, 'manage_contracts'));
create policy legal_forms_select_legal on public.legal_forms
  for select to authenticated
  using (public.has_permission(organization_id, 'manage_legal')
         and public.can_see_project(project_id));
create policy legal_form_submissions_select_legal on public.legal_form_submissions
  for select to authenticated
  using (public.has_permission(organization_id, 'manage_legal')
         and public.can_see_project(project_id));

create trigger a_set_updated_at before update on public.legal_forms
  for each row execute function public.set_updated_at();

-- prepare_legal_form ---------------------------------------------------------
-- The link for one person of the project: their contact (created from the
-- credit when they are not in the Réseau yet, and their credits linked to
-- it), any previous open link revoked, a new token returned once.
create or replace function public.prepare_legal_form(
  p_project_id uuid,
  p_contact_id uuid,
  p_name text,
  p_network_roles text[],
  p_credit_ids uuid[],
  p_prefill jsonb,
  p_version integer
)
returns table (form_id uuid, token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_person uuid := public.auth_person_id();
  v_contact uuid := p_contact_id;
  v_token text;
  v_form uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or v_person is null
     or not public.has_permission(v_org, 'manage_legal')
     or not public.can_see_project(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- Every credit given is a credit of one of the project's titles.
  if (select count(*) from public.master_contributors c
       join public.project_masters pm on pm.master_id = c.master_id
      where pm.project_id = p_project_id and c.id = any (coalesce(p_credit_ids, '{}')))
     <> coalesce(cardinality(p_credit_ids), 0) then
    raise exception 'legal_form_credit_invalid' using errcode = 'P0001';
  end if;

  if v_contact is null then
    if not public.has_permission(v_org, 'manage_network') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    insert into public.network_contacts (organization_id, kind, name, roles, created_by)
    values (v_org, 'person', left(btrim(p_name), 200), p_network_roles, v_person)
    returning id into v_contact;
  elsif not exists (
    select 1 from public.network_contacts where id = v_contact and organization_id = v_org
  ) then
    raise exception 'legal_form_contact_invalid' using errcode = 'P0001';
  end if;

  update public.master_contributors
     set contact_id = v_contact
   where id = any (coalesce(p_credit_ids, '{}')) and contact_id is null;

  update public.legal_forms
     set status = 'revoked', revoked_at = now()
   where project_id = p_project_id and contact_id = v_contact
     and status in ('link_generated', 'sent', 'action_required');

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.legal_forms
    (organization_id, project_id, contact_id, token_hash, expires_at, definition_version,
     prefill, created_by)
  values (v_org, p_project_id, v_contact,
          encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), now() + interval '30 days',
          p_version, coalesce(p_prefill, '{}'), v_person)
  returning id into v_form;

  return query select v_form, v_token;
end;
$$;

revoke execute on function public.prepare_legal_form(uuid, uuid, text, text[], uuid[], jsonb, integer)
  from public, anon;
grant execute on function public.prepare_legal_form(uuid, uuid, text, text[], uuid[], jsonb, integer)
  to authenticated;

-- set_legal_form_state: « Marquer comme envoyé », « Révoquer » (internal).
create or replace function public.set_legal_form_state(p_form_id uuid, p_state text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_form public.legal_forms%rowtype;
begin
  select * into v_form from public.legal_forms where id = p_form_id for update;
  if not found
     or not public.has_permission(v_form.organization_id, 'manage_legal')
     or not public.can_see_project(v_form.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_state = 'sent' and v_form.status = 'link_generated' then
    update public.legal_forms set status = 'sent', sent_at = now() where id = p_form_id;
  elsif p_state = 'revoked' and v_form.status in ('link_generated', 'sent', 'action_required') then
    update public.legal_forms set status = 'revoked', revoked_at = now() where id = p_form_id;
  else
    raise exception 'legal_form_state_invalid' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.set_legal_form_state(uuid, text) from public, anon;
grant execute on function public.set_legal_form_state(uuid, text) to authenticated;

-- get_legal_form (anon) --------------------------------------------------------
-- What the public page shows for a token: nothing for an unknown token; the
-- state for a closed one; the person, the project and what is already known
-- (to confirm, never to type again) for an open one.
create or replace function public.get_legal_form(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_form public.legal_forms%rowtype;
  v_state text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select * into v_form from public.legal_forms
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if not found then
    return null;
  end if;
  v_state := case
    when v_form.status = 'revoked' then 'revoked'
    when v_form.status in ('complete', 'action_required') then 'submitted'
    when v_form.expires_at < now() then 'expired'
    else 'open' end;
  if v_state <> 'open' then
    return jsonb_build_object('state', v_state);
  end if;
  return (
    select jsonb_build_object(
      'state', 'open',
      'version', v_form.definition_version,
      'person', c.name,
      'project', p.title,
      'prefill', v_form.prefill,
      'known', coalesce(d.details, '{}')
               || jsonb_strip_nulls(jsonb_build_object('email', c.email, 'phone', c.phone)))
      from public.network_contacts c
      join public.projects p on p.id = v_form.project_id
      left join public.contact_legal_details d on d.contact_id = c.id
     where c.id = v_form.contact_id
  );
end;
$$;

revoke execute on function public.get_legal_form(text) from public;
grant execute on function public.get_legal_form(text) to anon, authenticated;

-- submit_legal_form (anon) -----------------------------------------------------
-- Keeps the answers (already checked by the server against the versioned
-- definition): the person's new values are applied, the ones that differ
-- from what was known wait for review; the contribution stays with the
-- project. Returns the form's new state.
create or replace function public.submit_legal_form(
  p_token text,
  p_roles text[],
  p_other_role text,
  p_person jsonb,
  p_contribution jsonb,
  p_version integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_form public.legal_forms%rowtype;
  v_known jsonb;
  v_corrections jsonb := '{}';
  v_new jsonb := '{}';
  v_key text;
  v_value jsonb;
  v_status text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'legal_form_closed' using errcode = 'P0001';
  end if;
  select * into v_form from public.legal_forms
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
   for update;
  if not found or v_form.status not in ('link_generated', 'sent') or v_form.expires_at < now() then
    raise exception 'legal_form_closed' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_person) <> 'object' or jsonb_typeof(p_contribution) <> 'object'
     or coalesce(cardinality(p_roles), 0) = 0 then
    raise exception 'legal_form_invalid' using errcode = 'P0001';
  end if;

  select coalesce(details, '{}') into v_known
    from public.contact_legal_details where contact_id = v_form.contact_id;
  v_known := coalesce(v_known, '{}');
  for v_key, v_value in select * from jsonb_each(p_person)
  loop
    if v_known ? v_key and v_known -> v_key <> v_value then
      v_corrections := v_corrections
        || jsonb_build_object(v_key, jsonb_build_object('before', v_known -> v_key, 'after', v_value));
    else
      v_new := v_new || jsonb_build_object(v_key, v_value);
    end if;
  end loop;

  insert into public.contact_legal_details (contact_id, organization_id, details, definition_version)
  values (v_form.contact_id, v_form.organization_id, v_new, p_version)
  on conflict (contact_id) do update
    set details = public.contact_legal_details.details || excluded.details,
        definition_version = excluded.definition_version,
        updated_at = now();
  -- Reach the person: the contact's own email and phone when it had none.
  update public.network_contacts
     set email = coalesce(email, nullif(p_person ->> 'email', '')),
         phone = coalesce(phone, nullif(p_person ->> 'phone', ''))
   where id = v_form.contact_id;

  insert into public.legal_form_submissions
    (organization_id, form_id, project_id, contact_id, roles, other_role, person, contribution,
     corrections, definition_version)
  values (v_form.organization_id, v_form.id, v_form.project_id, v_form.contact_id, p_roles,
          nullif(btrim(coalesce(p_other_role, '')), ''), p_person, p_contribution,
          v_corrections, p_version);

  v_status := case when v_corrections = '{}'::jsonb then 'complete' else 'action_required' end;
  update public.legal_forms
     set status = v_status, submitted_at = now(),
         completed_at = case when v_status = 'complete' then now() end
   where id = v_form.id;
  return v_status;
end;
$$;

revoke execute on function public.submit_legal_form(text, text[], text, jsonb, jsonb, integer)
  from public;
grant execute on function public.submit_legal_form(text, text[], text, jsonb, jsonb, integer)
  to anon, authenticated;

-- review_legal_form: the corrections of a submission, accepted (applied to
-- the person) or kept as they were; the form is complete either way.
create or replace function public.review_legal_form(p_form_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_form public.legal_forms%rowtype;
  v_corrections jsonb;
  v_key text;
  v_value jsonb;
begin
  select * into v_form from public.legal_forms where id = p_form_id for update;
  if not found
     or not public.has_permission(v_form.organization_id, 'manage_legal')
     or not public.can_see_project(v_form.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_form.status <> 'action_required' then
    raise exception 'legal_form_state_invalid' using errcode = 'P0001';
  end if;
  if p_accept then
    select corrections into v_corrections from public.legal_form_submissions
     where form_id = p_form_id order by created_at desc limit 1;
    for v_key, v_value in select * from jsonb_each(coalesce(v_corrections, '{}'))
    loop
      update public.contact_legal_details
         set details = details || jsonb_build_object(v_key, v_value -> 'after'),
             updated_at = now()
       where contact_id = v_form.contact_id;
    end loop;
  end if;
  update public.legal_forms set status = 'complete', completed_at = now() where id = p_form_id;
end;
$$;

revoke execute on function public.review_legal_form(uuid, boolean) from public, anon;
grant execute on function public.review_legal_form(uuid, boolean) to authenticated;
