-- Strategy closed-choice questions (positioning, audiences, narrative).
--
-- Choices live in field_values (history and provenance for free):
--   <field>_choices      confirmed by the owner (source manual)
--   <field>_suggestions  pre-checked by PO (source suggestion), each choice with
--                        the Brief or call passage that justifies it, found
--                        verbatim by code before anything is stored.
-- A suggestion is proposed only (status 'proposed'): it never counts as a
-- choice until the owner accepts it. Writing follows the strategy rules
-- already in place (owner, stage in progress).

alter table public.field_values
  drop constraint field_values_source_check,
  add constraint field_values_source_check
    check (source_type in ('call', 'manual', 'import', 'voice', 'suggestion'));

-- A suggestion is always a proposal, never a confirmed value.
alter table public.field_values
  add constraint field_values_suggestion_proposed
    check (source_type <> 'suggestion' or status in ('proposed', 'rejected'));
