-- Sessions studio, refonte (retour d'Ibé du 06/11/2026, « Refonte du module
-- Sessions studio »): the report guides without becoming a questionnaire, a
-- free summary (report_notes, unchanged) with two short marks beside it,
-- « À retenir » and « Prochaine étape ». docs/ARCHITECTURE.md § 2 sexies bis.
--
-- A session's state (Prévue, En cours, Compte rendu à compléter, Terminée)
-- is computed by the code from its date, its hours and its report; only
-- « Annulée » stays stored (status = 'cancelled').

alter table public.master_sessions
  add column report_takeaways text,
  add column report_next_step text;
alter table public.master_sessions add constraint master_sessions_report_parts_check
  check (
    (report_takeaways is null or (btrim(report_takeaways) <> '' and char_length(report_takeaways) <= 2000))
    and (report_next_step is null or (btrim(report_next_step) <> '' and char_length(report_next_step) <= 2000))
  );
grant update (report_takeaways, report_next_step) on public.master_sessions to authenticated;

-- Who wrote the report and when: stamped when any of its parts changes,
-- cleared with its summary (the summary makes the report). Never set by the
-- client.
create or replace function public.master_sessions_stamp_report()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.report_notes is null then
    new.reported_at := null;
    new.reported_by := null;
  elsif new.report_notes is distinct from old.report_notes
     or new.report_takeaways is distinct from old.report_takeaways
     or new.report_next_step is distinct from old.report_next_step then
    new.reported_at := now();
    new.reported_by := public.auth_person_id();
  else
    new.reported_at := old.reported_at;
    new.reported_by := old.reported_by;
  end if;
  return new;
end;
$$;
