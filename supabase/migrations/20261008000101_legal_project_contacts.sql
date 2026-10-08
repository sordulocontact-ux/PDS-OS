-- Intervenants non crédités du Juridique (ticket « Architecture globale »,
-- 08/10/2026, lot 6) : un avocat, un distributeur, un photographe, un
-- réalisateur… interviennent sur le projet sans être crédités sur un titre.
-- Ils sont choisis dans le Réseau (jamais un nom libre), avec le rôle qui
-- décide de leur fiche de renseignements et des modèles de contrat
-- compatibles (mêmes rôles que lib/legal/forms/definition.ts). Lus et écrits
-- par manage_legal, comme tout le Juridique ; le projet supprimé les emporte
-- (cascade).

create table public.legal_project_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  project_id uuid not null,
  contact_id uuid not null,
  role text not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint legal_project_contacts_role_check check (role in (
    'author', 'composer', 'arranger', 'performer', 'musician', 'backing_vocalist',
    'producer', 'label', 'provider', 'publisher', 'other')),
  constraint legal_project_contacts_key unique (project_id, contact_id),
  constraint legal_project_contacts_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade,
  constraint legal_project_contacts_contact_same_org
    foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id)
);

create index legal_project_contacts_project_idx on public.legal_project_contacts (project_id);

alter table public.legal_project_contacts enable row level security;
alter table public.legal_project_contacts force row level security;
revoke all on public.legal_project_contacts from anon, authenticated;

create policy legal_project_contacts_select_legal on public.legal_project_contacts
  for select to authenticated
  using (public.has_permission(organization_id, 'manage_legal')
         and public.can_see_project(project_id));

grant select on public.legal_project_contacts to authenticated;

-- Adds a person of the Réseau to the project's legal file. A person already
-- credited on one of the project's titles is known by the credit: refused.
create or replace function public.add_legal_project_contact(
  p_project_id uuid,
  p_contact_id uuid,
  p_role text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_me uuid := public.auth_person_id();
  v_id uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or v_me is null
     or not public.has_permission(v_org, 'manage_legal')
     or not public.can_see_project(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.network_contacts
                  where id = p_contact_id and organization_id = v_org
                    and archived_at is null) then
    raise exception 'legal_contact_invalid' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.master_contributors c
               join public.project_masters pm on pm.master_id = c.master_id
              where pm.project_id = p_project_id and c.contact_id = p_contact_id) then
    raise exception 'legal_contact_credited' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.legal_project_contacts
              where project_id = p_project_id and contact_id = p_contact_id) then
    raise exception 'legal_contact_already_added' using errcode = 'P0001';
  end if;

  insert into public.legal_project_contacts
    (organization_id, project_id, contact_id, role, created_by)
  values (v_org, p_project_id, p_contact_id, p_role, v_me)
  returning id into v_id;
  return v_id;
end;
$$;

-- Takes a person out of the legal file, unless a contract was mapped for
-- them in this project (the mapping says what was agreed: remove it first).
create or replace function public.remove_legal_project_contact(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.legal_project_contacts%rowtype;
begin
  select * into v_row from public.legal_project_contacts where id = p_id;
  if not found or public.auth_person_id() is null
     or not public.has_permission(v_row.organization_id, 'manage_legal')
     or not public.can_see_project(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if exists (select 1 from public.legal_agreement_needs
              where project_id = v_row.project_id and contact_id = v_row.contact_id) then
    raise exception 'legal_contact_in_use' using errcode = 'P0001';
  end if;
  delete from public.legal_project_contacts where id = p_id;
end;
$$;

revoke execute on function public.add_legal_project_contact(uuid, uuid, text) from public, anon;
revoke execute on function public.remove_legal_project_contact(uuid) from public, anon;
grant execute on function public.add_legal_project_contact(uuid, uuid, text) to authenticated;
grant execute on function public.remove_legal_project_contact(uuid) to authenticated;
