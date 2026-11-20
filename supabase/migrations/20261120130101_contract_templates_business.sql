-- Contract templates and contracts, Ibé's meeting of 18/11/2026 (« Retours d'Ibé du 18/11
-- restants », lot B; docs/ARCHITECTURE.md § 8 quinquies and § 8 sexies):
--
-- 1. « Il faudrait que la personne qui valide soit le business manager » (55:19, 59:48): it
--    was the director because the position did not exist yet. The contracts sent, and their
--    returns, are « surtout » validated by the business manager; the director « peut
--    superviser » (1:19:45-1:20:21). A new permission, validate_contracts, held by the
--    general director and the business manager, replaces « validate » for:
--      - validating or refusing a template (set_contract_template_status);
--      - approving a contract or asking for changes (advance_contract 'approve' /
--        'request_changes'), and being told a contract or a template is to validate;
--      - reading what that needs: every template and its source file, every contract of the
--        organization (can_see_contract, contracts_select_visible).
--    Signing for PDS ('countersign') stays the direction's (« validate »): Ibé spoke of
--    validating, not of who signs for the company (docs/CONTEXTE-PROJET.md, point à trancher).
-- 2. « Par hasard ça marche en anglais ? … il faudrait sélectionner la langue du contrat »
--    (48:12-48:35): a template has a language, French or English, chosen when it is made.
--    A contract's language is its template's: choosing the template in the Juridique chooses
--    it. No clause is ever translated: an English template is an English document imported
--    by a human.

