-- Lot 11: one private page per person and per project (docs/projet-complet/
-- shell.md E10 and § 6 sub-lot 8, commons.md § 8 option B, C0 decision 7).
--
-- Until now each workflow gave its own link per object (/m mix engineer, /f
-- fiche, /s split, /i creator, /p provider). The proto gives a person one
-- link per project, where every workflow lays the cards it asks of them:
-- « Ce que PDS attend de vous ».
--
-- 1. project_contact_links: one active link per (project, contact). Its
--    token is stored as a SHA-256 (what opens the page) and encrypted with
--    the Master's mechanism (pgcrypto, key in Vault, 20261019080301) so the
--    project's owner can copy it again (VISION-UX rule 19); no third
--    mechanism. A new link replaces the former (revoked « replaced »); a
--    revocation by hand says why (rule 6). The e-mail is not sent by PDS OS:
--    « Copier le lien », then « Marquer comme envoyé ».
-- 2. contact_page_items: what this person has in this project, each object
--    with its state (« À vous », « En attente de PDS », « Fait »), deadline
--    and step, computed here, never stored: Master sendings, fiches and
--    split confirmations of the Juridique, the Production's provider links,
--    the creator's agreements and collaborations, call invitations and the
--    summaries they received.
-- 3. get_contact_page(token), for anon: the page's frame and that list, or
--    only the state of a closed link. The objects' own pages keep their
--    functions; 20261019110201 lets those take this token + the object's id.

-- 1 --------------------------------------------------------------------------

create table public.project_contact_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  contact_id uuid not null,
  -- Link n° 1, 2… of this person on this project.
  number integer not null,
  token_hash text not null,
  token_secret bytea not null,
  expires_at timestamptz not null,
  sent_at timestamptz,
  sent_by uuid references public.people (id),
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  open_count integer not null default 0,
  revoked_at timestamptz,
  revoked_by uuid references public.people (id),
  -- 'replaced' when a newer link took its place, else the owner's words.
  revoke_reason text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint project_contact_links_token_key unique (token_hash),
  constraint project_contact_links_number_check check (number >= 1),
  constraint project_contact_links_reason_check
    check (revoke_reason is null or char_length(revoke_reason) between 1 and 1000),
  constraint project_contact_links_revoked_check
    check ((revoked_at is null) = (revoke_reason is null)),
  constraint project_contact_links_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint project_contact_links_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id) on delete cascade
);
create unique index project_contact_links_active_key
  on public.project_contact_links (project_id, contact_id) where revoked_at is null;
create index project_contact_links_contact_idx
  on public.project_contact_links (contact_id, created_at desc);

alter table public.project_contact_links enable row level security;
alter table public.project_contact_links force row level security;
revoke all on table public.project_contact_links from anon, authenticated;
-- Never the token's hash nor its secret: the link is read back by
-- contact_link_token, for the owner only.
grant select (id, organization_id, project_id, contact_id, number, expires_at, sent_at, sent_by,
              first_opened_at, last_opened_at, open_count, revoked_at, revoked_by,
              revoke_reason, created_by, created_at)
  on public.project_contact_links to authenticated;
create policy project_contact_links_select on public.project_contact_links
  for select to authenticated using (public.can_see_project(project_id));

