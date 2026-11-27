-- Projet collectif, test de parcours du 26/11/2026 (20261126180101, M2, M3,
-- M6): at creation, a guest already credited on a master chosen gets their
-- participation on that title, no title without a name; each master chosen
-- credits the main artist at the head and its guests in featuring, without
-- a credit twice, a master also in a simple project left as it is; a
-- title's release is created dated by the project's due date, then keeps
-- its own date.
-- Run with `supabase test db`.
begin;
select plan(17);

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

insert into ids
select r.name, pg_temp.new_user(r.name || '-' || (select v from vars where k = 'tag') || '@pds.test')
  from (values ('director'), ('owner')) as r (name);
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = r.role
  from (values ('director', 'general_director'), ('owner', 'project_manager')) as r (name, role)
 where m.person_id = (select person_id from public.accounts
                       where id = (select id from ids where name = r.name));
insert into ids select name || '_person', a.person_id
  from ids join public.accounts a on a.id = ids.id
 where name in ('director', 'owner');

create function pg_temp.id_of(p text) returns uuid language sql as $$ select id from ids where name = p $$;
grant execute on function pg_temp.id_of(text) to authenticated;
create function pg_temp.tag() returns text language sql as $$ select v from vars where k = 'tag' $$;
grant execute on function pg_temp.tag() to authenticated;
-- A project's titles, « position:status:name-or-none » in order.
create function pg_temp.titles(p_project text) returns text[] language sql as $$
  select array_agg(t.position || ':' || t.status || ':' || coalesce(m.title, '∅') order by t.position)
    from public.project_titles t left join public.masters m on m.id = t.master_id
   where t.project_id = pg_temp.id_of(p_project) $$;
-- Its participations, « title position:artist:role:status » in order.
create function pg_temp.guests(p_project text) returns text[] language sql as $$
  select array_agg(t.position || ':' || ids.name || ':' || tp.role || ':' || tp.status
                   order by t.position, ids.name)
    from public.title_participations tp
    join public.project_titles t on t.id = tp.title_id
    join ids on ids.id = tp.artist_id
   where tp.project_id = pg_temp.id_of(p_project) $$;
-- A master's credits, « artist:role:position » in order.
create function pg_temp.credits(p_master text) returns text[] language sql as $$
  select array_agg(ids.name || ':' || ma.role || ':' || ma.position order by ma.position)
    from public.master_artists ma join ids on ids.id = ma.artist_id
   where ma.master_id = pg_temp.id_of(p_master) $$;

insert into public.artists (organization_id, name, relation)
select pg_temp.id_of('org'), v.label || ' ' || pg_temp.tag(), 'collaboration'
  from (values ('PDS'), ('Elio'), ('Lila'), ('Mona'), ('Zoe')) as v (label);
insert into ids
select lower(v.label), a.id
  from (values ('PDS'), ('Elio'), ('Lila'), ('Mona'), ('Zoe')) as v (label)
  join public.artists a on a.name = v.label || ' ' || pg_temp.tag();

-- Four masters of the Catalogue: Elio's own track (PDS not credited), one
-- already credited « PDS feat. Elio », Mona's single (in a simple project
-- too), Zoe's track where PDS is credited after Zoe, in featuring.
select pg_temp.act_as(pg_temp.id_of('director'));
insert into ids select v.name, public.create_master(pg_temp.id_of('org'), v.label || ' ' || pg_temp.tag(), v.credits)
  from (values
    ('m_echo', 'Echo', jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('elio'), 'role', 'main'))),
    ('m_neons', 'Neons', jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('pds'), 'role', 'main'),
                                            jsonb_build_object('artist_id', pg_temp.id_of('elio'), 'role', 'featuring'))),
    ('m_solo', 'Solo', jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('mona'), 'role', 'main'))),
    ('m_duo', 'Duo', jsonb_build_array(jsonb_build_object('artist_id', pg_temp.id_of('zoe'), 'role', 'main'),
                                        jsonb_build_object('artist_id', pg_temp.id_of('pds'), 'role', 'featuring')))
  ) as v (name, label, credits);
insert into ids select 'simple', public.create_project(pg_temp.id_of('org'), 'Single ' || pg_temp.tag(),
  'music_release', array[pg_temp.id_of('m_solo')], p_music_format => 'single',
  p_assignee_person_id => pg_temp.id_of('owner_person'));

-- The collective: the four masters, four guests (Lila credited on none).
insert into ids select 'c', public.create_collective_project(pg_temp.id_of('org'),
  'Compilation ' || pg_temp.tag(), 'music_release', pg_temp.id_of('pds'), pg_temp.id_of('owner_person'),
  p_master_ids => array[pg_temp.id_of('m_echo'), pg_temp.id_of('m_neons'), pg_temp.id_of('m_solo'),
                        pg_temp.id_of('m_duo')],
  p_due_date => date '2027-05-07', p_music_format => 'compilation',
  p_master_validator_person_id => pg_temp.id_of('owner_person'),
  p_guest_artist_ids => array[pg_temp.id_of('elio'), pg_temp.id_of('lila'), pg_temp.id_of('mona'),
                              pg_temp.id_of('zoe')]);
