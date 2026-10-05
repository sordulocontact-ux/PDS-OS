-- A title's credit points to its person in the Réseau (docs/ARCHITECTURE.md
-- § 8 sexies). Until now the Juridique matched a credit to a contact by
-- name, which a typo or a pseudonym breaks; the Cadrage juridique attaches
-- facts to a person, so it needs a stable identity.
--
-- Nullable: a credit may name someone not in the Réseau yet. Same
-- organization enforced by the composite key, like every other link.
-- Contacts are archived, never deleted, so the link never dangles. Written
-- like the rest of the credit (manage_catalog on a live master, existing
-- policies); setting it logs a "credit updated" event (master_items_log).

alter table public.master_contributors add column contact_id uuid;

alter table public.master_contributors
  add constraint master_contributors_contact_same_org
  foreign key (contact_id, organization_id)
  references public.network_contacts (id, organization_id);

create index master_contributors_contact_idx
  on public.master_contributors (contact_id)
  where contact_id is not null;

grant insert (contact_id) on public.master_contributors to authenticated;
grant update (contact_id) on public.master_contributors to authenticated;
