-- Projet collectif, lot 9 (docs/pds-mic-plan.md § 6, risque 5): an
-- abandoned title leaves the counts of « all the titles ». Its master stays
-- linked (project_masters), its versions and history are kept, its
-- reactivation brings it back. The Master's steps and state and the
-- Distribution's checks read the titles in code (countedTitlesProject); the
-- engineer's invoice is asked here:
--
--   1. request_project_master_invoices: each external engineer once every
--      title of the round has its Master final, the abandoned titles of a
--      collective left out, at least one Master final validated. Called by
--      the approval of a Master final (as before) and by the abandonment of
--      a title, which can be the last one waiting: the invoice then leaves.
--   2. abandon_project_title: as 20261111120101, then the invoices.
--
-- Any other project has no abandoned title: unchanged. No table added.

-- 1 ------------------------------------------------------------------------------------------
create or replace function public.request_project_master_invoices(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.project_invoices%rowtype;
begin
  -- The titles of the round: those with a version, less the abandoned ones.
  if not exists (
       select 1 from public.master_mix_versions mv
        where mv.project_id = p_project_id
          and mv.stage = 'mastering' and mv.decision = 'approved'
          and not exists (select 1 from public.project_titles t
                           where t.project_id = p_project_id and t.master_id = mv.master_id
                             and t.status = 'abandoned'))
     or exists (
       select 1 from public.project_masters pm
        where pm.project_id = p_project_id
          and not exists (select 1 from public.project_titles t
                           where t.project_id = p_project_id and t.master_id = pm.master_id
                             and t.status = 'abandoned')
          and exists (select 1 from public.master_mix_versions mv
                       where mv.project_id = p_project_id and mv.master_id = pm.master_id)
          and not exists (select 1 from public.master_mix_versions mv
                           where mv.project_id = p_project_id and mv.master_id = pm.master_id
                             and mv.stage = 'mastering' and mv.decision = 'approved')) then
    return;
  end if;
  for v in
    insert into public.project_invoices (organization_id, project_id, contact_id, origin)
    select distinct t.organization_id, t.project_id, t.contact_id, 'master'
      from public.master_transmissions t
     where t.project_id = p_project_id
       and cardinality(coalesce(public.master_contact_roles(t.project_id, t.contact_id), '{}')) > 0
    on conflict (project_id, contact_id) where origin = 'master' do nothing
    returning *
  loop
    perform public.link_master_invoice_lines(v);
  end loop;
end;
$$;
revoke execute on function public.request_project_master_invoices(uuid) from public, anon, authenticated;

-- As 20261020060101: on the approval of a Master final.
create or replace function public.request_master_invoices()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.stage <> 'mastering' or new.decision is distinct from 'approved'
     or old.decision is not distinct from 'approved' then
    return null;
  end if;
  perform public.request_project_master_invoices(new.project_id);
  return null;
end;
$$;

-- 2 ------------------------------------------------------------------------------------------
create or replace function public.abandon_project_title(
  p_title_id uuid,
  p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title public.project_titles%rowtype;
  v_reason text := nullif(btrim(p_reason), '');
  v_current text;
  -- The maquette's status this abandonment changes, if it changes one.
  v_demo text;
begin
  v_title := public.lock_project_title(p_title_id);
  if v_title.status = 'abandoned' then
    raise exception 'title_abandoned' using errcode = 'P0001';
  end if;
  if v_reason is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  if char_length(v_reason) > 2000 then
    raise exception 'reason_too_long' using errcode = '22023';
  end if;
  if v_title.master_id is not null then
    select m.demo_status into v_current from public.masters m
     where m.id = v_title.master_id and m.archived_at is null
       for update;
    if v_current in ('draft', 'developing') then
      update public.masters set demo_status = 'abandoned' where id = v_title.master_id;
      v_demo := v_current;
    end if;
  end if;
  update public.project_titles
     set status = 'abandoned',
         abandoned_at = now(),
         abandoned_by = public.auth_person_id(),
         abandon_reason = v_reason,
         demo_status_before_abandon = v_demo
   where id = p_title_id;
  perform public.log_project_title_event(p_title_id, 'abandoned',
    jsonb_build_object('reason', v_reason, 'demo_status', v_demo));
  -- The last title waiting for its Master final may be this one (lot 9).
  perform public.request_project_master_invoices(v_title.project_id);
end;
$$;
revoke execute on function public.abandon_project_title(uuid, text) from public, anon;
grant execute on function public.abandon_project_title(uuid, text) to authenticated;
