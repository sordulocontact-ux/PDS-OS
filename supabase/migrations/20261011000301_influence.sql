-- Marketing › Activations › Influence, in-house management (ticket
-- « Influence », parcours A ; docs/ARCHITECTURE.md § 8 duodecies). A
-- collaboration is the activation_target of an influence activation (« une
-- seule Collaboration par campagne et influenceur ») ; everything below hangs
-- on it :
--   1. proposals : each offer or counter-offer is an immutable row ; terms
--      become « validées » only by an explicit decision ;
--   2. express agreement : a minimal page without account (/i/<token>) that
--      shows the exact version of the terms ; « Bon pour accord » or
--      « Demander modification ». Not a qualified electronic signature ;
--   3. rights : organic and advertising, two separate blocks, each accepted,
--      refused, dated and expired on its own ; a change after acceptance is a
--      new row ;
--   4. contents : free versions (V1, V2…), timestamped feedback, a decision
--      on one precise version ;
--   5. administrative payment : an obligation followed, never a transfer.
-- Amounts (proposals, payments) are read by the budget readers only.

-- 1. Proposals and negotiation -------------------------------------------------------------

create table public.influence_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  target_id uuid not null,
  -- Whose position it is : pds, creator.
  party text not null,
  fee_amount numeric(12, 2),
  currency text not null default 'EUR',
  deliverables text,
  schedule text,
  organic_usage text,
  ads_usage text,
  exclusivity text,
  expenses text,
  conditions text,
  note text,
  -- « Un montant négocié ne devient validé qu'après décision explicite. »
  accepted_by uuid references public.people (id),
  accepted_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint influence_proposals_party_check check (party in ('pds', 'creator')),
  constraint influence_proposals_fee_check check (fee_amount is null or fee_amount >= 0),
  constraint influence_proposals_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint influence_proposals_texts_check check (
    coalesce(char_length(deliverables), 0) <= 2000 and coalesce(char_length(schedule), 0) <= 1000
    and coalesce(char_length(organic_usage), 0) <= 1000
    and coalesce(char_length(ads_usage), 0) <= 1000
    and coalesce(char_length(exclusivity), 0) <= 1000
    and coalesce(char_length(expenses), 0) <= 1000
    and coalesce(char_length(conditions), 0) <= 3000 and coalesce(char_length(note), 0) <= 2000),
  constraint influence_proposals_id_org_key unique (id, organization_id),
  constraint influence_proposals_target_same_org foreign key (target_id, organization_id)
    references public.activation_targets (id, organization_id) on delete cascade
);
create index influence_proposals_target_idx on public.influence_proposals (target_id, created_at);

-- Every collaboration child takes its activation and project from the target.
create or replace function public.influence_child_fill()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select t.organization_id, t.project_id, t.activation_id
    into new.organization_id, new.project_id, new.activation_id
    from public.activation_targets t
    join public.marketing_activations a on a.id = t.activation_id
   where t.id = new.target_id and a.kind = 'influence';
  if new.activation_id is null then raise exception 'collaboration_not_found'; end if;
  return new;
end;
$$;
revoke execute on function public.influence_child_fill() from public, anon, authenticated;

create trigger a_fill before insert on public.influence_proposals
  for each row execute function public.influence_child_fill();
create trigger a_set_created_by before insert on public.influence_proposals
  for each row execute function public.set_created_by();

create or replace function public.influence_proposals_journal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.accepted_by := null;
  new.accepted_at := null;
  perform public.log_activation_event(new.activation_id, 'proposal.recorded', new.target_id,
    null, jsonb_build_object('party', new.party, 'proposal', new.id), new.note);
  return new;
end;
$$;
revoke execute on function public.influence_proposals_journal() from public, anon, authenticated;
create trigger b_journal before insert on public.influence_proposals
  for each row execute function public.influence_proposals_journal();

alter table public.influence_proposals enable row level security;
alter table public.influence_proposals force row level security;
revoke all on table public.influence_proposals from anon, authenticated;
grant select on public.influence_proposals to authenticated;
grant insert (organization_id, project_id, activation_id, target_id, party, fee_amount, currency,
              deliverables, schedule, organic_usage,
              ads_usage, exclusivity, expenses, conditions, note)
  on public.influence_proposals to authenticated;
