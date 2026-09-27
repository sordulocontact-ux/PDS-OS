-- A feedback carries up to 5 screenshots instead of one (dropped in the
-- feedback window, picked or pasted). Same bucket, same folders, same rule:
-- every path points into its author's folder, checked by the database.

alter table public.feedback
  add column screenshot_paths text[] not null default '{}',
  add constraint feedback_screenshot_paths_count
    check (cardinality(screenshot_paths) <= 5);

update public.feedback
  set screenshot_paths = array[screenshot_path]
  where screenshot_path is not null;

drop trigger b_check_screenshot on public.feedback;

alter table public.feedback drop column screenshot_path;

grant insert (screenshot_paths) on public.feedback to authenticated;

-- Runs after a_set_created_by (triggers fire by name).
create or replace function public.check_feedback_screenshot()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_path text;
begin
  foreach v_path in array new.screenshot_paths loop
    if v_path is null
       or split_part(v_path, '/', 1) <> new.organization_id::text
       or split_part(v_path, '/', 2) <> new.created_by::text
       or v_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' then
      raise exception 'invalid_screenshot_path';
    end if;
  end loop;
  return new;
end;
$$;

revoke execute on function public.check_feedback_screenshot() from public, anon, authenticated;

create trigger b_check_screenshot before insert on public.feedback
  for each row execute function public.check_feedback_screenshot();
