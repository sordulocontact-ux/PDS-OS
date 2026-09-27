-- PDS Mic, the first reusable content format of PDS (feedback n°2): a row of
-- content_formats like any other, created and edited from the app afterwards.
insert into public.content_formats (organization_id, name)
select id, 'PDS Mic' from public.organizations where slug = 'pds'
on conflict do nothing;
