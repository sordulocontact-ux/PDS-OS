-- Réseau: the role « Directeur·rice artistique » (art_director). Asked by
-- Sacha on 10/10/2026: the Cadrage gives the team's « Direction artistique »
-- to someone of the Réseau, and no role said who does that work (it was
-- filed under « Autre », so the picker could not list them first).
-- Additive: every existing row still passes.

alter table public.network_contacts
  drop constraint network_contacts_roles_check;

alter table public.network_contacts
  add constraint network_contacts_roles_check
    check (cardinality(roles) between 1 and 8
           and roles <@ array['artist', 'beatmaker', 'musician', 'songwriter', 'engineer',
                              'producer', 'art_director', 'videographer', 'photographer',
                              'designer', 'provider', 'partner', 'label', 'publisher',
                              'distributor', 'media', 'manager', 'other']::text[]);
