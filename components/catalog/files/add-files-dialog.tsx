"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { FileDetailsFields } from "@/components/catalog/files/file-details-fields";
import { PendingFiles } from "@/components/catalog/files/pending-files";
import { useCatalogUpload } from "@/components/catalog/files/use-catalog-upload";
import { Button } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { FormDialog } from "@/components/ui/form-dialog";
import { readAudioDuration } from "@/lib/catalog/audio-duration";
import {
  AUDIO_FORMAT_LIST,
  isAudioFile,
  type FileOwner,
} from "@/lib/catalog/file-rules";
import { AUDIO_STATES, type AudioState } from "@/lib/catalog/title-rules";
import { catalog } from "@/lib/i18n/fr/catalog";
import { catalogFiles } from "@/lib/i18n/fr/catalog-files";
import { masterPage } from "@/lib/i18n/fr/master-page";

const fr = { catalog, catalogFiles, masterPage };

// What the modal asks: a category and a precision (a library), or the audio
// state the files stand for (the audio versions of a title).
export type AddFilesMode =
  | {
      kind: "library";
      suggested: string | null;
      // A scoped writer: only these categories are offered.
      categories?: readonly string[];
    }
  | { kind: "audio"; defaultState: AudioState };

// Files just dropped or picked: where to classify them, then Ajouter. They
// share the category and the precision (or the audio state); once recorded,
// the page refreshes from the server and shows them.
export function AddFilesDialog({
  organizationId,
  owner,
  files,
  mode,
  onClose,
  onAdded,
}: {
  organizationId: string;
  owner: FileOwner;
  // null: closed.
  files: File[] | null;
  mode: AddFilesMode;
  onClose: () => void;
  onAdded: (category: string) => void;
}) {
  const t =
    mode.kind === "audio" ? fr.masterPage.audio.dialog : fr.catalogFiles.add;
  const count = files?.length ?? 0;
  return (
    <FormDialog
      open={files !== null}
      onOpenChange={(open) => !open && onClose()}
      title={fr.catalogFiles.add.title(count)}
      description={count > 1 ? t.descriptionMany : t.description}
      closeLabel={fr.catalogFiles.close}
    >
      {files && (
        <AddFilesForm
          organizationId={organizationId}
          owner={owner}
          files={files}
          mode={mode}
          onCancel={onClose}
          onAdded={onAdded}
        />
      )}
    </FormDialog>
  );
}

function AddFilesForm({
  organizationId,
  owner,
  files,
  mode,
  onCancel,
  onAdded,
}: {
  organizationId: string;
  owner: FileOwner;
  files: File[];
  mode: AddFilesMode;
  onCancel: () => void;
  onAdded: (category: string) => void;
}) {
  const t = fr.catalogFiles;
  const a = fr.masterPage.audio;
  const audio = mode.kind === "audio";
  // Files still to send: after a partial failure, only the failed ones.
  const [remaining, setRemaining] = useState(files);
  const [category, setCategory] = useState<string | null>(
    audio ? "audio" : mode.suggested,
  );
  const [audioState, setAudioState] = useState<AudioState>(
    audio ? mode.defaultState : "demo",
  );
  // Dropped files are not filtered by the picker's `accept`.
  const notAudio = audio && remaining.some((file) => !isAudioFile(file));
  const [description, setDescription] = useState("");
  const [categoryError, setCategoryError] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const { run, pending, done } = useCatalogUpload();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!category) {
      setCategoryError(t.fields.categoryRequired);
      return;
    }
    if (notAudio) return;
    setError(null);
    run(
      remaining,
      async (file) =>
        audio
          ? {
              organizationId,
              owner,
              category,
              file,
              audioState,
              durationSeconds: await readAudioDuration(file),
            }
          : { organizationId, owner, category, description, file },
      (failed, lastError) => {
        if (failed.length === 0) {
          onAdded(category);
          return;
        }
        setRemaining(failed);
        setError(
          remaining.length === 1 ? lastError : t.add.partial(failed.length),
        );
      },
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <PendingFiles files={remaining} />
      {audio ? (
        <fieldset disabled={pending} className="contents">
          <ChipChoice
            name="audioState"
            legend={a.stateLabel}
            required
            options={AUDIO_STATES.map((value) => ({
              value,
              label: fr.catalog.audioStates[value],
            }))}
            value={audioState}
            onChange={(value) => value && setAudioState(value)}
          />
        </fieldset>
      ) : (
        <FileDetailsFields
          kind={owner.kind}
          category={category}
          onCategory={(value) => {
            setCategory(value);
            setCategoryError(undefined);
          }}
          description={description}
          onDescription={setDescription}
          categoryError={categoryError}
          disabled={pending}
          categories={mode.kind === "library" ? mode.categories : undefined}
        />
      )}
      <p className="text-xs text-muted-foreground">
        {audio ? a.hint(AUDIO_FORMAT_LIST) : t.hint}
      </p>
      {notAudio && (
        <FormMessage kind="error">{a.notAudio(AUDIO_FORMAT_LIST)}</FormMessage>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={pending || notAudio}
          aria-busy={pending || undefined}
        >
          {pending
            ? remaining.length > 1
              ? t.add.uploadingMany(
                  Math.min(done + 1, remaining.length),
                  remaining.length,
                )
              : t.add.uploading
            : t.add.submit}
        </Button>
      </div>
    </form>
  );
}
