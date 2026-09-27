-- The author may change their own feedback after sending it: its kind, its
-- message, its screenshots (something to add, a screenshot forgotten). Nobody
-- else may, and nothing else changes: the author, the organization, the page
-- and the topic PO filed it in stay as they were. `edited_at` is set by the
-- database, and a feedback of a topic already on Notion then counts as "not
-- on Notion yet" (code), so the director can update the page.

alter table public.feedback add column edited_at timestamptz;

grant update (kind, message, screenshot_paths) on public.feedback to authenticated;

create policy feedback_update_author on public.feedback
  for update to authenticated
  using (created_by = public.auth_person_id()
         and public.is_active_member(organization_id))
  with check (created_by = public.auth_person_id()
              and public.is_active_member(organization_id));

-- Only a change of what the author wrote is an edit: file_feedback posing
-- the topic is not.
create or replace function public.mark_feedback_edited()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind is distinct from old.kind
     or new.message is distinct from old.message
     or new.screenshot_paths is distinct from old.screenshot_paths then
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;
  return new;
end;
$$;

revoke execute on function public.mark_feedback_edited() from public, anon, authenticated;

create trigger c_mark_edited before update on public.feedback
  for each row execute function public.mark_feedback_edited();

-- Screenshots added on edit point into the author's folder too.
drop trigger b_check_screenshot on public.feedback;
create trigger b_check_screenshot before insert or update of screenshot_paths on public.feedback
  for each row execute function public.check_feedback_screenshot();
