-- Saves a call report and all its items in one transaction: a failure leaves
-- nothing behind (no report without items).
-- SECURITY INVOKER: runs with the caller's rights, so RLS and column grants
-- apply exactly as for direct inserts.

create or replace function public.save_call_report(
  p_call_id uuid,
  p_transcript_id uuid,
  p_summary text,
  p_provider text,
  p_model text,
  p_items jsonb,
  p_processing_ms integer default null,
  p_input_tokens integer default null,
  p_output_tokens integer default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
  v_report_id uuid;
begin
  select c.organization_id into v_org from public.calls c where c.id = p_call_id;
  if not found then
    raise exception 'call_not_found';
  end if;
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid_items';
  end if;

  insert into public.call_reports
    (organization_id, call_id, transcript_id, summary, provider, model,
     processing_ms, input_tokens, output_tokens)
  values
    (v_org, p_call_id, p_transcript_id, p_summary, p_provider, p_model,
     p_processing_ms, p_input_tokens, p_output_tokens)
  returning id into v_report_id;

  insert into public.report_items
    (organization_id, report_id, kind, position, what, who, why, need_family,
     quote, located, start_seconds, end_seconds)
  select v_org, v_report_id, x.kind, x.position, x.what, x.who, x.why, x.need_family,
         x.quote, x.located, x.start_seconds, x.end_seconds
  from jsonb_to_recordset(p_items) as x(
    kind text, position integer, what text, who text, why text, need_family text,
    quote text, located text, start_seconds numeric, end_seconds numeric);

  return v_report_id;
end;
$$;

revoke execute on function public.save_call_report(uuid, uuid, text, text, text, jsonb, integer, integer, integer) from public, anon;
grant execute on function public.save_call_report(uuid, uuid, text, text, text, jsonb, integer, integer, integer) to authenticated;
