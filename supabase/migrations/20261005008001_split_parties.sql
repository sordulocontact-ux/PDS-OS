-- The rights holder of a title's share is someone known, when it can be
-- (Sacha, 05/10/2026: « il ne faudrait pas qu'on puisse les sélectionner ?
-- sinon ça va créer des doubles ») : a contact of the Réseau (a person, a
-- label, a publisher) or an artist of the catalog. A name alone stays
-- possible, as for a credit. `party` keeps the name shown; at most one link.

alter table public.master_splits
  add column contact_id uuid,
  add column artist_id uuid;

alter table public.master_splits
  add constraint master_splits_contact_same_org
    foreign key (contact_id, organization_id) references public.network_contacts (id, organization_id),
  add constraint master_splits_artist_same_org
    foreign key (artist_id, organization_id) references public.artists (id, organization_id),
  add constraint master_splits_one_party_check check (contact_id is null or artist_id is null);

create index master_splits_contact_idx on public.master_splits (contact_id) where contact_id is not null;
create index master_splits_artist_idx on public.master_splits (artist_id) where artist_id is not null;

grant insert (contact_id, artist_id) on public.master_splits to authenticated;
grant update (contact_id, artist_id) on public.master_splits to authenticated;
