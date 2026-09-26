-- Levers can come from a dictation, like needs and the Brief (…000101_voice_source):
-- the strategy dictation proposes a lever, the owner applies it after review.
alter table public.levers drop constraint levers_source_check;
alter table public.levers
  add constraint levers_source_check check (source_type in ('call', 'manual', 'import', 'voice'));
