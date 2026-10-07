-- « Préparer la fiche » no longer links credits by name (audit of 06/10/2026,
-- docs/ARCHITECTURE.md § 8 sexies).
--
-- A credit is linked to its contact by contact_id, never by its name; the
-- only exception is the creation of a contact, which takes the unlinked
-- credits of its name (lib/network/link-credits.ts, retour du 05/10). The
-- first version of prepare_legal_form broke that rule twice:
--   * a person with an existing contact had their other, unlinked credits
--     of the same name linked to it, without anybody choosing it;
--   * a person without a contact got a new one even when the Réseau held a
--     namesake: a duplicate of, say, the mix engineer, who then lost his
--     history in the Master workflow ("Ingénieurs du Réseau").
-- Now: the credits are linked only to a contact created here, and a
-- namesake in the Réseau is refused (legal_form_namesake): the credit is
-- linked first with « Relier » on the État des lieux, a human decision.

create or replace function public.legal_name_key(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  -- As lib/utils/search.ts compares names: case, French accents, spaces
  -- and dashes ignored (no unaccent extension here).
  select regexp_replace(translate(lower(coalesce(p_name, '')),
           'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ', 'aaaaaaceeeeiiiinooooouuuuyyoa'),
           '[[:space:]-]+', '', 'g');
$$;

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
    if exists (select 1 from public.network_contacts n
                where n.organization_id = v_org and n.archived_at is null
                  and public.legal_name_key(n.name) = public.legal_name_key(p_name)) then
      raise exception 'legal_form_namesake' using errcode = 'P0001';
    end if;
    insert into public.network_contacts (organization_id, kind, name, roles, created_by)
    values (v_org, 'person', left(btrim(p_name), 200), p_network_roles, v_person)
    returning id into v_contact;
    -- A new contact takes the unlinked credits of its name, and only them.
    update public.master_contributors
       set contact_id = v_contact
     where id = any (coalesce(p_credit_ids, '{}')) and contact_id is null
       and public.legal_name_key(name) = public.legal_name_key(p_name);
  elsif not exists (
    select 1 from public.network_contacts where id = v_contact and organization_id = v_org
  ) then
    raise exception 'legal_form_contact_invalid' using errcode = 'P0001';
  end if;

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

revoke execute on function public.legal_name_key(text) from public, anon;
grant execute on function public.legal_name_key(text) to authenticated;
