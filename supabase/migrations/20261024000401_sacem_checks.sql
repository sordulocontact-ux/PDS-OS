-- Recette Juridique V1 d'Ibé (21/10/2026), JUR-02 et JUR-03 : avant la version à signer,
-- deux informations de plus sont exigées par la base, jamais seulement par l'écran.
--
-- - La première exploitation (date) : proposée depuis la date de sortie, confirmée par
--   une personne ; sans elle, pas de version à signer (code 'first_exploitation').
-- - Les parts DEP et DR, calculées par le code selon la règle de la SACEM, sont vérifiées
--   par une personne (« J'ai vérifié les parts DEP et DR », dep_dr.checked) ; sinon
--   'dep_dr_check'.
--
-- formality_missing garde tout ce qu'elle disait (renommée formality_missing_base) et
-- ajoute ces deux codes ; ses appelants (formality_settle, la génération) la lisent par
-- son nom.

alter function public.formality_missing(uuid) rename to formality_missing_base;
revoke execute on function public.formality_missing_base(uuid) from public, anon, authenticated;

create function public.formality_missing(p_formality_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_missing text[] := public.formality_missing_base(p_formality_id);
  v_vals jsonb;
begin
  select coalesce(jsonb_object_agg(field_key, value), '{}'::jsonb) into v_vals
    from public.legal_formality_values
   where formality_id = p_formality_id and status = 'validated';
  if nullif(btrim(coalesce(v_vals ->> 'first_exploitation', '')), '') is null then
    v_missing := v_missing || 'first_exploitation'::text;
  end if;
  if coalesce(v_vals -> 'dep_dr' ->> 'choice', '') in ('follow_phono', 'statutory')
     and not coalesce((v_vals -> 'dep_dr' ->> 'checked')::boolean, false) then
    v_missing := v_missing || 'dep_dr_check'::text;
  end if;
  return v_missing;
end;
$$;
revoke execute on function public.formality_missing(uuid) from public, anon;
grant execute on function public.formality_missing(uuid) to authenticated;

-- Dossiers not generated yet follow the new rule at once.
select public.formality_settle(id)
  from public.legal_formalities
 where status in ('collecting_data', 'ready_to_generate');
