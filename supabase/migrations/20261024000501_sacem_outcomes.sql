-- Recette Juridique V1 d'Ibé (21/10/2026), JUR-03 et JUR-10 : le dépôt et la réponse de la
-- SACEM, chacun avec sa preuve. Déposé n'est pas enregistré.
--
-- - Preuves en fichiers (PDF) : l'accusé de dépôt (submit_formality) et la preuve de
--   l'enregistrement, e-mail ou relevé de la SACEM (complete_formality), déposés par
--   l'équipe dans le bucket privé formality-signatures, sous <org>/proofs/<formalité>/.
--   Jamais « enregistrée » sans ce fichier ni l'identifiant SACEM de l'œuvre.
-- - Réponse « Rejetée » (reject_formality, avec le motif) : statut rejected, la
--   déclaration du titre passe à rejected ; « Préparer une nouvelle déclaration »
--   (restart_formality) rouvre le dossier, l'historique reste.

alter table public.legal_formalities
  add column submission_file text,
  add column completion_file text,
  add column rejected_at timestamptz,
  add column rejection_reason text,
  add constraint legal_formalities_rejection_check
    check (rejection_reason is null or char_length(rejection_reason) <= 2000),
  drop constraint legal_formalities_status_check,
  add constraint legal_formalities_status_check check (status in (
    'collecting_data', 'ready_to_generate', 'document_ready', 'signatures_pending',
    'ready_to_submit', 'submitted', 'processing', 'completed', 'action_required', 'rejected'));

-- legal_formality_events: two more kinds, whatever the list holds when this runs.
do $$
declare
  v_def text;
  v_kinds text[];
begin
  select pg_get_constraintdef(oid) into v_def from pg_constraint
   where conname = 'legal_formality_events_kind_check'
     and conrelid = 'public.legal_formality_events'::regclass;
  select array_agg(distinct replace(k, '"', '')) into v_kinds
    from regexp_matches(v_def, '''([^'']+)''', 'g') m,
         unnest(case when m[1] like '{%' then string_to_array(btrim(m[1], '{}'), ',')
                     else array[m[1]] end) k;
  v_kinds := array(select distinct k from unnest(v_kinds || array['formality.rejected', 'formality.restarted']) k);
  alter table public.legal_formality_events drop constraint legal_formality_events_kind_check;
  execute format('alter table public.legal_formality_events add constraint legal_formality_events_kind_check '
                 'check (kind = any (%L::text[]))', v_kinds);
end $$;

