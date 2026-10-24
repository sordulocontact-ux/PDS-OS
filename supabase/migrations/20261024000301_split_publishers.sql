-- Recette Juridique V1 d'Ibé (21/10/2026), JUR-01 : une répartition distingue les
-- créateurs, qui édite la part de chacun, puis les parts de l'œuvre.
--
-- - Une ligne « éditeur » dit quels créateurs il représente (represents : positions des
--   lignes de créateurs de la même version) : un éditeur peut ne représenter qu'un
--   créateur, deux éditeurs peuvent coéditer la part d'un même créateur.
-- - L'éditeur de la maison (house, « PDS Éditions ») : c'est l'équipe, il ne reçoit pas de
--   lien de confirmation et ne compte pas parmi les réponses attendues.
-- - Un autre éditeur est choisi dans le Réseau (contact obligatoire) : PDS OS ne le choisit
--   jamais à la place de l'équipe, et aucune part ne lui est donnée par le code.
-- - Rôle « author_composer » : une personne auteure et compositrice, sur une seule ligne.
-- - Le contenu confirmé (split_version_content) dit qui chaque éditeur représente ; une
--   version sans éditeur garde exactement le même contenu, donc la même empreinte.

alter table public.legal_split_entries
  drop constraint legal_split_entries_role_check,
  add constraint legal_split_entries_role_check
    check (role in ('author', 'composer', 'author_composer', 'arranger', 'publisher', 'other')),
  add column represents integer[],
  add column house boolean not null default false,
  add constraint legal_split_entries_house_check
    check (not house or (role = 'publisher' and contact_id is null)),
  add constraint legal_split_entries_represents_check
    check (represents is null or (role = 'publisher' and cardinality(represents) between 1 and 30));

create or replace function public.split_version_content(p_version_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'version', v.version,
    'title', m.title,
    'entries', coalesce((
      select jsonb_agg(
               jsonb_build_object('name', e.name, 'role', e.role, 'share', e.share::text)
               || case when e.represents is null then '{}'::jsonb
                       else jsonb_build_object('represents', (
                         select coalesce(jsonb_agg(c.name order by c.position), '[]'::jsonb)
                           from public.legal_split_entries c
                          where c.version_id = e.version_id and c.position = any (e.represents)))
                  end
               || case when e.house then jsonb_build_object('house', true) else '{}'::jsonb end
               order by e.position)
        from public.legal_split_entries e where e.version_id = v.id), '[]'::jsonb))
  from public.legal_split_versions v
  join public.legal_split_sheets s on s.id = v.sheet_id
  join public.masters m on m.id = s.master_id
  where v.id = p_version_id;
$$;

