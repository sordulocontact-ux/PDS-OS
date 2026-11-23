-- « Déposer le memo reçu » (Sacha 23/11/2026: the label sends its deal memo to
-- the negotiator's own address, not to PO's address of the deal; « je trouve
-- ça bizarre de donner ça comme adresse »). Whoever writes the deal drops the
-- PDF they received: it becomes the deal's memo exactly as one received by
-- e-mail (receive_deal_memo, 20261120150101) — a draft « À valider », the
-- photo of the terms of the moment beside it, its PDF the memo. Source
-- 'upload': the e-mail fields stay empty, its author is who dropped it.
--
--   1. deal_memos.source accepts 'upload';
--   2. the bucket deal-files: whoever writes an open deal uploads under
--      <organization>/<deal>/, and removes a file no memo holds yet (a drop
--      that failed);
--   3. deposit_deal_memo(deal, path, name).

alter table public.deal_memos drop constraint deal_memos_source_check;
alter table public.deal_memos
  add constraint deal_memos_source_check check (source in ('pds', 'email', 'upload'));

-- 2. Storage ----------------------------------------------------------------------------------

create or replace function public.can_drop_deal_file(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.deals d
     where p_name like d.organization_id::text || '/' || d.id::text || '/%'
       and d.stage not in ('signed', 'abandoned')
       and public.can_read_deal(d.organization_id, d.assignee_person_id, d.project_id)
       and public.can_write_deal(d.organization_id, d.assignee_person_id));
$$;
revoke execute on function public.can_drop_deal_file(text) from public, anon;
grant execute on function public.can_drop_deal_file(text) to authenticated;

create policy deal_files_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'deal-files' and public.can_drop_deal_file(name));

create policy deal_files_delete_unfiled on storage.objects
  for delete to authenticated
  using (bucket_id = 'deal-files'
         and public.can_drop_deal_file(name)
         and not exists (select 1 from public.deal_memo_files f where f.path = objects.name));

-- 3. The memo ---------------------------------------------------------------------------------

create or replace function public.deposit_deal_memo(
  p_deal_id uuid,
  p_path text,
  p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
  v_id uuid;
  v_number integer;
  v_bytes bigint;
begin
  v := public.lock_deal_for_write(p_deal_id);
  if p_path is null
     or p_path not like v.organization_id::text || '/' || v.id::text || '/%' then
    raise exception 'invalid_path' using errcode = '22023';
  end if;
  if exists (select 1 from public.deal_memo_files where path = p_path) then
    raise exception 'file_already_filed' using errcode = '23505';
  end if;
  select (o.metadata ->> 'size')::bigint into v_bytes
    from storage.objects o
   where o.bucket_id = 'deal-files' and o.name = p_path;
  if v_bytes is null or v_bytes <= 0 then
    raise exception 'file_missing' using errcode = 'P0002';
  end if;

  v_id := public.snapshot_deal_memo(v, 'draft');
  update public.deal_memos set source = 'upload' where id = v_id
  returning number into v_number;
  insert into public.deal_memo_files (organization_id, memo_id, path, file_name, size_bytes)
  values (v.organization_id, v_id, p_path,
          left(coalesce(nullif(btrim(p_name), ''), 'Deal memo.pdf'), 255), v_bytes);
  perform public.log_deal_event(v, 'memo_received', null, null, null,
    jsonb_build_object('memo', v_id, 'number', v_number, 'deposited', true));
  return v_id;
end;
$$;
revoke execute on function public.deposit_deal_memo(uuid, text, text) from public, anon;
grant execute on function public.deposit_deal_memo(uuid, text, text) to authenticated;