create policy influence_proposals_select on public.influence_proposals
  for select to authenticated using (public.can_read_project_budget(project_id));
create policy influence_proposals_insert on public.influence_proposals
  for insert to authenticated with check (public.activation_can_write(activation_id));

-- « Valider ces conditions » : only the latest position of the collaboration.
create or replace function public.accept_influence_terms(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.influence_proposals%rowtype;
begin
  select * into v from public.influence_proposals where id = p_proposal_id for update;
  if not found or not public.can_read_project_budget(v.project_id) then
    raise exception 'proposal_not_found';
  end if;
  if not public.activation_can_write(v.activation_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.accepted_at is not null or exists (
    select 1 from public.influence_proposals p
     where p.target_id = v.target_id and p.created_at > v.created_at) then
    raise exception 'proposal_not_latest';
  end if;
  update public.influence_proposals
     set accepted_by = public.auth_person_id(), accepted_at = now() where id = v.id;
  perform public.log_activation_event(v.activation_id, 'proposal.terms_accepted', v.target_id,
    null, jsonb_build_object('proposal', v.id), null);
end;
$$;
revoke execute on function public.accept_influence_terms(uuid) from public, anon;
grant execute on function public.accept_influence_terms(uuid) to authenticated;

-- 2. Rights -----------------------------------------------------------------------------------

create table public.influence_rights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  target_id uuid not null,
  -- organic = publication sur les comptes du créateur / republication non
  -- sponsorisée ; ads = whitelisting, Spark Ads, dark posts, amplification.
  kind text not null,
  platforms text[] not null default '{}',
  supports text,
  territory text,
  starts_on date,
  ends_on date,
  -- included, additional.
  remuneration text not null default 'included',
  remuneration_note text,
  modification_allowed boolean not null default false,
  credit_required boolean not null default true,
  restrictions text,
  -- proposed, accepted, refused, revoked.
  status text not null default 'proposed',
  decided_by uuid references public.people (id),
  decided_at timestamptz,
  decision_note text,
  -- A newer row of the same block replaces this one.
  superseded_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint influence_rights_kind_check check (kind in ('organic', 'ads')),
  constraint influence_rights_platforms_check check (cardinality(platforms) <= 12),
  constraint influence_rights_dates_check
    check (starts_on is null or ends_on is null or starts_on <= ends_on),
  constraint influence_rights_remuneration_check
    check (remuneration in ('included', 'additional')),
  constraint influence_rights_texts_check check (
    coalesce(char_length(supports), 0) <= 500 and coalesce(char_length(territory), 0) <= 200
    and coalesce(char_length(remuneration_note), 0) <= 500
    and coalesce(char_length(restrictions), 0) <= 2000
    and coalesce(char_length(decision_note), 0) <= 1000),
  constraint influence_rights_status_check
    check (status in ('proposed', 'accepted', 'refused', 'revoked')),
  constraint influence_rights_target_same_org foreign key (target_id, organization_id)
    references public.activation_targets (id, organization_id) on delete cascade
);
create unique index influence_rights_current_key
  on public.influence_rights (target_id, kind) where superseded_at is null;
create trigger a_fill before insert on public.influence_rights
  for each row execute function public.influence_child_fill();
create trigger a_set_created_by before insert on public.influence_rights
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.influence_rights
  for each row execute function public.set_updated_at();

-- A new block replaces the current one of the same kind ; a block's terms
-- change only while proposed ; decisions go through decide_influence_rights.
create or replace function public.influence_rights_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'proposed';
    new.decided_by := null;
    new.decided_at := null;
    new.superseded_at := null;
    update public.influence_rights set superseded_at = now()
     where target_id = new.target_id and kind = new.kind and superseded_at is null;
    perform public.log_activation_event(new.activation_id, 'rights.proposed', new.target_id,
      null, jsonb_build_object('kind', new.kind), null);
    return new;
  end if;
  if current_setting('pds.influence_rights', true) is distinct from 'on' then
    if new.status is distinct from old.status or old.status <> 'proposed'
       or old.superseded_at is not null then
      raise exception 'rights_not_editable' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.influence_rights_guard() from public, anon, authenticated;
create trigger b_guard before insert or update on public.influence_rights
  for each row execute function public.influence_rights_guard();

alter table public.influence_rights enable row level security;
alter table public.influence_rights force row level security;
revoke all on table public.influence_rights from anon, authenticated;
grant select on public.influence_rights to authenticated;
grant insert (organization_id, project_id, activation_id, target_id, kind, platforms, supports,
              territory, starts_on, ends_on, remuneration,
              remuneration_note, modification_allowed, credit_required, restrictions)
  on public.influence_rights to authenticated;
grant update (platforms, supports, territory, starts_on, ends_on, remuneration,
              remuneration_note, modification_allowed, credit_required, restrictions)
  on public.influence_rights to authenticated;
create policy influence_rights_select on public.influence_rights
  for select to authenticated using (public.can_see_project(project_id));
create policy influence_rights_insert on public.influence_rights
  for insert to authenticated with check (public.activation_can_write(activation_id));
create policy influence_rights_update on public.influence_rights
  for update to authenticated
  using (public.activation_can_write(activation_id))
  with check (public.activation_can_write(activation_id));

-- accept / refuse (recorded by PDS, with how it was obtained) / revoke.
create or replace function public.decide_influence_rights(
  p_rights_id uuid, p_decision text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.influence_rights%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select * into v from public.influence_rights where id = p_rights_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'rights_not_found';
  end if;
  if not public.activation_can_write(v.activation_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.superseded_at is not null
     or (p_decision in ('accepted', 'refused') and v.status <> 'proposed')
     or (p_decision = 'revoked' and v.status <> 'accepted')
     or p_decision not in ('accepted', 'refused', 'revoked') then
    raise exception 'invalid_transition';
  end if;
  if p_decision <> 'accepted' and v_note is null then
    raise exception 'comment_required' using errcode = '23514';
  end if;
  perform set_config('pds.influence_rights', 'on', true);
  update public.influence_rights
     set status = p_decision, decided_by = public.auth_person_id(), decided_at = now(),
         decision_note = left(v_note, 1000)
   where id = v.id;
  perform set_config('pds.influence_rights', 'off', true);
  perform public.log_activation_event(v.activation_id, 'rights.' || p_decision, v.target_id,
    null, jsonb_build_object('kind', v.kind), v_note);
end;
$$;
revoke execute on function public.decide_influence_rights(uuid, text, text) from public, anon;
grant execute on function public.decide_influence_rights(uuid, text, text) to authenticated;

-- 3. Express agreement ---------------------------------------------------------------------

create table public.influence_agreements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  target_id uuid not null,
  -- The accepted terms this agreement is for.
  proposal_id uuid not null,
  token_hash text not null,
  expires_at timestamptz not null,
  -- pending, accepted, change_requested, revoked.
  status text not null default 'pending',
  -- The exact version shown (terms + rights), and its fingerprint.
  content jsonb not null,
  content_hash text not null,
  displayed_at timestamptz,
  identity_name text,
  decided_at timestamptz,
  comment text,
  evidence jsonb,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint influence_agreements_token_key unique (token_hash),
  constraint influence_agreements_status_check
    check (status in ('pending', 'accepted', 'change_requested', 'revoked')),
  constraint influence_agreements_identity_check
    check (identity_name is null or (btrim(identity_name) <> '' and char_length(identity_name) <= 200)),
  constraint influence_agreements_comment_check check (comment is null or char_length(comment) <= 2000),
  constraint influence_agreements_target_same_org foreign key (target_id, organization_id)
    references public.activation_targets (id, organization_id) on delete cascade,
  constraint influence_agreements_proposal_same_org foreign key (proposal_id, organization_id)
    references public.influence_proposals (id, organization_id) on delete cascade
);
create index influence_agreements_target_idx on public.influence_agreements (target_id, created_at);
alter table public.influence_agreements enable row level security;
alter table public.influence_agreements force row level security;
revoke all on table public.influence_agreements from anon, authenticated;
-- token_hash is never read by a client.
grant select (id, organization_id, project_id, activation_id, target_id, proposal_id,
              expires_at, status, content, content_hash, displayed_at, identity_name,
              decided_at, comment, created_by, created_at)
  on public.influence_agreements to authenticated;
create policy influence_agreements_select on public.influence_agreements
  for select to authenticated using (public.can_read_project_budget(project_id));

-- The terms and current rights blocks of a collaboration, as shown.
create or replace function public.influence_agreement_content(p_proposal_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'project', pr.title,
    'campaign', a.title,
    'creator', c.name,
    'terms', jsonb_build_object(
      'fee', p.fee_amount, 'currency', p.currency, 'deliverables', p.deliverables,
      'schedule', p.schedule, 'organic_usage', p.organic_usage, 'ads_usage', p.ads_usage,
      'exclusivity', p.exclusivity, 'expenses', p.expenses, 'conditions', p.conditions),
    'rights', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id, 'kind', r.kind, 'platforms', r.platforms, 'supports', r.supports,
               'territory', r.territory, 'starts_on', r.starts_on, 'ends_on', r.ends_on,
               'remuneration', r.remuneration, 'remuneration_note', r.remuneration_note,
               'modification_allowed', r.modification_allowed,
               'credit_required', r.credit_required, 'restrictions', r.restrictions)
             order by r.kind)
        from public.influence_rights r
       where r.target_id = p.target_id and r.superseded_at is null
         and r.status in ('proposed', 'accepted')), '[]'::jsonb))
    from public.influence_proposals p
    join public.activation_targets t on t.id = p.target_id
    join public.network_contacts c on c.id = t.contact_id
    join public.marketing_activations a on a.id = p.activation_id
    join public.projects pr on pr.id = p.project_id
   where p.id = p_proposal_id;
