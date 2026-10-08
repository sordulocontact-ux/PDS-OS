-- Réseau: the role « Éditeur » (publisher). Asked by Sacha on 07/10/2026
-- for the borrowings (Juridique, ticket 05): the work of a sample is
-- authorised by its publisher, a structure the team adds once to the Réseau
-- and picks again for each new borrowing. Until now a publisher was filed
-- under « Autre ». Additive: every existing row still passes.

alter table public.network_contacts
  drop constraint network_contacts_roles_check;

alter table public.network_contacts
  add constraint network_contacts_roles_check
    check (cardinality(roles) between 1 and 8
           and roles <@ array['artist', 'beatmaker', 'musician', 'songwriter', 'engineer',
                              'producer', 'videographer', 'photographer', 'designer',
                              'provider', 'partner', 'label', 'publisher', 'distributor',
                              'media', 'manager', 'other']::text[]);
