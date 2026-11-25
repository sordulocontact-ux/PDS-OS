-- The typeface of a template, taken from its Word file (Sacha 25/11/2026: « récupérer la
-- typo du contrat »): an id of lib/legal/contracts/document-fonts.ts (Carlito for Calibri,
-- Tinos for Times New Roman…), null = the contracts' default look. The contracts made from
-- the template are printed in it.

alter table public.contract_templates
  add column font text check (font is null or font ~ '^[a-z0-9-]{1,40}$');

drop function public.create_contract_template(uuid, uuid, text, text, text[], text, text, text, text, text);

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
  p_language text default 'fr',
  p_font text default null
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
     source_path, source_name, language, font)
  values (p_organization_id, v_series, v_version, btrim(p_name), p_type,
          (select array_agg(distinct r) from unnest(p_roles) r),
          nullif(btrim(coalesce(p_usage, '')), ''), p_body,
          public.contract_placeholders(p_body),
          v_path, case when v_path is null then null else left(btrim(p_source_name), 255) end,
          p_language, nullif(btrim(coalesce(p_font, '')), ''))
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.create_contract_template(uuid, uuid, text, text, text[], text, text, text, text, text, text)
  from public, anon;
grant execute on function public.create_contract_template(uuid, uuid, text, text, text[], text, text, text, text, text, text)
  to authenticated;

-- The contract downloaded by the person it is for, by their link: in its template's typeface.
create or replace function public.get_contact_contract_document(p_contact_token text, p_contract_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.contracts%rowtype := public.contact_contract(p_contact_token, p_contract_id);
begin
  if v.id is null or v.status not in ('sent', 'signed') then
    return null;
  end if;
  return (select jsonb_build_object('title', v.title, 'version', d.version, 'body', d.body,
                                    'font', t.font)
            from public.contract_documents d
            left join public.contract_templates t on t.id = d.template_id
           where d.contract_id = v.id order by d.version desc limit 1);
end;
$$;
