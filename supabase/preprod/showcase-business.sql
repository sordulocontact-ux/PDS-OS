-- Pre-production showcase of the Business module (BIZ 1-10, BUD 1-4; Sacha
-- 12/11/2026: « des nouveaux rôles pour tester les nouvelles pages »): the two
-- business positions in the bar « Voir comme », and enough deals, terms, an
-- artist's envelope, artist spends, a private contact and a deal's call to
-- see Deals, a deal's page, Dépenses and the artist's « Business » tab full.
-- Played after supabase/preprod/showcase.sql by scripts/preprod-reset.sh, or
-- alone on a base already in use:
--
--   { printf "\\set pw '%s'\n" "$PREPROD_PASSWORD"; cat supabase/preprod/showcase-business.sql; } \
--     | psql "$PREPROD_DB_URL" -q -v ON_ERROR_STOP=1
--
-- Adds only, played once (guard below). NEVER on production (accounts
-- @preprod.pds only, as the seed). Every deal, term, envelope and contact
-- goes through the app's own functions, as the person who would act.

\set ON_ERROR_STOP on
select exists (select 1 from auth.users where email = 'malik.durand@preprod.pds') as already \gset
\if :already
  \echo 'Jeu Business déjà présent : rien à faire.'
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
insert into k select 'a:' || name, id from public.artists
 where organization_id = pg_temp.k('org');
insert into k select distinct on (title) 'p:' || title, id from public.projects
 order by title, created_at;

-- Team: the two business positions (lib/preprod/accounts.ts) ------------------
create temp table new_accounts (email text, first_name text, last_name text, role text);
insert into new_accounts values
  ('malik.durand@preprod.pds', 'Malik', 'Durand', 'business_manager'),
  ('elise.fabre@preprod.pds',  'Élise', 'Fabre',  'business');

insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new)
select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       a.email, extensions.crypt(:'pw', extensions.gen_salt('bf')), now(),
       '{"provider": "email", "providers": ["email"]}',
       jsonb_build_object('first_name', a.first_name, 'last_name', a.last_name),
       now(), now(), '', '', '', ''
  from new_accounts a;
