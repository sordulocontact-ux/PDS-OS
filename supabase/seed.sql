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
