-- Juridique, lot 9 J4 (proto « Projet complet », rule 19): a fiche's private link stays
-- visible in its démarche — Copier, Relancer, Nouveau lien, Révoquer with why —
-- with when it was created, sent and opened, and by whom. The token itself is still
-- only known by its hash (token_hash, what /f/<token> checks); the link is kept
-- sealed by the server (AES-256-GCM, key LEGAL_LINK_KEY, never in the database nor
-- the browser), so a database read alone never gives a usable link.

alter table public.legal_forms
  add column link_sealed text,
  add column sent_by uuid references public.people (id),
  add column revoked_by uuid references public.people (id),
  add column revoked_reason text;
alter table public.legal_forms add constraint legal_forms_link_sealed_check
  check (link_sealed is null or char_length(link_sealed) <= 1000);
alter table public.legal_forms add constraint legal_forms_revoked_reason_check
  check (revoked_reason is null or (btrim(revoked_reason) <> '' and char_length(revoked_reason) <= 1000));

-- The sealed link of a fiche just prepared (the server seals the token it got back).
create or replace function public.seal_legal_form_link(p_form_id uuid, p_sealed text)
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
  if v_form.status not in ('link_generated', 'sent') or v_form.link_sealed is not null then
    raise exception 'legal_form_state_invalid' using errcode = 'P0001';
  end if;
  if p_sealed is null or char_length(p_sealed) > 1000 then
    raise exception 'legal_form_link_invalid' using errcode = 'P0001';
  end if;
  update public.legal_forms set link_sealed = p_sealed where id = p_form_id;
end;
$$;

-- Same transitions as before; who sent and who revoked are now kept.
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
    update public.legal_forms
       set status = 'sent', sent_at = now(), sent_by = public.auth_person_id()
     where id = p_form_id;
  elsif p_state = 'revoked' and v_form.status in ('link_generated', 'sent', 'action_required') then
    update public.legal_forms
       set status = 'revoked', revoked_at = now(), revoked_by = public.auth_person_id(),
           link_sealed = null
     where id = p_form_id;
  else
    raise exception 'legal_form_state_invalid' using errcode = 'P0001';
  end if;
end;
$$;

-- « Révoquer l'accès », with why (proto: « Pourquoi vous révoquez l'accès * »).
create or replace function public.revoke_legal_form(p_form_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_reason is null then
    raise exception 'legal_form_reason_required' using errcode = 'P0001';
  end if;
  perform public.set_legal_form_state(p_form_id, 'revoked');
  update public.legal_forms set revoked_reason = left(v_reason, 1000) where id = p_form_id;
end;
$$;

revoke execute on function public.seal_legal_form_link(uuid, text) from public, anon;
grant execute on function public.seal_legal_form_link(uuid, text) to authenticated;
revoke execute on function public.set_legal_form_state(uuid, text) from public, anon;
grant execute on function public.set_legal_form_state(uuid, text) to authenticated;
revoke execute on function public.revoke_legal_form(uuid, text) from public, anon;
grant execute on function public.revoke_legal_form(uuid, text) to authenticated;
