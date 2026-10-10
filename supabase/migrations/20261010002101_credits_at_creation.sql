-- UX test of 09/10/2026, section 8 (« ne jamais faire retaper »):
--
-- 1. A title is created with its credits (« Crédits absents de « Nouveau
--    titre » : ~10 modales pour 3 titres »): create_master takes them, one
--    person with all their roles, written as one row per role in the same
--    transaction as the title.
-- 2. One person, several roles, entered once (« 2 crédits pour une
--    autrice-compositrice »): set_master_contributor_roles replaces the rows
--    of one person of a title by their roles, keeping the rows of the roles
--    kept (their id, what the Juridique linked to them).
-- 3. The contact of an artist (manager, booker…) may be a person of the
--    Réseau (« manager… en nom libre, hors Réseau »): artist_contacts.contact_id.
--
-- The data stays one row per role in master_contributors: the Juridique, the
-- SACEM bulletin and the contracts read it so.

-- 1. create_master ---------------------------------------------------------

drop function public.create_master(uuid, text, jsonb, text, text, integer, text, text);

-- p_credits: [{"artist_id": uuid, "role": "main"|"featuring"}, …] in display order.
-- p_contributors: [{"name": text, "contact_id": uuid|null, "roles": [text, …]}, …].
create or replace function public.create_master(
  p_organization_id uuid,
  p_title text,
  p_credits jsonb,
  p_variant text default 'original',
  p_isrc text default null,
  p_duration_seconds integer default null,
  p_variant_label text default null,
  p_audio_state text default null,
  p_contributors jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if jsonb_typeof(p_credits) is distinct from 'array' or jsonb_array_length(p_credits) = 0 then
    raise exception 'master_requires_artist';
  end if;
  if jsonb_typeof(coalesce(p_contributors, '[]'::jsonb)) <> 'array'
     or exists (select 1 from jsonb_array_elements(coalesce(p_contributors, '[]'::jsonb)) c
                where jsonb_typeof(c -> 'roles') is distinct from 'array'
                   or jsonb_array_length(c -> 'roles') = 0) then
    raise exception 'contributor_requires_role' using errcode = '23514';
  end if;

  insert into public.masters (organization_id, title, variant, variant_label, audio_state,
                              isrc, duration_seconds)
  values (
    p_organization_id,
    btrim(p_title),
    coalesce(p_variant, 'original'),
    case when p_variant = 'other' then nullif(btrim(p_variant_label), '') end,
    p_audio_state,
    nullif(upper(regexp_replace(coalesce(p_isrc, ''), '[\s-]', '', 'g')), ''),
    p_duration_seconds
  )
  returning id into v_id;

  insert into public.master_artists (organization_id, master_id, artist_id, role, position)
  select p_organization_id, v_id, (c.value ->> 'artist_id')::uuid,
         coalesce(c.value ->> 'role', 'main'), c.ordinality::integer
  from jsonb_array_elements(p_credits) with ordinality as c (value, ordinality);

  -- Each role a row, in the order given; the table's checks and RLS decide.
  insert into public.master_contributors (organization_id, master_id, name, role, contact_id)
  select p_organization_id, v_id, btrim(c.value ->> 'name'), r.value,
         nullif(c.value ->> 'contact_id', '')::uuid
    from jsonb_array_elements(coalesce(p_contributors, '[]'::jsonb))
         with ordinality as c (value, ordinality)
   cross join lateral (select distinct x.value
                         from jsonb_array_elements_text(c.value -> 'roles') as x (value)) r
   order by c.ordinality, r.value;

  return v_id;
end;
$$;
revoke execute on function public.create_master(uuid, text, jsonb, text, text, integer, text, text, jsonb)
  from public, anon;
grant execute on function public.create_master(uuid, text, jsonb, text, text, integer, text, text, jsonb)
  to authenticated;

-- 2. One person, several roles -----------------------------------------------

-- p_item_ids: the rows of that person on the title being edited (none when
-- adding). Rows of a role kept are updated in place, rows of a role removed
-- are deleted, a new role is a new row. With the caller's rights (RLS and
-- column grants of master_contributors: manage_catalog).
create or replace function public.set_master_contributor_roles(
  p_master_id uuid,
  p_item_ids uuid[],
  p_name text,
  p_contact_id uuid,
  p_roles text[],
  p_detail text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid;
  v_roles text[] := array(select distinct r from unnest(coalesce(p_roles, '{}')) r);
begin
  if cardinality(v_roles) = 0 then
    raise exception 'contributor_requires_role' using errcode = '23514';
  end if;
  select organization_id into v_org from public.masters where id = p_master_id;
  if v_org is null then
    raise exception 'master_not_found' using errcode = '42501';
  end if;
  if exists (select 1 from unnest(coalesce(p_item_ids, '{}')) i
             where not exists (select 1 from public.master_contributors c
                               where c.id = i and c.master_id = p_master_id)) then
    raise exception 'contributor_not_found' using errcode = '42501';
  end if;

  delete from public.master_contributors c
   where c.id = any (coalesce(p_item_ids, '{}'))
     and c.role <> all (v_roles);

  update public.master_contributors c
     set name = btrim(p_name),
         detail = nullif(btrim(coalesce(p_detail, '')), '')
   where c.id = any (coalesce(p_item_ids, '{}'));
  -- contact_id has its own grant (20261004000201_contributor_contact.sql).
  update public.master_contributors c
     set contact_id = p_contact_id
   where c.id = any (coalesce(p_item_ids, '{}'))
     and c.contact_id is distinct from p_contact_id;

  -- A role the person already holds on the title (their contact, or their
  -- name when unlinked) is not credited twice.
  insert into public.master_contributors (organization_id, master_id, name, role, detail, contact_id)
  select v_org, p_master_id, btrim(p_name), r,
         nullif(btrim(coalesce(p_detail, '')), ''), p_contact_id
    from unnest(v_roles) r
   where not exists (
     select 1 from public.master_contributors c
      where c.master_id = p_master_id and c.role = r
        and (c.id = any (coalesce(p_item_ids, '{}'))
             or (p_contact_id is not null and c.contact_id = p_contact_id)
             or (p_contact_id is null and c.contact_id is null
                 and lower(btrim(c.name)) = lower(btrim(p_name)))));
end;
$$;
revoke execute on function public.set_master_contributor_roles(uuid, uuid[], text, uuid, text[], text)
  from public, anon;
grant execute on function public.set_master_contributor_roles(uuid, uuid[], text, uuid, text[], text)
  to authenticated;

-- 3. The contact of an artist, from the Réseau -------------------------------

alter table public.artist_contacts add column contact_id uuid;
-- A contact deleted from the Réseau leaves the artist's contact as a name.
alter table public.artist_contacts
  add constraint artist_contacts_contact_same_org
  foreign key (contact_id, organization_id)
  references public.network_contacts (id, organization_id)
  on delete set null (contact_id);
create index artist_contacts_contact_idx on public.artist_contacts (contact_id)
  where contact_id is not null;
comment on column public.artist_contacts.contact_id is
  'The Réseau contact this artist contact is (manager, booker…); name, email and phone are copied from it when chosen, editable.';

grant insert (contact_id) on public.artist_contacts to authenticated;
grant update (contact_id) on public.artist_contacts to authenticated;
