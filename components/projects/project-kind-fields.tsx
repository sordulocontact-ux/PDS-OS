"use client";

import { IconFolderOpen, IconMicrophone } from "nucleo-sharp-essential";
import { useState } from "react";

import { FieldError } from "@/components/auth/form-message";
import { MasterPicker } from "@/components/catalog/master-picker";
import { IconBriefcase } from "@/components/icons";
import {
  CollectiveOption,
  CollectiveGuestsField,
  CollectiveSelectionField,
} from "@/components/projects/collective-fields";
import { ContentFormatField } from "@/components/projects/content-format-field";
import { ProjectArtistField } from "@/components/projects/project-artist-field";
import { ChipChoice } from "@/components/ui/chip-choice";
import { ChoiceCards } from "@/components/ui/choice-cards";
import type { FieldErrors } from "@/lib/auth/form-state";
import type { ArtistOption, MasterOption } from "@/lib/catalog/types";
import { shell } from "@/lib/i18n/fr/shell";
import type {
  CollectiveContext,
  SelectionOption,
} from "@/lib/projects/collective-rules";
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
 * How the « Projet collectif » option shows (lot 5 of docs/pds-mic-plan.md):
 * `choose` = the option to tick (creation by the direction); `holder` = a
 * project made from the viewer's selection, collective whatever happens;
 * `fixed` = a collective being edited (no option, its main artist only).
 */
export type CollectiveMode = "choose" | "holder" | "fixed";

/**
 * "Le projet" of the project form: Type → Format → linked objects. Music:
 * its format, then the masters (one for a single). Content: an existing PDS
 * format or a one-off content, then the artist if there is one. Event: shown,
 * closed in V1. The branch not chosen stays mounted, hidden, so going back
 * and forth loses nothing; the server drops what the type does not use.
 * A collective (ticked under the type): the PDS Mic model proposed (content,
 * PDS Mic), its main artist (PDS proposed) in place of the content's
 * artist, the selection of artists it copies and the guests named here.
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
  collective = false,
  onCollectiveChange,
  collectiveMode = null,
  collectiveContext = null,
  selectionId = null,
  onSelectionChange,
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
    mainArtistId?: string | null;
    masterIds: string[];
    guestArtistIds?: string[];
  };
  masters: MasterOption[];
  artists: ArtistOption[];
  contentFormats: ContentFormatOption[];
  errors: FieldErrors;
  collective?: boolean;
  onCollectiveChange?: (collective: boolean) => void;
  collectiveMode?: CollectiveMode | null;
  collectiveContext?: CollectiveContext | null;
  selectionId?: string | null;
  onSelectionChange?: (selection: SelectionOption | null) => void;
}) {
  const t = fr.shell.newProject.fields;
  const c = fr.shell.newProject.collective;
  const [musicFormat, setMusicFormat] = useState(defaults.musicFormat);
  const [contentMode, setContentMode] = useState(defaults.contentMode);
  const [contentFormatId, setContentFormatId] = useState(
    defaults.contentFormatId,
  );
  const [mainArtistId, setMainArtistId] = useState(
    defaults.mainArtistId ?? collectiveContext?.houseArtistId ?? null,
  );
  // The guests named in the form (direction), kept across a refusal.
  const [guests, setGuests] = useState<ArtistOption[]>(() =>
    (defaults.guestArtistIds ?? []).flatMap((id) =>
      artists.filter((a) => a.id === id),
    ),
  );
  // A field corrected since the server's refusal is back to normal
  // (docs/DESIGN.md « Manques à la validation »): the errors it answered.
  const [corrected, setCorrected] = useState<{
    mainArtistId?: FieldErrors;
    selectionId?: FieldErrors;
  }>({});
  const errorOf = (field: "mainArtistId" | "selectionId") =>
    corrected[field] === errors ? undefined : errors[field];
  // An event created before V1 stays one when it is edited.
  const [eventOpen] = useState(type === "event");
  const single = musicFormat === "single";

  // Ticked: the PDS Mic model, where nothing else was chosen yet (a music
  // collective keeps its type and its titles).
  function toggleCollective(next: boolean) {
    onCollectiveChange?.(next);
    if (!next || type === "music_release") return;
    if (type !== "content") onTypeChange("content");
    if (!contentMode) setContentMode("format");
    if (!contentFormatId && collectiveContext?.modelFormatId)
      setContentFormatId(collectiveContext.modelFormatId);
  }

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

      {collectiveMode && (
        <CollectiveOption
          checked={collective}
          onChange={toggleCollective}
          locked={
            collectiveMode === "holder"
              ? "selection"
              : collectiveMode === "fixed"
                ? "edit"
                : null
          }
        />
      )}

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
            selectedId={contentFormatId}
            onSelect={setContentFormatId}
            error={errors.contentFormatId}
          />
        </div>
        {/* A collective names its main artist below instead. */}
        <div className={cn(collective && "hidden")}>
          <ProjectArtistField
            artists={artists}
            defaultSelectedId={defaults.artistId}
            error={errors.artistId}
          />
        </div>
      </div>

      {collectiveMode && (
        <div
          className={cn(
            "flex flex-col gap-5",
            (!collective || type === null) && "hidden",
          )}
        >
          <ProjectArtistField
            name="mainArtistId"
            legend={c.mainArtist}
            searchLabel={c.mainArtistSearch}
            required
            artists={artists}
            defaultSelectedId={mainArtistId}
            // Any change answers the refusal: the artist it named is gone
            // (emptied, the form asks again on submit).
            onChange={(id) => {
              setMainArtistId(id);
              setCorrected((c) => ({ ...c, mainArtistId: errors }));
            }}
            error={errorOf("mainArtistId")}
          />
          {collectiveMode !== "fixed" && collectiveContext && (
            <CollectiveSelectionField
              selections={collectiveContext.selections}
              selectedId={selectionId}
              onSelect={(selection) => {
                onSelectionChange?.(selection);
                setCorrected((c) => ({ ...c, selectionId: errors }));
              }}
              mainArtistId={mainArtistId}
              required={collectiveMode === "holder"}
              error={errorOf("selectionId")}
            />
          )}
          {collectiveMode === "choose" && (
            <CollectiveGuestsField
              artists={artists}
              value={guests}
              onChange={setGuests}
              mainArtistId={mainArtistId}
              error={errors.guestArtistIds}
            />
          )}
        </div>
      )}
    </>
  );
}
