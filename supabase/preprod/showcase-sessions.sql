-- Pre-production showcase of Sessions studio (Sacha, 27/11/2026: « rajoute
-- des données dans les sessions studio »): a session in every state of
-- lib/sessions/state.ts — à venir (with and without hours, without a date
-- yet, without a title), en cours today, compte rendu à compléter, terminée
-- with its report, annulée — with their studios and engineers of the Réseau,
-- attendees (members and contacts), artists, projects, titles and links to
-- the rushes. Also writes the report of the earlier sessions of « Néons » and
-- « Velours », so that « À compléter » keeps only a few.
-- Played after the other showcases by scripts/preprod-reset.sh, or alone:
--
--   psql "$PREPROD_DB_URL" -q -v ON_ERROR_STOP=1 -f supabase/preprod/showcase-sessions.sql
--
-- Locally (Docker):
--   docker exec -i supabase_db_PDS_OS psql -U postgres -q -v ON_ERROR_STOP=1 \
--     < supabase/preprod/showcase-sessions.sql
--
-- Adds only, played once (guard below). NEVER on production. Everything is
-- written as the person who would do it (Lina, Tom: project managers, who
-- hold manage_sessions), through RLS, like saveStudioSession and
-- saveSessionReport (lib/sessions/actions.ts). Dates are relative to today.

\set ON_ERROR_STOP on
select exists (
  select 1 from public.master_sessions s
    join public.organizations o on o.id = s.organization_id
   where o.slug = 'pds' and s.notes = 'Prises voix lead et chœurs du refrain.'
) as already \gset
\if :already
  \echo 'Jeu Sessions studio déjà présent : rien à faire.'
  \quit
\endif

begin;

