-- A deal's contract names who signs it (20261124120101): once linked without
-- a party, the deal's counterpart is put in, else the artist's person.
-- Run with `supabase test db`.
begin;
select plan(4);

create temp table ids (name text primary key, id uuid) on commit drop;
insert into ids select 'org', id from public.organizations where slug = 'pds';
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;

insert into public.network_contacts (organization_id, kind, name, roles, email)
values (pg_temp.id_of('org'), 'organization', 'Label Test Party', array['label']::text[], 'label@party.test');
insert into ids select 'label', id from public.network_contacts where name = 'Label Test Party';
insert into public.artists (organization_id, name, relation)
values (pg_temp.id_of('org'), 'Artiste Test Party', 'collaboration');
insert into ids select 'artist', id from public.artists where name = 'Artiste Test Party';
insert into public.network_contacts (organization_id, kind, name, roles, artist_id)
values (pg_temp.id_of('org'), 'person', 'Artiste Test Party', array[]::text[], pg_temp.id_of('artist'));
insert into ids select 'artist_person', id from public.network_contacts where name = 'Artiste Test Party' and kind = 'person';

insert into public.contracts (organization_id, title, type, owner_person_id)
select pg_temp.id_of('org'), t, 'license', (select person_id from public.memberships where organization_id = pg_temp.id_of('org') and status = 'approved' limit 1)
  from (values ('Contrat Party A'), ('Contrat Party B')) as x(t);
insert into ids select 'ca', id from public.contracts where title = 'Contrat Party A';
insert into ids select 'cb', id from public.contracts where title = 'Contrat Party B';

insert into public.deals (organization_id, kind, artist_id, counterpart_contact_id, stage)
values (pg_temp.id_of('org'), 'label', pg_temp.id_of('artist'), pg_temp.id_of('label'), 'contracting');
insert into ids select 'deal_label', id from public.deals where counterpart_contact_id = pg_temp.id_of('label');
insert into public.deals (organization_id, kind, artist_id, stage)
values (pg_temp.id_of('org'), 'music', pg_temp.id_of('artist'), 'contracting');
insert into ids select 'deal_music', id from public.deals
 where artist_id = pg_temp.id_of('artist') and counterpart_contact_id is null;

update public.deals set contract_id = pg_temp.id_of('ca') where id = pg_temp.id_of('deal_label');
select is((select contact_id::text || '/' || role from public.contract_parties where contract_id = pg_temp.id_of('ca')),
  pg_temp.id_of('label')::text || '/Label', 'a label deal''s contract names the label');

update public.deals set contract_id = pg_temp.id_of('cb') where id = pg_temp.id_of('deal_music');
select is((select contact_id::text || '/' || role from public.contract_parties where contract_id = pg_temp.id_of('cb')),
  pg_temp.id_of('artist_person')::text || '/Artiste', 'a music deal''s contract names the artist''s person');

update public.deals set contract_id = null where id = pg_temp.id_of('deal_label');
update public.deals set contract_id = pg_temp.id_of('cb') where id = pg_temp.id_of('deal_label');
select is((select count(*)::int from public.contract_parties where contract_id = pg_temp.id_of('cb')), 1,
  'a contract that already names someone is left as it is');
select is((select count(*)::int from public.contract_parties where contract_id = pg_temp.id_of('ca')), 1,
  'unlinking keeps the party');

select * from finish();
rollback;
