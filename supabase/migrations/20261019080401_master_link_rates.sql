-- Master, the engineer's link (docs/projet-complet/master.md § 4, § 5 and
-- § 10): get_master_transmission also says the rates PDS estimated for the
-- roles of the link (« Prendre en charge le dossier »: confirm or propose),
-- the rates given, and a version reopened with its reason (« Rouvert le … :
-- déposez une nouvelle version »). Nothing internal besides the estimate
-- addressed to this engineer: no budget, no other rate.

CREATE OR REPLACE FUNCTION public.get_master_transmission(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_link public.master_transmissions%rowtype;
  v_row public.master_transmissions%rowtype;
  v_state text;
  v_stages text[];
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select * into v_link from public.master_transmissions
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if not found then
    return null;
  end if;
  v_state := case
    when v_link.revoked_at is not null and v_link.revoke_reason is not null then 'revoked'
    when v_link.revoked_at is not null then 'replaced'
    when v_link.expires_at < now() then 'expired'
    else null end;
  if v_state is not null then
    return jsonb_build_object('state', v_state);
  end if;
  v_row := public.master_transmission_current(v_link);
  v_state := case when v_row.acknowledged_at is not null then 'received' else 'open' end;
  v_stages := case when v_row.id <> v_link.id then array[v_link.role, v_row.role]
                   else array[v_row.role] end;
  return jsonb_build_object(
    'state', v_state,
    'package', v_row.package,
    'note', v_row.note,
    'sentAt', v_row.created_at,
    'expiresAt', v_link.expires_at,
    'acknowledgedAt', v_row.acknowledged_at,
    'continued', v_row.id <> v_link.id,
    -- The rates PDS estimated for the roles this link carries (proto « Prendre
    -- en charge le dossier »), and the ones the engineer gave.
    'estimate', (select jsonb_build_object(
        'mix', case when v_row.role = 'mix' then b.mix_rate_cents end,
        'mastering', case when v_row.role = 'mastering'
                            or (v_row.role = 'mix' and b.mastering_same_engineer)
                          then b.mastering_rate_cents end)
        from public.master_briefs b where b.project_id = v_row.project_id),
    'taken', jsonb_build_object('mix', v_row.proposed_mix_cents,
                                'mastering', v_row.proposed_mastering_cents),
    'versions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'masterId', v.master_id, 'title', m.title, 'number', v.number,
               'stage', v.stage,
               'fileName', f.file_name, 'receivedAt', v.created_at,
               'summary', case when v.feedback_sent_at is not null then v.feedback_summary end,
               'sentAt', v.feedback_sent_at,
               'decision', v.decision, 'decidedAt', v.decided_at,
               'decidedBy', nullif(btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
               'decisionNote', v.decision_note,
               'reopenedAt', v.reopened_at, 'reopenReason', v.reopen_reason)
             order by v.created_at desc, v.stage desc, v.number desc)
        from public.master_mix_versions v
        join public.masters m on m.id = v.master_id
        left join public.master_files f on f.id = v.file_id
        left join public.people p on p.id = v.decided_by
       where v.project_id = v_row.project_id
         and v.stage = any (v_stages)), '[]'::jsonb),
    'deliveries', coalesce((
      select jsonb_agg(jsonb_build_object(
               'masterId', s.master_id, 'fileName', f.file_name, 'sentAt', s.used_at)
             order by s.used_at desc)
        from public.master_delivery_slots s
        join public.master_files f on f.id = s.file_id
       where s.transmission_id in (v_link.id, v_row.id)), '[]'::jsonb));
end;
$function$;
