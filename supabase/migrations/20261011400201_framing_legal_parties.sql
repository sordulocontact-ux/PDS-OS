-- PROJ-BUG-03: the legal parties of the Cadrage, qualified one by one.
--
-- Until now « Parties impliquées » listed everyone outside PDS (credits, the
-- team held by a contact, the Juridique's intervenants) and « Contrats et
-- droits à prévoir » proposed « Un accord avec chaque partie » : a mixer
-- became a contractual party by default. The ticket: an operational
-- contributor is not automatically a contractual party, a production
-- arrangement is not an existing contract without proof, the document need
-- depends on the role and the relation, and a qualification needs a person.
--
-- The candidates stay computed by code from the project's records
-- (lib/framing/legal-parties.ts). This table holds only what a person
-- decided for one of them: relation, document
-- status, the contract that proves it, who follows it. One row per party.
-- No rule « this role needs this contract » is written anywhere: the
-- tickets and the law do not give one (docs/CONTEXTE-PROJET.md § 2).

create table public.framing_legal_parties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- The party's name, normalised by code: one decision per party.
  party_key text not null,
  name text not null,
  contact_id uuid,
  -- The roles as the person saw them when deciding.
  roles text[] not null default '{}',
  relation text,
  document_status text not null,
  contract_id uuid,
  owner_person_id uuid references public.people (id),
  note text,
  decided_by uuid references public.people (id),
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint framing_legal_parties_key unique (project_id, party_key),
  constraint framing_legal_parties_key_check
    check (btrim(party_key) <> '' and char_length(party_key) <= 200),
  constraint framing_legal_parties_name_check
    check (btrim(name) <> '' and char_length(name) <= 200),
  constraint framing_legal_parties_roles_check check (cardinality(roles) <= 20),
  constraint framing_legal_parties_relation_check
    check (relation is null
           or relation in ('client', 'provider', 'partner', 'supplier', 'other')),
  constraint framing_legal_parties_status_check
    check (document_status in
           ('existing', 'to_verify', 'to_prepare', 'not_needed', 'not_applicable')),
  -- « Existant » only with the contract that proves it.
  constraint framing_legal_parties_existing_proved
    check (document_status <> 'existing' or contract_id is not null),
  -- No document needed, or not applicable: said why.
  constraint framing_legal_parties_reasoned
    check (document_status not in ('not_needed', 'not_applicable')
           or (note is not null and btrim(note) <> '')),
  constraint framing_legal_parties_note_check
    check (note is null or char_length(note) <= 500),
  -- Gone with its project (delete_project_row needs no change).
  constraint framing_legal_parties_project_same_org foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint framing_legal_parties_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id) on delete set null (contact_id),
  -- The proof deleted, the decision goes with it: the party is « à qualifier » again.
  constraint framing_legal_parties_contract_same_org foreign key (contract_id, organization_id)
    references public.contracts (id, organization_id) on delete cascade
);

create index framing_legal_parties_contract_idx on public.framing_legal_parties (contract_id)
  where contract_id is not null;

-- Who decided, and when: written by the database, never by the client.
create function public.framing_legal_parties_decided()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.decided_by := public.auth_person_id();
  new.decided_at := now();
  return new;
end;
$$;

create trigger a_decided before insert or update on public.framing_legal_parties
  for each row execute function public.framing_legal_parties_decided();

alter table public.framing_legal_parties enable row level security;
alter table public.framing_legal_parties force row level security;
revoke all on public.framing_legal_parties from anon, authenticated;
grant select, delete on public.framing_legal_parties to authenticated;
grant insert (organization_id, project_id, party_key, name, contact_id, roles, relation,
              document_status, contract_id, owner_person_id, note)
  on public.framing_legal_parties to authenticated;
grant update (relation, document_status, contract_id, owner_person_id, note, roles)
  on public.framing_legal_parties to authenticated;

create policy framing_legal_parties_select_visible on public.framing_legal_parties
  for select to authenticated using (public.can_see_project(project_id));
create policy framing_legal_parties_insert_owner on public.framing_legal_parties
  for insert to authenticated with check (public.is_project_owner(project_id));
create policy framing_legal_parties_update_owner on public.framing_legal_parties
  for update to authenticated
  using (public.is_project_owner(project_id)) with check (public.is_project_owner(project_id));
create policy framing_legal_parties_delete_owner on public.framing_legal_parties
  for delete to authenticated using (public.is_project_owner(project_id));

-- Like every line of the Cadrage: written only while « Cadre juridique » is open.
create policy framing_legal_parties_dimension_insert on public.framing_legal_parties
  as restrictive for insert to authenticated
  with check (public.framing_dimension_editable(project_id, 'legal'));
create policy framing_legal_parties_dimension_update on public.framing_legal_parties
  as restrictive for update to authenticated
  using (public.framing_dimension_editable(project_id, 'legal'))
  with check (public.framing_dimension_editable(project_id, 'legal'));
create policy framing_legal_parties_dimension_delete on public.framing_legal_parties
  as restrictive for delete to authenticated
  using (public.framing_dimension_editable(project_id, 'legal'));
