-- Projet collectif, lot 15 (docs/pds-mic-plan.md § 3 bis, point 7) : la
-- Distribution par sortie. Chaque sortie d'un collectif (la sortie d'un titre,
-- la compilation) a son dépôt : son dossier, ses versions, ses contrôles, ses
-- plateformes, ses déclarations, ses anomalies, sa clôture, ses dérogations et
-- son journal.
--
--   1. release_id sur les dix tables de la Distribution. Nul : le dépôt d'un
--      projet simple, exactement comme avant (aucune donnée reprise). Pour un
--      collectif, toute ligne porte sa sortie (garde-fou distribution_release_scope),
--      de la même organisation et du même projet (clé (release_id, project_id)).
--   2. Chaque unique (project_id, …) devient deux index partiels :
--      (project_id, …) where release_id is null, l'existant, et
--      (release_id, …) where release_id is not null. Les déclarations suivent
--      leur version par une clé de portée calculée (release_id, sinon project_id).
--   3. Les fonctions qui visent un projet prennent p_release_id (nul par défaut :
--      un projet simple les appelle comme avant). Un collectif sans sortie est
--      refusé (release_required) : jamais le dépôt d'une autre sortie en silence.
--      Les fonctions qui visent une ligne (une version, une déclaration…) lisent
--      la sortie sur cette ligne.
--   4. Verrou de la soumission d'une sortie de collectif : titre provisoire
--      (title_provisional), contrat non signé sans dérogation de sortie, sur son
--      titre ou sur l'un des titres de la compilation (contract_missing, lot 12),
--      sortie archivée ou titre abandonné.
--   5. set_collective_release_mode : « compilation soumise » ne lit plus que la
--      compilation ; une sortie de titre soumise en Distribution est « partie ».
--
-- Les emprunts au Juridique (distribution_legal_blockers) restent ceux du
-- projet : un emprunt non sécurisé bloque chaque dépôt du collectif.

-- 1 ------------------------------------------------------------------------------------------
alter table public.releases
  add constraint releases_id_project_key unique (id, project_id);

alter table public.distribution_dossiers add column release_id uuid;
alter table public.distribution_versions add column release_id uuid;
alter table public.distribution_checks add column release_id uuid;
alter table public.distribution_platforms add column release_id uuid;
alter table public.distribution_declarations add column release_id uuid;
alter table public.distribution_closures add column release_id uuid;
alter table public.distribution_reserves add column release_id uuid;
alter table public.distribution_anomalies add column release_id uuid;
alter table public.distribution_derogations add column release_id uuid;
alter table public.distribution_events add column release_id uuid;

alter table public.distribution_dossiers add constraint distribution_dossiers_release
  foreign key (release_id, project_id) references public.releases (id, project_id) on delete cascade;
alter table public.distribution_versions add constraint distribution_versions_release
  foreign key (release_id, project_id) references public.releases (id, project_id) on delete cascade;
alter table public.distribution_checks add constraint distribution_checks_release
  foreign key (release_id, project_id) references public.releases (id, project_id) on delete cascade;
alter table public.distribution_platforms add constraint distribution_platforms_release
  foreign key (release_id, project_id) references public.releases (id, project_id) on delete cascade;
alter table public.distribution_declarations add constraint distribution_declarations_release
  foreign key (release_id, project_id) references public.releases (id, project_id) on delete cascade;
alter table public.distribution_closures add constraint distribution_closures_release
  foreign key (release_id, project_id) references public.releases (id, project_id) on delete cascade;
alter table public.distribution_reserves add constraint distribution_reserves_release
  foreign key (release_id, project_id) references public.releases (id, project_id) on delete cascade;
alter table public.distribution_anomalies add constraint distribution_anomalies_release
  foreign key (release_id, project_id) references public.releases (id, project_id) on delete cascade;
alter table public.distribution_derogations add constraint distribution_derogations_release
  foreign key (release_id, project_id) references public.releases (id, project_id) on delete cascade;
alter table public.distribution_events add constraint distribution_events_release
  foreign key (release_id, project_id) references public.releases (id, project_id) on delete cascade;

create index distribution_dossiers_release_idx on public.distribution_dossiers (release_id) where release_id is not null;
create index distribution_versions_release_idx on public.distribution_versions (release_id) where release_id is not null;
create index distribution_checks_release_idx on public.distribution_checks (release_id) where release_id is not null;
create index distribution_platforms_release_idx on public.distribution_platforms (release_id) where release_id is not null;
create index distribution_declarations_release_idx on public.distribution_declarations (release_id) where release_id is not null;
create index distribution_closures_release_idx on public.distribution_closures (release_id) where release_id is not null;
create index distribution_reserves_release_idx on public.distribution_reserves (release_id) where release_id is not null;
create index distribution_anomalies_release_idx on public.distribution_anomalies (release_id) where release_id is not null;
create index distribution_derogations_release_idx on public.distribution_derogations (release_id) where release_id is not null;
create index distribution_events_release_idx on public.distribution_events (release_id) where release_id is not null;

-- Les lignes d'un collectif écrites avant ce lot (aucune en local ; par
-- prudence en pré-prod) : celles de sa sortie de projet, devenue sa compilation
-- au lot 13.
do $$
declare
  v_table text;
begin
  foreach v_table in array array['distribution_dossiers', 'distribution_versions',
    'distribution_checks', 'distribution_platforms', 'distribution_declarations',
    'distribution_closures', 'distribution_reserves', 'distribution_anomalies',
    'distribution_derogations', 'distribution_events'] loop
    execute format($f$
      update public.%I x
         set release_id = (select r.id from public.releases r
                            where r.project_id = x.project_id and r.project_title_id is null
                            order by r.created_at limit 1)
       where x.release_id is null
         and exists (select 1 from public.projects p where p.id = x.project_id and p.collective)$f$,
      v_table);
  end loop;
end;
$$;

-- 2 ------------------------------------------------------------------------------------------
-- La clé de portée d'une version et d'une déclaration : la sortie, sinon le
-- projet (identifiants distincts : jamais de collision).
alter table public.distribution_versions
  add column scope_id uuid generated always as (coalesce(release_id, project_id)) stored;
alter table public.distribution_declarations
  add column scope_id uuid generated always as (coalesce(release_id, project_id)) stored;

alter table public.distribution_declarations drop constraint distribution_declarations_version;
alter table public.distribution_versions drop constraint distribution_versions_number_key;
create unique index distribution_versions_number_key on public.distribution_versions
  (project_id, number) where release_id is null;
create unique index distribution_versions_release_number_key on public.distribution_versions
  (release_id, number) where release_id is not null;
alter table public.distribution_versions
  add constraint distribution_versions_scope_number_key unique (scope_id, number);
alter table public.distribution_declarations add constraint distribution_declarations_version
  foreign key (scope_id, version_number)
  references public.distribution_versions (scope_id, number) on delete cascade;

drop index public.distribution_versions_one_pending;
create unique index distribution_versions_one_pending on public.distribution_versions (project_id)
  where status = 'pending' and release_id is null;
create unique index distribution_versions_release_one_pending on public.distribution_versions (release_id)
  where status = 'pending' and release_id is not null;

alter table public.distribution_dossiers drop constraint distribution_dossiers_project_key;
create unique index distribution_dossiers_project_key on public.distribution_dossiers (project_id)
  where release_id is null;
create unique index distribution_dossiers_release_key on public.distribution_dossiers (release_id)
  where release_id is not null;

alter table public.distribution_checks drop constraint distribution_checks_key;
create unique index distribution_checks_key on public.distribution_checks (project_id, check_key)
  where release_id is null;
create unique index distribution_checks_release_key on public.distribution_checks (release_id, check_key)
  where release_id is not null;

alter table public.distribution_platforms drop constraint distribution_platforms_key;
create unique index distribution_platforms_key on public.distribution_platforms (project_id, platform)
  where release_id is null;
create unique index distribution_platforms_release_key on public.distribution_platforms (release_id, platform)
  where release_id is not null;

drop index public.distribution_closures_one_open;
create unique index distribution_closures_one_open on public.distribution_closures (project_id)
  where (status = 'pending' or (status = 'closed' and reopened_at is null)) and release_id is null;
create unique index distribution_closures_release_one_open on public.distribution_closures (release_id)
  where (status = 'pending' or (status = 'closed' and reopened_at is null)) and release_id is not null;

drop index public.distribution_derogations_one_open;
create unique index distribution_derogations_one_open on public.distribution_derogations (project_id)
  where version_number is null and revoked_at is null and release_id is null;
create unique index distribution_derogations_release_one_open on public.distribution_derogations (release_id)
  where version_number is null and revoked_at is null and release_id is not null;

