-- The SACEM dossier saves itself while it is filled (Sacha, 10/11/2026: « quand on met des
-- informations, quand on recharge la page, elles disparaissent »): one save a second or so
-- after the last change. The history keeps one « Dossier validé » per person and half hour,
-- not one per save. Otherwise the same as 20261028000601_recette_p0_guards.

create or replace function public.save_formality_values(p_formality_id uuid, p_values jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.legal_formalities%rowtype := public.formality_for_write(p_formality_id);
  v_key text;
  v_entry jsonb;
begin
  if v.status in ('submitted', 'processing') then
    raise exception 'formality_submitted' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_values) <> 'object' then raise exception 'formality_values_invalid' using errcode = 'P0001'; end if;
  for v_key, v_entry in select * from jsonb_each(p_values) loop
    -- After an external correction, only the fields it reopened.
    continue when v.status = 'action_required' and not (v_key = any (v.reopened));
    insert into public.legal_formality_values
      (formality_id, field_key, organization_id, value, source, status, validated_by, validated_at)
    values (p_formality_id, v_key, v.organization_id, coalesce(v_entry -> 'value', 'null'::jsonb),
            left(coalesce(nullif(v_entry ->> 'source', ''), 'Saisi'), 200), 'validated',
            public.auth_person_id(), now())
    on conflict (formality_id, field_key) do update
      set value = excluded.value, source = excluded.source, status = 'validated',
          validated_by = excluded.validated_by, validated_at = excluded.validated_at;
    update public.legal_formalities set reopened = array_remove(reopened, v_key)
     where id = p_formality_id;
  end loop;
  -- One line of history for a session of typing, not one per save.
  if not exists (
    select 1 from public.legal_formality_events e
     where e.formality_id = p_formality_id
       and e.kind = 'formality.values_validated'
       and e.actor_person_id is not distinct from public.auth_person_id()
       and e.created_at > now() - interval '30 minutes'
       and not exists (
         select 1 from public.legal_formality_events l
          where l.formality_id = p_formality_id and l.created_at > e.created_at
            and l.kind <> 'formality.values_validated'))
  then
    perform public.log_formality_event(v, 'formality.values_validated');
  end if;
  -- A change after a version was generated calls for a new version, and the signatures of
  -- that version no longer hold (JUR-03).
  if v.status in ('document_ready', 'signatures_pending', 'ready_to_submit') then
    perform public.supersede_formality_signatures(v);
  end if;
  update public.legal_formalities
     set status = case
       when status = 'action_required' and cardinality(reopened) = 0 then 'collecting_data'
       when status in ('document_ready', 'signatures_pending', 'ready_to_submit') then 'collecting_data'
       else status end
   where id = p_formality_id;
  perform public.formality_settle(p_formality_id);
end;
$$;
