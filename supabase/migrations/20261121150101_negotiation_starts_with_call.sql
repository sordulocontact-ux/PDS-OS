-- « Déjà après un call on passe forcément en négo, non ? » (Sacha 21/11/2026). A deal « Call prévu »
-- moves to « Négociation » by itself once one of its calls is held: when the call's exchange is saved
-- (its transcript: recording transcribed, file dropped, Meet's transcript). Journalled as a stage event
-- by whoever saved it, the call named; PO no longer proposes it (the stage is already there).

create or replace function public.transcripts_start_negotiation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.deals%rowtype;
begin
  select d.* into v
    from public.calls c
    join public.deals d on d.id = c.deal_id
   where c.id = new.call_id
     and d.stage = 'call_planned'
   for update of d;
  if not found then
    return new;
  end if;
  update public.deals
     set stage = 'negotiation', stage_changed_by = public.auth_person_id(),
         stage_changed_at = now()
   where id = v.id
  returning * into v;
  perform public.log_deal_event(v, 'stage', 'call_planned', 'negotiation', null,
    jsonb_build_object('call', new.call_id));
  return new;
end;
$$;
revoke execute on function public.transcripts_start_negotiation() from public, anon, authenticated;

create trigger transcripts_start_negotiation after insert on public.transcripts
  for each row execute function public.transcripts_start_negotiation();

-- The deals already in that case: their call held and saved, still « Call prévu ». PO's pending
-- proposal of that very stage is settled with it.
do $$
declare
  r record;
  v public.deals%rowtype;
begin
  for r in
    select d.id,
           (select t.call_id from public.transcripts t
              join public.calls c on c.id = t.call_id
             where c.deal_id = d.id order by t.created_at limit 1) as call_id
      from public.deals d
     where d.stage = 'call_planned'
       and exists (select 1 from public.transcripts t
                     join public.calls c on c.id = t.call_id where c.deal_id = d.id)
  loop
    update public.deals set stage = 'negotiation', stage_changed_at = now()
     where id = r.id returning * into v;
    perform public.log_deal_event(v, 'stage', 'call_planned', 'negotiation', null,
      jsonb_build_object('call', r.call_id));
    update public.deal_call_proposals
       set status = 'applied', settled_at = now()
     where deal_id = r.id and kind = 'stage' and stage = 'negotiation' and status = 'proposed';
  end loop;
end;
$$;
