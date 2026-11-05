"use client";

import { IconPenWriting2, IconPlus } from "nucleo-sharp-essential";

import { StudioSessionForm } from "@/components/sessions/studio-session-form";
import { LoadedFormButton } from "@/components/ui/loaded-form-button";
import { sessions } from "@/lib/i18n/fr/sessions";
import { loadSessionFormData } from "@/lib/sessions/form-data";
import type { StudioSession } from "@/lib/sessions/types";

const fr = { sessions };

/**
 * « Nouvelle session » (the list, an artist, a project: that one already
 * chosen) or « Modifier » (`session` given): the form in the modal, its
 * choices read when it opens.
 */
export function SessionFormButton({
  session = null,
  artistId,
  projectId,
  size = "lg",
  variant = "default",
}: {
  session?: StudioSession | null;
  artistId?: string;
  projectId?: string;
  size?: "lg" | "sm";
  variant?: "default" | "outline";
}) {
  const t = fr.sessions;
  return (
    <LoadedFormButton
      label={session ? t.page.edit : t.newSession}
      icon={session ? IconPenWriting2 : IconPlus}
      size={size}
      variant={session ? "outline" : variant}
      title={session ? t.form.editTitle : t.form.createTitle}
      description={t.form.description}
      closeLabel={fr.sessions.page.close}
      load={loadSessionFormData}
    >
      {(data, close) => (
        <StudioSessionForm
          data={data}
          session={session}
          defaultArtistIds={artistId ? [artistId] : []}
          defaultProjectIds={projectId ? [projectId] : []}
          onDone={close}
        />
      )}
    </LoadedFormButton>
  );
}
