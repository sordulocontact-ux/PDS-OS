-- Two roles the UX test of 09/10/2026 missed (section 7): « Avocat·e »
-- (lawyer) and « Studio » (studio), in the Réseau and among the people of
-- the Juridique (fiche roles: the uncredited contacts of a project, the
-- roles a contract template is for). Their fiche asks the provider's block.
-- Additive: every existing row still passes.

alter table public.network_contacts drop constraint network_contacts_roles_check;
alter table public.network_contacts
  add constraint network_contacts_roles_check
    check (cardinality(roles) between 1 and 8
           and roles <@ array['artist', 'beatmaker', 'musician', 'songwriter', 'engineer',
                              'producer', 'art_director', 'videographer', 'photographer',
                              'designer', 'provider', 'studio', 'lawyer', 'partner', 'label',
                              'publisher', 'distributor', 'media', 'manager', 'other']::text[]);

alter table public.legal_project_contacts drop constraint legal_project_contacts_role_check;
alter table public.legal_project_contacts
  add constraint legal_project_contacts_role_check check (role in (
    'author', 'composer', 'arranger', 'performer', 'musician', 'backing_vocalist',
    'producer', 'label', 'provider', 'studio', 'lawyer', 'publisher', 'other'));

alter table public.contract_templates drop constraint contract_templates_roles_check;
alter table public.contract_templates
  add constraint contract_templates_roles_check
    check (cardinality(roles) between 1 and 13
           and roles <@ array['author', 'composer', 'arranger', 'performer', 'musician',
                              'backing_vocalist', 'producer', 'label', 'provider', 'studio',
                              'lawyer', 'publisher', 'other']::text[]);
