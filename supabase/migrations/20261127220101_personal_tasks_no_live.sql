-- personal_tasks stays without zz_project_live (left without it on purpose by
-- 20261108100101, removed again by 20261112120101): 20261127190101 called
-- attach_project_live(), which put it back. A personal task is one person's;
-- it does not stamp its project's pages. Removed by name, as the next table
-- of a project should attach it by name too (docs/ARCHITECTURE.md § 3 bis).

drop trigger if exists zz_project_live on public.personal_tasks;
