-- The evidence-based checks before the shoot (PROD-008, 017) only frame an
-- internal production: an external one is confirmed on its synthesis, kept
-- frozen (20261019050701). Re-checking reset an external « Préparation
-- validée » on any write to its sheet (a proposal's version, a change of
-- date…); a change of date now asks to confirm again (20261020020401).
create or replace function public.production_recheck(p_sheet_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  update public.production_readiness_checks c
     set confirmed_by = null, confirmed_at = null, updated_at = now()
   where c.sheet_id = p_sheet_id and c.confirmed_at is not null
     and c.derogation_reason is null
     and not public.production_check_evidence(p_sheet_id, c.key, c.note);
  update public.production_sheets s
     set ready_at = null, ready_by = null
   where s.id = p_sheet_id and s.ready_at is not null
     and s.organization is distinct from 'external'
     and exists (
       select 1 from unnest(array['location', 'team', 'equipment', 'schedule', 'budget',
                                  'call_sheet', 'permits', 'backup']) k(key)
         left join public.production_readiness_checks c
                on c.sheet_id = p_sheet_id and c.key = k.key
        where coalesce(c.required, public.production_check_default_required(k.key))
          and c.confirmed_at is null);
end;
$function$;
