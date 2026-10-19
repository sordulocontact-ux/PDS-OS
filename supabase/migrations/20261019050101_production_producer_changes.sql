-- « Changer qui produit » and « Révoquer » a private link (proto « Projet
-- complet » pqChangeModal, rolesModal; production.md § 2.3, 2.4, PR-2/PR-3).
--   * Changing who produces a deliverable is a decision with its reason: the
--     previous choice is kept (who, what was already done, what the new
--     journey takes over), nothing of it is deleted — its quotes, places and
--     files stay on the sheet.
--   * The previous company's private link may be revoked at the same time;
--     what it deposited stays.
--   * A private link can be revoked on its own (« Révoquer »), without
--     making a new one.

create table public.production_organization_changes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  sheet_id uuid not null,
  from_kind text not null,
  from_company_contact_id uuid references public.network_contacts (id),
  from_by uuid references public.people (id),
  from_at timestamptz,
  to_kind text not null,
  to_company_contact_id uuid references public.network_contacts (id),
  reason text not null,
  done text[] not null default '{}',
  carried text[] not null default '{}',
  link_revoked boolean not null default false,
  changed_by uuid references public.people (id),
  changed_at timestamptz not null default now(),
  constraint production_organization_changes_kinds_check
    check (from_kind in ('internal', 'external') and to_kind in ('internal', 'external')),
  constraint production_organization_changes_reason_check
    check (btrim(reason) <> '' and char_length(reason) <= 1000),
  constraint production_organization_changes_lists_check
    check (cardinality(done) <= 30 and cardinality(carried) <= 30),
  constraint production_organization_changes_sheet_same_org foreign key (sheet_id, organization_id)
    references public.production_sheets (id, organization_id) on delete cascade
);
create index production_organization_changes_sheet_idx
  on public.production_organization_changes (sheet_id, changed_at desc);
alter table public.production_organization_changes enable row level security;
alter table public.production_organization_changes force row level security;
revoke all on table public.production_organization_changes from anon, authenticated;
grant select on public.production_organization_changes to authenticated;
create policy production_organization_changes_select on public.production_organization_changes
  for select to authenticated using (public.can_see_project(project_id));

-- « Changer qui produit » (the project's owner): a new choice with its reason.
create function public.change_production_producer(
  p_sheet_id uuid, p_organization text, p_company_contact_id uuid, p_reason text,
  p_revoke_link boolean, p_done text[], p_carried text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
  v_revoked integer := 0;
begin
  select * into s from public.production_sheets where id = p_sheet_id for update;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.is_project_owner(s.project_id)
     or not public.project_stage_in_progress(s.project_id, 'production')
     or s.closed_at is not null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if s.organization is null then
    raise exception 'not_organized';
  end if;
  if p_organization is null or p_organization not in ('internal', 'external') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception 'reason_required';
  end if;
  if p_organization = 'external' and p_company_contact_id is null then
    raise exception 'company_required';
  end if;
  if p_organization = s.organization
     and p_company_contact_id is not distinct from s.company_contact_id then
    raise exception 'same_producer';
  end if;
  if p_company_contact_id is not null and not exists (
       select 1 from public.network_contacts c
        where c.id = p_company_contact_id and c.organization_id = s.organization_id
          and c.archived_at is null) then
    raise exception 'contact_not_found' using errcode = '23514';
  end if;

  if coalesce(p_revoke_link, false) and s.company_contact_id is not null then
    update public.production_provider_links set revoked_at = now()
     where sheet_id = s.id and contact_id = s.company_contact_id and revoked_at is null;
    get diagnostics v_revoked = row_count;
  end if;

  insert into public.production_organization_changes
    (organization_id, project_id, sheet_id, from_kind, from_company_contact_id, from_by, from_at,
     to_kind, to_company_contact_id, reason, done, carried, link_revoked, changed_by)
  values (s.organization_id, s.project_id, s.id, s.organization, s.company_contact_id,
          s.organized_by, s.organized_at, p_organization,
          case when p_organization = 'external' then p_company_contact_id end,
          left(btrim(p_reason), 1000),
          (select coalesce(array_agg(left(x, 300)), '{}') from unnest(coalesce(p_done, '{}')) x
            where btrim(x) <> ''),
          (select coalesce(array_agg(left(x, 300)), '{}') from unnest(coalesce(p_carried, '{}')) x
            where btrim(x) <> ''),
          v_revoked > 0, public.auth_person_id());

  update public.production_sheets
     set organization = p_organization,
         company_contact_id = case when p_organization = 'external' then p_company_contact_id end,
         organized_at = now(), organized_by = public.auth_person_id()
   where id = s.id;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'sheet', s.id, 'organized',
    jsonb_build_object('organization', s.organization, 'company', s.company_contact_id),
    jsonb_build_object('organization', p_organization, 'company', p_company_contact_id,
                       'reason', btrim(p_reason)));
  insert into public.notifications
    (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
  select s.organization_id, x.id, public.auth_person_id(), 'production_organized', s.project_id,
         s.deliverable_id
    from (select distinct unnest(array[s.line_producer_person_id, s.quote_validator_person_id]) as id) x
   where x.id is not null and x.id is distinct from public.auth_person_id();
end;
$$;
revoke execute on function public.change_production_producer(uuid, text, uuid, text, boolean, text[], text[])
  from public, anon;
grant execute on function public.change_production_producer(uuid, text, uuid, text, boolean, text[], text[])
  to authenticated;

-- « Révoquer » a contact's private link (whoever organises the Production):
-- it stops working; what was deposited through it stays.
create function public.revoke_production_provider_link(p_sheet_id uuid, p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.production_sheets%rowtype;
  v_count integer;
begin
  select * into s from public.production_sheets where id = p_sheet_id;
  if not found or not public.can_see_project(s.project_id) then
    raise exception 'sheet_not_found';
  end if;
  if not public.production_can_organize(s.project_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.production_provider_links set revoked_at = now()
   where sheet_id = s.id and contact_id = p_contact_id and revoked_at is null;
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'link_not_found';
  end if;
  perform public.production_log(s.organization_id, s.project_id, s.id, 'link', p_contact_id,
    'revoked', null, jsonb_build_object('contact', p_contact_id));
end;
$$;
revoke execute on function public.revoke_production_provider_link(uuid, uuid) from public, anon;
grant execute on function public.revoke_production_provider_link(uuid, uuid) to authenticated;
