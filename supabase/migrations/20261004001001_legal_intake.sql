-- Juridique, lot 2: the Cadrage juridique (ticket Juridique 01,
-- docs/ARCHITECTURE.md § 8 sexies). PO asks one question at a time about
-- what the project does not know yet; a free answer becomes facts the
-- person reviews before they are kept.
--
-- From the ticket:
--   * « Session de cadrage : DRAFT → CONFIRMED » → legal_intakes.status
--     (confirmation itself is the next step, lot 3);
--   * every structuring datum keeps value, status, source, declarant,
--     confirmer, evidence and timestamp → legal_facts;
--   * statuses CONNU, DÉDUIT, DÉCLARÉ, CONFIRMÉ, MANQUANT, À_VÉRIFIER,
--     SIMULÉ → stored as is (the screen groups them in three);
--   * « Une correction crée une nouvelle valeur active, conserve
--     l'historique » → a new answer supersedes the facts of the previous
--     one (superseded_by_answer_id), nothing is deleted;
--   * « La détection d'un élément tiers crée une Clearance non sécurisée ;
--     elle ne crée jamais une autorisation implicite » → legal_clearances,
--     born to_investigate (states of ticket Juridique 05).
--
-- Free answers are data, never instructions (CLAUDE.md, rule 4). The model
-- only proposes; facts are written by record_legal_answer once the person
-- has reviewed them, with status 'declared' (declared by that person).
--
-- Read: manage_legal on a project the viewer sees. Written only through
-- record_legal_answer (security definer, same checks): no direct writes.

create table public.legal_intakes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  project_id uuid not null,
  status text not null default 'draft',
  created_by uuid references public.people (id),
  confirmed_by uuid references public.people (id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_intakes_status_check check (status in ('draft', 'confirmed')),
  constraint legal_intakes_confirmed_check
    check ((status = 'confirmed') = (confirmed_at is not null)),
  constraint legal_intakes_project_key unique (project_id),
  constraint legal_intakes_id_project_key unique (id, project_id),
  constraint legal_intakes_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
);

create table public.legal_answers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  intake_id uuid not null,
  project_id uuid not null,
  question_key text not null,
  -- The title the question was about; null for a project-wide question.
  master_id uuid,
  text text not null,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint legal_answers_question_check
    check (question_key in ('contributors', 'third_party', 'publisher', 'agreements')),
  constraint legal_answers_text_check check (btrim(text) <> '' and char_length(text) <= 4000),
  constraint legal_answers_id_project_key unique (id, project_id),
  constraint legal_answers_intake_fk
    foreign key (intake_id, project_id) references public.legal_intakes (id, project_id),
  constraint legal_answers_master_same_org
    foreign key (master_id, organization_id) references public.masters (id, organization_id)
);

create index legal_answers_intake_idx on public.legal_answers (intake_id, created_at);

create table public.legal_facts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  intake_id uuid not null,
  project_id uuid not null,
  question_key text not null,
  master_id uuid,
  kind text not null,
  -- The structured value ({ name, role }, { element, work, author }…),
  -- checked by the application's schema.
  value jsonb not null,
  status text not null,
  source_type text not null,
  answer_id uuid,
  -- The words of the answer the fact was read from, as typed.
  source_quote text,
  declared_by uuid references public.people (id),
  confirmed_by uuid references public.people (id),
  -- A document proving it (contract, authorization): later tickets.
  evidence_id uuid,
  effective_at timestamptz not null default now(),
  -- Set when a later answer to the same question replaced this fact.
  superseded_by_answer_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_facts_kind_check
    check (kind in ('contribution', 'third_party', 'publisher', 'agreement', 'none')),
  constraint legal_facts_value_check check (jsonb_typeof(value) = 'object'),
  constraint legal_facts_status_check check (status in (
    'known', 'deduced', 'declared', 'confirmed', 'missing', 'to_verify', 'simulated')),
  constraint legal_facts_source_check check (source_type in ('answer', 'existing', 'manual')),
  constraint legal_facts_answer_source check ((source_type = 'answer') = (answer_id is not null)),
  constraint legal_facts_quote_check check (source_quote is null or char_length(source_quote) <= 500),
  constraint legal_facts_intake_fk
    foreign key (intake_id, project_id) references public.legal_intakes (id, project_id),
  constraint legal_facts_answer_fk
    foreign key (answer_id, project_id) references public.legal_answers (id, project_id),
  constraint legal_facts_superseded_fk
    foreign key (superseded_by_answer_id, project_id) references public.legal_answers (id, project_id),
  constraint legal_facts_master_same_org
    foreign key (master_id, organization_id) references public.masters (id, organization_id)
);

