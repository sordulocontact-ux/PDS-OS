-- Réseau (proto des pages, 29/10/2026): the projects each contact is in,
-- for the list's « Avec PDS » column, and, on a contact's page, what they
-- do in each project and what waits for them. The same sources as
-- project_link_contacts (lot 11), plus the project's team, read across
-- projects; only the projects the viewer may see.

-- Every (contact, project) pair, all projects together. Internal: it skips
-- RLS, so only the two functions below call it.
create or replace function public.contact_project_pairs()
returns table (contact_id uuid, project_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select m.contact_id, m.project_id from public.master_transmissions m
   where m.revoked_at is null
  union select f.contact_id, f.project_id from public.legal_forms f
   where f.revoked_at is null
  union select e.contact_id, sh.project_id from public.legal_split_confirmations c
    join public.legal_split_entries e on e.id = c.entry_id
    join public.legal_split_versions v on v.id = c.version_id
    join public.legal_split_sheets sh on sh.id = v.sheet_id
   where c.revoked_at is null
  union select t.contact_id, a.project_id from public.influence_agreements a
    join public.activation_targets t on t.id = a.target_id
   where a.status <> 'revoked'
  union select l.contact_id, l.project_id from public.production_provider_links l
   where l.revoked_at is null
  union select g.contact_id, c.project_id from public.call_guests g
    join public.calls c on c.id = g.call_id
   where c.project_id is not null
  union select k.contact_id, k.project_id from public.project_contact_links k
   where k.revoked_at is null
  union select tm.contact_id, tm.project_id from public.project_team_members tm
$$;
revoke execute on function public.contact_project_pairs() from public, anon, authenticated;

-- The list: each contact's projects, by title.
create or replace function public.network_contact_projects()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'contactId', x.contact_id, 'projectId', p.id, 'title', p.title)
           order by p.title), '[]'::jsonb)
    from (select distinct contact_id, project_id
            from public.contact_project_pairs()
           where contact_id is not null) x
    join public.projects p on p.id = x.project_id
   where p.archived_at is null and public.can_see_project(p.id);
$$;
revoke execute on function public.network_contact_projects() from public, anon;
grant execute on function public.network_contact_projects() to authenticated;

-- A contact's page: in each project, their roles in the team, their items
-- (contact_page_items: state, step, deadline) and their private link.
create or replace function public.contact_projects(p_contact_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'projectId', p.id,
           'title', p.title,
           'artist', a.name,
           'team', (select coalesce(jsonb_agg(distinct tm.role), '[]'::jsonb)
                      from public.project_team_members tm
                     where tm.project_id = p.id and tm.contact_id = p_contact_id
                       and tm.role is not null),
           'items', public.contact_page_items(p.id, p_contact_id),
           'link', (select jsonb_build_object('sentAt', k.sent_at,
                                              'openedAt', k.last_opened_at)
                      from public.project_contact_links k
                     where k.project_id = p.id and k.contact_id = p_contact_id
                       and k.revoked_at is null
                     order by k.created_at desc limit 1))
           order by p.title), '[]'::jsonb)
    from (select distinct project_id from public.contact_project_pairs()
           where contact_id = p_contact_id) x
    join public.projects p on p.id = x.project_id
    left join public.artists a on a.id = p.artist_id
   where p.archived_at is null and public.can_see_project(p.id);
$$;
revoke execute on function public.contact_projects(uuid) from public, anon;
grant execute on function public.contact_projects(uuid) to authenticated;