$$;
revoke execute on function public.influence_agreement_content(uuid) from public, anon, authenticated;

-- « Préparer le lien d'accord » : terms accepted by PDS and still the latest ;
-- the previous pending link is revoked. Returns the token once (only its hash
-- is kept).
create or replace function public.prepare_influence_agreement(p_proposal_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.influence_proposals%rowtype;
  v_content jsonb;
  v_token text;
begin
  select * into v from public.influence_proposals where id = p_proposal_id;
  if not found or not public.can_read_project_budget(v.project_id) then
    raise exception 'proposal_not_found';
  end if;
  if not public.activation_can_write(v.activation_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.accepted_at is null or exists (
    select 1 from public.influence_proposals p
     where p.target_id = v.target_id and p.created_at > v.created_at) then
    raise exception 'terms_not_accepted';
  end if;
  update public.influence_agreements set status = 'revoked'
   where target_id = v.target_id and status = 'pending';
  v_content := public.influence_agreement_content(v.id);
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.influence_agreements
    (organization_id, project_id, activation_id, target_id, proposal_id, token_hash, expires_at,
     content, content_hash, created_by)
  values (v.organization_id, v.project_id, v.activation_id, v.target_id, v.id,
          encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), now() + interval '30 days',
          v_content, encode(sha256(convert_to(v_content::text, 'UTF8')), 'hex'),
          public.auth_person_id());
  perform public.log_activation_event(v.activation_id, 'agreement.prepared', v.target_id, null,
    jsonb_build_object('proposal', v.id), null);
  return v_token;
end;
$$;
revoke execute on function public.prepare_influence_agreement(uuid) from public, anon;
grant execute on function public.prepare_influence_agreement(uuid) to authenticated;

create or replace function public.revoke_influence_agreement(p_agreement_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.influence_agreements%rowtype;
begin
  select * into v from public.influence_agreements where id = p_agreement_id for update;
  if not found or not public.can_read_project_budget(v.project_id) then
    raise exception 'agreement_not_found';
  end if;
  if not public.activation_can_write(v.activation_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.status <> 'pending' then raise exception 'invalid_transition'; end if;
  update public.influence_agreements set status = 'revoked' where id = v.id;
  perform public.log_activation_event(v.activation_id, 'agreement.revoked', v.target_id, null,
                                      null, null);
end;
$$;
revoke execute on function public.revoke_influence_agreement(uuid) from public, anon;
grant execute on function public.revoke_influence_agreement(uuid) to authenticated;

-- The public page (anon) : the token is the key. The first display is noted
-- (« preuve d'affichage »).
create or replace function public.get_influence_agreement(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.influence_agreements%rowtype;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  select * into v from public.influence_agreements
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') for update;
  if not found then return null; end if;
  if v.status <> 'pending' then
    return jsonb_build_object('state', v.status);
  end if;
  if v.expires_at < now() then return jsonb_build_object('state', 'expired'); end if;
  if v.displayed_at is null then
    update public.influence_agreements set displayed_at = now() where id = v.id;
    perform public.log_activation_event(v.activation_id, 'agreement.viewed', v.target_id, null,
                                        null, null);
  end if;
  return jsonb_build_object('state', 'open', 'content', v.content, 'hash', v.content_hash);
end;
$$;
revoke execute on function public.get_influence_agreement(text) from public;
grant execute on function public.get_influence_agreement(text) to anon, authenticated;

-- « Bon pour accord » (name and consent required, exact version) or
-- « Demander modification » (comment required : it becomes the creator's
-- position in the negotiation, and the terms are no longer accepted).
create or replace function public.respond_influence_agreement(
  p_token text, p_decision text, p_name text, p_comment text, p_hash text, p_consent boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.influence_agreements%rowtype;
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_headers jsonb;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'agreement_link_closed' using errcode = 'P0001';
  end if;
  select * into v from public.influence_agreements
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') for update;
  if not found or v.status <> 'pending' or v.expires_at < now() or v.displayed_at is null then
    raise exception 'agreement_link_closed' using errcode = 'P0001';
  end if;
  if p_hash is distinct from v.content_hash then
    raise exception 'agreement_content_changed' using errcode = 'P0001';
  end if;
  if p_decision = 'accept' and (v_name is null or char_length(v_name) > 200
                                or p_consent is distinct from true) then
    raise exception 'agreement_identity_required' using errcode = 'P0001';
  end if;
  if p_decision = 'change' and v_comment is null then
    raise exception 'agreement_comment_required' using errcode = 'P0001';
  end if;
  if p_decision not in ('accept', 'change') then
    raise exception 'agreement_decision_invalid' using errcode = 'P0001';
  end if;
  begin
    v_headers := current_setting('request.headers', true)::jsonb;
  exception when others then
    v_headers := null;
  end;
  update public.influence_agreements
     set status = case p_decision when 'accept' then 'accepted' else 'change_requested' end,
         identity_name = left(v_name, 200), decided_at = now(), comment = left(v_comment, 2000),
         evidence = jsonb_build_object(
           'content_hash', v.content_hash, 'displayed_at', v.displayed_at,
           'decided_at', now(), 'consent', p_consent,
           'user_agent', left(coalesce(v_headers ->> 'user-agent', ''), 300))
   where id = v.id;
  if p_decision = 'accept' then
    perform set_config('pds.influence_rights', 'on', true);
    update public.influence_rights
       set status = 'accepted', decided_at = now(), decided_by = null,
           decision_note = 'Bon pour accord'
     where target_id = v.target_id and superseded_at is null and status = 'proposed'
       and id in (select (r ->> 'id')::uuid from jsonb_array_elements(v.content -> 'rights') r);
    perform set_config('pds.influence_rights', 'off', true);
  else
    insert into public.influence_proposals
      (organization_id, project_id, activation_id, target_id, party, note)
    values (v.organization_id, v.project_id, v.activation_id, v.target_id, 'creator',
            left(v_comment, 2000));
  end if;
  perform public.log_activation_event(v.activation_id,
    case p_decision when 'accept' then 'agreement.accepted' else 'agreement.change_requested' end,
    v.target_id, null, jsonb_build_object('name', v_name), v_comment);
  return case p_decision when 'accept' then 'accepted' else 'change_requested' end;
end;
$$;
revoke execute on function public.respond_influence_agreement(text, text, text, text, text, boolean)
  from public;
grant execute on function public.respond_influence_agreement(text, text, text, text, text, boolean)
  to anon, authenticated;

-- 4. Contents, versions and feedback -------------------------------------------------------

create table public.influence_contents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  target_id uuid not null,
  -- Free : « V1 », « V2 montage court »…
  label text not null,
  url text,
  file_id uuid,
  note text,
  -- approved, changes_requested, refused : a decision on this very version.
  decision text,
  decided_by uuid references public.people (id),
  decided_at timestamptz,
  decision_comment text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint influence_contents_label_check check (btrim(label) <> '' and char_length(label) <= 80),
  constraint influence_contents_url_check
    check (url is null or (char_length(url) <= 2000 and url ~ '^https?://\S+$')),
  constraint influence_contents_media_check check (url is not null or file_id is not null),
  constraint influence_contents_note_check check (note is null or char_length(note) <= 2000),
  constraint influence_contents_decision_check
    check (decision is null or decision in ('approved', 'changes_requested', 'refused')),
  constraint influence_contents_comment_check
    check (decision_comment is null or char_length(decision_comment) <= 2000),
  constraint influence_contents_id_org_key unique (id, organization_id),
  constraint influence_contents_target_same_org foreign key (target_id, organization_id)
    references public.activation_targets (id, organization_id) on delete cascade,
  constraint influence_contents_file_same_org foreign key (file_id, organization_id)
    references public.activation_files (id, organization_id)
);
create index influence_contents_target_idx on public.influence_contents (target_id, created_at);
create trigger a_fill before insert on public.influence_contents
  for each row execute function public.influence_child_fill();
create trigger a_set_created_by before insert on public.influence_contents
  for each row execute function public.set_created_by();

create or replace function public.influence_contents_journal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.decision := null;
  new.decided_by := null;
  new.decided_at := null;
  new.decision_comment := null;
  perform public.log_activation_event(new.activation_id, 'content.submitted', new.target_id,
    null, jsonb_build_object('label', new.label, 'content', new.id), new.note);
  return new;
end;
$$;
revoke execute on function public.influence_contents_journal() from public, anon, authenticated;
create trigger b_journal before insert on public.influence_contents
  for each row execute function public.influence_contents_journal();

alter table public.influence_contents enable row level security;
alter table public.influence_contents force row level security;
revoke all on table public.influence_contents from anon, authenticated;
grant select on public.influence_contents to authenticated;
grant insert (organization_id, project_id, activation_id, target_id, label, url, file_id, note)
  on public.influence_contents to authenticated;
create policy influence_contents_select on public.influence_contents
  for select to authenticated using (public.can_see_project(project_id));
create policy influence_contents_insert on public.influence_contents
  for insert to authenticated with check (public.activation_can_write(activation_id));

-- « Valider / Demander corrections / Refuser » one version : the writer or a
-- PDS validator ; a comment unless approved ; once.
create or replace function public.decide_influence_content(
  p_content_id uuid, p_decision text, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.influence_contents%rowtype;
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  select * into v from public.influence_contents where id = p_content_id for update;
  if not found or not public.can_see_project(v.project_id) then
    raise exception 'content_not_found';
  end if;
  if not (public.activation_can_write(v.activation_id)
          or public.marketing_can_validate(v.project_id)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v.decision is not null then raise exception 'already_decided'; end if;
  if p_decision not in ('approved', 'changes_requested', 'refused') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if p_decision <> 'approved' and v_comment is null then
    raise exception 'comment_required' using errcode = '23514';
  end if;
  update public.influence_contents
     set decision = p_decision, decided_by = public.auth_person_id(), decided_at = now(),
         decision_comment = left(v_comment, 2000)
   where id = v.id;
  perform public.log_activation_event(v.activation_id, 'content.' || p_decision, v.target_id,
    null, jsonb_build_object('content', v.id, 'label', v.label), v_comment);
end;
$$;
revoke execute on function public.decide_influence_content(uuid, text, text) from public, anon;
grant execute on function public.decide_influence_content(uuid, text, text) to authenticated;

create table public.influence_feedback (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  content_id uuid not null,
  timecode text,
  -- image, sound, text, brand, legal, other.
  category text not null default 'other',
  comment text not null,
  -- open, sent_declared, declared_fixed (« corrigé déclaré »), resolved, dropped.
  status text not null default 'open',
  status_by uuid references public.people (id),
  status_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint influence_feedback_timecode_check
    check (timecode is null or timecode ~ '^\d{1,2}(:\d{2}){1,2}$'),
  constraint influence_feedback_category_check
    check (category in ('image', 'sound', 'text', 'brand', 'legal', 'other')),
  constraint influence_feedback_comment_check
    check (btrim(comment) <> '' and char_length(comment) <= 2000),
  constraint influence_feedback_status_check check (status in (
    'open', 'sent_declared', 'declared_fixed', 'resolved', 'dropped')),
  constraint influence_feedback_content_same_org foreign key (content_id, organization_id)
    references public.influence_contents (id, organization_id) on delete cascade
);
create index influence_feedback_content_idx on public.influence_feedback (content_id, created_at);
create trigger a_set_created_by before insert on public.influence_feedback
  for each row execute function public.set_created_by();

create or replace function public.influence_feedback_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    select c.organization_id, c.project_id into new.organization_id, new.project_id
      from public.influence_contents c where c.id = new.content_id;
    if new.project_id is null then raise exception 'content_not_found'; end if;
    new.status := 'open';
    new.status_by := null;
    new.status_at := null;
  elsif new.status is distinct from old.status then
    new.status_by := public.auth_person_id();
    new.status_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.influence_feedback_guard() from public, anon, authenticated;
create trigger b_guard before insert or update on public.influence_feedback
  for each row execute function public.influence_feedback_guard();

alter table public.influence_feedback enable row level security;
alter table public.influence_feedback force row level security;
revoke all on table public.influence_feedback from anon, authenticated;
grant select on public.influence_feedback to authenticated;
grant insert (organization_id, project_id, content_id, timecode, category, comment)
  on public.influence_feedback to authenticated;
grant update (status) on public.influence_feedback to authenticated;
create policy influence_feedback_select on public.influence_feedback
  for select to authenticated using (public.can_see_project(project_id));
create policy influence_feedback_insert on public.influence_feedback
  for insert to authenticated
  with check (exists (select 1 from public.influence_contents c
                       where c.id = content_id
                         and (public.activation_can_write(c.activation_id)
                              or public.marketing_can_validate(c.project_id))));
create policy influence_feedback_update on public.influence_feedback
  for update to authenticated
  using (exists (select 1 from public.influence_contents c
                  where c.id = content_id
                    and (public.activation_can_write(c.activation_id)
                         or public.marketing_can_validate(c.project_id))))
  with check (true);

-- 5. Administrative payment ------------------------------------------------------------------

create table public.influence_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  activation_id uuid not null,
  target_id uuid not null,
  amount numeric(12, 2) not null,
  currency text not null default 'EUR',
  beneficiary text,
  documents_requested text,
  invoice_file_id uuid,
  due_on date,
  -- not_requested, document_expected, to_validate, ready_to_pay (bon à
  -- payer), paid_declared, paid_verified, dispute.
  status text not null default 'not_requested',
  status_note text,
  proof_file_id uuid,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint influence_payments_amount_check check (amount >= 0),
  constraint influence_payments_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint influence_payments_texts_check check (
    coalesce(char_length(beneficiary), 0) <= 200
    and coalesce(char_length(documents_requested), 0) <= 1000
    and coalesce(char_length(status_note), 0) <= 1000),
  constraint influence_payments_status_check check (status in (
    'not_requested', 'document_expected', 'to_validate', 'ready_to_pay', 'paid_declared',
    'paid_verified', 'dispute')),
  constraint influence_payments_proof_check
    check (status <> 'paid_verified' or proof_file_id is not null),
  constraint influence_payments_target_same_org foreign key (target_id, organization_id)
    references public.activation_targets (id, organization_id) on delete cascade,
  constraint influence_payments_invoice_same_org foreign key (invoice_file_id, organization_id)
    references public.activation_files (id, organization_id),
  constraint influence_payments_proof_same_org foreign key (proof_file_id, organization_id)
    references public.activation_files (id, organization_id)
);
create unique index influence_payments_target_key on public.influence_payments (target_id);
create trigger a_fill before insert on public.influence_payments
  for each row execute function public.influence_child_fill();
create trigger a_set_created_by before insert on public.influence_payments
  for each row execute function public.set_created_by();
create trigger a_set_updated_at before update on public.influence_payments
  for each row execute function public.set_updated_at();

create or replace function public.influence_payments_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'not_requested';
    new.proof_file_id := null;
  elsif current_setting('pds.influence_payment', true) is distinct from 'on'
        and (new.status is distinct from old.status
             or new.proof_file_id is distinct from old.proof_file_id) then
    raise exception 'use_advance_influence_payment' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.influence_payments_guard() from public, anon, authenticated;
create trigger b_guard before insert or update on public.influence_payments
  for each row execute function public.influence_payments_guard();

alter table public.influence_payments enable row level security;
alter table public.influence_payments force row level security;
revoke all on table public.influence_payments from anon, authenticated;
grant select on public.influence_payments to authenticated;
grant insert (organization_id, project_id, activation_id, target_id, amount, currency, beneficiary,
              documents_requested, invoice_file_id, due_on)
  on public.influence_payments to authenticated;
grant update (amount, currency, beneficiary, documents_requested, invoice_file_id, due_on)
  on public.influence_payments to authenticated;
create policy influence_payments_select on public.influence_payments
  for select to authenticated using (public.can_read_project_budget(project_id));
create policy influence_payments_insert on public.influence_payments
  for insert to authenticated
  with check (public.activation_can_write(activation_id)
              and public.can_read_project_budget(project_id));
create policy influence_payments_update on public.influence_payments
  for update to authenticated
  using (public.activation_can_write(activation_id) and public.can_read_project_budget(project_id))
  with check (public.activation_can_write(activation_id));

-- The status, human-moved. « Bon à payer » needs an accepted agreement (link
-- or terms accepted on the latest position) ; « Payé vérifié » needs a
-- restricted proof file. No transfer is ever made.
create or replace function public.advance_influence_payment(
  p_payment_id uuid, p_status text, p_note text, p_proof_file_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.influence_payments%rowtype;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  select * into v from public.influence_payments where id = p_payment_id for update;
  if not found or not public.can_read_project_budget(v.project_id) then
    raise exception 'payment_not_found';
  end if;
  if not public.activation_can_write(v.activation_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_status not in ('not_requested', 'document_expected', 'to_validate', 'ready_to_pay',
                      'paid_declared', 'paid_verified', 'dispute') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  if p_status = 'ready_to_pay' and not exists (
    select 1 from public.influence_agreements g
     where g.target_id = v.target_id and g.status = 'accepted') then
    raise exception 'agreement_required';
  end if;
  if p_status = 'paid_verified' and (p_proof_file_id is null or not exists (
    select 1 from public.activation_files f
     where f.id = p_proof_file_id and f.activation_id = v.activation_id
       and f.kind = 'payment_proof')) then
    raise exception 'proof_required';
  end if;
  if p_status = 'dispute' and v_note is null then
    raise exception 'comment_required' using errcode = '23514';
  end if;
  perform set_config('pds.influence_payment', 'on', true);
  update public.influence_payments
     set status = p_status, status_note = left(v_note, 1000),
         proof_file_id = case when p_status = 'paid_verified' then p_proof_file_id
                              else proof_file_id end
   where id = v.id;
  perform set_config('pds.influence_payment', 'off', true);
  perform public.log_activation_event(v.activation_id, 'payment.status', v.target_id,
    jsonb_build_object('status', v.status), jsonb_build_object('status', p_status), v_note);
end;
$$;
revoke execute on function public.advance_influence_payment(uuid, text, text, uuid) from public, anon;
grant execute on function public.advance_influence_payment(uuid, text, text, uuid) to authenticated;
