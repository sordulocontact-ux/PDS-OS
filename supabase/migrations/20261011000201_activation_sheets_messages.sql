-- Marketing › Activations, shared by Influence and RP (tickets « Influence » and
-- « Relations presse », docs/ARCHITECTURE.md § 8 duodecies) :
--   1. Réseau : « influencer » and « journalist » roles, and dated observations
--      (audience, known rate…) that never overwrite each other (« Une audience
--      de 328 000 abonnés à une date et 450 000 à une autre produit deux
--      snapshots ») ;
--   2. activation sheets : a versioned, validated set of fields — the
--      framing of a campaign (Influence entry, cadrage RP) and the concepts
--      of an influence campaign (generic, then one per influencer). Fields
--      are checked by the app (lib/activations/sheets.ts), each with its
--      provenance ; a change after validation opens a new version ;
--   3. messages : a brief, a proposal reply, a pitch, a follow-up, the recap
--      to an agency. Brouillon → À valider → Validé → Envoi déclaré, never sent
--      by PDS OS ; « Envoi prouvé » = a declared send with its proof.

-- 1. Réseau ----------------------------------------------------------------------------------

alter table public.network_contacts drop constraint network_contacts_roles_check;
alter table public.network_contacts
  add constraint network_contacts_roles_check
    check (cardinality(roles) between 1 and 8
           and roles <@ array['artist', 'beatmaker', 'musician', 'songwriter', 'engineer',
                              'producer', 'art_director', 'videographer', 'photographer',
                              'designer', 'provider', 'studio', 'lawyer', 'partner', 'label',
                              'publisher', 'distributor', 'media', 'journalist', 'influencer',
                              'manager', 'other']::text[]);

create table public.network_observations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  contact_id uuid not null,
  -- followers, engagement_rate, rate (a known fee), category (Micro, Macro…).
  kind text not null,
  platform text,
  value numeric(16, 4),
  text_value text,
  -- count, percent, eur.
  unit text,
  observed_on date not null,
  -- agency, creator, internal, platform, independent.
  source text not null,
  -- The campaign it was read in, when there is one.
  activation_id uuid,
  note text,
  invalidated_at timestamptz,
  invalidated_by uuid references public.people (id),
  invalidation_reason text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint network_observations_kind_check
    check (kind in ('followers', 'engagement_rate', 'rate', 'category')),
  constraint network_observations_value_check check (
    (kind = 'category') = (text_value is not null and value is null)
    and (value is null or value >= 0)
    and (text_value is null or (btrim(text_value) <> '' and char_length(text_value) <= 80))),
  constraint network_observations_unit_check check (
    (kind = 'category') = (unit is null)
    and (unit is null or unit in ('count', 'percent', 'eur'))),
  constraint network_observations_platform_check
    check (platform is null or (btrim(platform) <> '' and char_length(platform) <= 60)),
  constraint network_observations_source_check check (source in (
    'agency', 'creator', 'internal', 'platform', 'independent')),
  constraint network_observations_note_check check (note is null or char_length(note) <= 500),
  constraint network_observations_invalidated_check check (
    (invalidated_at is null) = (invalidation_reason is null)),
  constraint network_observations_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id) on delete cascade,
  constraint network_observations_activation_same_org foreign key (activation_id, organization_id)
    references public.marketing_activations (id, organization_id) on delete set null (activation_id)
);
create index network_observations_contact_idx
  on public.network_observations (contact_id, observed_on desc);
create trigger a_set_created_by before insert on public.network_observations
  for each row execute function public.set_created_by();

-- Append-only : only the invalidation changes, stamped here.
create or replace function public.network_observations_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.invalidated_at := null;
    new.invalidated_by := null;
    new.invalidation_reason := null;
    return new;
  end if;
  if old.invalidated_at is not null or new.invalidation_reason is null
     or btrim(new.invalidation_reason) = '' then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  new.invalidated_at := now();
  new.invalidated_by := public.auth_person_id();
  return new;
end;
$$;
revoke execute on function public.network_observations_guard() from public, anon, authenticated;
create trigger b_guard before insert or update on public.network_observations
  for each row execute function public.network_observations_guard();

alter table public.network_observations enable row level security;
alter table public.network_observations force row level security;
revoke all on table public.network_observations from anon, authenticated;
grant select on public.network_observations to authenticated;
grant insert (organization_id, contact_id, kind, platform, value, text_value, unit, observed_on,
              source, activation_id, note)
  on public.network_observations to authenticated;
grant update (invalidation_reason) on public.network_observations to authenticated;
create policy network_observations_select on public.network_observations
  for select to authenticated using (public.is_active_member(organization_id));
