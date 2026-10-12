-- Retours BUG + UX consolidés du 11/10/2026, lot 11 : PROJ-BUG-06.
-- A title whose mix is already done (a « Mix » file in the Catalogue) feeds
-- the mastering without a new mixing round: the project's owner declares
-- that file the title's Mix final, once, with who, when and why; it becomes
-- the title's validated mix version (stage « mix », decision « approved »),
-- the same reference the Mastering, the Master final and the Distribution
-- read. Never a copy of the file.
-- docs/ARCHITECTURE.md § 8 septies (« Partir de la source réelle »).

create function public.declare_mix_final(
  p_project_id uuid,
  p_master_id uuid,
  p_file_id uuid,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_file public.master_files%rowtype;
  v_id uuid;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.is_project_owner(p_project_id) then
    raise exception 'not_the_project_owner' using errcode = '42501';
  end if;
  if not exists (select 1 from public.project_masters
                 where project_id = p_project_id and master_id = p_master_id) then
    raise exception 'title_not_in_project';
  end if;
  select * into v_file from public.master_files
   where id = p_file_id and master_id = p_master_id;
  if not found or v_file.category <> 'audio' or v_file.audio_state is distinct from 'mix' then
    raise exception 'not_a_mix';
  end if;
  if exists (select 1 from public.master_mix_versions
              where project_id = p_project_id and master_id = p_master_id
                and stage = 'mix' and decision = 'approved') then
    raise exception 'already_final';
  end if;
  if exists (select 1 from public.master_mix_versions
              where project_id = p_project_id and file_id = p_file_id) then
    -- Already a version of the mix round: it is decided there.
    raise exception 'already_a_version';
  end if;
  if v_note is not null and char_length(v_note) > 2000 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;

  insert into public.master_mix_versions
    (organization_id, project_id, master_id, file_id, stage, number, created_by,
     decision, decision_note, decided_by, decided_at)
  select v_file.organization_id, p_project_id, p_master_id, p_file_id, 'mix',
         coalesce(max(v.number), 0) + 1, public.auth_person_id(),
         'approved', coalesce(v_note, 'Mix existant déclaré mix final, sans nouveau mixage.'),
         public.auth_person_id(), now()
    from public.master_mix_versions v
   where v.project_id = p_project_id and v.master_id = p_master_id and v.stage = 'mix'
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.declare_mix_final(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.declare_mix_final(uuid, uuid, uuid, text) to authenticated;