-- Le garde-fou : un collectif écrit toujours avec sa sortie, un projet simple
-- jamais ; une réserve suit sa clôture.
create or replace function public.distribution_release_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_collective boolean;
begin
  select p.collective into v_collective from public.projects p where p.id = new.project_id;
  if coalesce(v_collective, false) then
    if new.release_id is null then
      raise exception 'release_required' using errcode = '23514';
    end if;
  elsif new.release_id is not null then
    raise exception 'release_not_collective' using errcode = '23514';
  end if;
  -- A reserve's closure, read through the row as JSON (the other tables have
  -- no closure_id).
  if tg_table_name = 'distribution_reserves' then
    if new.release_id is distinct from (
         select c.release_id from public.distribution_closures c
          where c.id = (to_jsonb(new) ->> 'closure_id')::uuid) then
      raise exception 'release_mismatch' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.distribution_release_scope() from public, anon, authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array['distribution_dossiers', 'distribution_versions',
    'distribution_checks', 'distribution_platforms', 'distribution_declarations',
    'distribution_closures', 'distribution_reserves', 'distribution_anomalies',
    'distribution_derogations', 'distribution_events'] loop
    execute format('create trigger a_release_scope before insert or update of release_id, project_id
      on public.%I for each row execute function public.distribution_release_scope()', v_table);
  end loop;
end;
$$;

-- The owner writes a dossier's parameters directly (RLS, column grants): a
-- collective's dossier is created with its release, never moved after.
grant insert (release_id) on public.distribution_dossiers to authenticated;

comment on column public.distribution_dossiers.release_id is
  'Projet collectif (lot 15) : la sortie dont c''est le dépôt (sortie d''un titre ou compilation). Nul : le dépôt d''un projet simple. Même colonne, même règle sur les neuf autres tables de la Distribution.';

-- 3 ------------------------------------------------------------------------------------------
-- La sortie demandée appartient au projet ; un collectif en demande toujours une.
create or replace function public.distribution_scope_check(p_project_id uuid, p_release_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_collective boolean;
begin
  select p.collective into v_collective from public.projects p where p.id = p_project_id;
  if not found then
    return;
  end if;
  if v_collective and p_release_id is null then
    raise exception 'release_required' using errcode = 'P0001';
  end if;
  if p_release_id is not null and (not v_collective or not exists (
       select 1 from public.releases r where r.id = p_release_id and r.project_id = p_project_id)) then
    raise exception 'release_not_found' using errcode = 'P0001';
  end if;
end;
$$;
revoke execute on function public.distribution_scope_check(uuid, uuid) from public, anon, authenticated;

-- Les titres d'une sortie : le sien (sortie d'un titre), ceux qui ne sont pas
-- abandonnés, dans l'ordre du projet (compilation).
create or replace function public.release_titles(p_release_id uuid)
returns table (title_id uuid, title_position integer, master_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.position, t.master_id
    from public.releases r
    join public.project_titles t on t.project_id = r.project_id
   where r.id = p_release_id
     and (t.id = r.project_title_id
          or (r.project_title_id is null and t.status <> 'abandoned'))
   order by t.position;
$$;
revoke execute on function public.release_titles(uuid) from public, anon, authenticated;

-- « Titre 7 · Sans titre » : les titres provisoires d'une sortie (lot 7).
create or replace function public.release_provisional_titles_text(p_release_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select string_agg(coalesce(t.working_title, 'Titre ' || t.position || ' · sans nom'),
           ', ' order by t.position)
    from public.release_titles(p_release_id) x
    join public.project_titles t on t.id = x.title_id
    join public.masters m on m.id = x.master_id
   where m.title_is_provisional;
$$;
revoke execute on function public.release_provisional_titles_text(uuid) from public, anon, authenticated;

-- Pour les écrans : ce qui refuse la soumission d'une sortie (lot 15), lu par
-- qui voit le collectif. Une ligne par refus : son code et son détail.
create or replace function public.release_submission_blockers(p_release_id uuid)
returns table (code text, detail text)
language sql
stable
security definer
set search_path = ''
as $$
  with r as (
    select r.* from public.releases r
      join public.projects p on p.id = r.project_id and p.collective
     where r.id = p_release_id and public.can_see_project(r.project_id))
  select 'release_archived', null::text from r where r.archived_at is not null
  union all
  select 'title_abandoned', t.working_title from r
    join public.project_titles t on t.id = r.project_title_id
   where t.status = 'abandoned'
  union all
  select 'title_provisional', x from r,
         lateral (select public.release_provisional_titles_text(r.id) as x) p
   where x is not null
  union all
  select 'contract_missing', x from r,
         lateral (select public.release_contract_gaps_text(r.id) as x) g
   where x is not null;
$$;
revoke execute on function public.release_submission_blockers(uuid) from public, anon;
grant execute on function public.release_submission_blockers(uuid) to authenticated;

-- Le verrou des contrats d'une version (lot 12) : ceux de sa sortie.
create or replace function public.distribution_versions_contract_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_missing text;
begin
  if exists (select 1 from public.projects p where p.id = new.project_id and p.collective) then
    v_missing := case when new.release_id is null
                      then public.contract_gaps_text(new.project_id, 'release')
                      else public.release_contract_gaps_text(new.release_id) end;
    if v_missing is not null then
      raise exception 'contract_missing' using errcode = '23514', detail = v_missing;
    end if;
  end if;
  return new;
end;
$$;

-- 4 -- Lectures ------------------------------------------------------------------------------
drop function public.distribution_log(uuid, uuid, text, jsonb);
create function public.distribution_log(p_organization_id uuid, p_project_id uuid,
  p_kind text, p_data jsonb, p_release_id uuid default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.distribution_events (organization_id, project_id, release_id, kind, data, actor)
  values (p_organization_id, p_project_id, p_release_id, p_kind, coalesce(p_data, '{}'::jsonb),
    public.auth_person_id());
$$;
revoke execute on function public.distribution_log(uuid, uuid, text, jsonb, uuid) from public, anon, authenticated;

-- Qui contrôle un dépôt : la ou le responsable du projet, ou la personne qui
-- valide ce dépôt. Sans sortie : tout dépôt du projet (preuves, politiques).
create or replace function public.can_check_distribution_scope(p_project_id uuid, p_release_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_project_owner(p_project_id)
      or (public.can_see_project(p_project_id) and exists (
            select 1 from public.distribution_dossiers d
             where d.project_id = p_project_id
               and d.release_id is not distinct from p_release_id
               and d.validator_person_id = public.auth_person_id()
               and public.has_permission(d.organization_id, 'validate')));
$$;
revoke execute on function public.can_check_distribution_scope(uuid, uuid) from public, anon;
grant execute on function public.can_check_distribution_scope(uuid, uuid) to authenticated;

create or replace function public.distribution_scope_editable(p_project_id uuid, p_release_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.distribution_versions v
     where v.project_id = p_project_id
       and v.release_id is not distinct from p_release_id
       and (v.status = 'pending' or (v.status = 'approved' and v.superseded_at is null)));
$$;
revoke execute on function public.distribution_scope_editable(uuid, uuid) from public, anon;
grant execute on function public.distribution_scope_editable(uuid, uuid) to authenticated;

-- Le dépôt d'un projet simple, comme avant (lu par les anciens appels).
create or replace function public.distribution_dossier_editable(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.distribution_scope_editable(p_project_id, null);
$$;

drop policy distribution_dossiers_update_editable on public.distribution_dossiers;
create policy distribution_dossiers_update_editable on public.distribution_dossiers
  as restrictive for update to authenticated
  using (public.distribution_scope_editable(project_id, release_id))
  with check (public.distribution_scope_editable(project_id, release_id));

drop function public.distribution_current_version(uuid);
create function public.distribution_current_version(p_project_id uuid, p_release_id uuid default null)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select v.number from public.distribution_versions v
   where v.project_id = p_project_id and v.release_id is not distinct from p_release_id
     and v.status = 'approved' and v.superseded_at is null
   order by v.number desc limit 1;
$$;
revoke execute on function public.distribution_current_version(uuid, uuid) from public, anon;
grant execute on function public.distribution_current_version(uuid, uuid) to authenticated;

drop function public.distribution_working_number(uuid);
create function public.distribution_working_number(p_project_id uuid, p_release_id uuid default null)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select v.number from public.distribution_versions v
      where v.project_id = p_project_id and v.release_id is not distinct from p_release_id
        and (v.status = 'pending' or (v.status = 'approved' and v.superseded_at is null))
      order by v.number desc limit 1),
    (select coalesce(max(v.number), 0) + 1 from public.distribution_versions v
      where v.project_id = p_project_id and v.release_id is not distinct from p_release_id));
$$;
revoke execute on function public.distribution_working_number(uuid, uuid) from public, anon;
grant execute on function public.distribution_working_number(uuid, uuid) to authenticated;

drop function public.distribution_accepted(uuid);
create function public.distribution_accepted(p_project_id uuid, p_release_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with v as (select public.distribution_current_version(p_project_id, p_release_id) as number),
  a as (
    select max(d.declared_at) as at from public.distribution_declarations d, v
     where d.project_id = p_project_id and d.release_id is not distinct from p_release_id
       and d.version_number = v.number and d.withdrawn_at is null and d.kind = 'accepted')
  select a.at is not null and not exists (
      select 1 from public.distribution_declarations d, v
       where d.project_id = p_project_id and d.release_id is not distinct from p_release_id
         and d.version_number = v.number
         and d.withdrawn_at is null and d.kind = 'corrections_requested'
         and d.declared_at > a.at)
    from a;
$$;
revoke execute on function public.distribution_accepted(uuid, uuid) from public, anon;
grant execute on function public.distribution_accepted(uuid, uuid) to authenticated;

drop function public.distribution_closure_ready(uuid);
create function public.distribution_closure_ready(p_project_id uuid, p_release_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with v as (select public.distribution_current_version(p_project_id, p_release_id) as number)
  select v.number is not null
     and (select count(distinct d.kind) from public.distribution_declarations d
           where d.project_id = p_project_id and d.release_id is not distinct from p_release_id
             and d.version_number = v.number and d.withdrawn_at is null
             and d.kind in ('deposit', 'received', 'accepted', 'platforms_delivered')) = 4
     and not exists (select 1 from public.distribution_declarations d
           where d.project_id = p_project_id and d.release_id is not distinct from p_release_id
             and d.version_number = v.number
             and d.withdrawn_at is null and d.kind = 'corrections_requested'
             and d.declared_at > coalesce((select max(a.declared_at)
               from public.distribution_declarations a
              where a.project_id = p_project_id and a.release_id is not distinct from p_release_id
                and a.version_number = v.number
                and a.withdrawn_at is null and a.kind = 'accepted'), '-infinity'))
     and (select count(*) from public.distribution_platforms p
           where p.project_id = p_project_id and p.release_id is not distinct from p_release_id
             and p.platform in ('spotify', 'apple_music', 'deezer', 'youtube_music', 'amazon_music')
             and p.verification = 'verified' and p.compliance = 'compliant') = 5
     and (select count(*) from public.distribution_checks c
           where c.project_id = p_project_id and c.release_id is not distinct from p_release_id
             and c.result in ('compliant', 'not_applicable')) = 6
     and not exists (select 1 from public.distribution_anomalies a
           where a.project_id = p_project_id and a.release_id is not distinct from p_release_id
             and a.state in ('open', 'in_correction'))
  from v;
$$;
revoke execute on function public.distribution_closure_ready(uuid, uuid) from public, anon;
grant execute on function public.distribution_closure_ready(uuid, uuid) to authenticated;

-- La pochette d'un dépôt de projet (projet simple, compilation) : la Fiche
-- Livrable choisie dans son dossier, sinon trouvée par son titre. La sortie
-- d'un titre prend la pochette du titre au Catalogue (lue par le code).
drop function public.distribution_cover(uuid);
create function public.distribution_cover(p_project_id uuid, p_release_id uuid default null)
returns table (sheet_id uuid, title text, chosen boolean, deliverable_id uuid,
  delivered_at timestamptz, version_number integer)
language sql
stable
set search_path = ''
as $$
  with dossier as (
    select d.cover_sheet_id from public.distribution_dossiers d
     where d.project_id = p_project_id and d.release_id is not distinct from p_release_id
  ), candidates as (
    select s.id, s.title, s.created_at, dd.strategy_deliverable_id,
           s.id = (select cover_sheet_id from dossier) as chosen
      from public.design_sheets s
      join public.design_deliverables dd on dd.id = s.design_deliverable_id
     where s.project_id = p_project_id
       and (s.id = (select cover_sheet_id from dossier)
            or ((select cover_sheet_id from dossier) is null
                and s.title ~* '(pochette|cover|artwork)'))
  )
  select c.id, c.title, coalesce(c.chosen, false), c.strategy_deliverable_id,
         del.delivered_at, v.number
    from candidates c
    left join public.deliverable_deliveries del
      on del.deliverable_id = c.strategy_deliverable_id
    left join public.production_versions v on v.id = del.version_id
   order by coalesce(c.chosen, false) desc, (del.delivered_at is not null) desc, c.created_at
   limit 1;
$$;
revoke execute on function public.distribution_cover(uuid, uuid) from public, anon;
grant execute on function public.distribution_cover(uuid, uuid) to authenticated;

drop function public.distribution_status_rows(uuid, text[]);
create function public.distribution_status_rows(p_project_id uuid, p_reference_platforms text[],
  p_release_id uuid default null)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'release', (
      select jsonb_build_object('isrc', r.isrc,
                                'planned_release_date', r.planned_release_date)
        from public.releases r
       where r.project_id = p_project_id
         and (p_release_id is null or r.id = p_release_id)
       order by r.created_at asc
       limit 1),
    'version', (
      select jsonb_build_object('number', v.number, 'status', v.status)
        from public.distribution_versions v
       where v.project_id = p_project_id and v.release_id is not distinct from p_release_id
         and v.superseded_at is null
       order by v.number desc
       limit 1),
    'declarations', coalesce((
      select jsonb_agg(jsonb_build_object('version_number', d.version_number,
                                          'kind', d.kind,
                                          'declared_at', d.declared_at)
                       order by d.declared_at desc)
        from public.distribution_declarations d
       where d.project_id = p_project_id and d.release_id is not distinct from p_release_id
         and d.withdrawn_at is null), '[]'::jsonb),
    'verified_platforms', (
      select count(*)
        from public.distribution_platforms p
       where p.project_id = p_project_id and p.release_id is not distinct from p_release_id
         and p.verification = 'verified'
         and p.platform = any (p_reference_platforms)),
    'closure', (
      select jsonb_build_object('kind', c.kind, 'status', c.status,
                                'reserves', c.reserves,
                                'proposed_at', c.proposed_at,
                                'decided_at', c.decided_at)
        from public.distribution_closures c
       where c.project_id = p_project_id and c.release_id is not distinct from p_release_id
         and c.reopened_at is null
         and c.status in ('pending', 'closed')
       limit 1),
    'params_confirmed_at', (
      select d.params_confirmed_at
        from public.distribution_dossiers d
       where d.project_id = p_project_id and d.release_id is not distinct from p_release_id)
  );
$$;
revoke execute on function public.distribution_status_rows(uuid, text[], uuid) from public, anon;
grant execute on function public.distribution_status_rows(uuid, text[], uuid) to authenticated;

drop function public.distribution_submit_blockers(uuid, jsonb);
create function public.distribution_submit_blockers(p_project_id uuid, p_snapshot jsonb,
  p_release_id uuid default null)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_codes text[] := '{}';
  v_last public.distribution_versions%rowtype;
  v_module text;
  r record;
begin
  if (select count(*) from public.distribution_checks c
       where c.project_id = p_project_id and c.release_id is not distinct from p_release_id
         and c.result <> 'unchecked') < 6 then
    v_codes := v_codes || 'checks_unrecorded'::text;
  end if;
  select * into v_last from public.distribution_versions v
   where v.project_id = p_project_id and v.release_id is not distinct from p_release_id
   order by v.number desc limit 1;
  if found and v_last.status = 'rejected' and v_last.refusal_modules is not null then
    foreach v_module in array v_last.refusal_modules loop
      if public.distribution_snapshot_fields(v_last.snapshot, v_module)
         = public.distribution_snapshot_fields(p_snapshot, v_module) then
        v_codes := v_codes || 'refusal_unresolved'::text;
        exit;
      end if;
    end loop;
  end if;
  for r in
    select a.source_module, v.snapshot
      from public.distribution_anomalies a
      join public.distribution_versions v
        on v.project_id = a.project_id and v.release_id is not distinct from a.release_id
       and v.number = a.version_number
     where a.project_id = p_project_id and a.release_id is not distinct from p_release_id
       and a.state in ('open', 'in_correction')
       and a.source_module <> 'distributor'
  loop
    if public.distribution_snapshot_fields(r.snapshot, r.source_module)
       = public.distribution_snapshot_fields(p_snapshot, r.source_module) then
      v_codes := v_codes || 'anomalies_unresolved'::text;
      exit;
    end if;
  end loop;
  return v_codes;
end;
$$;
revoke execute on function public.distribution_submit_blockers(uuid, jsonb, uuid) from public, anon, authenticated;

drop function public.distribution_reset_checks(uuid, text[], text);
create function public.distribution_reset_checks(p_project_id uuid, p_modules text[], p_reason text,
  p_release_id uuid default null)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_keys text[];
  v_org uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if p_modules is null then
    v_keys := array['audio', 'identity', 'identifiers', 'rights', 'visual', 'calendar'];
  else
    select coalesce(array_agg(distinct k), '{}') into v_keys
      from unnest(p_modules) m, unnest(public.distribution_module_checks(m)) k;
  end if;
  if cardinality(v_keys) = 0 then
    return v_keys;
  end if;
  perform public.distribution_log(v_org, p_project_id, 'checks.reset',
    jsonb_build_object('reason', p_reason, 'keys', to_jsonb(v_keys),
      'checks', (select coalesce(jsonb_agg(jsonb_build_object('key', c.check_key,
                   'result', c.result, 'by', c.checked_by, 'at', c.checked_at,
                   'version', c.version_number)), '[]'::jsonb)
                   from public.distribution_checks c
                  where c.project_id = p_project_id
                    and c.release_id is not distinct from p_release_id
                    and c.check_key = any (v_keys)
                    and c.result <> 'unchecked')), p_release_id);
  update public.distribution_checks
     set result = 'unchecked', note = null, checked_by = null, checked_at = null,
         version_number = null
   where project_id = p_project_id and release_id is not distinct from p_release_id
     and check_key = any (v_keys);
  return v_keys;
end;
$$;
revoke execute on function public.distribution_reset_checks(uuid, text[], text, uuid) from public, anon, authenticated;

-- 5 -- Le dossier ----------------------------------------------------------------------------
create or replace function public.distribution_dossier_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_skip text[] := array['id', 'organization_id', 'project_id', 'release_id', 'created_by',
    'created_at', 'updated_at', 'validator_person_id', 'params_confirmed_at',
    'params_confirmed_by'];
  v_new jsonb := to_jsonb(new) - v_skip;
  v_old jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) - v_skip
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
    jsonb_build_object('changed', to_jsonb(v_changed), 'values', v_new), new.release_id);
  return null;
end;
$$;

drop function public.set_distribution_validator(uuid, uuid);
create function public.set_distribution_validator(p_project_id uuid, p_person_id uuid,
  p_release_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
begin
  select * into v_project from public.projects where id = p_project_id;
  if not found or not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.distribution_scope_check(p_project_id, p_release_id);
  if p_person_id is not null and (
       p_person_id = v_project.owner_person_id
       or not public.person_has_permission(v_project.organization_id, p_person_id, 'validate')) then
    raise exception 'validator_invalid' using errcode = 'P0001';
  end if;
  -- Never while a version waits for its validator or stands approved.
  if not public.distribution_scope_editable(p_project_id, p_release_id) then
    raise exception 'version_open' using errcode = 'P0001';
  end if;
  if p_release_id is null then
    insert into public.distribution_dossiers (organization_id, project_id, validator_person_id)
    values (v_project.organization_id, p_project_id, p_person_id)
    on conflict (project_id) where release_id is null
    do update set validator_person_id = excluded.validator_person_id, updated_at = now();
  else
    insert into public.distribution_dossiers (organization_id, project_id, release_id,
      validator_person_id)
    values (v_project.organization_id, p_project_id, p_release_id, p_person_id)
    on conflict (release_id) where release_id is not null
    do update set validator_person_id = excluded.validator_person_id, updated_at = now();
  end if;
  perform public.distribution_log(v_project.organization_id, p_project_id,
    'validator.set', jsonb_build_object('person_id', p_person_id), p_release_id);
end;
$$;
revoke execute on function public.set_distribution_validator(uuid, uuid, uuid) from public, anon;
grant execute on function public.set_distribution_validator(uuid, uuid, uuid) to authenticated;

drop function public.confirm_distribution_params(uuid, uuid, boolean, date);
create function public.confirm_distribution_params(p_project_id uuid, p_validator uuid,
  p_preorder boolean, p_preorder_on date, p_release_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
  v_dossier public.distribution_dossiers%rowtype;
  v_missing text[] := '{}';
  v_release_on date;
begin
  select * into v_project from public.projects where id = p_project_id;
  if not found or not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.distribution_scope_check(p_project_id, p_release_id);
  if not public.distribution_scope_editable(p_project_id, p_release_id) then
    raise exception 'version_open' using errcode = 'P0001';
  end if;
  if p_release_id is null then
    insert into public.distribution_dossiers (organization_id, project_id)
    values (v_project.organization_id, p_project_id)
    on conflict (project_id) where release_id is null do nothing;
  else
    insert into public.distribution_dossiers (organization_id, project_id, release_id)
    values (v_project.organization_id, p_project_id, p_release_id)
    on conflict (release_id) where release_id is not null do nothing;
  end if;
  select * into v_dossier from public.distribution_dossiers
   where project_id = p_project_id and release_id is not distinct from p_release_id for update;

  -- The proposals nobody changed.
  if v_dossier.validator_person_id is null and p_validator is not null then
    if p_validator = v_project.owner_person_id
       or not public.person_has_permission(v_project.organization_id, p_validator, 'validate') then
      raise exception 'validator_invalid' using errcode = 'P0001';
    end if;
    v_dossier.validator_person_id := p_validator;
  end if;
  if v_dossier.preorder is null and p_preorder is not null then
    v_dossier.preorder := p_preorder;
    v_dossier.preorder_on := case when p_preorder then p_preorder_on end;
  end if;

  if v_dossier.preorder is null then v_missing := array_append(v_missing, 'preorder'); end if;
  if v_dossier.prelisten is null then v_missing := array_append(v_missing, 'prelisten'); end if;
  if v_dossier.price_tier is null then v_missing := array_append(v_missing, 'price_tier'); end if;
  if v_dossier.validator_person_id is null then v_missing := array_append(v_missing, 'validator'); end if;
  if cardinality(v_missing) > 0 then
    raise exception 'params_missing' using errcode = 'P0001',
      detail = array_to_string(v_missing, ',');
  end if;
  -- The release date: the project's due date (a simple project), the
  -- release's own date (a collective's release).
  v_release_on := case when p_release_id is null then v_project.due_date
    else (select r.planned_release_date from public.releases r where r.id = p_release_id) end;
  if v_release_on is not null and (
       (v_dossier.preorder and v_dossier.preorder_on >= v_release_on)
       or (v_dossier.prelisten and v_dossier.prelisten_on >= v_release_on)) then
    raise exception 'date_after_release' using errcode = 'P0001';
  end if;

  update public.distribution_dossiers
     set validator_person_id = v_dossier.validator_person_id,
         preorder = v_dossier.preorder,
         preorder_on = v_dossier.preorder_on,
         params_confirmed_at = now(),
         params_confirmed_by = public.auth_person_id(),
         updated_at = now()
   where id = v_dossier.id;
  perform public.distribution_log(v_project.organization_id, p_project_id,
    'dossier.parameters_confirmed',
    jsonb_build_object('validator', v_dossier.validator_person_id), p_release_id);
end;
$$;
revoke execute on function public.confirm_distribution_params(uuid, uuid, boolean, date, uuid) from public, anon;
grant execute on function public.confirm_distribution_params(uuid, uuid, boolean, date, uuid) to authenticated;

drop function public.record_distribution_check(uuid, text, text, text);
create function public.record_distribution_check(p_project_id uuid, p_key text, p_result text,
  p_note text, p_release_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_number integer;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.can_check_distribution_scope(p_project_id, p_release_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.distribution_scope_check(p_project_id, p_release_id);
  v_number := public.distribution_working_number(p_project_id, p_release_id);
  if p_release_id is null then
    insert into public.distribution_checks (organization_id, project_id, check_key,
      result, note, checked_by, checked_at, version_number)
    values (v_org, p_project_id, p_key, p_result, v_note,
      case when p_result = 'unchecked' then null else public.auth_person_id() end,
      case when p_result = 'unchecked' then null else now() end,
      case when p_result = 'unchecked' then null else v_number end)
    on conflict (project_id, check_key) where release_id is null do update
      set result = excluded.result, note = excluded.note,
          checked_by = excluded.checked_by, checked_at = excluded.checked_at,
          version_number = excluded.version_number;
  else
    insert into public.distribution_checks (organization_id, project_id, release_id, check_key,
      result, note, checked_by, checked_at, version_number)
    values (v_org, p_project_id, p_release_id, p_key, p_result, v_note,
      case when p_result = 'unchecked' then null else public.auth_person_id() end,
      case when p_result = 'unchecked' then null else now() end,
      case when p_result = 'unchecked' then null else v_number end)
    on conflict (release_id, check_key) where release_id is not null do update
      set result = excluded.result, note = excluded.note,
          checked_by = excluded.checked_by, checked_at = excluded.checked_at,
          version_number = excluded.version_number;
  end if;
  perform public.distribution_log(v_org, p_project_id, 'check.recorded',
    jsonb_build_object('key', p_key, 'result', p_result, 'note', v_note,
      'version', v_number), p_release_id);
end;
$$;
revoke execute on function public.record_distribution_check(uuid, text, text, text, uuid) from public, anon;
grant execute on function public.record_distribution_check(uuid, text, text, text, uuid) to authenticated;

-- 6 -- Versions ------------------------------------------------------------------------------
drop function public.submit_distribution_version(uuid, jsonb);
create function public.submit_distribution_version(p_project_id uuid, p_snapshot jsonb,
  p_release_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dossier public.distribution_dossiers%rowtype;
  v_number integer;
  v_blockers text[];
  v_derogation public.distribution_derogations%rowtype;
  v_used boolean := false;
  v_refusal record;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.distribution_scope_check(p_project_id, p_release_id);
  -- A collective's release (lot 15): never archived, never an abandoned
  -- title's, never with a provisional title or a contract missing.
  if p_release_id is not null then
    select b.code, b.detail into v_refusal
      from public.release_submission_blockers(p_release_id) b
     order by array_position(array['release_archived', 'title_abandoned', 'title_provisional',
                                   'contract_missing'], b.code)
     limit 1;
    if found then
      raise exception '%', v_refusal.code using errcode = 'P0001',
        detail = coalesce(v_refusal.detail, '');
    end if;
  end if;
  select * into v_dossier from public.distribution_dossiers
   where project_id = p_project_id and release_id is not distinct from p_release_id for update;
  if not found or v_dossier.validator_person_id is null
     or not public.person_has_permission(v_dossier.organization_id,
              v_dossier.validator_person_id, 'validate') then
    raise exception 'no_validator' using errcode = 'P0001';
  end if;
  if v_dossier.params_confirmed_at is null then
    raise exception 'params_not_confirmed' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.distribution_legal_blockers(p_project_id)) then
    raise exception 'legal_blockers' using errcode = 'P0001';
  end if;
  if not public.distribution_scope_editable(p_project_id, p_release_id) then
    raise exception 'version_open' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.distribution_checks
              where project_id = p_project_id and release_id is not distinct from p_release_id
                and result = 'non_compliant') then
    raise exception 'checks_non_compliant' using errcode = 'P0001';
  end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  v_blockers := public.distribution_submit_blockers(p_project_id, p_snapshot, p_release_id);
  if cardinality(v_blockers) > 0 then
    select * into v_derogation from public.distribution_derogations
     where project_id = p_project_id and release_id is not distinct from p_release_id
       and version_number is null and revoked_at is null
     for update;
    if not found or not (array(select public.distribution_blocker_scope(b)
                                 from unnest(v_blockers) b) <@ v_derogation.scope) then
      raise exception '%', v_blockers[1] using errcode = 'P0001';
    end if;
    v_used := true;
  end if;
  select coalesce(max(number), 0) + 1 into v_number
    from public.distribution_versions
   where project_id = p_project_id and release_id is not distinct from p_release_id;
  insert into public.distribution_versions (organization_id, project_id, release_id, number,
    snapshot, submitted_by, validator_person_id, derogation_id)
  values (v_dossier.organization_id, p_project_id, p_release_id, v_number, p_snapshot,
    public.auth_person_id(), v_dossier.validator_person_id,
    case when v_used then v_derogation.id end);
  if v_used then
    update public.distribution_derogations
       set version_number = v_number, used_at = now()
     where id = v_derogation.id;
  end if;
  -- An anomaly whose module changed since the version it was found on is
  -- being corrected: this version carries the correction.
  update public.distribution_anomalies a
     set state = 'in_correction', state_by = public.auth_person_id(), state_at = now(),
         state_note = format('Corrigée à la source : V%s soumise', v_number)
    from public.distribution_versions v
   where a.project_id = p_project_id and a.release_id is not distinct from p_release_id
     and a.state = 'open'
     and a.source_module <> 'distributor'
     and v.project_id = a.project_id and v.release_id is not distinct from a.release_id
     and v.number = a.version_number
     and public.distribution_snapshot_fields(v.snapshot, a.source_module)
         <> public.distribution_snapshot_fields(p_snapshot, a.source_module);
  perform public.distribution_log(v_dossier.organization_id, p_project_id,
    'version.submitted', jsonb_build_object('number', v_number,
      'validator', v_dossier.validator_person_id,
      'derogation', case when v_used then v_derogation.id end,
      'derogated', case when v_used then to_jsonb(v_blockers) end), p_release_id);
  return v_number;
end;
$$;
revoke execute on function public.submit_distribution_version(uuid, jsonb, uuid) from public, anon;
grant execute on function public.submit_distribution_version(uuid, jsonb, uuid) to authenticated;

create or replace function public.decide_distribution_version(p_version_id uuid, p_approve boolean,
  p_note text, p_modules text[] default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version public.distribution_versions%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_modules text[];
  v_derogated boolean;
begin
  select * into v_version from public.distribution_versions
   where id = p_version_id for update;
  if not found or not public.can_see_project(v_version.project_id) then
    raise exception 'version_not_found' using errcode = 'P0001';
  end if;
  if v_version.validator_person_id is distinct from public.auth_person_id()
     or not public.has_permission(v_version.organization_id, 'validate') then
    raise exception 'not_the_validator' using errcode = '42501';
  end if;
  if v_version.status <> 'pending' then
    raise exception 'already_decided' using errcode = 'P0001';
  end if;
  if p_approve then
    if exists (select 1 from public.distribution_checks
                where project_id = v_version.project_id
                  and release_id is not distinct from v_version.release_id
                  and result = 'non_compliant') then
      raise exception 'checks_non_compliant' using errcode = 'P0001';
    end if;
    select coalesce('checks' = any (d.scope), false) into v_derogated
      from public.distribution_derogations d where d.id = v_version.derogation_id;
    if (select count(*) from public.distribution_checks c
         where c.project_id = v_version.project_id
           and c.release_id is not distinct from v_version.release_id
           and c.result <> 'unchecked') < 6
       and not coalesce(v_derogated, false) then
      raise exception 'checks_unrecorded' using errcode = 'P0001';
    end if;
  else
    if v_note is null then
      raise exception 'reason_required' using errcode = 'P0001';
    end if;
    select coalesce(array_agg(distinct m order by m), '{}') into v_modules
      from unnest(coalesce(p_modules, '{}')) m;
    if cardinality(v_modules) = 0 then
      raise exception 'modules_required' using errcode = 'P0001';
    end if;
    if not v_modules <@ array['catalog', 'master', 'legal', 'design', 'project',
                              'distribution'] then
      raise exception 'invalid_input' using errcode = '22023';
    end if;
  end if;
  update public.distribution_versions
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = public.auth_person_id(), decided_at = now(), decision_note = v_note,
         refusal_modules = case when p_approve then null else v_modules end
   where id = p_version_id;
  perform public.distribution_log(v_version.organization_id, v_version.project_id,
    case when p_approve then 'version.approved' else 'version.rejected' end,
    jsonb_build_object('number', v_version.number, 'note', v_note,
      'modules', case when p_approve then null else to_jsonb(v_modules) end),
    v_version.release_id);
  if not p_approve then
    perform public.distribution_reset_checks(v_version.project_id, v_modules,
      format('V%s refusée', v_version.number), v_version.release_id);
  end if;
end;
$$;

drop function public.prepare_distribution_version(uuid, text, text[]);
create function public.prepare_distribution_version(p_project_id uuid, p_note text,
  p_modules text[] default null, p_release_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version public.distribution_versions%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.distribution_scope_check(p_project_id, p_release_id);
  if exists (select 1 from public.distribution_versions
              where project_id = p_project_id and release_id is not distinct from p_release_id
                and status = 'pending') then
    raise exception 'validation_pending' using errcode = 'P0001';
  end if;
  select * into v_version from public.distribution_versions
   where project_id = p_project_id and release_id is not distinct from p_release_id
     and status = 'approved' and superseded_at is null
   order by number desc limit 1 for update;
  if not found then
    raise exception 'nothing_to_supersede' using errcode = 'P0001';
  end if;
  if v_note is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if p_modules is not null and not p_modules <@ array['catalog', 'master', 'legal',
       'design', 'project', 'distribution', 'distributor'] then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  update public.distribution_versions set superseded_at = now() where id = v_version.id;
  perform public.distribution_log(v_version.organization_id, p_project_id,
    'version.superseded', jsonb_build_object('number', v_version.number, 'note', v_note,
      'modules', to_jsonb(p_modules)), p_release_id);
  perform public.distribution_reset_checks(p_project_id, p_modules,
    format('V%s remplacée', v_version.number), p_release_id);
end;
$$;
revoke execute on function public.prepare_distribution_version(uuid, text, text[], uuid) from public, anon;
grant execute on function public.prepare_distribution_version(uuid, text, text[], uuid) to authenticated;

drop function public.grant_distribution_derogation(uuid, text[], text, text, date);
create function public.grant_distribution_derogation(p_project_id uuid, p_scope text[],
  p_risk text, p_reason text, p_due_on date, p_release_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_scope text[];
  v_id uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.can_see_project(p_project_id)
     or not public.has_permission(v_org, 'administer') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.distribution_scope_check(p_project_id, p_release_id);
  select coalesce(array_agg(distinct s order by s), '{}') into v_scope
    from unnest(coalesce(p_scope, '{}')) s;
  if cardinality(v_scope) = 0
     or not v_scope <@ array['checks', 'refusal', 'anomalies'] then
    raise exception 'scope_required' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_risk, '')), '') is null
     or nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if p_due_on is null or p_due_on < current_date then
    raise exception 'due_invalid' using errcode = 'P0001';
  end if;
  -- A new derogation replaces the one not used yet.
  update public.distribution_derogations
     set revoked_at = now(), revoked_by = public.auth_person_id()
   where project_id = p_project_id and release_id is not distinct from p_release_id
     and version_number is null and revoked_at is null;
  insert into public.distribution_derogations (organization_id, project_id, release_id, scope,
    risk, reason, due_on, granted_by)
  values (v_org, p_project_id, p_release_id, v_scope, btrim(p_risk), btrim(p_reason), p_due_on,
    public.auth_person_id())
  returning id into v_id;
  perform public.distribution_log(v_org, p_project_id, 'derogation.granted',
    jsonb_build_object('id', v_id, 'scope', to_jsonb(v_scope), 'risk', btrim(p_risk),
      'reason', btrim(p_reason), 'due_on', p_due_on), p_release_id);
  return v_id;
end;
$$;
revoke execute on function public.grant_distribution_derogation(uuid, text[], text, text, date, uuid) from public, anon;
grant execute on function public.grant_distribution_derogation(uuid, text[], text, text, date, uuid) to authenticated;

drop function public.revoke_distribution_derogation(uuid);
create function public.revoke_distribution_derogation(p_project_id uuid, p_release_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_id uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.can_see_project(p_project_id)
     or not public.has_permission(v_org, 'administer') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.distribution_scope_check(p_project_id, p_release_id);
  update public.distribution_derogations
     set revoked_at = now(), revoked_by = public.auth_person_id()
   where project_id = p_project_id and release_id is not distinct from p_release_id
     and version_number is null and revoked_at is null
  returning id into v_id;
  if v_id is null then
    raise exception 'no_derogation' using errcode = 'P0001';
  end if;
  perform public.distribution_log(v_org, p_project_id, 'derogation.revoked',
    jsonb_build_object('id', v_id), p_release_id);
end;
$$;
revoke execute on function public.revoke_distribution_derogation(uuid, uuid) from public, anon;
grant execute on function public.revoke_distribution_derogation(uuid, uuid) to authenticated;

-- 7 -- Suivi : déclarations ------------------------------------------------------------------
drop function public.declare_distribution(uuid, text, date, text, text, text, text, text, text);
create function public.declare_distribution(p_project_id uuid, p_kind text,
  p_declared_on date default null, p_orchard_id text default null, p_note text default null,
  p_proof_path text default null, p_proof_name text default null, p_proof_url text default null,
  p_source text default null, p_release_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_version integer;
  v_id uuid;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_on date := coalesce(p_declared_on, (now() at time zone 'Europe/Paris')::date);
  v_rank integer := public.distribution_declaration_rank(p_kind);
  v_validated date;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.distribution_scope_check(p_project_id, p_release_id);
  v_version := public.distribution_current_version(p_project_id, p_release_id);
  if v_version is null then
    raise exception 'not_validated' using errcode = 'P0001';
  end if;
  if p_declared_on is not null and p_declared_on > v_today then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if p_kind = 'deposit' then
    if exists (select 1 from public.distribution_declarations
                where project_id = p_project_id and release_id is not distinct from p_release_id
                  and version_number = v_version
                  and kind = 'deposit' and withdrawn_at is null) then
      raise exception 'already_declared' using errcode = 'P0001';
    end if;
    select (v.decided_at at time zone 'Europe/Paris')::date into v_validated
      from public.distribution_versions v
     where v.project_id = p_project_id and v.release_id is not distinct from p_release_id
       and v.number = v_version;
    if v_on < v_validated then
      raise exception 'date_order' using errcode = 'P0001';
    end if;
  else
    if not exists (select 1 from public.distribution_declarations
                    where project_id = p_project_id and release_id is not distinct from p_release_id
                      and version_number = v_version
                      and kind = 'deposit' and withdrawn_at is null) then
      raise exception 'not_deposited' using errcode = 'P0001';
    end if;
    if exists (select 1 from public.distribution_declarations
                where project_id = p_project_id and release_id is not distinct from p_release_id
                  and version_number = v_version
                  and kind = p_kind and withdrawn_at is null) then
      raise exception 'already_declared' using errcode = 'P0001';
    end if;
  end if;
  -- The dates hold with the frieze: nothing earlier than a step before it,
  -- nothing later than a step after it (corrections: after the deposit).
  if exists (
       select 1 from public.distribution_declarations d
        where d.project_id = p_project_id and d.release_id is not distinct from p_release_id
          and d.version_number = v_version
          and d.withdrawn_at is null and d.kind <> 'corrections_requested'
          and (
            (p_kind = 'corrections_requested' and d.kind = 'deposit'
              and coalesce(d.declared_on, (d.declared_at at time zone 'Europe/Paris')::date) > v_on)
            or (v_rank is not null and (
              (public.distribution_declaration_rank(d.kind) < v_rank
                and coalesce(d.declared_on, (d.declared_at at time zone 'Europe/Paris')::date) > v_on)
              or (public.distribution_declaration_rank(d.kind) > v_rank
                and coalesce(d.declared_on, (d.declared_at at time zone 'Europe/Paris')::date) < v_on))))) then
    raise exception 'date_order' using errcode = 'P0001';
  end if;
  insert into public.distribution_declarations (organization_id, project_id, release_id,
    version_number, kind, declared_on, orchard_id, note, proof_path, proof_name,
    proof_url, declared_by, source)
  values (v_org, p_project_id, p_release_id, v_version, p_kind, p_declared_on,
    nullif(btrim(coalesce(p_orchard_id, '')), ''),
    nullif(btrim(coalesce(p_note, '')), ''),
    nullif(p_proof_path, ''), nullif(btrim(coalesce(p_proof_name, '')), ''),
    nullif(btrim(coalesce(p_proof_url, '')), ''),
    public.auth_person_id(), nullif(p_source, ''))
  returning id into v_id;
  perform public.distribution_log(v_org, p_project_id, 'declaration.' || p_kind,
    jsonb_build_object('id', v_id, 'version', v_version,
      'declared_on', p_declared_on, 'source', nullif(p_source, ''),
      'proof', nullif(p_proof_path, '') is not null or nullif(btrim(coalesce(p_proof_url, '')), '') is not null),
    p_release_id);
  return v_id;
end;
$$;
revoke execute on function public.declare_distribution(uuid, text, date, text, text, text, text, text, text, uuid) from public, anon;
grant execute on function public.declare_distribution(uuid, text, date, text, text, text, text, text, text, uuid) to authenticated;

drop function public.declare_distribution_answers(uuid, jsonb);
create function public.declare_distribution_answers(p_project_id uuid, p_items jsonb,
  p_release_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_count integer := 0;
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 3 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  for v_item in
    select x from jsonb_array_elements(p_items) x
     order by array_position(array['received', 'accepted', 'platforms_delivered'], x ->> 'kind')
  loop
    if (v_item ->> 'kind') not in ('received', 'accepted', 'platforms_delivered') then
      raise exception 'invalid_input' using errcode = '22023';
    end if;
    perform public.declare_distribution(p_project_id, v_item ->> 'kind',
      nullif(v_item ->> 'declared_on', '')::date, null, null,
      nullif(v_item ->> 'proof_path', ''), nullif(v_item ->> 'proof_name', ''), null,
      nullif(v_item ->> 'source', ''), p_release_id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.declare_distribution_answers(uuid, jsonb, uuid) from public, anon;
grant execute on function public.declare_distribution_answers(uuid, jsonb, uuid) to authenticated;

drop function public.declare_distribution_corrections(uuid, text, text, text, text);
create function public.declare_distribution_corrections(p_project_id uuid, p_note text,
  p_kind text, p_module text, p_severity text, p_release_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_version integer;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_anomaly uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_note is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  v_version := public.distribution_current_version(p_project_id, p_release_id);
  perform public.declare_distribution(p_project_id, 'corrections_requested',
    current_date, null, v_note, null, null, null, null, p_release_id);
  insert into public.distribution_anomalies (organization_id, project_id, release_id,
    version_number, kind, description, platform, severity, source_module, reported_by,
    from_distributor)
  values (v_org, p_project_id, p_release_id, v_version, p_kind, v_note, null, p_severity,
    p_module, public.auth_person_id(), true)
  returning id into v_anomaly;
  perform public.distribution_log(v_org, p_project_id, 'anomaly.reported',
    jsonb_build_object('id', v_anomaly, 'kind', p_kind, 'severity', p_severity,
      'module', p_module, 'from', 'distributor'), p_release_id);
  perform public.prepare_distribution_version(p_project_id, v_note, array[p_module],
    p_release_id);
  return v_anomaly;
end;
$$;
revoke execute on function public.declare_distribution_corrections(uuid, text, text, text, text, uuid) from public, anon;
grant execute on function public.declare_distribution_corrections(uuid, text, text, text, text, uuid) to authenticated;

create or replace function public.attach_distribution_declaration_proof(p_declaration_id uuid,
  p_proof_path text, p_proof_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.distribution_declarations%rowtype;
begin
  select * into v_row from public.distribution_declarations
   where id = p_declaration_id for update;
  if not found or not public.is_project_owner(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.withdrawn_at is not null then
    raise exception 'already_withdrawn' using errcode = 'P0001';
  end if;
  if v_row.proof_path is not null or v_row.proof_url is not null then
    raise exception 'proof_exists' using errcode = 'P0001';
  end if;
  update public.distribution_declarations
     set proof_path = nullif(p_proof_path, ''),
         proof_name = nullif(btrim(coalesce(p_proof_name, '')), '')
   where id = p_declaration_id;
  perform public.distribution_log(v_row.organization_id, v_row.project_id,
    'declaration.proof_added', jsonb_build_object('id', v_row.id, 'kind', v_row.kind,
      'version', v_row.version_number), v_row.release_id);
end;
$$;

create or replace function public.withdraw_distribution_declaration(p_declaration_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.distribution_declarations%rowtype;
begin
  select * into v_row from public.distribution_declarations
   where id = p_declaration_id for update;
  if not found or not public.is_project_owner(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.withdrawn_at is not null then
    raise exception 'already_withdrawn' using errcode = 'P0001';
  end if;
  if char_length(btrim(coalesce(p_note, ''))) = 0 then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if v_row.kind = 'deposit' and exists (
       select 1 from public.distribution_declarations d
        where d.project_id = v_row.project_id
          and d.release_id is not distinct from v_row.release_id
          and d.version_number = v_row.version_number
          and d.kind <> 'deposit' and d.withdrawn_at is null) then
    raise exception 'deposit_in_use' using errcode = 'P0001';
  end if;
  update public.distribution_declarations
     set withdrawn_at = now(), withdrawn_by = public.auth_person_id(),
         withdraw_note = btrim(p_note)
   where id = p_declaration_id;
  perform public.distribution_log(v_row.organization_id, v_row.project_id,
    'declaration.withdrawn', jsonb_build_object('id', v_row.id, 'kind', v_row.kind,
      'version', v_row.version_number, 'note', btrim(p_note)), v_row.release_id);
end;
$$;

-- 8 -- Plateformes ---------------------------------------------------------------------------
drop function public.save_distribution_platform(uuid, text, text, text, boolean);
create function public.save_distribution_platform(p_project_id uuid, p_platform text,
  p_label text, p_url text, p_available boolean, p_release_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_old public.distribution_platforms%rowtype;
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
  v_existed boolean;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.distribution_scope_check(p_project_id, p_release_id);
  select * into v_old from public.distribution_platforms
   where project_id = p_project_id and release_id is not distinct from p_release_id
     and platform = p_platform for update;
  v_existed := found;
  if not v_existed then
    insert into public.distribution_platforms (organization_id, project_id, release_id, platform,
      label, url, available_declared_at, available_declared_by)
    values (v_org, p_project_id, p_release_id, p_platform,
      nullif(btrim(coalesce(p_label, '')), ''), v_url,
      case when p_available then now() end,
      case when p_available then public.auth_person_id() end);
  else
    update public.distribution_platforms
       set label = case when platform like 'other\_%'
                        then coalesce(nullif(btrim(coalesce(p_label, '')), ''), label) else null end,
           url = v_url,
           available_declared_at = case when not p_available then null
             else coalesce(available_declared_at, now()) end,
           available_declared_by = case when not p_available then null
             else coalesce(available_declared_by, public.auth_person_id()) end,
           verification = case when v_url is distinct from v_old.url then 'unchecked' else verification end,
           verification_note = case when v_url is distinct from v_old.url then null else verification_note end,
           verified_by = case when v_url is distinct from v_old.url then null else verified_by end,
           verified_at = case when v_url is distinct from v_old.url then null else verified_at end,
           compliance = case when v_url is distinct from v_old.url then 'unchecked' else compliance end,
           compliance_note = case when v_url is distinct from v_old.url then null else compliance_note end,
           compliance_by = case when v_url is distinct from v_old.url then null else compliance_by end,
           compliance_at = case when v_url is distinct from v_old.url then null else compliance_at end,
           updated_at = now()
     where id = v_old.id;
  end if;
  perform public.distribution_log(v_org, p_project_id, 'platform.saved',
    jsonb_build_object('platform', p_platform, 'url', v_url, 'available', p_available,
      'reset', v_existed and v_url is distinct from v_old.url), p_release_id);
end;
$$;
revoke execute on function public.save_distribution_platform(uuid, text, text, text, boolean, uuid) from public, anon;
grant execute on function public.save_distribution_platform(uuid, text, text, text, boolean, uuid) to authenticated;

drop function public.verify_distribution_platform(uuid, text, text, text, text, text);
create function public.verify_distribution_platform(p_project_id uuid, p_platform text,
  p_verification text, p_verification_note text, p_compliance text, p_compliance_note text,
  p_release_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.distribution_platforms%rowtype;
begin
  if not public.can_check_distribution_scope(p_project_id, p_release_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.distribution_scope_check(p_project_id, p_release_id);
  select * into v_row from public.distribution_platforms
   where project_id = p_project_id and release_id is not distinct from p_release_id
     and platform = p_platform for update;
  if not found or v_row.url is null then
    raise exception 'no_link' using errcode = 'P0001';
  end if;
  update public.distribution_platforms
     set verification = p_verification,
         verification_note = nullif(btrim(coalesce(p_verification_note, '')), ''),
         verified_by = case when p_verification = 'unchecked' then null else public.auth_person_id() end,
         verified_at = case when p_verification = 'unchecked' then null else now() end,
         compliance = p_compliance,
         compliance_note = nullif(btrim(coalesce(p_compliance_note, '')), ''),
         compliance_by = case when p_compliance = 'unchecked' then null else public.auth_person_id() end,
         compliance_at = case when p_compliance = 'unchecked' then null else now() end,
         updated_at = now()
   where id = v_row.id;
  perform public.distribution_log(v_row.organization_id, p_project_id, 'platform.verified',
    jsonb_build_object('platform', p_platform, 'verification', p_verification,
      'compliance', p_compliance, 'url', v_row.url), p_release_id);
end;
$$;
revoke execute on function public.verify_distribution_platform(uuid, text, text, text, text, text, uuid) from public, anon;
grant execute on function public.verify_distribution_platform(uuid, text, text, text, text, text, uuid) to authenticated;

drop function public.confirm_distribution_platform(uuid, text, text, text, date, text, text, text);
create function public.confirm_distribution_platform(p_project_id uuid, p_platform text,
  p_url text, p_territory text default null, p_observed_on date default null,
  p_proof_path text default null, p_proof_name text default null, p_proof_url text default null,
  p_release_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_row public.distribution_platforms%rowtype;
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
  v_territory text := nullif(btrim(coalesce(p_territory, '')), '');
  v_path text := nullif(p_proof_path, '');
  v_proof_url text := nullif(btrim(coalesce(p_proof_url, '')), '');
  v_on date := coalesce(p_observed_on, (now() at time zone 'Europe/Paris')::date);
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.can_check_distribution_scope(p_project_id, p_release_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.distribution_scope_check(p_project_id, p_release_id);
  if v_territory is null then
    raise exception 'territory_required' using errcode = 'P0001';
  end if;
  if v_path is null and v_proof_url is null then
    raise exception 'proof_required' using errcode = 'P0001';
  end if;
  if v_on > (now() at time zone 'Europe/Paris')::date then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  select * into v_row from public.distribution_platforms
   where project_id = p_project_id and release_id is not distinct from p_release_id
     and platform = p_platform for update;
  if not found then
    if v_url is null or p_platform not in ('spotify', 'apple_music', 'deezer',
         'youtube_music', 'amazon_music') then
      raise exception 'no_link' using errcode = 'P0001';
    end if;
    insert into public.distribution_platforms (organization_id, project_id, release_id, platform, url)
    values (v_org, p_project_id, p_release_id, p_platform, v_url)
    returning * into v_row;
  elsif v_row.url is null or (v_url is not null and v_url is distinct from v_row.url) then
    if v_url is null then
      raise exception 'no_link' using errcode = 'P0001';
    end if;
    update public.distribution_platforms set url = v_url where id = v_row.id;
  end if;
  update public.distribution_platforms
     set verification = 'verified', verification_note = null,
         verified_by = public.auth_person_id(), verified_at = now(),
         compliance = 'compliant', compliance_note = null,
         compliance_by = public.auth_person_id(), compliance_at = now(),
         territory = v_territory, observed_on = v_on,
         proof_path = v_path,
         proof_name = case when v_path is null then null
                           else coalesce(nullif(btrim(coalesce(p_proof_name, '')), ''), 'capture') end,
         proof_url = v_proof_url,
         updated_at = now()
   where id = v_row.id;
  perform public.distribution_log(v_org, p_project_id, 'platform.verified',
    jsonb_build_object('platform', p_platform, 'verification', 'verified',
      'compliance', 'compliant', 'url', coalesce(v_url, v_row.url),
      'territory', v_territory, 'observed_on', v_on,
      'proof', true), p_release_id);
end;
$$;
revoke execute on function public.confirm_distribution_platform(uuid, text, text, text, date, text, text, text, uuid) from public, anon;
grant execute on function public.confirm_distribution_platform(uuid, text, text, text, date, text, text, text, uuid) to authenticated;

drop function public.report_distribution_platform_problem(uuid, text, text, text, text, text, text, uuid, date);
create function public.report_distribution_platform_problem(p_project_id uuid, p_platform text,
  p_problem text, p_note text, p_module text, p_url text, p_action text default null,
  p_owner_person_id uuid default null, p_due_on date default null, p_release_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_row public.distribution_platforms%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_url text := nullif(btrim(coalesce(p_url, '')), '');
  v_action text := nullif(btrim(coalesce(p_action, '')), '');
  v_anomaly uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.can_check_distribution_scope(p_project_id, p_release_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.distribution_scope_check(p_project_id, p_release_id);
  if p_problem not in ('unavailable', 'non_compliant') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if v_note is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  -- An unavailability says what is done about it, by whom, by when.
  if p_problem = 'unavailable' and (v_action is null or p_owner_person_id is null
       or p_due_on is null) then
    raise exception 'action_required' using errcode = 'P0001';
  end if;
  if p_owner_person_id is not null
     and not public.distribution_is_member(v_org, p_owner_person_id) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  if p_due_on is not null and p_due_on < (now() at time zone 'Europe/Paris')::date then
    raise exception 'due_invalid' using errcode = 'P0001';
  end if;
  select * into v_row from public.distribution_platforms
   where project_id = p_project_id and release_id is not distinct from p_release_id
     and platform = p_platform for update;
  if not found then
    if v_url is null then
      raise exception 'no_link' using errcode = 'P0001';
    end if;
    insert into public.distribution_platforms (organization_id, project_id, release_id, platform, url)
    values (v_org, p_project_id, p_release_id, p_platform, v_url)
    returning * into v_row;
  elsif v_row.url is null then
    if v_url is null then
      raise exception 'no_link' using errcode = 'P0001';
    end if;
    update public.distribution_platforms set url = v_url where id = v_row.id;
  end if;
  update public.distribution_platforms
     set verification = case when p_problem = 'unavailable' then 'unavailable' else 'verified' end,
         verification_note = case when p_problem = 'unavailable' then v_note end,
         verified_by = public.auth_person_id(), verified_at = now(),
         compliance = case when p_problem = 'unavailable' then 'unchecked' else 'non_compliant' end,
         compliance_note = case when p_problem = 'unavailable' then null else v_note end,
         compliance_by = case when p_problem = 'unavailable' then null else public.auth_person_id() end,
         compliance_at = case when p_problem = 'unavailable' then null else now() end,
         territory = null, observed_on = (now() at time zone 'Europe/Paris')::date,
         proof_path = null, proof_name = null, proof_url = null,
         updated_at = now()
   where id = v_row.id;
  perform public.distribution_log(v_org, p_project_id, 'platform.verified',
    jsonb_build_object('platform', p_platform,
      'verification', case when p_problem = 'unavailable' then 'unavailable' else 'verified' end,
      'compliance', case when p_problem = 'unavailable' then 'unchecked' else 'non_compliant' end,
      'url', coalesce(v_url, v_row.url)), p_release_id);
  insert into public.distribution_anomalies (organization_id, project_id, release_id,
    version_number, kind, description, platform, severity, source_module, reported_by,
    action, owner_person_id, due_on)
  values (v_org, p_project_id, p_release_id,
    (select max(v.number) from public.distribution_versions v
      where v.project_id = p_project_id and v.release_id is not distinct from p_release_id),
    case when p_problem = 'unavailable' then 'platform_unavailable' else 'metadata' end,
    v_note, p_platform, 'major', p_module, public.auth_person_id(),
    v_action, p_owner_person_id, p_due_on)
  returning id into v_anomaly;
  perform public.distribution_log(v_org, p_project_id, 'anomaly.reported',
    jsonb_build_object('id', v_anomaly, 'kind',
      case when p_problem = 'unavailable' then 'platform_unavailable' else 'metadata' end,
      'severity', 'major', 'module', p_module, 'platform', p_platform,
      'action', v_action, 'owner', p_owner_person_id, 'due_on', p_due_on), p_release_id);
  return v_anomaly;
end;
$$;
revoke execute on function public.report_distribution_platform_problem(uuid, text, text, text, text, text, text, uuid, date, uuid) from public, anon;
grant execute on function public.report_distribution_platform_problem(uuid, text, text, text, text, text, text, uuid, date, uuid) to authenticated;

-- 9 -- Anomalies -----------------------------------------------------------------------------
drop function public.report_distribution_anomaly(uuid, text, text, text, text, text);
create function public.report_distribution_anomaly(p_project_id uuid, p_kind text,
  p_description text, p_platform text, p_severity text, p_source_module text,
  p_release_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_id uuid;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or not public.can_check_distribution_scope(p_project_id, p_release_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.distribution_scope_check(p_project_id, p_release_id);
  insert into public.distribution_anomalies (organization_id, project_id, release_id,
    version_number, kind, description, platform, severity, source_module, reported_by)
  values (v_org, p_project_id, p_release_id,
    (select max(v.number) from public.distribution_versions v
      where v.project_id = p_project_id and v.release_id is not distinct from p_release_id),
    p_kind, btrim(coalesce(p_description, '')), nullif(p_platform, ''), p_severity,
    p_source_module, public.auth_person_id())
  returning id into v_id;
  perform public.distribution_log(v_org, p_project_id, 'anomaly.reported',
    jsonb_build_object('id', v_id, 'kind', p_kind, 'severity', p_severity,
      'module', p_source_module, 'platform', nullif(p_platform, '')), p_release_id);
  return v_id;
end;
$$;
revoke execute on function public.report_distribution_anomaly(uuid, text, text, text, text, text, uuid) from public, anon;
grant execute on function public.report_distribution_anomaly(uuid, text, text, text, text, text, uuid) to authenticated;

create or replace function public.set_distribution_anomaly_state(p_anomaly_id uuid, p_state text,
  p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.distribution_anomalies%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select * into v_row from public.distribution_anomalies where id = p_anomaly_id for update;
  if not found or not public.can_check_distribution_scope(v_row.project_id, v_row.release_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.distribution_anomalies
     set state = p_state, state_note = v_note,
         state_by = case when p_state = 'open' then null else public.auth_person_id() end,
         state_at = case when p_state = 'open' then null else now() end
   where id = p_anomaly_id;
  perform public.distribution_log(v_row.organization_id, v_row.project_id, 'anomaly.state',
    jsonb_build_object('id', v_row.id, 'from', v_row.state, 'to', p_state, 'note', v_note),
    v_row.release_id);
end;
$$;

-- 10 -- Clôture ------------------------------------------------------------------------------
drop function public.propose_distribution_closure(uuid, text, jsonb, text, text);
create function public.propose_distribution_closure(p_project_id uuid, p_kind text,
  p_reserves jsonb, p_arbitration text, p_reason_kind text default null,
  p_release_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dossier public.distribution_dossiers%rowtype;
  v_version integer;
  v_deposited boolean;
  v_accepted boolean;
  v_early boolean := false;
  v_arbitration text := nullif(btrim(coalesce(p_arbitration, '')), '');
  v_reason text := nullif(btrim(coalesce(p_reason_kind, '')), '');
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.distribution_scope_check(p_project_id, p_release_id);
  if p_kind not in ('normal', 'reserves', 'cancelled', 'abandoned') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;
  select * into v_dossier from public.distribution_dossiers
   where project_id = p_project_id and release_id is not distinct from p_release_id;
  if not found or v_dossier.validator_person_id is null
     or not public.person_has_permission(v_dossier.organization_id,
              v_dossier.validator_person_id, 'validate') then
    raise exception 'no_validator' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.distribution_closures
              where project_id = p_project_id and release_id is not distinct from p_release_id
                and (status = 'pending' or (status = 'closed' and reopened_at is null))) then
    raise exception 'closure_open' using errcode = 'P0001';
  end if;
  v_version := public.distribution_current_version(p_project_id, p_release_id);
  v_deposited := v_version is not null and exists (
    select 1 from public.distribution_declarations
     where project_id = p_project_id and release_id is not distinct from p_release_id
       and version_number = v_version
       and kind = 'deposit' and withdrawn_at is null);
  v_accepted := v_deposited and public.distribution_accepted(p_project_id, p_release_id);
  if p_kind in ('normal', 'reserves') and not v_deposited then
    raise exception 'not_deposited' using errcode = 'P0001';
  end if;
  if p_kind = 'normal' and not public.distribution_closure_ready(p_project_id, p_release_id) then
    raise exception 'conditions_not_met' using errcode = 'P0001';
  end if;
  if p_kind = 'reserves' and not v_accepted then
    -- Before The Orchard accepted: only the direction, for a typed reason.
    if v_reason is null then
      raise exception 'not_accepted' using errcode = 'P0001';
    end if;
    v_early := true;
  end if;
  if p_kind in ('cancelled', 'abandoned') and v_reason is null then
    raise exception 'reason_kind_required' using errcode = 'P0001';
  end if;
  if p_kind <> 'normal' and v_arbitration is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if p_kind = 'reserves'
     and not public.distribution_reserves_valid(v_dossier.organization_id, p_reserves) then
    raise exception 'reserves_invalid' using errcode = 'P0001';
  end if;
  insert into public.distribution_closures (organization_id, project_id, release_id,
    version_number, kind, reserves, arbitration, proposed_by, validator_person_id, reason_kind,
    early)
  values (v_dossier.organization_id, p_project_id, p_release_id, v_version, p_kind,
    case when p_kind = 'reserves' then p_reserves else '[]'::jsonb end,
    case when p_kind = 'normal' then null else v_arbitration end,
    public.auth_person_id(), v_dossier.validator_person_id,
    case when p_kind in ('cancelled', 'abandoned') or v_early then v_reason end,
    v_early);
  perform public.distribution_log(v_dossier.organization_id, p_project_id,
    'closure.proposed', jsonb_build_object('kind', p_kind, 'version', v_version,
      'early', v_early, 'reason_kind', v_reason,
      'reserves', case when p_kind = 'reserves' then jsonb_array_length(p_reserves) else 0 end),
    p_release_id);
end;
$$;
revoke execute on function public.propose_distribution_closure(uuid, text, jsonb, text, text, uuid) from public, anon;
grant execute on function public.propose_distribution_closure(uuid, text, jsonb, text, text, uuid) to authenticated;

create or replace function public.decide_distribution_closure(p_closure_id uuid, p_approve boolean,
  p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.distribution_closures%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_direction boolean;
begin
  select * into v_row from public.distribution_closures where id = p_closure_id for update;
  if not found or not public.can_see_project(v_row.project_id) then
    raise exception 'closure_not_found' using errcode = 'P0001';
  end if;
  v_direction := v_row.kind in ('cancelled', 'abandoned') or v_row.early;
  if v_direction then
    if not public.has_permission(v_row.organization_id, 'administer') then
      raise exception 'not_direction' using errcode = '42501';
    end if;
  elsif v_row.validator_person_id is distinct from public.auth_person_id()
     or not public.has_permission(v_row.organization_id, 'validate') then
    raise exception 'not_the_validator' using errcode = '42501';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'already_decided' using errcode = 'P0001';
  end if;
  if not p_approve and v_note is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if p_approve and v_row.kind = 'normal'
     and not public.distribution_closure_ready(v_row.project_id, v_row.release_id) then
    raise exception 'conditions_not_met' using errcode = 'P0001';
  end if;
  update public.distribution_closures
     set status = case when p_approve then 'closed' else 'rejected' end,
         decided_by = public.auth_person_id(), decided_at = now(), decision_note = v_note
   where id = p_closure_id;
  if p_approve and v_row.kind = 'reserves' then
    insert into public.distribution_reserves (organization_id, project_id, release_id, closure_id,
      position, category, label, details, criticality, owner_person_id, due_on,
      expected_proof)
    select v_row.organization_id, v_row.project_id, v_row.release_id, v_row.id, x.ord::integer,
      x.r ->> 'cause', btrim(x.r ->> 'label'), coalesce(x.r -> 'details', '[]'::jsonb),
      x.r ->> 'criticality', (x.r ->> 'ownerPersonId')::uuid, (x.r ->> 'dueOn')::date,
      btrim(x.r ->> 'expectedProof')
      from jsonb_array_elements(v_row.reserves) with ordinality as x(r, ord);
  end if;
  perform public.distribution_log(v_row.organization_id, v_row.project_id,
    case when p_approve then 'closure.closed' else 'closure.rejected' end,
    jsonb_build_object('kind', v_row.kind, 'note', v_note, 'early', v_row.early),
    v_row.release_id);
end;
$$;

drop function public.reopen_distribution_closure(uuid, text);
create function public.reopen_distribution_closure(p_project_id uuid, p_note text,
  p_release_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.distribution_closures%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.can_check_distribution_scope(p_project_id, p_release_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.distribution_scope_check(p_project_id, p_release_id);
  select * into v_row from public.distribution_closures
   where project_id = p_project_id and release_id is not distinct from p_release_id
     and status = 'closed' and reopened_at is null
   for update;
  if not found then
    raise exception 'not_closed' using errcode = 'P0001';
  end if;
  if v_note is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  update public.distribution_closures
     set reopened_by = public.auth_person_id(), reopened_at = now(), reopen_note = v_note
   where id = v_row.id;
  perform public.distribution_log(v_row.organization_id, p_project_id, 'closure.reopened',
    jsonb_build_object('kind', v_row.kind, 'note', v_note), p_release_id);
end;
$$;
revoke execute on function public.reopen_distribution_closure(uuid, text, uuid) from public, anon;
grant execute on function public.reopen_distribution_closure(uuid, text, uuid) to authenticated;

create or replace function public.request_distribution_reserve_lift(p_reserve_id uuid, p_note text,
  p_proof_path text, p_proof_name text, p_proof_url text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.distribution_reserves%rowtype;
  v_path text := nullif(p_proof_path, '');
  v_url text := nullif(btrim(coalesce(p_proof_url, '')), '');
begin
  select * into v_row from public.distribution_reserves where id = p_reserve_id for update;
  if not found or not public.can_see_project(v_row.project_id)
     or not (v_row.owner_person_id = public.auth_person_id()
             or public.is_project_owner(v_row.project_id)) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.status <> 'open' then
    raise exception 'not_open' using errcode = 'P0001';
  end if;
  if v_path is null and v_url is null then
    raise exception 'proof_required' using errcode = 'P0001';
  end if;
  update public.distribution_reserves
     set status = 'lift_requested', lift_note = nullif(btrim(coalesce(p_note, '')), ''),
         lift_proof_path = v_path,
         lift_proof_name = case when v_path is null then null
                                else nullif(btrim(coalesce(p_proof_name, '')), '') end,
         lift_proof_url = v_url,
         lift_requested_by = public.auth_person_id(), lift_requested_at = now()
   where id = p_reserve_id;
  perform public.distribution_log(v_row.organization_id, v_row.project_id,
    'reserve.lift_requested', jsonb_build_object('id', v_row.id, 'label', v_row.label),
    v_row.release_id);
end;
$$;

create or replace function public.decide_distribution_reserve_lift(p_reserve_id uuid,
  p_approve boolean, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.distribution_reserves%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select * into v_row from public.distribution_reserves where id = p_reserve_id for update;
  if not found or not (public.can_check_distribution_scope(v_row.project_id, v_row.release_id)
       or (public.can_see_project(v_row.project_id)
           and public.has_permission(v_row.organization_id, 'administer'))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.status <> 'lift_requested' then
    raise exception 'not_requested' using errcode = 'P0001';
  end if;
  if v_row.lift_requested_by = public.auth_person_id() then
    raise exception 'same_person' using errcode = 'P0001';
  end if;
  if not p_approve and v_note is null then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  if p_approve then
    update public.distribution_reserves
       set status = 'lifted', lifted_by = public.auth_person_id(), lifted_at = now()
     where id = p_reserve_id;
  else
    update public.distribution_reserves
       set status = 'open', lift_refusal_note = v_note, lift_note = null,
           lift_proof_path = null, lift_proof_name = null, lift_proof_url = null,
           lift_requested_by = null, lift_requested_at = null
     where id = p_reserve_id;
  end if;
  perform public.distribution_log(v_row.organization_id, v_row.project_id,
    case when p_approve then 'reserve.lifted' else 'reserve.lift_refused' end,
    jsonb_build_object('id', v_row.id, 'label', v_row.label, 'note', v_note,
      'proof_path', v_row.lift_proof_path, 'proof_url', v_row.lift_proof_url),
    v_row.release_id);
end;
$$;

-- 11 -- Mode de sortie (lot 13) ---------------------------------------------------------------
-- « Compilation soumise » : une version de la compilation ; une sortie de titre
-- soumise en Distribution est partie, comme une sortie livrée ou en ligne.
create or replace function public.set_collective_release_mode(p_project_id uuid, p_mode text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
  v_title uuid;
  v_singles boolean := p_mode in ('singles', 'singles_then_compilation');
  v_compilation boolean := p_mode in ('compilation', 'singles_then_compilation');
begin
  v_project := public.lock_project_titles(p_project_id);
  if p_mode is null or p_mode not in ('singles', 'compilation', 'singles_then_compilation') then
    raise exception 'invalid_mode' using errcode = '22023';
  end if;
  if p_mode = v_project.collective_release_mode then
    raise exception 'mode_unchanged' using errcode = 'P0001';
  end if;
  -- What the new mode takes away must not be out already.
  if not v_compilation
     and exists (select 1 from public.distribution_versions v
                   join public.releases r on r.id = v.release_id
                  where v.project_id = p_project_id and r.project_title_id is null) then
    raise exception 'compilation_submitted' using errcode = 'P0001';
  end if;
  if not v_singles
     and exists (select 1 from public.releases r
                  where r.project_id = p_project_id and r.project_title_id is not null
                    and r.archived_at is null
                    and (r.delivered_on is not null or r.online_confirmed_on is not null
                         or r.online_detected_at is not null
                         or exists (select 1 from public.distribution_versions v
                                     where v.release_id = r.id))) then
    raise exception 'single_released' using errcode = 'P0001';
  end if;

  update public.projects set collective_release_mode = p_mode where id = p_project_id;
  if not v_compilation then
    update public.releases
       set archived_at = now(), archived_by = public.auth_person_id()
     where project_id = p_project_id and project_title_id is null and archived_at is null;
  end if;
  if not v_singles then
    update public.releases
       set archived_at = now(), archived_by = public.auth_person_id()
     where project_id = p_project_id and project_title_id is not null and archived_at is null;
  end if;
  perform public.ensure_compilation_release(p_project_id);
  for v_title in select id from public.project_titles where project_id = p_project_id loop
    perform public.ensure_title_release(v_title);
  end loop;

  insert into public.project_title_events
    (organization_id, project_id, title_id, kind, detail, actor_person_id)
  values (v_project.organization_id, p_project_id, null, 'release_mode_changed',
          jsonb_build_object('from', v_project.collective_release_mode, 'to', p_mode),
          public.auth_person_id());
end;
$$;

-- 12 -- Pour « Titres et artistes » et « Sorties » ------------------------------------------
-- Où en est le dépôt de chaque sortie d'un collectif : sa dernière version
-- (numéro, statut), son dépôt déclaré, sa clôture. Lu par qui voit le projet.
create or replace function public.release_distribution_states(p_project_id uuid)
returns table (release_id uuid, version_number integer, version_status text,
  superseded boolean, deposited boolean, accepted boolean, closure_status text,
  params_confirmed boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id,
         v.number, v.status, v.superseded_at is not null,
         exists (select 1 from public.distribution_declarations d
                  where d.release_id = r.id and d.version_number = v.number
                    and d.kind = 'deposit' and d.withdrawn_at is null),
         public.distribution_accepted(r.project_id, r.id),
         (select c.status from public.distribution_closures c
           where c.release_id = r.id and c.reopened_at is null
             and c.status in ('pending', 'closed')
           order by c.proposed_at desc limit 1),
         coalesce((select d.params_confirmed_at is not null from public.distribution_dossiers d
                    where d.release_id = r.id), false)
    from public.releases r
    left join lateral (
      select x.number, x.status, x.superseded_at from public.distribution_versions x
       where x.release_id = r.id order by x.number desc limit 1) v on true
   where r.project_id = p_project_id
     and public.can_see_project(p_project_id)
     and exists (select 1 from public.projects p where p.id = p_project_id and p.collective);
$$;
revoke execute on function public.release_distribution_states(uuid) from public, anon;
grant execute on function public.release_distribution_states(uuid) to authenticated;
