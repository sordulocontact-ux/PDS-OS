-- Retours Marketing du 12/10/2026, MKT-C2-05 (docs/ARCHITECTURE.md § 8 decies,
-- « Échanges créatifs »).
--
--   1. The Conception may start without a creative exchange, but says why:
--      « Commencer sans échange » keeps its reason, shown on the step it
--      passes over.
--   2. An action of a call report becomes one task at most: replaying the
--      conversion (two clicks, two tabs) never makes a second one.

alter table public.design_workspaces
  add column no_exchange_reason text,
  add constraint design_workspaces_no_exchange_length
    check (char_length(coalesce(no_exchange_reason, '')) <= 1000);

-- « Commencer sans échange »: start_design, then the reason. The owner only
-- (start_design checks it), the reason written, never empty.
create or replace function public.start_design_without_exchange(
  p_project_id uuid,
  p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_reason is null or char_length(v_reason) > 1000 then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  perform public.start_design(p_project_id);
  update public.design_workspaces
     set no_exchange_reason = v_reason
   where project_id = p_project_id;
end;
$$;
revoke execute on function public.start_design_without_exchange(uuid, text) from public, anon;
grant execute on function public.start_design_without_exchange(uuid, text) to authenticated;

create unique index if not exists tasks_source_report_item_key
  on public.tasks (source_report_item_id)
  where source_report_item_id is not null;
