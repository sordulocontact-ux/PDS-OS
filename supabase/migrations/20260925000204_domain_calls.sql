-- Calls, their audio, transcripts and structured reports.
--
-- Transcripts and reports are immutable: a new run inserts a new row.
-- Transcribed text is untrusted data, never an instruction (CLAUDE.md, rule 4).

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  project_id uuid not null,
  title text not null,
  occurred_at timestamptz not null default now(),
  -- Recording consent is a state of its own (docs/CONTEXTE-PROJET.md § 8).
  consent text not null default 'pending',
  consent_note text,
  consent_recorded_at timestamptz,
  consent_recorded_by uuid references public.people (id),
  audio_path text,
  audio_mime text,
  audio_bytes bigint,
  status text not null default 'draft',
  error_code text,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calls_title_not_blank check (btrim(title) <> ''),
  constraint calls_consent_check check (consent in ('pending', 'granted', 'refused')),
  constraint calls_status_check check (status in (
    'draft', 'uploaded', 'transcribing', 'transcribed', 'extracting', 'ready', 'failed')),
  -- No audio without explicit consent.
  constraint calls_audio_requires_consent check (audio_path is null or consent = 'granted'),
  constraint calls_id_org_key unique (id, organization_id),
  constraint calls_project_same_org
    foreign key (project_id, organization_id) references public.projects (id, organization_id)
);

create index calls_project_idx on public.calls (project_id, occurred_at desc);

-- Consent changes are timestamped and attributed by the database.
create or replace function public.calls_track_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.consent is distinct from old.consent then
    new.consent_recorded_at := case when new.consent = 'pending' then null else now() end;
    new.consent_recorded_by := case when new.consent = 'pending' then null else public.auth_person_id() end;
  end if;
  return new;
end;
$$;

revoke execute on function public.calls_track_consent() from public, anon, authenticated;

create trigger b_track_consent
  before insert or update on public.calls
  for each row execute function public.calls_track_consent();

create table public.transcripts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  call_id uuid not null,
  text text not null,
  language text,
  duration_seconds numeric,
  -- [{ "start": number, "end": number, "text": string }]
  segments jsonb not null default '[]'::jsonb,
  provider text not null,
  model text not null,
  processing_ms integer,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint transcripts_segments_array check (jsonb_typeof(segments) = 'array'),
  constraint transcripts_id_org_key unique (id, organization_id),
  constraint transcripts_call_same_org
    foreign key (call_id, organization_id) references public.calls (id, organization_id)
);

create index transcripts_call_idx on public.transcripts (call_id, created_at desc);

create table public.call_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  call_id uuid not null,
  transcript_id uuid not null,
  summary text not null,
  provider text not null,
  model text not null,
  processing_ms integer,
  input_tokens integer,
  output_tokens integer,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint call_reports_id_org_key unique (id, organization_id),
  constraint call_reports_call_same_org
    foreign key (call_id, organization_id) references public.calls (id, organization_id),
  constraint call_reports_transcript_same_org
    foreign key (transcript_id, organization_id) references public.transcripts (id, organization_id)
);

create index call_reports_call_idx on public.call_reports (call_id, created_at desc);

-- One row per extracted item, report lines and brief proposals alike.
-- located/start/end come from code (lib/ai/provenance.ts), never the model.
create table public.report_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  report_id uuid not null,
  kind text not null,
  position integer not null,
  what text not null,
  who text,
  why text,
  need_family text,
  quote text not null,
  located text not null,
  start_seconds numeric,
  end_seconds numeric,
  created_at timestamptz not null default now(),
  constraint report_items_kind_check check (kind in (
    'decided', 'open', 'next_action', 'objective', 'timing', 'frame', 'need', 'team')),
  constraint report_items_family_check check (
    (kind = 'need') = (need_family is not null)
    and (need_family is null or need_family in (
      'creation_content', 'promotion_distribution', 'experiences_activations', 'other'))),
  constraint report_items_located_check check (located in ('timed', 'found', 'missing')),
  constraint report_items_timing_check check ((located = 'timed') = (start_seconds is not null)),
  constraint report_items_id_org_key unique (id, organization_id),
  constraint report_items_report_same_org
    foreign key (report_id, organization_id) references public.call_reports (id, organization_id)
);

create index report_items_report_idx on public.report_items (report_id, kind, position);

-- Private audio bucket. Objects live under "<organization_id>/<call_id>/<file>".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('call-audio', 'call-audio', false, 104857600,
        array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav',
              'audio/webm', 'audio/ogg', 'audio/flac', 'video/mp4'])
on conflict (id) do nothing;

create policy call_audio_select_members
  on storage.objects for select to authenticated
  using (bucket_id = 'call-audio'
         and public.is_active_member(public.try_uuid((storage.foldername(name))[1])));

create policy call_audio_insert_members
  on storage.objects for insert to authenticated
  with check (bucket_id = 'call-audio'
              and public.is_active_member(public.try_uuid((storage.foldername(name))[1])));
