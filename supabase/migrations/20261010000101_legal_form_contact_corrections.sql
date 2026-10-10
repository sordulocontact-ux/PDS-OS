-- A fiche de renseignements that corrects the Réseau's e-mail or phone is a
-- correction to review (UX test of 09/10/2026, docs/TEST-UX-2026-10-09-
-- PARCOURS-COMPLET.md § 1.3).
--
-- get_legal_form shows the person what PDS OS knows: the fiche's details
-- and the contact's e-mail and phone from the Réseau. submit_legal_form only
-- compared the answers with the fiche's details: a person who changed the
-- e-mail the Réseau held was taken as giving a new value, never as
-- correcting a known one. Nothing to accept or refuse, the Réseau kept the
-- old address, and the generated contract took the new one (the fiche's
-- value comes first in lib/legal/contracts/values.ts).
--
-- Now:
--   * the known values are the ones shown (same expression as
--     get_legal_form); a changed one is a correction, « Reçue, à vérifier »;
--   * a value equal but for spaces (or case, for an e-mail) is not a change;
--   * accepting a correction of the e-mail or phone also updates the Réseau,
--     so a single value is used everywhere; refusing keeps both as they were.

create or replace function public.legal_form_same_value(
  p_key text,
  p_before jsonb,
  p_after jsonb
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(p_before) = 'string' and jsonb_typeof(p_after) = 'string' then
      case when p_key = 'email'
        then lower(btrim(p_before #>> '{}')) = lower(btrim(p_after #>> '{}'))
        else btrim(p_before #>> '{}') = btrim(p_after #>> '{}')
      end
    else p_before = p_after
  end;
$$;

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

  -- What the person was shown as known (get_legal_form).
  select coalesce(d.details, '{}')
         || jsonb_strip_nulls(jsonb_build_object('email', c.email, 'phone', c.phone))
    into v_known
    from public.network_contacts c
    left join public.contact_legal_details d on d.contact_id = c.id
   where c.id = v_form.contact_id;
  v_known := coalesce(v_known, '{}');
  for v_key, v_value in select * from jsonb_each(p_person)
  loop
    if v_known ? v_key
       and not public.legal_form_same_value(v_key, v_known -> v_key, v_value) then
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
  -- Reach the person: the contact's own email and phone when it had none
  -- (a different one is a correction, applied only once accepted).
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
    -- One value everywhere: the Réseau follows an accepted e-mail or phone.
    update public.network_contacts
       set email = case when v_corrections ? 'email'
                         and btrim(v_corrections #>> '{email,after}') ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
                     then btrim(v_corrections #>> '{email,after}') else email end,
           phone = case when v_corrections ? 'phone'
                     then nullif(btrim(v_corrections #>> '{phone,after}'), '') else phone end
     where id = v_form.contact_id
       and (v_corrections ? 'email' or v_corrections ? 'phone');
  end if;
  update public.legal_forms set status = 'complete', completed_at = now() where id = p_form_id;
end;
$$;

revoke execute on function public.review_legal_form(uuid, boolean) from public, anon;
grant execute on function public.review_legal_form(uuid, boolean) to authenticated;
