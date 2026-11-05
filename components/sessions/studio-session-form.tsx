"use client";

import { useState } from "react";

import { AttendeeChips } from "@/components/calls/prep/attendee-chips";
import { MasterForm } from "@/components/catalog/master-page/master-form";
import { SessionFields } from "@/components/catalog/master-page/session-fields";
import { OptionSelect } from "@/components/projects/option-select";
import type { PrepPerson } from "@/lib/calls/prep/types";
import { sessions } from "@/lib/i18n/fr/sessions";
import { saveStudioSession } from "@/lib/sessions/actions";
import type { SessionFormData } from "@/lib/sessions/form-data";
import type { StudioSession } from "@/lib/sessions/types";

const fr = { sessions };

/**
 * « Nouvelle session » / « Modifier » (Sessions studio): the session's fields,
 * the artists and projects it concerns (at least one), and who takes part
 * (the team and the Réseau). Opened from an artist or a project, that one is
 * already chosen. A new session opens on its page once created.
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
          <SessionFields
            masterId={null}
            session={session}
            defaultStatus="planned"
            value={value}
            error={error}
          />
          <OptionSelect
            multiple
            name="artistIds"
            label={t.artists}
            placeholder={t.artistsPlaceholder}
            items={data.artists}
            defaultValue={session?.artists.map((a) => a.id) ?? defaultArtistIds}
            error={error("artistIds")}
          />
          <OptionSelect
            multiple
            name="projectIds"
            label={t.projects}
            placeholder={t.projectsPlaceholder}
            items={data.projects}
            defaultValue={
              session?.projects.map((p) => p.id) ?? defaultProjectIds
            }
            error={error("projectIds")}
          />
          <AttendeeChips
            id="session-attendees"
            pool={data.people}
            value={people}
            onChange={setPeople}
            hint={t.participantsHint}
            hiddenNames
            filesEmails
          />
        </>
      )}
    </MasterForm>
  );
}
