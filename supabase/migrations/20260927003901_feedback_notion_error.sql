-- Why a sent topic is not on Notion, kept until it is: the director sees the
-- reason on the topic (a missing setting, a refused token, a database not
-- shared with the integration, a missing column…), not just "failed".
-- Written by record_feedback_notion_error(), cleared by a successful
-- record_feedback_notion(); both with the director's session.

alter table public.feedback_topics
  add column notion_error text,
  add constraint feedback_topics_notion_error_length
    check (notion_error is null or char_length(notion_error) <= 500);

create or replace function public.record_feedback_notion_error(
  p_topic uuid,
  p_error text
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

  update public.feedback_topics
     set notion_error = left(btrim(p_error), 500)
   where id = p_topic;
end;
$$;

revoke execute on function public.record_feedback_notion_error(uuid, text) from public, anon, authenticated;
grant execute on function public.record_feedback_notion_error(uuid, text) to authenticated;

-- Same as 20260927002001, plus: a success clears the last error.
create or replace function public.record_feedback_notion(
  p_topic uuid,
  p_page_id text,
  p_url text default null
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
  if v_topic.status <> 'sent' then
    raise exception 'topic_not_sent';
  end if;
  -- A topic has one Notion page: once known, it never changes.
  if v_topic.notion_page_id is not null and v_topic.notion_page_id <> p_page_id then
    raise exception 'notion_page_mismatch';
  end if;

  update public.feedback_topics
     set notion_page_id = p_page_id,
         notion_url = coalesce(p_url, notion_url),
         notion_synced_at = now(),
         notion_error = null
   where id = p_topic;
end;
$$;
