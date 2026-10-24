-- Recette Juridique V1 d'Ibé (21/10/2026), JUR-11 : une signature du bulletin « faite
-- autrement » (sur papier, en studio) n'est enregistrée qu'avec sa preuve : le bulletin
-- signé, scanné en PDF, déposé par l'équipe dans le dossier de la formalité
-- (<org>/proofs/<formalité>/<uuid>.pdf, 20261024000501). Une confirmation dans PDS OS
-- n'est jamais une signature.

drop function public.note_formality_signature(uuid, date);
create function public.note_formality_signature(p_signature_id uuid, p_signed_on date, p_file text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_sig public.legal_formality_signatures%rowtype;
  v public.legal_formalities%rowtype;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_file text;
  v_bytes bigint;
begin
  select * into v_sig from public.legal_formality_signatures where id = p_signature_id for update;
  if not found then raise exception 'forbidden' using errcode = '42501'; end if;
  v := public.formality_for_write(v_sig.formality_id);
  if p_signed_on is null or p_signed_on > v_today or p_signed_on < v_today - 365 then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  v_file := public.formality_proof_file(v, p_file);
  select coalesce((o.metadata ->> 'size')::bigint, 0) into v_bytes
    from storage.objects o where o.bucket_id = 'formality-signatures' and o.name = v_file;
  perform public.settle_formality_signature(
    v_sig, 'other', 'A signé autrement · le ' || to_char(p_signed_on, 'DD/MM/YYYY'),
    p_signed_on, v_file, 'Bulletin signé (scan).pdf', v_bytes);
end;
$$;
revoke execute on function public.note_formality_signature(uuid, date, text) from public, anon;
grant execute on function public.note_formality_signature(uuid, date, text) to authenticated;
