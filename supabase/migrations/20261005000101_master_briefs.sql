-- Master workflow, lot 3: the Brief Mix/Master of a project (ticket
-- "Workflow Master", § 3, 4, 5, 7; docs/ARCHITECTURE.md § 8 septies).
-- One brief per project: who mixes and masters (contacts of the Réseau),
-- their estimated rates, the revisions included, who validates the versions,
-- the artistic direction, the deliverables expected, the calendar. The
-- sources stay per title (master_flow_sources).
--
-- Read: whoever sees the project. Write: its owner only (is_project_owner),
-- like everything else in a launched project. Never deleted.
--
-- Rules checked by the database:
--   * the engineers are contacts of the same organization (composite keys);
--     "same engineer" leaves the mastering contact empty;
--   * the validator is the project's owner or one of its creative
--     directors (a person who sees the project and decides);
--   * deliverables come from a closed list, none imposed;
--   * the calendar is in order: Mix V1 ≤ Mix final ≤ Mastering ≤ Master final.

create table public.master_briefs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  mix_contact_id uuid,
  mastering_same_engineer boolean not null default false,
  mastering_contact_id uuid,
  mix_rate_cents bigint,
  mastering_rate_cents bigint,
  revisions smallint,
  validator_person_id uuid references public.people (id),
  references_text text,
  direction text,
  constraints_text text,
  deliverables text[] not null default array['mix_final', 'master_final']::text[],
  mix_v1_due date,
  mix_final_due date,
  mastering_due date,
  master_final_due date,
  created_by uuid references public.people (id),
  updated_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint master_briefs_project_key unique (project_id),
  constraint master_briefs_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
    on delete cascade,
  constraint master_briefs_mix_contact_same_org
    foreign key (mix_contact_id, organization_id)
    references public.network_contacts (id, organization_id),
  constraint master_briefs_mastering_contact_same_org
    foreign key (mastering_contact_id, organization_id)
    references public.network_contacts (id, organization_id),
  constraint master_briefs_same_engineer_check
    check (not mastering_same_engineer or mastering_contact_id is null),
  constraint master_briefs_rates_check
    check ((mix_rate_cents is null or mix_rate_cents between 0 and 100000000)
           and (mastering_rate_cents is null or mastering_rate_cents between 0 and 100000000)),
  constraint master_briefs_revisions_check
    check (revisions is null or revisions between 0 and 20),
  constraint master_briefs_texts_check
    check ((references_text is null or (btrim(references_text) <> '' and char_length(references_text) <= 2000))
           and (direction is null or (btrim(direction) <> '' and char_length(direction) <= 2000))
           and (constraints_text is null or (btrim(constraints_text) <> '' and char_length(constraints_text) <= 2000))),
  constraint master_briefs_deliverables_check
    check (deliverables <@ array['mix_final', 'master_final', 'instrumental', 'acapella', 'clean',
                                 'radio_edit', 'live', 'tv_mix', 'stems']::text[]),
  constraint master_briefs_calendar_order
    check ((mix_v1_due is null or mix_final_due is null or mix_v1_due <= mix_final_due)
           and (mix_final_due is null or mastering_due is null or mix_final_due <= mastering_due)
           and (mastering_due is null or master_final_due is null or mastering_due <= master_final_due)
           and (mix_v1_due is null or master_final_due is null or mix_v1_due <= master_final_due))
);

create index master_briefs_mix_contact_idx on public.master_briefs (mix_contact_id);
create index master_briefs_mastering_contact_idx on public.master_briefs (mastering_contact_id);
create index master_briefs_validator_idx on public.master_briefs (validator_person_id);

-- The validator decides on the versions: the project's owner or one of its
-- creative directors. Security definer: it reads the project whatever the
-- caller may read, and raises one stable message.
create or replace function public.check_master_brief_validator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.validator_person_id is not null
     and not exists (select 1 from public.projects p
                      where p.id = new.project_id and p.owner_person_id = new.validator_person_id)
     and not exists (select 1 from public.project_creatives c
                      where c.project_id = new.project_id and c.person_id = new.validator_person_id) then
    raise exception 'validator_not_in_project';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_master_brief_validator() from public, anon, authenticated;

create trigger master_briefs_check_validator
  before insert or update on public.master_briefs
  for each row execute function public.check_master_brief_validator();

-- Authorship and timestamps are set by the database, never by the client.
create trigger a_set_created_by before insert on public.master_briefs
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.master_briefs
  for each row execute function public.set_updated_at();

create or replace function public.set_master_brief_updated_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by := public.auth_person_id();
  return new;
end;
$$;

revoke execute on function public.set_master_brief_updated_by() from public, anon, authenticated;

create trigger a_set_updated_by before insert or update on public.master_briefs
  for each row execute function public.set_master_brief_updated_by();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.master_briefs enable row level security;
alter table public.master_briefs force row level security;
revoke all on table public.master_briefs from anon, authenticated;
grant select on table public.master_briefs to authenticated;
grant insert (organization_id, project_id, mix_contact_id, mastering_same_engineer,
              mastering_contact_id, mix_rate_cents, mastering_rate_cents, revisions,
              validator_person_id, references_text, direction, constraints_text, deliverables,
              mix_v1_due, mix_final_due, mastering_due, master_final_due)
  on public.master_briefs to authenticated;
grant update (mix_contact_id, mastering_same_engineer, mastering_contact_id, mix_rate_cents,
              mastering_rate_cents, revisions, validator_person_id, references_text, direction,
              constraints_text, deliverables, mix_v1_due, mix_final_due, mastering_due,
              master_final_due)
  on public.master_briefs to authenticated;

create policy master_briefs_select_visible on public.master_briefs
  for select to authenticated
  using (public.can_see_project(project_id));

create policy master_briefs_insert_owner on public.master_briefs
  for insert to authenticated
  with check (public.is_project_owner(project_id));

create policy master_briefs_update_owner on public.master_briefs
  for update to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));