-- 1. The permission ------------------------------------------------------------------------
create or replace function public.role_permissions(p_role text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'general_director' then
      array['administer', 'assign_projects', 'validate', 'manage_catalog', 'create_projects',
            'view_all_projects', 'archive_records', 'read_feedback', 'manage_network',
            'manage_contracts', 'manage_legal', 'manage_sessions', 'read_artist_budgets',
            'manage_artist_budgets', 'read_finance', 'manage_finance', 'validate_contracts']
    when 'project_manager' then
      array['pilot_projects', 'manage_catalog', 'manage_network', 'manage_contracts',
            'manage_legal', 'manage_sessions', 'read_artist_budgets']
    when 'creative_director' then array['creative_work', 'manage_network']
    when 'business_manager' then array['negotiate', 'manage_network', 'read_artist_budgets',
                                        'open_deals', 'read_finance', 'manage_finance',
                                        'validate_contracts']
    when 'business' then array['negotiate', 'manage_network', 'read_finance', 'manage_finance']
    else array[]::text[]
  end;
$$;

-- 2. The language of a template ----------------------------------------------------------
alter table public.contract_templates
  add column language text not null default 'fr';
alter table public.contract_templates add constraint contract_templates_language_check
  check (language in ('fr', 'en'));
comment on column public.contract_templates.language is
  'The language the template is written in (fr, en), chosen by whoever imports it; a contract generated from it is in that language. Never translated by PO.';

-- 3. Who reads the templates and their source file ----------------------------------------
drop policy contract_templates_select_legal on public.contract_templates;
create policy contract_templates_select_legal on public.contract_templates
  for select to authenticated
  using (public.has_permission(organization_id, 'manage_legal')
         or public.has_permission(organization_id, 'manage_contracts')
         or public.has_permission(organization_id, 'validate_contracts'));

-- « Modifier » opens the source document; whoever validates may read it too.
drop policy contract_template_sources_select on storage.objects;
create policy contract_template_sources_select
  on storage.objects for select to authenticated
  using (bucket_id = 'contract-template-sources'
         and (public.has_permission(public.try_uuid((storage.foldername(objects.name))[1]),
                                    'manage_legal')
              or public.has_permission(public.try_uuid((storage.foldername(objects.name))[1]),
                                       'validate_contracts')));

-- 4. A template made with its language -----------------------------------------------------
drop function public.create_contract_template(uuid, uuid, text, text, text[], text, text, text, text);

create function public.create_contract_template(
  p_organization_id uuid,
  p_series_id uuid,
  p_name text,
  p_type text,
  p_roles text[],
  p_usage text,
  p_body text,
  p_source_path text default null,
  p_source_name text default null,
  p_language text default 'fr'
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
  v_path text := nullif(btrim(coalesce(p_source_path, '')), '');
begin
  if public.auth_person_id() is null
     or not public.has_permission(p_organization_id, 'manage_legal') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if coalesce(p_language, '') not in ('fr', 'en') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if v_path is not null and (
       split_part(v_path, '/', 1) <> p_organization_id::text
       or not exists (select 1 from storage.objects
                       where bucket_id = 'contract-template-sources' and name = v_path)) then
    raise exception 'template_source_invalid';
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
    (organization_id, series_id, version, name, type, roles, usage, body, fields,
     source_path, source_name, language)
  values (p_organization_id, v_series, v_version, btrim(p_name), p_type,
          (select array_agg(distinct r) from unnest(p_roles) r),
          nullif(btrim(coalesce(p_usage, '')), ''), p_body,
          public.contract_placeholders(p_body),
          v_path, case when v_path is null then null else left(btrim(p_source_name), 255) end,
          p_language)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.create_contract_template(uuid, uuid, text, text, text[], text, text, text, text, text)
  from public, anon;
grant execute on function public.create_contract_template(uuid, uuid, text, text, text[], text, text, text, text, text)
  to authenticated;

-- 5. Validating or refusing a template: validate_contracts --------------------------------
create or replace function public.set_contract_template_status(
  p_template_id uuid,
  p_status text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template public.contract_templates%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_validator boolean;
begin
  select * into v_template from public.contract_templates
   where id = p_template_id for update;
  if not found
     or not (public.has_permission(v_template.organization_id, 'manage_legal')
             or public.has_permission(v_template.organization_id, 'validate_contracts')) then
    raise exception 'template_not_found';
  end if;
  v_validator := public.has_permission(v_template.organization_id, 'validate_contracts');
  if p_status = 'validated' then
    if not v_validator then
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
    -- Refusing a draft is the validator's decision, and says why; any other retiring is
    -- the library's (manage_legal).
    if v_template.status = 'draft' and v_reason is not null then
      if not v_validator then raise exception 'forbidden' using errcode = '42501'; end if;
    elsif not public.has_permission(v_template.organization_id, 'manage_legal') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
    update public.contract_templates
       set status = 'retired', retired_at = now(),
           retired_reason = v_reason, retired_by = public.auth_person_id()
     where id = p_template_id;
  else
    raise exception 'template_wrong_status';
  end if;
end;
$$;

-- 6. Whoever validates sees every contract of the organization ----------------------------
create or replace function public.can_see_contract(p_contract_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.contracts c
     where c.id = p_contract_id
       and public.is_active_member(c.organization_id)
       and (c.owner_person_id = public.auth_person_id()
            or public.has_permission(c.organization_id, 'view_all_projects')
            or public.has_permission(c.organization_id, 'validate_contracts')
            or (c.project_id is not null and public.is_project_owner(c.project_id)))
  );
$$;

drop policy contracts_select_visible on public.contracts;
create policy contracts_select_visible on public.contracts
  for select to authenticated
  using (public.is_active_member(organization_id)
         and (owner_person_id = public.auth_person_id()
              or public.has_permission(organization_id, 'view_all_projects')
              or public.has_permission(organization_id, 'validate_contracts')
              or (project_id is not null and public.is_project_owner(project_id))));

-- 7. A contract is validated by validate_contracts; PDS still signs by the direction ------
create or replace function public.advance_contract(
  p_contract_id uuid,
  p_action text,
  p_comment text default null,
  p_signed_on date default null,
  p_checked boolean default false
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
  v_signer boolean;
  v_generated boolean;
  v_version integer;
  v_person uuid;
begin
  select * into v_contract from public.contracts where id = p_contract_id for update;
  if not found or not public.can_see_contract(p_contract_id) then
    raise exception 'contract_not_found';
  end if;

  v_editor := public.has_permission(v_contract.organization_id, 'manage_contracts')
              and (v_contract.owner_person_id = v_me
                   or public.has_permission(v_contract.organization_id, 'view_all_projects'));
  v_validator := public.has_permission(v_contract.organization_id, 'validate_contracts');
  v_signer := public.has_permission(v_contract.organization_id, 'validate');
  select max(version) into v_version from public.contract_documents
   where contract_id = p_contract_id;
  v_generated := v_version is not null;

  if p_action = 'submit' then
    if v_contract.status <> 'draft' then raise exception 'contract_wrong_status'; end if;
    if not (v_editor and v_contract.owner_person_id = v_me) then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    update public.contracts set status = 'in_review' where id = p_contract_id;
    -- The business manager is asked; the direction, who supervises, too.
    for v_person in
      select m.person_id from public.memberships m
        join public.accounts a on a.id = m.approved_account_id
       where m.organization_id = v_contract.organization_id
         and m.status = 'approved' and a.disabled_at is null
         and 'validate_contracts' = any (public.role_permissions(m.role))
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
    if not (v_editor and v_contract.owner_person_id = v_me) then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    if v_generated and v_comment is null then
      raise exception 'contract_send_proof_required';
    end if;
    update public.contracts set status = 'sent' where id = p_contract_id;
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id, 'signature.requested',
                                      v_comment);

  elsif p_action = 'countersign' then
    -- The person signs first, then PDS (Ibé, 07/11/2026), by the direction (JUR-11), on the
    -- latest version and that version only.
    if v_contract.status not in ('approved', 'sent') or v_contract.pds_signed_at is not null then
      raise exception 'contract_wrong_status';
    end if;
    if not v_signer then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    if v_generated and not exists (
      select 1 from public.contract_files f
       where f.contract_id = p_contract_id and f.category = 'signed'
         and f.created_at >= (select max(d.created_at) from public.contract_documents d
                               where d.contract_id = p_contract_id)
    ) then
      raise exception 'contract_not_returned';
    end if;
    if v_generated and not exists (
      select 1 from public.contract_files f
       where f.contract_id = p_contract_id and f.category = 'pds_signed'
         and f.created_at >= (select max(s.created_at) from public.contract_files s
                               where s.contract_id = p_contract_id and s.category = 'signed')
    ) then
      raise exception 'contract_pds_file_missing';
    end if;
    update public.contracts
       set pds_signed_by = v_me, pds_signed_at = now(), pds_signed_version = v_version
     where id = p_contract_id;
    perform public.notify(v_contract.organization_id, v_contract.owner_person_id,
                          'contract_approved', v_contract.project_id, p_contract_id);
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id, 'contract.countersigned',
                                      case when v_version is not null then 'v' || v_version end);

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
               where contract_id = p_contract_id and category = 'signed'
                 and via_contact_id is not null)
      or (exists (select 1 from public.contract_files
                   where contract_id = p_contract_id and category = 'signed')
          and exists (select 1 from public.contract_files
                       where contract_id = p_contract_id and category = 'evidence'))
    ) then
      raise exception 'contract_proof_missing';
    end if;
    if v_generated and (v_contract.pds_signed_at is null
                        or v_contract.pds_signed_version is distinct from v_version) then
      raise exception 'contract_countersign_missing';
    end if;
    if v_generated and p_checked is not true then
      raise exception 'contract_signature_unchecked';
    end if;
    update public.contracts
       set status = 'signed', signed_on = p_signed_on,
           signature_checked_by = case when v_generated then v_me end,
           signature_checked_at = case when v_generated then now() end
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

