-- Master, the artist listens (docs/projet-complet/master.md § 11, proto
-- `master:v1`, rôle « mona »): on their page by project (/c/, lot 11), the
-- artist of the project listens to each version in listening (mix or
-- master) and leaves feedback with its timecode. The feedback stays in the
-- team (VISION-UX rule 21): it is a comment of the version, read by the
-- team (« Mona Lys (lien privé) »); the engineer only receives what the
-- validator sends or decides (feedback_summary, decision), as before.
--
-- 1. master_listener_contacts(project): the Network contacts standing for
--    the project's artist or an artist of its titles.
-- 2. master_listen_versions(project): per title, the newest version not yet
--    decided (newest stage first).
-- 3. master_mix_comments.contact_id: a comment left through a private link.
-- 4. contact_page_items gains the item « listen » (kept verbatim otherwise).
-- 5. get_master_listen(token) / post_master_listen_comment(token, …), anon,
--    through the person's link only; the validator is told.
-- 6. Storage: the file of a version in listening may be signed by the page
--    (anon) while it is in listening and the artist has an open link; its
--    path is unguessable and only given by get_master_listen.

-- 1 --------------------------------------------------------------------------
create or replace function public.master_listener_contacts(p_project_id uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct c.id), '{}')
    from public.network_contacts c
    join public.projects p on p.id = p_project_id and p.organization_id = c.organization_id
   where c.archived_at is null and c.artist_id is not null
     and (c.artist_id = p.artist_id
          or c.artist_id in (select ma.artist_id from public.master_artists ma
                               join public.project_masters pm on pm.master_id = ma.master_id
                              where pm.project_id = p_project_id));
$$;
revoke execute on function public.master_listener_contacts(uuid) from public, anon, authenticated;

-- 2 --------------------------------------------------------------------------
create or replace function public.master_listen_versions(p_project_id uuid)
returns setof public.master_mix_versions
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (v.master_id) v.*
    from public.master_mix_versions v
   where v.project_id = p_project_id and v.decision is null
     and not exists (select 1 from public.master_mix_versions n
                      where n.project_id = v.project_id and n.master_id = v.master_id
                        and n.stage = v.stage and n.number > v.number)
   order by v.master_id, (v.stage = 'mastering') desc, v.created_at desc;
$$;
revoke execute on function public.master_listen_versions(uuid) from public, anon, authenticated;

-- 3 --------------------------------------------------------------------------
alter table public.master_mix_comments
  add column contact_id uuid references public.network_contacts (id) on delete set null;
select public.add_notification_kinds(array['master_listen_feedback']);

