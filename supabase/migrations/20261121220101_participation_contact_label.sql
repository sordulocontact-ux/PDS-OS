-- Projet collectif, retours d'Ibé du 18/11/2026: « Producteur JL » in the
-- recap's Cast is the label-side producer (who negotiates the 50/50), not the
-- artistic producer of the Réseau's `producer` role (« Réalisateur·rice »).
-- The Réseau has no person role for it, so the word is carried by the
-- participation, free:
--
--   1. title_participations.contact_label: what the interlocutor is for this
--      artist (« Producteur », « Manager »…): trimmed, blank = none, 40
--      characters at most; none without an interlocutor.
--   2. set_title_participation_contact takes the label (third argument,
--      default none): the two-argument version is dropped, never an
--      ambiguous overload. Same rights, same décision 5 (the contact is
--      written, never read: nothing returned). Removing the contact removes
--      its label.

-- 1 ------------------------------------------------------------------------------------------
alter table public.title_participations add column contact_label text;

alter table public.title_participations add constraint title_participations_contact_label_check
  check (contact_label is null
         or (contact_label = btrim(contact_label)
             and char_length(contact_label) between 1 and 40));
alter table public.title_participations add constraint title_participations_contact_label_contact_check
  check (contact_label is null or contact_id is not null);

comment on column public.title_participations.contact_label is
  'Ibé 21/11: what the interlocutor (contact_id) is for the artist, free text (« Producteur »), 40 characters at most; null = the recap reads the contact''s Réseau role. Written by set_title_participation_contact only; none without a contact_id.';

-- 2 ------------------------------------------------------------------------------------------
drop function public.set_title_participation_contact(uuid, uuid);

create or replace function public.set_title_participation_contact(
  p_participation_id uuid,
  p_contact_id uuid,
  p_label text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text := nullif(btrim(p_label), '');
begin
  if char_length(v_label) > 40 then
    raise exception 'label_too_long' using errcode = '22023';
  end if;
  perform public.lock_title_participation(p_participation_id);
  -- No interlocutor, no label.
  if p_contact_id is null then
    v_label := null;
  end if;
  begin
    update public.title_participations
       set contact_id = p_contact_id,
           contact_label = v_label
     where id = p_participation_id
       and (contact_id is distinct from p_contact_id
            or contact_label is distinct from v_label);
  exception when foreign_key_violation then
    raise exception 'contact_not_found' using errcode = '23503';
  end;
end;
$$;
revoke execute on function public.set_title_participation_contact(uuid, uuid, text) from public, anon;
grant execute on function public.set_title_participation_contact(uuid, uuid, text) to authenticated;
