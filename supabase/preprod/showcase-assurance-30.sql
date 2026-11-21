-- Showcase of « Assurance 30 », the collective project Ibé created live on
-- 18/11/2026 (ticket « PDSMIC : retours d'Ibé du 18/11 », lot L5): PDS as the
-- main artist, guests, 1 000 000 streams in 3 months on Spotify and Deezer,
-- 10 000 €, shoot on 5 December 2026. It replays that case so the recap of the
-- titles shows every state at once:
--
--   Tavio Marlan   « À contacter »  (a note, nothing else)
--   Selma Quirin   « Contacté »     (her manager is the participation's interlocutor)
--   Joss Barelle   « D'accord »     (deal with the business manager, call planned;
--                                    his manager is the artist's primary contact)
--   Elio Danvers   « D'accord »     (deal: accord validated, master split 50 %;
--                                    title on a Catalogue master with its beatmaker,
--                                    « Sortie oui »)
--
-- Played alone, on a local base or the pre-production (accounts of the team
-- below; the business manager is Malik Durand in pre-production, else Glen):
--
--   docker exec -i supabase_db_PDS_OS psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     < supabase/preprod/showcase-assurance-30.sql
--
-- Adds only, in one transaction; if « Assurance 30 » already exists in the
-- organization it does nothing. Every gesture goes through the app's own
-- functions, as the person who would act (Claire creates, Lina runs and
-- accepts, the business manager negotiates, Claire validates the accord);
-- artists, Network contacts and the Catalogue contributors are plain inserts,
-- as the other showcases. NEVER on production. The plan (Master, Juridique) is
-- not launched: the project is accepted by Lina, its plan left to be launched.

\set ON_ERROR_STOP on
select exists (select 1 from public.projects p
                 join public.organizations o on o.id = p.organization_id
                where o.slug = 'pds' and p.title = 'Assurance 30') as already \gset
\if :already
  \echo 'Assurance 30 existe déjà : rien à faire.'
  \quit
\endif

\o /dev/null
begin;

create temp table k (name text primary key, id uuid) on commit drop;
create function pg_temp.k(p text) returns uuid language sql as $$
  select id from k where name = p $$;
create function pg_temp.as_user(p_email text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub',
    (select id from auth.users where email = p_email), 'role', 'authenticated')::text, true);
end $$;

insert into k select 'org', id from public.organizations where slug = 'pds';
insert into k select 'claire', person_id from public.accounts
 where id = (select id from auth.users where email = 'claire.morel@preprod.pds');
insert into k select 'lina', person_id from public.accounts
 where id = (select id from auth.users where email = 'lina.haddad@preprod.pds');
-- The negotiator: Malik Durand in pre-production, Glen on a local base.
insert into k select 'bm', person_id from public.accounts
 where id = (select id from auth.users
              where email in ('malik.durand@preprod.pds', 'glen@pds.test')
              order by (email = 'malik.durand@preprod.pds') desc limit 1);
create temp table who (email text);
insert into who select email from auth.users
 where email in ('malik.durand@preprod.pds', 'glen@pds.test')
 order by (email = 'malik.durand@preprod.pds') desc limit 1;

-- The invented guests: the Catalogue refuses a homonym (artist_name_taken), so
-- an artist already there under that name is reused, never duplicated.
select pg_temp.as_user('claire.morel@preprod.pds');
insert into public.artists (organization_id, name, relation)
select pg_temp.k('org'), v.name, 'collaboration'
  from (values ('Tavio Marlan'), ('Selma Quirin'), ('Joss Barelle'), ('Elio Danvers')) v (name)
 where not exists (select 1 from public.artists a
                    where a.organization_id = pg_temp.k('org') and a.archived_at is null
                      and public.artist_name_key(a.name) = public.artist_name_key(v.name));
insert into k select 'a:' || a.name, a.id from public.artists a
 where a.organization_id = pg_temp.k('org') and a.archived_at is null
   and a.name in ('Tavio Marlan', 'Selma Quirin', 'Joss Barelle', 'Elio Danvers');
