-- Réseau (Sacha, 23/11/2026): « chaque personne dans le Réseau a une fiche
-- créée quand on crée la personne, et on peut trouver ce lien sur sa page ».
--
-- A « Réseau fiche » is a fiche de renseignements without a project
-- (legal_forms.project_id null), one per contact, person or structure:
--   * created by the database itself, AFTER INSERT on network_contacts, so
--     every way of creating a contact (Réseau form, PersonPickerField's
--     modal, PO's drafts, imports, prepare_legal_form…) gives one, and the
--     existing contacts get theirs below (backfill);
--   * its token is known by its SHA-256 (what /f/<token> checks, as every
--     fiche) and kept encrypted with the Vault key of the private links
--     (pgcrypto, master_link_key, 20261019080301), as project_contact_links
--     does, in legal_form_secrets, a table no role reads: only
--     network_contact_fiche decrypts it, for who may manage the fiche. No
--     LEGAL_LINK_KEY needed: sealing in SQL is what lets a trigger create it;
--   * it never expires (expires_at = infinity); « Nouveau lien » replaces it
--     (the former is revoked) when the link must change or the person must
--     update their answers;
--   * no roles from credits, no project-specific question: the roles to
--     tick come from the contact's Réseau roles, read when the page opens,
--     and a structure starts as a company with its name. The answers land in
--     contact_legal_details through the same submit_legal_form, so the
--     project fiches are pre-filled with them.
--
-- Who may read and manage it: whoever manages the Réseau AND reads the legal
-- details (manage_legal or manage_contracts, as contact_legal_details), and
-- reads the contact's coordinates (can_read_contact_details: a private
-- contact's link stays with its owner, the direction and its deals'
-- readers) — the link shows what is known of the person.

-- 1. The table: a fiche may have no project ---------------------------------------------

alter table public.legal_forms alter column project_id drop not null;
alter table public.legal_form_submissions alter column project_id drop not null;

-- One open Réseau fiche per contact.
create unique index legal_forms_network_open_key on public.legal_forms (contact_id)
  where project_id is null and status in ('link_generated', 'sent');
create index legal_forms_network_contact_idx on public.legal_forms (contact_id, created_at desc)
  where project_id is null;

-- The encrypted token of a Réseau fiche: never readable through the API.
create table public.legal_form_secrets (
  form_id uuid primary key references public.legal_forms (id) on delete cascade,
  token_secret bytea not null,
  created_at timestamptz not null default now()
);
alter table public.legal_form_secrets enable row level security;
alter table public.legal_form_secrets force row level security;
revoke all on table public.legal_form_secrets from anon, authenticated;

-- 2. Who may manage a contact's Réseau fiche ---------------------------------------------

create or replace function public.can_manage_contact_fiche(p_contact_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.network_contacts c
     where c.id = p_contact_id
       and public.has_permission(c.organization_id, 'manage_network')
       and (public.has_permission(c.organization_id, 'manage_legal')
            or public.has_permission(c.organization_id, 'manage_contracts'))
       and public.can_read_contact_details(c.id));
$$;
revoke execute on function public.can_manage_contact_fiche(uuid) from public, anon;
grant execute on function public.can_manage_contact_fiche(uuid) to authenticated;

create policy legal_forms_select_network on public.legal_forms
  for select to authenticated
  using (project_id is null and public.can_manage_contact_fiche(contact_id));
create policy legal_form_submissions_select_network on public.legal_form_submissions
  for select to authenticated
  using (project_id is null and public.can_manage_contact_fiche(contact_id));

-- 3. Issuing one (internal: the trigger, the backfill and the two functions below) --------

