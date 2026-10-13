-- MKT-C2-07 (…20261013100301): an item of a series may have its own
-- responsible (a member), concept and reference; a series is followed
-- grouped (one decision) or decomposed (one per item), which the next
-- submission follows. Run with `supabase test db`.
begin;
select plan(7);

-- Fixtures ------------------------------------------------------------------
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
insert into ids values
  ('director', pg_temp.new_user('director-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('owner', pg_temp.new_user('owner-' || (select v from vars where k = 'tag') || '@pds.test')),
  ('da', pg_temp.new_user('da-' || (select v from vars where k = 'tag') || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager'),
               ('da', 'creative_director')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id where name in ('director', 'owner', 'da');
create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
create function pg_temp.org() returns uuid language sql as $$ select id from ids where name = 'org' $$;
create function pg_temp.prj() returns uuid language sql as $$ select id from ids where name = 'project' $$;
grant execute on function pg_temp.id_of(text), pg_temp.org(), pg_temp.prj() to authenticated;

select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select 'project', public.create_project(pg_temp.org(),
  'SR ' || (select v from vars where k = 'tag'), 'content');
insert into ids select 'a1', public.transmit_project(pg_temp.prj(), pg_temp.id_of('owner_person'));
reset role;
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(pg_temp.id_of('a1'), 'accepted');
reset role;
with x as (insert into public.levers (organization_id, project_id, label, family, state)
           values (pg_temp.org(), pg_temp.prj(), 'Création', 'creation_content', 'selected') returning id)
insert into ids select 'lever', id from x;
with x as (insert into public.strategy_deliverables (organization_id, project_id, lever_id, title, quantity)
           values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('lever'), 'Capsules TikTok', 5) returning id)
insert into ids select 'sd_caps', id from x;
insert into ids select 'caps', d.id from public.design_deliverables d
 where d.strategy_deliverable_id = pg_temp.id_of('sd_caps');
update public.project_stages s set state = 'validated'
  from public.stage_definitions d
 where d.id = s.stage_definition_id and s.project_id = pg_temp.prj()
   and d.key in ('framing', 'launch_strategy');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.start_design(pg_temp.prj());
with s as (insert into public.design_sheets (organization_id, project_id, design_deliverable_id, kind, title)
           values (pg_temp.org(), pg_temp.prj(), pg_temp.id_of('caps'), 'series', 'Capsules') returning id)
insert into ids select 'series', id from s;
with i as (insert into public.design_sheet_items (organization_id, project_id, sheet_id, number, title)
           select pg_temp.org(), pg_temp.prj(), pg_temp.id_of('series'), n, 'Capsule ' || n
             from generate_series(1, 2) n returning id, number)
insert into ids select 'item' || number, id from i;

-- Items as contents of their own ----------------------------------------------------
select lives_ok($$
  update public.design_sheet_items
     set responsible_person_id = pg_temp.id_of('da_person'), concept = 'Plan-séquence en studio',
         reference_url = 'https://www.tiktok.com/@x/video/1'
   where id = pg_temp.id_of('item1')
$$, 'an item gets its own responsible, concept and reference');
select throws_ok($$
  update public.design_sheet_items set responsible_person_id = gen_random_uuid()
   where id = pg_temp.id_of('item2')
$$, null, null, 'its responsible is a member of the organisation');
select throws_ok($$
  update public.design_sheet_items set reference_url = 'http://insecure' where id = pg_temp.id_of('item2')
$$, '23514', null, 'its reference is an https link');

-- Grouped or decomposed -----------------------------------------------------------------
select throws_ok($$ update public.design_sheets set tracking = 'by_mood' where id = pg_temp.id_of('series') $$,
  '23514', null, 'a series is followed grouped or decomposed');
update public.design_sheets set tracking = 'global' where id = pg_temp.id_of('series');
select public.assign_design_responsible(pg_temp.prj(), 'sheet', pg_temp.id_of('series'), pg_temp.id_of('da_person'));
select public.set_design_validators(pg_temp.prj(), 'sheet', pg_temp.id_of('series'),
                                    array[pg_temp.id_of('director_person')]);
insert into ids select 'v1', public.submit_design_sheet(pg_temp.id_of('series'));
select is((select mode from public.design_submissions where id = pg_temp.id_of('v1')), 'global',
          'grouped: one decision for the whole series');
select is((select snapshot -> 'items' -> 0 ->> 'concept' from public.design_submissions where id = pg_temp.id_of('v1')),
          'Plan-séquence en studio', 'the frozen version keeps each item''s concept');
reset role;
-- The pending version is decided, then the series is decomposed.
update public.design_submissions set status = 'approved', closed_at = now() where id = pg_temp.id_of('v1');
select pg_temp.act_as(pg_temp.id_of('owner'));
update public.design_sheets set tracking = 'per_item' where id = pg_temp.id_of('series');
insert into ids select 'v2', public.submit_design_sheet(pg_temp.id_of('series'));
select is((select mode from public.design_submissions where id = pg_temp.id_of('v2')), 'per_section',
          'decomposed: one decision per content');

select * from finish();
rollback;