create index legal_facts_active_idx
  on public.legal_facts (intake_id, question_key, master_id)
  where superseded_by_answer_id is null;

-- A third-party element to secure (ticket Juridique 05: TO_INVESTIGATE →
-- … → CLEARED, exceptions REFUSED / ABANDONED / ACTION_REQUIRED). Only its
-- birth exists for now; nothing here is an authorization.
create table public.legal_clearances (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  project_id uuid not null,
  master_id uuid,
  element text not null,
  work text not null,
  author text,
  status text not null default 'to_investigate',
  responsible_person_id uuid references public.people (id),
  source_fact_id uuid references public.legal_facts (id),
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_clearances_element_check
    check (element in ('topline', 'sample', 'interpolation', 'cover', 'other')),
  constraint legal_clearances_work_check check (btrim(work) <> '' and char_length(work) <= 300),
  constraint legal_clearances_author_check
    check (author is null or (btrim(author) <> '' and char_length(author) <= 300)),
  constraint legal_clearances_status_check check (status in (
    'to_investigate', 'rightsholders_identified', 'contacted', 'waiting_external', 'negotiating',
    'agreement_reached', 'document_pending', 'signed', 'cleared', 'refused', 'abandoned',
    'action_required')),
  constraint legal_clearances_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id),
  constraint legal_clearances_master_same_org
    foreign key (master_id, organization_id) references public.masters (id, organization_id)
);

create index legal_clearances_project_idx on public.legal_clearances (project_id, created_at);

-- RLS: read with manage_legal on a visible project; no direct write -------
do $$
declare
  t text;
begin
  foreach t in array array['legal_intakes', 'legal_answers', 'legal_facts', 'legal_clearances']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated
                      using (public.has_permission(organization_id, ''manage_legal'')
                             and public.can_see_project(project_id))', t || '_select_legal', t);
  end loop;
end;
$$;

create trigger a_set_updated_at before update on public.legal_intakes
  for each row execute function public.set_updated_at();
create trigger a_set_updated_at before update on public.legal_facts
  for each row execute function public.set_updated_at();
create trigger a_set_updated_at before update on public.legal_clearances
  for each row execute function public.set_updated_at();

