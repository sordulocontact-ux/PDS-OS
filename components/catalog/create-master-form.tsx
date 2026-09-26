"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { SubmitButton } from "@/components/auth/submit-button";
import { ArtistPicker } from "@/components/catalog/artist-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { createMaster } from "@/lib/catalog/actions";
import {
  idleCreateMasterState,
  type ArtistOption,
  type Credit,
  type MasterOption,
} from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

// Step B form. As a page it redirects to the new master; inside the project
// form's modal (onCreated given) it hands the master back instead.
export function CreateMasterForm({
  artists,
  defaultCredits,
  onCreated,
  onCancel,
  onArtistCreated,
}: {
  artists: ArtistOption[];
  defaultCredits?: Credit[];
  onCreated?: (master: MasterOption) => void;
  onCancel?: () => void;
  onArtistCreated?: (artist: ArtistOption) => void;
}) {
  const t = fr.catalog.masterForm;
  const [state, action] = useActionState(createMaster, idleCreateMasterState);
  const values = state.status === "error" ? (state.values ?? {}) : {};
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  // Field ids are prefixed in the modal: the project form behind has a title too.
  const prefix = onCreated ? "master-" : "";

  useEffect(() => {
    if (state.status === "created") onCreated?.(state.master);
    // onCreated changes identity on every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input
        type="hidden"
        name="intent"
        value={onCreated ? "dialog" : "page"}
      />
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

      <Field
        id={`${prefix}version`}
        name="version"
        label={t.fields.version}
        hint={t.fields.versionHint}
        autoComplete="off"
        maxLength={100}
        defaultValue={values.version ?? ""}
        error={errors.version}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={`${prefix}isrc`}
          name="isrc"
          label={t.fields.isrc}
          hint={t.fields.isrcHint}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={20}
          defaultValue={values.isrc ?? ""}
          error={errors.isrc}
          className="h-10 font-mono text-base md:text-sm"
        />
        <Field
          id={`${prefix}duration`}
          name="duration"
          label={t.fields.duration}
          hint={t.fields.durationHint}
          autoComplete="off"
          placeholder="3:07"
          maxLength={8}
          defaultValue={values.duration ?? ""}
          error={errors.duration}
          className="h-10 text-base tabular-nums md:text-sm"
        />
      </div>

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
            {t.cancel}
          </Link>
        )}
        <SubmitButton pendingLabel={t.submitting}>{t.submit}</SubmitButton>
      </div>
    </form>
  );
}