-- 4 --------------------------------------------------------------------------
create or replace function public.contact_page_items(p_project_id uuid, p_contact_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with items as (
    -- Master: the current sending of each role.
    select jsonb_build_object(
             'kind', 'master', 'id', m.id, 'workflow', 'master', 'step', m.role,
             'state', case when m.acknowledged_at is null then 'todo' else 'waiting' end,
             'due', case m.role when 'mix' then m.package ->> 'mixV1Due'
                                else m.package ->> 'masteringDue' end,
             'at', m.created_at) as item, m.created_at as at
      from public.master_transmissions m
     where m.project_id = p_project_id and m.contact_id = p_contact_id
       and m.revoked_at is null
       -- A sending continued by a newer one shows as that one.
       and not exists (select 1 from public.master_transmissions n
                        where n.continues_id = m.id and n.revoked_at is null
                          and n.expires_at > now())
    union all
    -- Juridique: the fiche de renseignements.
    select jsonb_build_object(
             'kind', 'form', 'id', f.id, 'workflow', 'legal', 'step', 'form',
             'state', case when f.status = 'complete' or f.submitted_at is not null
                           then 'done' else 'todo' end,
             'due', null, 'at', f.created_at), f.created_at
      from public.legal_forms f
     where f.project_id = p_project_id and f.contact_id = p_contact_id
       and f.revoked_at is null and f.status <> 'revoked'
    union all
    -- Juridique: the confirmation of a split.
    select jsonb_build_object(
             'kind', 'split', 'id', c.id, 'workflow', 'legal', 'step', 'split',
             'state', case c.status when 'pending' then 'todo'
                                    when 'disputed' then 'waiting' else 'done' end,
             'due', null, 'at', c.created_at,
             'role', e.role), c.created_at
      from public.legal_split_confirmations c
      join public.legal_split_entries e on e.id = c.entry_id
      join public.legal_split_versions v on v.id = c.version_id
      join public.legal_split_sheets sh on sh.id = v.sheet_id
     where sh.project_id = p_project_id and e.contact_id = p_contact_id
       and c.revoked_at is null and c.status <> 'revoked'
    union all
    -- Marketing: the creator's agreement, then the collaboration.
    select jsonb_build_object(
             'kind', 'influence', 'id', a.id, 'workflow', 'marketing', 'step', 'influence',
             'state', case a.status when 'pending' then 'todo'
                                    when 'change_requested' then 'waiting' else 'waiting' end,
             'due', null, 'at', a.created_at), a.created_at
      from public.influence_agreements a
      join public.activation_targets t on t.id = a.target_id
     where a.project_id = p_project_id and t.contact_id = p_contact_id
       and a.status <> 'revoked'
    union all
    -- Marketing › Production: the provider's link of a deliverable.
    select jsonb_build_object(
             'kind', 'provider', 'id', l.id, 'workflow', 'marketing', 'step', 'provider',
             'state', 'waiting', 'due', null, 'at', l.created_at,
             'roles', to_jsonb(public.production_link_roles(l))), l.created_at
      from public.production_provider_links l
     where l.project_id = p_project_id and l.contact_id = p_contact_id
       and l.revoked_at is null and l.expires_at > now()
    union all
    -- Calls they are invited to (a production call already shows on the
    -- provider's cards), with the summary they received.
    select jsonb_build_object(
             'kind', 'call', 'id', c.id, 'workflow', public.call_workflow(c.id), 'step', 'call',
             'state', case when c.occurred_at > now() then 'todo'
                           when s.id is not null then 'done' else 'waiting' end,
             'due', to_char(c.occurred_at at time zone 'Europe/Paris', 'YYYY-MM-DD'),
             'at', g.created_at,
             'detail', jsonb_build_object(
               'title', c.title,
               'occurredAt', c.occurred_at,
               'endsAt', c.ends_at,
               'meetingUrl', c.meeting_url,
               'agenda', (select coalesce(jsonb_agg(coalesce(a ->> 'topic', a #>> '{}')), '[]'::jsonb)
                            from jsonb_array_elements(
                                   case when jsonb_typeof(c.agenda) = 'array' then c.agenda
                                        else '[]'::jsonb end) a),
               'participants', (
                 select coalesce(jsonb_agg(n order by n), '[]'::jsonb) from (
                   select nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), '') n
                     from public.call_attendees ca join public.people p on p.id = ca.person_id
                    where ca.call_id = c.id
                   union
                   select coalesce(nc.name, cg.name) from public.call_guests cg
                     left join public.network_contacts nc on nc.id = cg.contact_id
                    where cg.call_id = c.id) x where n is not null),
               'invitedBy', nullif(btrim(concat_ws(' ', ip.first_name, ip.last_name)), ''),
               'invitedAt', g.created_at,
               'summary', case when s.id is null then null else jsonb_build_object(
                 'text', s.text, 'version', s.version, 'sentAt', s.sent_at,
                 'by', nullif(btrim(concat_ws(' ', sp.first_name, sp.last_name)), '')) end)),
           g.created_at
      from public.call_guests g
      join public.calls c on c.id = g.call_id
      left join public.people ip on ip.id = c.created_by
      left join lateral (
        select x.* from public.call_summaries x
         where x.call_id = c.id
           and x.recipients @> jsonb_build_array(jsonb_build_object('contact_id', p_contact_id))
         order by x.version desc limit 1) s on true
      left join public.people sp on sp.id = s.sent_by
     where c.project_id = p_project_id and g.contact_id = p_contact_id
       and not (exists (select 1 from public.production_calls pc where pc.call_id = c.id)
                and exists (select 1 from public.production_provider_links l
                             where l.project_id = p_project_id and l.contact_id = p_contact_id
                               and l.revoked_at is null and l.expires_at > now()))
    union all
    -- Master: the artist listens to the versions in listening (20261020010201).
    select jsonb_build_object(
             'kind', 'listen', 'id', p_project_id, 'workflow', 'master', 'step', 'listen',
             'state', case
               when not exists (select 1 from public.master_listen_versions(p_project_id) lv) then 'waiting'
               when exists (select 1 from public.master_listen_versions(p_project_id) lv
                             where not exists (select 1 from public.master_mix_comments c
                                                where c.version_id = lv.id and c.contact_id = p_contact_id))
                 then 'todo'
               else 'done' end,
             'due', null,
             'at', coalesce((select min(v.created_at) from public.master_mix_versions v
                              where v.project_id = p_project_id), now())), now()
     where p_contact_id = any (public.master_listener_contacts(p_project_id))
       and exists (select 1 from public.master_mix_versions v where v.project_id = p_project_id)
  )
  select coalesce(jsonb_agg(item order by at), '[]'::jsonb) from items;
$$;
revoke execute on function public.contact_page_items(uuid, uuid) from public, anon, authenticated;

-- 5 --------------------------------------------------------------------------

-- The person's open link, when they listen for this project.
create or replace function public.master_listen_link(p_contact_token text)
returns public.project_contact_links
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.project_contact_links%rowtype := public.contact_link_of(p_contact_token);
begin
  if v.id is null or not (v.contact_id = any (public.master_listener_contacts(v.project_id))) then
    return null;
  end if;
  return v;
end;
$$;
revoke execute on function public.master_listen_link(text) from public, anon, authenticated;

-- What the artist listens to: each version in listening with the file's
-- path (to sign), who decides, and their own feedback.
create or replace function public.get_master_listen(p_contact_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.project_contact_links%rowtype := public.master_listen_link(p_contact_token);
begin
  if v.id is null then
    return null;
  end if;
  return jsonb_build_object(
    'project', (select title from public.projects where id = v.project_id),
    'validator', (select nullif(btrim(concat_ws(' ', pe.first_name, pe.last_name)), '')
                    from public.projects p
                    left join public.master_briefs b on b.project_id = p.id
                    join public.people pe on pe.id = coalesce(b.validator_person_id, p.owner_person_id)
                   where p.id = v.project_id),
    'versions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', lv.id, 'title', m.title, 'stage', lv.stage, 'number', lv.number,
               'fileName', f.file_name, 'path', f.path, 'at', lv.created_at,
               'by', coalesce(nullif(btrim(concat_ws(' ', a.first_name, a.last_name)), ''),
                              (select nc.name from public.master_transmissions t
                                 join public.network_contacts nc on nc.id = t.contact_id
                                where t.project_id = v.project_id and t.role = lv.stage
                                order by t.created_at desc limit 1)),
               'mine', coalesce((
                 select jsonb_agg(jsonb_build_object('timecode', c.timecode_seconds,
                                                     'body', c.body, 'at', c.created_at)
                                  order by c.created_at)
                   from public.master_mix_comments c
                  where c.version_id = lv.id and c.contact_id = v.contact_id), '[]'::jsonb))
             order by m.title)
        from public.master_listen_versions(v.project_id) lv
        join public.masters m on m.id = lv.master_id
        join public.master_files f on f.id = lv.file_id
        left join public.people a on a.id = lv.created_by), '[]'::jsonb));
