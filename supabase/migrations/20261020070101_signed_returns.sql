-- What comes back signed comes back by the person's private link (VISION-UX rule 19; proto
-- « Projet complet », juridique-v2.html E6 steps 6-7 and E10 step 2; docs/projet-complet/legal.md
-- E7): on their page by project (/c/, project_contact_links, lot 11), without an account.
--
-- 1. A contract sent for signature says how: on the person's private link (« Envoyer à … », PDS OS
--    sends no e-mail yet: the team copies the link) or « Je l'ai remis autrement » (how, and the
--    day) — contracts.sent_via / sent_how / sent_on, written by send_contract.
-- 2. The person downloads the version validated by the direction and deposits it signed (PDF
--    only): a file of the contract (contract_files, category 'signed', via_contact_id), logged
--    'signature.received'; the project's owner is told. The deposit, timestamped, is the proof
--    of the signature: the team checks it is the document sent, then « Marquer comme signé »
--    (advance_contract accepts it in place of a proof file). The signed copy « parvenu
--    autrement » still needs its file and its proof, as before.
-- 3. The SACEM 725 bulletin: each signer of a version is the Réseau contact the dossier named
--    (legal_formality_signatures.contact_id, from the creators' and publishers' contact_id). The
--    person downloads the version to sign and deposits it signed (PDF): their signature is
--    recorded with its file, « Par son lien privé ». « A signé autrement » stays for the team,
--    with the day it was signed (note_formality_signature).
-- 4. A token only reaches the contracts and bulletins of its own contact in its own project:
--    every function below starts from contact_link_of(token).
-- Files go up from the browser to a one-time path opened here (signed_return_slots, 30 min),
-- as the invoices do (20261020030301).

select public.add_notification_kinds(array['legal_contract_signed_received', 'legal_bulletin_signed']);

-- contract_events: one more kind, whatever the list holds when this runs.
do $$
declare
  v_def text;
  v_kinds text[];
begin
  select pg_get_constraintdef(oid) into v_def from pg_constraint
   where conname = 'contract_events_kind_check' and conrelid = 'public.contract_events'::regclass;
  select array_agg(distinct m[1]) into v_kinds from regexp_matches(v_def, '''([^'']+)''', 'g') m;
  v_kinds := array(select distinct k from unnest(v_kinds || array['signature.received']) k);
  alter table public.contract_events drop constraint contract_events_kind_check;
  execute format('alter table public.contract_events add constraint contract_events_kind_check '
                 'check (kind = any (%L::text[]))', v_kinds);
end $$;

-- 1 ---------------------------------------------------------------------------------------------

alter table public.contracts
  add column sent_via text,
  add column sent_how text,
  add column sent_on date;
alter table public.contracts add constraint contracts_sent_check check (
  (sent_via is null and sent_how is null and sent_on is null)
  or (sent_via = 'link' and sent_how is null and sent_on is not null)
  or (sent_via = 'other' and char_length(btrim(sent_how)) between 1 and 200 and sent_on is not null));

