-- Local development only (loaded by `supabase db reset`, never in production).
-- The first admin is whoever confirms this address: sign up with it locally and
-- open the confirmation email in Mailpit (http://127.0.0.1:54324).
-- In production, set it once with an explicit SQL statement, then the lock closes.
update public.organizations
   set bootstrap_admin_email = public.normalize_email('admin@pds.test')
 where slug = 'pds'
   and bootstrap_completed_at is null;
