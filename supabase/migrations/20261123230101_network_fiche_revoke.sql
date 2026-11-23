-- « Révoquer le lien » of a contact's Réseau fiche (Sacha 23/11/2026: copy, then
-- « ⋯ » for the other gestures, revoking among them). Until now only « Nouveau
-- lien » revoked the open link, and network_contact_fiche issued a new fiche
-- whenever none was open: a revocation would have been undone by the next
-- reading of the page.
--
--   1. revoke_network_contact_fiche: the open link stops working, no new one;
--   2. network_contact_fiche reads the contact's latest fiche, whatever its
--      state: a revoked one says so (no link), and a fiche is issued only for
--      a contact that never had one.

create or replace function public.revoke_network_contact_fiche(p_contact_id uuid)
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
  perform pg_advisory_xact_lock(hashtextextended('network_fiche:' || p_contact_id::text, 0));
  delete from public.legal_form_secrets s
   using public.legal_forms f
   where s.form_id = f.id and f.contact_id = p_contact_id and f.project_id is null
     and f.status in ('link_generated', 'sent');
  update public.legal_forms
     set status = 'revoked', revoked_at = now(), revoked_by = public.auth_person_id()
   where contact_id = p_contact_id and project_id is null
     and status in ('link_generated', 'sent');
  if not found then
    raise exception 'no_open_link' using errcode = 'P0001';
  end if;
end;
$$;
revoke execute on function public.revoke_network_contact_fiche(uuid) from public, anon;
grant execute on function public.revoke_network_contact_fiche(uuid) to authenticated;

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
   where contact_id = p_contact_id and project_id is null
   order by created_at desc limit 1;
  if not found then
    if v_archived is not null then
      return null;
    end if;
    perform public.issue_network_fiche(p_contact_id);
    select * into v_form from public.legal_forms
     where contact_id = p_contact_id and project_id is null
     order by created_at desc limit 1;
  end if;
  return jsonb_build_object(
    'id', v_form.id,
    'status', v_form.status,
    'sentAt', v_form.sent_at,
    'openedAt', v_form.opened_at,
    'submittedAt', v_form.submitted_at,
    'completedAt', v_form.completed_at,
    'revokedAt', v_form.revoked_at,
    -- The link only while it can still be filled.
    'token', case when v_form.status in ('link_generated', 'sent') then
               (select extensions.pgp_sym_decrypt(s.token_secret, public.master_link_key())
                  from public.legal_form_secrets s where s.form_id = v_form.id) end);
end;
$$;
revoke execute on function public.network_contact_fiche(uuid) from public, anon;
grant execute on function public.network_contact_fiche(uuid) to authenticated;