create function pg_temp.act_as(p_email text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub',
    (select id from auth.users where email = p_email), 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create temp table k (name text primary key, id uuid) on commit drop;
grant all on k to authenticated;
insert into k select 'org', id from public.organizations where slug = 'pds';
insert into k select distinct on (u.email) 'm:' || u.email, ac.person_id
  from auth.users u join public.accounts ac on ac.id = u.id
 where u.email like '%@preprod.pds';
create function pg_temp.k(p text) returns uuid language sql as $$
  select id from k where name = p $$;
grant execute on function pg_temp.k(text) to authenticated;

-- A Réseau contact, an artist, a project, a title, by name (the earliest).
create function pg_temp.contact(p_name text) returns uuid language sql as $$
  select id from public.network_contacts
   where organization_id = pg_temp.k('org') and name = p_name and archived_at is null
   order by created_at limit 1 $$;
create function pg_temp.artist(p_name text) returns uuid language sql as $$
  select id from public.artists
   where organization_id = pg_temp.k('org') and name = p_name
   order by created_at limit 1 $$;
create function pg_temp.project(p_title text) returns uuid language sql as $$
  select id from public.projects
   where organization_id = pg_temp.k('org') and title = p_title and archived_at is null
   order by created_at limit 1 $$;
-- A title, the one tied to the project of the same name when there are two.
create function pg_temp.title(p_title text) returns uuid language sql as $$
  select m.id from public.masters m
   where m.organization_id = pg_temp.k('org') and m.title = p_title and m.archived_at is null
   order by exists (select 1 from public.project_masters pm
                      join public.projects p on p.id = pm.project_id
                     where pm.master_id = m.id and p.title = p_title) desc,
            m.created_at
   limit 1 $$;
grant execute on function pg_temp.contact(text), pg_temp.artist(text),
  pg_temp.project(text), pg_temp.title(text) to authenticated;

-- One session as « Nouvelle session » saves it: the row (planned), its
-- titles, then its artists, projects, attendees and links. The engineer is
-- a Réseau contact when p_engineer_contact names one.
create function pg_temp.session(
  p_kind text, p_date date, p_start time, p_end time, p_studio text,
  p_engineer text, p_engineer_contact text, p_notes text,
  p_titles text[], p_projects text[], p_artists text[],
  p_members text[], p_contacts text[], p_links jsonb default '[]'
) returns uuid language plpgsql as $$
declare v_id uuid; v_engineer uuid := pg_temp.contact(p_engineer_contact);
begin
  insert into public.master_sessions (organization_id, kind, session_date, starts_at, ends_at,
    studio, engineer, engineer_contact_id, notes, status)
  values (pg_temp.k('org'), p_kind, p_date, p_start, p_end, p_studio,
    coalesce(p_engineer, p_engineer_contact), v_engineer, p_notes, 'planned')
  returning id into v_id;
  insert into public.master_session_titles (session_id, master_id, organization_id)
  select distinct v_id, pg_temp.title(t), pg_temp.k('org')
    from unnest(p_titles) t where pg_temp.title(t) is not null;
  insert into public.master_session_projects (session_id, project_id, organization_id)
  select distinct v_id, pg_temp.project(p), pg_temp.k('org')
    from unnest(p_projects) p where pg_temp.project(p) is not null;
  insert into public.master_session_artists (session_id, artist_id, organization_id)
  select distinct v_id, pg_temp.artist(a), pg_temp.k('org')
    from unnest(p_artists) a where pg_temp.artist(a) is not null;
  insert into public.master_session_attendees (session_id, organization_id, person_id)
  select distinct v_id, pg_temp.k('org'), pg_temp.k('m:' || e)
    from unnest(p_members) e where pg_temp.k('m:' || e) is not null;
  insert into public.master_session_attendees (session_id, organization_id, contact_id)
  select distinct v_id, pg_temp.k('org'), pg_temp.contact(c)
    from unnest(p_contacts) c where pg_temp.contact(c) is not null;
  insert into public.master_session_links (session_id, organization_id, label, url)
  select v_id, pg_temp.k('org'), l ->> 'label', l ->> 'url' from jsonb_array_elements(p_links) l;
  return v_id;
end $$;
grant execute on function pg_temp.session(text, date, time, time, text, text, text, text,
  text[], text[], text[], text[], text[], jsonb) to authenticated;

-- « Rédiger le compte rendu »: written, the session is Terminée.
create function pg_temp.report(p_id uuid, p_notes text, p_takeaways text, p_next text)
returns void language sql as $$
  update public.master_sessions
     set report_notes = p_notes, report_takeaways = p_takeaways,
         report_next_step = p_next, status = 'done'
   where id = p_id and status <> 'cancelled' $$;
grant execute on function pg_temp.report(uuid, text, text, text) to authenticated;

-- Lina: her projects' sessions -------------------------------------------------
select pg_temp.act_as('lina.haddad@preprod.pds');

-- À venir, with hours.
select pg_temp.session('recording', current_date + 3, '14:00', '20:00', 'Studio Ressac',
  null, 'Bastien Coll', 'Prises voix lead et chœurs du refrain.',
  array['Minuit pile'], array['Minuit pile'], array['Mona Lys'],
  array['lina.haddad@preprod.pds', 'nadia.benali@preprod.pds'],
  array['Mona Lys', 'Sami Kader']);
select pg_temp.session('mixing', current_date + 6, '10:00', '18:00', 'Studio Ressac',
  null, 'Karim Haddou', 'Mix V1 : garder la voix devant, basse plus ronde que la maquette.',
  array['Mirage'], array['Mirage'], array['Zéphyr Vega'],
  array['lina.haddad@preprod.pds'], array['Karim Haddou']);
-- À venir, without a title: a writing session for the collective.
select pg_temp.session('other', current_date + 14, '11:00', '17:00', 'Studio Ressac',
  null, null, 'Session d''écriture : trouver le refrain du titre 3.',
  array[]::text[], array['Assurance 30'], array['Ysolde Marnay', 'Elio Danvers'],
  array['lina.haddad@preprod.pds'], array['Ysolde Marnay', 'Elio Danvers', 'Nilo Sarrat']);
-- En cours: today, the whole day (no hours).
select pg_temp.session('mastering', current_date, null, null, 'Studio Pigalle',
  'Hugo Lemaire', null, 'Master final et version instrumentale.',
  array['Ciel bas'], array['Ciel bas'], array['Sélène Vega'],
  array['lina.haddad@preprod.pds'], array[]::text[]);
-- Compte rendu à compléter: held two days ago, rushes already linked.
select pg_temp.session('recording', current_date - 2, '13:00', '21:00', 'Studio Ressac',
  null, 'Bastien Coll', 'Prises voix du deuxième couplet et ad-libs.',
  array['Néons'], array['Néons'], array['Mona Lys'],
  array['lina.haddad@preprod.pds', 'nadia.benali@preprod.pds'],
  array['Mona Lys', 'Inès Robin'],
  '[{"label": "Rushs voix (Drive)", "url": "https://drive.google.com/drive/folders/neons-rushs-voix"}]');
-- Terminées, with their report.
select pg_temp.report(pg_temp.session('recording', current_date - 12, '12:00', '20:00',
    'Studio Ressac', null, 'Karim Haddou', 'Prises guitares et voix témoin.',
    array['Velours'], array['Velours'], array['Mona Lys'],
    array['lina.haddad@preprod.pds'], array['Mona Lys', 'Inès Robin', 'Sami Kader'],
    '[{"label": "Pistes séparées (WeTransfer)", "url": "https://wetransfer.com/downloads/velours-pistes"},
      {"label": "Photos de la session", "url": "https://drive.google.com/drive/folders/velours-photos"}]'),
  'Huit heures de prises : trois guitares acoustiques, une électrique, la voix témoin. Inès a proposé une ligne de violoncelle sur le pont, enregistrée en deux prises.',
  'La prise 4 de la voix témoin est la référence pour le mix. Le violoncelle reste, à valider avec Mona.',
  'Envoyer les pistes à Karim pour le mix V1 avant vendredi.');
select pg_temp.report(pg_temp.session('mixing', current_date - 8, '10:00', '19:00',
    'Studio Pigalle', 'Hugo Lemaire', null, 'Mix V1.',
    array['Aube'], array['Aube'], array['Mona Lys'],
    array['lina.haddad@preprod.pds', 'nadia.benali@preprod.pds'], array['Mona Lys'],
    '[{"label": "Bounce mix V1", "url": "https://drive.google.com/file/d/aube-mix-v1"}]'),
  'Mix V1 bouclé dans la journée. Mona a écouté en fin de session et demande plus d''air sur l''intro.',
  'Intro plus aérée, batterie un peu en retrait au deuxième refrain.',
  'Hugo envoie la V2 lundi ; écoute avec Mona mardi.');
select pg_temp.report(pg_temp.session('production', current_date - 20, '14:00', '22:00',
    'Studio Ressac', null, 'Bastien Coll', 'Production de l''instru avec Nilo.',
    array['Marée haute'], array['Assurance 30'], array['Ysolde Marnay'],
    array['lina.haddad@preprod.pds'], array['Ysolde Marnay', 'Nilo Sarrat']),
  'Instru produite de zéro à partir du sample de piano d''Ysolde. Deux pistes de structure testées, la version courte garde le mieux l''énergie.',
  'Version courte (2 min 40). Le sample est à déclarer : vérifier ses droits.',
  'Nilo nettoie les stems ; Lina lance la question du sample au Juridique.');
-- Annulée.
select pg_temp.session('recording', current_date + 1, '15:00', '19:00', 'Studio Ressac',
  null, 'Karim Haddou', 'Annulée : Mona Lys est malade, séance à recaler.',
  array['Ciel ouvert'], array['Ciel ouvert'], array['Mona Lys'],
  array['lina.haddad@preprod.pds'], array['Mona Lys']);
update public.master_sessions set status = 'cancelled'
 where organization_id = pg_temp.k('org')
   and notes = 'Annulée : Mona Lys est malade, séance à recaler.';

-- The reports of the earlier sessions of « Néons » and « Velours ».
select pg_temp.report(s.id,
  case s.kind
    when 'recording' then 'Prises voix et guitares bouclées. Bonne énergie, Mona à l''aise sur le refrain.'
    when 'mixing' then 'Mix validé en fin de séance après deux allers-retours sur la voix.'
    else 'Master livré en WAV 24 bits et en MP3 pour les écoutes.' end,
  case s.kind
    when 'recording' then 'Garder la prise 3 du refrain.'
    when 'mixing' then 'Voix légèrement plus forte que la V1.'
    else 'Niveau à -9 LUFS, validé par Mona.' end,
  case s.kind
    when 'recording' then 'Passer au mix.'
    when 'mixing' then 'Envoyer au mastering.'
    else 'Déposer le master final dans le Catalogue.' end)
  from public.master_sessions s
 where s.organization_id = pg_temp.k('org') and s.report_notes is null
   and s.session_date < current_date - 20
   and exists (select 1 from public.master_session_titles t
                 join public.masters m on m.id = t.master_id
                where t.session_id = s.id and m.title in ('Néons', 'Velours'));

-- The earlier sessions, made from a title without hours nor artists: their
-- hours by kind, the artists of their titles, Lina there (the table shows
-- one fact a column, Sacha 27/11/2026).
update public.master_sessions s
   set starts_at = case s.kind when 'recording' then time '13:00'
                               when 'mixing' then time '10:00' else time '14:00' end,
       ends_at = case s.kind when 'recording' then time '21:00'
                             when 'mixing' then time '18:00' else time '17:00' end
 where s.organization_id = pg_temp.k('org') and s.starts_at is null and s.ends_at is null
   and s.session_date is not null and s.session_date < current_date - 20;
insert into public.master_session_artists (session_id, artist_id, organization_id)
select distinct s.id, ma.artist_id, s.organization_id
  from public.master_sessions s
  join public.master_session_titles t on t.session_id = s.id
  join public.master_artists ma on ma.master_id = t.master_id
 where s.organization_id = pg_temp.k('org') and s.session_date < current_date - 20
   and not exists (select 1 from public.master_session_artists x where x.session_id = s.id);
insert into public.master_session_attendees (session_id, organization_id, person_id)
select s.id, s.organization_id, pg_temp.k('m:lina.haddad@preprod.pds')
  from public.master_sessions s
 where s.organization_id = pg_temp.k('org') and s.session_date < current_date - 20
   and not exists (select 1 from public.master_session_attendees x where x.session_id = s.id);

reset role;

-- Tom: sessions without a project ---------------------------------------------
select pg_temp.act_as('tom.mercier@preprod.pds');
select pg_temp.session('production', current_date + 10, '15:00', '21:00', 'Studio Ferber',
  null, null, 'Production avec Nilo à partir des maquettes téléphone de Lila.',
  array['Sable chaud'], array[]::text[], array['Lila Vega'],
  array['tom.mercier@preprod.pds'], array['Nilo Sarrat']);
-- À venir, the date still to fix.
select pg_temp.session('recording', null, null, null, null, null, null,
  'Date à caler avec son manager.',
  array['Rive gauche'], array[]::text[], array['Rivo Blanc'],
  array['tom.mercier@preprod.pds'], array[]::text[]);
select pg_temp.session('mixing', current_date - 5, '11:00', '18:00', 'Motorbass',
  'Jeanne Roux', null, 'Mix V2 après les retours du label.',
  array['Feu de camp'], array[]::text[], array['Mako Rouge'],
  array['tom.mercier@preprod.pds'], array[]::text[],
  '[{"label": "Bounce mix V2", "url": "https://www.dropbox.com/s/feu-de-camp-mix-v2"}]');
reset role;

commit;
