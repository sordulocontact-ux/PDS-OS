-- Budget, four states (ticket "Workflow Master", § 9; docs/ARCHITECTURE.md
-- § 8 ter and § 8 septies). A line goes Estimé (planned) → Proposé
-- (proposed: a quote received, not accepted) → Engagé (committed: accepted)
-- → Payé. A proposed amount does not consume the envelope: the remainder
-- stays envelope minus committed (computed by code, lib/budget/types.ts).
--
-- A line may stand for the mix or the mastering of the project's Brief
-- Mix/Master (`master_role`): one per role, created from the brief by the
-- owner, followed in the Budget like any other line.

alter table public.budget_lines drop constraint budget_lines_status_check;
alter table public.budget_lines add constraint budget_lines_status_check
  check (status in ('planned', 'proposed', 'committed', 'paid'));

alter table public.budget_lines
  add column master_role text,
  add constraint budget_lines_master_role_check
    check (master_role is null or master_role in ('mix', 'mastering'));

create unique index budget_lines_master_role_key
  on public.budget_lines (project_id, master_role)
  where master_role is not null;

-- Set when the line is created from the brief, never moved afterwards.
grant insert (master_role) on public.budget_lines to authenticated;