-- The person a contract of the Juridique is for (one per person and project).
create function public.contract_contact(p_contract_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select n.contact_id from public.legal_agreement_needs n where n.contract_id = p_contract_id;
$$;
revoke execute on function public.contract_contact(uuid) from public, anon, authenticated;

-- « Envoyer à … » (on their private link) or « Je l'ai remis autrement » (how, and the day).
create function public.send_contract(p_contract_id uuid, p_via text, p_how text, p_on date)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.contracts%rowtype;
  v_contact uuid;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_how text := nullif(btrim(coalesce(p_how, '')), '');
begin
  select * into v from public.contracts where id = p_contract_id;
  if not found or not public.can_see_contract(p_contract_id) then
    raise exception 'contract_not_found';
  end if;
  if p_via = 'link' then
    v_contact := public.contract_contact(p_contract_id);
    if v_contact is null or not exists (
         select 1 from public.project_contact_links l
          where l.project_id = v.project_id and l.contact_id = v_contact
            and l.revoked_at is null and l.expires_at > now()) then
      raise exception 'contact_link_missing' using errcode = 'P0001';
    end if;
    -- advance_contract checks the status and who may send.
    perform public.advance_contract(p_contract_id, 'send', 'Sur son lien privé');
    update public.contracts set sent_via = 'link', sent_how = null, sent_on = v_today
     where id = p_contract_id;
  elsif p_via = 'other' then
    if v_how not in ('Remis en main propre', 'Envoyé par un outil de signature',
                     'Envoyé depuis ma messagerie')
       or p_on is null or p_on > v_today or p_on < v_today - 365 then
      raise exception 'invalid_input' using errcode = '23514';
    end if;
    perform public.advance_contract(p_contract_id, 'send',
                                    v_how || ' · le ' || to_char(p_on, 'DD/MM/YYYY'));
    update public.contracts set sent_via = 'other', sent_how = v_how, sent_on = p_on
     where id = p_contract_id;
  else
    raise exception 'invalid_input' using errcode = '23514';
  end if;
end;
$$;
revoke execute on function public.send_contract(uuid, text, text, date) from public, anon;
grant execute on function public.send_contract(uuid, text, text, date) to authenticated;

-- 2 ---------------------------------------------------------------------------------------------

-- The person who deposited this signed copy by their link (null: the team's file).
alter table public.contract_files
  add column via_contact_id uuid references public.network_contacts (id) on delete set null;

create table public.signed_return_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  project_id uuid not null references public.projects (id) on delete cascade,
  contact_id uuid not null,
  kind text not null,
  -- The contract, or the bulletin's signature.
  object_id uuid not null,
  bucket text not null,
  path text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint signed_return_slots_path_key unique (bucket, path),
  constraint signed_return_slots_kind_check check (kind in ('contract', 'bulletin')),
  constraint signed_return_slots_bucket_check
    check (bucket in ('contract-files', 'formality-signatures'))
);
create index signed_return_slots_object_idx on public.signed_return_slots (object_id);
alter table public.signed_return_slots enable row level security;
alter table public.signed_return_slots force row level security;
revoke all on table public.signed_return_slots from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('formality-signatures', 'formality-signatures', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

create function public.is_open_signed_return_slot(p_bucket text, p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.signed_return_slots s
                  where s.bucket = p_bucket and s.path = p_path
                    and s.used_at is null and s.expires_at > now());
$$;
revoke execute on function public.is_open_signed_return_slot(text, text) from public;
grant execute on function public.is_open_signed_return_slot(text, text) to anon, authenticated;

create policy signed_returns_contract_objects_insert
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'contract-files'
              and public.is_open_signed_return_slot('contract-files', objects.name));
create policy signed_returns_bulletin_objects_insert
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'formality-signatures'
              and public.is_open_signed_return_slot('formality-signatures', objects.name));

