"use client";

import { useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { FieldError, FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { toast } from "@/components/ui/toast";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import { setProjectMainArtist } from "@/lib/projects/main-artist-actions";
import {
  addTitleParticipation,
  setTitleParticipationStatus,
} from "@/lib/projects/participation-actions";
import {
  PARTICIPATION_STATUSES,
  type ParticipationRole,
  type ParticipationStatus,
  type TitleParticipation,
} from "@/lib/projects/participation-rules";
import {
  addProjectTitle,
  attachCatalogTitle,
  renameProjectTitle,
} from "@/lib/projects/title-actions";
import { masterNameOf, type ProjectTitle } from "@/lib/projects/title-rules";

const fr = { dialogs, projectTitles };

const NO_MASTER = "none";

/** Who may be added to a title, or made the main artist: the Catalogue's
 * active artists (id → name), and the project's main artist (credited on
 * every title, never a participation). */
export type ArtistChoices = {
  options: Record<string, string>;
  mainArtistId: string | null;
};

/** « Ajouter un titre »: a working title or none (« Titre 3 (à nommer) »),
 * a title of the Catalogue or none yet. */
export function AddTitleForm({
  projectId,
  masterOptions,
  onDone,
}: {
  projectId: string;
  // The Catalogue's titles not in the project yet: id → « Titre · Artistes ».
  masterOptions: Record<string, string>;
  onDone: () => void;
}) {
  const t = fr.projectTitles.add;
  const [masterId, setMasterId] = useState(NO_MASTER);
  const { pending, error, run } = useWriteSubmit(onDone, t.done);
  const options = { [NO_MASTER]: t.noMaster, ...masterOptions };
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const name = String(
          new FormData(event.currentTarget).get("workingTitle") ?? "",
        ).trim();
        run(() =>
          addProjectTitle({
            projectId,
            workingTitle: name || null,
            masterId: masterId === NO_MASTER ? null : masterId,
          }),
        );
      }}
    >
      <Field name="workingTitle" label={t.name} maxLength={200} autoFocus />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-title-master">{t.master}</Label>
        <SearchSelect
          id="project-title-master"
          label={t.master}
          options={options}
          value={masterId}
          onChange={setMasterId}
          searchPlaceholder={t.masterSearch}
          emptyLabel={t.masterEmpty}
          fill
        />
        <p className="text-caption text-muted-foreground">{t.masterHint}</p>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.submit}
        onCancel={onDone}
      />
    </form>
  );
}

/** « Rattacher un titre du Catalogue » (lot 7): a title of the project not
 * in the Catalogue yet takes one the Catalogue has (searched). Nothing
 * chosen: said in red at the first try, never a disabled button. */
export function AttachCatalogTitleForm({
  projectId,
  titleId,
  masterOptions,
  onDone,
}: {
  projectId: string;
  titleId: string;
  masterOptions: Record<string, string>;
  onDone: () => void;
}) {
  const t = fr.projectTitles;
  const [masterId, setMasterId] = useState("");
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.catalogAttach.done);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!masterId) return setMissing(true);
        run(() => attachCatalogTitle({ projectId, titleId, masterId }));
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`attach-master-${titleId}`}>{t.add.master}</Label>
        <SearchSelect
          id={`attach-master-${titleId}`}
          label={t.add.master}
          options={masterOptions}
          value={masterId}
          onChange={(value) => {
            setMasterId(value);
            setMissing(false);
          }}
          placeholder={t.catalogAttach.placeholder}
          searchPlaceholder={t.add.masterSearch}
          emptyLabel={t.add.masterEmpty}
          invalid={missing}
          describedBy={missing ? `attach-master-${titleId}-error` : undefined}
          fill
        />
        <FieldError id={`attach-master-${titleId}-error`}>
          {missing ? t.errors.masterRequired : undefined}
        </FieldError>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.catalogAttach.submit}
        onCancel={onDone}
      />
    </form>
  );
}

/** « Renommer »: left empty, the title takes its master's name back, or
 * « à nommer ». « Nommer » (a title without a name, lot L2b) is the same
 * form, its own words given, with « Rattacher un titre du Catalogue » under
 * the field when the title is not in the Catalogue yet (`onAttach`). */
