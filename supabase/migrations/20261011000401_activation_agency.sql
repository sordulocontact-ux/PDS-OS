-- Marketing › Activations, agency mode — one module for Influence and RP
-- (tickets « Influence », parcours B, and « Relations presse », § 6 ;
-- docs/ARCHITECTURE.md § 8 duodecies). The agency has no account : its Google
-- Sheets, Excel or plan stays its tool, read only.
--   - a source : a Google Sheets link (one tab), a file deposited at each
--     refresh, or a manual entry ; with the mapping of its columns ;
--   - a snapshot per refresh, append-only, with every row as read and its
--     errors : « Actualiser » records a preview (added, modified, unchanged,
--     absent from the last source), applied only once a person confirms, in
--     full or in part ;
--   - an agency row : its identity across snapshots, the latest values, the
--     agency's status as given, and the PDS decision and note — never touched
--     by a refresh (« Les décisions PDS sont des données PO séparées des
--     statuts de l'agence et survivent à chaque actualisation ») ;
--   - the agency's report (bilan) : file or text kept as received, decided
--     provisionally with reserves, sent back for complements, archived as
--     received, or validated.
-- The app parses the file (lib/activations/agency/parse.ts) and sends the rows
-- as data ; the database classifies them against what it holds.

-- 1. Sources ------------------------------------------------------------------------------

create table public.agency_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  -- « Djuno », « Plan médias V2 ».
  label text not null,
  -- The agency (an organization of the Réseau) and the person to write to.
  agency_contact_id uuid,
  agency_person text,
  -- google_sheet, file, manual.
  kind text not null,
  url text,
  -- The Google Sheets tab (gid).
  sheet_gid text,
  -- { "<field>": "<column header>" } ; the key fields identify a row.
  mapping jsonb not null default '{}'::jsonb,
  key_fields text[] not null default '{}',
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agency_sources_label_check check (btrim(label) <> '' and char_length(label) <= 120),
  constraint agency_sources_person_check
    check (agency_person is null or char_length(agency_person) <= 200),
  constraint agency_sources_kind_check check (kind in ('google_sheet', 'file', 'manual')),
  constraint agency_sources_url_check check (
    (kind = 'google_sheet') = (url is not null)
    and (url is null or url ~ '^https://docs\.google\.com/spreadsheets/d/[A-Za-z0-9_-]+')),
  constraint agency_sources_gid_check check (sheet_gid is null or sheet_gid ~ '^[0-9]{1,12}$'),
  constraint agency_sources_mapping_check check (jsonb_typeof(mapping) = 'object'),
  constraint agency_sources_keys_check check (cardinality(key_fields) <= 4),
  constraint agency_sources_id_org_key unique (id, organization_id),
  constraint agency_sources_activation_same_org foreign key (activation_id, organization_id)
    references public.marketing_activations (id, organization_id) on delete cascade,
  constraint agency_sources_agency_same_org foreign key (agency_contact_id, organization_id)
    references public.network_contacts (id, organization_id)
);
create index agency_sources_activation_idx on public.agency_sources (activation_id);
create trigger a_fill before insert on public.agency_sources
  for each row execute function public.activation_child_fill();
create trigger a_set_created_by before insert on public.agency_sources
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.agency_sources
  for each row execute function public.set_updated_at();

-- Only an agency activation has sources ; a new or changed mapping is noted.
create or replace function public.agency_sources_journal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.marketing_activations a
                  where a.id = new.activation_id and a.mode = 'agency') then
    raise exception 'activation_not_agency' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    perform public.log_activation_event(new.activation_id, 'agency.source_connected', new.id,
      null, jsonb_build_object('kind', new.kind, 'label', new.label), null);
  elsif new.mapping is distinct from old.mapping or new.key_fields is distinct from old.key_fields then
    perform public.log_activation_event(new.activation_id, 'agency.mapping', new.id,
      jsonb_build_object('mapping', old.mapping), jsonb_build_object('mapping', new.mapping), null);
  end if;
  return new;