insert into auth.identities (id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
  from auth.users u join new_accounts a on a.email = u.email;
update public.memberships m set status = 'approved', role = a.role
  from new_accounts a join auth.users u on u.email = a.email
  join public.accounts ac on ac.id = u.id
 where m.person_id = ac.person_id;
insert into k select split_part(u.email, '@', 1), ac.person_id
  from auth.users u join public.accounts ac on ac.id = u.id
 where u.email like '%@preprod.pds';

-- Deals: created and assigned by Claire, worked by the negotiator -------------
select pg_temp.as_user('claire.morel@preprod.pds');
insert into k values
  ('d:mona',  public.create_deal(null, pg_temp.k('p:Minuit pile'), pg_temp.k('a:Mona Lys'), pg_temp.k('malik.durand'),
                'music', 'Relancer Camille sur l''avance', current_date - 2)),
  ('d:lila',  public.create_deal(null, null, pg_temp.k('a:Lila Vega'), pg_temp.k('malik.durand'),
                'music', 'Premier call avec son manager', current_date + 3)),
  ('d:nahel', public.create_deal(null, null, pg_temp.k('a:Nahel Nuit'), pg_temp.k('elise.fabre'),
                'music', null, null)),
  ('d:mako',  public.create_deal(null, null, pg_temp.k('a:Mako Rouge'), pg_temp.k('malik.durand'),
                'music', null, null)),
  ('d:rivo',  public.create_deal(null, null, pg_temp.k('a:Rivo Blanc'), pg_temp.k('elise.fabre'),
                'music', null, null));

-- Mona Lys, Minuit pile: in negotiation, terms in every state, overdue follow-up.
select pg_temp.as_user('malik.durand@preprod.pds');
select public.set_deal_stage(pg_temp.k('d:mona'), 'negotiation', 'Premier call fait avec Camille.');
select public.set_deal_term(pg_temp.k('d:mona'), 'master_split', '{"units": 500000}', 'pds_proposal');
select public.set_deal_term(pg_temp.k('d:mona'), 'royalties', '{"units": 180000}', 'counter_proposal');
select public.set_deal_term(pg_temp.k('d:mona'), 'advance',
  '{"mode": "advance", "cents": 1500000}', 'confirmed');
select public.set_deal_term(pg_temp.k('d:mona'), 'territories', '{"text": "Monde"}', 'confirmed');
select public.set_deal_term(pg_temp.k('d:mona'), 'exclusivity',
  '{"yes": true, "detail": "Sur la durée du projet"}', 'pds_proposal');

-- Lila Vega: a call planned with her manager (a deal's call, no project).
select public.set_deal_stage(pg_temp.k('d:lila'), 'call_planned', null);
insert into public.calls (organization_id, project_id, deal_id, title, occurred_at, ends_at,
  status, consent, agenda, created_by)
values (pg_temp.k('org'), null, pg_temp.k('d:lila'), 'Call — Lila Vega, premières conditions',
        date_trunc('day', now()) + interval '3 days 11 hours',
        date_trunc('day', now()) + interval '3 days 11 hours 30 minutes',
        'draft', 'pending', '["Où en est le deal", "Avance", "Partage du master"]',
        pg_temp.k('malik.durand'));

-- Nahel Nuit: Élise proposes an accord de principe, Claire has to decide it.
select pg_temp.as_user('elise.fabre@preprod.pds');
select public.set_deal_stage(pg_temp.k('d:nahel'), 'negotiation', null);
select public.set_deal_term(pg_temp.k('d:nahel'), 'master_split', '{"units": 400000}', 'confirmed');
select public.set_deal_term(pg_temp.k('d:nahel'), 'royalties', '{"units": 200000}', 'confirmed');
select public.set_deal_term(pg_temp.k('d:nahel'), 'advance', '{"mode": "fee", "cents": 800000}', 'confirmed');
select public.set_deal_stage(pg_temp.k('d:nahel'), 'agreement', 'Accord oral le 10/11.');

-- Mako Rouge: signed (Claire validates the accord, then contracting, signed).
select pg_temp.as_user('malik.durand@preprod.pds');
select public.set_deal_term(pg_temp.k('d:mako'), 'master_split', '{"units": 500000}', 'confirmed');
select public.set_deal_term(pg_temp.k('d:mako'), 'advance', '{"mode": "advance", "cents": 1000000}', 'confirmed');
select pg_temp.as_user('claire.morel@preprod.pds');
select public.set_deal_stage(pg_temp.k('d:mako'), 'agreement', null);
select public.set_deal_stage(pg_temp.k('d:mako'), 'contracting', null);
select public.set_deal_stage(pg_temp.k('d:mako'), 'signed', 'Contrat signé par les deux parties.');

-- Rivo Blanc: abandoned, with its reason.
select pg_temp.as_user('elise.fabre@preprod.pds');
select public.abandon_deal(pg_temp.k('d:rivo'), 'L''artiste a signé ailleurs.');

-- Contacts: a private one (Malik's), a shared one, both on a deal -------------
select pg_temp.as_user('malik.durand@preprod.pds');
insert into public.network_contacts (organization_id, kind, name, roles, relations, email, phone, city, notes)
values (pg_temp.k('org'), 'person', 'Yasmine Ould', '{manager}', '{client}',
        'yasmine@ould-management.fr', '06 11 42 87 30', 'Marseille',
        'Manageuse de Lila Vega : ne passer que par elle.');
insert into k select 'c:yasmine', id from public.network_contacts where name = 'Yasmine Ould';
select public.make_contact_private(pg_temp.k('c:yasmine'));
select public.link_deal_contact(pg_temp.k('d:lila'), pg_temp.k('c:yasmine'));
select public.link_deal_contact(pg_temp.k('d:mona'),
  (select id from public.network_contacts where name = 'Camille Petit'));

-- Budget: Mona Lys's envelope (Claire) and two direct spends (Lina) ------------
select pg_temp.as_user('claire.morel@preprod.pds');
select public.open_artist_budget(pg_temp.k('a:Mona Lys'), 4000000,
  date_trunc('year', current_date)::date, null,
  '{"studio": 1500000, "photo_video": 1000000, "advertising": 1000000}');
select pg_temp.as_user('lina.haddad@preprod.pds');
insert into public.budget_lines (organization_id, artist_id, label, amount_cents, family, status)
values (pg_temp.k('org'), pg_temp.k('a:Mona Lys'), 'Coaching vocal (4 séances)', 60000, 'coaching', 'paid'),
       (pg_temp.k('org'), pg_temp.k('a:Mona Lys'), 'Train Paris–Lyon, showcase', 18000, 'transport', 'invoiced');

commit;
\o
\echo 'Jeu Business ajouté.'
