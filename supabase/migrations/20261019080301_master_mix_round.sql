-- Master, Mixage and Mastering rounds (docs/projet-complet/master.md § 3 to
-- § 5, sub-lots M5 to M7; proto `master-v2.html`):
--
-- 1. The private link stays visible to the project's owner (VISION-UX rule
--    19): its token is kept encrypted (pgcrypto, key in Vault), read back by
--    master_transmission_link for the owner only; the hash still opens it.
-- 2. Sending without stems needs a written reason (proto: « Pourquoi envoyer
--    quand même * »), kept in derogations.withoutStemsReason; waiting for
--    the final vocals refuses the mix sending ('vocals_awaited').
-- 3. « Prendre en charge le dossier » on the link, with the rate confirmed
--    or proposed: the budget line of the role becomes « proposed » (it does
--    not count until accepted), the owner is told; « Accepter le tarif » by
--    the owner commits it.
-- 4. « Demander une modification » always says what to change (rule 6).
-- 5. « Rouvrir le mix » by the owner, with its reason, while the mastering
--    has not left: the decision is replaced, never erased (decision
--    'reopened', reopened_*), the engineer may deposit again.

-- 1 --------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'master_link_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'),
                                'master_link_key',
                                'Encrypts the private links of the Master (owner can read them back)');
  end if;
end;
$$;

alter table public.master_transmissions
  add column token_secret bytea,
  add column proposed_mix_cents bigint,
  add column proposed_mastering_cents bigint,
  add constraint master_transmissions_proposed_check check (
    (proposed_mix_cents is null or proposed_mix_cents between 0 and 100000000)
    and (proposed_mastering_cents is null or proposed_mastering_cents between 0 and 100000000));

create or replace function public.master_link_key()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'master_link_key' limit 1;
$$;
revoke execute on function public.master_link_key() from public, anon, authenticated;

