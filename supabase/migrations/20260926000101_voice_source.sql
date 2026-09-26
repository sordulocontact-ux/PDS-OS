-- Dictation: a value can come from the voice of a member, accepted by them.
--
-- The audio is never stored; source_quote keeps the dictated words that
-- justify the value, and created_by (set by trigger) says who dictated it.
-- A dictated row never points to a call report item.

alter table public.field_values
  drop constraint field_values_source_check,
  add constraint field_values_source_check
    check (source_type in ('call', 'manual', 'import', 'voice'));

alter table public.needs
  drop constraint needs_source_check,
  add constraint needs_source_check
    check (source_type in ('call', 'manual', 'import', 'voice'));

alter table public.project_team_members
  drop constraint team_source_check,
  add constraint team_source_check
    check (source_type in ('call', 'manual', 'import', 'voice'));