create or replace function public.save_split_draft(
  p_project_id uuid,
  p_master_id uuid,
  p_entries jsonb,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_sheet uuid;
  v_last public.legal_split_versions%rowtype;
  v_version uuid;
  v_entry jsonb;
  v_position integer := 0;
  v_house boolean;
  v_represents integer[];
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or public.auth_person_id() is null
     or not public.has_permission(v_org, 'manage_legal')
     or not public.can_see_project(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.project_masters
                  where project_id = p_project_id and master_id = p_master_id) then
    raise exception 'split_title_invalid' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) not between 1 and 30 then
    raise exception 'split_entries_invalid' using errcode = 'P0001';
  end if;

  insert into public.legal_split_sheets (organization_id, project_id, master_id)
  values (v_org, p_project_id, p_master_id)
  on conflict (project_id, master_id) do nothing;
  select id into v_sheet from public.legal_split_sheets
   where project_id = p_project_id and master_id = p_master_id;

  select * into v_last from public.legal_split_versions
   where sheet_id = v_sheet order by version desc limit 1 for update;
  if found and v_last.status = 'draft' then
    v_version := v_last.id;
    delete from public.legal_split_entries where version_id = v_version;
    update public.legal_split_versions
       set note = nullif(btrim(coalesce(p_note, '')), '') where id = v_version;
  else
    insert into public.legal_split_versions (organization_id, sheet_id, version, note, created_by)
    values (v_org, v_sheet, coalesce(v_last.version, 0) + 1,
            nullif(btrim(coalesce(p_note, '')), ''), public.auth_person_id())
    returning id into v_version;
    perform public.log_split_event(v_org, v_version, 'split.version_created');
  end if;

  for v_entry in select * from jsonb_array_elements(p_entries) loop
    v_position := v_position + 1;
    if nullif(v_entry ->> 'contact_id', '') is not null and not exists (
      select 1 from public.network_contacts
       where id = (v_entry ->> 'contact_id')::uuid and organization_id = v_org) then
      raise exception 'split_contact_invalid' using errcode = 'P0001';
    end if;
    v_house := coalesce((v_entry ->> 'house')::boolean, false);
    v_represents := case when jsonb_typeof(v_entry -> 'represents') = 'array'
      then array(select x::integer from jsonb_array_elements_text(v_entry -> 'represents') x)
      end;
    if v_entry ->> 'role' = 'publisher' then
      -- A publisher represents creators; one of the Réseau is picked there (JUR-01).
      if coalesce(cardinality(v_represents), 0) = 0 then
        raise exception 'split_publisher_unlinked' using errcode = 'P0001';
      end if;
      if not v_house and nullif(v_entry ->> 'contact_id', '') is null then
        raise exception 'split_publisher_contact_required' using errcode = 'P0001';
      end if;
    elsif v_house or v_represents is not null then
      raise exception 'split_entries_invalid' using errcode = 'P0001';
    end if;
    insert into public.legal_split_entries
      (organization_id, version_id, position, name, role, share, contact_id, credit_id,
       represents, house)
    values (v_org, v_version, v_position, btrim(v_entry ->> 'name'), v_entry ->> 'role',
            (v_entry ->> 'share')::numeric,
            case when v_house then null else nullif(v_entry ->> 'contact_id', '')::uuid end,
            nullif(v_entry ->> 'credit_id', '')::uuid, v_represents, v_house);
  end loop;

  -- Each publisher represents creators of this version; the house appears once.
  if exists (
    select 1 from public.legal_split_entries p, unnest(p.represents) r (pos)
     where p.version_id = v_version
       and not exists (select 1 from public.legal_split_entries c
                        where c.version_id = v_version and c.position = r.pos
                          and c.role in ('author', 'composer', 'author_composer', 'arranger'))
  ) then
    raise exception 'split_publisher_unlinked' using errcode = 'P0001';
  end if;
  if (select count(*) from public.legal_split_entries
       where version_id = v_version and house) > 1 then
    raise exception 'split_entries_invalid' using errcode = 'P0001';
  end if;
  return v_version;
end;
$$;

