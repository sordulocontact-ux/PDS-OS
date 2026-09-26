"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { TextareaField } from "@/components/auth/textarea-field";
import { ArtistAvatar } from "@/components/catalog/artist-avatar";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { createArtist } from "@/lib/catalog/actions";
import {
  formatFans,
  idleCreateArtistState,
  type ArtistOption,
  type DeezerArtistResult,
} from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

// Second step of "Nouvel artiste": the chosen Deezer profile (or none), the
// name as it will appear in the catalog, and notes. Only the Deezer id is
// sent: the server reads the picture and link from Deezer itself.
export function ArtistDetailsForm({
  deezer,
  initialName,
  onBack,
  onCancel,
  onDone,
  pickerMode,
}: {
  deezer: DeezerArtistResult | null;
  initialName: string;
  onBack: () => void;
  onCancel: () => void;
  onDone: (artist: ArtistOption) => void;
  pickerMode: boolean;
}) {
  const t = fr.catalog.artistForm;
  const [state, action] = useActionState(createArtist, idleCreateArtistState);
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const existing = state.status === "error" ? state.existing : undefined;

  useEffect(() => {
    if (state.status === "created") onDone(state.artist);
    // onDone changes identity on every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      {deezer ? (
        <div className="flex items-center gap-3 rounded-xl border border-border p-3">
          <input type="hidden" name="deezerId" value={deezer.deezerId} />
          <ArtistAvatar
            name={deezer.name}
            pictureUrl={deezer.pictureUrl}
            className="size-12"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-xs text-muted-foreground">
              {t.deezer.source}
            </span>
            <span className="truncate text-sm font-medium">{deezer.name}</span>
            <span className="text-xs text-muted-foreground">
              {t.deezer.fans(formatFans(deezer.fans))}
            </span>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            {t.deezer.change}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="link"
          className="h-auto w-fit p-0 text-xs"
          onClick={onBack}
        >
          {t.deezer.backToSearch}
        </Button>
      )}

      <div className="flex flex-col gap-1.5">
        <Field
          name="name"
          label={t.name}
          hint={t.nameHint}
          required
          autoFocus
          autoComplete="off"
          maxLength={200}
          defaultValue={values.name ?? initialName}
          error={errors.name}
        />
        {existing &&
          (pickerMode ? (
            <Button
              type="button"
              variant="link"
              className="h-auto w-fit p-0 text-xs"
              onClick={() => onDone(existing)}
            >
              {t.selectExisting} : {existing.name}
            </Button>
          ) : (
            <Link
              href={routes.artist(existing.id)}
              className="w-fit text-xs font-medium underline"
            >
              {t.openExisting} : {existing.name}
            </Link>
          ))}
      </div>

      <TextareaField
        name="notes"
        label={t.notes}
        hint={t.notesHint}
        maxLength={5000}
        defaultValue={values.notes ?? ""}
        error={errors.notes}
      />

      {state.status === "error" && state.formError && (
        <FormMessage kind="error">{state.formError}</FormMessage>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="lg" onClick={onCancel}>
          {t.cancel}
        </Button>
        <SubmitButton pendingLabel={t.submitting}>{t.submit}</SubmitButton>
      </div>
    </form>
  );
}
