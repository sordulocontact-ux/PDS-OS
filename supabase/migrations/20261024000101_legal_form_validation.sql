-- Recette Juridique V1 d'Ibé (21/10/2026), JUR-06 : une fiche reçue n'est pas
-- automatiquement complète. Elle arrive « à vérifier » (action_required),
-- l'équipe la valide (complete) ou redemande ce qui manque ; la personne ne
-- voit alors, sur son lien privé, que ces champs-là.
--
-- - Reçue = action_required, avec ou sans corrections à vérifier ; validée =
--   complete, qui reste « c'est fait » pour tout ce qui en dépend (contrat,
--   répartition, coche du plan, État des lieux).
-- - Complément demandé : complement_fields / complement_note /
--   complement_requested_at, posés par request_legal_form_complement et
--   effacés par submit_legal_form_complement (le lien privé, sans compte).
-- - validated_by : qui a validé (completed_at reste la date).

alter table public.legal_forms
  add column complement_fields text[],
  add column complement_note text,
  add column complement_requested_at timestamptz,
  add column validated_by uuid references public.people (id),
  add constraint legal_forms_complement_note_length
    check (complement_note is null or char_length(complement_note) <= 2000),
  add constraint legal_forms_complement_fields_size
    check (complement_fields is null or cardinality(complement_fields) <= 30);

-- Envoi de la fiche : toujours « reçue, à vérifier ». ----------------------
create or replace function public._submit_legal_form_h(p_link_hash text, p_roles text[], p_other_role text, p_person jsonb, p_contribution jsonb, p_version integer)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_form public.legal_forms%rowtype;
  v_known jsonb;
  v_corrections jsonb := '{}';
  v_new jsonb := '{}';
  v_key text;
  v_value jsonb;
begin
  if p_link_hash is null then
    raise exception 'legal_form_closed' using errcode = 'P0001';
  end if;
  select * into v_form from public.legal_forms
   where token_hash = p_link_hash
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

  -- Received is not complete (JUR-06): the team checks it, then validates.
  update public.legal_forms
     set status = 'action_required', submitted_at = now(), completed_at = null
   where id = v_form.id;
  return 'action_required';
end;
$function$;

