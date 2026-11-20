-- Business, réunion avec Ibé du 18/11/2026 (…20261120100101): a deal with a
-- label or a brand, named by an organization of the Réseau; a participation
-- stays a music deal's; who opens a deal is unchanged.
-- Run with `supabase test db`.
begin;
select plan(13);

create function pg_temp.new_user(p_email text) returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          p_email, now(), jsonb_build_object('first_name', split_part(p_email, '@', 1)));
  return v_id;
end $$;
create function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
create temp table vars (k text primary key, v text) on commit drop;
grant all on vars to authenticated;
insert into vars select 'tag', substr(md5(random()::text), 1, 8);
insert into ids
select r.name, pg_temp.new_user('cp-' || r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('owner'), ('glen'), ('thibault')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('glen', 'business_manager'), ('thibault', 'business')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner', 'glen', 'thibault');
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated;
create function pg_temp.deal(p text) returns public.deals
  language sql as $$ select * from public.deals where id = pg_temp.id_of(p) $$;
grant execute on function pg_temp.deal(text) to authenticated;

insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), 'Jay ' || pg_temp.tag(), 'collaboration';
insert into ids select 'jay', id from public.artists where name = 'Jay ' || pg_temp.tag();
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'organization', 'Label ' || pg_temp.tag(), array['label']),
       (pg_temp.id_of('org'), 'organization', 'Marque ' || pg_temp.tag(), array['company']),
       (pg_temp.id_of('org'), 'person', 'Manager ' || pg_temp.tag(), array['manager']);
insert into ids select 'label', id from public.network_contacts where name = 'Label ' || pg_temp.tag();
insert into ids select 'brand', id from public.network_contacts where name = 'Marque ' || pg_temp.tag();
insert into ids select 'manager', id from public.network_contacts where name = 'Manager ' || pg_temp.tag();

-- The direction opens a label deal for an artist ------------------------------------------
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ insert into ids select 'd_label', public.create_deal(
  p_kind => 'label', p_counterpart_contact_id => pg_temp.id_of('label'),
  p_artist_id => pg_temp.id_of('jay'), p_assignee_person_id => pg_temp.id_of('glen_person')) $$,
  'the direction opens a label deal for an artist');
select is((pg_temp.deal('d_label')).counterpart_contact_id, pg_temp.id_of('label'),
  'the deal names the label it is negotiated with');
select is((pg_temp.deal('d_label')).kind, 'label', 'of kind label');
select throws_ok($$ select public.create_deal(p_kind => 'label', p_artist_id => pg_temp.id_of('jay')) $$,
  '22023', 'counterpart_required', 'a label deal names its label');
select throws_ok($$ select public.create_deal(p_kind => 'brand_partnership',
                                              p_counterpart_contact_id => pg_temp.id_of('manager')) $$,
  'P0002', 'counterpart_not_found', 'the counterpart is an organization, not a person');
select throws_ok($$ select public.create_deal(p_kind => 'influence',
                                              p_counterpart_contact_id => pg_temp.id_of('brand')) $$,
  '22023', 'invalid_kind', 'only the three kinds exist');
reset role;

-- The business manager opens a brand deal, his own ----------------------------------------
select pg_temp.act_as(pg_temp.id_of('glen'));
select lives_ok($$ insert into ids select 'd_brand', public.create_deal(
  p_kind => 'brand_partnership', p_counterpart_contact_id => pg_temp.id_of('brand')) $$,
  'the business manager opens a brand deal with the brand alone');
select is((pg_temp.deal('d_brand')).assignee_person_id, pg_temp.id_of('glen_person'),
  'it is his own');
select is((select count(*)::integer from public.deals where id = pg_temp.id_of('d_label')), 1,
  'he reads the label deal given to him');
reset role;

-- Business does not open a deal; a music deal needs no counterpart ------------------------
select pg_temp.act_as(pg_temp.id_of('thibault'));
select throws_ok($$ select public.create_deal(p_kind => 'label',
                                              p_counterpart_contact_id => pg_temp.id_of('label')) $$,
  '42501', 'forbidden', 'business does not open a deal');
reset role;
select pg_temp.act_as(pg_temp.id_of('director'));
select lives_ok($$ insert into ids select 'd_music', public.create_deal(p_artist_id => pg_temp.id_of('jay')) $$,
  'a music deal is still opened without a counterpart');
reset role;

-- A contact named by a deal is kept -------------------------------------------------------
select throws_ok($$ delete from public.network_contacts where id = pg_temp.id_of('label') $$,
  '23503', null, 'a label still named by a deal is not deleted');
select throws_ok($$ insert into public.deals (organization_id, kind, artist_id)
                    values (pg_temp.id_of('org'), 'label', pg_temp.id_of('jay')) $$,
  '23514', null, 'the table itself refuses a label deal without its label');

select * from finish();
rollback;