end;
$$;
revoke execute on function public.agency_sources_journal() from public, anon, authenticated;
create trigger b_journal before insert or update on public.agency_sources
  for each row execute function public.agency_sources_journal();

alter table public.agency_sources enable row level security;
alter table public.agency_sources force row level security;
revoke all on table public.agency_sources from anon, authenticated;
grant select on public.agency_sources to authenticated;
grant insert (organization_id, project_id, activation_id, label, agency_contact_id, agency_person,
              kind, url, sheet_gid,
              mapping, key_fields)
  on public.agency_sources to authenticated;
grant update (label, agency_contact_id, agency_person, url, sheet_gid, mapping, key_fields)
  on public.agency_sources to authenticated;
create policy agency_sources_select on public.agency_sources
  for select to authenticated using (public.can_see_project(project_id));
create policy agency_sources_insert on public.agency_sources
  for insert to authenticated with check (public.activation_can_write(activation_id));
create policy agency_sources_update on public.agency_sources
  for update to authenticated
  using (public.activation_can_write(activation_id))
  with check (public.activation_can_write(activation_id));

-- 2. Snapshots ---------------------------------------------------------------------------

create table public.agency_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  source_id uuid not null,
  -- preview, applied, partial, discarded.
  status text not null default 'preview',
  file_id uuid,
  headers text[] not null default '{}',
  -- Errors of the whole file (unreadable tab, missing key column…).
  errors jsonb not null default '[]'::jsonb,
  taken_by uuid references public.people (id),
  taken_at timestamptz not null default now(),
  applied_by uuid references public.people (id),
  applied_at timestamptz,
  constraint agency_snapshots_status_check
    check (status in ('preview', 'applied', 'partial', 'discarded')),
  constraint agency_snapshots_headers_check check (cardinality(headers) <= 200),
  constraint agency_snapshots_errors_check check (jsonb_typeof(errors) = 'array'),
  constraint agency_snapshots_id_org_key unique (id, organization_id),
  constraint agency_snapshots_source_same_org foreign key (source_id, organization_id)
    references public.agency_sources (id, organization_id) on delete cascade,
  constraint agency_snapshots_file_same_org foreign key (file_id, organization_id)
    references public.activation_files (id, organization_id)
);
create index agency_snapshots_source_idx on public.agency_snapshots (source_id, taken_at desc);

create table public.agency_snapshot_rows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  snapshot_id uuid not null,
  row_key text not null,
  -- The line in the source (2 = first line after the header).
  position integer,
  raw jsonb,
  mapped jsonb,
  errors jsonb not null default '[]'::jsonb,
  -- added, modified, unchanged, absent (in the agency rows, not in this read).
  change text not null,
  constraint agency_snapshot_rows_key_check
    check (btrim(row_key) <> '' and char_length(row_key) <= 300),
  constraint agency_snapshot_rows_change_check
    check (change in ('added', 'modified', 'unchanged', 'absent')),
  constraint agency_snapshot_rows_unique unique (snapshot_id, row_key),
  constraint agency_snapshot_rows_snapshot_same_org foreign key (snapshot_id, organization_id)
    references public.agency_snapshots (id, organization_id) on delete cascade
);

alter table public.agency_snapshots enable row level security;
alter table public.agency_snapshots force row level security;
revoke all on table public.agency_snapshots from anon, authenticated;
grant select on public.agency_snapshots to authenticated;
create policy agency_snapshots_select on public.agency_snapshots
  for select to authenticated using (public.can_see_project(project_id));

alter table public.agency_snapshot_rows enable row level security;
alter table public.agency_snapshot_rows force row level security;
revoke all on table public.agency_snapshot_rows from anon, authenticated;
grant select on public.agency_snapshot_rows to authenticated;
create policy agency_snapshot_rows_select on public.agency_snapshot_rows
  for select to authenticated
  using (exists (select 1 from public.agency_snapshots s
                  where s.id = snapshot_id and public.can_see_project(s.project_id)));

-- 3. Agency rows ----------------------------------------------------------------------------