create or replace function public.issue_network_fiche(p_contact_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_token text;
  v_form uuid;
  v_secret bytea;
begin
  select organization_id into v_org from public.network_contacts where id = p_contact_id;
  if v_org is null then
    raise exception 'contact_not_found' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('network_fiche:' || p_contact_id::text, 0));
  -- The former open link stops working (a received fiche keeps its state).
  delete from public.legal_form_secrets s
   using public.legal_forms f
   where s.form_id = f.id and f.contact_id = p_contact_id and f.project_id is null
     and f.status in ('link_generated', 'sent');
  update public.legal_forms
     set status = 'revoked', revoked_at = now(), revoked_by = public.auth_person_id()
   where contact_id = p_contact_id and project_id is null
     and status in ('link_generated', 'sent');

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.legal_forms
    (organization_id, project_id, contact_id, token_hash, expires_at, definition_version,
     prefill, created_by)
  values (v_org, null, p_contact_id, encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
          'infinity', 2, '{}', public.auth_person_id())
  returning id into v_form;
  -- Without the Vault key the link is simply not kept (null): « Nouveau
  -- lien » then shows nothing to copy, the fiche still works.
  v_secret := extensions.pgp_sym_encrypt(v_token, public.master_link_key());
  if v_secret is not null then
    insert into public.legal_form_secrets (form_id, token_secret) values (v_form, v_secret);
  end if;
  return v_form;
end;
$$;
revoke execute on function public.issue_network_fiche(uuid) from public, anon, authenticated;

-- Every new contact gets its fiche. Never blocks the contact's creation.
create or replace function public.network_contacts_issue_fiche()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.archived_at is null then
    begin
      perform public.issue_network_fiche(new.id);
    exception when others then
      raise warning 'network_contacts_issue_fiche %: %', new.id, sqlerrm;
    end;
  end if;
  return null;
end;
$$;
revoke execute on function public.network_contacts_issue_fiche() from public, anon, authenticated;

create trigger z_issue_fiche after insert on public.network_contacts
  for each row execute function public.network_contacts_issue_fiche();