-- record_legal_answer --------------------------------------------------------
-- Keeps one reviewed answer and its facts, atomically:
--   1. opens the project's intake if needed;
--   2. stores the answer as typed;
--   3. supersedes the active facts of the same question (and title), and
--      drops the clearances they had opened while still untouched;
--   4. writes each fact as 'declared' by the caller, with its quote; a
--      third-party element as 'to_verify' (ticket Juridique 05: the work,
--      its rightsholders and the attribution stay À_VÉRIFIER);
--   5. creates the minimum objects: a contribution becomes a credit of the
--      title (when the caller holds manage_catalog and the title is live,
--      unless the same name already has that role), a third-party element
--      a clearance to investigate.
-- p_facts: [{ "kind", "value", "quote" }], at most 30.
create or replace function public.record_legal_answer(
  p_project_id uuid,
  p_question_key text,
  p_master_id uuid,
  p_text text,
  p_facts jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_person uuid := public.auth_person_id();
  v_intake uuid;
  v_answer uuid;
  v_fact jsonb;
  v_fact_id uuid;
  v_kind text;
  v_value jsonb;
  v_quote text;
  v_name text;
  v_role text;
begin
  select organization_id into v_org from public.projects where id = p_project_id;
  if v_org is null or v_person is null
     or not public.has_permission(v_org, 'manage_legal')
     or not public.can_see_project(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_question_key not in ('contributors', 'third_party', 'publisher', 'agreements') then
    raise exception 'legal_unknown_question' using errcode = 'P0001';
  end if;
  -- Title questions name a title of this project; the agreements none.
  if (p_question_key = 'agreements') <> (p_master_id is null) then
    raise exception 'legal_question_scope' using errcode = 'P0001';
  end if;
  if p_master_id is not null and not exists (
    select 1 from public.project_masters
     where project_id = p_project_id and master_id = p_master_id
  ) then
    raise exception 'legal_master_not_in_project' using errcode = 'P0001';
  end if;
  if jsonb_typeof(coalesce(p_facts, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_facts, '[]'::jsonb)) > 30 then
    raise exception 'legal_facts_invalid' using errcode = 'P0001';
  end if;

  insert into public.legal_intakes (organization_id, project_id, created_by)
  values (v_org, p_project_id, v_person)
  on conflict (project_id) do nothing;
  select id into v_intake from public.legal_intakes where project_id = p_project_id;

  insert into public.legal_answers
    (organization_id, intake_id, project_id, question_key, master_id, text, created_by)
  values (v_org, v_intake, p_project_id, p_question_key, p_master_id, btrim(p_text), v_person)
  returning id into v_answer;

  -- A clearance nobody has worked on yet goes with the fact it came from.
  delete from public.legal_clearances c
   using public.legal_facts f
   where c.source_fact_id = f.id
     and c.status = 'to_investigate'
     and f.intake_id = v_intake
     and f.question_key = p_question_key
     and f.master_id is not distinct from p_master_id
     and f.superseded_by_answer_id is null;
  update public.legal_facts
     set superseded_by_answer_id = v_answer
   where intake_id = v_intake
     and question_key = p_question_key
     and master_id is not distinct from p_master_id
     and superseded_by_answer_id is null;

  for v_fact in select * from jsonb_array_elements(coalesce(p_facts, '[]'::jsonb))
  loop
    v_kind := v_fact ->> 'kind';
    v_value := v_fact -> 'value';
    v_quote := nullif(btrim(coalesce(v_fact ->> 'quote', '')), '');
    insert into public.legal_facts
      (organization_id, intake_id, project_id, question_key, master_id, kind, value, status,
       source_type, answer_id, source_quote, declared_by)
    values (v_org, v_intake, p_project_id, p_question_key, p_master_id, v_kind,
            coalesce(v_value, '{}'::jsonb),
            case when v_kind = 'third_party' then 'to_verify' else 'declared' end,
            'answer', v_answer, left(v_quote, 500), v_person)
    returning id into v_fact_id;

    if v_kind = 'contribution' and p_master_id is not null then
      v_name := btrim(coalesce(v_value ->> 'name', ''));
      v_role := v_value ->> 'role';
      if v_name <> '' and v_role in ('composer', 'lyricist', 'arranger', 'producer',
                                     'co_producer', 'recording_engineer', 'mix_engineer',
                                     'mastering_engineer', 'musician', 'other')
         and public.has_permission(v_org, 'manage_catalog')
         and public.master_is_live(p_master_id)
         and not exists (
           select 1 from public.master_contributors
            where master_id = p_master_id and role = v_role
              and lower(btrim(name)) = lower(v_name)
         ) then
        insert into public.master_contributors (organization_id, master_id, name, role, created_by)
        values (v_org, p_master_id, left(v_name, 200), v_role, v_person);
      end if;
    elsif v_kind = 'third_party' then
      insert into public.legal_clearances
        (organization_id, project_id, master_id, element, work, author, source_fact_id, created_by)
      values (v_org, p_project_id, p_master_id,
              coalesce(nullif(v_value ->> 'element', ''), 'other'),
              left(btrim(v_value ->> 'work'), 300),
              left(nullif(btrim(coalesce(v_value ->> 'author', '')), ''), 300),
              v_fact_id, v_person);
    end if;
  end loop;

  return v_answer;
end;
$$;

revoke execute on function public.record_legal_answer(uuid, text, uuid, text, jsonb)
  from public, anon;
grant execute on function public.record_legal_answer(uuid, text, uuid, text, jsonb)
  to authenticated;
