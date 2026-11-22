-- « Je vois aucun bouton […] créé d'abord dans Contrats » (Sacha 22/11/2026): once the accord is validated,
-- the deal's long contract is made from the deal itself (« Créer le contrat », linked at once). The
-- business manager and the business, who negotiate the deals and keep their legal part in the deal
-- (réunion avec Ibé du 18/11/2026: « la partie juridique d'un deal reste dans la page Deal »), now create
-- and follow contracts (manage_contracts): they follow their own, as anyone but the direction does
-- (contracts' RLS, owner_person_id). Validating the long contract stays with whoever has
-- validate_contracts. Everything else unchanged from 20261120130101.
create or replace function public.role_permissions(p_role text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'general_director' then
      array['administer', 'assign_projects', 'validate', 'manage_catalog', 'create_projects',
            'view_all_projects', 'archive_records', 'read_feedback', 'manage_network',
            'manage_contracts', 'manage_legal', 'manage_sessions', 'read_artist_budgets',
            'manage_artist_budgets', 'read_finance', 'manage_finance', 'validate_contracts']
    when 'project_manager' then
      array['pilot_projects', 'manage_catalog', 'manage_network', 'manage_contracts',
            'manage_legal', 'manage_sessions', 'read_artist_budgets']
    when 'creative_director' then array['creative_work', 'manage_network']
    when 'business_manager' then array['negotiate', 'manage_network', 'read_artist_budgets',
                                        'open_deals', 'read_finance', 'manage_finance',
                                        'validate_contracts', 'manage_contracts']
    when 'business' then array['negotiate', 'manage_network', 'read_finance', 'manage_finance',
                               'manage_contracts']
    else array[]::text[]
  end;
$$;
