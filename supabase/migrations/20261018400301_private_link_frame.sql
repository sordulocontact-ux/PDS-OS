-- The common frame of every private page (projet-complet commons.md § 8,
-- shell.md E10, sub-lot C13 A): « « Projet » · Nom » in the top bar, the
-- line « Projet · Artiste · format · rôle » above the title, and the card
-- « Votre contact chez PDS » (the project's owner). The pages keep their own
-- functions and tokens; this one only names the frame, from the token of
-- any of them. Nothing internal: titles and names only, never a budget, a
-- status or an exchange.

create or replace function public.get_private_link_frame(p_kind text, p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_project uuid;
  v_contact uuid;
  v_person_name text;
  v_role text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if p_kind = 'master' then
    select project_id, contact_id, role into v_project, v_contact, v_role
      from public.master_transmissions where token_hash = v_hash;
  elsif p_kind = 'form' then
    select project_id, contact_id into v_project, v_contact
      from public.legal_forms where token_hash = v_hash;
  elsif p_kind = 'split' then
    select sh.project_id, e.contact_id, e.name, e.role
      into v_project, v_contact, v_person_name, v_role
      from public.legal_split_confirmations c
      join public.legal_split_entries e on e.id = c.entry_id
      join public.legal_split_versions v on v.id = c.version_id
      join public.legal_split_sheets sh on sh.id = v.sheet_id
     where c.token_hash = v_hash;
  elsif p_kind = 'influence' then
    select a.project_id, t.contact_id into v_project, v_contact
      from public.influence_agreements a
      join public.activation_targets t on t.id = a.target_id
     where a.token_hash = v_hash;
  elsif p_kind = 'provider' then
    select project_id, contact_id into v_project, v_contact
      from public.production_provider_links where token_hash = v_hash;
  else
    return null;
  end if;
  if v_project is null then
    return null;
  end if;
  return (
    select jsonb_build_object(
      'project', p.title,
      'artist', ar.name,
      'format', p.music_format,
      'person', coalesce((select c.name from public.network_contacts c where c.id = v_contact),
                         v_person_name),
      'role', v_role,
      'owner', nullif(btrim(concat_ws(' ', o.first_name, o.last_name)), ''),
      'ownerRole', (select m.role from public.memberships m
                     where m.person_id = p.owner_person_id
                       and m.organization_id = p.organization_id
                       and m.status = 'approved'
                     limit 1))
      from public.projects p
      left join public.artists ar on ar.id = p.artist_id
      left join public.people o on o.id = p.owner_person_id
     where p.id = v_project);
end;
$$;
revoke execute on function public.get_private_link_frame(text, text) from public;
grant execute on function public.get_private_link_frame(text, text) to anon, authenticated;
