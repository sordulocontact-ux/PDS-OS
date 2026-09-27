-- Guided review of the Framing (one question at a time, docs/ARCHITECTURE.md § 6).
--
-- 1. A dictated constraint is written with source_type 'voice' (as needs and
--    team members are), which the original check refused.
-- 2. The owner may re-type a constraint line (budget, production…): an
--    imported one arrives as 'other'.
-- 3. The owner may tag a team member with one of the fixed roles
--    (lib/framing/team-roles.ts): role_key had no column grant yet.

alter table public.framing_constraints drop constraint framing_constraints_source_check;
alter table public.framing_constraints add constraint framing_constraints_source_check
  check (source_type in ('call', 'manual', 'import', 'voice'));

grant update (type) on public.framing_constraints to authenticated;

grant insert (role_key) on public.project_team_members to authenticated;
grant update (role_key) on public.project_team_members to authenticated;

-- 4. Like the Brief, needs and team (…001102_security_audit_fixes), the
--    constraint lines freeze once the Framing is submitted or validated.
create policy framing_constraints_framing_editable_insert on public.framing_constraints
  as restrictive for insert to authenticated
  with check (public.framing_is_editable(project_id));
create policy framing_constraints_framing_editable_update on public.framing_constraints
  as restrictive for update to authenticated
  using (public.framing_is_editable(project_id))
  with check (public.framing_is_editable(project_id));
