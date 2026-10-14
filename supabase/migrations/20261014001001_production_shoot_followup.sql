-- Production › the shoot, followed (Ibé's tests of 13/10, PROD-019 to
-- PROD-024).
--   * the shoot's start and end are stamped by the database (PROD-019,
--     PROD-023);
--   * the rushes have who retrieves them and who checks the backup, a main
--     location and a backup location, and the other media (photos, BTS)
--     are declared on their own (PROD-020);
--   * the report validated is frozen as it was (PROD-023);
--   * an incident has a category and the areas it hits — none means a
--     plain fact, closed without a task (PROD-021).

alter table public.production_shoots
  add column started_at timestamptz,
  add column ended_at timestamptz,
  add column rushes_person_id uuid references public.people (id),
  add column rushes_contact_id uuid,
  add column backup_person_id uuid references public.people (id),
  add column backup_contact_id uuid,
  add column backup_location text,
  add column other_media boolean not null default false,
  add column other_media_by uuid references public.people (id),
  add column other_media_at timestamptz,
  add column report_snapshot jsonb,
  add constraint production_shoots_rushes_holder_check
    check (rushes_person_id is null or rushes_contact_id is null),
  add constraint production_shoots_backup_holder_check
    check (backup_person_id is null or backup_contact_id is null),
  add constraint production_shoots_rushes_contact_same_org foreign key (rushes_contact_id, organization_id)
    references public.network_contacts (id, organization_id),
  add constraint production_shoots_backup_contact_same_org foreign key (backup_contact_id, organization_id)
    references public.network_contacts (id, organization_id),
  add constraint production_shoots_backup_location_check
    check (backup_location is null or char_length(backup_location) <= 1000),
  add constraint production_shoots_report_snapshot_check
    check (report_snapshot is null or jsonb_typeof(report_snapshot) = 'object');

grant insert (rushes_person_id, rushes_contact_id, backup_person_id, backup_contact_id,
              backup_location, other_media)
  on public.production_shoots to authenticated;
grant update (rushes_person_id, rushes_contact_id, backup_person_id, backup_contact_id,
              backup_location, other_media, report_snapshot)
  on public.production_shoots to authenticated;

-- Start, end and the other media's declaration: stamped here.
create function public.production_shoots_stamp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.production_holder_check(new.organization_id, new.rushes_person_id, new.rushes_contact_id);
  perform public.production_holder_check(new.organization_id, new.backup_person_id, new.backup_contact_id);
  if new.state = 'in_progress' and new.started_at is null then
    new.started_at := now();
  end if;
  if new.state in ('done', 'partial', 'interrupted')
     and (tg_op = 'INSERT' or old.state is distinct from new.state) then
    new.ended_at := now();
  elsif new.state in ('planned', 'in_progress', 'postponed') then
    new.ended_at := null;
  end if;
  if tg_op = 'INSERT' or new.other_media is distinct from old.other_media then
    new.other_media_by := case when new.other_media then public.auth_person_id() end;
    new.other_media_at := case when new.other_media then now() end;
  end if;
  -- The frozen report goes with its validation.
  if new.report_validated_at is null then
    new.report_snapshot := null;
  end if;
  return new;
end;
$$;
revoke execute on function public.production_shoots_stamp() from public, anon, authenticated;
create trigger c_stamp before insert or update on public.production_shoots
  for each row execute function public.production_shoots_stamp();

alter table public.production_incidents
  add column category text not null default 'other',
  add column impacts text[] not null default '{}',
  add constraint production_incidents_category_check
    check (category in ('equipment', 'people', 'location', 'weather', 'technical', 'other')),
  add constraint production_incidents_impacts_check
    check (impacts <@ array['safety', 'schedule', 'budget', 'quality', 'deliverables']);
grant insert (category, impacts) on public.production_incidents to authenticated;
grant update (category, impacts) on public.production_incidents to authenticated;
