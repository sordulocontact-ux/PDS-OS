-- Delete a meeting or a call for good (Ibé, tests of 31/10-02/11/2026:
-- « Les utilisateurs demandent la possibilité de supprimer des réunions »).
--
-- Same rule as delete_records (20261006000301): the director (permission
-- `archive_records`) only, never a call that something else still builds on.
-- The call goes with what belongs to it alone: its attendees, guests,
-- recording takes (their pieces cascade), transcripts and reports with their
-- items. Everything that cascades from the call (framing, strategy, design,
-- production links, closures, summaries) follows; production call items keep
-- their line (call_id set to null). Left as is, so the delete is refused with
-- `call_in_use`: a task, need, open point or other row born from one of its
-- report items, and a Master Brief built on it (master_brief_calls).
-- Audio objects in the `call-audio` bucket are left for the Storage cleanup.

create or replace function public.delete_call(p_call_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select c.organization_id into v_org
    from public.calls c
   where c.id = p_call_id
     and public.can_see_call(c.id);
  if v_org is null then
    raise exception 'not_found';
  end if;
  if not public.has_permission(v_org, 'archive_records') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  begin
    delete from public.report_items
     where report_id in (select id from public.call_reports where call_id = p_call_id);
    delete from public.call_reports where call_id = p_call_id;
    delete from public.transcripts where call_id = p_call_id;
    delete from public.call_attendees where call_id = p_call_id;
    delete from public.call_guests where call_id = p_call_id;
    delete from public.call_recording_takes where call_id = p_call_id;
    delete from public.calls where id = p_call_id;
  exception
    when foreign_key_violation then
      raise exception 'call_in_use';
  end;
end;
$$;

revoke execute on function public.delete_call(uuid) from public, anon;
grant execute on function public.delete_call(uuid) to authenticated;
