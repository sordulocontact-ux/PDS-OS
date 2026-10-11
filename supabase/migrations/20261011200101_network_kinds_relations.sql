-- Réseau, ticket « Retour PO / Réseau » (11/10/2026, docs/ARCHITECTURE.md § 8 quinquies) :
--   1. what a contact does (« métier » of a person, « activité » of an organization) and
--      how PDS works with it (« type de relation » : client, prestataire, partenaire,
--      fournisseur) are two things : « Prestataire » and « Partenaire » leave the roles
--      for the new `relations` column, several per contact ;
--   2. the organizations get their own activities (Agence, Société de production,
--      Entreprise) ; which roles fit which kind is the form's rule
--      (lib/network/types.ts), not a check : a role held before this ticket is never
--      dropped by a migration ;
--   3. only the kind and the name are required : no role is needed any more ;
--   4. a contact with dated observations (Marketing) can no longer be deleted : they
--      were deleted with it (« ne pas perdre les historiques ») ; it is archived instead.

alter table public.network_contacts
  add column relations text[] not null default '{}',
  add constraint network_contacts_relations_check
    check (cardinality(relations) <= 4
           and relations <@ array['client', 'provider', 'partner', 'supplier']::text[]);

alter table public.network_contacts drop constraint network_contacts_roles_check;

-- 1. The relation types held as roles until now, kept in order, once.
update public.network_contacts c
   set relations = array(
         select r from unnest(array['client', 'provider', 'partner', 'supplier']) r
          where r = any (c.roles)),
       roles = array(select r from unnest(c.roles) r where r not in ('provider', 'partner'))
 where c.roles && array['provider', 'partner'];

-- 2 and 3.
alter table public.network_contacts
  add constraint network_contacts_roles_check
    check (cardinality(roles) <= 8
           and roles <@ array['artist', 'beatmaker', 'musician', 'songwriter', 'engineer',
                              'producer', 'art_director', 'videographer', 'photographer',
                              'designer', 'lawyer', 'journalist', 'influencer', 'manager',
                              'label', 'studio', 'agency', 'production_company', 'publisher',
                              'distributor', 'media', 'company', 'other']::text[]);

grant insert (relations), update (relations) on public.network_contacts to authenticated;

-- 4. delete_records reads the foreign key violation as « contact_in_use ».
alter table public.network_observations drop constraint network_observations_contact_same_org;
alter table public.network_observations
  add constraint network_observations_contact_same_org foreign key (contact_id, organization_id)
    references public.network_contacts (id, organization_id);
