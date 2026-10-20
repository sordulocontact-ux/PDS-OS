-- The person's page by project (/c/<jeton>, lot 11): after a call, « Ce qui
-- vous a été demandé » (proto « Projet complet » mk.js portalCalls) — the
-- actions PDS confirmed after the call and gave to this person, each « À
-- faire » or « Fait », never the report itself (VISION-UX rule 21: what is
-- said stays in the team; the outside person receives what is decided).
--
-- Read by the person's token, without an account. A call's suites are
-- « settled » once PDS has confirmed them: the summary of the call was sent
-- to the person, or — a production call — its report exists and no action
-- PO proposed is left to confirm. Until then the page says « PDS confirme
-- les suites du call ; ce qui vous concerne apparaîtra ici. ».
--
-- The actions given to an outside person after a call are the production
-- plan's (production_plan_actions planned from an action of the call,
-- `item_id` → production_call_items.call_id, with her contact): the only
-- place PDS OS gives a task to someone without an account. The other calls
-- (Cadrage, Conception, Master) give tasks to members only: once settled,
-- « Rien ne vous a été demandé pendant ce call. ».
--
-- A separate function, so contact_page_items (shared by every workflow) is
-- left as it is.

create function public.get_contact_call_requests(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.project_contact_links%rowtype := public.contact_link_of(p_token);
begin
  if v.id is null then
    return '[]'::jsonb;
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
             'callId', c.id,
             'settled',
               exists (select 1 from public.call_summaries x
                        where x.call_id = c.id
                          and x.recipients @> jsonb_build_array(
                                jsonb_build_object('contact_id', v.contact_id)))
               or (exists (select 1 from public.production_calls pc where pc.call_id = c.id)
                   and exists (select 1 from public.call_reports r where r.call_id = c.id)
                   and not exists (select 1 from public.production_call_items i
                                    where i.call_id = c.id and i.kind = 'action'
                                      and i.status = 'proposed')),
             'asked', (
               select coalesce(jsonb_agg(jsonb_build_object(
                        'id', pa.id,
                        'title', pa.title,
                        'due', pa.due_date,
                        'doneAt', pa.done_at)
                        order by pa.due_date nulls last, pa.position), '[]'::jsonb)
                 from public.production_plan_actions pa
                 join public.production_call_items i on i.id = pa.item_id
                where i.call_id = c.id
                  and pa.project_id = v.project_id
                  and pa.contact_id = v.contact_id
                  and pa.status = 'approved')
           ) order by c.occurred_at), '[]'::jsonb)
      from public.call_guests g
      join public.calls c on c.id = g.call_id
     where c.project_id = v.project_id
       and g.contact_id = v.contact_id
       and c.occurred_at <= now());
end;
$$;
revoke execute on function public.get_contact_call_requests(text) from public;
grant execute on function public.get_contact_call_requests(text) to anon, authenticated;
