-- « On a des choses dans PDS OS qui nous permettent d'envoyer des mails et d'en recevoir » (Sacha
-- 22/11/2026): once the direction asks for changes on a memo received from a label or a brand, the
-- business manager sends them the correction from PDS OS (po@, the deal's address in reply-to, so the
-- next version comes back into the deal). The sending is kept on the memo — to whom, the proof — and in
-- the deal's journal; « Maintenant » then waits for the next version.

alter table public.deal_memos
  add column correction_sent_by uuid references public.people (id),
  add column correction_sent_at timestamptz,
  -- « Nom (adresse) »: the proof of sending; null: sent another way.
  add column correction_sent_to text;

select public.add_deal_event_kinds(array['memo_correction_sent']);

create or replace function public.record_deal_memo_correction_sent(p_memo_id uuid, p_sent_to text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_memo public.deal_memos%rowtype;
  v public.deals%rowtype;
  v_to text := public.clean_deal_text(p_sent_to, 4000);
begin
  v_memo := public.lock_deal_memo(p_memo_id);
  select * into v from public.deals where id = v_memo.deal_id;
  if v_memo.changes_at is null then
    raise exception 'memo_no_changes' using errcode = 'P0001';
  end if;
  if v_memo.correction_sent_at is not null then
    raise exception 'memo_correction_sent' using errcode = 'P0001';
  end if;
  update public.deal_memos
     set correction_sent_by = public.auth_person_id(), correction_sent_at = now(),
         correction_sent_to = v_to
   where id = p_memo_id;
  perform public.log_deal_event(v, 'memo_correction_sent', null, null, null,
    jsonb_build_object('memo', p_memo_id, 'number', v_memo.number, 'to', v_to));
end;
$$;
revoke execute on function public.record_deal_memo_correction_sent(uuid, text) from public, anon;
grant execute on function public.record_deal_memo_correction_sent(uuid, text) to authenticated;