-- A slot: <org>/<object>/<uuid>.pdf, 30 minutes.
create function public.open_signed_return_slot_for(
  p_org uuid, p_project uuid, p_contact uuid, p_kind text, p_object uuid, p_folder uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_path text := p_org || '/' || p_folder || '/' || gen_random_uuid() || '.pdf';
begin
  insert into public.signed_return_slots
    (organization_id, project_id, contact_id, kind, object_id, bucket, path, expires_at)
  values (p_org, p_project, p_contact, p_kind, p_object,
          case p_kind when 'contract' then 'contract-files' else 'formality-signatures' end,
          v_path, now() + interval '30 minutes');
  return v_path;
end;
$$;
revoke execute on function public.open_signed_return_slot_for(uuid, uuid, uuid, text, uuid, uuid)
  from public, anon, authenticated;

-- The slot used once: its file is there, and it is a PDF. Returns its size.
create function public.use_signed_return_slot(p_kind text, p_object uuid, p_path text)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.signed_return_slots%rowtype;
  v_object storage.objects%rowtype;
begin
  select * into v from public.signed_return_slots
   where path = p_path and kind = p_kind and object_id = p_object and used_at is null
   for update;
  if found then
    select * into v_object from storage.objects o
     where o.bucket_id = v.bucket and o.name = p_path;
  end if;
  if v.id is null or v_object.id is null then
    raise exception 'upload_missing' using errcode = 'P0001';
  end if;
  if coalesce(v_object.metadata ->> 'mimetype', 'application/pdf') <> 'application/pdf' then
    raise exception 'not_pdf' using errcode = 'P0001';
  end if;
  update public.signed_return_slots set used_at = now() where id = v.id;
  return greatest(coalesce((v_object.metadata ->> 'size')::bigint, 1), 1);
end;
$$;
revoke execute on function public.use_signed_return_slot(text, uuid, text)
  from public, anon, authenticated;

-- The person's contract, by their token: their own, in this project (null otherwise).
create function public.contact_contract(p_contact_token text, p_contract_id uuid)
returns public.contracts
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_link public.project_contact_links%rowtype := public.contact_link_of(p_contact_token);
  v public.contracts%rowtype;
begin
  if v_link.id is null or p_contract_id is null then
    return null;
  end if;
  select c.* into v from public.contracts c
    join public.legal_agreement_needs n on n.contract_id = c.id
   where c.id = p_contract_id and c.project_id = v_link.project_id
     and n.project_id = v_link.project_id and n.contact_id = v_link.contact_id;
  return v;
end;
$$;
revoke execute on function public.contact_contract(text, uuid) from public, anon, authenticated;

-- The person's signature of a bulletin: their own, in this project, of its current version.
create function public.contact_bulletin_signature(p_contact_token text, p_signature_id uuid)
returns public.legal_formality_signatures
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_link public.project_contact_links%rowtype := public.contact_link_of(p_contact_token);
  v public.legal_formality_signatures%rowtype;
begin
  if v_link.id is null or p_signature_id is null then
    return null;
  end if;
  select s.* into v from public.legal_formality_signatures s
    join public.legal_formalities f on f.id = s.formality_id
   where s.id = p_signature_id and s.contact_id = v_link.contact_id
     and f.project_id = v_link.project_id
     and s.document_version = (select max(d.version) from public.legal_formality_documents d
                                where d.formality_id = f.id);
  return v;
end;
$$;
revoke execute on function public.contact_bulletin_signature(text, uuid)
  from public, anon, authenticated;

-- 3 ---------------------------------------------------------------------------------------------

alter table public.legal_formality_signatures
  add column contact_id uuid references public.network_contacts (id) on delete set null,
  add column via text,
  add column signed_on date,
  add column file_path text,
  add column file_name text,
  add column bytes bigint;
alter table public.legal_formality_signatures
  add constraint legal_formality_signatures_via_check check (via is null or via in ('link', 'other')),
  add constraint legal_formality_signatures_file_check check (
    (file_path is null and file_name is null and bytes is null)
    or (file_path is not null and char_length(file_name) between 1 and 255 and bytes > 0)),
  add constraint legal_formality_signatures_file_key unique (file_path);

create policy formality_signatures_objects_select
  on storage.objects for select to authenticated
  using (bucket_id = 'formality-signatures'
         and exists (select 1 from public.legal_formality_signatures s
                      where s.file_path = objects.name
                        and public.can_manage_formality(s.formality_id)));

-- The signers already generated: their contact, from the version's dossier.
update public.legal_formality_signatures s
   set contact_id = c.contact_id
  from (select d.formality_id, d.version,
               left(btrim(concat_ws(' ', x ->> 'first_name', x ->> 'last_name')), 200) as signer,
               public.try_uuid(x ->> 'contact_id') as contact_id
          from public.legal_formality_documents d,
               jsonb_array_elements(coalesce(d.content -> 'creators' -> 'value', '[]')) x
         where coalesce((x ->> 'signs')::boolean, false)
        union all
        select d.formality_id, d.version, left(btrim(x ->> 'name'), 200),
               public.try_uuid(x ->> 'contact_id')
          from public.legal_formality_documents d,
               jsonb_array_elements(coalesce(d.content -> 'publishers' -> 'value', '[]')) x) c
 where s.formality_id = c.formality_id and s.document_version = c.version
   and s.signer = c.signer and s.contact_id is null and c.contact_id is not null
   and exists (select 1 from public.network_contacts n
                where n.id = c.contact_id and n.organization_id = s.organization_id);

-- A version of the bulletin, from the validated values; its signers, with their contact
-- (20261005007001, unchanged but for the contact).
create or replace function public.generate_formality_document(p_formality_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype := public.formality_for_write(p_formality_id);
  v_version integer;
  v_content jsonb;
  v_item jsonb;
  v_contact uuid;
begin
  if v.status not in ('ready_to_generate', 'document_ready', 'signatures_pending') then
    raise exception 'formality_not_ready' using errcode = 'P0001';
  end if;
  if cardinality(public.formality_missing(p_formality_id)) > 0 then
    raise exception 'formality_missing' using errcode = 'P0001',
      detail = array_to_string(public.formality_missing(p_formality_id), ',');
  end if;
  select coalesce(jsonb_object_agg(field_key, jsonb_build_object('value', value, 'source', source)), '{}')
    into v_content from public.legal_formality_values where formality_id = p_formality_id;
  select coalesce(max(version), 0) + 1 into v_version
    from public.legal_formality_documents where formality_id = p_formality_id;
  insert into public.legal_formality_documents (organization_id, formality_id, version, content, created_by)
  values (v.organization_id, p_formality_id, v_version, v_content, public.auth_person_id());

  -- « Le bulletin doit être signé par tous les ayants droit »: the creators
  -- who sign and the publishers, for this version, with the Réseau contact named.
  for v_item in select * from jsonb_array_elements(coalesce(v_content -> 'creators' -> 'value', '[]')) loop
    continue when not coalesce((v_item ->> 'signs')::boolean, false);
    select n.id into v_contact from public.network_contacts n
     where n.id = public.try_uuid(v_item ->> 'contact_id') and n.organization_id = v.organization_id;
    insert into public.legal_formality_signatures
      (organization_id, formality_id, document_version, signer, role, contact_id)
    values (v.organization_id, p_formality_id, v_version,
            left(btrim(concat_ws(' ', v_item ->> 'first_name', v_item ->> 'last_name')), 200),
            coalesce(v_item ->> 'quality', 'author'), v_contact);
  end loop;
  for v_item in select * from jsonb_array_elements(coalesce(v_content -> 'publishers' -> 'value', '[]')) loop
    select n.id into v_contact from public.network_contacts n
     where n.id = public.try_uuid(v_item ->> 'contact_id') and n.organization_id = v.organization_id;
    insert into public.legal_formality_signatures
      (organization_id, formality_id, document_version, signer, role, contact_id)
    values (v.organization_id, p_formality_id, v_version, left(btrim(v_item ->> 'name'), 200),
            'publisher', v_contact);
  end loop;
  update public.legal_formalities
     set status = case when exists (
           select 1 from public.legal_formality_signatures
            where formality_id = p_formality_id and document_version = v_version)
         then 'signatures_pending' else 'ready_to_submit' end,
         partial_reason = null
   where id = p_formality_id;
  perform public.log_formality_event(v, 'document.generated', 'v' || v_version);
  return v_version;
end;
$$;

-- A signature recorded, whoever records it; the bulletin passes on when all are in.
create function public.settle_formality_signature(
  p_sig public.legal_formality_signatures, p_via text, p_proof text, p_on date,
  p_path text, p_file_name text, p_bytes bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype;
begin
  select * into v from public.legal_formalities where id = p_sig.formality_id for update;
  if v.status <> 'signatures_pending' or p_sig.status <> 'pending' or p_sig.document_version <> (
       select max(version) from public.legal_formality_documents where formality_id = v.id) then
    raise exception 'formality_signature_closed' using errcode = 'P0001';
  end if;
  update public.legal_formality_signatures
     set status = 'signed', proof = p_proof, signed_at = now(), signed_on = p_on, via = p_via,
         recorded_by = public.auth_person_id(), file_path = p_path,
         file_name = case when p_path is null then null
                          else left(btrim(coalesce(nullif(p_file_name, ''), 'Bulletin signé.pdf')), 255) end,
         bytes = case when p_path is null then null else p_bytes end
   where id = p_sig.id;
  perform public.log_formality_event(v, 'signature.completed', p_sig.signer);
  if not exists (select 1 from public.legal_formality_signatures
                  where formality_id = v.id and document_version = p_sig.document_version
                    and status = 'pending') then
    update public.legal_formalities set status = 'ready_to_submit' where id = v.id;
  end if;
end;
$$;
revoke execute on function public.settle_formality_signature(
  public.legal_formality_signatures, text, text, date, text, text, bigint)
  from public, anon, authenticated;

-- « A signé autrement » (the team): the day it was signed, which is the proof.
create function public.note_formality_signature(p_signature_id uuid, p_signed_on date)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_sig public.legal_formality_signatures%rowtype;
  v_today date := (now() at time zone 'Europe/Paris')::date;
begin
  select * into v_sig from public.legal_formality_signatures where id = p_signature_id for update;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  perform public.formality_for_write(v_sig.formality_id);
  if p_signed_on is null or p_signed_on > v_today or p_signed_on < v_today - 365 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  perform public.settle_formality_signature(
    v_sig, 'other', 'A signé autrement · le ' || to_char(p_signed_on, 'DD/MM/YYYY'),
    p_signed_on, null, null, null);
end;
$$;
revoke execute on function public.note_formality_signature(uuid, date) from public, anon;
grant execute on function public.note_formality_signature(uuid, date) to authenticated;

-- 4 ---------------------------------------------------------------------------------------------

-- What the person's page shows of what they sign: their contracts of the Juridique in this
-- project (from their preparation on) and their signatures of the bulletin being signed.
create function public.get_contact_signatures(p_contact_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_link public.project_contact_links%rowtype := public.contact_link_of(p_contact_token);
begin
  if v_link.id is null then
    return jsonb_build_object('contracts', '[]'::jsonb, 'bulletins', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'contracts', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', c.id,
               'title', c.title,
               'status', c.status,
               'version', (select max(d.version) from public.contract_documents d
                            where d.contract_id = c.id),
               'sentVia', c.sent_via,
               'sentHow', c.sent_how,
               'sentOn', c.sent_on,
               'signedOn', c.signed_on,
               'deposit', (select jsonb_build_object('fileName', f.file_name, 'at', f.created_at)
                             from public.contract_files f
                            where f.contract_id = c.id and f.category = 'signed'
                              and f.via_contact_id = v_link.contact_id
                            order by f.created_at desc limit 1),
               'at', c.created_at)
             order by c.created_at), '[]'::jsonb)
        from public.contracts c
        join public.legal_agreement_needs n on n.contract_id = c.id
       where n.project_id = v_link.project_id and n.contact_id = v_link.contact_id
         and c.project_id = v_link.project_id and c.status <> 'terminated'),
    'bulletins', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', s.id,
               'title', m.title,
               'version', s.document_version,
               'status', s.status,
               'via', s.via,
               'signedAt', s.signed_at,
               'signedOn', s.signed_on,
               'at', d.created_at)
             order by d.created_at), '[]'::jsonb)
        from public.legal_formality_signatures s
        join public.legal_formalities f on f.id = s.formality_id
        join public.legal_formality_documents d
          on d.formality_id = f.id and d.version = s.document_version
        join public.masters m on m.id = f.master_id
       where s.contact_id = v_link.contact_id and f.project_id = v_link.project_id
         and f.status in ('signatures_pending', 'ready_to_submit')
         and s.document_version = (select max(x.version) from public.legal_formality_documents x
                                    where x.formality_id = f.id)));
