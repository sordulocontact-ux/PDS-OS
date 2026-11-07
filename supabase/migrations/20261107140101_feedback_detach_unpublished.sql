-- PO's grouping is switched off (lib/feedback/types.ts, FEEDBACK_GROUPED_BY_PO,
-- 07/11/2026). Before that, PO filed new feedback into topics already sent and
-- published: none of it reached Notion (12 in production, the pages being
-- already done there). Such feedback leaves its topic: back to waiting, it is
-- filed alone at the director's next visit (fileEachAlone), each a topic of
-- its own in « À examiner », to send like any other. A one-off data fix; the
-- feedback itself (author, message, screenshots, dates) is untouched, and
-- mark_feedback_edited leaves edited_at as it is.

update public.feedback f
   set topic_id = null
  from public.feedback_topics t
 where f.topic_id = t.id
   and f.organization_id = t.organization_id
   and t.status = 'sent'
   and t.notion_page_id is not null
   and t.notion_synced_at is not null
   and f.created_at > t.notion_synced_at;
