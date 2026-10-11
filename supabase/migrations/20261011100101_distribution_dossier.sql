-- Distribution, lot 2 (ticket « Distribution », docs/ARCHITECTURE.md § 8 octies):
-- the delivery file's own parameters and its history.
--
-- Décision V1 : PDS OS prepares, checks and follows a MANUAL deposit at The
-- Orchard; nothing is sent. The dossier REFERENCES its sources (Catalogue,
-- Master, Juridique, Conception, Projet) and never copies them: this table
-- only holds what belongs to the distribution itself (§ 6.5 — territories,
-- pre-order, pre-listening, price tier, notes) and which Fiche Livrable of
-- the Conception is the cover (a reference, its validation stays there).
--
-- 1. distribution_dossiers: one per project, written by the project's owner
--    (« responsable Distribution ») with column grants; read by whoever sees
--    the project.
-- 2. distribution_events: the history (§ 10), written by triggers only.

-- ------------------------------------------------------------ 1. dossiers

create table public.distribution_dossiers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- world: everywhere; include: only `territories`; exclude: everywhere but.
  territory_mode text not null default 'world',
  -- ISO 3166-1 alpha-2 codes.
  territories text[] not null default '{}',
  -- null = not said yet (shown « À renseigner »), never read as « non ».
  preorder boolean,
  preorder_on date,
  prelisten boolean,
  prelisten_on date,
  -- The Orchard's tiers, or « à confirmer ».
  price_tier text,
  notes text,
  -- The cover: a Fiche Livrable of the Conception (same project, trigger).
  cover_sheet_id uuid,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint distribution_dossiers_project_key unique (project_id),
  constraint distribution_dossiers_id_org_key unique (id, organization_id),
  constraint distribution_dossiers_project_same_org
    foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint distribution_dossiers_cover_same_org
    foreign key (cover_sheet_id, organization_id)
    references public.design_sheets (id, organization_id)
    on delete set null (cover_sheet_id),
  constraint distribution_dossiers_territory_mode_check
    check (territory_mode in ('world', 'include', 'exclude')),
  constraint distribution_dossiers_territories_check check (
    cardinality(territories) <= 300
    and array_to_string(territories, ',') ~ '^([A-Z]{2}(,[A-Z]{2})*)?$'),
  -- A list only when it means something, and never empty when it does.
  constraint distribution_dossiers_territories_mode check (
    (territory_mode = 'world') = (cardinality(territories) = 0)),
  constraint distribution_dossiers_preorder_date
    check (preorder_on is null or preorder is true),
  constraint distribution_dossiers_prelisten_date
    check (prelisten_on is null or prelisten is true),
  constraint distribution_dossiers_price_tier_check
    check (price_tier is null or price_tier in ('front', 'mid', 'budget', 'to_confirm')),
  constraint distribution_dossiers_notes_length
    check (notes is null or char_length(notes) <= 2000)
);

create or replace function public.distribution_dossier_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.cover_sheet_id is not null and not exists (
    select 1 from public.design_sheets s
     where s.id = new.cover_sheet_id and s.project_id = new.project_id) then
    raise exception 'cover_not_in_project' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.distribution_dossier_check() from public, anon, authenticated;

create trigger b_check before insert or update on public.distribution_dossiers
  for each row execute function public.distribution_dossier_check();
create trigger a_set_created_by before insert on public.distribution_dossiers
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.distribution_dossiers
  for each row execute function public.set_updated_at();

alter table public.distribution_dossiers enable row level security;
alter table public.distribution_dossiers force row level security;
revoke all on table public.distribution_dossiers from anon, authenticated;
grant select on table public.distribution_dossiers to authenticated;
grant insert (organization_id, project_id, territory_mode, territories, preorder,
  preorder_on, prelisten, prelisten_on, price_tier, notes, cover_sheet_id)
  on public.distribution_dossiers to authenticated;
grant update (territory_mode, territories, preorder, preorder_on, prelisten,
  prelisten_on, price_tier, notes, cover_sheet_id)
  on public.distribution_dossiers to authenticated;

create policy distribution_dossiers_select on public.distribution_dossiers
  for select to authenticated
  using (public.can_see_project(project_id));

create policy distribution_dossiers_insert_owner on public.distribution_dossiers
  for insert to authenticated
  with check (public.is_project_owner(project_id));

create policy distribution_dossiers_update_owner on public.distribution_dossiers
  for update to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- ------------------------------------------------------------ 2. history

create table public.distribution_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  -- 'dossier.parameters_saved', later 'version.submitted', 'deposit.declared'…
  kind text not null,
  data jsonb not null default '{}'::jsonb,
  actor uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint distribution_events_project_same_org
    foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  constraint distribution_events_kind_check check (kind ~ '^[a-z_]+\.[a-z_]+$')
);

create index distribution_events_project_idx
  on public.distribution_events (project_id, created_at desc);

alter table public.distribution_events enable row level security;
alter table public.distribution_events force row level security;
revoke all on table public.distribution_events from anon, authenticated;
grant select on table public.distribution_events to authenticated;

create policy distribution_events_select on public.distribution_events
  for select to authenticated
  using (public.can_see_project(project_id));

create or replace function public.distribution_log(
  p_organization_id uuid,
  p_project_id uuid,
  p_kind text,
  p_data jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.distribution_events (organization_id, project_id, kind, data, actor)
  values (p_organization_id, p_project_id, p_kind, coalesce(p_data, '{}'::jsonb),
    public.auth_person_id());
$$;

revoke execute on function public.distribution_log(uuid, uuid, text, jsonb)
  from public, anon, authenticated;

-- The parameters as saved, with what changed (§ 10: « paramètres »).
create or replace function public.distribution_dossier_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new jsonb := to_jsonb(new) - array['id', 'organization_id', 'project_id',
    'created_by', 'created_at', 'updated_at'];
  v_old jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) - array['id',
    'organization_id', 'project_id', 'created_by', 'created_at', 'updated_at']
    else '{}'::jsonb end;
  v_changed text[];
begin
  select coalesce(array_agg(key order by key), '{}') into v_changed
    from jsonb_each(v_new) n
   where n.value is distinct from coalesce(v_old -> n.key, 'null'::jsonb);
  if cardinality(v_changed) = 0 then
    return null;
  end if;
  perform public.distribution_log(new.organization_id, new.project_id,
    'dossier.parameters_saved',
    jsonb_build_object('changed', to_jsonb(v_changed), 'values', v_new));
  return null;
end;
$$;

revoke execute on function public.distribution_dossier_events() from public, anon, authenticated;

create trigger z_events after insert or update on public.distribution_dossiers
  for each row execute function public.distribution_dossier_events();
