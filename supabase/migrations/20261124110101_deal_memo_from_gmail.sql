-- A deal memo found in the negotiator's own Gmail (Sacha 23/11/2026: the label
-- writes to the negotiator, not to PO's address of the deal). The deal's page
-- reads the member's Gmail live, with their own token (lib/deals/gmail-memos.ts,
-- never stored), for PDFs sent by the deal's people or its counterpart, and
-- offers « Ranger dans le deal ». On that click only, the PDFs are uploaded
-- with the member's session into the deal's folder of deal-files
-- (deal_files_insert, 20261123220101), then this function makes them the deal's
-- memo exactly as receive_deal_memo does for a mail sent to po@: a draft « À
-- valider », source 'email', its sender, subject and day, once per Message-ID.
-- The mail's text is not kept: it stays in the member's mailbox.

create or replace function public.file_deal_memo_from_mail(
  p_deal_id uuid,
  p_message_id text,
  p_from text,
  p_subject text,
  p_received_at timestamptz,
  p_files jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_id uuid;
  v_number integer;
  v_file jsonb;
  v_bytes bigint;
begin
  v := public.lock_deal_for_write(p_deal_id);
  if p_message_id is null or btrim(p_message_id) = '' then
    raise exception 'invalid_message' using errcode = '22023';
  end if;
  if exists (select 1 from public.deal_memos
              where deal_id = v.id and email_message_id = left(p_message_id, 300)) then
    raise exception 'memo_already_filed' using errcode = '23505';
  end if;
  if jsonb_typeof(coalesce(p_files, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_files, '[]'::jsonb)) = 0 then
    raise exception 'memo_without_file' using errcode = '22023';
  end if;
  if jsonb_array_length(p_files) > 10 then
    raise exception 'too_many_files' using errcode = '22023';
  end if;

  v_id := public.snapshot_deal_memo(v, 'draft');
  update public.deal_memos
     set source = 'email',
         email_from = left(nullif(btrim(p_from), ''), 320),
         email_subject = left(nullif(btrim(p_subject), ''), 300),
         email_message_id = left(p_message_id, 300),
         received_at = coalesce(p_received_at, now())
   where id = v_id
  returning number into v_number;
  for v_file in select * from jsonb_array_elements(p_files) loop
    if (v_file ->> 'path') is null
       or (v_file ->> 'path') not like v.organization_id::text || '/' || v.id::text || '/%' then
      raise exception 'invalid_path' using errcode = '22023';
    end if;
    select (o.metadata ->> 'size')::bigint into v_bytes
      from storage.objects o
     where o.bucket_id = 'deal-files' and o.name = v_file ->> 'path';
    if v_bytes is null or v_bytes <= 0 then
      raise exception 'file_missing' using errcode = 'P0002';
    end if;
    insert into public.deal_memo_files (organization_id, memo_id, path, file_name, size_bytes)
    values (v.organization_id, v_id, v_file ->> 'path',
            left(coalesce(nullif(btrim(v_file ->> 'name'), ''), 'Deal memo.pdf'), 255), v_bytes);
  end loop;
  perform public.log_deal_event(v, 'memo_received', null, null, null,
    jsonb_build_object('memo', v_id, 'number', v_number, 'from', left(p_from, 320),
                       'gmail', true));
  return v_id;
end;
$$;
revoke execute on function public.file_deal_memo_from_mail(uuid, text, text, text, timestamptz, jsonb)
  from public, anon;
grant execute on function public.file_deal_memo_from_mail(uuid, text, text, text, timestamptz, jsonb)
  to authenticated;
