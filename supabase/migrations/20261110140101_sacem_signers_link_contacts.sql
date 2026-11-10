-- The signers of a SACEM bulletin are people of the project (Sacha, 10/11/2026): each one's link
-- card (« Lien de Mona Lys », the Master's pattern) sits under the bulletin, with « Créer le lien »
-- before they have one. project_link_contacts (20261020010201) lists them from now on; the rest
-- of the function is unchanged.

create or replace function public.project_link_contacts(p_project_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_see_project(p_project_id) then
    return '[]'::jsonb;
  end if;
  return (
    with people as (
      select m.contact_id from public.master_transmissions m
       where m.project_id = p_project_id and m.revoked_at is null
      union select f.contact_id from public.legal_forms f
       where f.project_id = p_project_id and f.revoked_at is null
      union select e.contact_id from public.legal_split_confirmations c
        join public.legal_split_entries e on e.id = c.entry_id
        join public.legal_split_versions v on v.id = c.version_id
        join public.legal_split_sheets sh on sh.id = v.sheet_id
       where sh.project_id = p_project_id and c.revoked_at is null
      union select t.contact_id from public.influence_agreements a
        join public.activation_targets t on t.id = a.target_id
       where a.project_id = p_project_id and a.status <> 'revoked'
      union select l.contact_id from public.production_provider_links l
       where l.project_id = p_project_id and l.revoked_at is null
      union select g.contact_id from public.call_guests g
        join public.calls c on c.id = g.call_id
       where c.project_id = p_project_id
      union select k.contact_id from public.project_contact_links k
       where k.project_id = p_project_id and k.revoked_at is null
      -- The signers of a SACEM bulletin (20261110140101): their link card sits under
      -- the bulletin, « Créer le lien » before they have one.
      union select s.contact_id from public.legal_formality_signatures s
        join public.legal_formalities lf on lf.id = s.formality_id
       where lf.project_id = p_project_id and s.superseded_at is null
      -- The artist who listens to the versions (20261020010201).
      union select unnest(public.master_listener_contacts(p_project_id))
       where exists (select 1 from public.master_mix_versions v
                      where v.project_id = p_project_id))
    select coalesce(jsonb_agg(jsonb_build_object(
             'contactId', nc.id, 'name', nc.name, 'email', nc.email,
             'items', jsonb_array_length(i.items),
             -- What waits for them; an invitation to a call is not an action.
             'todo', (select count(*) from jsonb_array_elements(i.items) x
                       where x ->> 'state' = 'todo' and x ->> 'kind' <> 'call'),
             'roles', (select coalesce(jsonb_agg(distinct x ->> 'kind'), '[]'::jsonb)
                         from jsonb_array_elements(i.items) x))
           order by nc.name), '[]'::jsonb)
      from people pe
      join public.network_contacts nc on nc.id = pe.contact_id
      cross join lateral (select public.contact_page_items(p_project_id, nc.id) as items) i
     where pe.contact_id is not null);
end;
$$;
revoke execute on function public.project_link_contacts(uuid) from public, anon;
grant execute on function public.project_link_contacts(uuid) to authenticated;
