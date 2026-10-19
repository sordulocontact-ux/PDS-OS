-- The creator's private link, extended (proto « Projet complet », creatorPortal;
-- ticket « Activations / Influence » § 8, docs/projet-complet/activations.md
-- ACT-6): the link of the express agreement (/i/<token>) serves the whole
-- collaboration once « Bon pour accord » is given. On it, without account,
-- the creator deposits her content (a link to the video, not published),
-- declares her publication, and deposits her invoice (a file). Each gesture
-- is a security definer function keyed by the token: nothing of another
-- collaboration, no amount but her own terms, no internal note. The link
-- stays valid for the collaboration until it has an outcome (closed,
-- refused…) or the agreement is revoked; its first 30 days only bound the
-- agreement itself. PDS is told by a notification to the activation's owner.

-- 1. The collaboration behind a token --------------------------------------------------------

create or replace function public.influence_collab_of(p_token text)
returns public.influence_agreements
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.influence_agreements%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select * into v from public.influence_agreements
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if not found or v.status <> 'accepted' then
    return null;
  end if;
  return v;
end;
$$;
revoke execute on function public.influence_collab_of(text) from public, anon, authenticated;

-- Where the collaboration stands for the creator: closed (an outcome),
-- invoice (expected from her), published, publish (content approved),
-- review (a version waits for PDS), content (to deposit, first or again).
create or replace function public.influence_creator_step(p_target_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when t.outcome is not null then 'closed'
    when exists (select 1 from public.activation_evidence e
                  where e.target_id = t.id and e.kind = 'publication'
                    and e.withdrawn_at is null) then
      case when exists (select 1 from public.influence_payments p
                         where p.target_id = t.id and p.status = 'document_expected')
           then 'invoice' else 'published' end
    when exists (select 1 from public.influence_contents c
                  where c.target_id = t.id and c.decision = 'approved') then 'publish'
    when exists (select 1 from public.influence_contents c
                  where c.target_id = t.id and c.decision is null) then 'review'
    else 'content'
  end
  from public.activation_targets t where t.id = p_target_id;
$$;
revoke execute on function public.influence_creator_step(uuid) from public, anon, authenticated;

-- Tells the activation's owner (else the project's) that the creator acted.
create or replace function public.influence_creator_notify(p_agreement public.influence_agreements)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications
    (organization_id, recipient_person_id, actor_person_id, kind, project_id, subject_id)
  select a.organization_id, coalesce(a.owner_person_id, p.owner_person_id), null,
         'activation_creator_acted', a.project_id, a.id
    from public.marketing_activations a
    join public.projects p on p.id = a.project_id
   where a.id = p_agreement.activation_id
     and coalesce(a.owner_person_id, p.owner_person_id) is not null;
$$;
revoke execute on function public.influence_creator_notify(public.influence_agreements)
  from public, anon, authenticated;

-- 2. What the creator sees -------------------------------------------------------------------

create or replace function public.get_influence_collaboration(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.influence_agreements%rowtype;
begin
  v := public.influence_collab_of(p_token);
  if v.id is null then
    return null;
  end if;
  return jsonb_build_object(
    'step', public.influence_creator_step(v.target_id),
    'creator', v.content ->> 'creator',
    'campaign', v.content ->> 'campaign',
    'project', v.content ->> 'project',
    'terms', v.content -> 'terms',
    'agreedAt', v.decided_at,
    'contents', coalesce((
      select jsonb_agg(jsonb_build_object(
               'label', c.label, 'url', c.url, 'decision', c.decision,
               'comment', c.decision_comment, 'at', c.created_at,
               'feedback', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'timecode', f.timecode, 'category', f.category,
                          'comment', f.comment) order by f.created_at)
                   from public.influence_feedback f where f.content_id = c.id), '[]'::jsonb))
             order by c.created_at)
        from public.influence_contents c where c.target_id = v.target_id), '[]'::jsonb),
    'publication', (
      select jsonb_build_object('url', e.url, 'on', e.declared_on,
               'verified', exists (select 1 from public.activation_evidence_checks k
                                    where k.evidence_id = e.id and k.result = 'verified'))
        from public.activation_evidence e
       where e.target_id = v.target_id and e.kind = 'publication' and e.withdrawn_at is null
       order by e.created_at desc limit 1),
    'invoiceSent', exists (select 1 from public.influence_payments p
                            where p.target_id = v.target_id and p.invoice_file_id is not null));
end;
$$;
revoke execute on function public.get_influence_collaboration(text) from public;
grant execute on function public.get_influence_collaboration(text) to anon, authenticated;

-- 3. The creator's gestures ------------------------------------------------------------------

