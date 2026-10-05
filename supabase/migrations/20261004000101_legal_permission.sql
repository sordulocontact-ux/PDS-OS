-- Juridique: `manage_legal`, held by the director and project managers
-- (docs/ARCHITECTURE.md § 8 sexies). The DG's ticket gives legal branches to
-- a RAF / lawyer, a position that does not exist yet: granting the
-- permission to such a position later is a one-line change here.
--
-- Today it only decides who sees a project's Juridique section (the État des
-- lieux reads tables that keep their own RLS: splits need manage_catalog,
-- contracts their reader rule). The legal tables to come will check it in
-- their policies.

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
            'manage_contracts', 'manage_legal']
    when 'project_manager' then
      array['pilot_projects', 'manage_catalog', 'manage_network', 'manage_contracts',
            'manage_legal']
    when 'creative_director' then array['creative_work', 'manage_network']
    else array[]::text[]
  end;
$$;
