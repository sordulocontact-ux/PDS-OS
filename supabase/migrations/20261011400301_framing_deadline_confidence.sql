-- PROJ-UX-05: a deadline of the Cadrage says how sure it is. « Ferme » (a
-- date decided, the default, as every deadline so far) or « estimée » (a
-- target that may move); the workflow it feeds is said by code from its kind.
alter table public.framing_deadlines
  add column confidence text not null default 'firm',
  add constraint framing_deadlines_confidence_check
    check (confidence in ('firm', 'estimated'));
grant insert (confidence), update (confidence) on public.framing_deadlines to authenticated;