-- The house is the team: never a link, never an answer awaited. ------------------
create or replace function public.consolidate_split_version(p_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
  v_confirmed integer;
  v_disputed integer;
begin
  select count(*) into v_total from public.legal_split_entries
   where version_id = p_version_id and not house;
  -- Each entry's latest link speaks for it.
  select count(*) filter (where c.status = 'confirmed'),
         count(*) filter (where c.status = 'disputed')
    into v_confirmed, v_disputed
    from (select distinct on (entry_id) entry_id, status
            from public.legal_split_confirmations
           where version_id = p_version_id
           order by entry_id, created_at desc) c;
  update public.legal_split_versions
     set status = case
       when v_disputed > 0 then 'disputed'
       when v_confirmed = v_total and v_total > 0 then 'confirmed'
       when v_confirmed > 0 then 'partially_confirmed'
       else 'proposed' end
   where id = p_version_id and status not in ('draft', 'superseded');
end;
$$;
revoke execute on function public.consolidate_split_version(uuid) from public, anon, authenticated;

create or replace function public.new_split_confirmation(p_entry_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry public.legal_split_entries%rowtype;
  v_version public.legal_split_versions%rowtype;
  v_token text;
begin
  select * into v_entry from public.legal_split_entries where id = p_entry_id;
  select * into v_version from public.legal_split_versions where id = v_entry.version_id;
  if not found or public.auth_person_id() is null
     or not public.can_manage_split_sheet(v_version.sheet_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_version.status in ('draft', 'superseded') or v_entry.house then
    raise exception 'split_version_closed' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.legal_split_confirmations
              where entry_id = p_entry_id and status = 'pending') then
    update public.legal_split_confirmations
       set status = 'revoked', revoked_at = now()
     where entry_id = p_entry_id and status = 'pending';
    perform public.log_split_event(v_version.organization_id, v_version.id,
                                   'split.confirmation_revoked', p_entry_id);
  end if;
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.legal_split_confirmations
    (organization_id, version_id, entry_id, token_hash, expires_at, created_by)
  values (v_version.organization_id, v_version.id, p_entry_id,
          encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), now() + interval '30 days',
          public.auth_person_id());
  perform public.consolidate_split_version(v_version.id);
  return v_token;
end;
$$;

create or replace function public.propose_split_version(p_version_id uuid)
returns table (entry_id uuid, token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version public.legal_split_versions%rowtype;
  v_total numeric;
  v_entry uuid;
  v_prev public.legal_split_confirmations%rowtype;
  v_hash text;
begin
  select * into v_version from public.legal_split_versions where id = p_version_id for update;
  if not found or public.auth_person_id() is null
     or not public.can_manage_split_sheet(v_version.sheet_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_version.status <> 'draft' then
    raise exception 'split_version_not_draft' using errcode = 'P0001';
  end if;
  select coalesce(sum(share), 0) into v_total
    from public.legal_split_entries where version_id = p_version_id;
  if v_total <> 100 then
    raise exception 'split_total_not_100' using errcode = 'P0001', detail = v_total::text;
  end if;

  -- The versions before it no longer count, nor do their links.
  update public.legal_split_confirmations c
     set status = 'revoked', revoked_at = now()
    from public.legal_split_versions v
   where c.version_id = v.id and v.sheet_id = v_version.sheet_id
     and v.id <> p_version_id and c.status = 'pending';
  update public.legal_split_versions
     set status = 'superseded', superseded_at = now()
   where sheet_id = v_version.sheet_id and id <> p_version_id and status <> 'superseded';

  update public.legal_split_versions
     set status = 'proposed', proposed_by = public.auth_person_id(), proposed_at = now()
   where id = p_version_id;
  perform public.log_split_event(v_version.organization_id, p_version_id, 'split.proposed');

  -- JUR-27: a person already sent a link keeps it. Their previous link
  -- (same contact, else same name, still valid) now opens this version;
  -- only a newcomer gets a new link, returned once. A carried link returns
  -- a null token: nothing to send again. The house (JUR-01) gets none.
  for v_entry in
    select e.id from public.legal_split_entries e
     where e.version_id = p_version_id and not e.house order by e.position
  loop
    entry_id := v_entry;
    select c.* into v_prev
      from public.legal_split_confirmations c
      join public.legal_split_entries pe on pe.id = c.entry_id
      join public.legal_split_entries ne on ne.id = v_entry
      join public.legal_split_versions pv on pv.id = c.version_id
     where pv.sheet_id = v_version.sheet_id and pv.id <> p_version_id
       and c.expires_at > now()
       and (c.status <> 'revoked' or c.revoked_at >= now() - interval '1 minute')
       and ((ne.contact_id is not null and pe.contact_id = ne.contact_id)
            or (ne.contact_id is null and lower(btrim(pe.name)) = lower(btrim(ne.name))))
     order by c.created_at desc
     limit 1;
    if found then
      v_hash := v_prev.token_hash;
      -- The old row keeps its evidence; its key moves to the new version.
      update public.legal_split_confirmations
         set token_hash = encode(sha256(convert_to(v_prev.token_hash || v_prev.id::text, 'UTF8')), 'hex')
       where id = v_prev.id;
      insert into public.legal_split_confirmations
        (organization_id, version_id, entry_id, token_hash, expires_at, created_by)
      values (v_version.organization_id, p_version_id, v_entry, v_hash,
              greatest(v_prev.expires_at, now() + interval '30 days'), public.auth_person_id());
      perform public.consolidate_split_version(p_version_id);
      token := null;
    else
      token := public.new_split_confirmation(v_entry);
    end if;
    return next;
  end loop;
end;
$$;
