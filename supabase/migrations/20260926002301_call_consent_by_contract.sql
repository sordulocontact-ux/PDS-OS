-- Recording consent is given by contract (decided 26/09/2026): every call is
-- granted from its creation, and nothing asks for it on screen anymore.
-- The column, its trigger and calls_audio_requires_consent stay: history
-- keeps its meaning and the audio rule still holds.

alter table public.calls alter column consent set default 'granted';

-- Calls still waiting for a consent were only waiting for this screen.
update public.calls
   set consent = 'granted',
       consent_note = coalesce(consent_note, 'Accordé par contrat')
 where consent = 'pending';
