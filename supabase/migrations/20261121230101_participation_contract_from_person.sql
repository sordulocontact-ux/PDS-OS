-- Projet collectif, retours d'Ibé du 18/11/2026 (test du 23/11): one source
-- for a guest's contract. Drafting is one contract per person
-- (legal_agreement_needs.contract_id, per project and contact, the contact
-- being the artist's person of the Réseau, network_contacts.artist_id), while
-- the locks, the banner, « Participations et contrats » and the deals read
-- title_participations.contract_id, which nothing wrote any more: a guest
-- signed in the recap stayed « non signé » in the banner (Tiago Lestrel on
-- « Assurance 30 »).
--
-- Choice: the person's contract is copied onto the participations it covers
-- (the readers stay as they are: participation_covered, contract_gaps and
-- the locks, grant_participation_waiver, deal_contract_id and every deal
-- function reading it, read_deal_context, the app's board).
--
--   1. sync_participation_contracts(project, artist), internal: in a
--      collective, the person's contract (a need of a contact whose
--      artist_id is the artist, with a contract; several people of one
--      artist: the live one first, then the oldest) is set on the artist's
--      participations of the project that are in play (neither declined nor
--      withdrawn) and whose accord is validated
--      (participation_agreement_validated): the guard « no contract before
--      the accord » (b_agreement_before_contract) stays, a participation
--      waiting for its accord is linked when the accord is validated.
--      Rule for a contract already linked by hand (old data, tests): the
--      person's contract wins when it exists; without one, the link stays.
--   2. When it runs, whatever the path:
--      - legal_agreement_needs: a contract set on the need (drafted), or
--        changed; a contract removed (the need's contract unset or changed,
--        the need deleted or moved) unlinks the artist's participations that
--        carried it (those linked to another contract by hand stay), then
--        the artist's other person, if any, is read again;
--      - title_participations: a participation added, or its status changed
--        (an artist added later to a title, a participation reattached);
--      - deals: a deal added, its stage or its accord changed (the accord
--        validated later).
--      network_contacts.artist_id is read inside these triggers only;
--      nothing is returned (décision 5).
--   3. Catch-up: every (collective, artist) of the existing participations.
-- A simple project has no participation: nothing changes there.

-- 1 ------------------------------------------------------------------------------------------
create or replace function public.sync_participation_contracts(
  p_project_id uuid,
  p_artist_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contract uuid;
begin
  if p_project_id is null or p_artist_id is null
     or not exists (select 1 from public.projects p where p.id = p_project_id and p.collective) then
    return;
  end if;
  select n.contract_id into v_contract
    from public.legal_agreement_needs n
    join public.network_contacts nc on nc.id = n.contact_id
   where n.project_id = p_project_id
     and nc.artist_id = p_artist_id
     and n.contract_id is not null
   order by (nc.archived_at is not null), nc.created_at, n.created_at
   limit 1;
  if v_contract is null then
    return;
  end if;
  update public.title_participations tp
     set contract_id = v_contract
   where tp.project_id = p_project_id
     and tp.artist_id = p_artist_id
     and tp.status not in ('declined', 'withdrawn')
     and tp.contract_id is distinct from v_contract
     and public.participation_agreement_validated(tp.id);
end;
$$;
revoke execute on function public.sync_participation_contracts(uuid, uuid)
  from public, anon, authenticated;

-- 2 ------------------------------------------------------------------------------------------
create or replace function public.legal_agreement_needs_sync_participations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artist uuid;
begin
  if tg_op <> 'INSERT' and old.contract_id is not null
     and (tg_op = 'DELETE'
          or new.contract_id is distinct from old.contract_id
          or new.contact_id is distinct from old.contact_id
          or new.project_id is distinct from old.project_id) then
    select nc.artist_id into v_artist from public.network_contacts nc where nc.id = old.contact_id;
    if v_artist is not null then
      update public.title_participations tp
         set contract_id = null
       where tp.project_id = old.project_id
         and tp.artist_id = v_artist
         and tp.contract_id = old.contract_id;
      perform public.sync_participation_contracts(old.project_id, v_artist);
    end if;
  end if;
  if tg_op <> 'DELETE' and new.contract_id is not null then
    select nc.artist_id into v_artist from public.network_contacts nc where nc.id = new.contact_id;
    perform public.sync_participation_contracts(new.project_id, v_artist);
  end if;
  return null;
end;
$$;
revoke execute on function public.legal_agreement_needs_sync_participations()
  from public, anon, authenticated;
create trigger z_participation_contracts
  after insert or update of contract_id, contact_id, project_id or delete
  on public.legal_agreement_needs
  for each row execute function public.legal_agreement_needs_sync_participations();

create or replace function public.title_participations_sync_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_participation_contracts(new.project_id, new.artist_id);
  return null;
end;
$$;
revoke execute on function public.title_participations_sync_contract()
  from public, anon, authenticated;
create trigger z_contract_from_person
  after insert or update of status on public.title_participations
  for each row execute function public.title_participations_sync_contract();

create or replace function public.deals_sync_participation_contract()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid;
  v_artist uuid;
begin
  select tp.project_id, tp.artist_id into v_project, v_artist
    from public.title_participations tp where tp.id = new.participation_id;
  perform public.sync_participation_contracts(v_project, v_artist);
  return null;
end;
$$;
revoke execute on function public.deals_sync_participation_contract()
  from public, anon, authenticated;
create trigger z_participation_contract
  after insert or update of agreement_status, stage on public.deals
  for each row when (new.participation_id is not null)
  execute function public.deals_sync_participation_contract();

comment on column public.title_participations.contract_id is
  'The contract covering the participation, read by the locks, the banner, the deals and « Participations et contrats ». Set from the person''s contract (legal_agreement_needs.contract_id of the artist''s contact) by sync_participation_contracts once the accord is validated; the person''s contract wins over a link set by hand, which stays without one.';

-- 3 ------------------------------------------------------------------------------------------
do $$
declare
  v_pair record;
  v_before integer;
  v_after integer;
begin
  select count(*) into v_before from public.title_participations where contract_id is not null;
  for v_pair in
    select distinct tp.project_id, tp.artist_id
      from public.title_participations tp
      join public.projects p on p.id = tp.project_id and p.collective
  loop
    perform public.sync_participation_contracts(v_pair.project_id, v_pair.artist_id);
  end loop;
  select count(*) into v_after from public.title_participations where contract_id is not null;
  raise notice 'participation contracts: % linked before, % after', v_before, v_after;
end;
$$;
