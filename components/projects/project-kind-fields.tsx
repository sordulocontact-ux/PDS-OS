"use client";

import { IconFolderOpen, IconMicrophone } from "nucleo-sharp-essential";
import { useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { MasterPicker } from "@/components/catalog/master-picker";
import { IconBriefcase } from "@/components/icons";
import { ContentFormatField } from "@/components/projects/content-format-field";
import { ProjectArtistField } from "@/components/projects/project-artist-field";
import { ChipChoice } from "@/components/ui/chip-choice";
import { ChoiceCards } from "@/components/ui/choice-cards";
import type { FieldErrors } from "@/lib/auth/form-state";
import type { ArtistOption, MasterOption } from "@/lib/catalog/types";
import { shell } from "@/lib/i18n/fr/shell";
import {
  CONTENT_MODES,
  MUSIC_FORMATS,
  type ContentFormatOption,
  type ContentMode,
  type MusicFormat,
  type ProjectType,
} from "@/lib/projects/types";
import { cn } from "@/lib/utils";

const fr = { shell };

const TYPE_ICONS: Record<ProjectType, React.ReactNode> = {
  music_release: <IconMicrophone className="size-6" aria-hidden />,
  content: <IconFolderOpen className="size-6" aria-hidden />,
  event: <IconBriefcase className="size-6" aria-hidden />,
};

/**
 * "Le projet" of the project form: Type → Format → linked objects. Music:
 * its format, then the masters (one for a single). Content: an existing PDS
 * format or a one-off content, then the artist if there is one. Event: shown,
 * closed in V1. The branch not chosen stays mounted, hidden, so going back
 * and forth loses nothing; the server drops what the type does not use.
 */
export function ProjectKindFields({
  type,
  onTypeChange,
  defaults,
  masters,
  artists,
  contentFormats,
  errors,
  onMastersChange,
}: {
  type: ProjectType | null;
  onTypeChange: (type: ProjectType) => void;
  // The titles chosen: the project's name follows a single one.
  onMastersChange?: (masters: MasterOption[]) => void;
  defaults: {
    musicFormat: MusicFormat | null;
    contentMode: ContentMode | null;
    contentFormatId: string | null;
    artistId: string | null;
    masterIds: string[];
  };
  masters: MasterOption[];
  artists: ArtistOption[];
  contentFormats: ContentFormatOption[];
  errors: FieldErrors;
}) {
  const t = fr.shell.newProject.fields;
  const [musicFormat, setMusicFormat] = useState(defaults.musicFormat);
  const [contentMode, setContentMode] = useState(defaults.contentMode);
  // An event created before V1 stays one when it is edited.
  const [eventOpen] = useState(type === "event");
  const single = musicFormat === "single";

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <ChoiceCards
          name="type"
          legend={t.type}
          required
          variant="tile"
          columns={3}
          value={type}
          onChange={onTypeChange}
          choices={(["music_release", "content", "event"] as const).map(
            (value) => ({
              value,
              label: fr.shell.projectTypes[value],
              icon: TYPE_ICONS[value],
              ...(value === "event" && !eventOpen
                ? { hint: t.eventSoon, disabled: true }
                : {}),
            }),
          )}
        />
        <FieldError id="type-error">{errors.type}</FieldError>
      </div>

      <div
        className={cn(
          "flex flex-col gap-5",
          type !== "music_release" && "hidden",
        )}
      >
        <ChipChoice
          name="musicFormat"
          legend={t.format}
          required
          options={MUSIC_FORMATS.map((value) => ({
            value,
            label: fr.shell.musicFormats[value],
          }))}
          value={musicFormat}
          onChange={setMusicFormat}
          error={errors.musicFormat}
        />
        <MasterPicker
          masters={masters}
          artists={artists}
          defaultSelectedIds={defaults.masterIds}
          label={single ? t.master : t.masters}
          required
          max={single ? 1 : undefined}
          hint={single ? t.singleHint : undefined}
          error={errors.masterIds}
          onSelectionChange={onMastersChange}
        />
      </div>

      <div
        className={cn("flex flex-col gap-5", type !== "content" && "hidden")}
      >
        <ChipChoice
          name="contentMode"
          legend={t.format}
          required
          options={CONTENT_MODES.map((value) => ({
            value,
            label: t.contentModes[value],
          }))}
          value={contentMode}
          onChange={setContentMode}
          error={errors.contentMode}
        />
        <div className={cn(contentMode !== "format" && "hidden")}>
          <ContentFormatField
            formats={contentFormats}
            defaultSelectedId={defaults.contentFormatId}
            error={errors.contentFormatId}
          />
        </div>
        <ProjectArtistField
          artists={artists}
          defaultSelectedId={defaults.artistId}
          error={errors.artistId}
        />
      </div>
    </>
  );
}
