-- Retours Marketing du 12/10/2026, MKT-C2-09 (docs/ARCHITECTURE.md § 8 decies,
-- « Références, moodboards, propositions »).
--
--   1. Every element gathered in the Conception says what it is: a
--      reference (a source of inspiration) or a moodboard (an organised
--      selection, with its intention); the creative proposals stay
--      design_versions, the work versions belong to Production. Elements
--      gathered before this rule could not be told apart: « à qualifier ».
--   2. Its rights of use: inspiration only, free to use, licensed, to
--      license, or owned by the project.
--   3. A reference may sit in a moodboard of the same project.

alter table public.design_references
  add column type text not null default 'to_qualify',
  add column usage text,
  add column moodboard_id uuid references public.design_references (id) on delete set null,
  add constraint design_references_type_check
    check (type in ('reference', 'moodboard', 'to_qualify')),
  add constraint design_references_usage_check
    check (usage is null or usage in ('inspiration', 'free', 'licensed', 'to_license', 'owned')),
  add constraint design_references_not_own_moodboard check (moodboard_id is distinct from id);
grant insert (type, usage, moodboard_id), update (type, usage, moodboard_id)
  on public.design_references to authenticated;

-- A moodboard holds references of its own project, never another moodboard.
create or replace function public.design_references_moodboard_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.moodboard_id is not null and (new.type = 'moodboard' or not exists (
    select 1 from public.design_references m
     where m.id = new.moodboard_id and m.project_id = new.project_id
       and m.type = 'moodboard')) then
    raise exception 'invalid_moodboard' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger b_moodboard_check before insert or update of moodboard_id, type
  on public.design_references
  for each row execute function public.design_references_moodboard_check();