-- The link of a sending, for its project's owner only (null otherwise).
create or replace function public.master_transmission_link(p_transmission_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_row public.master_transmissions%rowtype;
begin
  select * into v_row from public.master_transmissions where id = p_transmission_id;
  if not found or not public.is_project_owner(v_row.project_id)
     or v_row.token_secret is null then
    return null;
  end if;
  return extensions.pgp_sym_decrypt(v_row.token_secret, public.master_link_key());
end;
$$;
revoke execute on function public.master_transmission_link(uuid) from public, anon;
grant execute on function public.master_transmission_link(uuid) to authenticated;

-- 2 --------------------------------------------------------------------------
create or replace function public.create_master_transmission(
  p_project_id uuid, p_role text, p_package jsonb, p_note text,
  p_expires_at timestamptz, p_derogations jsonb default '{}'::jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_contact uuid;
  v_token text;
  v_without text[];
  v_allowed text[];
  v_reason text;
  v_parent public.master_transmissions%rowtype;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role not in ('mix', 'mastering') then
    raise exception 'invalid_role';
  end if;
  if p_expires_at is null
     or p_expires_at < now() + interval '1 day'
     or p_expires_at > now() + interval '180 days' then
    raise exception 'invalid_expiry';
  end if;
  if p_derogations is null or jsonb_typeof(p_derogations) <> 'object' then
    raise exception 'invalid_input' using errcode = '23514';
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

  if p_role = 'mix' then
    -- Waiting for the final vocals keeps the mix closed.
    if exists (
      select 1
        from jsonb_array_elements(coalesce(p_package -> 'titles', '[]'::jsonb)) t
        join lateral (
          select s.vocals_final, s.plan from public.master_flow_sources s
           where s.project_id = p_project_id
             and s.master_id::text = t ->> 'masterId'
           order by s.created_at desc limit 1) cur on true
       where cur.vocals_final = false and cur.plan = 'wait') then
      raise exception 'vocals_awaited' using errcode = '23514';
    end if;
    select coalesce(array_agg(coalesce(t ->> 'title', t ->> 'masterId', '?')
                              order by coalesce(t ->> 'title', t ->> 'masterId', '?')), '{}')
      into v_without
      from jsonb_array_elements(coalesce(p_package -> 'titles', '[]'::jsonb)) t
     where jsonb_array_length(coalesce(t -> 'stems', '[]'::jsonb)) = 0;
    select coalesce(array_agg(x order by x), '{}') into v_allowed
      from jsonb_array_elements_text(coalesce(p_derogations -> 'withoutStems', '[]'::jsonb)) x;
    if not v_without <@ v_allowed then
      raise exception 'stems_missing' using errcode = '23514';
    end if;
    v_reason := nullif(btrim(coalesce(p_derogations ->> 'withoutStemsReason', '')), '');
    if cardinality(v_without) > 0 and (v_reason is null or char_length(v_reason) > 1000) then
      raise exception 'stems_reason_required' using errcode = '23514';
    end if;
  end if;

  update public.master_transmissions
     set revoked_at = now()
   where project_id = p_project_id and role = p_role and revoked_at is null;

  if p_role = 'mastering' then
    select * into v_parent from public.master_transmissions
     where project_id = p_project_id and role = 'mix' and contact_id = v_contact
       and revoked_at is null and expires_at > now()
     order by created_at desc limit 1;
  end if;

  if v_parent.id is not null then
    insert into public.master_transmissions
      (organization_id, project_id, role, contact_id, token_hash, expires_at, package, note,
       created_by, derogations, continues_id, link_sent_at, link_sent_by)
    values (v_org, p_project_id, p_role, v_contact,
            'continues:' || gen_random_uuid()::text, p_expires_at,
            p_package, nullif(btrim(p_note), ''), public.auth_person_id(), '{}'::jsonb,
            v_parent.id, now(), public.auth_person_id());
    update public.master_transmissions
       set expires_at = greatest(expires_at, p_expires_at)
     where id = v_parent.id;
    return 'continued';
  end if;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.master_transmissions
    (organization_id, project_id, role, contact_id, token_hash, token_secret, expires_at,
     package, note, created_by, derogations)
  values (v_org, p_project_id, p_role, v_contact,
          encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
          extensions.pgp_sym_encrypt(v_token, public.master_link_key()),
          p_expires_at, p_package, nullif(btrim(p_note), ''), public.auth_person_id(),
          case when p_role = 'mix' and cardinality(v_without) > 0
               then jsonb_build_object('withoutStems', to_jsonb(v_without),
                                       'withoutStemsReason', v_reason)
               else '{}'::jsonb end);
  return v_token;
end;
$$;

-- 3 --------------------------------------------------------------------------
select public.add_notification_kinds(array['master_rate_proposed']);

-- « Prendre en charge le dossier » with the rate of each role the link
-- carries (null: the estimate of PDS, confirmed). Anonymous, the token
-- checked; the budget line of the role becomes « proposed ».
create or replace function public.take_master_transmission(
  p_token text, p_mix_cents bigint default null, p_mastering_cents bigint default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.master_transmissions%rowtype;
  v_brief public.master_briefs%rowtype;
  v_roles text[];
  v_role text;
  v_amount bigint;
  v_label text;
  v_name text;
begin
  v_row := public.open_transmission_of(p_token);
  if v_row.acknowledged_at is not null then
    return 'received';
  end if;
  if (p_mix_cents is not null and (p_mix_cents < 0 or p_mix_cents > 100000000))
     or (p_mastering_cents is not null and (p_mastering_cents < 0 or p_mastering_cents > 100000000)) then
    raise exception 'invalid_amount' using errcode = '23514';
  end if;
  select * into v_brief from public.master_briefs where project_id = v_row.project_id;
  select name into v_name from public.network_contacts where id = v_row.contact_id;
  -- The mix link of the engineer who masters too carries both rates.
  v_roles := case
    when v_row.role = 'mix' and v_brief.mastering_same_engineer then array['mix', 'mastering']
    else array[v_row.role] end;

  update public.master_transmissions
     set acknowledged_at = now(),
         proposed_mix_cents = case when 'mix' = any (v_roles)
                                   then coalesce(p_mix_cents, v_brief.mix_rate_cents) end,
         proposed_mastering_cents = case when 'mastering' = any (v_roles)
                                         then coalesce(p_mastering_cents, v_brief.mastering_rate_cents) end
   where id = v_row.id;

  foreach v_role in array v_roles loop
    v_amount := case v_role when 'mix' then coalesce(p_mix_cents, v_brief.mix_rate_cents)
                            else coalesce(p_mastering_cents, v_brief.mastering_rate_cents) end;
    continue when v_amount is null;
    v_label := case v_role when 'mix' then 'Mix' else 'Mastering' end
               || coalesce(' · ' || v_name, '');
    insert into public.budget_lines
      (organization_id, project_id, label, amount_cents, status, master_role, family, note)
    values (v_row.organization_id, v_row.project_id, v_label, v_amount, 'proposed', v_role,
            'services', 'Proposé par ' || coalesce(v_name, 'l''ingénieur') || ' par son lien')
    on conflict (project_id, master_role) where master_role is not null
    do update set amount_cents = excluded.amount_cents, status = 'proposed',
                  label = excluded.label, note = excluded.note
      where public.budget_lines.status in ('planned', 'proposed');
  end loop;

  if v_row.created_by is not null then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v_row.organization_id, v_row.created_by, null, 'master_rate_proposed',
            v_row.project_id, v_row.id);
  end if;
  return 'received';
end;
$$;
revoke execute on function public.take_master_transmission(text, bigint, bigint) from public;
grant execute on function public.take_master_transmission(text, bigint, bigint) to anon, authenticated;

-- « Accepter le tarif »: the owner commits the proposed amount.
create or replace function public.accept_master_rate(p_project_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.budget_lines
     set status = 'committed',
         note = 'Accepté par ' || coalesce((select nullif(btrim(coalesce(first_name, '') || ' '
                  || coalesce(last_name, '')), '') from public.people
                  where id = public.auth_person_id()), 'le responsable')
   where project_id = p_project_id and master_role = p_role and status = 'proposed';
  if not found then
    raise exception 'nothing_proposed';
  end if;
end;
$$;
revoke execute on function public.accept_master_rate(uuid, text) from public, anon;
grant execute on function public.accept_master_rate(uuid, text) to authenticated;

-- 4 ------------------------------------------------------------------------
create or replace function public.decide_mix_version(p_version_id uuid, p_decision text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.master_mix_versions%rowtype;
  v_validator uuid;
  v_owner uuid;
  v_actor uuid := public.auth_person_id();
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_message text;
begin
  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'invalid_decision';
  end if;
  select * into v_row from public.master_mix_versions where id = p_version_id for update;
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select b.validator_person_id, p.owner_person_id into v_validator, v_owner
    from public.projects p
    left join public.master_briefs b on b.project_id = p.id
   where p.id = v_row.project_id;
  if v_actor is null
     or v_actor is distinct from coalesce(v_validator, v_owner)
     or not public.can_see_project(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.decision is not null then
    raise exception 'already_decided';
  end if;
  if exists (select 1 from public.master_mix_versions v
              where v.project_id = v_row.project_id and v.master_id = v_row.master_id
                and v.stage = v_row.stage and v.number > v_row.number) then
    raise exception 'not_latest';
  end if;
  if p_decision = 'approved' and exists (
       select 1 from public.master_mix_versions v
        where v.project_id = v_row.project_id and v.master_id = v_row.master_id
          and v.stage = v_row.stage and v.decision = 'approved') then
    raise exception 'already_final';
  end if;
  -- « Demander une modification » always says what to change (rule 6).
  if p_decision = 'changes_requested' and v_note is null then
    raise exception 'note_required' using errcode = '23514';
  end if;
  -- A mix made on a working version never becomes the Mix final.
  if p_decision = 'approved' and v_row.stage = 'mix'
     and public.master_mix_on_working_source(v_row.id) then
    raise exception 'working_source' using errcode = '23514';
  end if;

  -- A change request always tells the engineer what to change: the feedback
  -- already sent, or else the synthesis saved, or else this note, sent now.
  if p_decision = 'changes_requested' and v_row.feedback_sent_at is null then
    v_message := coalesce(nullif(btrim(coalesce(v_row.feedback_summary, '')), ''), v_note);
    if v_message is null then
      raise exception 'note_required' using errcode = '23514';
    end if;
    update public.master_mix_versions
       set feedback_summary = v_message, status = 'feedback_sent',
           feedback_sent_at = now(), feedback_sent_by = v_actor
     where id = p_version_id;
    if v_message = v_note then
      v_note := null;
    end if;
  end if;

  update public.master_mix_versions
     set decision = p_decision, decision_note = v_note,
         decided_by = v_actor, decided_at = now()
   where id = p_version_id;

  if p_decision = 'approved' and v_row.stage = 'mastering' then
    update public.master_files set audio_state = 'final_master'
     where id = v_row.file_id and audio_state <> 'final_master';
    update public.masters set audio_state = 'final_master'
     where id = v_row.master_id;
  end if;

  if v_owner is not null and v_owner <> v_actor then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v_row.organization_id, v_owner, v_actor,
            case
              when p_decision = 'approved' and v_row.stage = 'mix' then 'master_mix_approved'
              when p_decision = 'approved' then 'master_final_approved'
              when v_row.stage = 'mix' then 'master_mix_changes_requested'
              else 'master_mastering_changes_requested' end,
            v_row.project_id, v_row.id);
  end if;
end;
$$;

-- 5 ------------------------------------------------------------------------
alter table public.master_mix_versions
  drop constraint master_mix_versions_decision_check;
alter table public.master_mix_versions
  add constraint master_mix_versions_decision_check
    check (decision is null or decision in ('approved', 'changes_requested', 'reopened')),
  add column reopened_at timestamptz,
  add column reopened_by uuid references public.people (id),
  add column reopen_reason text,
  add constraint master_mix_versions_reopen_check check (
    (decision = 'reopened') = (reopened_at is not null)
    and (reopen_reason is null or char_length(btrim(reopen_reason)) between 1 and 2000));

create or replace function public.reopen_mix_version(p_version_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.master_mix_versions%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_row from public.master_mix_versions where id = p_version_id for update;
  if not found or not public.is_project_owner(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.stage <> 'mix' or v_row.decision is distinct from 'approved' then
    raise exception 'not_final';
  end if;
  if v_reason is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  -- Once the mastering left on this mix, it is too late.
  if exists (select 1 from public.master_mix_versions v
              where v.project_id = v_row.project_id and v.master_id = v_row.master_id
                and v.stage = 'mastering')
     or exists (select 1 from public.master_transmissions x
                 where x.project_id = v_row.project_id and x.role = 'mastering'
                   and x.revoked_at is null) then
    raise exception 'mastering_started';
  end if;
  update public.master_mix_versions
     set decision = 'reopened', reopened_at = now(),
         reopened_by = public.auth_person_id(), reopen_reason = v_reason
   where id = p_version_id;
end;
$$;
revoke execute on function public.reopen_mix_version(uuid, text) from public, anon;
grant execute on function public.reopen_mix_version(uuid, text) to authenticated;
