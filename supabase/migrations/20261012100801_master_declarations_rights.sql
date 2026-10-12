-- Retours Catalogue du 11/10/2026, retours 14 et 54 à 63 (docs/ARCHITECTURE.md
-- § 2 sexies, « Droits et déclarations »).
--
-- Declarations: the final list of statuses (À vérifier, À effectuer,
-- Déposée, Confirmée, À corriger, Refusée, Non applicable), who follows it
-- when a third party does, a proof taken from the title's files (the same
-- file, never deposited twice), and an append-only history of each change
-- (author, instant, old and new values).
--
-- Rights ℗: the holder proposed from the master split is not a confirmed
-- holder. A person confirms it (who and when written here); changing the
-- year or the holder afterwards takes the confirmation back.

-- ---------------------------------------------------------------------------
-- Declarations
-- ---------------------------------------------------------------------------

alter table public.master_declarations drop constraint master_declarations_status_check;
alter table public.master_declarations add constraint master_declarations_status_check
  check (status in ('to_verify', 'to_do', 'submitted', 'confirmed', 'to_correct',
                    'rejected', 'not_applicable'));

alter table public.master_declarations
  add column third_party text,
  add column proof_file_id uuid references public.master_files (id) on delete set null;
alter table public.master_declarations add constraint master_declarations_third_party_check
  check (third_party is null or (btrim(third_party) <> '' and char_length(third_party) <= 200));

grant insert (third_party, proof_file_id) on public.master_declarations to authenticated;
grant update (third_party, proof_file_id) on public.master_declarations to authenticated;

-- The proof is a file of the same title.
create or replace function public.master_declarations_proof_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.proof_file_id is not null and not exists (
    select 1 from public.master_files f
     where f.id = new.proof_file_id and f.master_id = new.master_id
  ) then
    raise exception 'declaration_proof_not_of_title' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger a_proof_check before insert or update of proof_file_id
  on public.master_declarations
  for each row execute function public.master_declarations_proof_check();

create table public.master_declaration_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  master_id uuid not null,
  organism text not null,
  -- {field: [old, new]} for status, reference, declared_on, third_party,
  -- proof_file_id; empty olds on creation.
  changes jsonb not null,
  actor_person_id uuid references public.people (id),
  -- The instant of the change itself: two changes of one transaction keep
  -- their order.
  created_at timestamptz not null default clock_timestamp(),
  constraint master_declaration_events_master_same_org foreign key (master_id, organization_id)
    references public.masters (id, organization_id) on delete cascade
);
create index master_declaration_events_master_idx
  on public.master_declaration_events (master_id, created_at);

alter table public.master_declaration_events enable row level security;
alter table public.master_declaration_events force row level security;
revoke all on table public.master_declaration_events from anon, authenticated;
grant select on table public.master_declaration_events to authenticated;
create policy master_declaration_events_select_members on public.master_declaration_events
  for select to authenticated using (public.is_active_member(organization_id));

create or replace function public.master_declarations_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_changes jsonb := '{}'::jsonb;
  v_old jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  v_new jsonb := to_jsonb(new);
  v_field text;
begin
  foreach v_field in array array['status', 'reference', 'declared_on', 'third_party',
                                 'proof_file_id'] loop
    if (v_old -> v_field) is distinct from (v_new -> v_field) then
      v_changes := v_changes || jsonb_build_object(
        v_field, jsonb_build_array(v_old -> v_field, v_new -> v_field));
    end if;
  end loop;
  if v_changes <> '{}'::jsonb then
    insert into public.master_declaration_events
      (organization_id, master_id, organism, changes, actor_person_id)
    values (new.organization_id, new.master_id, new.organism, v_changes,
            public.auth_person_id());
  end if;
  return null;
end;
$$;
revoke execute on function public.master_declarations_history() from public, anon, authenticated;
create trigger z_history after insert or update on public.master_declarations
  for each row execute function public.master_declarations_history();

-- ---------------------------------------------------------------------------
-- Rights ℗: proposed, then confirmed by a person
-- ---------------------------------------------------------------------------

alter table public.masters
  add column rights_confirmed_at timestamptz,
  add column rights_confirmed_by uuid references public.people (id);

-- A change of the year or the holder takes the confirmation back: the
-- mention is to review, never silently kept as validated.
create or replace function public.masters_rights_unconfirm()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.rights_holder, new.rights_year) is distinct from (old.rights_holder, old.rights_year)
     and new.rights_confirmed_at is not distinct from old.rights_confirmed_at then
    new.rights_confirmed_at := null;
    new.rights_confirmed_by := null;
  end if;
  return new;
end;
$$;
create trigger a_rights_unconfirm before update on public.masters
  for each row execute function public.masters_rights_unconfirm();

-- « Confirmer le titulaire du ℗ »: whoever writes the title (manage_catalog,
-- active master), with both values filled.
create or replace function public.confirm_master_rights(p_master_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.masters%rowtype;
begin
  select * into v from public.masters where id = p_master_id for update;
  if not found or v.archived_at is not null
     or not public.has_permission(v.organization_id, 'manage_catalog') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.rights_holder is null or v.rights_year is null then
    raise exception 'rights_incomplete' using errcode = 'P0001';
  end if;
  update public.masters
     set rights_confirmed_at = now(), rights_confirmed_by = public.auth_person_id()
   where id = p_master_id;
end;
$$;
revoke execute on function public.confirm_master_rights(uuid) from public, anon;
grant execute on function public.confirm_master_rights(uuid) to authenticated;
