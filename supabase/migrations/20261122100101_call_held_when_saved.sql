-- « J'ai donné une transcription avant la date de l'appel » (Sacha 22/11/2026): a call whose
-- exchange is saved (its transcript: recording transcribed, file dropped, Meet's transcript) took
-- place, even when it was planned later (held earlier, outside Google Meet). Its time moves to
-- when it happened — ending when its exchange is saved, its length kept — so it is no longer « à
-- venir »: not the deal's next call, held for the negotiation (set_deal_stage), past in Calls and
-- the Calendrier. A call already past keeps its time.

create or replace function public.transcripts_call_held()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.calls c
     set occurred_at = now() - coalesce(c.ends_at - c.occurred_at,
                                        make_interval(mins => c.duration_minutes), interval '0'),
         ends_at = case when c.ends_at is null then null else now() end
   where c.id = new.call_id
     and c.occurred_at > now();
  return new;
end;
$$;
revoke execute on function public.transcripts_call_held() from public, anon, authenticated;

create trigger transcripts_call_held after insert on public.transcripts
  for each row execute function public.transcripts_call_held();

-- The calls already in that case: moved to when their first exchange was saved.
update public.calls c
   set occurred_at = t.first_at - coalesce(c.ends_at - c.occurred_at,
                                           make_interval(mins => c.duration_minutes), interval '0'),
       ends_at = case when c.ends_at is null then null else t.first_at end
  from (select call_id, min(created_at) as first_at from public.transcripts group by call_id) t
 where t.call_id = c.id
   and c.occurred_at > t.first_at;
