-- Production › the preproduction plan proposed by code (Ibé's tests of
-- 13/10, PROD-006, PROD-010): each proposed action keeps the key of the
-- step it comes from, so the plan is never proposed twice and its due
-- dates are recomputed from the shoot and delivery dates — after a
-- person's confirmation, never silently. Written by the owner (the plan's
-- RLS); the dates are code's, never a model's (CLAUDE.md, rule 6).

alter table public.production_plan_actions
  add column template_key text,
  add constraint production_plan_actions_template_check
    check (template_key is null or template_key ~ '^[a-z_]{1,40}$');
create unique index production_plan_actions_template_idx
  on public.production_plan_actions (sheet_id, template_key)
  where template_key is not null;

grant insert (template_key) on public.production_plan_actions to authenticated;
