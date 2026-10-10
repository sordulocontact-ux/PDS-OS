-- The people question of the Cadrage juridique starts from who PDS OS
-- already knows on the title (lib/legal/intake/known-people.ts, Sacha,
-- 10/10/2026: the question asked again what the title and the Cadrage
-- said). An engineer the Cadrage confirmed is a contact of the Réseau: the
-- credit created from the answer is linked to that contact (contact_id),
-- as the Brief Mix/Master does, instead of waiting for « Relier ».
--
-- record_legal_answer, again: a contribution fact may carry contact_id,
-- set by the server from the known people (never from a name match). It is
-- kept only for a live contact of the project's organization; a credit of
-- the same role and contact is not written twice. Facts are unchanged
-- (legal_facts.value stays name and role).

create or replace function public.record_legal_answer(
  p_project_id uuid,
  p_question_key text,
  p_master_id uuid,
  p_text text,
  p_facts jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_person uuid := public.auth_person_id();
  v_intake uuid;
  v_answer uuid;
  v_fact jsonb;
  v_fact_id uuid;
  v_kind text;
  v_value jsonb;
  v_quote text;
  v_name text;
  v_role text;
  v_contact uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or v_person is null
     or not public.has_permission(v_org, 'manage_legal')
     or not public.can_see_project(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_question_key not in ('contributors', 'third_party', 'publisher', 'agreements') then
    raise exception 'legal_unknown_question' using errcode = 'P0001';
  end if;
  -- Title questions name a title of this project; the agreements none.
  if (p_question_key = 'agreements') <> (p_master_id is null) then
    raise exception 'legal_question_scope' using errcode = 'P0001';
  end if;
  if p_master_id is not null and not exists (
    select 1 from public.project_masters
     where project_id = p_project_id and master_id = p_master_id
  ) then
    raise exception 'legal_master_not_in_project' using errcode = 'P0001';
  end if;
  if jsonb_typeof(coalesce(p_facts, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_facts, '[]'::jsonb)) > 30 then
    raise exception 'legal_facts_invalid' using errcode = 'P0001';
  end if;

  insert into public.legal_intakes (organization_id, project_id, created_by)
  values (v_org, p_project_id, v_person)
  on conflict (project_id) do nothing;
  select id into v_intake from public.legal_intakes where project_id = p_project_id;

  insert into public.legal_answers
    (organization_id, intake_id, project_id, question_key, master_id, text, created_by)
  values (v_org, v_intake, p_project_id, p_question_key, p_master_id, btrim(p_text), v_person)
  returning id into v_answer;

  -- « Une session confirmée reste corrigeable ; une correction peut rouvrir
  -- des exigences » (Juridique 01): a new answer reopens a confirmed dossier,
  -- to be confirmed again.
  update public.legal_intakes
     set status = 'draft', confirmed_by = null, confirmed_at = null
   where id = v_intake and status = 'confirmed';

  -- A clearance nobody has worked on yet goes with the fact it came from.
  delete from public.legal_clearances c
   using public.legal_facts f
   where c.source_fact_id = f.id
     and c.status = 'to_investigate'
     and f.intake_id = v_intake
     and f.question_key = p_question_key
     and f.master_id is not distinct from p_master_id
     and f.superseded_by_answer_id is null;
  update public.legal_facts
     set superseded_by_answer_id = v_answer
   where intake_id = v_intake
     and question_key = p_question_key
     and master_id is not distinct from p_master_id
     and superseded_by_answer_id is null;

  for v_fact in select * from jsonb_array_elements(coalesce(p_facts, '[]'::jsonb))
  loop
    v_kind := v_fact ->> 'kind';
    v_value := v_fact -> 'value';
    v_quote := nullif(btrim(coalesce(v_fact ->> 'quote', '')), '');
    insert into public.legal_facts
      (organization_id, intake_id, project_id, question_key, master_id, kind, value, status,
       source_type, answer_id, source_quote, declared_by)
    values (v_org, v_intake, p_project_id, p_question_key, p_master_id, v_kind,
            coalesce(v_value, '{}'::jsonb),
            case when v_kind = 'third_party' then 'to_verify' else 'declared' end,
            'answer', v_answer, left(v_quote, 500), v_person)
    returning id into v_fact_id;

    if v_kind = 'contribution' and p_master_id is not null then
      v_name := btrim(coalesce(v_value ->> 'name', ''));
      v_role := v_value ->> 'role';
      -- The Réseau contact the person is already known as (an engineer of
      -- the Cadrage), kept only when it is a live contact of this
      -- organization: never a contact found by its name.
      v_contact := null;
      if coalesce(v_fact ->> 'contact_id', '') ~
         '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        select id into v_contact from public.network_contacts
         where id = (v_fact ->> 'contact_id')::uuid
           and organization_id = v_org and archived_at is null;
      end if;
      if v_name <> '' and v_role in ('composer', 'lyricist', 'arranger', 'producer',
                                     'co_producer', 'recording_engineer', 'mix_engineer',
                                     'mastering_engineer', 'musician', 'other')
         and public.has_permission(v_org, 'manage_catalog')
         and public.master_is_live(p_master_id)
         and not exists (
           select 1 from public.master_contributors
            where master_id = p_master_id and role = v_role
              and (lower(btrim(name)) = lower(v_name) or contact_id = v_contact)
         ) then
        insert into public.master_contributors
          (organization_id, master_id, name, role, contact_id, created_by)
        values (v_org, p_master_id, left(v_name, 200), v_role, v_contact, v_person);
      end if;
    elsif v_kind = 'third_party' then
      insert into public.legal_clearances
        (organization_id, project_id, master_id, element, work, author, source_fact_id, created_by)
      values (v_org, p_project_id, p_master_id,
              coalesce(nullif(v_value ->> 'element', ''), 'other'),
              left(btrim(v_value ->> 'work'), 300),
              left(nullif(btrim(coalesce(v_value ->> 'author', '')), ''), 300),
              v_fact_id, v_person);
    end if;
  end loop;

  return v_answer;
end;
$$;

revoke execute on function public.record_legal_answer(uuid, text, uuid, text, jsonb)
  from public, anon;
grant execute on function public.record_legal_answer(uuid, text, uuid, text, jsonb)
  to authenticated;