create table public.agency_rows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  source_id uuid not null,
  row_key text not null,
  -- The Réseau contact it is linked to, by a person (never automatically).
  contact_id uuid,
  current jsonb not null default '{}'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  -- The agency's status, as written in its file.
  agency_status text,
  first_snapshot_id uuid,
  last_snapshot_id uuid,
  -- « Absente de la dernière source », never deleted.
  absent_since timestamptz,
  -- to_review, validated, refused, to_discuss, waiting_info (Influence),
  -- to_fix (RP).
  pds_decision text not null default 'to_review',
  pds_note text,
  decided_by uuid references public.people (id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agency_rows_status_check
    check (agency_status is null or char_length(agency_status) <= 200),
  constraint agency_rows_decision_check check (pds_decision in (
    'to_review', 'validated', 'refused', 'to_discuss', 'waiting_info', 'to_fix')),
  constraint agency_rows_note_check check (pds_note is null or char_length(pds_note) <= 2000),
  constraint agency_rows_unique unique (source_id, row_key),
  constraint agency_rows_id_org_key unique (id, organization_id),
  constraint agency_rows_source_same_org foreign key (source_id, organization_id)
    references public.agency_sources (id, organization_id) on delete cascade,
  constraint agency_rows_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id)
);
create index agency_rows_activation_idx on public.agency_rows (activation_id);
create index agency_rows_contact_idx on public.agency_rows (contact_id) where contact_id is not null;
create trigger a_set_updated_at before update on public.agency_rows
  for each row execute function public.set_updated_at();

-- A person changes only the decision, the note and the Réseau link ; the
-- decision is stamped and journaled.
create or replace function public.agency_rows_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('pds.agency_refresh', true) is distinct from 'on'
     and (new.current is distinct from old.current or new.raw is distinct from old.raw
          or new.agency_status is distinct from old.agency_status
          or new.absent_since is distinct from old.absent_since) then
    raise exception 'agency_values_read_only' using errcode = '42501';
  end if;
  if new.pds_decision is distinct from old.pds_decision
     or new.pds_note is distinct from old.pds_note then
    new.decided_by := public.auth_person_id();
    new.decided_at := now();
    perform public.log_activation_event(new.activation_id, 'pds_decision.updated', new.id,
      jsonb_build_object('decision', old.pds_decision),
      jsonb_build_object('decision', new.pds_decision), new.pds_note);
  end if;
  if new.contact_id is distinct from old.contact_id then
    perform public.log_activation_event(new.activation_id, 'agency.row_linked', new.id,
      jsonb_build_object('contact', old.contact_id), jsonb_build_object('contact', new.contact_id),
      null);
  end if;
  return new;
end;
$$;
revoke execute on function public.agency_rows_guard() from public, anon, authenticated;
create trigger b_guard before update on public.agency_rows
  for each row execute function public.agency_rows_guard();

alter table public.agency_rows enable row level security;
alter table public.agency_rows force row level security;
revoke all on table public.agency_rows from anon, authenticated;
grant select on public.agency_rows to authenticated;
grant update (contact_id, pds_decision, pds_note) on public.agency_rows to authenticated;
create policy agency_rows_select on public.agency_rows
  for select to authenticated using (public.can_see_project(project_id));
create policy agency_rows_update on public.agency_rows
  for update to authenticated
  using (public.activation_can_write(activation_id))
  with check (public.activation_can_write(activation_id));

-- 4. Refresh : preview, then confirmation -----------------------------------------------------

