-- PO reads a rights holder's reply as soon as « Négocier » opens (Sacha, 09/11/2026: « pk PO
-- ne lit pas direct la réponse ? »). The reply arrives by the cron, which has no member
-- (no quota, no rights): the first person who opens the step has it read with their session,
-- and the reading is kept with the reply, so the next ones see it without a new call. It is
-- only a proposal: nothing is applied until « Envoyer à la direction ».

alter table public.legal_clearance_communications
  add column reading jsonb,
  add constraint legal_clearance_communications_reading_check
    check (reading is null or (jsonb_typeof(reading) = 'object'
                               and pg_column_size(reading) <= 20000));

-- The first reading of a reply received is kept; never replaced.
create or replace function public.keep_clearance_reading(
  p_communication_id uuid,
  p_reading jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_comm public.legal_clearance_communications%rowtype;
  v public.legal_clearances%rowtype;
begin
  select * into v_comm from public.legal_clearance_communications where id = p_communication_id;
  if not found then
    raise exception 'clearance_communication_missing' using errcode = 'P0001';
  end if;
  v := public.clearance_for_write(v_comm.clearance_id);
  if p_reading is null or jsonb_typeof(p_reading) <> 'object' then
    raise exception 'clearance_reading_invalid' using errcode = 'P0001';
  end if;
  update public.legal_clearance_communications
     set reading = p_reading
   where id = p_communication_id and direction = 'in' and reading is null;
end;
$$;

revoke execute on function public.keep_clearance_reading(uuid, jsonb) from public, anon;
grant execute on function public.keep_clearance_reading(uuid, jsonb) to authenticated;
