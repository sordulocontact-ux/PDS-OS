-- The creator's private link for the whole collaboration
-- (supabase/migrations/20261019060201_influence_creator_link.sql): content,
-- publication, invoice by token, without account; nothing else is reachable.
-- Simulation only, rolled back. Run with `supabase test db`.
begin;
select plan(11);

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated, anon;
create function pg_temp.id_of(p_name text) returns uuid language sql as $$
  select id from ids where name = p_name
$$;

insert into ids select 'org', id from public.organizations where slug = 'pds';
insert into ids select 'owner', p.id from public.people p
  join public.memberships m on m.person_id = p.id and m.status = 'approved' limit 1;
insert into public.projects (organization_id, title, type, owner_person_id)
values (pg_temp.id_of('org'), 'Néons lien créatrice (simulation)', 'content', pg_temp.id_of('owner'));
insert into ids select 'project', id from public.projects where title = 'Néons lien créatrice (simulation)';
insert into public.marketing_activations (organization_id, project_id, kind, mode, title, owner_person_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), 'influence', 'internal', 'Influence', pg_temp.id_of('owner'));
insert into ids select 'activation', id from public.marketing_activations where project_id = pg_temp.id_of('project');
insert into public.network_contacts (organization_id, kind, name, roles)
values (pg_temp.id_of('org'), 'person', 'Léa (simulation créatrice)', array['influencer']);
insert into ids select 'lea', id from public.network_contacts where name = 'Léa (simulation créatrice)';
insert into public.activation_targets (organization_id, project_id, activation_id, contact_id)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('activation'), pg_temp.id_of('lea'));
insert into ids select 'target', id from public.activation_targets where activation_id = pg_temp.id_of('activation');
insert into public.influence_proposals (organization_id, project_id, activation_id, target_id, party, fee_amount)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('activation'), pg_temp.id_of('target'), 'pds', 500);
insert into ids select 'proposal', id from public.influence_proposals where target_id = pg_temp.id_of('target');
-- The token: 64 hex characters, its hash only stored.
insert into public.influence_agreements (organization_id, project_id, activation_id, target_id, proposal_id,
  token_hash, expires_at, status, content, content_hash, decided_at)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('activation'), pg_temp.id_of('target'),
  pg_temp.id_of('proposal'), encode(sha256(convert_to(repeat('ab', 32), 'UTF8')), 'hex'),
  now() - interval '1 day', 'accepted', '{"creator":"Léa","campaign":"Influence","project":"Néons"}', 'x', now());
insert into public.influence_payments (organization_id, project_id, activation_id, target_id, amount)
values (pg_temp.id_of('org'), pg_temp.id_of('project'), pg_temp.id_of('activation'), pg_temp.id_of('target'), 500);

set local role anon;
select is(public.get_influence_collaboration(repeat('ab', 32)) ->> 'step', 'content',
          'the accepted agreement''s link serves the collaboration, even after its 30 days');
select is(public.get_influence_collaboration(repeat('cd', 32)), null, 'an unknown token gives nothing');
select throws_ok($$ select public.declare_influence_publication_by_token(repeat('ab', 32), 'https://tiktok.example/v') $$,
                 'P0001', 'invalid_transition', 'no publication before the content is approved');
select lives_ok($$ select public.submit_influence_content_by_token(repeat('ab', 32), 'https://video.example/v1') $$,
                'the creator deposits her video without account');
select is(public.get_influence_collaboration(repeat('ab', 32)) ->> 'step', 'review', 'then the version waits for PDS');
select throws_ok($$ select count(*) from public.influence_contents $$, '42501', null,
                 'the link reads no table directly');
reset role;
update public.influence_contents set decision = 'approved' where target_id = pg_temp.id_of('target');
set local role anon;
select lives_ok($$ select public.declare_influence_publication_by_token(repeat('ab', 32), 'https://tiktok.example/v') $$,
                'once approved, she declares her publication');
reset role;
select is((select declared_source from public.activation_evidence where target_id = pg_temp.id_of('target')),
          'creator', 'declared by the creator, to be verified by PDS');
select set_config('pds.influence_payment', 'on', true);
update public.influence_payments set status = 'document_expected' where target_id = pg_temp.id_of('target');
select set_config('pds.influence_payment', 'off', true);
set local role anon;
select matches(public.open_influence_invoice_slot(repeat('ab', 32), 'pdf'),
               '^' || pg_temp.id_of('org') || '/' || pg_temp.id_of('project') || '/[0-9a-f-]{36}\.pdf$',
               'the invoice goes to a one-time path of the project');
select throws_ok($$ select public.submit_influence_invoice_by_token(repeat('ab', 32),
                     (select 'x/y/z.pdf'), 'Facture.pdf', 'application/pdf', 10) $$,
                 'P0001', 'upload_missing', 'nothing recorded without the uploaded file');
reset role;
select ok((select count(*) from public.notifications
            where kind = 'activation_creator_acted' and subject_id = pg_temp.id_of('activation')) >= 2,
          'the activation''s owner is told of each gesture');

select * from finish();
rollback;
