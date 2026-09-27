-- The director reviews the team's feedback and sends what matters to the
-- people who build the app.
--   * A topic is `new` (to review), `sent` (with a priority chosen by the
--     director: low, normal, high) or `dismissed`. Changes go through
--     review_feedback_topic() only; the priority is a human decision, never
--     PO's.
--   * A dismissed topic that gathers a new feedback is back to review
--     (file_feedback): a new voice on it deserves a look.
--   * A feedback may carry a screenshot, uploaded by its author to the private
--     `feedback-screenshots` bucket under "<organization_id>/<person_id>/…".

-- ---------------------------------------------------------------------------
-- Review of a topic
-- ---------------------------------------------------------------------------

alter table public.feedback_topics
  add column status text not null default 'new',
  add column priority text,
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.people (id),
  add constraint feedback_topics_status_check check (status in ('new', 'sent', 'dismissed')),
  add constraint feedback_topics_priority_check
    check (priority is null or priority in ('low', 'normal', 'high')),
  add constraint feedback_topics_sent_has_priority check (status <> 'sent' or priority is not null);

create or replace function public.review_feedback_topic(
  p_topic uuid,
  p_action text,
  p_priority text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_topic public.feedback_topics%rowtype;
begin
  select * into v_topic from public.feedback_topics where id = p_topic for update;
  if not found then
    raise exception 'topic_not_found';
  end if;
  if not public.has_permission(v_topic.organization_id, 'read_feedback') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_action in ('send', 'prioritize')
     and (p_priority is null or p_priority not in ('low', 'normal', 'high')) then
    raise exception 'priority_required';
  end if;

  case p_action
    when 'send' then
      if v_topic.status = 'sent' then raise exception 'invalid_transition'; end if;
      update public.feedback_topics
         set status = 'sent', priority = p_priority,
             reviewed_at = now(), reviewed_by = public.auth_person_id()
       where id = p_topic;
    when 'prioritize' then
      if v_topic.status <> 'sent' then raise exception 'invalid_transition'; end if;
      update public.feedback_topics set priority = p_priority where id = p_topic;
    when 'dismiss' then
      if v_topic.status <> 'new' then raise exception 'invalid_transition'; end if;
      update public.feedback_topics
         set status = 'dismissed', priority = null,
             reviewed_at = now(), reviewed_by = public.auth_person_id()
       where id = p_topic;
    when 'reopen' then
      if v_topic.status <> 'dismissed' then raise exception 'invalid_transition'; end if;
      update public.feedback_topics
         set status = 'new', reviewed_at = null, reviewed_by = null
       where id = p_topic;
    else
      raise exception 'invalid_action';
  end case;
end;
$$;

revoke execute on function public.review_feedback_topic(uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_feedback_topic(uuid, text, text) to authenticated;

-- Same as before, plus: joining a dismissed topic brings it back to review.
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
       set summary = coalesce(nullif(btrim(p_summary), ''), summary),
           status = case when status = 'dismissed' then 'new' else status end,
           reviewed_at = case when status = 'dismissed' then null else reviewed_at end,
           reviewed_by = case when status = 'dismissed' then null else reviewed_by end
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

-- ---------------------------------------------------------------------------
-- Screenshot of a feedback
-- ---------------------------------------------------------------------------

alter table public.feedback
  add column screenshot_path text,
  add constraint feedback_screenshot_path_length
    check (screenshot_path is null or char_length(screenshot_path) <= 300);

grant insert (screenshot_path) on public.feedback to authenticated;

-- A feedback only points to a screenshot its author uploaded, in its
-- organization. Runs after a_set_created_by (triggers fire by name).
create or replace function public.check_feedback_screenshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.screenshot_path is not null and (
       split_part(new.screenshot_path, '/', 1) <> new.organization_id::text
       or split_part(new.screenshot_path, '/', 2) <> new.created_by::text
       or new.screenshot_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$') then
    raise exception 'invalid_screenshot_path';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_feedback_screenshot() from public, anon, authenticated;

create trigger b_check_screenshot before insert on public.feedback
  for each row execute function public.check_feedback_screenshot();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback-screenshots', 'feedback-screenshots', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- The author uploads into their own folder; the author and the director
-- read. Never replaced nor deleted, like the feedback itself.
create policy feedback_screenshots_insert_author
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'feedback-screenshots'
    and public.is_active_member(public.try_uuid((storage.foldername(name))[1]))
    and (storage.foldername(name))[2] = public.auth_person_id()::text
  );

create policy feedback_screenshots_select_author_or_reader
  on storage.objects for select to authenticated
  using (
    bucket_id = 'feedback-screenshots'
    and ((storage.foldername(name))[2] = public.auth_person_id()::text
         or public.has_permission(public.try_uuid((storage.foldername(name))[1]), 'read_feedback'))
  );
