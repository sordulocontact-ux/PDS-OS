-- Influence, recette Marketing V1 of 23/10/2026 (MKT-INF-002): the express
-- agreement's link is sent from the owner's view, and its sending is traced.
--
-- Before (20261011000301): the link was shown once, to copy or open in the
-- mail app, and nothing said whether it had left. PDS OS still sends no
-- e-mail of its own (no SMTP of the app yet): the sending is declared by the
-- person, with its channel, once done — never before. The link itself is
-- never stored (only its hash): the declaration keeps who, when, how.

alter table public.influence_agreements
  add column if not exists sent_at timestamptz,
  add column if not exists sent_by uuid references public.people (id),
  add column if not exists sent_channel text;
alter table public.influence_agreements drop constraint if exists influence_agreements_sent_check;
alter table public.influence_agreements add constraint influence_agreements_sent_check
  check ((sent_at is null) = (sent_by is null) and (sent_at is null) = (sent_channel is null)
         and (sent_channel is null or sent_channel in ('email', 'dm', 'whatsapp', 'other')));

-- « Marquer comme envoyé »: the pending agreement's link has left, by this
-- channel. Once; the activation launched (influence_gesture_guard).
create or replace function public.declare_influence_agreement_sent(p_agreement_id uuid, p_channel text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.influence_agreements%rowtype;
begin
  select * into v from public.influence_agreements where id = p_agreement_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'not_found';
  end if;
  if not public.activation_can_write(v.activation_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.status <> 'pending' or v.sent_at is not null then
    raise exception 'invalid_transition' using errcode = '23514';
  end if;
  if p_channel is null or p_channel not in ('email', 'dm', 'whatsapp', 'other') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  update public.influence_agreements
     set sent_at = now(), sent_by = public.auth_person_id(), sent_channel = p_channel
   where id = v.id;
  perform public.log_activation_event(v.activation_id, 'agreement.sent', v.id, null,
    jsonb_build_object('target', v.target_id, 'channel', p_channel), null);
end;
$$;

revoke execute on function public.declare_influence_agreement_sent(uuid, text) from public, anon;
grant execute on function public.declare_influence_agreement_sent(uuid, text) to authenticated;
