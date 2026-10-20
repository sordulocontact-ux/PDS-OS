-- Master, the creative director's answer read by PO (docs/projet-complet/
-- master.md § 2, proto `daQuestion`, VISION-UX rule 12): the direction,
-- the references and the constraints PO understood in her answer, each
-- with the words it comes from. Only what is written word for word is
-- kept: the code checks each quote against the answer (here and in
-- lib/master-workflow/answer-reading.ts); she removes what is wrong, then
-- sends. The owner then adds the items (never the raw text) to the Brief.

alter table public.master_brief_questions
  add column answer_items jsonb,
  add constraint master_brief_questions_answer_items_check
    check (answer_items is null or jsonb_typeof(answer_items) = 'array');

-- Folded for the comparison: lower case, single spaces, straight quotes.
create or replace function public.fold_words(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(regexp_replace(
           translate(lower(coalesce(p_text, '')),
                     '’‘«»“”' || chr(160) || chr(8239), '''''""""' || '  '),
           '\s+', ' ', 'g'));
$$;
revoke execute on function public.fold_words(text) from public, anon, authenticated;

-- « Envoyer la réponse » of a direction question, with what PO read in it.
create or replace function public.answer_master_question_read(
  p_question_id uuid, p_text text, p_items jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_brief_questions%rowtype;
  v_item jsonb;
  v_text text := btrim(coalesce(p_text, ''));
begin
  select * into v_row from public.master_brief_questions where id = p_question_id for update;
  if not found or v_row.asked_to is distinct from public.auth_person_id() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.dimension <> 'direction' then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if v_row.answered_at is not null then
    raise exception 'already_answered';
  end if;
  if v_text = '' then
    raise exception 'empty_answer';
  end if;
  if jsonb_typeof(coalesce(p_items, 'null'::jsonb)) <> 'array' or jsonb_array_length(p_items) > 30 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    if coalesce(v_item ->> 'group', '') not in ('direction', 'references', 'constraints')
       or nullif(btrim(coalesce(v_item ->> 'label', '')), '') is null
       or char_length(v_item ->> 'label') > 200
       or char_length(public.fold_words(v_item ->> 'quote')) < 3
       or position(public.fold_words(v_item ->> 'quote') in public.fold_words(v_text)) = 0 then
      raise exception 'not_verbatim' using errcode = '23514';
    end if;
  end loop;
  update public.master_brief_questions
     set answer_text = v_text, answer_items = p_items, answered_at = now()
   where id = p_question_id;
  update public.tasks set status = 'done', done_at = now()
   where master_question_id = p_question_id and status = 'todo';
end;
$$;
revoke execute on function public.answer_master_question_read(uuid, text, jsonb) from public, anon;
grant execute on function public.answer_master_question_read(uuid, text, jsonb) to authenticated;

-- An answer into the Brief: the items read go to their field (direction,
-- references, constraints), after what is there; an answer without items
-- (sent before PO read them) adds its text to the direction, as before.
create or replace function public.apply_master_question(p_question_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row public.master_brief_questions%rowtype;
  v_lines text;
begin
  select * into v_row from public.master_brief_questions where id = p_question_id for update;
  if not found or not public.is_project_owner(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.answered_at is null then
    raise exception 'not_answered';
  end if;
  if v_row.applied_at is not null then
    raise exception 'already_applied';
  end if;
  insert into public.master_briefs (organization_id, project_id, validator_person_id)
  select v_row.organization_id, v_row.project_id, p.owner_person_id
    from public.projects p where p.id = v_row.project_id
  on conflict (project_id) do nothing;
  if v_row.dimension = 'direction' and jsonb_array_length(coalesce(v_row.answer_items, '[]')) > 0 then
    select string_agg(btrim(i ->> 'label'), E'\n') into v_lines
      from jsonb_array_elements(v_row.answer_items) i where i ->> 'group' = 'direction';
    if v_lines is not null then
      update public.master_briefs
         set direction = left(coalesce(nullif(direction, '') || E'\n', '') || v_lines, 2000)
       where project_id = v_row.project_id;
    end if;
    select string_agg(btrim(i ->> 'label'), E'\n') into v_lines
      from jsonb_array_elements(v_row.answer_items) i where i ->> 'group' = 'references';
    if v_lines is not null then
      update public.master_briefs
         set references_text = left(coalesce(nullif(references_text, '') || E'\n', '') || v_lines, 2000)
       where project_id = v_row.project_id;
    end if;
    select string_agg(btrim(i ->> 'label'), E'\n') into v_lines
      from jsonb_array_elements(v_row.answer_items) i where i ->> 'group' = 'constraints';
    if v_lines is not null then
      update public.master_briefs
         set constraints_text = left(coalesce(nullif(constraints_text, '') || E'\n', '') || v_lines, 2000)
       where project_id = v_row.project_id;
    end if;
  elsif v_row.dimension = 'direction' then
    update public.master_briefs
       set direction = left(coalesce(nullif(direction, '') || E'\n', '') || v_row.answer_text, 2000)
     where project_id = v_row.project_id;
  else
    update public.master_briefs
       set deliverables = array(select distinct unnest(deliverables || v_row.answer_choices))
     where project_id = v_row.project_id;
  end if;
  update public.master_brief_questions set applied_at = now() where id = p_question_id;
end;
$$;
revoke execute on function public.apply_master_question(uuid) from public, anon;
grant execute on function public.apply_master_question(uuid) to authenticated;
