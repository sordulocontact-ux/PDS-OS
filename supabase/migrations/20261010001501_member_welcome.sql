-- A first visit is guided (UX test of 09/10/2026, section 5: a new member
-- got no hand-holding). The home shows a « Bienvenue » card to a member
-- approved less than 30 days ago (decided by code) until they close it; the
-- closing is kept here, never in the browser (CLAUDE.md rule 7). One row
-- per person and organization, written by that person only.

create table public.member_welcomes (
  organization_id uuid not null references public.organizations (id),
  person_id uuid not null references public.people (id),
  dismissed_at timestamptz not null default now(),
  primary key (organization_id, person_id)
);

alter table public.member_welcomes enable row level security;
alter table public.member_welcomes force row level security;
revoke all on public.member_welcomes from anon, authenticated;
grant select on public.member_welcomes to authenticated;
grant insert (organization_id, person_id) on public.member_welcomes to authenticated;

create policy member_welcomes_select_self on public.member_welcomes
  for select to authenticated
  using (person_id = public.auth_person_id());

create policy member_welcomes_insert_self on public.member_welcomes
  for insert to authenticated
  with check (person_id = public.auth_person_id()
              and public.is_active_member(organization_id));