end;
$$;
revoke execute on function public.get_contact_signatures(text) from public;
grant execute on function public.get_contact_signatures(text) to anon, authenticated;

-- « Télécharger »: the version validated by the direction, once it is sent to them.
create function public.get_contact_contract_document(p_contact_token text, p_contract_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.contracts%rowtype := public.contact_contract(p_contact_token, p_contract_id);
begin
  if v.id is null or v.status not in ('sent', 'signed') then
    return null;
  end if;
  return (select jsonb_build_object('title', v.title, 'version', d.version, 'body', d.body)
            from public.contract_documents d
           where d.contract_id = v.id order by d.version desc limit 1);
end;
$$;
revoke execute on function public.get_contact_contract_document(text, uuid) from public;
grant execute on function public.get_contact_contract_document(text, uuid) to anon, authenticated;

-- « Télécharger »: the version of the bulletin they sign.
create function public.get_contact_bulletin_document(p_contact_token text, p_signature_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.legal_formality_signatures%rowtype :=
    public.contact_bulletin_signature(p_contact_token, p_signature_id);
begin
  if v.id is null then
    return null;
  end if;
  return (select jsonb_build_object('title', m.title, 'version', d.version, 'content', d.content)
            from public.legal_formality_documents d
            join public.legal_formalities f on f.id = d.formality_id
            join public.masters m on m.id = f.master_id
           where d.formality_id = v.formality_id and d.version = v.document_version);
end;
$$;
revoke execute on function public.get_contact_bulletin_document(text, uuid) from public;
grant execute on function public.get_contact_bulletin_document(text, uuid) to anon, authenticated;

-- « Envoyer mon contrat signé » / « Envoyer le bulletin signé », step 1: a one-time path.
create function public.open_signed_return_slot(p_contact_token text, p_kind text, p_object_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_contract public.contracts%rowtype;
  v_sig public.legal_formality_signatures%rowtype;
  v_contact uuid;
  v_status text;
begin
  if p_kind = 'contract' then
    v_contract := public.contact_contract(p_contact_token, p_object_id);
    if v_contract.id is null then
      raise exception 'signature_link_closed' using errcode = 'P0001';
    end if;
    if v_contract.status <> 'sent' then
      raise exception 'contract_not_sent' using errcode = 'P0001';
    end if;
    v_contact := public.contract_contact(v_contract.id);
    if exists (select 1 from public.contract_files
                where contract_id = v_contract.id and category = 'signed'
                  and via_contact_id = v_contact) then
      raise exception 'already_deposited' using errcode = 'P0001';
    end if;
    return public.open_signed_return_slot_for(v_contract.organization_id, v_contract.project_id,
                                              v_contact, 'contract', v_contract.id, v_contract.id);
  elsif p_kind = 'bulletin' then
    v_sig := public.contact_bulletin_signature(p_contact_token, p_object_id);
    if v_sig.id is null then
      raise exception 'signature_link_closed' using errcode = 'P0001';
    end if;
    select status into v_status from public.legal_formalities where id = v_sig.formality_id;
    if v_sig.status <> 'pending' or v_status <> 'signatures_pending' then
      raise exception 'formality_signature_closed' using errcode = 'P0001';
    end if;
    return public.open_signed_return_slot_for(
      v_sig.organization_id,
      (select project_id from public.legal_formalities where id = v_sig.formality_id),
      v_sig.contact_id, 'bulletin', v_sig.id, v_sig.formality_id);
  end if;
  raise exception 'invalid_input' using errcode = '23514';
end;
$$;
revoke execute on function public.open_signed_return_slot(text, text, uuid) from public;
grant execute on function public.open_signed_return_slot(text, text, uuid) to anon, authenticated;

-- « Envoyer mon contrat signé », step 2: the signed copy kept with the contract; the owner told.
create function public.submit_signed_contract(
  p_contact_token text, p_contract_id uuid, p_path text, p_file_name text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.contracts%rowtype := public.contact_contract(p_contact_token, p_contract_id);
  v_contact uuid;
  v_name text;
  v_bytes bigint;
begin
  if v.id is null then
    raise exception 'signature_link_closed' using errcode = 'P0001';
  end if;
  if v.status <> 'sent' then
    raise exception 'contract_not_sent' using errcode = 'P0001';
  end if;
  v_contact := public.contract_contact(v.id);
  if exists (select 1 from public.contract_files
              where contract_id = v.id and category = 'signed' and via_contact_id = v_contact) then
    raise exception 'already_deposited' using errcode = 'P0001';
  end if;
  v_bytes := public.use_signed_return_slot('contract', v.id, p_path);
  insert into public.contract_files
    (organization_id, contract_id, category, description, path, file_name, mime, bytes,
     via_contact_id)
  values (v.organization_id, v.id, 'signed', 'Déposé par son lien privé', p_path,
          left(btrim(coalesce(nullif(p_file_name, ''), 'Contrat signé.pdf')), 255),
          'application/pdf', least(v_bytes, 52428800), v_contact);
  select name into v_name from public.network_contacts where id = v_contact;
  perform public.log_contract_event(v.organization_id, v.id, v.project_id, 'signature.received',
                                    v_name);
  if v.owner_person_id is not null then
    -- The subject is the person: the notification opens their démarche.
    perform public.notify(v.organization_id, v.owner_person_id, 'legal_contract_signed_received',
                          v.project_id, v_contact);
  end if;
end;
$$;
revoke execute on function public.submit_signed_contract(text, uuid, text, text) from public;
grant execute on function public.submit_signed_contract(text, uuid, text, text) to anon, authenticated;

-- « Envoyer le bulletin signé », step 2: their signature recorded with its file.
create function public.submit_signed_bulletin(
  p_contact_token text, p_signature_id uuid, p_path text, p_file_name text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_sig public.legal_formality_signatures%rowtype :=
    public.contact_bulletin_signature(p_contact_token, p_signature_id);
  v public.legal_formalities%rowtype;
  v_bytes bigint;
  v_to uuid;
begin
  if v_sig.id is null then
    raise exception 'signature_link_closed' using errcode = 'P0001';
  end if;
  select * into v_sig from public.legal_formality_signatures where id = v_sig.id for update;
  v_bytes := public.use_signed_return_slot('bulletin', v_sig.id, p_path);
  perform public.settle_formality_signature(
    v_sig, 'link', 'Déposé par son lien privé', (now() at time zone 'Europe/Paris')::date,
    p_path, p_file_name, v_bytes);
  select * into v from public.legal_formalities where id = v_sig.formality_id;
  select coalesce(v.responsible_person_id, p.owner_person_id) into v_to
    from public.projects p where p.id = v.project_id;
  if v_to is not null then
    -- The subject is the title: the notification opens its SACEM démarche.
    perform public.notify(v.organization_id, v_to, 'legal_bulletin_signed', v.project_id,
                          v.master_id);
  end if;
end;
$$;
revoke execute on function public.submit_signed_bulletin(text, uuid, text, text) from public;
grant execute on function public.submit_signed_bulletin(text, uuid, text, text) to anon, authenticated;

-- 5 ---------------------------------------------------------------------------------------------

-- advance_contract (20261005001001), unchanged but for the proof: a signed copy deposited by the
-- person's link, timestamped, is the proof of their signature.
create or replace function public.advance_contract(
  p_contract_id uuid,
  p_action text,
  p_comment text default null,
  p_signed_on date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contract public.contracts%rowtype;
  v_me uuid := public.auth_person_id();
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_editor boolean;
  v_validator boolean;
  v_generated boolean;
  v_person uuid;
begin
  select * into v_contract from public.contracts where id = p_contract_id for update;
  if not found or not public.can_see_contract(p_contract_id) then
    raise exception 'contract_not_found';
  end if;

  v_editor := public.has_permission(v_contract.organization_id, 'manage_contracts')
              and (v_contract.owner_person_id = v_me
                   or public.has_permission(v_contract.organization_id, 'view_all_projects'));
  v_validator := public.has_permission(v_contract.organization_id, 'validate');
  v_generated := exists (select 1 from public.contract_documents
                          where contract_id = p_contract_id);

  if p_action = 'submit' then
    if v_contract.status <> 'draft' then raise exception 'contract_wrong_status'; end if;
    if not v_editor then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    update public.contracts set status = 'in_review' where id = p_contract_id;
    for v_person in
      select m.person_id from public.memberships m
        join public.accounts a on a.id = m.approved_account_id
       where m.organization_id = v_contract.organization_id
         and m.status = 'approved' and a.disabled_at is null
         and 'validate' = any (public.role_permissions(m.role))
    loop
      perform public.notify(v_contract.organization_id, v_person, 'contract_review_requested',
                            v_contract.project_id, p_contract_id);
    end loop;
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id, 'contract.submitted');

  elsif p_action in ('approve', 'request_changes') then
    if v_contract.status <> 'in_review' then raise exception 'contract_wrong_status'; end if;
    if not v_validator then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    if p_action = 'request_changes' and v_comment is null then
      raise exception 'contract_comment_required';
    end if;
    update public.contracts
       set status = case p_action when 'approve' then 'approved' else 'draft' end,
           review_comment = v_comment,
           reviewed_by = v_me,
           reviewed_at = now()
     where id = p_contract_id;
    perform public.notify(v_contract.organization_id, v_contract.owner_person_id,
                          case p_action when 'approve' then 'contract_approved'
                                        else 'contract_changes_requested' end,
                          v_contract.project_id, p_contract_id);
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id,
                                      case p_action when 'approve' then 'contract.approved'
                                                    else 'contract.changes_requested' end,
                                      v_comment);

  elsif p_action = 'send' then
    if v_contract.status <> 'approved' then raise exception 'contract_wrong_status'; end if;
    if not v_editor then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    if v_generated and v_comment is null then
      raise exception 'contract_send_proof_required';
    end if;
    update public.contracts set status = 'sent' where id = p_contract_id;
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id, 'signature.requested',
                                      v_comment);

  elsif p_action = 'sign' then
    if v_contract.status not in ('approved', 'sent') then
      raise exception 'contract_wrong_status';
    end if;
    if not v_editor then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    if p_signed_on is null or p_signed_on > current_date then
      raise exception 'contract_signed_on_invalid';
    end if;
    if v_generated and not (
      exists (select 1 from public.contract_files
               where contract_id = p_contract_id and category = 'signed'
                 and via_contact_id is not null)
      or (exists (select 1 from public.contract_files
                   where contract_id = p_contract_id and category = 'signed')
          and exists (select 1 from public.contract_files
                       where contract_id = p_contract_id and category = 'evidence'))
    ) then
      raise exception 'contract_proof_missing';
    end if;
    update public.contracts set status = 'signed', signed_on = p_signed_on
     where id = p_contract_id;
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id, 'contract.signed');

  elsif p_action = 'terminate' then
    if v_contract.status <> 'signed' then raise exception 'contract_wrong_status'; end if;
    if not v_editor then raise exception 'contract_not_allowed' using errcode = '42501'; end if;
    update public.contracts set status = 'terminated' where id = p_contract_id;
    perform public.log_contract_event(v_contract.organization_id, p_contract_id,
                                      v_contract.project_id, 'contract.terminated');

  else
    raise exception 'contract_unknown_action';
  end if;
end;
$$;
revoke execute on function public.advance_contract(uuid, text, text, date) from public, anon;
grant execute on function public.advance_contract(uuid, text, text, date) to authenticated;
