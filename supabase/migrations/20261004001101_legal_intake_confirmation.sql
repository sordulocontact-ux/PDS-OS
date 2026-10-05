-- Juridique, lot 3: Confirmation (ticket Juridique 01, docs/ARCHITECTURE.md
-- § 8 sexies). « PO reformule le dossier, montre les corrections possibles
-- et demande confirmation » ; « Valider la synthèse du dossier ».
--
--   * confirm_legal_intake: the dossier passes 'confirmed', with who and
--     when; its declared facts pass 'confirmed' (confirmed_by). A fact to
--     verify stays to verify (the Humanisme attribution of the ticket is not
--     settled by a team's confirmation), a simulated one stays simulated
--     (« Une donnée simulée ne devient jamais confirmée par progression du
--     workflow »). Confirming is not signing, authorizing nor filing.
--   * record_legal_answer, again: a new answer reopens a confirmed dossier
--     (« Une session confirmée reste corrigeable »).
--
-- Whether every question has an answer is decided by code (the questions
-- are computed there): the server action checks it before calling this.

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
      if v_name <> '' and v_role in ('composer', 'lyricist', 'arranger', 'producer',
                                     'co_producer', 'recording_engineer', 'mix_engineer',
                                     'mastering_engineer', 'musician', 'other')
         and public.has_permission(v_org, 'manage_catalog')
         and public.master_is_live(p_master_id)
         and not exists (
           select 1 from public.master_contributors
            where master_id = p_master_id and role = v_role
              and lower(btrim(name)) = lower(v_name)
         ) then
        insert into public.master_contributors (organization_id, master_id, name, role, created_by)
        values (v_org, p_master_id, left(v_name, 200), v_role, v_person);
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

create or replace function public.confirm_legal_intake(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_person uuid := public.auth_person_id();
  v_intake uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or v_person is null
     or not public.has_permission(v_org, 'manage_legal')
     or not public.can_see_project(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select id into v_intake from public.legal_intakes where project_id = p_project_id;
  if v_intake is null then
    raise exception 'legal_intake_not_started' using errcode = 'P0001';
  end if;

  update public.legal_facts
     set status = 'confirmed', confirmed_by = v_person
   where intake_id = v_intake
     and superseded_by_answer_id is null
     and status = 'declared';
  update public.legal_intakes
     set status = 'confirmed', confirmed_by = v_person, confirmed_at = now()
   where id = v_intake;
end;
$$;

revoke execute on function public.confirm_legal_intake(uuid) from public, anon;
grant execute on function public.confirm_legal_intake(uuid) to authenticated;
