-- Juridique, « le reste » (docs/projet-complet/legal.md J3, J6; proto « Projet complet »,
-- juridique-v2.html, rule 18):
--
-- 1. A contract template made from « Contrats à prévoir » (« Nouveau modèle de contrat ») is
--    asked of the direction **in the step**: it keeps the project and the person it was made
--    for (requested_project_id, requested_key, requested_for). The direction validates or
--    refuses it in the Plan d'action (set_contract_template_status, unchanged); the one who
--    made it is told either way, the direction when it is asked. A template stays a library
--    object: validated, it serves every project for its roles.
-- 2. « Modifier une clause » in the person's step: a new version of the document with the
--    clause it changes (contract_documents.clause) and why — what « Changé depuis la v1 :
--    clause « Crédit » (Lina, v2) » reads. revise_contract_document is unchanged.

select public.add_notification_kinds(array[
  'legal_template_to_validate', 'legal_template_validated', 'legal_template_refused']);

-- 1 --------------------------------------------------------------------------------------------

alter table public.contract_templates
  add column requested_project_id uuid references public.projects (id) on delete set null,
  add column requested_key text,
  add column requested_for text;
alter table public.contract_templates add constraint contract_templates_requested_check
  check ((requested_project_id is null and requested_key is null and requested_for is null)
         or (requested_project_id is not null
             and char_length(btrim(requested_key)) between 1 and 200
             and char_length(btrim(requested_for)) between 1 and 200));
create index contract_templates_requested_idx
  on public.contract_templates (requested_project_id) where requested_project_id is not null;

-- « Envoyer à la direction »: the draft its author just made, for a person of this project.
create function public.request_contract_template(
  p_template_id uuid, p_project_id uuid, p_key text, p_for text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.contract_templates%rowtype;
  v_person uuid;
begin
  select * into v from public.contract_templates where id = p_template_id for update;
  if not found
     or not public.has_permission(v.organization_id, 'manage_legal')
     or v.created_by is distinct from public.auth_person_id()
     or not public.can_see_project(p_project_id)
     or not exists (select 1 from public.projects p
                     where p.id = p_project_id and p.organization_id = v.organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v.status <> 'draft' or v.requested_project_id is not null then
    raise exception 'template_wrong_status' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_key, '')), '') is null
     or nullif(btrim(coalesce(p_for, '')), '') is null then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  update public.contract_templates
     set requested_project_id = p_project_id,
         requested_key = left(btrim(p_key), 200),
         requested_for = left(btrim(p_for), 200)
   where id = p_template_id;
  -- The direction is asked: every member who validates.
  for v_person in
    select m.person_id from public.memberships m
      join public.accounts a on a.id = m.approved_account_id
     where m.organization_id = v.organization_id
       and m.status = 'approved' and a.disabled_at is null
       and 'validate' = any (public.role_permissions(m.role))
  loop
    perform public.notify(v.organization_id, v_person, 'legal_template_to_validate',
                          p_project_id, p_template_id);
  end loop;
end;
$$;
revoke execute on function public.request_contract_template(uuid, uuid, text, text)
  from public, anon;
grant execute on function public.request_contract_template(uuid, uuid, text, text)
  to authenticated;

-- The direction decided: the one who made it reads it in the contracts to provide.
create function public.contract_templates_request_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.requested_project_id is not null and new.created_by is not null
     and old.status = 'draft' and new.status in ('validated', 'retired') then
    perform public.notify(new.organization_id, new.created_by,
                          case new.status when 'validated' then 'legal_template_validated'
                                          else 'legal_template_refused' end,
                          new.requested_project_id, new.id);
  end if;
  return null;
end;
$$;
revoke execute on function public.contract_templates_request_notify()
  from public, anon, authenticated;
create trigger z_notify_request after update of status on public.contract_templates
  for each row execute function public.contract_templates_request_notify();

-- 2 --------------------------------------------------------------------------------------------

alter table public.contract_documents add column clause text;
alter table public.contract_documents add constraint contract_documents_clause_check
  check (clause is null
         or (version > 1
             and clause in ('credit', 'duration', 'territory', 'fee', 'exclusivity', 'other')));

-- « Créer la nouvelle version »: the same revision, with the clause it changes.
create function public.revise_contract_clause(
  p_contract_id uuid, p_clause text, p_body text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_clause is null
     or p_clause not in ('credit', 'duration', 'territory', 'fee', 'exclusivity', 'other') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  -- Rights, state, reason and journal: checked by the revision itself.
  perform public.revise_contract_document(p_contract_id, p_body, p_reason);
  update public.contract_documents d
     set clause = p_clause
   where d.contract_id = p_contract_id
     and d.version = (select max(x.version) from public.contract_documents x
                       where x.contract_id = p_contract_id);
end;
$$;
revoke execute on function public.revise_contract_clause(uuid, text, text, text)
  from public, anon;
grant execute on function public.revise_contract_clause(uuid, text, text, text)
  to authenticated;
