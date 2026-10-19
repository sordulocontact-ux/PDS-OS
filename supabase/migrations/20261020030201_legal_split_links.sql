-- Juridique, « le reste » (docs/projet-complet/legal.md J4, proto « Projet complet », rule 19):
-- the private links of a split's confirmations stay visible in its step, as the fiches' do
-- (20261019090301): « Copier le lien », « Relancer », « Nouveau lien », « Révoquer l'accès »
-- with why, created / sent (by whom). The token is still only known by its hash
-- (token_hash, what /s/<token> checks); the server keeps it sealed (AES-256-GCM, key
-- LEGAL_LINK_KEY, never in the database nor the browser). A link carried to a new version
-- (JUR-27, propose_split_version) keeps its seal and when it was sent.

alter table public.legal_split_confirmations
  add column link_sealed text,
  add column sent_at timestamptz,
  add column sent_by uuid references public.people (id),
  add column revoked_by uuid references public.people (id),
  add column revoked_reason text;
alter table public.legal_split_confirmations add constraint legal_split_confirmations_link_sealed_check
  check (link_sealed is null or char_length(link_sealed) <= 1000);
alter table public.legal_split_confirmations add constraint legal_split_confirmations_revoked_reason_check
  check (revoked_reason is null
         or (btrim(revoked_reason) <> '' and char_length(revoked_reason) <= 1000));
grant select (link_sealed, sent_at, sent_by, revoked_by, revoked_reason)
  on public.legal_split_confirmations to authenticated;

-- The confirmation the caller may manage, locked (null when not).
create function public.split_confirmation_managed(p_confirmation_id uuid)
returns public.legal_split_confirmations
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.legal_split_confirmations%rowtype;
begin
  select c.* into v from public.legal_split_confirmations c
   where c.id = p_confirmation_id for update;
  if not found or public.auth_person_id() is null or not exists (
       select 1 from public.legal_split_versions sv
        where sv.id = v.version_id and public.can_manage_split_sheet(sv.sheet_id)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return v;
end;
$$;
revoke execute on function public.split_confirmation_managed(uuid) from public, anon, authenticated;

-- The sealed link of a confirmation just created (the server seals the token it got back).
create function public.seal_split_confirmation_link(p_confirmation_id uuid, p_sealed text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_split_confirmations%rowtype := public.split_confirmation_managed(p_confirmation_id);
begin
  if v.status <> 'pending' or v.link_sealed is not null then
    raise exception 'split_link_state_invalid' using errcode = 'P0001';
  end if;
  if p_sealed is null or char_length(p_sealed) > 1000 then
    raise exception 'split_link_invalid' using errcode = 'P0001';
  end if;
  update public.legal_split_confirmations set link_sealed = p_sealed where id = v.id;
end;
$$;

-- « Marquer comme envoyé »: PDS OS does not send the e-mail itself.
create function public.mark_split_confirmation_sent(p_confirmation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_split_confirmations%rowtype := public.split_confirmation_managed(p_confirmation_id);
begin
  if v.status <> 'pending' then
    raise exception 'split_link_state_invalid' using errcode = 'P0001';
  end if;
  update public.legal_split_confirmations
     set sent_at = now(), sent_by = public.auth_person_id()
   where id = v.id;
end;
$$;

-- « Révoquer l'accès », with why: the link stops working, what was answered stays.
create function public.revoke_split_confirmation(p_confirmation_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_split_confirmations%rowtype := public.split_confirmation_managed(p_confirmation_id);
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_reason is null then
    raise exception 'split_link_reason_required' using errcode = 'P0001';
  end if;
  if v.status <> 'pending' then
    raise exception 'split_link_state_invalid' using errcode = 'P0001';
  end if;
  update public.legal_split_confirmations
     set status = 'revoked', revoked_at = now(), revoked_by = public.auth_person_id(),
         revoked_reason = left(v_reason, 1000), link_sealed = null
   where id = v.id;
  perform public.log_split_event(v.organization_id, v.version_id,
                                 'split.confirmation_revoked', v.entry_id, left(v_reason, 1000));
  perform public.consolidate_split_version(v.version_id);
end;
$$;

-- A link carried to the new version (same token hash moved by propose_split_version) keeps
-- its seal and when it was sent: the person's link does not change.
create function public.legal_split_confirmations_carry_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_split_confirmations%rowtype;
begin
  if new.link_sealed is not null then
    return new;
  end if;
  select c.* into v from public.legal_split_confirmations c
   where c.organization_id = new.organization_id
     and c.entry_id <> new.entry_id
     and c.token_hash = encode(sha256(convert_to(new.token_hash || c.id::text, 'UTF8')), 'hex')
   limit 1;
  if found then
    new.link_sealed := v.link_sealed;
    new.sent_at := v.sent_at;
    new.sent_by := v.sent_by;
  end if;
  return new;
end;
$$;
revoke execute on function public.legal_split_confirmations_carry_link()
  from public, anon, authenticated;
create trigger a_carry_link before insert on public.legal_split_confirmations
  for each row execute function public.legal_split_confirmations_carry_link();

revoke execute on function public.seal_split_confirmation_link(uuid, text) from public, anon;
grant execute on function public.seal_split_confirmation_link(uuid, text) to authenticated;
revoke execute on function public.mark_split_confirmation_sent(uuid) from public, anon;
grant execute on function public.mark_split_confirmation_sent(uuid) to authenticated;
revoke execute on function public.revoke_split_confirmation(uuid, text) from public, anon;
grant execute on function public.revoke_split_confirmation(uuid, text) to authenticated;