-- Validation par l'équipe : refusée tant qu'un complément est attendu. -----
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
  if v_form.complement_requested_at is not null then
    raise exception 'legal_form_complement_pending' using errcode = 'P0001';
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
    update public.network_contacts
       set email = case when v_corrections ? 'email'
                         and btrim(v_corrections #>> '{email,after}') ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
                     then btrim(v_corrections #>> '{email,after}') else email end,
           phone = case when v_corrections ? 'phone'
                     then nullif(btrim(v_corrections #>> '{phone,after}'), '') else phone end
     where id = v_form.contact_id
       and (v_corrections ? 'email' or v_corrections ? 'phone');
  end if;
  update public.legal_forms
     set status = 'complete', completed_at = now(), validated_by = public.auth_person_id()
   where id = p_form_id;
end;
$$;

-- Redemander ce qui manque (équipe). ----------------------------------------
create function public.request_legal_form_complement(p_form_id uuid, p_fields text[], p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_form public.legal_forms%rowtype;
  v_fields text[] := array(select distinct btrim(f) from unnest(coalesce(p_fields, '{}')) f
                            where btrim(f) ~ '^[a-z_]{1,40}$');
begin
  select * into v_form from public.legal_forms where id = p_form_id for update;
  if not found
     or not public.has_permission(v_form.organization_id, 'manage_legal')
     or not public.can_see_project(v_form.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_form.status <> 'action_required' or v_form.expires_at < now() then
    raise exception 'legal_form_state_invalid' using errcode = 'P0001';
  end if;
  if cardinality(v_fields) = 0 then
    raise exception 'legal_form_invalid' using errcode = 'P0001';
  end if;
  update public.legal_forms
     set complement_fields = v_fields,
         complement_note = left(nullif(btrim(coalesce(p_note, '')), ''), 2000),
         complement_requested_at = now()
   where id = p_form_id;
end;
$$;
revoke execute on function public.request_legal_form_complement(uuid, text[], text) from public, anon;
grant execute on function public.request_legal_form_complement(uuid, text[], text) to authenticated;

-- Le lien privé : « Il manque une information à votre fiche ». -------------
create or replace function public._get_legal_form_h(p_link_hash text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_form public.legal_forms%rowtype;
  v_state text;
begin
  if p_link_hash is null then
    return null;
  end if;
  select * into v_form from public.legal_forms
   where token_hash = p_link_hash;
  if not found then
    return null;
  end if;
  v_state := case
    when v_form.status = 'revoked' then 'revoked'
    when v_form.status = 'action_required' and v_form.complement_requested_at is not null
         and v_form.expires_at >= now() then 'complement'
    when v_form.status in ('complete', 'action_required') then 'submitted'
    when v_form.expires_at < now() then 'expired'
    else 'open' end;
  if v_state not in ('open', 'complement') then
    return jsonb_build_object('state', v_state,
                              'requester', public.legal_form_requester(v_form));
  end if;
  return (
    select jsonb_build_object(
      'state', v_state,
      'version', v_form.definition_version,
      'person', c.name,
      'project', p.title,
      'requester', public.legal_form_requester(v_form),
      'prefill', v_form.prefill,
      'missing', to_jsonb(coalesce(v_form.complement_fields, '{}')),
      'note', v_form.complement_note,
      'known', coalesce(d.details, '{}')
               || jsonb_strip_nulls(jsonb_build_object('email', c.email, 'phone', c.phone)))
      from public.network_contacts c
      join public.projects p on p.id = v_form.project_id
      left join public.contact_legal_details d on d.contact_id = c.id
     where c.id = v_form.contact_id
  );
end;
$function$;

create function public._submit_legal_form_complement_h(p_link_hash text, p_values jsonb)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_form public.legal_forms%rowtype;
  v_values jsonb := '{}';
  v_key text;
  v_value jsonb;
begin
  if p_link_hash is null then
    raise exception 'legal_form_closed' using errcode = 'P0001';
  end if;
  select * into v_form from public.legal_forms
   where token_hash = p_link_hash
   for update;
  if not found or v_form.status <> 'action_required'
     or v_form.complement_requested_at is null or v_form.expires_at < now() then
    raise exception 'legal_form_closed' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_values) <> 'object' then
    raise exception 'legal_form_invalid' using errcode = 'P0001';
  end if;
  -- Only what was asked, each value filled.
  for v_key, v_value in select * from jsonb_each(p_values)
  loop
    if v_key = any(v_form.complement_fields)
       and nullif(btrim(coalesce(v_value #>> '{}', '')), '') is not null then
      v_values := v_values || jsonb_build_object(v_key, to_jsonb(left(btrim(v_value #>> '{}'), 2000)));
    end if;
  end loop;
  if (select count(*) from jsonb_object_keys(v_values)) < cardinality(v_form.complement_fields) then
    raise exception 'legal_form_invalid' using errcode = 'P0001';
  end if;

  update public.legal_form_submissions
     set person = person || v_values
   where id = (select id from public.legal_form_submissions
                where form_id = v_form.id order by created_at desc limit 1);
  insert into public.contact_legal_details (contact_id, organization_id, details, definition_version)
  values (v_form.contact_id, v_form.organization_id, v_values, v_form.definition_version)
  on conflict (contact_id) do update
    set details = public.contact_legal_details.details || excluded.details,
        updated_at = now();
  update public.legal_forms
     set complement_fields = null, complement_note = null, complement_requested_at = null,
         submitted_at = now()
   where id = v_form.id;
  return 'action_required';
end;
$function$;
revoke execute on function public._submit_legal_form_complement_h(text, jsonb) from public, anon, authenticated;

create function public.submit_legal_form_complement(p_token text, p_values jsonb)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._submit_legal_form_complement_h(public.link_token_hash(p_token), p_values);
end;
$function$;
revoke execute on function public.submit_legal_form_complement(text, jsonb) from public;
grant execute on function public.submit_legal_form_complement(text, jsonb) to anon, authenticated;

create function public.submit_legal_form_complement(p_contact_token text, p_item_id uuid, p_values jsonb)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $function$
begin
  return public._submit_legal_form_complement_h(public.contact_item_hash('form', p_contact_token, p_item_id), p_values);
end;
$function$;
revoke execute on function public.submit_legal_form_complement(text, uuid, jsonb) from public;
grant execute on function public.submit_legal_form_complement(text, uuid, jsonb) to anon, authenticated;