insert into k select 'a:pds', id from public.artists
 where organization_id = pg_temp.k('org') and archived_at is null and name = 'PDS';

-- Network: each artist as a person (linked to the Catalogue), two managers,
-- a beatmaker (fictional phone numbers) ---------------------------------------
select pg_temp.as_user('lina.haddad@preprod.pds');
create temp table net (key text, name text, roles text[], relations text[], artist text,
  email text, phone text, city text, notes text);
insert into net values
  ('tavio', 'Tavio Marlan', '{artist}', '{}', 'Tavio Marlan', null, null, 'Nantes', null),
  ('selma', 'Selma Quirin', '{artist}', '{}', 'Selma Quirin', null, null, 'Lyon', null),
  ('joss',  'Joss Barelle', '{artist}', '{}', 'Joss Barelle', null, null, 'Lille', null),
  ('elio',  'Elio Danvers', '{artist}', '{}', 'Elio Danvers', null, null, 'Bordeaux', null),
  ('maud',  'Maud Terrien', '{manager}', '{client}', null, 'maud.terrien@management.test',
     '06 00 00 41 12', 'Lyon', 'Manageuse de Selma Quirin.'),
  ('roch',  'Roch Delmas', '{manager}', '{client}', null, 'roch.delmas@management.test',
     '06 00 00 73 58', 'Lille', 'Manager de Joss Barelle.'),
  ('nilo',  'Nilo Sarrat', '{beatmaker}', '{partner}', null, 'nilo.sarrat@beats.test',
     '06 00 00 29 64', 'Toulouse', 'Beatmaker : instru de « Assurance 30 ».');
insert into public.network_contacts (organization_id, kind, name, roles, relations, artist_id,
  email, phone, city, notes)
select pg_temp.k('org'), 'person', n.name, n.roles, n.relations,
       case when n.artist is not null then pg_temp.k('a:' || n.artist) end,
       n.email, n.phone, n.city, n.notes
  from net n
 where not exists (select 1 from public.network_contacts c
                    where c.organization_id = pg_temp.k('org') and c.name = n.name
                      and c.archived_at is null);
insert into k select 'c:' || n.key, c.id
  from net n join public.network_contacts c
    on c.organization_id = pg_temp.k('org') and c.name = n.name and c.archived_at is null;

-- Joss's manager, the artist's primary contact at the Catalogue.
select pg_temp.as_user('claire.morel@preprod.pds');
insert into public.artist_contacts (organization_id, artist_id, role, name, email, phone, is_primary)
select pg_temp.k('org'), pg_temp.k('a:Joss Barelle'), 'manager', 'Roch Delmas',
       'roch.delmas@management.test', '06 00 00 73 58', true
 where not exists (select 1 from public.artist_contacts
                    where artist_id = pg_temp.k('a:Joss Barelle') and role = 'manager');

-- The project: created by Claire, run by Lina ---------------------------------
select pg_temp.as_user('claire.morel@preprod.pds');
insert into k values ('p', public.create_collective_project(
  pg_temp.k('org'), 'Assurance 30', 'content', pg_temp.k('a:pds'), pg_temp.k('lina'),
  p_due_date => date '2026-12-05',
  p_budget_cents => 1000000,
  p_initial_context =>
    'Objectif : 1 000 000 de streams en 3 mois, sur Spotify et Deezer. Tournage le 5 décembre 2026. Budget : 10 000 €.',
  p_content_format_id => (select id from public.content_formats where name = 'PDS Mic' and archived_at is null),
  p_guest_artist_ids => array[pg_temp.k('a:Tavio Marlan'), pg_temp.k('a:Selma Quirin'),
                              pg_temp.k('a:Joss Barelle'), pg_temp.k('a:Elio Danvers')]));
insert into k select 'assignment', id from public.project_assignments
 where project_id = pg_temp.k('p');
select pg_temp.as_user('lina.haddad@preprod.pds');
select public.respond_to_assignment(pg_temp.k('assignment'), 'accepted');

insert into k select 'part:' || a.name, tp.id
  from public.title_participations tp join public.artists a on a.id = tp.artist_id
 where tp.project_id = pg_temp.k('p');