-- « Créer le lien » / « Nouveau lien » (the project's owner): the former
-- active link stops working; the token is returned, and kept encrypted.
create function public.issue_contact_link(
  p_project_id uuid, p_contact_id uuid, p_expires_at timestamptz default null)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_token text;
  v_expires timestamptz := coalesce(p_expires_at, now() + interval '180 days');
  v_number integer;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select organization_id into v_org from public.projects where id = p_project_id;
  if not exists (select 1 from public.network_contacts c
                  where c.id = p_contact_id and c.organization_id = v_org
                    and c.archived_at is null) then
    raise exception 'contact_not_found';
  end if;
  if v_expires < now() + interval '1 day' or v_expires > now() + interval '365 days' then
    raise exception 'invalid_expiry';
  end if;
  -- One at a time per person and project: the same lock for every issuer.
  perform pg_advisory_xact_lock(hashtextextended(p_project_id::text || p_contact_id::text, 0));
  update public.project_contact_links
     set revoked_at = now(), revoked_by = public.auth_person_id(), revoke_reason = 'replaced'
   where project_id = p_project_id and contact_id = p_contact_id and revoked_at is null;
  select coalesce(max(number), 0) + 1 into v_number
    from public.project_contact_links
   where project_id = p_project_id and contact_id = p_contact_id;
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.project_contact_links
    (organization_id, project_id, contact_id, number, token_hash, token_secret, expires_at,
     created_by)
  values (v_org, p_project_id, p_contact_id, v_number,
          encode(sha256(convert_to(v_token, 'UTF8')), 'hex'),
          extensions.pgp_sym_encrypt(v_token, public.master_link_key()),
          v_expires, public.auth_person_id());
  return v_token;
end;
$$;
revoke execute on function public.issue_contact_link(uuid, uuid, timestamptz) from public, anon;
grant execute on function public.issue_contact_link(uuid, uuid, timestamptz) to authenticated;

-- « Révoquer » with its reason (rule 6): what the person deposited stays.
create function public.revoke_contact_link(p_link_id uuid, p_reason text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select project_id into v_project from public.project_contact_links
   where id = p_link_id and revoked_at is null for update;
  if v_project is null or not public.is_project_owner(v_project) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_reason is null or char_length(v_reason) > 1000 or v_reason = 'replaced' then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  update public.project_contact_links
     set revoked_at = now(), revoked_by = public.auth_person_id(), revoke_reason = v_reason
   where id = p_link_id;
end;
$$;
revoke execute on function public.revoke_contact_link(uuid, text) from public, anon;
grant execute on function public.revoke_contact_link(uuid, text) to authenticated;

-- « Marquer comme envoyé »: PDS OS does not send the e-mail itself.
create function public.mark_contact_link_sent(p_link_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_project uuid;
begin
  select project_id into v_project from public.project_contact_links
   where id = p_link_id and revoked_at is null for update;
  if v_project is null or not public.is_project_owner(v_project) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.project_contact_links
     set sent_at = now(), sent_by = public.auth_person_id()
   where id = p_link_id;
end;
$$;
revoke execute on function public.mark_contact_link_sent(uuid) from public, anon;
grant execute on function public.mark_contact_link_sent(uuid) to authenticated;

-- The active link's token, for the project's owner only (null otherwise).
create function public.contact_link_token(p_link_id uuid)
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
  if not found or v.revoked_at is not null or not public.is_project_owner(v.project_id) then
    return null;
  end if;
  return extensions.pgp_sym_decrypt(v.token_secret, public.master_link_key());
end;
$$;
revoke execute on function public.contact_link_token(uuid) from public, anon;
grant execute on function public.contact_link_token(uuid) to authenticated;

-- The open link behind a token (null when unknown, revoked or expired).
create function public.contact_link_of(p_token text)
returns public.project_contact_links
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.project_contact_links%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select * into v from public.project_contact_links
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if not found or v.revoked_at is not null or v.expires_at < now() then
    return null;
  end if;
  return v;
end;
$$;
revoke execute on function public.contact_link_of(text) from public, anon, authenticated;

-- The person opened their page: counted, never read as an answer.
create function public.note_contact_link_opened(p_token text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.project_contact_links%rowtype := public.contact_link_of(p_token);
begin
  if v.id is null then
    return;
  end if;
  update public.project_contact_links
     set first_opened_at = coalesce(first_opened_at, now()),
         last_opened_at = now(),
         open_count = open_count + 1
   where id = v.id;
end;
$$;
revoke execute on function public.note_contact_link_opened(text) from public;
grant execute on function public.note_contact_link_opened(text) to anon, authenticated;

-- 2 --------------------------------------------------------------------------

-- The workflow a call belongs to, by the step that holds it.
create function public.call_workflow(p_call_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.master_brief_calls x where x.call_id = p_call_id) then 'master'
    when exists (select 1 from public.production_calls x where x.call_id = p_call_id)
      or exists (select 1 from public.design_calls x where x.call_id = p_call_id)
      or exists (select 1 from public.strategy_calls x where x.call_id = p_call_id) then 'marketing'
    else 'framing'
  end;
$$;
revoke execute on function public.call_workflow(uuid) from public, anon, authenticated;

-- Everything this person has in this project. Each item: kind, id,
-- workflow, step, state (todo | waiting | done), due (a day), at (when it
-- reached them); a call carries what its card shows (detail). Objects of
-- another contact or project never appear; revoked ones neither.
create function public.contact_page_items(p_project_id uuid, p_contact_id uuid)
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
  )
  select coalesce(jsonb_agg(item order by at), '[]'::jsonb) from items;
$$;
revoke execute on function public.contact_page_items(uuid, uuid) from public, anon, authenticated;

-- 3 --------------------------------------------------------------------------

-- The person's page: its frame (project, artist, format, person, their
-- parts, the project's owner as « Votre contact chez PDS ») and their
-- objects. A closed link gives its state only.
create function public.get_contact_page(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.project_contact_links%rowtype;
  v_items jsonb;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select * into v from public.project_contact_links
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if not found then
    return null;
  end if;
  if v.revoked_at is not null then
    return jsonb_build_object('state', 'revoked');
  end if;
  if v.expires_at < now() then
    return jsonb_build_object('state', 'expired');
  end if;
  v_items := public.contact_page_items(v.project_id, v.contact_id);
  return (
    select jsonb_build_object(
      'state', 'open',
      'project', p.title,
      'artist', ar.name,
      'format', p.music_format,
      'person', nc.name,
      'roles', (select coalesce(jsonb_agg(distinct r), '[]'::jsonb) from (
                  select case i ->> 'kind'
                           when 'master' then i ->> 'step'
                           when 'split' then coalesce(nullif(btrim(i ->> 'role'), ''), 'split')
                           else i ->> 'kind' end as r
                    from jsonb_array_elements(v_items) i
                   where i ->> 'kind' <> 'call'
                  union
                  select 'production:' || x
                    from jsonb_array_elements(v_items) i,
                         jsonb_array_elements_text(coalesce(i -> 'roles', '[]'::jsonb)) x
                   where i ->> 'kind' = 'provider') roles),
      'owner', nullif(btrim(concat_ws(' ', o.first_name, o.last_name)), ''),
      'ownerRole', (select m.role from public.memberships m
                     where m.person_id = p.owner_person_id
                       and m.organization_id = p.organization_id
                       and m.status = 'approved'
                     limit 1),
      'expiresAt', v.expires_at,
      'items', v_items)
      from public.projects p
      join public.network_contacts nc on nc.id = v.contact_id
      left join public.artists ar on ar.id = p.artist_id
      left join public.people o on o.id = p.owner_person_id
     where p.id = v.project_id);
end;
$$;
revoke execute on function public.get_contact_page(text) from public;
grant execute on function public.get_contact_page(text) to anon, authenticated;

-- « Liens privés » of « Qui fait quoi »: the people outside the team who
-- have something in this project, how many of their objects wait for them,
-- and their current link (read by the select policy).
create function public.project_link_contacts(p_project_id uuid)
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
       where k.project_id = p_project_id and k.revoked_at is null)
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

-- A project's deletion takes the people's links with it (CLAUDE.md: every
-- table of a project in delete_project_row), before the project row.
create or replace function public.delete_project_row(p_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_calls uuid[];
  v_contracts uuid[];
  v_table text;
begin
  select coalesce(array_agg(id), '{}') into v_calls
    from public.calls where project_id = p_project_id;
  select coalesce(array_agg(id), '{}') into v_contracts
    from public.contracts where project_id = p_project_id;

  -- Tables of the abandoned "Cadrage intelligent" branch (04/10/2026), not
  -- created by these migrations but still present in some local databases:
  -- emptied for the project when they exist, children first.
  foreach v_table in array array['master_versions', 'master_workflows', 'brief_change_requests',
                                 'brief_versions'] loop
    if to_regclass('public.' || v_table) is not null then
      execute format('delete from public.%I where project_id = $1', v_table) using p_project_id;
    end if;
  end loop;

  -- Cadrage intelligent (20261006000101, 20261006000201): the plan names the
  -- brief (its items cascade), a deadline names a report item, a brief names
  -- its validation, so they go before those. framing_calls cascades with calls.
  delete from public.project_plans where project_id = p_project_id;
  delete from public.framing_deadlines where project_id = p_project_id;
  delete from public.framing_briefs where project_id = p_project_id;

  -- Children before parents: a NO ACTION key is checked after each
  -- statement. ON DELETE CASCADE children are left to their parent.
  delete from public.activity_events where project_id = p_project_id;
  delete from public.tasks where project_id = p_project_id;
  delete from public.budget_lines where project_id = p_project_id;
  delete from public.design_versions where project_id = p_project_id;
  delete from public.milestones where project_id = p_project_id;
  delete from public.strategy_deliverables where project_id = p_project_id;
  delete from public.levers where project_id = p_project_id;
  delete from public.needs where project_id = p_project_id;
  delete from public.field_values where project_id = p_project_id;
  delete from public.framing_constraints where project_id = p_project_id;
  delete from public.open_points where project_id = p_project_id;
  delete from public.project_team_members where project_id = p_project_id;

  delete from public.report_items
   where report_id in (select id from public.call_reports where call_id = any (v_calls));
  delete from public.call_reports where call_id = any (v_calls);
  delete from public.transcripts where call_id = any (v_calls);
  delete from public.calls where id = any (v_calls);

  delete from public.validations
   where project_stage_id in (select id from public.project_stages
                               where project_id = p_project_id);
  delete from public.project_stages where project_id = p_project_id;

  delete from public.legal_clearances where project_id = p_project_id;
  delete from public.legal_facts where project_id = p_project_id;
  delete from public.legal_answers where project_id = p_project_id;
  delete from public.legal_intakes where project_id = p_project_id;
  delete from public.legal_plan_events where project_id = p_project_id;
  delete from public.legal_plan_items where project_id = p_project_id;
  delete from public.legal_plans where project_id = p_project_id;
  delete from public.legal_form_submissions where project_id = p_project_id;
  delete from public.legal_forms where project_id = p_project_id;
  delete from public.legal_agreement_needs
   where project_id = p_project_id or contract_id = any (v_contracts);
  delete from public.legal_split_sheets where project_id = p_project_id;
  delete from public.legal_formalities where project_id = p_project_id;

  delete from public.legal_clearance_contracts where contract_id = any (v_contracts);
  delete from public.financial_needs
   where project_id = p_project_id or contract_id = any (v_contracts);
  delete from public.contract_files where contract_id = any (v_contracts);
  delete from public.contract_events
   where project_id = p_project_id or contract_id = any (v_contracts);
  delete from public.contracts where id = any (v_contracts);

  delete from public.project_files where project_id = p_project_id;
  delete from public.releases where project_id = p_project_id;
  delete from public.share_links where project_id = p_project_id;
  -- The people's private pages (20261019110101).
  delete from public.project_contact_links where project_id = p_project_id;

  -- The rest (masters link, team, transmissions, notifications, master
  -- brief and versions…) cascades.
  delete from public.projects where id = p_project_id;
end;
$function$;
