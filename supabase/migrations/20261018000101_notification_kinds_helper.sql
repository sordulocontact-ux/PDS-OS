-- One way to add notification kinds (projet complet, 18/10/2026). Several
-- migrations used to re-read notifications_kind_check with a regular
-- expression and rebuild it; Postgres prints the check either as
-- ARRAY['a'::text, …] or as '{a,b}'::text[], and a parser that missed one form
-- rebuilt the list with only its own kinds, breaking every other trigger.
-- From now on a migration calls add_notification_kinds(array[…]): it reads
-- every kind name in the current definition, whatever its form, adds the new
-- ones and rebuilds the check once.

create or replace function public.add_notification_kinds(p_kinds text[])
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_def text;
  v_kinds text[];
begin
  select pg_get_constraintdef(oid) into v_def
    from pg_constraint
   where conrelid = 'public.notifications'::regclass
     and conname = 'notifications_kind_check';
  select coalesce(array_agg(distinct m[1]), '{}') into v_kinds
    from regexp_matches(coalesce(v_def, ''), '([a-z][a-z0-9_]*)', 'g') as m
   where m[1] not in ('kind', 'text', 'any', 'array');
  select array_agg(distinct k order by k) into v_kinds
    from unnest(v_kinds || p_kinds) as k;
  alter table public.notifications drop constraint if exists notifications_kind_check;
  execute format(
    'alter table public.notifications add constraint notifications_kind_check
       check (kind = any (%L::text[])) not valid', v_kinds);
end;
$$;

revoke all on function public.add_notification_kinds(text[]) from public, anon, authenticated;

-- Every kind known on 18/10/2026 (main + the projet complet lots), so that a
-- base broken by an earlier rebuild is whole again.
select public.add_notification_kinds(array['brief_approved','call_invited','call_report_shared','call_summary_sent','clearance_terms_proposed','clearance_terms_rejected','clearance_terms_validated','contract_approved','contract_changes_requested','contract_review_requested','design_submission_decided','design_submission_requested','design_version_approved','design_version_changes_requested','design_version_discarded','design_version_submitted','distribution_closure_decided','distribution_closure_proposed','distribution_version_decided','distribution_version_submitted','legal_form_received','master_delivery_received','master_engineer_signal','master_final_approved','master_mastering_changes_requested','master_mastering_delivery_received','master_mastering_version_received','master_mix_approved','master_mix_changes_requested','master_mix_version_received','master_source_detected','master_transmission_received','master_version_submitted','meeting_invited','production_call_sheet_published','production_corrections_sent','production_direction_decided','production_direction_submitted','production_export_deposited','production_handed_off','production_organized','production_quote_decided','production_quote_deposited','production_quote_submitted','production_shoot_started','production_step_done','production_version_submitted','project_accepted','project_clarification_requested','project_creative_added','project_launched','project_refused','project_transmitted','step_blocker_lifted','step_blocker_reported','step_note_to_decide','strategy_review_approved','strategy_review_changes_requested','strategy_review_reminder','strategy_review_requested','task_assigned','validation_approved','validation_rejected','validation_requested']);
