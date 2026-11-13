"use client";

import {
  AddTitleForm,
  MainArtistForm,
  type ArtistChoices,
} from "@/components/projects/titles/title-forms";
import { DialogButton } from "@/components/ui/dialog-button";
import { projectTitles } from "@/lib/i18n/fr/project-titles";

const fr = { projectTitles };

/**
 * The gestures at the head of « Titres et artistes » (lot 6 of
 * docs/pds-mic-plan.md), for whoever writes the project: « Ajouter un
 * titre » in outline, then « Changer l'artiste principal » in text beside it
 * (docs/DESIGN.md « Bouton secondaire »: a ghost only next to an outline).
 * Before the launch the main artist is changed in the project's form:
 * `mainArtist` false.
 */
export function TitlesActions({
  projectId,
  masterOptions,
  artists,
  mainArtist = true,
}: {
  projectId: string;
  // The Catalogue's titles not in the project yet: id → « Titre · Artistes ».
  masterOptions: Record<string, string>;
  artists: ArtistChoices;
  mainArtist?: boolean;
}) {
  const t = fr.projectTitles;
  const current = artists.mainArtistId
    ? (artists.options[artists.mainArtistId] ?? null)
    : null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DialogButton
        label={t.add.button}
        title={t.add.title}
        description={t.add.description}
      >
        {(close) => (
          <AddTitleForm
            projectId={projectId}
            masterOptions={masterOptions}
            onDone={close}
          />
        )}
      </DialogButton>
      {mainArtist && (
        <DialogButton
          label={t.mainArtist.action}
          variant="ghost"
          title={t.mainArtist.title}
          description={t.mainArtist.description(current)}
        >
          {(close) => (
            <MainArtistForm
              projectId={projectId}
              artists={artists}
              onDone={close}
            />
          )}
        </DialogButton>
      )}
    </div>
  );
}
