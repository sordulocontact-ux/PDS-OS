-- Conception: the intentions are answered like the Stratégie's questions —
-- closed choices that compose the answer, retouched by hand, then saved.
-- The checked choices are kept with the answer so they show again when the
-- question is reopened: {"choices": ["<key>", …], "other": "<text>" | null}.
-- Keys are checked by the server action (lib/design/intention-choices.ts);
-- the database only keeps the shape. Null: an answer written without
-- choices, or a proposal of PO confirmed.

alter table public.design_intentions
  add column choices jsonb,
  add constraint design_intentions_choices_check check (
    choices is null
    or (jsonb_typeof(choices) = 'object'
        and jsonb_typeof(choices -> 'choices') = 'array'
        and jsonb_array_length(choices -> 'choices') <= 20
        and (choices -> 'other' is null
             or jsonb_typeof(choices -> 'other') in ('string', 'null'))
        and char_length(coalesce(choices ->> 'other', '')) <= 300)
  );

drop function public.save_design_intention(uuid, uuid, text, text);

-- A person's answer to one question: the confirmed intention of a topic, the
-- previous one kept as history (replaced).
create function public.save_design_intention(
  p_project_id uuid,
  p_deliverable_id uuid,
  p_topic text,
  p_value text,
  p_choices jsonb default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_target text := case when p_deliverable_id is null then 'direction' else 'deliverable' end;
  v_id uuid;
begin
  if not public.design_can_write(p_project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select organization_id into v_org from public.projects where id = p_project_id;
  perform pg_advisory_xact_lock(hashtext(p_project_id::text || coalesce(p_deliverable_id::text, '') || p_topic));
  update public.design_intentions
     set status = 'replaced'
   where project_id = p_project_id and target = v_target
     and design_deliverable_id is not distinct from p_deliverable_id
     and topic = p_topic and status = 'confirmed';
  insert into public.design_intentions
    (organization_id, project_id, target, design_deliverable_id, topic, value, choices,
     status, source_type, reviewed_by, reviewed_at)
  values (v_org, p_project_id, v_target, p_deliverable_id, p_topic, btrim(p_value), p_choices,
          'confirmed', 'manual', public.auth_person_id(), now())
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.save_design_intention(uuid, uuid, text, text, jsonb) from public, anon;
grant execute on function public.save_design_intention(uuid, uuid, text, text, jsonb) to authenticated;