export function RenameTitleForm({
  projectId,
  title,
  submitLabel,
  doneMessage,
  onAttach,
  onDone,
}: {
  projectId: string;
  title: ProjectTitle;
  submitLabel?: string;
  doneMessage?: string;
  onAttach?: () => void;
  onDone: () => void;
}) {
  const t = fr.projectTitles.rename;
  const { pending, error, run } = useWriteSubmit(onDone, doneMessage ?? t.done);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const name = String(
          new FormData(event.currentTarget).get("workingTitle") ?? "",
        ).trim();
        run(() =>
          renameProjectTitle({
            projectId,
            titleId: title.id,
            workingTitle: name,
          }),
        );
      }}
    >
      <Field
        name="workingTitle"
        label={fr.projectTitles.add.name}
        defaultValue={title.workingTitle ?? ""}
        // Left empty, the title takes its master's name back: said here.
        placeholder={masterNameOf(title.master) ?? undefined}
        maxLength={200}
        autoFocus
      />
      {onAttach && (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={onAttach}>
            {fr.projectTitles.catalogAttach.action}
          </Button>
        </div>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={submitLabel ?? t.submit}
        onCancel={onDone}
      />
    </form>
  );
}

// At the addition, the statuses that open a participation; declined and
// withdrawn come later, by « Changer le statut » or « Retirer du titre ».
const START_STATUSES = ["proposed", "invited", "confirmed"] as const;

/** « Ajouter un artiste » to a title (rattacher): the artist (searched among
 * the Catalogue's, less the main artist and those already on it), its role
 * (featuring by default: a guest), where it stands (« À contacter » by
 * default). Nothing chosen: said in red at the first try, never a disabled
 * button. An artist already invited on another title of the project
 * (décision 4.1: allowed) is confirmed first, in the form: « Jay est déjà
 * invité sur Titre de Jay (à nommer). L'inviter aussi sur ce titre ? ». */
export function AddParticipationForm({
  projectId,
  title,
  artists,
  invitedOn = {},
  onDone,
}: {
  projectId: string;
  title: ProjectTitle | { id: string; participations: TitleParticipation[] };
  artists: ArtistChoices;
  // Artist id → the labels of the project's other titles where they are
  // invited (a participation neither declined nor withdrawn).
  invitedOn?: Record<string, string[]>;
  onDone: () => void;
}) {
  const t = fr.projectTitles.participations;
  const [artistId, setArtistId] = useState("");
  const [role, setRole] = useState<ParticipationRole>("featuring");
  const [status, setStatus] = useState<ParticipationStatus>("proposed");
  const [missing, setMissing] = useState(false);
  // The artist whose second title was confirmed (asked once per artist).
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const elsewhere = artistId ? (invitedOn[artistId] ?? []) : [];
  const { pending, error, run } = useWriteSubmit(onDone, t.add.done);
  const taken = new Set(title.participations.map((p) => p.artist.id));
  const options = Object.fromEntries(
    Object.entries(artists.options).filter(
      ([id]) => id !== artists.mainArtistId && !taken.has(id),
    ),
  );

  if (Object.keys(options).length === 0)
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] text-[color:var(--text-secondary)]">
          {t.add.noArtist}
        </p>
        <div>
          <Button type="button" variant="outline" size="lg" onClick={onDone}>
            {fr.dialogs.close}
          </Button>
        </div>
      </div>
    );

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setMissing(!artistId);
        // The field in red takes the focus (docs/DESIGN.md « Manques à la
        // validation »).
        if (!artistId)
          return void document.getElementById("participation-artist")?.focus();
        if (elsewhere.length > 0 && confirmed !== artistId) {
          setConfirmed(artistId);
          return setAsking(true);
        }
        run(() =>
          addTitleParticipation({
            projectId,
            titleId: title.id,
            artistId,
            role,
            status,
          }),
        );
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="participation-artist" required>
          {t.add.artist}
        </Label>
        <SearchSelect
          id="participation-artist"
          label={t.add.artist}
          options={options}
          value={artistId}
          onChange={(next) => {
            setArtistId(next);
            setMissing(false);
            setAsking(false);
            setConfirmed(null);
          }}
          placeholder={t.add.artistPlaceholder}
          searchPlaceholder={t.add.artistSearch}
          emptyLabel={t.add.artistEmpty}
          required
          invalid={missing}
          describedBy={missing ? "participation-artist-error" : undefined}
          fill
        />
        <FieldError id="participation-artist-error">
          {missing ? t.add.artistRequired : undefined}
        </FieldError>
      </div>
      <ChipChoice
        name="role"
        legend={t.add.role}
        required
        options={[
          { value: "featuring", label: t.roles.featuring },
          { value: "main", label: t.roles.main },
        ]}
        value={role}
        onChange={(next) => next && setRole(next)}
        fill
      />
      <ChipChoice
        name="status"
        legend={t.add.status}
        required
        options={START_STATUSES.map((value) => ({
          value,
          label: t.statuses[value],
        }))}
        value={status as (typeof START_STATUSES)[number]}
        onChange={(next) => next && setStatus(next)}
        fill
      />
      {asking && elsewhere.length > 0 && (
        <ToneCallout tone="warning" role="status">
          {t.add.alreadyInvited(artists.options[artistId] ?? "", elsewhere)}
        </ToneCallout>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={asking ? t.add.alreadyInvitedSubmit : t.add.submit}
        onCancel={onDone}
      />
    </form>
  );
}

