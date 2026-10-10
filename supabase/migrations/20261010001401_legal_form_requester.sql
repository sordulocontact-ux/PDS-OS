-- The fiche says who asks (UX test of 09/10/2026, section 5: the page /f/…
-- said neither which label asks, nor whom to write to). get_legal_form now
-- returns, for every known token, the requester: the organization's name and
-- the project's owner (name, and email when the people record has one).
-- Nothing else about the organization or the project leaves.

create or replace function public.legal_form_requester(p_form public.legal_forms)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
           'organization', o.name,
           'contact', nullif(btrim(concat_ws(' ', pe.first_name, pe.last_name)), ''),
           'email', pe.email))
    from public.organizations o
    join public.projects p on p.id = p_form.project_id
    left join public.people pe on pe.id = p.owner_person_id
   where o.id = p_form.organization_id;
$$;

revoke execute on function public.legal_form_requester(public.legal_forms)
  from public, anon, authenticated;

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
    return jsonb_build_object('state', v_state,
                              'requester', public.legal_form_requester(v_form));
  end if;
  return (
    select jsonb_build_object(
      'state', 'open',
      'version', v_form.definition_version,
      'person', c.name,
      'project', p.title,
      'requester', public.legal_form_requester(v_form),
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