end;
$$;
revoke execute on function public.get_master_listen(text) from public;
grant execute on function public.get_master_listen(text) to anon, authenticated;

-- « Envoyer mon retour »: a comment of the version, the team's only; the
-- one who decides is told (once while unread).
create or replace function public.post_master_listen_comment(
  p_contact_token text, p_version_id uuid, p_timecode_seconds integer, p_body text,
  p_client_key uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.project_contact_links%rowtype := public.master_listen_link(p_contact_token);
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_validator uuid;
begin
  if v.id is null then
    raise exception 'link_closed' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.master_listen_versions(v.project_id) lv
                  where lv.id = p_version_id) then
    raise exception 'not_listening' using errcode = 'P0001';
  end if;
  if v_body is null or char_length(v_body) > 2000 then
    raise exception 'body_required' using errcode = '23514';
  end if;
  if p_timecode_seconds is not null and (p_timecode_seconds < 0 or p_timecode_seconds >= 86400) then
    raise exception 'invalid_timecode' using errcode = '23514';
  end if;
  insert into public.master_mix_comments
    (organization_id, project_id, version_id, body, timecode_seconds, client_key, contact_id)
  values (v.organization_id, v.project_id, p_version_id, v_body, p_timecode_seconds,
          p_client_key, v.contact_id)
  on conflict (version_id, client_key) where client_key is not null do nothing;
  select coalesce(b.validator_person_id, p.owner_person_id) into v_validator
    from public.projects p left join public.master_briefs b on b.project_id = p.id
   where p.id = v.project_id;
  if v_validator is not null and not exists (
       select 1 from public.notifications n
        where n.recipient_person_id = v_validator and n.kind = 'master_listen_feedback'
          and n.subject_id = p_version_id and n.read_at is null) then
    insert into public.notifications
      (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
    values (v.organization_id, v_validator, null, 'master_listen_feedback', v.project_id,
            p_version_id);
  end if;
end;
$$;
revoke execute on function public.post_master_listen_comment(text, uuid, integer, text, uuid) from public;
grant execute on function public.post_master_listen_comment(text, uuid, integer, text, uuid)
  to anon, authenticated;

-- 6 --------------------------------------------------------------------------
create or replace function public.is_listen_file(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.master_files f
      join public.master_mix_versions v on v.file_id = f.id and v.decision is null
      join public.project_contact_links k on k.project_id = v.project_id
     where f.path = p_path and k.revoked_at is null and k.expires_at > now()
       and k.contact_id = any (public.master_listener_contacts(v.project_id)));
$$;
revoke execute on function public.is_listen_file(text) from public;
grant execute on function public.is_listen_file(text) to anon, authenticated;

create policy master_files_objects_select_listen on storage.objects
  for select to anon
  using (bucket_id = 'master-files' and public.is_listen_file(objects.name));

-- « Liens privés » of « Qui fait quoi » also name the artist who listens
-- (kept verbatim otherwise from 20261019110101).
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
