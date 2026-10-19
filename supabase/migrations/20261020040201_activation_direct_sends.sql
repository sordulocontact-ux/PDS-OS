-- Two messages the proto « Projet complet » marks sent in one gesture, with
-- no separate review (mk.js collabCard `cbrief`, agencySection `agsent`;
-- docs/projet-complet/activations.md rows 18 and 28):
--   1. « Brief et proposition » of an influence collaboration: one form that
--      writes PDS's proposal (rémunération, livrables, droits organiques et
--      publicitaires) and the brief, declared sent by the person who sends
--      it (« PDS OS ne l'envoie pas : copiez-le, puis indiquez qu'il est
--      parti. »). The collaboration moves to « Négociation ».
--   2. « Récapitulatif pour <agence> »: the message written by code from the
--      PDS decisions, read and marked sent by the owner (« Marquer comme
--      envoyé »).
-- The human who marks it sent is the validation the ticket asks for
-- (« Aucun message externe n'est envoyé sans validation humaine ») : the
-- message keeps who validated and declared it, the same person, at once.
-- Press pitches keep their review by the direction (advance_activation_message).
--
-- Channel « WhatsApp » joins the closed list (proto: E-mail, Message TikTok,
-- WhatsApp).

alter table public.activation_messages drop constraint activation_messages_channel_check;
alter table public.activation_messages
  add constraint activation_messages_channel_check
    check (channel in ('email', 'dm', 'phone', 'whatsapp', 'other'));

-- Inserts a message and declares it sent at once, by the caller; journaled
-- like `declare_sent`. Internal: the two functions below check who may.
create function public._send_activation_message(
  p_activation_id uuid, p_target_id uuid, p_kind text, p_subject text, p_body text,
  p_channel text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
begin
  if v_body = '' then
    raise exception 'message_body_required' using errcode = '23514';
  end if;
  insert into public.activation_messages
    (organization_id, project_id, activation_id, target_id, kind, subject, body, channel)
  select a.organization_id, a.project_id, a.id, p_target_id, p_kind,
         nullif(btrim(coalesce(p_subject, '')), ''), left(v_body, 20000),
         coalesce(p_channel, 'email')
    from public.marketing_activations a
   where a.id = p_activation_id
  returning id into v_id;
  perform set_config('pds.activation_message', 'on', true);
  update public.activation_messages
     set status = 'sent_declared',
         validated_by = public.auth_person_id(), validated_at = now(),
         sent_declared_by = public.auth_person_id(), sent_declared_at = now(),
         sent_on = (now() at time zone 'Europe/Paris')::date
   where id = v_id;
  perform set_config('pds.activation_message', 'off', true);
  perform public.log_activation_event(p_activation_id, 'message.declare_sent', v_id, null,
    jsonb_build_object('kind', p_kind, 'target', p_target_id, 'channel', p_channel), null);
  return v_id;
end;
$$;
revoke execute on function public._send_activation_message(uuid, uuid, text, text, text, text)
  from public, anon, authenticated;

-- « Marquer le brief comme envoyé » (Brief et proposition).
create function public.send_influence_brief(
  p_target_id uuid, p_fee numeric, p_deliverables text, p_organic text, p_ads text,
  p_body text, p_channel text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.activation_targets%rowtype;
  a public.marketing_activations%rowtype;
  v_concept text;
  v_message uuid;
begin
  select * into t from public.activation_targets where id = p_target_id;
  if not found or not public.can_see_project(t.project_id) then
    raise exception 'target_not_found';
  end if;
  select * into a from public.marketing_activations where id = t.activation_id;
  if not public.activation_can_write(a.id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if a.kind <> 'influence' or a.mode is distinct from 'internal'
     or a.status in ('closed', 'cancelled') or t.outcome is not null then
    raise exception 'invalid_transition';
  end if;
  select s.status into v_concept from public.activation_sheets s
   where s.activation_id = a.id and s.kind = 'concept' and s.target_id = t.id
   order by s.version desc limit 1;
  if v_concept is distinct from 'validated' then
    raise exception 'concept_not_validated' using errcode = '23514';
  end if;
  if exists (select 1 from public.influence_proposals p where p.target_id = t.id) then
    raise exception 'brief_already_sent' using errcode = '23514';
  end if;
  if p_fee is null or p_fee <= 0 or p_fee > 1e9 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if p_channel not in ('email', 'dm', 'whatsapp') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  insert into public.influence_proposals
    (organization_id, project_id, activation_id, target_id, party, fee_amount, currency,
     deliverables, organic_usage, ads_usage)
  values (t.organization_id, t.project_id, a.id, t.id, 'pds', p_fee, 'EUR',
          nullif(left(btrim(coalesce(p_deliverables, '')), 2000), ''),
          nullif(left(btrim(coalesce(p_organic, '')), 1000), ''),
          nullif(left(btrim(coalesce(p_ads, '')), 1000), ''));
  v_message := public._send_activation_message(a.id, t.id, 'brief', null, p_body, p_channel);
  return v_message;
end;
$$;
revoke execute on function public.send_influence_brief(uuid, numeric, text, text, text, text, text)
  from public, anon;
grant execute on function public.send_influence_brief(uuid, numeric, text, text, text, text, text)
  to authenticated;

-- « Marquer comme envoyé » (Récapitulatif pour <agence>).
create function public.send_agency_recap(
  p_activation_id uuid, p_subject text, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.marketing_activations%rowtype;
begin
  select * into a from public.marketing_activations where id = p_activation_id;
  if not found or not public.can_see_project(a.project_id) then
    raise exception 'activation_not_found';
  end if;
  if not public.activation_can_write(a.id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if a.mode is distinct from 'agency' or a.status in ('closed', 'cancelled') then
    raise exception 'invalid_transition';
  end if;
  return public._send_activation_message(a.id, null, 'agency_recap', p_subject, p_body, 'email');
end;
$$;
revoke execute on function public.send_agency_recap(uuid, text, text) from public, anon;
grant execute on function public.send_agency_recap(uuid, text, text) to authenticated;
