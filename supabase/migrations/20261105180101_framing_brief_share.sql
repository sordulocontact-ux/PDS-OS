-- « Copier le lien » of the Brief de cadrage gives a link to its PDF, one
-- that can be sent (retour d'Ibé du 02/11/2026 ; Sacha 05/11/2026 : « toujours
-- vers la dernière version »). One public link per project, created once and
-- reused (share_links, like the Plan de sortie's /d/), that always opens the
-- latest version sent to the direction, whatever its state: the PDF says
-- « En attente de validation » or « Validée ».
--
-- Made by the project's owner or the direction (who send and validate the
-- Brief), only once a version was sent. Read without an account through
-- get_shared_framing_brief: the database checks the token, its expiry and
-- its revocation.

alter table public.share_links drop constraint if exists share_links_scope_check;
alter table public.share_links add constraint share_links_scope_check
  check (scope in ('brief', 'strategy', 'design_doc', 'release_plan', 'press_kit',
                   'framing_brief'));

create or replace function public.share_framing_brief(p_project_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
  v_token uuid;
begin
  select * into v_project from public.projects where id = p_project_id;
  if not found or not public.can_see_project(p_project_id) then
    raise exception 'project_not_found';
  end if;
  if not (public.is_project_owner(p_project_id)
          or public.has_permission(v_project.organization_id, 'validate')) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.framing_briefs
                  where project_id = p_project_id and sent_at is not null) then
    raise exception 'brief_not_sent';
  end if;
  select token into v_token from public.share_links
   where project_id = p_project_id and scope = 'framing_brief'
     and revoked_at is null
     and (expires_at is null or expires_at > now())
   limit 1;
  if v_token is null then
    insert into public.share_links (organization_id, project_id, scope, created_by)
    values (v_project.organization_id, p_project_id, 'framing_brief', public.auth_person_id())
    returning token into v_token;
  end if;
  return v_token;
end;
$$;

-- The only way anon reads a Brief de cadrage: by its link, while the link
-- lives, and only the latest version sent.
create or replace function public.get_shared_framing_brief(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'version', b.version,
    'state', b.state,
    'sent_at', b.sent_at,
    'decided_at', b.decided_at,
    'content', b.content)
  from public.share_links l
  join lateral (
    select fb.version, fb.state, fb.sent_at, fb.decided_at, fb.content
      from public.framing_briefs fb
     where fb.project_id = l.project_id and fb.sent_at is not null
     order by fb.version desc
     limit 1
  ) b on true
  where l.token = p_token
    and l.scope = 'framing_brief'
    and l.revoked_at is null
    and (l.expires_at is null or l.expires_at > now());
$$;

revoke execute on function public.share_framing_brief(uuid) from public, anon;
revoke execute on function public.get_shared_framing_brief(uuid) from public;
grant execute on function public.share_framing_brief(uuid) to authenticated;
grant execute on function public.get_shared_framing_brief(uuid) to anon, authenticated;
