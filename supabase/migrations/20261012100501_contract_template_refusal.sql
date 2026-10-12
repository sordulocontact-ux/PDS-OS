-- JUR-19 (retours Juridique du 11/10/2026, docs/ARCHITECTURE.md § 8 sexies,
-- « Contrats depuis des modèles »): a draft template can be refused by the
-- director with its reason, kept with the version and shown on its page;
-- retiring a template may say why too. Who did it and when are written
-- here, never by the client.

alter table public.contract_templates
  add column retired_reason text,
  add column retired_by uuid references public.people (id);
alter table public.contract_templates add constraint contract_templates_retired_reason_check
  check (retired_reason is null or (btrim(retired_reason) <> '' and char_length(retired_reason) <= 2000));

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
    -- Refusing a draft is the director's decision, and says why.
    if v_template.status = 'draft' and v_reason is not null
       and not public.has_permission(v_template.organization_id, 'validate') then
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
revoke execute on function public.set_contract_template_status(uuid, text, text) from public, anon;
grant execute on function public.set_contract_template_status(uuid, text, text) to authenticated;

-- The two-argument form stays for existing callers: no reason.
create or replace function public.set_contract_template_status(
  p_template_id uuid,
  p_status text
)
returns void
language sql
security definer
set search_path = ''
as $$
  select public.set_contract_template_status(p_template_id, p_status, null);
$$;
