-- Réseau: an artist's accounts (supabase/migrations/20261010008001), saved
-- from the Labo or the contact form. Run with `supabase test db`.
begin;
select plan(7);

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
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;

insert into ids values
  ('creative', pg_temp.new_user('creative-' || substr(md5(random()::text), 1, 8) || '@pds.test'));
insert into ids select 'org', id from public.organizations where slug = 'pds';
update public.memberships m set status = 'approved', role = 'creative_director'
 where m.person_id = (select person_id from public.accounts where id = pg_temp.id_of('creative'));

select pg_temp.act_as(pg_temp.id_of('creative'));

select lives_ok($$
  insert into public.network_contacts (organization_id, kind, name, roles, tiktok_handle,
                                       instagram_handle, spotify_artist_id, deezer_artist_id)
  values (pg_temp.id_of('org'), 'person', 'Theodora', array['artist', 'beatmaker'],
          'theodorabossladyy', 'theodorabosslady', '3PpJbrAbphauEun8Xf9tD2', 13820325)
$$, 'a writer of the network saves an artist with their accounts');
insert into ids select 'theodora', id from public.network_contacts
 where tiktok_handle = 'theodorabossladyy' order by created_at desc limit 1;

select lives_ok($$
  update public.network_contacts set instagram_handle = null, tiktok_handle = 'miss.kitoko'
   where id = pg_temp.id_of('theodora')
$$, 'the accounts are editable');

select throws_ok($$
  update public.network_contacts set tiktok_handle = '@miss kitoko' where id = pg_temp.id_of('theodora')
$$, '23514', null, 'a TikTok handle is a username, never free text');

select throws_ok($$
  update public.network_contacts set instagram_handle = 'https://instagram.com/x'
   where id = pg_temp.id_of('theodora')
$$, '23514', null, 'an Instagram handle is never a URL');

select throws_ok($$
  update public.network_contacts set spotify_artist_id = 'open.spotify.com/artist/x'
   where id = pg_temp.id_of('theodora')
$$, '23514', null, 'a Spotify id is the 22-character artist id');

select throws_ok($$
  update public.network_contacts set deezer_artist_id = 0 where id = pg_temp.id_of('theodora')
$$, '23514', null, 'a Deezer id is positive');

select is(
  (select tiktok_handle from public.network_contacts where id = pg_temp.id_of('theodora')),
  'miss.kitoko',
  'every member reads the accounts');

select * from finish();
rollback;
