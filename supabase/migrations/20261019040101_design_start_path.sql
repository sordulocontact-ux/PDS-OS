-- Conception, Accueil (proto « Projet complet » de0, ticket « Workflow
-- Conception complet » § 1 à 3; docs/ARCHITECTURE.md § 8 decies).
--
-- 1. The way the Conception starts is recorded as chosen, by whom and when
--    (« Départ · Préparer un échange créatif · choisi par … le … ») — the
--    responsible créatif can be designated before it, so « started »
--    (design_workspaces) no longer says « commencée directement ».
--    « Commencer directement » asks no reason any more (no_exchange_reason
--    kept, nullable, for the projects that gave one).
-- 2. A deliverable added late carries its format and, always, its reason
--    (« Motif * »: ticket « source, auteur et motif »). Checked for new rows
--    only (`not valid`): older additions keep their optional note.

alter table public.design_workspaces
  add column start_path text,
  add column start_path_by uuid references public.people(id),
  add column start_path_at timestamptz;

alter table public.design_workspaces
  add constraint design_workspaces_start_path_check
  check (start_path is null or start_path in ('direct', 'call'));

-- Projects started before: through a call when one was prepared, else
-- directly (the old « Commencer sans échange »).
update public.design_workspaces w
   set start_path = case when exists (select 1 from public.design_calls c
                                       where c.project_id = w.project_id)
                         then 'call' else 'direct' end,
       start_path_by = w.started_by,
       start_path_at = w.started_at
 where w.start_path is null;

alter table public.design_deliverables
  add column format text;

alter table public.design_deliverables
  add constraint design_deliverables_format_check
  check (format is null or char_length(format) <= 200);

alter table public.design_deliverables
  add constraint design_deliverables_reason_check
  check (origin = 'strategy' or btrim(coalesce(note, '')) <> '') not valid;

-- « Préparer un échange créatif » / « Commencer directement » / « Changer »
-- (null, back to the choice while no exchange was created). Opens the
-- Conception (start_design: owner, Stratégie validated) when needed.
create function public.choose_design_start(p_project_id uuid, p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_path is not null and p_path not in ('direct', 'call') then
    raise exception 'invalid_input' using errcode = '23514';
  end if;
  perform public.start_design(p_project_id);
  if p_path is null and exists (select 1 from public.design_calls c
                                 where c.project_id = p_project_id) then
    raise exception 'call_already_created' using errcode = '23514';
  end if;
  update public.design_workspaces
     set start_path = p_path,
         start_path_by = case when p_path is null then null else public.auth_person_id() end,
         start_path_at = case when p_path is null then null else now() end
   where project_id = p_project_id;
end;
$$;

revoke all on function public.choose_design_start(uuid, text) from public, anon;
grant execute on function public.choose_design_start(uuid, text) to authenticated;

-- An exchange created means the call way, whatever was clicked before.
create or replace function public.design_calls_start_path()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.design_workspaces
     set start_path = 'call',
         start_path_by = coalesce(start_path_by, public.auth_person_id()),
         start_path_at = coalesce(start_path_at, now())
   where project_id = new.project_id and start_path is distinct from 'call';
  return null;
end;
$$;

revoke all on function public.design_calls_start_path() from public, anon, authenticated;

create trigger z_start_path after insert on public.design_calls
  for each row execute function public.design_calls_start_path();