-- A content collective: no master, each guest on a title without a name.
insert into ids select 'mic', public.create_collective_project(pg_temp.id_of('org'),
  'Mic ' || pg_temp.tag(), 'content', pg_temp.id_of('pds'), pg_temp.id_of('owner_person'),
  p_guest_artist_ids => array[pg_temp.id_of('elio'), pg_temp.id_of('lila')]);
reset role;

-- M2: the guests' titles -------------------------------------------------------------
select is(pg_temp.titles('c'),
  array['1:active:Echo ' || pg_temp.tag(), '2:active:Neons ' || pg_temp.tag(),
        '3:active:Solo ' || pg_temp.tag(), '4:active:Duo ' || pg_temp.tag(), '5:planned:∅'],
  'the masters chosen are the titles; a title without a name only for the guest credited on none');
select is(pg_temp.guests('c'),
  array['1:elio:featuring:proposed', '2:elio:featuring:proposed', '3:mona:featuring:proposed',
        '4:zoe:featuring:proposed', '5:lila:featuring:proposed'],
  'a guest credited on a master chosen joins that title, on each one that credits them, still proposed');
select is((select count(*)::int from public.project_titles
            where project_id = pg_temp.id_of('c') and master_id is null),
  1, 'no title « à nommer » for Elio, Mona or Zoe');
select is(pg_temp.titles('mic'), array['1:planned:∅', '2:planned:∅'],
  'a content collective (no master chosen): each guest on a title without a name, as before');
select is(pg_temp.guests('mic'), array['1:elio:featuring:proposed', '2:lila:featuring:proposed'],
  'with their participation');

-- M3: the credits of the masters chosen ----------------------------------------------
select is(pg_temp.credits('m_echo'), array['pds:main:1', 'elio:featuring:2'],
  'the main artist added at the head, the guest credited « main » now in featuring: « PDS feat. Elio »');
select is(pg_temp.credits('m_neons'), array['pds:main:1', 'elio:featuring:2'],
  'credits already right stay as they are, none twice');
select is(pg_temp.credits('m_duo'), array['pds:main:1', 'zoe:featuring:2'],
  'the main artist credited after a guest moves to the head, in « main »');
select is(pg_temp.credits('m_solo'), array['mona:main:1'],
  'a master also in a simple project is left as it is (décision 10)');
select is((select count(*)::int from public.master_artists ma
            where ma.master_id in (pg_temp.id_of('m_echo'), pg_temp.id_of('m_neons'), pg_temp.id_of('m_duo'))),
  6, 'six credits in all: none twice');

-- After the creation, nothing more until a confirmation (credit_title_participations) ---------
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.respond_to_assignment(
  (select id from public.project_assignments where project_id = pg_temp.id_of('c')), 'accepted');
reset role;
select is(public.credit_title_participations(
            (select id from public.project_titles where project_id = pg_temp.id_of('c') and position = 1)),
  0, 'a proposed participation still writes no credit afterwards');

-- M6: a title's release dated by the due date ----------------------------------------
insert into public.project_plans (organization_id, project_id, launched_by)
values (pg_temp.id_of('org'), pg_temp.id_of('c'), pg_temp.id_of('owner_person'));
select is((select collective_release_mode from public.projects where id = pg_temp.id_of('c')),
  'singles', '« Sorties individuelles » by default');
select is((select array_agg(coalesce(planned_release_date::text, '∅') order by planned_release_date)
             from public.releases where project_id = pg_temp.id_of('c') and project_title_id is not null),
  array['2027-05-07', '2027-05-07', '2027-05-07', '2027-05-07'],
  'at the launch, each title''s release is dated by the project''s due date');
update public.releases set planned_release_date = date '2027-02-12'
 where project_title_id = (select id from public.project_titles where project_id = pg_temp.id_of('c') and position = 1);
update public.projects set due_date = date '2027-06-04' where id = pg_temp.id_of('c');
select is((select array_agg(planned_release_date::text order by planned_release_date)
             from public.releases where project_id = pg_temp.id_of('c') and project_title_id is not null),
  array['2027-02-12', '2027-05-07', '2027-05-07', '2027-05-07'],
  'then each keeps its own date: changed in « Sorties », kept when the due date moves');
select pg_temp.act_as(pg_temp.id_of('owner'));
select isnt(public.ensure_project_title_master(
              (select id from public.project_titles where project_id = pg_temp.id_of('c') and position = 5)),
  null, 'Lila''s title gets its first audio after the launch');
reset role;
select is((select planned_release_date from public.releases
            where project_title_id = (select id from public.project_titles
                                       where project_id = pg_temp.id_of('c') and position = 5)),
  date '2027-06-04', 'its release, created now, takes the due date of now');
select pg_temp.act_as(pg_temp.id_of('owner'));
select public.set_collective_release_mode(pg_temp.id_of('c'), 'compilation');
select public.set_collective_release_mode(pg_temp.id_of('c'), 'singles');
reset role;
select is((select planned_release_date from public.releases
            where project_title_id = (select id from public.project_titles
                                       where project_id = pg_temp.id_of('c') and position = 1)
              and archived_at is null),
  date '2027-02-12', 'a title''s release brought back keeps its date');

select * from finish();
rollback;
