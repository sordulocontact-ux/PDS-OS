-- The engineers chosen in the Brief Mix/Master are credited on the titles
-- (audit of 06/10/2026, docs/ARCHITECTURE.md § 8 septies).
--
-- The brief kept its engineers in master_briefs.mix_contact_id and
-- mastering_contact_id only, while the État du master ("qui mixe") and the
-- whole Juridique (fiches, contracts, Personnes) read the titles' credits.
-- An engineer chosen in the brief, sent the package and validated, could
-- thus never get a fiche or a contract. Now choosing the engineer is the
-- credit, one source for both workflows:
--   * each live title of the project without its master final, and without
--     a credit of that role yet, gets one, linked to the contact (contact_id,
--     never a name: the contact is the one chosen in the brief);
--   * such a credit is marked (from_brief): when the brief changes its
--     engineer, the marked credits of the previous one go, the new one is
--     credited; a credit written by hand is never touched;
--   * an existing credit of that role is kept as it is (the État du master
--     shows both if they differ).

alter table public.master_contributors
  add column from_brief boolean not null default false;

comment on column public.master_contributors.from_brief is
  'Credit written by the Brief Mix/Master (its mix or mastering engineer); replaced when the brief changes engineer.';

create or replace function public.credit_brief_engineer(
  p_brief public.master_briefs,
  p_role text,
  p_old_contact uuid,
  p_new_contact uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_new_contact is not distinct from p_old_contact then
    return;
  end if;
  if p_old_contact is not null then
    delete from public.master_contributors c
     using public.project_masters pm
     where pm.project_id = p_brief.project_id and c.master_id = pm.master_id
       and c.from_brief and c.role = p_role and c.contact_id = p_old_contact;
  end if;
  if p_new_contact is null then
    return;
  end if;
  insert into public.master_contributors
    (organization_id, master_id, name, role, contact_id, from_brief)
  select m.organization_id, m.id, n.name, p_role, n.id, true
    from public.project_masters pm
    join public.masters m on m.id = pm.master_id
    join public.network_contacts n on n.id = p_new_contact
   where pm.project_id = p_brief.project_id
     and m.archived_at is null
     and m.audio_state is distinct from 'final_master'
     and not exists (select 1 from public.master_contributors c
                      where c.master_id = m.id and c.role = p_role);
end;
$$;

create or replace function public.credit_brief_engineers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_mix uuid;
  v_old_mastering uuid;
begin
  if tg_op = 'UPDATE' then
    v_old_mix := old.mix_contact_id;
    v_old_mastering := case when old.mastering_same_engineer then old.mix_contact_id
                            else old.mastering_contact_id end;
  end if;
  perform public.credit_brief_engineer(new, 'mix_engineer', v_old_mix, new.mix_contact_id);
  perform public.credit_brief_engineer(
    new, 'mastering_engineer', v_old_mastering,
    case when new.mastering_same_engineer then new.mix_contact_id
         else new.mastering_contact_id end);
  return null;
end;
$$;

create trigger z_credit_engineers
  after insert or update of mix_contact_id, mastering_contact_id, mastering_same_engineer
  on public.master_briefs
  for each row execute function public.credit_brief_engineers();

revoke execute on function public.credit_brief_engineer(public.master_briefs, text, uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.credit_brief_engineers() from public, anon, authenticated;

-- Briefs saved before: their engineers credited now, the same way.
do $$
declare
  v_brief public.master_briefs;
begin
  for v_brief in select * from public.master_briefs loop
    perform public.credit_brief_engineer(v_brief, 'mix_engineer', null, v_brief.mix_contact_id);
    perform public.credit_brief_engineer(
      v_brief, 'mastering_engineer', null,
      case when v_brief.mastering_same_engineer then v_brief.mix_contact_id
           else v_brief.mastering_contact_id end);
  end loop;
end;
$$;
