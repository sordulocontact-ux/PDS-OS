-- Feedback grouped into topics, so the director reads each problem once.
--   * Reading everyone's feedback becomes its own permission, `read_feedback`,
--     held by the general director only. Everyone else reads their own.
--   * A topic gathers similar feedback. PO proposes the grouping and writes
--     the topic's title and summary; the feedback itself is never changed, so
--     every original stays readable when PO groups wrongly.
--   * Filing is done through file_feedback() only, by whoever holds
--     read_feedback, with their own session (never the service role).

-- ---------------------------------------------------------------------------
-- Permission
-- ---------------------------------------------------------------------------

create or replace function public.role_permissions(p_role text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'general_director' then
      array['administer', 'assign_projects', 'validate', 'manage_catalog', 'create_projects',
            'view_all_projects', 'archive_records', 'read_feedback']
    when 'project_manager' then array['pilot_projects', 'manage_catalog']
    when 'creative_director' then array['creative_work']
    else array[]::text[]
  end;
$$;

drop policy feedback_select_own_or_admin on public.feedback;
create policy feedback_select_own_or_reader on public.feedback
  for select to authenticated
  using (created_by = public.auth_person_id()
         or public.has_permission(organization_id, 'read_feedback'));

-- ---------------------------------------------------------------------------
-- Topics
-- ---------------------------------------------------------------------------

create table public.feedback_topics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  -- The kind of the feedback that opened the topic.
  kind text not null,
  -- Written by PO from the feedback it gathers.
  title text not null,
  summary text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feedback_topics_kind_check check (kind in ('bug', 'idea', 'other')),
  constraint feedback_topics_title_not_blank check (btrim(title) <> ''),
  constraint feedback_topics_title_length check (char_length(title) <= 200),
  constraint feedback_topics_summary_not_blank check (btrim(summary) <> ''),
  constraint feedback_topics_summary_length check (char_length(summary) <= 2000),
  constraint feedback_topics_id_org_key unique (id, organization_id)
);

create index feedback_topics_organization_idx
  on public.feedback_topics (organization_id, updated_at desc);

create trigger a_set_updated_at before update on public.feedback_topics
  for each row execute function public.set_updated_at();

-- Null until PO has filed it: "waiting to be sorted".
alter table public.feedback add column topic_id uuid;
alter table public.feedback
  add constraint feedback_topic_same_org
    foreign key (topic_id, organization_id)
    references public.feedback_topics (id, organization_id);
create index feedback_topic_idx on public.feedback (topic_id);
create index feedback_unfiled_idx on public.feedback (organization_id, created_at)
  where topic_id is null;

alter table public.feedback_topics enable row level security;
alter table public.feedback_topics force row level security;
revoke all on table public.feedback_topics from anon, authenticated;
grant select on table public.feedback_topics to authenticated;

create policy feedback_topics_select_reader on public.feedback_topics
  for select to authenticated
  using (public.has_permission(organization_id, 'read_feedback'));

-- ---------------------------------------------------------------------------
-- file_feedback: files one feedback into a topic
-- ---------------------------------------------------------------------------

-- p_topic null opens a new topic with p_title / p_summary; otherwise the
-- feedback joins p_topic, whose summary becomes p_summary when given (the
-- title stays). Already filed (a second tab got there first): nothing
-- changes and the topic it is in is returned.
create or replace function public.file_feedback(
  p_feedback uuid,
  p_topic uuid default null,
  p_title text default null,
  p_summary text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_feedback public.feedback%rowtype;
  v_topic uuid;
begin
  select * into v_feedback from public.feedback where id = p_feedback for update;
  if not found then
    raise exception 'feedback_not_found';
  end if;
  if not public.has_permission(v_feedback.organization_id, 'read_feedback') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_feedback.topic_id is not null then
    return v_feedback.topic_id;
  end if;

  if p_topic is null then
    insert into public.feedback_topics (organization_id, kind, title, summary)
    values (v_feedback.organization_id, v_feedback.kind, btrim(p_title), btrim(p_summary))
    returning id into v_topic;
  else
    update public.feedback_topics
       set summary = coalesce(nullif(btrim(p_summary), ''), summary)
     where id = p_topic and organization_id = v_feedback.organization_id
    returning id into v_topic;
    if v_topic is null then
      raise exception 'topic_not_found';
    end if;
  end if;

  update public.feedback set topic_id = v_topic where id = p_feedback;
  return v_topic;
end;
$$;

revoke execute on function public.file_feedback(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.file_feedback(uuid, uuid, text, text) to authenticated;
