-- Contracts from templates, three follow-ups of ticket Juridique 03 asked by
-- Sacha on 07/10/2026:
--   1. « Dès que les prérequis d'un accord sont disponibles, PO duplique le
--      template compatible »: generation also runs without a click
--      (p_automatic), and the copy is followed by the project's owner.
--   2. « ContractTemplate : … fichier source »: a template keeps the file it
--      was imported from (Word, PDF, text), in a private bucket.
--   3. « contract.signed … peut débloquer Formalités »: a signed publishing
--      contract of a project ticks « La copie du contrat d'édition est
--      jointe » in the SACEM 725 bulletins still being prepared.

-- ---------------------------------------------------------------------------
-- 1. Generation, by a click or automatically.
-- ---------------------------------------------------------------------------

drop function public.generate_legal_contract(uuid, jsonb);

create or replace function public.generate_legal_contract(
  p_need_id uuid,
  p_fields jsonb,
  p_automatic boolean default false
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
  v_owner uuid;
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

  -- Whoever opened the page, the copy is the project owner's to follow
  -- (he submits it, the director validates it).
  select owner_person_id into v_owner from public.projects where id = v_need.project_id;
  select name into v_name from public.network_contacts where id = v_need.contact_id;
  insert into public.contracts
    (organization_id, title, type, status, project_id, owner_person_id)
  values (v_need.organization_id, left(v_template.name || ' — ' || v_name, 200),
          v_template.type, 'draft', v_need.project_id, coalesce(v_owner, v_me))
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
                                    v_template.name || ' v' || v_template.version
                                    || case when p_automatic then ' · automatique' else '' end);
  return v_contract;
end;
$$;

revoke execute on function public.generate_legal_contract(uuid, jsonb, boolean) from public, anon;
grant execute on function public.generate_legal_contract(uuid, jsonb, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. The source file of a template.
-- ---------------------------------------------------------------------------

alter table public.contract_templates
  add column source_path text,
  add column source_name text,
  add constraint contract_templates_source_check check (
    (source_path is null and source_name is null)
    or (char_length(source_path) between 1 and 500
        and char_length(btrim(source_name)) between 1 and 255));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contract-template-sources', 'contract-template-sources', false, 10485760, null)
on conflict (id) do nothing;

-- <organization>/<uuid>.<ext>: whoever writes templates (manage_legal).
create policy contract_template_sources_select
  on storage.objects for select to authenticated
  using (bucket_id = 'contract-template-sources'
         and public.has_permission(public.try_uuid((storage.foldername(objects.name))[1]),
                                   'manage_legal'));

create policy contract_template_sources_insert
  on storage.objects for insert to authenticated
  with check (bucket_id = 'contract-template-sources'
              and public.has_permission(public.try_uuid((storage.foldername(objects.name))[1]),
                                        'manage_legal'));

drop function public.create_contract_template(uuid, uuid, text, text, text[], text, text);

-- A new template, or a new version of one (p_series_id): nothing is ever
-- edited in place. The source file, when there is one, must be in the
-- organization's folder of the bucket.
create or replace function public.create_contract_template(
  p_organization_id uuid,
  p_series_id uuid,
  p_name text,
  p_type text,
  p_roles text[],
  p_usage text,
  p_body text,
  p_source_path text default null,
  p_source_name text default null
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
     source_path, source_name)
  values (p_organization_id, v_series, v_version, btrim(p_name), p_type,
          (select array_agg(distinct r) from unnest(p_roles) r),
          nullif(btrim(coalesce(p_usage, '')), ''), p_body,
          public.contract_placeholders(p_body),
          v_path, case when v_path is null then null else left(btrim(p_source_name), 255) end)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.create_contract_template(uuid, uuid, text, text, text[], text, text, text, text)
  from public, anon;
grant execute on function public.create_contract_template(uuid, uuid, text, text, text[], text, text, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 3. A signed publishing contract ticks the SACEM bulletins being prepared.
-- ---------------------------------------------------------------------------

alter table public.legal_formality_events drop constraint legal_formality_events_kind_check;
alter table public.legal_formality_events add constraint legal_formality_events_kind_check
  check (kind in (
    'formality.values_validated', 'formality.ready', 'document.generated',
    'signature.completed', 'formality.partial', 'formality.submitted', 'formality.processing',
    'formality.action_required', 'formality.completed', 'contract.signed'));

-- Before a bulletin is generated, the value is written (with the contract
-- as its source) and the formality settles; once a version exists, it is
-- not touched (its signatures would no longer match): the history says it.
create or replace function public.contracts_tick_formalities()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype;
  v_current jsonb;
begin
  if new.project_id is null or new.type <> 'publishing' then return new; end if;
  for v in
    select * from public.legal_formalities
     where project_id = new.project_id
       and definition_key = 'SACEM_725_EDITED_WORK'
       and status not in ('submitted', 'processing', 'completed')
     for update
  loop
    select value into v_current from public.legal_formality_values
     where formality_id = v.id and field_key = 'publishing_contract';
    continue when coalesce((v_current ->> 'provided')::boolean, false);
    if v.status in ('collecting_data', 'ready_to_generate')
       or (v.status = 'action_required' and 'publishing_contract' = any (v.reopened)) then
      insert into public.legal_formality_values
        (formality_id, field_key, organization_id, value, source, status,
         validated_by, validated_at)
      values (v.id, 'publishing_contract', v.organization_id,
              jsonb_build_object('provided', true, 'rubric_g', ''),
              left('Contrat signé : ' || new.title, 200), 'validated',
              public.auth_person_id(), now())
      on conflict (formality_id, field_key) do update
        set value = excluded.value, source = excluded.source, status = 'validated',
            validated_by = excluded.validated_by, validated_at = excluded.validated_at;
      update public.legal_formalities
         set reopened = array_remove(reopened, 'publishing_contract')
       where id = v.id;
      perform public.log_formality_event(v, 'contract.signed', new.title);
      perform public.formality_settle(v.id);
    else
      perform public.log_formality_event(
        v, 'contract.signed', new.title || ' (bulletin déjà généré : à joindre au dépôt)');
    end if;
  end loop;
  return new;
end;
$$;

revoke execute on function public.contracts_tick_formalities() from public, anon, authenticated;

create trigger z_tick_formalities after update of status on public.contracts
  for each row when (new.status = 'signed' and old.status is distinct from 'signed')
  execute function public.contracts_tick_formalities();
