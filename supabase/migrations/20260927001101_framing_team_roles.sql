-- Fixed team roles for the Framing "Équipe projet" screen (docs/CONTEXTE-PROJET.md).
--
-- project_team_members stays a free list (a call may name someone with no
-- fixed role yet); role_key only tags a row as filling one of the roles the
-- code derives from confirmed needs (lib/framing/team-roles.ts). Nullable and
-- additive: existing rows, and manual additions with no fixed role, are
-- unaffected.

alter table public.project_team_members
  add column role_key text;

alter table public.project_team_members
  add constraint team_role_key_format check (role_key is null or role_key ~ '^[a-z][a-z_]*$');

-- At most one confirmed row per role: a role is either filled once or open.
create unique index team_role_key_unique
  on public.project_team_members (project_id, role_key)
  where role_key is not null and review_status <> 'rejected';