/** « Changer le statut » of a participation: declined or withdrawn, it
 * stays listed; confirmed, the title is credited. */
export function ParticipationStatusForm({
  projectId,
  participation,
  onDone,
}: {
  projectId: string;
  participation: TitleParticipation;
  onDone: () => void;
}) {
  const t = fr.projectTitles.participations;
  const { pending, error, run } = useWriteSubmit(onDone, t.status.done);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const status = String(
          new FormData(event.currentTarget).get("status") ?? "",
        );
        run(() =>
          setTitleParticipationStatus({
            projectId,
            participationId: participation.id,
            status,
          }),
        );
      }}
    >
      <OptionSelect
        name="status"
        label={t.status.label}
        required
        items={Object.fromEntries(
          PARTICIPATION_STATUSES.map((status) => [status, t.statuses[status]]),
        )}
        defaultValue={participation.status}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.status.submit}
        onCancel={onDone}
      />
    </form>
  );
}

/** « Changer l'artiste principal » (set_project_main_artist): one artist of
 * the Catalogue. A refusal about the artist (a guest of a title, named) is
 * said under the field, in red; any other above the buttons. */
export function MainArtistForm({
  projectId,
  artists,
  onDone,
}: {
  projectId: string;
  artists: ArtistChoices;
  onDone: () => void;
}) {
  const t = fr.projectTitles.mainArtist;
  const [artistId, setArtistId] = useState(artists.mainArtistId ?? "");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fail = (message: string) => {
    setFieldError(message);
    document.getElementById("main-artist")?.focus();
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setFormError(null);
        if (!artistId) return fail(t.artistRequired);
        if (artistId === artists.mainArtistId) return fail(t.same);
        startTransition(async () => {
          const result = await setProjectMainArtist({ projectId, artistId });
          if (!result.ok) {
            if (result.field) return fail(result.error);
            return setFormError(result.error);
          }
          toast.success(t.done);
          onDone();
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="main-artist" required>
          {t.label}
        </Label>
        <SearchSelect
          id="main-artist"
          label={t.label}
          options={artists.options}
          value={artistId}
          onChange={(next) => {
            setArtistId(next);
            setFieldError(null);
          }}
          placeholder={t.placeholder}
          searchPlaceholder={t.search}
          emptyLabel={t.empty}
          required
          invalid={fieldError !== null}
          describedBy={fieldError ? "main-artist-error" : undefined}
          fill
        />
        <FieldError id="main-artist-error">
          {fieldError ?? undefined}
        </FieldError>
      </div>
      {formError && <FormMessage kind="error">{formError}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.submit}
        onCancel={onDone}
      />
    </form>
  );
}
