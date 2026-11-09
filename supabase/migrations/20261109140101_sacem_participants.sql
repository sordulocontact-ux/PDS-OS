-- Déclaration SACEM : « participant + rôle(s) + répartition par catégorie » (retour d'Ibé du
-- 02/11/2026, et celui d'Akili sur le total Phono à 125 %). Un créateur du bulletin n'est plus
-- une qualité et une part Phono de tout le bulletin : c'est un participant avec ses rôles
-- (auteur, compositeur, arrangeur, adaptateur, ou « interprète uniquement », sans part SACEM),
-- et sa part dans la catégorie de chaque rôle. Auteur (auteurs et adaptateurs), Compositeur
-- (compositeurs et arrangeurs) et Éditeur (éditeurs musicaux) se répartissent chacune à 100 %,
-- contrôlées à part. Les parts Phono du bulletin en sont déduites par le code
-- (lib/legal/formalities/participants.ts) : part de la catégorie × part dans la catégorie,
-- donc toujours 100 % au total. Parts entre catégories : la règle usuelle des droits sur les
-- enregistrements (éditée 25/25/50, non éditée moitié-moitié), ou celles d'un contrat
-- (`phono_split.custom`). « Aucun éditeur musical » se dit (`phono_split.no_publisher`).
--
-- 1. Les dossiers enregistrés avant sont convertis : chaque créateur garde sa qualité comme
--    rôle, sa part dans la catégorie = sa part Phono / le total Phono de la catégorie ; un
--    éditeur, sa part Phono / le total des éditeurs. Les versions déjà générées ne changent
--    pas (le bulletin signé reste celui qui a été signé : bulletin-pdf.ts lit les deux formes).
-- 2. formality_missing_base contrôle les rôles, la confirmation de l'artiste principal, chaque
--    catégorie à 100 %, l'éditeur ou son absence dite, un label ou producteur pris pour un
--    éditeur, et les parts de contrat entre catégories ; plus de « phono_total ».
-- 3. generate_formality_document : un interprète seul n'est pas sur le bulletin et ne signe pas.

-- 1. Conversion -------------------------------------------------------------------------------
create function pg_temp.share_text(p numeric) returns text language sql immutable as $$
  select trim(trailing '.' from trim(trailing '0' from round(p, 4)::text))
$$;

with legacy as (
  select formality_id, value
    from public.legal_formality_values
   where field_key = 'creators' and jsonb_typeof(value) = 'array'
     and exists (select 1 from jsonb_array_elements(value) x where not (x ? 'roles'))
), totals as (
  select l.formality_id,
         sum(case when x ->> 'quality' in ('author', 'adapter') and x ->> 'phono' ~ '^\d{1,3}(\.\d{1,4})?$'
                  then (x ->> 'phono')::numeric else 0 end) as author,
         sum(case when x ->> 'quality' in ('composer', 'arranger') and x ->> 'phono' ~ '^\d{1,3}(\.\d{1,4})?$'
                  then (x ->> 'phono')::numeric else 0 end) as composer
    from legacy l, jsonb_array_elements(l.value) x
   group by l.formality_id
)
update public.legal_formality_values v
   set value = (
     select coalesce(jsonb_agg(
              (x - 'quality' - 'phono')
              || jsonb_build_object(
                   'roles', case when x ->> 'quality' in ('author', 'composer', 'arranger', 'adapter')
                                 then jsonb_build_array(x ->> 'quality') else '[]'::jsonb end,
                   'shares', case
                     when x ->> 'quality' in ('author', 'adapter') and t.author > 0
                          and x ->> 'phono' ~ '^\d{1,3}(\.\d{1,4})?$'
                       then jsonb_build_object(x ->> 'quality',
                              pg_temp.share_text((x ->> 'phono')::numeric * 100 / t.author))
                     when x ->> 'quality' in ('composer', 'arranger') and t.composer > 0
                          and x ->> 'phono' ~ '^\d{1,3}(\.\d{1,4})?$'
                       then jsonb_build_object(x ->> 'quality',
                              pg_temp.share_text((x ->> 'phono')::numeric * 100 / t.composer))
                     else '{}'::jsonb end)
              order by o), '[]'::jsonb)
       from jsonb_array_elements(v.value) with ordinality as e(x, o))
  from totals t
 where v.formality_id = t.formality_id and v.field_key = 'creators';

with legacy as (
  select formality_id, value
    from public.legal_formality_values
   where field_key = 'publishers' and jsonb_typeof(value) = 'array'
     and exists (select 1 from jsonb_array_elements(value) x where not (x ? 'share'))
), totals as (
  select l.formality_id,
         sum(case when x ->> 'phono' ~ '^\d{1,3}(\.\d{1,4})?$' then (x ->> 'phono')::numeric else 0 end) as total
    from legacy l, jsonb_array_elements(l.value) x
   group by l.formality_id
)
update public.legal_formality_values v
   set value = (
     select coalesce(jsonb_agg(
              (x - 'phono')
              || jsonb_build_object('share', case
                   when t.total > 0 and x ->> 'phono' ~ '^\d{1,3}(\.\d{1,4})?$'
                     then pg_temp.share_text((x ->> 'phono')::numeric * 100 / t.total)
                   else '' end)
              order by o), '[]'::jsonb)
       from jsonb_array_elements(v.value) with ordinality as e(x, o))
  from totals t
 where v.formality_id = t.formality_id and v.field_key = 'publishers';

-- 2. Ce qui manque ----------------------------------------------------------------------------
create or replace function public.formality_missing_base(p_formality_id uuid)
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
  v_split jsonb;
  v_custom jsonb;
  v_item jsonb;
  v_role text;
  v_text text;
  v_share numeric;
  v_i integer := 0;
  v_on_bulletin integer := 0;
  v_any_creator_signs boolean := false;
  v_arranger boolean := false;
  v_author numeric := 0;
  v_composer numeric := 0;
  v_publisher numeric := 0;
  v_has_author boolean := false;
  v_has_composer boolean := false;
  v_parts numeric[];
  v_work text;
  v_all_contracts boolean := true;
  v_provided boolean;
  v_share_re constant text := '^\d{1,3}(\.\d{1,4})?$';
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
  v_split := coalesce(v_vals -> 'phono_split', '{}'::jsonb);
  if jsonb_typeof(v_creators) <> 'array' then v_creators := '[]'::jsonb; end if;
  if jsonb_typeof(v_publishers) <> 'array' then v_publishers := '[]'::jsonb; end if;
  if jsonb_typeof(v_split) <> 'object' then v_split := '{}'::jsonb; end if;

  -- The participants: each one named, their role said (the main artist's confirmed by a
  -- person), a share in the category of each role.
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
    if coalesce((v_item ->> 'main_artist')::boolean, false)
       and not coalesce((v_item ->> 'confirmed')::boolean, false) then
      v_missing := v_missing || ('main_artist_role:' || v_i);
    end if;
    continue when coalesce((v_item ->> 'performer_only')::boolean, false);
    if coalesce(jsonb_typeof(v_item -> 'roles'), '') <> 'array'
       or jsonb_array_length(v_item -> 'roles') = 0 then
      v_missing := v_missing || ('creator_role:' || v_i);
      continue;
    end if;
    v_on_bulletin := v_on_bulletin + 1;
    if coalesce((v_item ->> 'signs')::boolean, false) then v_any_creator_signs := true; end if;
    for v_role in select jsonb_array_elements_text(v_item -> 'roles') loop
      if v_role not in ('author', 'composer', 'arranger', 'adapter') then
        v_missing := v_missing || ('creator_role:' || v_i);
        continue;
      end if;
      v_text := coalesce(v_item -> 'shares' ->> v_role, '');
      v_share := case when v_text ~ v_share_re then v_text::numeric end;
      if coalesce(v_share, 0) <= 0 and not (('creator_share:' || v_i) = any (v_missing)) then
        v_missing := v_missing || ('creator_share:' || v_i);
      end if;
      if v_role in ('author', 'adapter') then
        v_has_author := true;
        v_author := v_author + coalesce(v_share, 0);
      else
        v_has_composer := true;
        v_composer := v_composer + coalesce(v_share, 0);
      end if;
      if v_role = 'arranger' then v_arranger := true; end if;
    end loop;
  end loop;
  if v_on_bulletin = 0 then v_missing := v_missing || 'creators'::text; end if;
  if v_on_bulletin > 5 then v_missing := v_missing || 'creators_max'::text; end if;
  -- Each category shared on its own, to exactly 100 %.
  if v_has_author and v_author <> 100 then v_missing := v_missing || 'author_total'::text; end if;
  if v_has_composer and v_composer <> 100 then v_missing := v_missing || 'composer_total'::text; end if;

  if jsonb_array_length(v_publishers) > 3 then v_missing := v_missing || 'publishers_max'::text; end if;
  v_i := 0;
  for v_item in select * from jsonb_array_elements(v_publishers) loop
    v_i := v_i + 1;
    v_text := coalesce(v_item ->> 'share', '');
    v_publisher := v_publisher + case when v_text ~ v_share_re then v_text::numeric else 0 end;
    -- JUR-24: a publisher is named by its denomination on the bulletin.
    if nullif(btrim(coalesce(v_item ->> 'name', '')), '') is null then
      v_missing := v_missing || ('publisher_name:' || v_i);
    end if;
    -- JUR-22: it publishes at least one creator of the bulletin.
    if coalesce(jsonb_typeof(v_item -> 'represents'), '') <> 'array'
       or jsonb_array_length(v_item -> 'represents') = 0 then
      v_missing := v_missing || ('publisher_link:' || v_i);
    end if;
    if nullif(v_item ->> 'contract_id', '') is null then
      v_all_contracts := false;
    end if;
    -- A label, producer, studio or distributor is not a music publisher (retour d'Ibé) unless
    -- the Réseau says it publishes too.
    if exists (select 1 from public.network_contacts n
                where n.id = public.try_uuid(v_item ->> 'contact_id')
                  and n.organization_id = v.organization_id
                  and not ('publisher' = any (n.roles))
                  and n.roles && array['label', 'production_company', 'studio', 'distributor']) then
      v_missing := v_missing || ('publisher_label:' || v_i);
    end if;
  end loop;
  if jsonb_array_length(v_publishers) > 0 and v_publisher <> 100 then
    v_missing := v_missing || 'publisher_total'::text;
  end if;
  -- No publisher is said, never assumed.
  if jsonb_array_length(v_publishers) = 0
     and not coalesce((v_split ->> 'no_publisher')::boolean, false) then
    v_missing := v_missing || 'publishers_choice'::text;
  end if;
  -- A contract's parts between categories: 100 % in all, a part for each category held and
  -- none for the others.
  v_custom := v_split -> 'custom';
  if jsonb_typeof(v_custom) = 'object' then
    v_parts := array(
      select case when coalesce(v_custom ->> k, '') ~ v_share_re then (v_custom ->> k)::numeric else 0 end
        from unnest(array['author', 'composer', 'publisher']) k);
    if v_parts[1] + v_parts[2] + v_parts[3] <> 100
       or v_has_author <> (v_parts[1] > 0)
       or v_has_composer <> (v_parts[2] > 0)
       or (jsonb_array_length(v_publishers) > 0) <> (v_parts[3] > 0) then
      v_missing := v_missing || 'phono_split'::text;
    end if;
  end if;

  if coalesce(v_vals -> 'dep_dr' ->> 'choice', '') not in ('follow_phono', 'statutory') then
    v_missing := v_missing || 'dep_dr'::text;
  end if;
  if v_arranger and coalesce(v_vals -> 'arrangement' ->> 'scope', '') not in ('all', 'specific') then
    v_missing := v_missing || 'arrangement'::text;
  end if;
  -- Publishing contract: required when only publishers sign; without a copy, the rubric G.
  -- JUR-25: « copie jointe » only with a piece: every publisher's contract chosen, or a
  -- signed publishing contract of the project.
  v_provided := coalesce((v_vals -> 'publishing_contract' ->> 'provided')::boolean, false)
    and (v_all_contracts or exists (
      select 1 from public.contracts c
       where c.project_id = v.project_id and c.type = 'publishing' and c.status = 'signed'));
  if jsonb_array_length(v_publishers) > 0 then
    if not v_any_creator_signs and not v_provided then
      v_missing := v_missing || 'publishing_contract'::text;
    elsif not v_provided
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
revoke execute on function public.formality_missing_base(uuid) from public, anon, authenticated;

-- 3. Le bulletin généré -----------------------------------------------------------------------
-- generate_formality_document (20261028000601), the same but for the interpreters alone and the
-- role of a participant (their first one).
create or replace function public.generate_formality_document(p_formality_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype := public.formality_for_write(p_formality_id);
  v_version integer;
  v_content jsonb;
  v_item jsonb;
  v_contact uuid;
  v_house boolean;
  v_house_named boolean := false;
begin
  if v.status not in ('ready_to_generate', 'document_ready', 'signatures_pending') then
    raise exception 'formality_not_ready' using errcode = 'P0001';
  end if;
  if cardinality(public.formality_missing(p_formality_id)) > 0 then
    raise exception 'formality_missing' using errcode = 'P0001',
      detail = array_to_string(public.formality_missing(p_formality_id), ',');
  end if;
  -- The version replaced: its signatures no longer hold.
  perform public.supersede_formality_signatures(v);
  select coalesce(jsonb_object_agg(field_key, jsonb_build_object('value', value, 'source', source)), '{}')
    into v_content from public.legal_formality_values where formality_id = p_formality_id;
  select coalesce(max(version), 0) + 1 into v_version
    from public.legal_formality_documents where formality_id = p_formality_id;
  insert into public.legal_formality_documents (organization_id, formality_id, version, content, created_by)
  values (v.organization_id, p_formality_id, v_version, v_content, public.auth_person_id());

  -- « Le bulletin doit être signé par tous les ayants droit »: the creators
  -- who sign and the publishers, for this version, with the Réseau contact named.
  for v_item in select * from jsonb_array_elements(coalesce(v_content -> 'creators' -> 'value', '[]')) loop
    continue when not coalesce((v_item ->> 'signs')::boolean, false);
    -- An interpreter alone is on no line of the bulletin and signs nothing (09/11/2026).
    continue when coalesce((v_item ->> 'performer_only')::boolean, false)
               or (v_item ? 'roles' and coalesce(jsonb_array_length(v_item -> 'roles'), 0) = 0);
    select n.id into v_contact from public.network_contacts n
     where n.id = public.try_uuid(v_item ->> 'contact_id') and n.organization_id = v.organization_id;
    insert into public.legal_formality_signatures
      (organization_id, formality_id, document_version, signer, role, contact_id)
    values (v.organization_id, p_formality_id, v_version,
            left(btrim(concat_ws(' ', v_item ->> 'first_name', v_item ->> 'last_name')), 200),
            coalesce(v_item -> 'roles' ->> 0, v_item ->> 'quality', 'author'), v_contact);
  end loop;
  for v_item in select * from jsonb_array_elements(coalesce(v_content -> 'publishers' -> 'value', '[]')) loop
    select n.id into v_contact from public.network_contacts n
     where n.id = public.try_uuid(v_item ->> 'contact_id') and n.organization_id = v.organization_id;
    -- PDS Éditions (from the confirmed split): signed by the direction, never on a link. One
    -- line at most, never one with a Réseau contact.
    v_house := coalesce((v_item ->> 'house')::boolean, false) and v_contact is null
               and not v_house_named;
    v_house_named := v_house_named or v_house;
    insert into public.legal_formality_signatures
      (organization_id, formality_id, document_version, signer, role, contact_id, house)
    values (v.organization_id, p_formality_id, v_version, left(btrim(v_item ->> 'name'), 200),
            'publisher', v_contact, v_house);
  end loop;
  update public.legal_formalities
     set status = case when exists (
           select 1 from public.legal_formality_signatures
            where formality_id = p_formality_id and document_version = v_version)
         then 'signatures_pending' else 'ready_to_submit' end,
         partial_reason = null
   where id = p_formality_id;
  perform public.log_formality_event(v, 'document.generated', 'v' || v_version);
  return v_version;
end;
$$;


-- Dossiers not generated yet follow the new checks at once.
select public.formality_settle(id)
  from public.legal_formalities
 where status in ('collecting_data', 'ready_to_generate');