-- 8. A template asked from « Contrats à prévoir »: told to whoever validates --------------
create or replace function public.request_contract_template(
  p_template_id uuid, p_project_id uuid, p_key text, p_for text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.contract_templates%rowtype;
  v_person uuid;
begin
  select * into v from public.contract_templates where id = p_template_id for update;
  if not found
     or not public.has_permission(v.organization_id, 'manage_legal')
     or v.created_by is distinct from public.auth_person_id()
     or not public.can_see_project(p_project_id)
     or not exists (select 1 from public.projects p
                     where p.id = p_project_id and p.organization_id = v.organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.status <> 'draft' or v.requested_project_id is not null then
    raise exception 'template_wrong_status' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_key, '')), '') is null
     or nullif(btrim(coalesce(p_for, '')), '') is null then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  update public.contract_templates
     set requested_project_id = p_project_id,
         requested_key = left(btrim(p_key), 200),
         requested_for = left(btrim(p_for), 200)
   where id = p_template_id;
  for v_person in
    select m.person_id from public.memberships m
      join public.accounts a on a.id = m.approved_account_id
     where m.organization_id = v.organization_id
       and m.status = 'approved' and a.disabled_at is null
       and 'validate_contracts' = any (public.role_permissions(m.role))
  loop
    perform public.notify(v.organization_id, v_person, 'legal_template_to_validate',
                          p_project_id, p_template_id);
  end loop;
end;
$$;
