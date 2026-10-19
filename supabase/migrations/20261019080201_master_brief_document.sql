-- Master, the Brief as a document (docs/projet-complet/master.md § 2,
-- sub-lot M3; proto `master-v2.html`): each fact is changed in place and
-- saved at once, the Brief is « Enregistré » by a gesture of its owner
-- (« Prêt à transmettre »), a change afterwards makes it « Modifications à
-- enregistrer » until it is recorded again; each changed fact says who
-- changed it (« Modifié par … », rule 2); how the owner chose to start
-- (« Commencer directement » / « Préparer un échange ») is kept.
--
-- * recorded_at / recorded_by: written by record_master_brief only.
-- * content_changed_at: the last change of what the engineer receives
--   (trigger), compared with recorded_at.
-- * changed_by: { field: { by: person id, at } }, by trigger, for the facts
--   the owner may change from a proposal (engineers, validator, dates…).
-- * start_mode: 'direct' | 'exchange'.

alter table public.master_briefs
  add column recorded_at timestamptz,
  add column recorded_by uuid references public.people (id),
  add column content_changed_at timestamptz not null default now(),
  add column changed_by jsonb not null default '{}'::jsonb,
  add column start_mode text,
  add constraint master_briefs_start_mode_check
    check (start_mode is null or start_mode in ('direct', 'exchange'));

-- The briefs saved before keep their state: recorded as they are.
update public.master_briefs
   set recorded_at = updated_at, recorded_by = updated_by,
       content_changed_at = updated_at;

grant update (start_mode) on public.master_briefs to authenticated;
grant insert (start_mode) on public.master_briefs to authenticated;

create or replace function public.master_briefs_track_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.auth_person_id();
  v_mark jsonb;
  v_old jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  v_new jsonb := to_jsonb(new);
  v_field text;
  v_content text[] := array['mix_contact_id', 'mastering_same_engineer', 'mastering_contact_id',
    'revisions', 'validator_person_id', 'references_text', 'direction', 'constraints_text',
    'deliverables', 'mix_v1_due', 'mix_final_due', 'mastering_due', 'master_final_due',
    'delivery_formats', 'engineer_message', 'mix_rate_cents', 'mastering_rate_cents'];
  v_tracked text[] := array['mix_contact_id', 'mastering_same_engineer', 'mastering_contact_id',
    'revisions', 'validator_person_id', 'mix_v1_due', 'mix_final_due', 'mastering_due',
    'master_final_due', 'delivery_formats', 'mix_rate_cents', 'mastering_rate_cents'];
begin
  -- recorded_*, changed_by and content_changed_at are granted to nobody:
  -- only this trigger and record_master_brief write them.
  v_mark := jsonb_build_object('by', v_actor, 'at', now());
  foreach v_field in array v_content loop
    if tg_op = 'UPDATE' and (v_old -> v_field) is distinct from (v_new -> v_field) then
      new.content_changed_at := now();
      if v_field = any (v_tracked) then
        new.changed_by := new.changed_by || jsonb_build_object(v_field, v_mark);
      end if;
    end if;
  end loop;
  return new;
end;
$$;
revoke execute on function public.master_briefs_track_changes() from public, anon, authenticated;
create trigger b_track_changes before insert or update on public.master_briefs
  for each row execute function public.master_briefs_track_changes();

-- « Enregistrer le Brief »: the owner records what the engineers will
-- receive. What is missing is said by the code before; the database keeps
-- the one rule a sending needs (an engineer for the mix).
create or replace function public.record_master_brief(p_project_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.master_briefs
     set recorded_at = v_now, recorded_by = public.auth_person_id()
   where project_id = p_project_id;
  if not found then
    raise exception 'no_brief';
  end if;
  return v_now;
end;
$$;
revoke execute on function public.record_master_brief(uuid) from public, anon;
grant execute on function public.record_master_brief(uuid) to authenticated;
