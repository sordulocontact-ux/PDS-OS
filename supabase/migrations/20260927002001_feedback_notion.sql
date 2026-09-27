-- A sent topic is also published to a Notion database, for the people who
-- build the app (lib/integrations/notion.ts). The page is created by the
-- server with the app's Notion token when the director sends the topic, then
-- updated on a new priority or new feedback; what the database keeps is only
-- where the page is and when it was last updated, recorded through
-- record_feedback_notion() with the director's session.

alter table public.feedback_topics
  add column notion_page_id text,
  add column notion_url text,
  add column notion_synced_at timestamptz,
  add constraint feedback_topics_notion_page_id_length
    check (notion_page_id is null or char_length(notion_page_id) <= 64),
  add constraint feedback_topics_notion_url_format
    check (notion_url is null or (notion_url like 'https://%' and char_length(notion_url) <= 500));

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
         notion_synced_at = now()
   where id = p_topic;
end;
$$;

revoke execute on function public.record_feedback_notion(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_feedback_notion(uuid, text, text) to authenticated;
