-- Master workflow, lot 4: the package sent to the mix engineer (ticket
-- "Workflow Master", § 8; docs/ARCHITECTURE.md § 8 septies).
--
-- The engineer is a contact of the Réseau, without an account: the package
-- reaches them through a private link, like the fiches de renseignements
-- (20261004004001_legal_forms.sql). Only the token's SHA-256 is stored; the
-- link is shown once, to the owner who sends it. The engineer opens it, gets
-- the files (links signed with the owner's session, as long as the link
-- lives), and confirms the reception.
--
-- One row per sending: a reminder sends a new link and the previous one is
-- revoked ("replaced"), so the history of sendings, reminders and the
-- reception stays. The package is a snapshot of what was sent.
--
-- Read: whoever sees the project. Written only through the functions below:
-- create (the project's owner), read and acknowledge by token (anyone with
-- the link, the token is the key). No service role (CLAUDE.md rule 3).

create table public.master_transmissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- Who it goes to: the mix engineer now, the mastering engineer later.
  role text not null,
  contact_id uuid not null,
  token_hash text not null,
  expires_at timestamptz not null,
  -- What was sent, as the engineer's page shows it.
  package jsonb not null,
  note text,
  acknowledged_at timestamptz,
  -- Set when a newer sending to the same role replaces it.
  revoked_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint master_transmissions_role_check check (role in ('mix', 'mastering')),
  constraint master_transmissions_token_key unique (token_hash),
  constraint master_transmissions_note_check
    check (note is null or (btrim(note) <> '' and char_length(note) <= 2000)),
  constraint master_transmissions_package_check check (jsonb_typeof(package) = 'object'),
  constraint master_transmissions_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade,
  constraint master_transmissions_contact_same_org
    foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id)
);

create index master_transmissions_project_idx
  on public.master_transmissions (project_id, role, created_at desc);
create index master_transmissions_contact_idx on public.master_transmissions (contact_id);

alter table public.master_transmissions enable row level security;
alter table public.master_transmissions force row level security;
revoke all on table public.master_transmissions from anon, authenticated;
grant select on table public.master_transmissions to authenticated;

create policy master_transmissions_select_visible on public.master_transmissions
  for select to authenticated
  using (public.can_see_project(project_id));

-- ---------------------------------------------------------------------------
-- A new notification: the engineer confirmed the reception
-- ---------------------------------------------------------------------------

-- The list of 20260929000201_file_versions_and_contracts.sql, plus the new
-- kind. NOT VALID: rows already there are not re-checked (local databases
-- may hold kinds of an abandoned branch); every new row is.
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'project_transmitted', 'project_accepted', 'project_refused',
  'project_clarification_requested', 'validation_requested', 'validation_approved',
  'validation_rejected', 'task_assigned', 'project_creative_added',
  'design_version_submitted', 'design_version_approved', 'design_version_changes_requested',
  'contract_review_requested', 'contract_approved', 'contract_changes_requested',
  'meeting_invited', 'master_transmission_received')) not valid;

-- ---------------------------------------------------------------------------
-- create_master_transmission (the project's owner)
-- ---------------------------------------------------------------------------
-- The recipient is the brief's engineer for that role (the mastering one is
-- the mix one when the same person does both): what is sent always matches
-- the brief. Any previous open link for the role is revoked; the new token
-- is returned once, never stored.
create or replace function public.create_master_transmission(
  p_project_id uuid,
  p_role text,
  p_package jsonb,
  p_note text
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_contact uuid;
  v_token text;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role not in ('mix', 'mastering') then
    raise exception 'invalid_role';
  end if;
  select b.organization_id,
         case when p_role = 'mix' or b.mastering_same_engineer then b.mix_contact_id
              else b.mastering_contact_id end
    into v_org, v_contact
    from public.master_briefs b
   where b.project_id = p_project_id;
  if v_contact is null then
    raise exception 'no_engineer';
  end if;

  update public.master_transmissions
     set revoked_at = now()
   where project_id = p_project_id and role = p_role and revoked_at is null;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.master_transmissions
    (organization_id, project_id, role, contact_id, token_hash, expires_at, package, note, created_by)
  values (v_org, p_project_id, p_role, v_contact,
          encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), now() + interval '30 days',
          p_package, nullif(btrim(p_note), ''), public.auth_person_id());
  return v_token;
end;
$$;

revoke execute on function public.create_master_transmission(uuid, text, jsonb, text)
  from public, anon;
grant execute on function public.create_master_transmission(uuid, text, jsonb, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- get_master_transmission (anyone with the link)
-- ---------------------------------------------------------------------------
-- Nothing for an unknown token; the state only for a replaced or expired
-- link; the package while it is open or received.
create or replace function public.get_master_transmission(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_row public.master_transmissions%rowtype;
  v_state text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select * into v_row from public.master_transmissions
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if not found then
    return null;
  end if;
  v_state := case
    when v_row.revoked_at is not null then 'replaced'
    when v_row.expires_at < now() then 'expired'
    when v_row.acknowledged_at is not null then 'received'
    else 'open' end;
  if v_state in ('replaced', 'expired') then
    return jsonb_build_object('state', v_state);
  end if;
  return jsonb_build_object(
    'state', v_state,
    'package', v_row.package,
    'note', v_row.note,
    'sentAt', v_row.created_at,
    'expiresAt', v_row.expires_at,
    'acknowledgedAt', v_row.acknowledged_at);
end;
$$;

revoke execute on function public.get_master_transmission(text) from public;
grant execute on function public.get_master_transmission(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- acknowledge_master_transmission (anyone with the link)
-- ---------------------------------------------------------------------------
-- "J'ai bien reçu le dossier": once, while the link is open; the sender is
-- notified. Returns the link's state after the call.
create or replace function public.acknowledge_master_transmission(p_token text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_transmissions%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return 'unknown';
  end if;
  select * into v_row from public.master_transmissions
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
   for update;
  if not found then
    return 'unknown';
  end if;
  if v_row.revoked_at is not null then
    return 'replaced';
  end if;
  if v_row.expires_at < now() then
    return 'expired';
  end if;
  if v_row.acknowledged_at is not null then
    return 'received';
  end if;

  update public.master_transmissions set acknowledged_at = now() where id = v_row.id;
  if v_row.created_by is not null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v_row.organization_id, v_row.created_by, null, 'master_transmission_received',
            v_row.project_id, v_row.id);
  end if;
  return 'received';
end;
$$;

revoke execute on function public.acknowledge_master_transmission(text) from public;
grant execute on function public.acknowledge_master_transmission(text) to anon, authenticated;
