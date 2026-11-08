-- « Budget » of a signed artist (retour de Sacha du 07/11/2026) : « pouvoir
-- affecter des dépenses directement sur le projet global d'un artiste dès
-- lors qu'il est signé […] budget transport, uber eat, restauration, studio,
-- marketing ».
--
-- The spends of no release in particular: a release's own spends stay in its
-- project's budget (budget_lines). The artist's tab adds the two up, from the
-- lines each person may read.
--
-- Read and written by whoever runs the Catalogue (manage_catalog: the
-- direction and the project managers), as the artist's contracts; a
-- creative director sees neither. Only on a signed artist, not archived.

create table public.artist_expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  artist_id uuid not null,
  label text not null,
  amount_cents bigint not null,
  category text not null,
  -- What « Autre » is (required with it).
  category_detail text,
  spent_on date not null default current_date,
  status text not null default 'paid',
  note text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artist_expenses_label_check
    check (btrim(label) <> '' and char_length(label) <= 200),
  constraint artist_expenses_amount_check check (amount_cents > 0),
  constraint artist_expenses_category_check
    check (category in ('transport', 'food', 'lodging', 'studio', 'marketing', 'other')),
  constraint artist_expenses_category_detail_check
    check (category_detail is null
           or (btrim(category_detail) <> '' and char_length(category_detail) <= 120)),
  constraint artist_expenses_other_detail_check
    check (category <> 'other' or category_detail is not null),
  constraint artist_expenses_status_check check (status in ('planned', 'paid')),
  constraint artist_expenses_note_check check (note is null or char_length(note) <= 1000),
  constraint artist_expenses_artist_same_org
    foreign key (artist_id, organization_id) references public.artists (id, organization_id)
);

create index artist_expenses_artist_idx
  on public.artist_expenses (artist_id, spent_on desc, created_at desc);

create trigger a_set_created_by before insert on public.artist_expenses
  for each row execute function public.set_created_by();

create trigger a_set_updated_at before update on public.artist_expenses
  for each row execute function public.set_updated_at();

-- Signed and not archived: the artist a spend is added to or moved to.
create or replace function public.is_signed_artist(p_artist_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.artists a
                  where a.id = p_artist_id
                    and a.relation = 'signed'
                    and a.archived_at is null);
$$;

revoke execute on function public.is_signed_artist(uuid) from public, anon;
grant execute on function public.is_signed_artist(uuid) to authenticated;

alter table public.artist_expenses enable row level security;
alter table public.artist_expenses force row level security;

revoke all on public.artist_expenses from anon, authenticated;
grant select, delete on public.artist_expenses to authenticated;
grant insert (organization_id, artist_id, label, amount_cents, category, category_detail,
              spent_on, status, note)
  on public.artist_expenses to authenticated;
grant update (label, amount_cents, category, category_detail, spent_on, status, note)
  on public.artist_expenses to authenticated;

create policy artist_expenses_select_catalog on public.artist_expenses
  for select to authenticated
  using (public.has_permission(organization_id, 'manage_catalog'));

create policy artist_expenses_insert_catalog on public.artist_expenses
  for insert to authenticated
  with check (public.has_permission(organization_id, 'manage_catalog')
              and public.is_signed_artist(artist_id));

create policy artist_expenses_update_catalog on public.artist_expenses
  for update to authenticated
  using (public.has_permission(organization_id, 'manage_catalog'))
  with check (public.has_permission(organization_id, 'manage_catalog')
              and public.is_signed_artist(artist_id));

create policy artist_expenses_delete_catalog on public.artist_expenses
  for delete to authenticated
  using (public.has_permission(organization_id, 'manage_catalog'));