-- A proof's path: <org>/proofs/<formality>/<uuid>.pdf, of a formality the user manages.
create function public.formality_proof_allowed(p_path text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_parts text[] := string_to_array(coalesce(p_path, ''), '/');
  v_id uuid;
begin
  if cardinality(v_parts) <> 4 or v_parts[2] <> 'proofs'
     or v_parts[3] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or v_parts[4] !~ '^[0-9a-f-]{36}\.pdf$' then
    return false;
  end if;
  v_id := v_parts[3]::uuid;
  return exists (select 1 from public.legal_formalities f
                  where f.id = v_id and f.organization_id::text = v_parts[1])
         and public.can_manage_formality(v_id);
end;
$$;
revoke execute on function public.formality_proof_allowed(text) from public, anon;
grant execute on function public.formality_proof_allowed(text) to authenticated;

create policy formality_proofs_objects_insert
  on storage.objects for insert to authenticated
  with check (bucket_id = 'formality-signatures' and public.formality_proof_allowed(objects.name));
create policy formality_proofs_objects_select
  on storage.objects for select to authenticated
  using (bucket_id = 'formality-signatures' and public.formality_proof_allowed(objects.name));

-- The file is there, in this formality's folder.
create function public.formality_proof_file(p_formality public.legal_formalities, p_path text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_path is null
     or split_part(p_path, '/', 3) <> p_formality.id::text
     or not public.formality_proof_allowed(p_path)
     or not exists (select 1 from storage.objects o
                     where o.bucket_id = 'formality-signatures' and o.name = p_path) then
    raise exception 'formality_proof_file_required' using errcode = 'P0001';
  end if;
  return p_path;
end;
$$;
revoke execute on function public.formality_proof_file(public.legal_formalities, text)
  from public, anon, authenticated;

drop function public.submit_formality(uuid, text);
create function public.submit_formality(p_formality_id uuid, p_proof text, p_file text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype := public.formality_for_write(p_formality_id);
  v_file text;
  v_note text := nullif(btrim(coalesce(p_proof, '')), '');
begin
  if v.status <> 'ready_to_submit' then raise exception 'formality_not_ready' using errcode = 'P0001'; end if;
  -- JUR-03: the deposit receipt, a file.
  v_file := public.formality_proof_file(v, p_file);
  update public.legal_formalities
     set status = 'submitted', submission_proof = coalesce(v_note, split_part(v_file, '/', 4)),
         submission_file = v_file, submitted_at = now(), reopened = '{}'
   where id = p_formality_id;
  if v.definition_key = 'SACEM_725_EDITED_WORK' then
    insert into public.master_declarations (organization_id, master_id, organism, status, declared_on, notes)
    values (v.organization_id, v.master_id, 'sacem', 'submitted', current_date, left(v_note, 2000))
    on conflict (master_id, organism) do update
      set status = 'submitted', declared_on = current_date, notes = excluded.notes;
  end if;
  perform public.log_formality_event(v, 'formality.submitted', v_note);
end;
$$;
revoke execute on function public.submit_formality(uuid, text, text) from public, anon;
grant execute on function public.submit_formality(uuid, text, text) to authenticated;

drop function public.complete_formality(uuid, text, text, text);
create function public.complete_formality(
  p_formality_id uuid, p_proof text, p_external_id text, p_iswc text, p_file text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype := public.formality_for_write(p_formality_id);
  v_iswc text := nullif(upper(regexp_replace(coalesce(p_iswc, ''), '[^A-Za-z0-9]', '', 'g')), '');
  v_external text := nullif(btrim(coalesce(p_external_id, '')), '');
  v_note text := nullif(btrim(coalesce(p_proof, '')), '');
  v_file text;
begin
  if v.status not in ('submitted', 'processing') then
    raise exception 'formality_not_submitted' using errcode = 'P0001';
  end if;
  -- JUR-03: never « enregistrée » without the SACEM's proof and the work's identifier.
  v_file := public.formality_proof_file(v, p_file);
  if v_external is null then
    raise exception 'formality_external_id_required' using errcode = 'P0001';
  end if;
  if v_iswc is not null and v_iswc !~ '^T[0-9]{10}$' then
    raise exception 'formality_iswc_invalid' using errcode = 'P0001';
  end if;
  update public.legal_formalities
     set status = 'completed', completion_proof = coalesce(v_note, split_part(v_file, '/', 4)),
         completion_file = v_file, completed_at = now(), external_id = left(v_external, 100)
   where id = p_formality_id;
  if v.definition_key = 'SACEM_725_EDITED_WORK' then
    insert into public.master_declarations (organization_id, master_id, organism, status, reference, declared_on, notes)
    values (v.organization_id, v.master_id, 'sacem', 'confirmed', left(v_external, 100), current_date,
            left(v_note, 2000))
    on conflict (master_id, organism) do update
      set status = 'confirmed', reference = excluded.reference, notes = excluded.notes;
    if v_iswc is not null then
      update public.masters set iswc = v_iswc where id = v.master_id and iswc is null;
    end if;
  end if;
  perform public.log_formality_event(v, 'formality.completed', v_note);
end;
$$;
revoke execute on function public.complete_formality(uuid, text, text, text, text) from public, anon;
grant execute on function public.complete_formality(uuid, text, text, text, text) to authenticated;

-- « Rejetée » by the SACEM, with its reason.
create function public.reject_formality(p_formality_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype := public.formality_for_write(p_formality_id);
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v.status not in ('submitted', 'processing') then
    raise exception 'formality_not_submitted' using errcode = 'P0001';
  end if;
  if v_reason is null then
    raise exception 'formality_reason_required' using errcode = 'P0001';
  end if;
  update public.legal_formalities
     set status = 'rejected', rejected_at = now(), rejection_reason = left(v_reason, 2000)
   where id = p_formality_id;
  if v.definition_key = 'SACEM_725_EDITED_WORK' then
    update public.master_declarations set status = 'rejected', notes = left(v_reason, 2000)
     where master_id = v.master_id and organism = 'sacem';
  end if;
  perform public.log_formality_event(v, 'formality.rejected', v_reason);
end;
$$;
revoke execute on function public.reject_formality(uuid, text) from public, anon;
grant execute on function public.reject_formality(uuid, text) to authenticated;

-- « Préparer une nouvelle déclaration » after a rejection: the dossier again, its
-- values kept; the next version is signed anew.
create function public.restart_formality(p_formality_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype := public.formality_for_write(p_formality_id);
begin
  if v.status <> 'rejected' then
    raise exception 'formality_not_rejected' using errcode = 'P0001';
  end if;
  update public.legal_formalities
     set status = 'collecting_data', reopened = '{}', partial_reason = null,
         submitted_at = null, submission_proof = null, submission_file = null
   where id = p_formality_id;
  if v.definition_key = 'SACEM_725_EDITED_WORK' then
    update public.master_declarations set status = 'to_do'
     where master_id = v.master_id and organism = 'sacem';
  end if;
  perform public.log_formality_event(v, 'formality.restarted');
  perform public.formality_settle(p_formality_id);
end;
$$;
revoke execute on function public.restart_formality(uuid) from public, anon;
grant execute on function public.restart_formality(uuid) to authenticated;