-- « Envoyer la V2 »: a link to the video, not published.
create or replace function public.submit_influence_content_by_token(p_token text, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.influence_agreements%rowtype;
  v_url text := btrim(coalesce(p_url, ''));
  v_count integer;
begin
  v := public.influence_collab_of(p_token);
  if v.id is null then raise exception 'collaboration_link_closed' using errcode = 'P0001'; end if;
  if public.influence_creator_step(v.target_id) <> 'content' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if v_url !~ '^https?://\S+$' or char_length(v_url) > 2000 then
    raise exception 'url_invalid' using errcode = '23514';
  end if;
  select count(*) into v_count from public.influence_contents where target_id = v.target_id;
  insert into public.influence_contents (organization_id, project_id, activation_id, target_id,
                                         label, url)
  values (v.organization_id, v.project_id, v.activation_id, v.target_id,
          'V' || (v_count + 1), v_url);
  perform public.influence_creator_notify(v);
end;
$$;
revoke execute on function public.submit_influence_content_by_token(text, text) from public;
grant execute on function public.submit_influence_content_by_token(text, text) to anon, authenticated;

-- « Déclarer la publication »: declared by the creator, verified by PDS.
create or replace function public.declare_influence_publication_by_token(p_token text, p_url text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.influence_agreements%rowtype;
  v_url text := btrim(coalesce(p_url, ''));
begin
  v := public.influence_collab_of(p_token);
  if v.id is null then raise exception 'collaboration_link_closed' using errcode = 'P0001'; end if;
  if public.influence_creator_step(v.target_id) <> 'publish' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if v_url !~ '^https?://\S+$' or char_length(v_url) > 2000 then
    raise exception 'url_invalid' using errcode = '23514';
  end if;
  insert into public.activation_evidence (organization_id, project_id, activation_id, target_id,
                                          kind, url, declared_on, declared_source)
  values (v.organization_id, v.project_id, v.activation_id, v.target_id, 'publication', v_url,
          (now() at time zone 'Europe/Paris')::date, 'creator');
  perform public.log_activation_event(v.activation_id, 'publication.declared_by_creator',
    v.target_id, null, jsonb_build_object('url', v_url), null);
  perform public.influence_creator_notify(v);
end;
$$;
revoke execute on function public.declare_influence_publication_by_token(text, text) from public;
grant execute on function public.declare_influence_publication_by_token(text, text)
  to anon, authenticated;

-- « Envoyer la facture »: a one-time path of activation-files first, then the
-- file recorded (restricted: budget readers only) on the payment, which
-- waits for its « bon à payer ».
create table public.influence_upload_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  agreement_id uuid not null references public.influence_agreements (id) on delete cascade,
  path text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint influence_upload_slots_path_key unique (path)
);
create index influence_upload_slots_agreement_idx
  on public.influence_upload_slots (agreement_id, created_at desc);
alter table public.influence_upload_slots enable row level security;
alter table public.influence_upload_slots force row level security;
revoke all on table public.influence_upload_slots from anon, authenticated;

create or replace function public.is_open_influence_slot(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.influence_upload_slots s
                  where s.path = p_path and s.used_at is null and s.expires_at > now());
$$;
revoke execute on function public.is_open_influence_slot(text) from public;
grant execute on function public.is_open_influence_slot(text) to anon, authenticated;

create policy activation_files_objects_insert_creator
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'activation-files' and public.is_open_influence_slot(objects.name));

create or replace function public.open_influence_invoice_slot(p_token text, p_ext text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.influence_agreements%rowtype;
  v_ext text := lower(btrim(coalesce(p_ext, '')));
  v_path text;
begin
  v := public.influence_collab_of(p_token);
  if v.id is null then raise exception 'collaboration_link_closed' using errcode = 'P0001'; end if;
  if public.influence_creator_step(v.target_id) <> 'invoice' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  if v_ext <> '' and v_ext !~ '^[a-z0-9]{1,10}$' then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  v_path := v.organization_id || '/' || v.project_id || '/' || gen_random_uuid()
            || case when v_ext = '' then '' else '.' || v_ext end;
  insert into public.influence_upload_slots (organization_id, agreement_id, path, expires_at)
  values (v.organization_id, v.id, v_path, now() + interval '30 minutes');
  return v_path;
end;
$$;
revoke execute on function public.open_influence_invoice_slot(text, text) from public;
grant execute on function public.open_influence_invoice_slot(text, text) to anon, authenticated;

create or replace function public.submit_influence_invoice_by_token(
  p_token text, p_path text, p_file_name text, p_mime text, p_bytes bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v public.influence_agreements%rowtype;
  v_slot public.influence_upload_slots%rowtype;
  v_file uuid;
begin
  v := public.influence_collab_of(p_token);
  if v.id is null then raise exception 'collaboration_link_closed' using errcode = 'P0001'; end if;
  if public.influence_creator_step(v.target_id) <> 'invoice' then
    raise exception 'invalid_transition' using errcode = 'P0001';
  end if;
  select * into v_slot from public.influence_upload_slots
   where path = p_path and agreement_id = v.id and used_at is null for update;
  if not found or not exists (select 1 from storage.objects o
                               where o.bucket_id = 'activation-files' and o.name = p_path) then
    raise exception 'upload_missing' using errcode = 'P0001';
  end if;
  insert into public.activation_files (organization_id, project_id, activation_id, kind, path,
                                       file_name, mime, bytes, restricted)
  values (v.organization_id, v.project_id, v.activation_id, 'invoice', p_path,
          left(btrim(coalesce(nullif(p_file_name, ''), 'Facture')), 255),
          left(coalesce(nullif(p_mime, ''), 'application/octet-stream'), 255),
          p_bytes, true)
  returning id into v_file;
  update public.influence_upload_slots set used_at = now() where id = v_slot.id;
  perform set_config('pds.influence_payment', 'on', true);
  update public.influence_payments set invoice_file_id = v_file, status = 'to_validate'
   where target_id = v.target_id;
  perform set_config('pds.influence_payment', 'off', true);
  perform public.log_activation_event(v.activation_id, 'payment.invoice_by_creator',
    v.target_id, null, jsonb_build_object('file', v_file), null);
  perform public.influence_creator_notify(v);
end;
$$;
revoke execute on function public.submit_influence_invoice_by_token(text, text, text, text, bigint)
  from public;
grant execute on function public.submit_influence_invoice_by_token(text, text, text, text, bigint)
  to anon, authenticated;