-- The Réseau's writers, or the writer of the campaign it comes from.
create policy network_observations_insert on public.network_observations
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_network')
              or (activation_id is not null and public.activation_can_write(activation_id)));
create policy network_observations_update on public.network_observations
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_network'))
  with check (public.has_permission(organization_id, 'manage_network'));

-- 2. Activation sheets (framing, concepts) ------------------------------------------------

create table public.activation_sheets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  -- framing = cadrage de la campagne ; concept = concept (target_id null :
  -- générique ; sinon la déclinaison pour un influenceur).
  kind text not null,
  target_id uuid,
  version integer not null,
  -- { "<field>": { "value": "…", "source": "strategy:positioning" | "manual" } }
  fields jsonb not null default '{}'::jsonb,
  -- draft, to_validate, validated, changes_requested, refused.
  status text not null default 'draft',
  submitted_by uuid references public.people (id),
  submitted_at timestamptz,
  decided_by uuid references public.people (id),
  decided_at timestamptz,
  decision_comment text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activation_sheets_kind_check check (kind in ('framing', 'concept')),
  constraint activation_sheets_target_check check (kind = 'concept' or target_id is null),
  constraint activation_sheets_version_check check (version >= 1),
  constraint activation_sheets_fields_check
    check (jsonb_typeof(fields) = 'object' and pg_column_size(fields) <= 65536),
  constraint activation_sheets_status_check check (status in (
    'draft', 'to_validate', 'validated', 'changes_requested', 'refused')),
  constraint activation_sheets_comment_check
    check (decision_comment is null or char_length(decision_comment) <= 2000),
  constraint activation_sheets_activation_same_org foreign key (activation_id, organization_id)
    references public.marketing_activations (id, organization_id) on delete cascade,
  constraint activation_sheets_target_same_org foreign key (target_id, organization_id)
    references public.activation_targets (id, organization_id) on delete cascade
);
create unique index activation_sheets_version_key on public.activation_sheets
  (activation_id, kind, coalesce(target_id, '00000000-0000-0000-0000-000000000000'::uuid), version);
create trigger a_set_updated_at before update on public.activation_sheets
  for each row execute function public.set_updated_at();

alter table public.activation_sheets enable row level security;
alter table public.activation_sheets force row level security;
revoke all on table public.activation_sheets from anon, authenticated;
-- Written by the functions below only.
grant select on public.activation_sheets to authenticated;
create policy activation_sheets_select on public.activation_sheets
  for select to authenticated using (public.can_see_project(project_id));

