-- Local development only (loaded by `supabase db reset`, never in production).
-- The first admin is whoever confirms this address: sign up with it locally and
-- open the confirmation email in Mailpit (http://127.0.0.1:54324).
-- In production, set it once with an explicit SQL statement, then the lock closes.
update public.organizations
   set bootstrap_admin_email = public.normalize_email('admin@pds.test')
 where slug = 'pds'
   and bootstrap_completed_at is null;

-- Web Push: the app server proves itself with this secret (PUSH_CLAIM_SECRET in
-- .env.local, same value). Local value only; in production, create it once with
-- a random value: select vault.create_secret('<openssl rand -hex 32>', 'push_claim_secret');
select vault.create_secret('local-push-claim-secret-not-for-production', 'push_claim_secret');

-- Business module test accounts (BIZ 1, 11/11/2026), local only: Glen the
-- business manager and Thibault the business developer, so their views can be
-- tried on Docker before real accounts exist in production. Password of both:
-- « pds-local-business ». Created as GoTrue does for a confirmed sign-up; the
-- trigger po_handle_confirmed adds the person, the account and a pending
-- membership, approved here with its position. Replayable: the two are
-- removed first.
delete from auth.users where email in ('glen@pds.test', 'thibault@pds.test');

with seed_accounts (email, first_name, last_name) as (
  values ('glen@pds.test', 'Glen', 'Test'),
         ('thibault@pds.test', 'Thibault', 'Test')
), created as (
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new)
  select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
         'authenticated', a.email,
         extensions.crypt('pds-local-business', extensions.gen_salt('bf')), now(),
         '{"provider": "email", "providers": ["email"]}',
         jsonb_build_object('first_name', a.first_name, 'last_name', a.last_name),
         now(), now(), '', '', '', ''
    from seed_accounts a
  returning id, email
)
insert into auth.identities (id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), c.id, c.id::text,
       jsonb_build_object('sub', c.id::text, 'email', c.email, 'email_verified', true),
       'email', now(), now(), now()
  from created c;

update public.memberships m
   set status = 'approved',
       role = case p.email when 'glen@pds.test' then 'business_manager' else 'business' end
  from public.people p
 where p.id = m.person_id
   and p.email in ('glen@pds.test', 'thibault@pds.test');
