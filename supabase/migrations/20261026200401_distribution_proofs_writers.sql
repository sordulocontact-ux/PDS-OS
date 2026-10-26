-- Distribution, recette V1 of 23/10/2026 (DIST-005, DIST-007): the proofs
-- now come from more people than the project's owner — the validator who
-- verifies a platform with its capture, the owner of a reserve who lifts it.
-- Before (20261011100301): only the owner put a file in distribution-proofs.
-- A file nothing points to (its gesture refused) is taken back by who put it.

create or replace function public.can_write_distribution_proof(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.can_check_distribution(p_project_id)
      or exists (select 1 from public.distribution_reserves r
                  where r.project_id = p_project_id
                    and r.owner_person_id = public.auth_person_id()
                    and r.status = 'open');
$$;

revoke execute on function public.can_write_distribution_proof(uuid) from public, anon;
grant execute on function public.can_write_distribution_proof(uuid) to authenticated;

drop policy distribution_proofs_objects_insert on storage.objects;
create policy distribution_proofs_objects_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'distribution-proofs'
    and exists (
      select 1 from public.projects p
       where p.id = public.try_uuid((storage.foldername(objects.name))[2])
         and p.organization_id = public.try_uuid((storage.foldername(objects.name))[1])
         and public.can_write_distribution_proof(p.id))
  );

drop policy distribution_proofs_objects_delete on storage.objects;
create policy distribution_proofs_objects_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'distribution-proofs'
    and not exists (select 1 from public.distribution_declarations d
                     where d.proof_path = objects.name)
    and not exists (select 1 from public.distribution_platforms p
                     where p.proof_path = objects.name)
    and not exists (select 1 from public.distribution_reserves r
                     where r.lift_proof_path = objects.name)
    and public.can_write_distribution_proof(public.try_uuid((storage.foldername(objects.name))[2]))
  );