-- Saves the fields of the current version : a draft or a version sent back
-- is edited in place ; a validated or refused one, or one waiting for its
-- decision, gets a new version (« Toute modification substantielle après
-- validation ouvre une nouvelle version à valider »). Returns its id.
create or replace function public.save_activation_sheet(
  p_activation_id uuid, p_kind text, p_target_id uuid, p_fields jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_activation public.marketing_activations%rowtype;
  v_current public.activation_sheets%rowtype;
  v_id uuid;
begin
  select * into v_activation from public.marketing_activations where id = p_activation_id;
  if not found or not public.can_see_project(v_activation.project_id) then
    raise exception 'activation_not_found';
  end if;
  if not public.activation_can_write(p_activation_id) or v_activation.status = 'closed' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_kind not in ('framing', 'concept') or (p_kind = 'framing' and p_target_id is not null)
     or p_fields is null or jsonb_typeof(p_fields) <> 'object' then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if p_target_id is not null and not exists (
    select 1 from public.activation_targets t
     where t.id = p_target_id and t.activation_id = p_activation_id) then
    raise exception 'target_not_in_activation' using errcode = '23514';
  end if;
  select * into v_current from public.activation_sheets
   where activation_id = p_activation_id and kind = p_kind
     and target_id is not distinct from p_target_id
   order by version desc limit 1 for update;
  if found and v_current.status in ('draft', 'changes_requested') then
    update public.activation_sheets set fields = p_fields where id = v_current.id;
    v_id := v_current.id;
  else
    insert into public.activation_sheets
      (organization_id, project_id, activation_id, kind, target_id, version, fields, created_by)
    values (v_activation.organization_id, v_activation.project_id, p_activation_id, p_kind,
            p_target_id, coalesce(v_current.version, 0) + 1, p_fields, public.auth_person_id())
    returning id into v_id;
    perform public.log_activation_event(p_activation_id, 'sheet.version', v_id, null,
      jsonb_build_object('kind', p_kind, 'version', coalesce(v_current.version, 0) + 1), null);
  end if;
  return v_id;
end;
$$;
revoke execute on function public.save_activation_sheet(uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.save_activation_sheet(uuid, text, uuid, jsonb) to authenticated;

-- « Soumettre » (writer) and the decision (validator) : Valider, Demander des
-- corrections (comment required), Refuser (comment required). « L'absence de
-- commentaire ne vaut pas validation » : only an explicit decision closes it.
create or replace function public.decide_activation_sheet(
  p_sheet_id uuid, p_action text, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.activation_sheets%rowtype;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  select * into v from public.activation_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if p_action = 'submit' then
    if not public.activation_can_write(v.activation_id) then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
    if v.status not in ('draft', 'changes_requested') then
      raise exception 'invalid_transition';
    end if;
    update public.activation_sheets
       set status = 'to_validate', submitted_by = public.auth_person_id(), submitted_at = now(),
           decided_by = null, decided_at = null, decision_comment = null
     where id = v.id;
  elsif p_action in ('validate', 'request_changes', 'refuse') then
    if not public.marketing_can_validate(v.project_id) then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
    if v.status <> 'to_validate' then raise exception 'invalid_transition'; end if;
    if p_action <> 'validate' and v_comment is null then
      raise exception 'comment_required' using errcode = '23514';
    end if;
    update public.activation_sheets
       set status = case p_action when 'validate' then 'validated'
                                  when 'refuse' then 'refused' else 'changes_requested' end,
           decided_by = public.auth_person_id(), decided_at = now(),
           decision_comment = left(v_comment, 2000)
     where id = v.id;
  else
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  perform public.log_activation_event(v.activation_id, 'sheet.' || p_action, v.id, null,
    jsonb_build_object('kind', v.kind, 'version', v.version), v_comment);
end;
$$;
revoke execute on function public.decide_activation_sheet(uuid, text, text) from public, anon;
grant execute on function public.decide_activation_sheet(uuid, text, text) to authenticated;

-- 3. Messages --------------------------------------------------------------------------------

create table public.activation_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  target_id uuid,
  -- brief, proposal (réponse de négociation), pitch (message presse),
  -- follow_up (relance), agency_recap (retour à l'agence), other.
  kind text not null,
  subject text,
  body text not null,
  -- email, dm, phone, other.
  channel text not null default 'email',
  -- RP : the version of the Dossier de presse joined (strategy_documents).
  press_kit_document_id uuid,
  -- A follow-up's planned date.
  due_on date,
  -- « Le système évite les relances après refus… sauf dérogation motivée ».
  derogation_reason text,
  -- draft, to_validate, validated, sent_declared, cancelled.
  status text not null default 'draft',
  review_comment text,
  validated_by uuid references public.people (id),
  validated_at timestamptz,
  sent_declared_by uuid references public.people (id),
  sent_declared_at timestamptz,
  -- When it was actually sent, as declared, and its proof (« Envoi prouvé »).
  sent_on date,
  sent_proof_url text,
  sent_note text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activation_messages_kind_check check (kind in (
    'brief', 'proposal', 'pitch', 'follow_up', 'agency_recap', 'other')),
  constraint activation_messages_subject_check
    check (subject is null or char_length(subject) <= 300),
  constraint activation_messages_body_check
    check (btrim(body) <> '' and char_length(body) <= 20000),
  constraint activation_messages_channel_check
    check (channel in ('email', 'dm', 'phone', 'other')),
  constraint activation_messages_derogation_check
    check (derogation_reason is null or (btrim(derogation_reason) <> ''
                                         and char_length(derogation_reason) <= 1000)),
  constraint activation_messages_status_check check (status in (
    'draft', 'to_validate', 'validated', 'sent_declared', 'cancelled')),
  constraint activation_messages_review_check
    check (review_comment is null or char_length(review_comment) <= 2000),
  constraint activation_messages_sent_check check (
    (status = 'sent_declared') = (sent_declared_at is not null)),
  constraint activation_messages_proof_check
    check (sent_proof_url is null or (char_length(sent_proof_url) <= 2000
                                      and sent_proof_url ~ '^https?://\S+$')),
  constraint activation_messages_note_check
    check (sent_note is null or char_length(sent_note) <= 1000),
  constraint activation_messages_activation_same_org foreign key (activation_id, organization_id)
    references public.marketing_activations (id, organization_id) on delete cascade,
  constraint activation_messages_target_same_org foreign key (target_id, organization_id)
    references public.activation_targets (id, organization_id) on delete cascade
);
create index activation_messages_activation_idx
  on public.activation_messages (activation_id, created_at);
create trigger a_fill before insert on public.activation_messages
  for each row execute function public.activation_child_fill();
create trigger a_set_created_by before insert on public.activation_messages
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.activation_messages
  for each row execute function public.set_updated_at();

-- Created as a draft ; its text changes only while it is a draft ; the status
-- moves only through advance_activation_message.
create or replace function public.activation_messages_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then raise exception 'invalid_input' using errcode = '23514'; end if;
    if new.target_id is not null and not exists (
      select 1 from public.activation_targets t
       where t.id = new.target_id and t.activation_id = new.activation_id) then
      raise exception 'target_not_in_activation' using errcode = '23514';
    end if;
    return new;
  end if;
  if current_setting('pds.activation_message', true) is distinct from 'on' then
    if new.status is distinct from old.status then
      raise exception 'use_advance_activation_message' using errcode = '42501';
    end if;
    if old.status <> 'draft' then
      raise exception 'message_not_draft' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.activation_messages_guard() from public, anon, authenticated;
create trigger b_guard before insert or update on public.activation_messages
  for each row execute function public.activation_messages_guard();

alter table public.activation_messages enable row level security;
alter table public.activation_messages force row level security;
revoke all on table public.activation_messages from anon, authenticated;
grant select on public.activation_messages to authenticated;
grant insert (organization_id, project_id, activation_id, target_id, kind, subject, body, channel,
              press_kit_document_id,
              due_on, derogation_reason)
  on public.activation_messages to authenticated;
grant update (subject, body, channel, press_kit_document_id, due_on, derogation_reason)
  on public.activation_messages to authenticated;
create policy activation_messages_select on public.activation_messages
  for select to authenticated using (public.can_see_project(project_id));
create policy activation_messages_insert on public.activation_messages
  for insert to authenticated with check (public.activation_can_write(activation_id));
create policy activation_messages_update on public.activation_messages
  for update to authenticated
  using (public.activation_can_write(activation_id))
  with check (public.activation_can_write(activation_id));

-- submit (draft → to_validate), validate, request_changes (back to draft,
-- comment required), declare_sent (validated → sent_declared, with the date,
-- an optional proof and note ; « PO ne doit jamais marquer automatiquement un
-- message comme envoyé après simple validation »), cancel.
create or replace function public.advance_activation_message(
  p_message_id uuid, p_action text, p_comment text, p_sent_on date, p_proof_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.activation_messages%rowtype;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_proof text := nullif(btrim(coalesce(p_proof_url, '')), '');
begin
  select * into v from public.activation_messages where id = p_message_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'message_not_found';
  end if;
  if not public.activation_can_write(v.activation_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  perform set_config('pds.activation_message', 'on', true);
  case p_action
    when 'submit' then
      if v.status <> 'draft' then raise exception 'invalid_transition'; end if;
      update public.activation_messages set status = 'to_validate', review_comment = null
       where id = v.id;
    when 'validate' then
      if v.status not in ('draft', 'to_validate') then raise exception 'invalid_transition'; end if;
      update public.activation_messages
         set status = 'validated', validated_by = public.auth_person_id(), validated_at = now()
       where id = v.id;
    when 'request_changes' then
      if v.status <> 'to_validate' then raise exception 'invalid_transition'; end if;
      if v_comment is null then raise exception 'comment_required' using errcode = '23514'; end if;
      update public.activation_messages set status = 'draft', review_comment = left(v_comment, 2000)
       where id = v.id;
    when 'declare_sent' then
      if v.status <> 'validated' then raise exception 'invalid_transition'; end if;
      if p_sent_on is null or p_sent_on > current_date then
        raise exception 'invalid_input' using errcode = '23514';
      end if;
      update public.activation_messages
         set status = 'sent_declared', sent_declared_by = public.auth_person_id(),
             sent_declared_at = now(), sent_on = p_sent_on, sent_proof_url = v_proof,
             sent_note = left(v_comment, 1000)
       where id = v.id;
    when 'cancel' then
      if v.status in ('sent_declared', 'cancelled') then raise exception 'invalid_transition'; end if;
      update public.activation_messages set status = 'cancelled' where id = v.id;
    else
      raise exception 'invalid_input' using errcode = '23514';
  end case;
  perform set_config('pds.activation_message', 'off', true);
  perform public.log_activation_event(v.activation_id, 'message.' || p_action, v.id, null,
    jsonb_build_object('kind', v.kind, 'target', v.target_id), v_comment);
end;
$$;
revoke execute on function public.advance_activation_message(uuid, text, text, date, text)
  from public, anon;
grant execute on function public.advance_activation_message(uuid, text, text, date, text)
  to authenticated;