insert into k select 'title:' || a.name, tp.title_id
  from public.title_participations tp join public.artists a on a.id = tp.artist_id
 where tp.project_id = pg_temp.k('p');

-- Tavio: « À contacter », a note ------------------------------------------------
select public.set_title_participation_note(pg_temp.k('part:Tavio Marlan'),
  'Repéré sur TikTok, à contacter cette semaine avant la fin du tournage.');

-- Selma: « Contacté », her manager the interlocutor -------------------------------
select public.set_title_participation_status(pg_temp.k('part:Selma Quirin'), 'invited',
  'Message envoyé à son management.');
select public.set_title_participation_contact(pg_temp.k('part:Selma Quirin'), pg_temp.k('c:maud'));

-- Joss: « D'accord », a deal for the business manager, a call planned ------------
select public.set_title_participation_status(pg_temp.k('part:Joss Barelle'), 'invited');
select public.set_title_participation_status(pg_temp.k('part:Joss Barelle'), 'confirmed',
  'D''accord de principe au téléphone.');
insert into k values ('d:joss', public.create_deal(
  p_participation_id => pg_temp.k('part:Joss Barelle'), p_assignee_person_id => pg_temp.k('bm'),
  p_next_action => 'Confirmer le split avec son manager', p_next_action_on => current_date + 3));
create temp table slot as
  select starts_at, ends_at from public.negotiator_free_slots(pg_temp.k('bm')) order by starts_at limit 1;
insert into k values ('call:joss', public.plan_deal_negotiation_call(
  'Call · Joss Barelle · Assurance 30',
  (select starts_at from slot), (select ends_at from slot),
  p_deal_id => pg_temp.k('d:joss'),
  p_guests => '[{"email": "roch.delmas@management.test", "name": "Roch Delmas"}]'::jsonb,
  p_agenda => '[{"topic": "Split et crédits sur le titre", "minutes": 10}]'::jsonb));

-- Elio: « D'accord », title on a Catalogue master, accord validated, split 50 % --
select pg_temp.as_user('claire.morel@preprod.pds');
insert into k values ('m:elio', public.create_master(pg_temp.k('org'), 'Cap sur demain',
  jsonb_build_array(jsonb_build_object('artist_id', pg_temp.k('a:pds'), 'role', 'main'))));
select pg_temp.as_user('lina.haddad@preprod.pds');
select public.attach_master_to_project_title(pg_temp.k('title:Elio Danvers'), pg_temp.k('m:elio'));
select public.set_title_participation_status(pg_temp.k('part:Elio Danvers'), 'confirmed',
  'Partant dès le premier message.');
insert into k values ('d:elio', public.create_deal(
  p_participation_id => pg_temp.k('part:Elio Danvers'), p_assignee_person_id => pg_temp.k('bm')));
select pg_temp.as_user((select email from who));
select public.set_deal_stage(d.id, 'negotiation', 'Premier échange fait.')
  from public.deals d where d.id = pg_temp.k('d:elio') and d.stage <> 'negotiation';
select public.set_deal_term(pg_temp.k('d:elio'), 'master_split', '{"units": 500000}', 'confirmed');
select public.set_deal_stage(pg_temp.k('d:elio'), 'agreement', 'Accord sur 50 % du master.');
select pg_temp.as_user('claire.morel@preprod.pds');
select public.decide_deal_agreement(pg_temp.k('d:elio'), true);
-- Catalogue credit of the beatmaker (Network contact).
insert into public.master_contributors (organization_id, master_id, name, role, contact_id)
select pg_temp.k('org'), pg_temp.k('m:elio'), c.name, 'producer', c.id
  from public.network_contacts c where c.id = pg_temp.k('c:nilo');

-- « Sortie oui » on Elio's title -------------------------------------------------
select pg_temp.as_user('lina.haddad@preprod.pds');
select public.set_project_title_release(pg_temp.k('title:Elio Danvers'), true);

commit;
\o
\echo 'Assurance 30 créé.'
