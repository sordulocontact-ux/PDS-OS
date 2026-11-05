"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { Field } from "@/components/auth/field";
import { SubmitButton } from "@/components/auth/submit-button";
import { ArtistPicker } from "@/components/catalog/artist-picker";
import { AudioFileField } from "@/components/catalog/title/audio-file-field";
import {
  CreditRowsField,
  useCreditRows,
} from "@/components/catalog/title/credit-rows-field";
import { TitleDetailsFields } from "@/components/catalog/title/title-details-fields";
import { useTitleAudioUpload } from "@/components/catalog/title/use-title-audio-upload";
import { Button, buttonVariants, ButtonRoll } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { createMaster } from "@/lib/catalog/actions";
import { updateMaster } from "@/lib/catalog/master-edit-actions";
import {
  idleCreateMasterState,
  type ArtistOption,
  type Credit,
  type MasterFormDefaults,
  type MasterOption,
} from "@/lib/catalog/types";
import { catalog } from "@/lib/i18n/fr/catalog";

const fr = { catalog };

// Title form (a "master" in the code). Title and main artist are required;
// everything else is optional but at hand, for a demo just out of the studio
// as for a finished song entered with all it has. As a page it opens the new
// title, after sending its audio file when one was chosen (organizationId
// given); inside the project form's modal (onCreated given) it hands the
// title back instead. With `masterId` it edits that title.
export function CreateMasterForm({
  artists,
  organizationId,
  defaultCredits,
  defaults,
  masterId,
  variantOf,
  onCreated,
  onCancel,
  onArtistCreated,
}: {
  artists: ArtistOption[];
  // Creation page only: where an audio file chosen here is sent.
  organizationId?: string | null;
  defaultCredits?: Credit[];
  defaults?: Partial<MasterFormDefaults>;
  masterId?: string;
  // « Nouvelle variante »: the original it is created from (retour 08).
  variantOf?: { id: string; title: string };
  onCreated?: (master: MasterOption) => void;
  onCancel?: () => void;
  onArtistCreated?: (artist: ArtistOption) => void;
}) {
  const t = fr.catalog.masterForm;
  const router = useRouter();
  const [state, action] = useActionState(
    masterId ? updateMaster : createMaster,
    idleCreateMasterState,
  );
  const saved = state.status === "error" ? (state.values ?? {}) : {};
  const values = { ...defaults, ...saved };
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  // Field ids are prefixed in the modal: the project form behind has a title too.
  const prefix = onCreated ? "master-" : "";
  const withFile = !masterId && !onCreated && !!organizationId;

  const [audioState, setAudioState] = useState(values.audioState ?? "");
  const audio = useTitleAudioUpload(organizationId ?? null);
  const credits = useCreditRows();
  const handled = useRef<unknown>(null);
  // Once created on the page, the form gives way to what happens to the title:
  // an emptied form left on screen got the title created twice (UX test of
  // 09/10/2026, upload failed under load).
  const createdMaster =
    !onCreated && state.status === "created" ? state.master : null;
  // The title whose file could not follow it.
  const [fileFailed, setFileFailed] = useState<string | null>(null);

  useEffect(() => {
    if (state.status !== "created" || handled.current === state) return;
    handled.current = state;
    if (onCreated) {
      onCreated(state.master);
      return;
    }
    // Page creation with a file: send it to the new title, then open it. A
    // failed file is said here, with the way to add it again.
    const master = state.master;
    void audio.send(master.id, audioState).then((ok) => {
      if (ok) router.push(routes.master(master.id));
      else setFileFailed(master.id);
    });
    // onCreated changes identity on every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const intent = onCreated ? "dialog" : audio.file ? "upload" : "page";

  if (createdMaster)
    return fileFailed === createdMaster.id ? (
      <div className="flex flex-col gap-5">
        <FormMessage kind="error">{t.fileFailed}</FormMessage>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link
            href={routes.master(createdMaster.id)}
            className={buttonVariants({ variant: "ghost", size: "lg" })}
          >
            <ButtonRoll>{t.openTitle}</ButtonRoll>
          </Link>
          <Link
            href={routes.masterAudio(createdMaster.id)}
            className={buttonVariants({ size: "lg" })}
          >
            <ButtonRoll>{t.addFileAgain}</ButtonRoll>
          </Link>
        </div>
      </div>
    ) : (
      <FormMessage kind="info">
        {audio.sending
          ? t.createdSending(createdMaster.title)
          : t.createdOpening(createdMaster.title)}
      </FormMessage>
    );

  return (
    <form
      action={action}
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        // Both checked, so every missing value is said at once.
        const audioOk = audio.check(audioState);
        const creditsOk = masterId ? true : credits.check();
        if (!audioOk || !creditsOk) event.preventDefault();
      }}
    >
      <input type="hidden" name="intent" value={intent} />
      {masterId && <input type="hidden" name="masterId" value={masterId} />}
      {variantOf && (
        <input type="hidden" name="variantOf" value={variantOf.id} />
      )}
      <Field
        id={`${prefix}title`}
        name="title"
        label={t.fields.title}
        required
        autoFocus
        autoComplete="off"
        maxLength={200}
        defaultValue={values.title ?? ""}
        error={errors.title}
      />

      <ArtistPicker
        artists={artists}
        defaultCredits={defaultCredits}
        onArtistCreated={onArtistCreated}
        error={errors.credits}
      />

      {/* At creation: an edit changes the credits on the title's page. */}
      {!masterId && (
        <CreditRowsField credits={credits} error={errors.contributors} />
      )}

      <fieldset className="flex flex-col gap-5 border-t border-border pt-5">
        {/* At creation only: an edit is about what is already known. */}
        {!masterId && (
          <legend className="mb-4 text-sm font-medium text-muted-foreground">
            {t.optionalLegend}
          </legend>
        )}
        <TitleDetailsFields
          prefix={prefix}
          values={values}
          variantOf={variantOf?.title}
          errors={{
            ...errors,
            audioState: errors.audioState ?? audio.stateError,
          }}
          onAudioStateChange={(state) => {
            setAudioState(state);
            audio.clearStateError();
          }}
        />
        {withFile && (
          <AudioFileField
            label={t.fields.audioFile}
            hint={t.fields.audioFileHint}
            file={audio.file}
            durationSeconds={audio.durationSeconds}
            error={audio.fileError}
            disabled={audio.sending}
            onChange={audio.choose}
          />
        )}
      </fieldset>

      {state.status === "error" && state.formError && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
            {t.cancel}
          </Button>
        ) : (
          <Link
            href={routes.masters}
            className={buttonVariants({ variant: "ghost", size: "lg" })}
          >
            <ButtonRoll>{t.cancel}</ButtonRoll>
          </Link>
        )}
        {masterId ? (
          <SubmitButton pendingLabel={fr.catalog.profileForm.submitting}>
            {fr.catalog.profileForm.submit}
          </SubmitButton>
        ) : (
          <SubmitButton
            pendingLabel={audio.sending ? t.uploading : t.submitting}
            busy={audio.sending}
          >
            {t.submit}
          </SubmitButton>
        )}
      </div>
    </form>
  );
}
