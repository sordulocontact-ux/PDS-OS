-- The engineer's link readable by the direction too (Sacha, 04/11/2026):
-- the DG copies it when the owner is away. Reading only — creating,
-- renewing, revoking and marking as sent stay the owner's
-- (issue_contact_link, revoke_contact_link, mark_contact_link_sent).

create or replace function public.contact_link_token(p_link_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.project_contact_links%rowtype;
begin
  select * into v from public.project_contact_links where id = p_link_id;
  if not found or v.revoked_at is not null then
    return null;
  end if;
  if not public.is_project_owner(v.project_id)
     and not (public.has_permission(v.organization_id, 'validate')
              and public.can_see_project(v.project_id)) then
    return null;
  end if;
  return extensions.pgp_sym_decrypt(v.token_secret, public.master_link_key());
end;
$$;