-- 4. Read, renew, mark sent (the contact's Réseau page) ------------------------------------

-- The contact's current Réseau fiche (the latest not revoked), with its link
-- decrypted; made now if it is missing (a contact archived, then restored).
-- Null for who may not manage it.
create or replace function public.network_contact_fiche(p_contact_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_form public.legal_forms%rowtype;
  v_archived timestamptz;
begin
  if not public.can_manage_contact_fiche(p_contact_id) then
    return null;
  end if;
  select archived_at into v_archived from public.network_contacts where id = p_contact_id;
  select * into v_form from public.legal_forms
   where contact_id = p_contact_id and project_id is null and status <> 'revoked'
   order by created_at desc limit 1;
  if not found then
    if v_archived is not null then
      return null;
    end if;
    perform public.issue_network_fiche(p_contact_id);
    select * into v_form from public.legal_forms
     where contact_id = p_contact_id and project_id is null and status <> 'revoked'
     order by created_at desc limit 1;
  end if;
  return jsonb_build_object(
    'id', v_form.id,
    'status', v_form.status,
    'sentAt', v_form.sent_at,
    'openedAt', v_form.opened_at,
    'submittedAt', v_form.submitted_at,
    'completedAt', v_form.completed_at,
    -- The link only while it can still be filled.
    'token', case when v_form.status in ('link_generated', 'sent') then
               (select extensions.pgp_sym_decrypt(s.token_secret, public.master_link_key())
                  from public.legal_form_secrets s where s.form_id = v_form.id) end);
end;
$$;
revoke execute on function public.network_contact_fiche(uuid) from public, anon;
grant execute on function public.network_contact_fiche(uuid) to authenticated;

-- « Nouveau lien »: the former open link stops working.
create or replace function public.renew_network_contact_fiche(p_contact_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_contact_fiche(p_contact_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if exists (select 1 from public.network_contacts
              where id = p_contact_id and archived_at is not null) then
    raise exception 'contact_archived' using errcode = 'P0001';
  end if;
  return public.issue_network_fiche(p_contact_id);
end;
$$;
revoke execute on function public.renew_network_contact_fiche(uuid) from public, anon;
grant execute on function public.renew_network_contact_fiche(uuid) to authenticated;

-- The link left (by e-mail from PDS OS, or by hand).
create or replace function public.mark_network_contact_fiche_sent(p_contact_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_contact_fiche(p_contact_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.legal_forms
     set status = 'sent', sent_at = now(), sent_by = public.auth_person_id()
   where contact_id = p_contact_id and project_id is null and status = 'link_generated';
end;
$$;
revoke execute on function public.mark_network_contact_fiche_sent(uuid) from public, anon;
grant execute on function public.mark_network_contact_fiche_sent(uuid) to authenticated;

-- 5. The public page: a fiche without a project ------------------------------------------

-- The roles to tick and what is known of a structure, for a Réseau fiche.
create or replace function public.network_fiche_prefill(p_contact_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'roles', coalesce((
      select jsonb_agg(distinct m.form_role)
        from unnest(c.roles) r (role)
        join (values ('artist', 'performer'), ('beatmaker', 'composer'),
                     ('musician', 'musician'), ('songwriter', 'author'),
                     ('engineer', 'provider'), ('producer', 'producer'),
                     ('art_director', 'provider'), ('videographer', 'provider'),
                     ('photographer', 'provider'), ('designer', 'provider'),
                     ('lawyer', 'lawyer'), ('label', 'label'), ('studio', 'studio'),
                     ('publisher', 'publisher'), ('production_company', 'producer'))
             as m (network_role, form_role) on m.network_role = r.role), '[]'::jsonb),
    'answers', case when c.kind = 'organization'
                    then jsonb_build_object('entity_type', 'company', 'company_name', c.name)
                    else '{}'::jsonb end)
    from public.network_contacts c
   where c.id = p_contact_id;
$$;
revoke execute on function public.network_fiche_prefill(uuid) from public, anon, authenticated;

-- Who asks: the project's owner; for a Réseau fiche, the organization only.
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
    left join public.projects p on p.id = p_form.project_id
    left join public.people pe on pe.id = p.owner_person_id
   where o.id = p_form.organization_id;
$$;
revoke execute on function public.legal_form_requester(public.legal_forms)
  from public, anon, authenticated;

-- As 20261024000101, the project now optional (null for a Réseau fiche).
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
      'prefill', case when v_form.project_id is null
                      then public.network_fiche_prefill(c.id) else v_form.prefill end,
      'missing', to_jsonb(coalesce(v_form.complement_fields, '{}')),
      'note', v_form.complement_note,
      'known', coalesce(d.details, '{}')
               || jsonb_strip_nulls(jsonb_build_object('email', c.email, 'phone', c.phone)))
      from public.network_contacts c
      left join public.projects p on p.id = v_form.project_id
      left join public.contact_legal_details d on d.contact_id = c.id
     where c.id = v_form.contact_id
  );
end;
$function$;

-- A Réseau fiche received notifies nobody (no project to open): its state
-- shows on the contact's page.
create or replace function public.legal_forms_notify_received()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.project_id is null then
    return null;
  end if;
  if old.submitted_at is null and new.submitted_at is not null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    select distinct new.organization_id, r.person_id, null::uuid, 'legal_form_received',
           new.project_id, new.id
      from (
        select new.created_by as person_id
        union
        select p.owner_person_id from public.projects p where p.id = new.project_id
      ) r
     where r.person_id is not null;
  end if;
  return null;
end;
$$;
revoke execute on function public.legal_forms_notify_received() from public, anon, authenticated;

-- 6. Deleting a contact takes its Réseau fiches with it -----------------------------------
-- (a project fiche still keeps it « in use », delete_records), whatever deletes it.

create or replace function public.network_contacts_drop_fiches()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.legal_forms where contact_id = old.id and project_id is null;
  return old;
end;
$$;
revoke execute on function public.network_contacts_drop_fiches() from public, anon, authenticated;

create trigger a_drop_fiches before delete on public.network_contacts
  for each row execute function public.network_contacts_drop_fiches();

-- 7. Backfill: every contact of the Réseau not archived ------------------------------------

do $$
declare
  v_contact uuid;
begin
  for v_contact in
    select c.id from public.network_contacts c
     where c.archived_at is null
       and not exists (select 1 from public.legal_forms f
                        where f.contact_id = c.id and f.project_id is null
                          and f.status <> 'revoked')
  loop
    perform public.issue_network_fiche(v_contact);
  end loop;
end;
$$;
