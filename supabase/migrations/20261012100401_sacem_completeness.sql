-- JUR-24 (retours Juridique du 11/10/2026, docs/ARCHITECTURE.md § 8 sexies,
-- « SACEM »): an official bulletin was generated with an empty genre, a
-- creator without first name and a publisher without denomination. They
-- are now required before the bulletin is generated (formality_missing is
-- the only judge, the dossier says each one under its field). The IPI /
-- COAD stays optional: a creator who is not a member has none.

create or replace function public.formality_missing(p_formality_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype;
  v_vals jsonb;
  v_missing text[] := '{}';
  v_creators jsonb;
  v_publishers jsonb;
  v_total numeric := 0;
  v_item jsonb;
  v_i integer := 0;
  v_any_creator_signs boolean := false;
  v_arranger boolean := false;
  v_work text;
begin
  select * into v from public.legal_formalities where id = p_formality_id;
  select coalesce(jsonb_object_agg(field_key, value), '{}'::jsonb) into v_vals
    from public.legal_formality_values where formality_id = p_formality_id and status = 'validated';
  -- A reopened field is to verify again.
  select v_missing || coalesce(array_agg('to_verify:' || field_key), '{}') into v_missing
    from public.legal_formality_values where formality_id = p_formality_id and status = 'to_verify';

  if nullif(btrim(coalesce(v_vals ->> 'title', '')), '') is null then
    v_missing := v_missing || 'title'::text;
  end if;
  if nullif(btrim(coalesce(v_vals ->> 'duration', '')), '') is null then
    v_missing := v_missing || 'duration'::text;
  end if;
  -- JUR-24: the genre is asked by the bulletin.
  if nullif(btrim(coalesce(v_vals ->> 'genre', '')), '') is null then
    v_missing := v_missing || 'genre'::text;
  end if;

  v_creators := coalesce(v_vals -> 'creators', '[]'::jsonb);
  v_publishers := coalesce(v_vals -> 'publishers', '[]'::jsonb);
  if jsonb_typeof(v_creators) <> 'array' then v_creators := '[]'::jsonb; end if;
  if jsonb_typeof(v_publishers) <> 'array' then v_publishers := '[]'::jsonb; end if;
  if jsonb_array_length(v_creators) = 0 then
    v_missing := v_missing || 'creators'::text;
  else
    for v_item in select * from jsonb_array_elements(v_creators) loop
      v_i := v_i + 1;
      if nullif(btrim(coalesce(v_item ->> 'last_name', '')), '') is null then
        v_missing := v_missing || ('creator_name:' || v_i);
      end if;
      -- JUR-24: a first name, or the pseudonym the person is declared under.
      if nullif(btrim(coalesce(v_item ->> 'first_name', '')), '') is null
         and nullif(btrim(coalesce(v_item ->> 'pseudonym', '')), '') is null then
        v_missing := v_missing || ('creator_first:' || v_i);
      end if;
      if coalesce(v_item ->> 'quality', '') not in ('author', 'composer', 'arranger', 'adapter') then
        v_missing := v_missing || ('creator_quality:' || v_i);
      end if;
      if v_item ->> 'quality' = 'arranger' then v_arranger := true; end if;
      if coalesce((v_item ->> 'signs')::boolean, false) then v_any_creator_signs := true; end if;
      v_total := v_total + coalesce(nullif(v_item ->> 'phono', '')::numeric, 0);
    end loop;
  end if;
  if jsonb_array_length(v_creators) > 5 then v_missing := v_missing || 'creators_max'::text; end if;
  if jsonb_array_length(v_publishers) > 3 then v_missing := v_missing || 'publishers_max'::text; end if;
  v_i := 0;
  for v_item in select * from jsonb_array_elements(v_publishers) loop
    v_i := v_i + 1;
    v_total := v_total + coalesce(nullif(v_item ->> 'phono', '')::numeric, 0);
    -- JUR-24: a publisher is named by its denomination on the bulletin.
    if nullif(btrim(coalesce(v_item ->> 'name', '')), '') is null then
      v_missing := v_missing || ('publisher_name:' || v_i);
    end if;
  end loop;
  if v_total <> 100 then v_missing := v_missing || 'phono_total'::text; end if;

  if coalesce(v_vals -> 'dep_dr' ->> 'choice', '') not in ('follow_phono', 'statutory') then
    v_missing := v_missing || 'dep_dr'::text;
  end if;
  if v_arranger and coalesce(v_vals -> 'arrangement' ->> 'scope', '') not in ('all', 'specific') then
    v_missing := v_missing || 'arrangement'::text;
  end if;
  -- Publishing contract: required when only publishers sign; without a copy,
  -- the rubric G.
  if jsonb_array_length(v_publishers) > 0 then
    if not v_any_creator_signs
       and not coalesce((v_vals -> 'publishing_contract' ->> 'provided')::boolean, false) then
      v_missing := v_missing || 'publishing_contract'::text;
    elsif not coalesce((v_vals -> 'publishing_contract' ->> 'provided')::boolean, false)
       and nullif(btrim(coalesce(v_vals -> 'publishing_contract' ->> 'rubric_g', '')), '') is null then
      v_missing := v_missing || 'rubric_g'::text;
    end if;
  end if;
  -- Borrowings: every element taken from an existing work is secured.
  for v_work in
    select c.work from public.legal_clearances c
     where c.master_id = v.master_id and c.project_id = v.project_id
       and c.status not in ('cleared', 'abandoned')
  loop
    v_missing := v_missing || ('borrowing:' || v_work);
  end loop;
  return v_missing;
end;
$$;

-- Dossiers not yet generated are judged again by the same rule.
select public.formality_settle(id)
  from public.legal_formalities
 where status in ('collecting_data', 'ready_to_generate');
