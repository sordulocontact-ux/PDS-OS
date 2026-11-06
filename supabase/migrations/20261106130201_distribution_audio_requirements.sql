-- Distribution: what the distributor asks of the audio files (« WAV 24 bits
-- / 44,1 kHz… »), owned by the Distribution and read by the Master's Brief
-- (ticket « Workflow Master » § 3 and § 14: « Les exigences Distribution
-- proviennent de Distribution », the Master never hardcodes them; proto
-- master-v2: « Formats de livraison · Distribution › exigences de The
-- Orchard »). One distributor in V1 (The Orchard), so one row per
-- organization, written by the administration in /app/settings, as the
-- billing identity.

create table public.organization_distribution (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  audio_formats text,
  updated_by uuid references public.people (id),
  updated_at timestamptz not null default now(),
  constraint organization_distribution_audio_formats_check
    check (audio_formats is null
           or (btrim(audio_formats) <> '' and char_length(audio_formats) <= 500))
);

alter table public.organization_distribution enable row level security;
alter table public.organization_distribution force row level security;
revoke all on table public.organization_distribution from anon, authenticated;
grant select on public.organization_distribution to authenticated;
grant insert (organization_id, audio_formats) on public.organization_distribution to authenticated;
grant update (audio_formats) on public.organization_distribution to authenticated;
create policy organization_distribution_select on public.organization_distribution
  for select to authenticated using (public.is_active_member(organization_id));
create policy organization_distribution_insert on public.organization_distribution
  for insert to authenticated with check (public.has_permission(organization_id, 'administer'));
create policy organization_distribution_update on public.organization_distribution
  for update to authenticated
  using (public.has_permission(organization_id, 'administer'))
  with check (public.has_permission(organization_id, 'administer'));

create or replace function public.organization_distribution_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by := public.auth_person_id();
  new.updated_at := now();
  return new;
end;
$$;
create trigger organization_distribution_stamp
  before insert or update on public.organization_distribution
  for each row execute function public.organization_distribution_stamp();