-- Records a read of the source as a preview : every row with its change
-- against the agency rows, plus the rows the read no longer has. An earlier
-- preview of the same source is discarded. p_rows : [{ key, position, raw,
-- mapped, errors }].
create or replace function public.record_agency_preview(
  p_source_id uuid, p_file_id uuid, p_headers text[], p_rows jsonb, p_errors jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source public.agency_sources%rowtype;
  v_snapshot uuid;
begin
  select * into v_source from public.agency_sources where id = p_source_id;
  if not found or not public.can_see_project(v_source.project_id) then
    raise exception 'source_not_found';
  end if;
  if not public.activation_can_write(v_source.activation_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 5000
     or (p_errors is not null and jsonb_typeof(p_errors) <> 'array') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if p_file_id is not null and not exists (
    select 1 from public.activation_files f
     where f.id = p_file_id and f.activation_id = v_source.activation_id) then
    raise exception 'file_not_in_activation' using errcode = '23514';
  end if;
  update public.agency_snapshots set status = 'discarded'
   where source_id = p_source_id and status = 'preview';
  insert into public.agency_snapshots
    (organization_id, project_id, activation_id, source_id, file_id, headers, errors, taken_by)
  values (v_source.organization_id, v_source.project_id, v_source.activation_id, p_source_id,
          p_file_id, coalesce(p_headers, '{}'), coalesce(p_errors, '[]'::jsonb),
          public.auth_person_id())
  returning id into v_snapshot;

  insert into public.agency_snapshot_rows
    (organization_id, snapshot_id, row_key, position, raw, mapped, errors, change)
  select v_source.organization_id, v_snapshot, r.key, r.position, r.raw, r.mapped,
         coalesce(r.errors, '[]'::jsonb),
         case when ar.id is null then 'added'
              when ar.current is distinct from r.mapped or ar.raw is distinct from r.raw
                   or ar.absent_since is not null then 'modified'
              else 'unchanged' end
    from jsonb_to_recordset(p_rows) as r(key text, position integer, raw jsonb, mapped jsonb,
                                         errors jsonb)
    left join public.agency_rows ar on ar.source_id = p_source_id and ar.row_key = r.key
   where r.key is not null and btrim(r.key) <> ''
  on conflict (snapshot_id, row_key) do nothing;

  insert into public.agency_snapshot_rows
    (organization_id, snapshot_id, row_key, raw, mapped, change)
  select v_source.organization_id, v_snapshot, ar.row_key, null, null, 'absent'
    from public.agency_rows ar
   where ar.source_id = p_source_id and ar.absent_since is null
     and not exists (select 1 from public.agency_snapshot_rows s
                      where s.snapshot_id = v_snapshot and s.row_key = ar.row_key);

  perform public.log_activation_event(v_source.activation_id, 'agency.refresh_previewed',
    v_snapshot, null, jsonb_build_object('source', p_source_id), null);
  return v_snapshot;
end;
$$;
revoke execute on function public.record_agency_preview(uuid, uuid, text[], jsonb, jsonb)
  from public, anon;
grant execute on function public.record_agency_preview(uuid, uuid, text[], jsonb, jsonb)
  to authenticated;

-- « Confirmer l'actualisation » : all rows (p_keys null) or the chosen ones.
-- Values, agency status and absence follow the read ; decisions and notes are
-- never touched.
create or replace function public.apply_agency_snapshot(p_snapshot_id uuid, p_keys text[])
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.agency_snapshots%rowtype;
  v_total integer;
  v_kept integer;
  v_status text;
begin
  select * into v from public.agency_snapshots where id = p_snapshot_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'snapshot_not_found';
  end if;
  if not public.activation_can_write(v.activation_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.status <> 'preview' then raise exception 'snapshot_not_preview'; end if;

  perform set_config('pds.agency_refresh', 'on', true);
  insert into public.agency_rows
    (organization_id, project_id, activation_id, source_id, row_key, current, raw,
     agency_status, first_snapshot_id, last_snapshot_id)
  select v.organization_id, v.project_id, v.activation_id, v.source_id, s.row_key,
         coalesce(s.mapped, '{}'::jsonb), coalesce(s.raw, '{}'::jsonb),
         nullif(left(btrim(s.mapped ->> 'agency_status'), 200), ''), v.id, v.id
    from public.agency_snapshot_rows s
   where s.snapshot_id = v.id and s.change = 'added'
     and (p_keys is null or s.row_key = any (p_keys));

  update public.agency_rows ar
     set current = coalesce(s.mapped, '{}'::jsonb), raw = coalesce(s.raw, '{}'::jsonb),
         agency_status = nullif(left(btrim(s.mapped ->> 'agency_status'), 200), ''),
         last_snapshot_id = v.id, absent_since = null
    from public.agency_snapshot_rows s
   where s.snapshot_id = v.id and s.change in ('modified', 'unchanged')
     and ar.source_id = v.source_id and ar.row_key = s.row_key
     and (p_keys is null or s.row_key = any (p_keys));

  update public.agency_rows ar
     set absent_since = now()
    from public.agency_snapshot_rows s
   where s.snapshot_id = v.id and s.change = 'absent'
     and ar.source_id = v.source_id and ar.row_key = s.row_key
     and (p_keys is null or s.row_key = any (p_keys));
  perform set_config('pds.agency_refresh', 'off', true);

  select count(*) filter (where change <> 'unchanged'),
         count(*) filter (where change <> 'unchanged'
                            and (p_keys is null or row_key = any (p_keys)))
    into v_total, v_kept
    from public.agency_snapshot_rows where snapshot_id = v.id;
  v_status := case when v_kept = v_total then 'applied' else 'partial' end;
  update public.agency_snapshots
     set status = v_status, applied_by = public.auth_person_id(), applied_at = now()
   where id = v.id;
  perform public.log_activation_event(v.activation_id, 'agency.refresh_confirmed', v.id, null,
    jsonb_build_object('status', v_status, 'changes', v_kept, 'of', v_total), null);
  return v_status;
end;
$$;
revoke execute on function public.apply_agency_snapshot(uuid, text[]) from public, anon;
grant execute on function public.apply_agency_snapshot(uuid, text[]) to authenticated;

create or replace function public.discard_agency_snapshot(p_snapshot_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.agency_snapshots%rowtype;
begin
  select * into v from public.agency_snapshots where id = p_snapshot_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'snapshot_not_found';
  end if;
  if not public.activation_can_write(v.activation_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.status <> 'preview' then raise exception 'snapshot_not_preview'; end if;
  update public.agency_snapshots set status = 'discarded' where id = v.id;
end;
$$;
revoke execute on function public.discard_agency_snapshot(uuid) from public, anon;
grant execute on function public.discard_agency_snapshot(uuid) to authenticated;

-- 5. Evidence and metrics read in an agency file -------------------------------------------

alter table public.activation_evidence
  add column agency_row_id uuid,
  add constraint activation_evidence_agency_row_same_org foreign key (agency_row_id, organization_id)
    references public.agency_rows (id, organization_id) on delete cascade,
  add constraint activation_evidence_one_subject_check
    check (target_id is null or agency_row_id is null);
alter table public.activation_metrics
  add column agency_row_id uuid,
  add constraint activation_metrics_agency_row_same_org foreign key (agency_row_id, organization_id)
    references public.agency_rows (id, organization_id) on delete cascade,
  add constraint activation_metrics_one_subject_check
    check (target_id is null or agency_row_id is null);
grant insert (agency_row_id) on public.activation_evidence to authenticated;
grant insert (agency_row_id) on public.activation_metrics to authenticated;

create or replace function public.activation_agency_row_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.agency_row_id is not null and not exists (
    select 1 from public.agency_rows r
     where r.id = new.agency_row_id and r.activation_id = new.activation_id) then
    raise exception 'row_not_in_activation' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke execute on function public.activation_agency_row_check() from public, anon, authenticated;
create trigger a_agency_row before insert on public.activation_evidence
  for each row execute function public.activation_agency_row_check();
create trigger a_agency_row before insert on public.activation_metrics
  for each row execute function public.activation_agency_row_check();

-- 6. Agency report (bilan) ------------------------------------------------------------------

create table public.agency_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  file_id uuid,
  url text,
  -- The report's text, as received.
  body text,
  received_on date not null,
  -- received, provisional (validé provisoirement avec réserves),
  -- complements_requested, archived (reçu sans valider), validated.
  status text not null default 'received',
  -- The objective reserves listed by code at decision time.
  reserves jsonb,
  comment text,
  decided_by uuid references public.people (id),
  decided_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint agency_reports_url_check
    check (url is null or (char_length(url) <= 2000 and url ~ '^https?://\S+$')),
  constraint agency_reports_body_check check (body is null or char_length(body) <= 50000),
  constraint agency_reports_something_check
    check (file_id is not null or url is not null or (body is not null and btrim(body) <> '')),
  constraint agency_reports_status_check check (status in (
    'received', 'provisional', 'complements_requested', 'archived', 'validated')),
  constraint agency_reports_reserves_check
    check (reserves is null or jsonb_typeof(reserves) = 'array'),
  constraint agency_reports_comment_check check (comment is null or char_length(comment) <= 2000),
  constraint agency_reports_activation_same_org foreign key (activation_id, organization_id)
    references public.marketing_activations (id, organization_id) on delete cascade,
  constraint agency_reports_file_same_org foreign key (file_id, organization_id)
    references public.activation_files (id, organization_id)
);
create index agency_reports_activation_idx on public.agency_reports (activation_id, received_on);
create trigger a_fill before insert on public.agency_reports
  for each row execute function public.activation_child_fill();
create trigger a_set_created_by before insert on public.agency_reports
  for each row execute function public.set_created_by();

create or replace function public.agency_reports_journal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.status := 'received';
  new.reserves := null;
  new.decided_by := null;
  new.decided_at := null;
  perform public.log_activation_event(new.activation_id, 'agency.report_received', new.id,
    null, jsonb_build_object('received_on', new.received_on), null);
  return new;
end;
$$;
revoke execute on function public.agency_reports_journal() from public, anon, authenticated;
create trigger b_journal before insert on public.agency_reports
  for each row execute function public.agency_reports_journal();

alter table public.agency_reports enable row level security;
alter table public.agency_reports force row level security;
revoke all on table public.agency_reports from anon, authenticated;
grant select on public.agency_reports to authenticated;
grant insert (organization_id, project_id, activation_id, file_id, url, body, received_on)
  on public.agency_reports
  to authenticated;
create policy agency_reports_select on public.agency_reports
  for select to authenticated using (public.can_see_project(project_id));
create policy agency_reports_insert on public.agency_reports
  for insert to authenticated with check (public.activation_can_write(activation_id));

-- The responsible's decision on a report. « Le commentaire est facultatif pour
-- une validation provisoire si le système consigne automatiquement la liste
-- des réserves objectives » ; a definitive validation despite reserves needs a
-- reason and a validator.
create or replace function public.decide_agency_report(
  p_report_id uuid, p_decision text, p_comment text, p_reserves jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.agency_reports%rowtype;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_has_reserves boolean :=
    p_reserves is not null and jsonb_typeof(p_reserves) = 'array'
    and jsonb_array_length(p_reserves) > 0;
begin
  select * into v from public.agency_reports where id = p_report_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'report_not_found';
  end if;
  if not public.activation_can_write(v.activation_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_decision not in ('provisional', 'complements_requested', 'archived', 'validated')
     or (p_reserves is not null and jsonb_typeof(p_reserves) <> 'array') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if v.status = 'validated' then raise exception 'invalid_transition'; end if;
  if p_decision = 'complements_requested' and v_comment is null then
    raise exception 'comment_required' using errcode = '23514';
  end if;
  if p_decision = 'validated' and v_has_reserves then
    if v_comment is null then raise exception 'reason_required' using errcode = '23514'; end if;
    if not public.marketing_can_validate(v.project_id) then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
  end if;
  update public.agency_reports
     set status = p_decision, reserves = case when v_has_reserves then p_reserves end,
         comment = left(v_comment, 2000), decided_by = public.auth_person_id(), decided_at = now()
   where id = v.id;
  perform public.log_activation_event(v.activation_id, 'agency.report_' || p_decision, v.id,
    null, jsonb_build_object('reserves', p_reserves), v_comment);
end;
$$;
revoke execute on function public.decide_agency_report(uuid, text, text, jsonb) from public, anon;
grant execute on function public.decide_agency_report(uuid, text, text, jsonb) to authenticated;
