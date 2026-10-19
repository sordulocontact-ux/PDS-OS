-- Juridique, lot 9 J8 (proto « Projet complet », Emprunt, scénario « refusal »): a refusal
-- is decided — « Retirer l'élément du titre » (with why; whoever answers for the Master is
-- told to redo the passage without it) or « Le remplacer » (by what: a new borrowing to
-- ask for, linked to the one it replaces, the recording unticked for a version replayed).

alter table public.legal_clearances
  add column replaces_id uuid references public.legal_clearances (id) on delete set null,
  add column withdrawn_reason text;
alter table public.legal_clearances add constraint legal_clearances_withdrawn_reason_check
  check (withdrawn_reason is null
         or (btrim(withdrawn_reason) <> '' and char_length(withdrawn_reason) <= 1000));

select public.add_notification_kinds(array['legal_element_withdrawn']);

-- « Retirer l'élément du titre », with why: the borrowing is abandoned (it no longer blocks).
create or replace function public.withdraw_clearance(p_clearance_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if v_reason is null then
    raise exception 'clearance_note_required' using errcode = 'P0001';
  end if;
  -- Same rights and journal as every other move of a borrowing.
  perform public.advance_clearance(p_clearance_id, 'abandoned',
                                   left('Élément retiré du titre : ' || v_reason, 2000));
  update public.legal_clearances
     set withdrawn_reason = left(v_reason, 1000)
   where id = p_clearance_id;
end;
$$;

-- « Le remplacer » by what: a new borrowing to ask for, the former one closed.
create or replace function public.replace_clearance(p_clearance_id uuid, p_what text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_clearances%rowtype := public.clearance_for_write(p_clearance_id);
  v_what text := nullif(btrim(coalesce(p_what, '')), '');
  v_id uuid;
begin
  if v_what is null then
    raise exception 'clearance_note_required' using errcode = 'P0001';
  end if;
  if v.status not in ('refused', 'action_required') then
    raise exception 'clearance_status_invalid' using errcode = 'P0001';
  end if;
  insert into public.legal_clearances
    (organization_id, project_id, master_id, element, work, author, status,
     responsible_person_id, created_by, usage, rights_scope, scope_reason, replaces_id)
  values (v.organization_id, v.project_id, v.master_id, v.element, v.work, v.author,
          'to_investigate', v.responsible_person_id, public.auth_person_id(),
          left(v_what, 2000), 'work',
          'Proposé par le code pour un remplacement rejoué : l''œuvre seule. À corriger si besoin.',
          v.id)
  returning id into v_id;
  perform public.advance_clearance(p_clearance_id, 'abandoned',
                                   left('Remplacé par : ' || v_what, 2000));
  return v_id;
end;
$$;

-- Whoever answers for the project (and its Master) is told the element left the title.
create or replace function public.legal_clearance_withdrawn_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  if old.withdrawn_reason is null and new.withdrawn_reason is not null then
    select owner_person_id into v_owner from public.projects where id = new.project_id;
    if v_owner is not null then
      perform public.notify(new.organization_id, v_owner, 'legal_element_withdrawn',
                            new.project_id, new.id);
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.legal_clearance_withdrawn_notify() from public, anon, authenticated;

drop trigger if exists z_notify_withdrawn on public.legal_clearances;
create trigger z_notify_withdrawn
  after update of withdrawn_reason on public.legal_clearances
  for each row execute function public.legal_clearance_withdrawn_notify();

revoke execute on function public.withdraw_clearance(uuid, text) from public, anon;
grant execute on function public.withdraw_clearance(uuid, text) to authenticated;
revoke execute on function public.replace_clearance(uuid, text) from public, anon;
grant execute on function public.replace_clearance(uuid, text) to authenticated;
