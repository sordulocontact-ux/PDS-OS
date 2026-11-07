"use client";

import { useState } from "react";

import { AttendeeChips } from "@/components/calls/prep/attendee-chips";
import { MasterForm } from "@/components/catalog/master-page/master-form";
import { SessionEngineerField } from "@/components/catalog/master-page/session-engineer-field";
import {
  SessionNotesField,
  SessionWhenFields,
  useSessionKind,
} from "@/components/catalog/master-page/session-fields";
import { OptionSelect } from "@/components/projects/option-select";
import { FormSection } from "@/components/ui/form-section";
import type { PrepPerson } from "@/lib/calls/prep/types";
import { sessions } from "@/lib/i18n/fr/sessions";
import { saveStudioSession } from "@/lib/sessions/actions";
import type { SessionFormData } from "@/lib/sessions/form-data";
import type { StudioSession } from "@/lib/sessions/types";

const fr = { sessions };

/**
 * « Nouvelle session » / « Modifier » (Sessions studio) in three parts (Ibé,
 * 06/11/2026): the séance (kind, date, hours, place), who takes part (its
 * artists first, required, then the engineer and the participants), what is
 * worked on (titles or maquettes, whose projects come along, other projects,
 * the preparation notes). Never a state: it is computed. Opened from an
 * artist or a project, that one is already chosen. A new session opens on
 * its page once created; its titles are then changed from there.
 */
export function StudioSessionForm({
  data,
  session,
  defaultArtistIds = [],
  defaultProjectIds = [],
  onDone,
}: {
  data: SessionFormData;
  session: StudioSession | null;
  defaultArtistIds?: string[];
  defaultProjectIds?: string[];
  onDone: () => void;
}) {
  const t = fr.sessions.form;
  const [kind, setKind] = useSessionKind(session);
  // Opened from a project: its artist is chosen too (never retyped).
  const artistIds = defaultArtistIds.length
    ? defaultArtistIds
    : [
        ...new Set(
          defaultProjectIds.flatMap((id) => data.projectArtists[id] ?? []),
        ),
      ];
  const [people, setPeople] = useState<PrepPerson[]>(() => {
    const keys = session?.attendees.map((a) => a.key) ?? [];
    return data.people.filter((p) => keys.includes(p.key));
  });
  return (
    <MasterForm
      action={saveStudioSession}
      hidden={{ sessionId: session?.id }}
      onDone={onDone}
    >
      {({ value, error }) => (
        <>
          <FormSection plain title={t.when}>
            <SessionWhenFields
              session={session}
              onKind={setKind}
              value={value}
              error={error}
            />
          </FormSection>
          <FormSection plain title={t.who}>
            <OptionSelect
              multiple
              name="artistIds"
              label={t.artists}
              required
              placeholder={t.artistsPlaceholder}
              items={data.artists}
              defaultValue={session?.artists.map((a) => a.id) ?? artistIds}
              error={error("artistIds")}
            />
            <SessionEngineerField
              masterId={null}
              kind={kind}
              defaultName={value("engineer", session?.engineer)}
              defaultRef={
                value("engineerRef", session?.engineerContactId) || null
              }
              error={error("engineer")}
            />
            <AttendeeChips
              id="session-attendees"
              pool={data.people}
              value={people}
              onChange={setPeople}
              hint={t.participantsHint}
              hiddenNames
              filesEmails
              invitesAll={false}
            />
          </FormSection>
          <FormSection plain title={t.what}>
            {!session && (
              <OptionSelect
                multiple
                name="titleIds"
                label={t.titles}
                placeholder={t.titlesPlaceholder}
                hint={t.titlesHint}
                items={data.titles}
                defaultValue={[]}
                error={error("titleIds")}
              />
            )}
            <OptionSelect
              multiple
              name="projectIds"
              label={t.projects}
              placeholder={t.projectsPlaceholder}
              hint={t.projectsHint}
              items={data.projects}
              defaultValue={session?.linkedProjectIds ?? defaultProjectIds}
              error={error("projectIds")}
            />
            <SessionNotesField
              session={session}
              label={t.notes}
              placeholder={t.notesPlaceholder}
              value={value}
              error={error}
            />
          </FormSection>
        </>
      )}
    </MasterForm>
  );
}
