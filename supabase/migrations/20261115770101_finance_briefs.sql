-- Finance › Vue d'ensemble, « Résumé de la semaine » (lot 7 of the new style,
-- docs/FINANCE-V2.md; after Midday's weekly summary, docs/ANALYSE-MIDDAY.md
-- § 4.2): the code computes and chooses the figures (« slots »), PO words
-- them in 2-3 sentences, the code checks that every figure of the wording
-- is one of the slots (lib/assistant/finance-brief/). The checked wording is
-- kept here so the model is called once per label, Paris day and set of
-- figures, not on every visit.
--
-- Read by whoever reads Finance. Written by the visit that made it, with the
-- member's session: today's day only, by the member itself (created_by is
-- the session's person), never changed or deleted by a client. The code
-- checks a kept wording again on every reading, so a row written by hand
-- with other figures is never shown. Twelve rows a day per label at most
-- (the code stops at six); rows older than 30 days go at the next insert.

create table public.finance_briefs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  day date not null,
  -- sha256 of the slots, in hex: the same figures give the same wording.
  fingerprint text not null,
  -- The slots the wording was checked against (sentence and figures each).
  slots jsonb not null,
  text text not null,
  model text,
  created_by uuid default public.auth_person_id()
    references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint finance_briefs_one_per_figures unique (organization_id, day, fingerprint),
  constraint finance_briefs_fingerprint_check check (fingerprint ~ '^[0-9a-f]{64}$'),
  constraint finance_briefs_text_check
    check (btrim(text) <> '' and char_length(text) <= 400),
  constraint finance_briefs_slots_check
    check (jsonb_typeof(slots) = 'array' and octet_length(slots::text) <= 8000),
  constraint finance_briefs_model_check check (model is null or char_length(model) <= 100)
);

create index finance_briefs_day_idx on public.finance_briefs (organization_id, day);

-- At most twelve a day per label; the old ones go.
create or replace function public.finance_briefs_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.finance_briefs
       where organization_id = new.organization_id and day = new.day) >= 12 then
    raise exception 'finance_briefs_daily_limit' using errcode = 'check_violation';
  end if;
  delete from public.finance_briefs
   where organization_id = new.organization_id and day < new.day - 30;
  return new;
end;
$$;

revoke execute on function public.finance_briefs_before_insert() from public, anon, authenticated;

create trigger finance_briefs_before_insert before insert on public.finance_briefs
  for each row execute function public.finance_briefs_before_insert();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.finance_briefs enable row level security;
alter table public.finance_briefs force row level security;

revoke all on table public.finance_briefs from anon, authenticated;
grant select on table public.finance_briefs to authenticated;
grant insert (organization_id, day, fingerprint, slots, text, model)
  on table public.finance_briefs to authenticated;

create policy finance_briefs_select
  on public.finance_briefs for select to authenticated
  using (public.has_permission(organization_id, 'read_finance'));

create policy finance_briefs_insert
  on public.finance_briefs for insert to authenticated
  with check (
    organization_id = public.auth_organization_id()
    and public.has_permission(organization_id, 'read_finance')
    and created_by = public.auth_person_id()
    and day = (now() at time zone 'Europe/Paris')::date
  );
