-- Whoever works on a call may delete it, not the director alone (Akili,
-- 07/11/2026: « Ajouter l'option de pouvoir supprimer des call », asked again
-- after the director-only « Supprimer la réunion » of 20261105110101; Ibé,
-- 31/10: « Les utilisateurs demandent la possibilité de supprimer des
-- réunions »).
--
-- Allowed: the director (permission `archive_records`, as before) and the
-- call's owner (is_call_owner: the project's owner for a project's call, the
-- creator of an internal meeting), the person who already plans, edits and
-- records it. Everything else is unchanged: what goes with the call, and the
-- refusal `call_in_use` when a task, point or Master Brief still builds on it.

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
  if not (public.has_permission(v_org, 'archive_records')
          or public.is_call_owner(p_call_id)) then
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
