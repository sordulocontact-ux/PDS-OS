-- Distribution: the delivery to the distributor and the release going
-- online, recorded by a person (UX test of 09/10/2026, « pas de fin de
-- parcours » : ni livraison au distributeur, ni passage « en ligne » à la
-- main ; docs/ARCHITECTURE.md § 8 octies).
--
-- Ticket Juridique 08 (Récap Sortie / Release Readiness), MVP: « La
-- validation finale précède l'action manuelle The Orchard » and « Aucune
-- intégration externe absente n'est présentée comme terminée ». So PDS OS
-- sends nothing: the delivery happens at the distributor's, by hand, and the
-- owner records it here once the release is ready (checks computed by code,
-- lib/release/delivery.ts). « Livré ne signifie pas Publié » (ticket
-- Production § 21): going online is a second fact, detected by the daily
-- cron (online_detected_at) or confirmed by the owner when the detection
-- cannot see it (a title not on the catalogues searched, Odesli closed).
--
-- Only the project's owner writes, through these functions (the columns are
-- not granted); everyone who sees the project reads them.

alter table public.releases
  add column delivered_on date,
  add column delivered_to_contact_id uuid,
  add column delivery_note text,
  add column delivery_recorded_by uuid references public.people (id),
  add column delivery_recorded_at timestamptz,
  add column online_confirmed_on date,
  add column online_confirmed_url text,
  add column online_confirmed_by uuid references public.people (id),
  add constraint releases_delivered_to_same_org
    foreign key (delivered_to_contact_id, organization_id)
    references public.network_contacts (id, organization_id),
  add constraint releases_delivery_complete check (
    (delivered_on is null) = (delivery_recorded_at is null)
    and (delivered_on is null or delivered_to_contact_id is not null)),
  add constraint releases_delivery_note_check
    check (delivery_note is null or char_length(delivery_note) <= 1000),
  -- Online by hand only once delivered.
  add constraint releases_online_after_delivery
    check (online_confirmed_on is null or delivered_on is not null),
  add constraint releases_online_url_check check (
    online_confirmed_url is null
    or (char_length(online_confirmed_url) <= 2048 and online_confirmed_url ~ '^https://\S+$'));

-- « Valider la livraison »: to whom (a distributor of the Réseau) and when.
create function public.record_release_delivery(
  p_release_id uuid,
  p_contact_id uuid,
  p_delivered_on date,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_release public.releases%rowtype;
begin
  select * into v_release from public.releases where id = p_release_id for update;
  if not found or not public.is_project_owner(v_release.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_release.delivered_on is not null then
    raise exception 'release_already_delivered' using errcode = 'P0001';
  end if;
  if p_delivered_on is null or p_delivered_on > current_date then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.network_contacts c
     where c.id = p_contact_id and c.organization_id = v_release.organization_id
       and c.archived_at is null) then
    raise exception 'release_distributor_invalid' using errcode = 'P0001';
  end if;
  update public.releases
     set delivered_on = p_delivered_on,
         delivered_to_contact_id = p_contact_id,
         delivery_note = nullif(btrim(coalesce(p_note, '')), ''),
         delivery_recorded_by = public.auth_person_id(),
         delivery_recorded_at = now(),
         updated_at = now()
   where id = p_release_id;
end;
$$;

-- « Rouvrir la livraison » (a file replaced, a mistake): refused once online.
create function public.reopen_release_delivery(p_release_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_release public.releases%rowtype;
begin
  select * into v_release from public.releases where id = p_release_id for update;
  if not found or not public.is_project_owner(v_release.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_release.online_detected_at is not null or v_release.online_confirmed_on is not null then
    raise exception 'release_online' using errcode = 'P0001';
  end if;
  update public.releases
     set delivered_on = null, delivered_to_contact_id = null, delivery_note = null,
         delivery_recorded_by = null, delivery_recorded_at = null, updated_at = now()
   where id = p_release_id;
end;
$$;

-- « Confirmer la mise en ligne »: the date and, if any, where it is heard.
create function public.confirm_release_online(
  p_release_id uuid,
  p_online_on date,
  p_url text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_release public.releases%rowtype;
begin
  select * into v_release from public.releases where id = p_release_id for update;
  if not found or not public.is_project_owner(v_release.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_release.delivered_on is null then
    raise exception 'release_not_delivered' using errcode = 'P0001';
  end if;
  if p_online_on is null or p_online_on > current_date or p_online_on < v_release.delivered_on then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  update public.releases
     set online_confirmed_on = p_online_on,
         online_confirmed_url = nullif(btrim(coalesce(p_url, '')), ''),
         online_confirmed_by = public.auth_person_id(),
         updated_at = now()
   where id = p_release_id;
end;
$$;

revoke execute on function public.record_release_delivery(uuid, uuid, date, text) from public, anon;
grant execute on function public.record_release_delivery(uuid, uuid, date, text) to authenticated;
revoke execute on function public.reopen_release_delivery(uuid) from public, anon;
grant execute on function public.reopen_release_delivery(uuid) to authenticated;
revoke execute on function public.confirm_release_online(uuid, date, text) from public, anon;
grant execute on function public.confirm_release_online(uuid, date, text) to authenticated;
