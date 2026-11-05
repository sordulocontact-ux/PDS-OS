-- Master, « Rouvrir le mix » (Ibé's feedback of 04/11/2026): the mix
-- validated, the mastering now leaves by itself to the engineer who masters
-- too (lib/master-workflow/round-actions.ts, continueToMastering). Its
-- package being sent no longer closes the reopening, or a validated mix
-- could never be reopened: only a mastered version deposited on the title
-- does. The mix validated again, the mastering's package is sent again.

create or replace function public.reopen_mix_version(p_version_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.master_mix_versions%rowtype;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_row from public.master_mix_versions where id = p_version_id for update;
  if not found or not public.is_project_owner(v_row.project_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_row.decision is distinct from 'approved' then
    raise exception 'not_final';
  end if;
  if v_reason is null then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  if v_row.stage = 'mix' then
    -- Once a mastered version came back on this title, it is too late.
    -- The mastering's package alone no longer closes it: it now leaves by
    -- itself with the validated mix (20261105160201).
    if exists (select 1 from public.master_mix_versions v
                where v.project_id = v_row.project_id and v.master_id = v_row.master_id
                  and v.stage = 'mastering') then
      raise exception 'mastering_started';
    end if;
  else
    -- Once the Distribution delivered the release, the master stays.
    if exists (select 1 from public.releases r
                where r.project_id = v_row.project_id and r.delivered_on is not null) then
      raise exception 'distribution_delivered';
    end if;
    update public.master_files set audio_state = 'master'
     where id = v_row.file_id and audio_state = 'final_master';
    update public.masters set audio_state = 'master'
     where id = v_row.master_id and audio_state = 'final_master'
       and not exists (select 1 from public.master_files f
                        where f.master_id = v_row.master_id and f.audio_state = 'final_master');
  end if;
  update public.master_mix_versions
     set decision = 'reopened', reopened_at = now(),
         reopened_by = public.auth_person_id(), reopen_reason = v_reason
   where id = p_version_id;
end;
$$;
revoke execute on function public.reopen_mix_version(uuid, text) from public, anon;
grant execute on function public.reopen_mix_version(uuid, text) to authenticated;
