-- The director edits a topic before sending it: kind, title, summary. PO may
-- propose a rewrite, but only the director saves it, with their session.
--   * Allowed while the topic is not sent (to review or dismissed).
--   * edited_at / edited_by say a person wrote the current text: the page
--     shows it instead of "written by PO".
--   * Once edited, PO no longer rewrites the summary when a new feedback
--     joins (file_feedback): a human text is never replaced silently. The
--     new feedback is still counted and readable under the topic.

alter table public.feedback_topics
  add column edited_at timestamptz,
  add column edited_by uuid references public.people (id);

create or replace function public.edit_feedback_topic(
  p_topic uuid,
  p_kind text,
  p_title text,
  p_summary text
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
  if v_topic.status = 'sent' then
    raise exception 'topic_already_sent';
  end if;

  -- Blank, too long or unknown values are refused by the table's constraints.
  update public.feedback_topics
     set kind = p_kind, title = btrim(p_title), summary = btrim(p_summary),
         edited_at = now(), edited_by = public.auth_person_id()
   where id = p_topic;
end;
$$;

revoke execute on function public.edit_feedback_topic(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.edit_feedback_topic(uuid, text, text, text) to authenticated;

-- Same as 20260927001001, plus: the summary of a topic a person edited stays.
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
       set summary = case when edited_by is null
                          then coalesce(nullif(btrim(p_summary), ''), summary)
                          else summary end,
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
